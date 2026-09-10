const express = require('express');
const router = express.Router();
const TripModel = require('../models/TripModel');
const VehicleModel = require('../models/VehicleModel');
const AuditModel = require('../models/AuditModel');

router.get('/active', (req, res) => {
  const { vehicleId } = req.query;
  const trip = TripModel.getActiveTrip(vehicleId);
  const allTrips = TripModel.getAllActiveTrips();
  res.json({ success: true, trip, allTrips });
});

router.post('/start', (req, res) => {
  const tripData = req.body;
  if (!tripData.vehicleId || !tripData.destHospital || !tripData.routeCoords) {
    return res.status(400).json({ success: false, message: 'Invalid trip parameters' });
  }

  const trip = TripModel.createTrip(tripData);
  VehicleModel.updateStatus(tripData.vehicleId, 'ON_TRIP');
  AuditModel.log(
    tripData.driverUsername || 'driver',
    tripData.leg === 'TO_INCIDENT' ? 'DISPATCHED_TO_INCIDENT' : 'TRIP_STARTED',
    `${trip.emergencyCode} ${trip.originName} → ${trip.destHospital.name}`
  );

  const io = req.app.get('io');
  if (io) {
    io.emit('trip:started', trip);
  }

  res.status(201).json({ success: true, trip });
});

router.post('/:id/request-corridor', (req, res) => {
  const trip = TripModel.updateCorridorStatus(req.params.id, 'REQUESTED');
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  AuditModel.log(req.body.username || 'driver', 'CORRIDOR_REQUESTED', trip.emergencyCode);

  const io = req.app.get('io');
  if (io) {
    io.emit('corridor:requested', trip);
  }

  res.json({ success: true, trip });
});

router.post('/:id/approve-corridor', (req, res) => {
  const trip = TripModel.updateCorridorStatus(req.params.id, 'ACTIVE');
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  AuditModel.log(req.body.username || 'traffic_police', 'CORRIDOR_APPROVED', trip.emergencyCode);

  const io = req.app.get('io');
  if (io) {
    io.emit('corridor:approved', trip);
  }

  res.json({ success: true, trip });
});

router.post('/:id/reject-corridor', (req, res) => {
  const trip = TripModel.updateCorridorStatus(req.params.id, 'REJECTED');
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  AuditModel.log(req.body.username || 'traffic_police', 'CORRIDOR_REJECTED', trip.emergencyCode);

  const io = req.app.get('io');
  if (io) {
    io.emit('corridor:rejected', trip);
  }

  res.json({ success: true, trip });
});

router.post('/:id/pause-corridor', (req, res) => {
  const trip = TripModel.updateCorridorStatus(req.params.id, 'PAUSED');
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  AuditModel.log(req.body.username || 'traffic_police', 'CORRIDOR_PAUSED', trip.emergencyCode);

  const io = req.app.get('io');
  if (io) {
    io.emit('corridor:paused', trip);
  }

  res.json({ success: true, trip });
});

router.post('/:id/end-corridor', (req, res) => {
  const trip = TripModel.updateCorridorStatus(req.params.id, 'CLOSED');
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  AuditModel.log(req.body.username || 'traffic_police', 'CORRIDOR_ENDED', trip.emergencyCode);

  const io = req.app.get('io');
  if (io) {
    io.emit('corridor:ended', trip);
  }

  res.json({ success: true, trip });
});

router.post('/:id/stop', (req, res) => {
  const trip = TripModel.updateTripStatus(req.params.id, 'ARRIVED', 'CLOSED');
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  VehicleModel.updateStatus(trip.vehicleId, 'IDLE');
  AuditModel.log(req.body.username || 'driver', 'TRIP_STOPPED', trip.emergencyCode);

  const io = req.app.get('io');
  if (io) {
    io.emit('trip:stopped', trip);
  }

  res.json({ success: true, trip });
});

router.post('/:id/cancel', (req, res) => {
  const trip = TripModel.updateTripStatus(req.params.id, 'CANCELLED', 'CLOSED');
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  VehicleModel.updateStatus(trip.vehicleId, 'IDLE');
  AuditModel.log(req.body.username || 'driver', 'TRIP_CANCELLED', trip.emergencyCode);

  const io = req.app.get('io');
  if (io) {
    io.emit('trip:cancelled', trip);
  }

  res.json({ success: true, trip });
});

router.post('/:id/patient-case', (req, res) => {
  const trip = TripModel.updatePatientCase(req.params.id, req.body);
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  AuditModel.log(req.body.username || 'medical_staff', 'PATIENT_CASE_UPDATED', trip.emergencyCode);

  const io = req.app.get('io');
  if (io) {
    io.emit('patient_case:updated', trip);
  }

  res.json({ success: true, trip });
});

router.post('/:id/sos', (req, res) => {
  const trip = TripModel.triggerSOS(req.params.id);
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  AuditModel.log(req.body.username || 'driver', 'SOS_TRIGGERED', trip.emergencyCode);

  const io = req.app.get('io');
  if (io) {
    io.emit('trip:sos', trip);
  }

  res.json({ success: true, trip });
});

router.post('/:id/gps', (req, res) => {
  const { lat, lng, speedKmh, progressFrac } = req.body;
  TripModel.updateGPS(req.params.id, lat, lng, speedKmh, progressFrac);
  
  const io = req.app.get('io');
  if (io) {
    io.emit('trip:gps', { tripId: req.params.id, lat, lng, speedKmh, progressFrac, ts: Date.now() });
  }

  res.json({ success: true });
});

module.exports = router;
