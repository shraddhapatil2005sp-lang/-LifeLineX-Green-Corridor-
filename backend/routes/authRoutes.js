const express = require('express');
const router = express.Router();
const UserModel = require('../models/UserModel');
const AuditModel = require('../models/AuditModel');

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const user = UserModel.authenticate(username.trim(), password.trim());
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  }

  AuditModel.log(user.username, 'LOGIN', `role=${user.role}`);
  
  // Omit password hash/plaintext in response
  const { password: _, ...userSafe } = user;
  res.json({ success: true, user: userSafe });
});

router.get('/me/:username', (req, res) => {
  const user = UserModel.findByUsername(req.params.username);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  const { password: _, ...userSafe } = user;
  res.json({ success: true, user: userSafe });
});

module.exports = router;
