const db = require('../config/db');

class TripModel {
  static getActiveTrip(vehicleId = null) {
    let trip;
    if (vehicleId) {
      trip = db.prepare("SELECT * FROM trips WHERE vehicle_id = ? AND status = 'EN_ROUTE' ORDER BY created_at DESC LIMIT 1").get(vehicleId);
    } else {
      trip = db.prepare("SELECT * FROM trips WHERE status = 'EN_ROUTE' ORDER BY created_at DESC LIMIT 1").get();
    }
    if (!trip) return null;
    return this.formatTrip(trip);
  }

  static getAllActiveTrips() {
    const trips = db.prepare("SELECT * FROM trips WHERE status = 'EN_ROUTE' ORDER BY created_at DESC").all();
    return trips.map(t => this.formatTrip(t));
  }

  static getById(id) {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(id);
    if (!trip) return null;
    return this.formatTrip(trip);
  }

  static formatTrip(trip) {
    const patientCase = db.prepare('SELECT * FROM patient_cases WHERE trip_id = ?').get(trip.id) || {
      criticality: 'STABLE',
      category: 'OTHER',
      oxygen: 0,
      notes: '',
      incoming_sent: 0,
      hospital_ready: 0,
      hosp_accepted: 0,
      hosp_preparing: 0
    };

    return {
      emergencyCode: trip.id,
      vehicleId: trip.vehicle_id,
      vehicleType: trip.vehicle_type,
      driverUsername: trip.driver_username,
      driverName: trip.driver_name,
      medicalStaffName: trip.medical_staff_name,
      originName: trip.origin_name,
      originLat: trip.origin_lat,
      originLng: trip.origin_lng,
      destHospital: {
        id: trip.dest_id,
        name: trip.dest_name,
        lat: trip.dest_lat,
        lng: trip.dest_lng
      },
      status: trip.status,
      corridorStatus: trip.corridor_status,
      leg: trip.leg,
      incidentId: trip.incident_id,
      distance: trip.distance,
      etaNormalSec: trip.eta_normal_sec,
      etaCorridorSec: trip.eta_corridor_sec,
      routeCoords: JSON.parse(trip.route_coords_json || '[]'),
      signals: JSON.parse(trip.signals_json || '[]'),
      progressFrac: trip.progress_frac,
      currentSpeedKmh: trip.current_speed_kmh,
      liveGPS: trip.current_lat ? {
        lat: trip.current_lat,
        lng: trip.current_lng,
        speedKmh: trip.current_speed_kmh,
        ts: Date.now()
      } : null,
      sosActive: !!trip.sos_active,
      patientCase: {
        caseId: patientCase.case_id,
        criticality: patientCase.criticality,
        category: patientCase.category,
        oxygen: !!patientCase.oxygen,
        notes: patientCase.notes || '',
        incomingSent: !!patientCase.incoming_sent,
        hospitalReady: !!patientCase.hospital_ready,
        hospAccepted: !!patientCase.hosp_accepted,
        hospPreparing: !!patientCase.hosp_preparing
      }
    };
  }

  static createTrip(tripData) {
    const stmtTrip = db.prepare(`
      INSERT OR REPLACE INTO trips (
        id, vehicle_id, vehicle_type, driver_username, driver_name, medical_staff_name,
        origin_name, origin_lat, origin_lng, dest_id, dest_name, dest_lat, dest_lng,
        status, corridor_status, leg, incident_id, distance, eta_normal_sec, eta_corridor_sec,
        route_coords_json, signals_json, progress_frac, current_speed_kmh, current_lat, current_lng, sos_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const stmtCase = db.prepare(`
      INSERT OR REPLACE INTO patient_cases (
        trip_id, case_id, criticality, category, oxygen, notes, incoming_sent, hospital_ready, hosp_accepted, hosp_preparing
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      // Mark old active trips for THIS vehicle as cancelled if any
      db.prepare("UPDATE trips SET status = 'CANCELLED' WHERE vehicle_id = ? AND status = 'EN_ROUTE'").run(tripData.vehicleId);

      stmtTrip.run(
        tripData.emergencyCode,
        tripData.vehicleId,
        tripData.vehicleType,
        tripData.driverUsername,
        tripData.driverName,
        tripData.medicalStaffName || null,
        tripData.originName,
        tripData.originLat || tripData.routeCoords[0]?.lat || 0,
        tripData.originLng || tripData.routeCoords[0]?.lng || 0,
        tripData.destHospital.id || null,
        tripData.destHospital.name,
        tripData.destHospital.lat,
        tripData.destHospital.lng,
        tripData.status || 'EN_ROUTE',
        tripData.corridorStatus || 'NONE',
        tripData.leg || 'DIRECT',
        tripData.incidentId || null,
        tripData.distance,
        tripData.etaNormalSec,
        tripData.etaCorridorSec,
        JSON.stringify(tripData.routeCoords || []),
        JSON.stringify(tripData.signals || []),
        tripData.progressFrac || 0,
        tripData.currentSpeedKmh || 0,
        tripData.liveGPS?.lat || tripData.originLat || null,
        tripData.liveGPS?.lng || tripData.originLng || null,
        tripData.sosActive ? 1 : 0
      );

      const pcase = tripData.patientCase || {};
      stmtCase.run(
        tripData.emergencyCode,
        tripData.emergencyCode.replace('EMG', 'CASE'),
        pcase.criticality || 'STABLE',
        pcase.category || 'OTHER',
        pcase.oxygen ? 1 : 0,
        pcase.notes || '',
        pcase.incomingSent ? 1 : 0,
        pcase.hospitalReady ? 1 : 0,
        pcase.hospAccepted ? 1 : 0,
        pcase.hospPreparing ? 1 : 0
      );
    });

    tx();
    return this.getById(tripData.emergencyCode);
  }

  static updateTripStatus(tripId, status, corridorStatus = null) {
    if (corridorStatus !== null) {
      db.prepare('UPDATE trips SET status = ?, corridor_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, corridorStatus, tripId);
    } else {
      db.prepare('UPDATE trips SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, tripId);
    }
    return this.getById(tripId);
  }

  static updateCorridorStatus(tripId, corridorStatus) {
    db.prepare('UPDATE trips SET corridor_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(corridorStatus, tripId);
    return this.getById(tripId);
  }

  static updateGPS(tripId, lat, lng, speedKmh, progressFrac) {
    db.prepare('UPDATE trips SET current_lat = ?, current_lng = ?, current_speed_kmh = ?, progress_frac = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(lat, lng, speedKmh, progressFrac, tripId);
  }

  static updatePatientCase(tripId, caseData) {
    const existing = db.prepare('SELECT * FROM patient_cases WHERE trip_id = ?').get(tripId);
    if (!existing) return null;

    db.prepare(`
      UPDATE patient_cases SET
        criticality = COALESCE(?, criticality),
        category = COALESCE(?, category),
        oxygen = COALESCE(?, oxygen),
        notes = COALESCE(?, notes),
        incoming_sent = COALESCE(?, incoming_sent),
        hospital_ready = COALESCE(?, hospital_ready),
        hosp_accepted = COALESCE(?, hosp_accepted),
        hosp_preparing = COALESCE(?, hosp_preparing),
        updated_at = CURRENT_TIMESTAMP
      WHERE trip_id = ?
    `).run(
      caseData.criticality !== undefined ? caseData.criticality : null,
      caseData.category !== undefined ? caseData.category : null,
      caseData.oxygen !== undefined ? (caseData.oxygen ? 1 : 0) : null,
      caseData.notes !== undefined ? caseData.notes : null,
      caseData.incomingSent !== undefined ? (caseData.incomingSent ? 1 : 0) : null,
      caseData.hospitalReady !== undefined ? (caseData.hospitalReady ? 1 : 0) : null,
      caseData.hospAccepted !== undefined ? (caseData.hospAccepted ? 1 : 0) : null,
      caseData.hospPreparing !== undefined ? (caseData.hospPreparing ? 1 : 0) : null,
      tripId
    );

    return this.getById(tripId);
  }

  static triggerSOS(tripId) {
    db.prepare('UPDATE trips SET sos_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(tripId);
    return this.getById(tripId);
  }
}

module.exports = TripModel;
