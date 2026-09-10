const express = require('express');
const router = express.Router();
const HospitalModel = require('../models/HospitalModel');

router.get('/hospitals', (req, res) => {
  const hospitals = HospitalModel.getAllHospitals();
  res.json({ success: true, hospitals });
});

router.get('/landmarks', (req, res) => {
  const isOriginOnly = req.query.originOnly === 'true';
  const landmarks = HospitalModel.getAllLandmarks(isOriginOnly);
  res.json({ success: true, landmarks });
});

router.get('/fire-incident-sites', (req, res) => {
  const sites = HospitalModel.getFireIncidentSites();
  res.json({ success: true, sites });
});

router.get('/junctions', (req, res) => {
  const junctions = HospitalModel.getAllJunctions();
  res.json({ success: true, junctions });
});

module.exports = router;
