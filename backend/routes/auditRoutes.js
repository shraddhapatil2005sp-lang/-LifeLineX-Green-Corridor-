const express = require('express');
const router = express.Router();
const AuditModel = require('../models/AuditModel');

router.get('/', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
  const logs = AuditModel.getAll(limit);
  res.json({ success: true, logs });
});

router.post('/', (req, res) => {
  const { user, action, meta } = req.body;
  const log = AuditModel.log(user || 'system', action || 'ACTION', meta || '');
  
  const io = req.app.get('io');
  if (io) {
    io.emit('audit:new', log);
  }

  res.status(201).json({ success: true, log });
});

module.exports = router;
