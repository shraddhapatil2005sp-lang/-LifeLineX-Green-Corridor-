const db = require('../config/db');

class AuditModel {
  static getAll(limit = 100) {
    return db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?').all(limit);
  }

  static log(user, action, meta = '') {
    const time = new Date().toLocaleTimeString('en-GB');
    db.prepare('INSERT INTO audit_logs (time, user, action, meta) VALUES (?, ?, ?, ?)').run(time, user, action, meta);
    return { time, user, action, meta };
  }
}

module.exports = AuditModel;
