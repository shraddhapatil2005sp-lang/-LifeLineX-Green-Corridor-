const express = require('express');
const router = express.Router();
const IncidentModel = require('../models/IncidentModel');
const UserModel = require('../models/UserModel');
const AuditModel = require('../models/AuditModel');

const INCIDENT_TYPE_TO_VEHICLE = { ACCIDENT: 'AMBULANCE', MEDICAL: 'AMBULANCE', FIRE: 'FIRE_BRIGADE', RESCUE: 'NDRF' };
const INCIDENT_LABEL = { ACCIDENT: 'Road Accident', FIRE: 'Fire', MEDICAL: 'Medical Emergency', RESCUE: 'Rescue / Disaster' };

function haversine(a, b) {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

router.get('/', (req, res) => {
  const incidents = IncidentModel.getAll();
  res.json({ success: true, incidents });
});

router.get('/driver/:username', (req, res) => {
  const incidents = IncidentModel.getActiveForDriver(req.params.username);
  res.json({ success: true, incidents });
});

router.post('/report', (req, res) => {
  const { type, lat, lng, locationName, description, contact } = req.body;
  if (!type || lat === undefined || lng === undefined || !locationName) {
    return res.status(400).json({ success: false, message: 'Type, location, and coordinates are required.' });
  }

  const vtype = INCIDENT_TYPE_TO_VEHICLE[type] || 'AMBULANCE';
  const candidateDrivers = UserModel.findDriversByType(vtype);
  
  let best = null;
  let bestDist = Infinity;
  candidateDrivers.forEach(u => {
    if (u.base_lat && u.base_lng) {
      const d = haversine({ lat, lng }, { lat: u.base_lat, lng: u.base_lng });
      if (d < bestDist) {
        bestDist = d;
        best = u;
      }
    }
  });

  const incidentId = 'INC-' + Date.now();
  const incident = IncidentModel.create({
    id: incidentId,
    type,
    typeLabel: INCIDENT_LABEL[type] || type,
    lat,
    lng,
    locationName,
    description,
    contact,
    status: 'NEW',
    assignedUsername: best ? best.username : null,
    createdAt: new Date().toLocaleTimeString('en-GB')
  });

  AuditModel.log('public', 'PUBLIC_INCIDENT_REPORTED', `${incident.id} (${incident.type_label}) @ ${locationName}${best ? ' → routed to ' + best.username : ' — no unit'}`);

  // Broadcast via socket io if available
  const io = req.app.get('io');
  if (io) {
    io.emit('incident:new', incident);
  }

  res.status(201).json({
    success: true,
    incident,
    assignedDriver: best ? {
      username: best.username,
      vehicleId: best.vehicle_id,
      fullName: best.full_name,
      distanceM: Math.round(bestDist)
    } : null
  });
});

router.post('/:id/accept', (req, res) => {
  const { username } = req.body;
  const incident = IncidentModel.getById(req.params.id);
  if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

  IncidentModel.updateStatus(incident.id, 'ASSIGNED', username);
  AuditModel.log(username || 'driver', 'INCIDENT_ASSIGNED', `${incident.id} → ${username}`);

  const io = req.app.get('io');
  if (io) {
    io.emit('incident:updated', { id: incident.id, status: 'ASSIGNED', assignedUsername: username });
  }

  res.json({ success: true, message: 'Incident assigned successfully' });
});

module.exports = router;
