const db = require('../config/db');

class HospitalModel {
  static getAllHospitals() {
    return db.prepare('SELECT * FROM hospitals ORDER BY name ASC').all();
  }

  static getHospitalById(id) {
    return db.prepare('SELECT * FROM hospitals WHERE id = ?').get(id);
  }

  static getAllLandmarks(isOriginOnly = false) {
    if (isOriginOnly) {
      return db.prepare('SELECT * FROM landmarks WHERE is_origin = 1 ORDER BY name ASC').all();
    }
    return db.prepare('SELECT * FROM landmarks ORDER BY name ASC').all();
  }

  static getFireIncidentSites() {
    return db.prepare('SELECT * FROM landmarks WHERE is_origin = 0 ORDER BY name ASC').all();
  }

  static getAllJunctions() {
    return db.prepare('SELECT * FROM junctions ORDER BY name ASC').all();
  }
}

module.exports = HospitalModel;
