const db = require('../config/db');

class VehicleModel {
  static getAll() {
    return db.prepare('SELECT * FROM vehicles ORDER BY id ASC').all();
  }

  static findById(vehicleId) {
    return db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(vehicleId);
  }

  static create(vehicle) {
    const stmt = db.prepare(`
      INSERT INTO vehicles (vehicle_id, reg_no, vehicle_type, status, fitness, insurance, authorized, username, current_lat, current_lng)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      vehicle.vehicleId,
      vehicle.regNo,
      vehicle.vehicleType,
      vehicle.status || 'IDLE',
      vehicle.fitness || 'VALID',
      vehicle.insurance || 'VALID',
      vehicle.authorized ? 1 : 0,
      vehicle.username || null,
      vehicle.currentLat || null,
      vehicle.currentLng || null
    );
    return this.findById(vehicle.vehicleId);
  }

  static updateStatus(vehicleId, status) {
    return db.prepare('UPDATE vehicles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE vehicle_id = ?').run(status, vehicleId);
  }

  static updateLocation(vehicleId, lat, lng) {
    return db.prepare('UPDATE vehicles SET current_lat = ?, current_lng = ?, updated_at = CURRENT_TIMESTAMP WHERE vehicle_id = ?').run(lat, lng, vehicleId);
  }
}

module.exports = VehicleModel;
