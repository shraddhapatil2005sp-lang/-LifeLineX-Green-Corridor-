const db = require('../config/db');

class UserModel {
  static findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  }

  static authenticate(username, password) {
    return db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
  }

  static getAll(search, role) {
    let sql = 'SELECT id, username, role, full_name, driver_id, staff_id, officer_id, zone, vehicle_id, vehicle_type, reg_no, hospital_id, base_name FROM users WHERE 1=1';
    const params = [];
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    if (search) {
      sql += ' AND (LOWER(username) LIKE ? OR LOWER(full_name) LIKE ?)';
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }
    sql += ' ORDER BY id ASC';
    return db.prepare(sql).all(...params);
  }

  static create(user) {
    const stmt = db.prepare(`
      INSERT INTO users (username, password, role, full_name, driver_id, staff_id, officer_id, zone, vehicle_id, vehicle_type, reg_no, hospital_id, base_lat, base_lng, base_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      user.username,
      user.password,
      user.role,
      user.fullName,
      user.driverId || null,
      user.staffId || null,
      user.officerId || null,
      user.zone || null,
      user.vehicleId || null,
      user.vehicleType || null,
      user.regNo || null,
      user.hospitalId || null,
      user.baseLat || null,
      user.baseLng || null,
      user.baseName || null
    );
    return this.findByUsername(user.username);
  }

  static findDriversByType(vehicleType) {
    return db.prepare("SELECT * FROM users WHERE role = 'DRIVER' AND vehicle_type = ?").all(vehicleType);
  }
}

module.exports = UserModel;
