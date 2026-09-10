const db = require('../config/db');

class IncidentModel {
  static getAll() {
    return db.prepare('SELECT * FROM incidents ORDER BY created_at DESC').all();
  }

  static getActiveForDriver(username) {
    return db.prepare("SELECT * FROM incidents WHERE assigned_username = ? AND status IN ('NEW', 'ASSIGNED') ORDER BY created_at DESC").all(username);
  }

  static getById(id) {
    return db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
  }

  static create(incident) {
    const stmt = db.prepare(`
      INSERT INTO incidents (id, type, type_label, lat, lng, location_name, description, contact, status, assigned_username, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      incident.id,
      incident.type,
      incident.typeLabel,
      incident.lat,
      incident.lng,
      incident.locationName,
      incident.description || '',
      incident.contact || '',
      incident.status || 'NEW',
      incident.assignedUsername || null,
      incident.createdAt || new Date().toLocaleTimeString('en-GB')
    );
    return this.getById(incident.id);
  }

  static updateStatus(id, status, assignedUsername = null) {
    if (assignedUsername !== null) {
      return db.prepare('UPDATE incidents SET status = ?, assigned_username = ? WHERE id = ?').run(status, assignedUsername, id);
    }
    return db.prepare('UPDATE incidents SET status = ? WHERE id = ?').run(status, id);
  }
}

module.exports = IncidentModel;
