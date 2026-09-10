const express = require('express');
const router = express.Router();
const VehicleModel = require('../models/VehicleModel');

router.get('/', (req, res) => {
  const vehicles = VehicleModel.getAll();
  res.json({ success: true, vehicles });
});

router.get('/:id', (req, res) => {
  const vehicle = VehicleModel.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
  res.json({ success: true, vehicle });
});

module.exports = router;
