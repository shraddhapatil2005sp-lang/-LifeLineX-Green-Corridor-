const express = require('express');
const router = express.Router();
const UserModel = require('../models/UserModel');
const VehicleModel = require('../models/VehicleModel');
const AuditModel = require('../models/AuditModel');

router.get('/', (req, res) => {
  const { search, role } = req.query;
  const users = UserModel.getAll(search, role);
  res.json({ success: true, users });
});

router.post('/', (req, res) => {
  const { username, password, role, fullName, vehicleType, vehicleId, regNo, staffId, officerId, zone, hospitalId } = req.body;
  
  if (!username || !fullName || !role) {
    return res.status(400).json({ success: false, message: 'Username, Full Name, and Role are required.' });
  }

  const existing = UserModel.findByUsername(username.trim());
  if (existing) {
    return res.status(400).json({ success: false, message: 'That username already exists.' });
  }

  const defaultBaseLat = 16.6980;
  const defaultBaseLng = 74.2400;

  const newUser = UserModel.create({
    username: username.trim(),
    password: password || 'Pass@123',
    role,
    fullName: fullName.trim(),
    vehicleType,
    vehicleId,
    regNo,
    staffId,
    officerId,
    zone,
    hospitalId,
    baseLat: role === 'DRIVER' ? defaultBaseLat + (Math.random() - 0.5) * 0.005 : null,
    baseLng: role === 'DRIVER' ? defaultBaseLng + (Math.random() - 0.5) * 0.005 : null,
    baseName: role === 'DRIVER' ? 'Kolhapur Central' : null
  });

  if (role === 'DRIVER' && vehicleId && regNo) {
    VehicleModel.create({
      vehicleId,
      regNo,
      vehicleType,
      status: 'IDLE',
      fitness: 'VALID',
      insurance: 'VALID',
      authorized: true,
      username: username.trim(),
      currentLat: defaultBaseLat,
      currentLng: defaultBaseLng
    });
  }

  AuditModel.log(req.headers['x-user'] || 'admin', 'ADMIN_ADD_USER', `username=${username} role=${role}`);

  res.status(201).json({ success: true, user: newUser });
});

module.exports = router;
