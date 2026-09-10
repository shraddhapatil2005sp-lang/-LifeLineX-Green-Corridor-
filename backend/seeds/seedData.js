const db = require('../config/db');

const DEMO_PASSWORD = 'Pass@123';

const HOSPITALS = [
  {id:'HOSP-KOP-001', name:'CPR Hospital (Govt. District Hospital)', lat:16.6951, lng:74.2320},
  {id:'HOSP-KOP-002', name:'Aster Aadhar Hospital', lat:16.6766, lng:74.2495},
  {id:'HOSP-KOP-003', name:'Sanjeevan Hospital', lat:16.7011, lng:74.2367},
  {id:'HOSP-KOP-004', name:"District Women's Hospital", lat:16.6940, lng:74.2352},
  {id:'HOSP-KOP-005', name:'Apple Saraswati Multispeciality Hospital', lat:16.6903, lng:74.2447},
  {id:'HOSP-KOP-006', name:'D. Y. Patil Hospital & Research Centre', lat:16.6668, lng:74.2596},
  {id:'HOSP-KOP-007', name:'Ashoka Superspeciality Hospital', lat:16.6875, lng:74.2461},
  {id:'HOSP-KOP-008', name:'Silver Cross Hospital', lat:16.6987, lng:74.2388},
  {id:'HOSP-KOP-009', name:'Athaayu Multispeciality Hospital', lat:16.6997, lng:74.2415},
  {id:'HOSP-KOP-010', name:'Kolhapur Cancer Centre', lat:16.6885, lng:74.2337},
  {id:'HOSP-KOP-011', name:'KPC Multispeciality Hospital', lat:16.6928, lng:74.2402},
  {id:'HOSP-KOP-012', name:'Sant Gajanan Maharaj Rural Hospital', lat:16.6790, lng:74.2260},
  {id:'HOSP-KOP-013', name:'Niramaya Hospital', lat:16.6845, lng:74.2470},
  {id:'HOSP-KOP-014', name:'North Star Super Speciality Hospital', lat:16.6960, lng:74.2470},
  {id:'HOSP-KOP-015', name:'Sunrise Multispeciality Hospital', lat:16.6870, lng:74.2390},
  {id:'HOSP-KOP-016', name:'Sushrisha Hospital, Rajarampuri', lat:16.6893, lng:74.2409},
  {id:'HOSP-KOP-017', name:'Galaxy Hospital', lat:16.6920, lng:74.2280},
  {id:'HOSP-KOP-018', name:'Vatsalya Nursing Home', lat:16.6950, lng:74.2370},
  {id:'HOSP-KOP-019', name:'Anand Nursing Home', lat:16.6980, lng:74.2340},
  {id:'HOSP-KOP-020', name:'City Hospital, Kolhapur', lat:16.6935, lng:74.2325},
  {id:'HOSP-KOP-021', name:'Basarge Hospital', lat:16.6905, lng:74.2295},
  {id:'HOSP-KOP-022', name:'Pragati Netra Rugnalaya, Rajarampuri', lat:16.6880, lng:74.2418},
  {id:'HOSP-KOP-023', name:'Ramkrishna Hospital, New Palace Road', lat:16.7005, lng:74.2280},
  {id:'HOSP-KOP-024', name:'RBJ Hospital, Shivaji Park', lat:16.6800, lng:74.2350},
  {id:'HOSP-KOP-025', name:'Siddhivinayak Heart Hospital, Shastrinagar', lat:16.6860, lng:74.2500},
  {id:'HOSP-KOP-026', name:'Siddhivinayak Nursing Home, Takala', lat:16.6970, lng:74.2265},
  {id:'HOSP-KOP-027', name:'Sub-District Hospital, Kolhapur', lat:16.6945, lng:74.2400},
  {id:'HOSP-KOP-028', name:'Savitribai Phule Municipal Maternity Hospital', lat:16.6960, lng:74.2350},
  {id:'HOSP-KOP-029', name:'Navjeevan Hospital', lat:16.6845, lng:74.2320},
  {id:'HOSP-KOP-030', name:'Wiins Hospital', lat:16.6910, lng:74.2450},
  {id:'HOSP-KOP-031', name:'Apple Hospitals & Research Institute', lat:16.6899, lng:74.2444},
  {id:'HOSP-KOP-032', name:'Warana Institute of Uro-Surgery', lat:16.6825, lng:74.2445},
  {id:'HOSP-KOP-033', name:'Siddhagiri Hospital & Research Centre, Kaneri', lat:16.6480, lng:74.2020},
];

const LANDMARKS = [
  {id:'firehq', name:'Kolhapur Fire Brigade Head Office (Central Fire Station)', lat:16.6928, lng:74.2288, is_origin:1},
  {id:'railway', name:'Kolhapur Railway Station', lat:16.6816, lng:74.2433, is_origin:1},
  {id:'airport', name:'Kolhapur Airport, Ujalaiwadi', lat:16.6659, lng:74.2887, is_origin:1},
  {id:'university', name:'Shivaji University', lat:16.7099, lng:74.2436, is_origin:1},
  {id:'rankala', name:'Rankala Lake', lat:16.6963, lng:74.2233, is_origin:1},
  {id:'mahalaxmi', name:'Mahalaxmi Temple Area', lat:16.6929, lng:74.2264, is_origin:1},
  {id:'bindu', name:'Bindu Chowk', lat:16.6980, lng:74.2333, is_origin:1},
  {id:'cbs', name:'CBS Bus Stand', lat:16.6975, lng:74.2358, is_origin:1},
  {id:'rajarampuri', name:'Rajarampuri', lat:16.6889, lng:74.2415, is_origin:1},
  {id:'shahupuri', name:'Shahupuri', lat:16.7016, lng:74.2298, is_origin:1},
  {id:'tarabai', name:'Tarabai Park', lat:16.7075, lng:74.2270, is_origin:1},
  // Fire incident sites
  {id:'fis-laxmipuri', name:'Laxmipuri Market Fire Site', lat:16.6940, lng:74.2410, is_origin:0},
  {id:'fis-udyamnagar', name:'Shivaji Udyamnagar Industrial Estate', lat:16.6832, lng:74.2378, is_origin:0},
  {id:'fis-gangavesh', name:'Gangavesh Old City Area', lat:16.6900, lng:74.2270, is_origin:0},
  {id:'fis-apmc', name:'Shahu Market Yard (APMC)', lat:16.6790, lng:74.2280, is_origin:0},
  {id:'fis-shahupuri', name:'Shahupuri Residential Zone', lat:16.7020, lng:74.2310, is_origin:0},
  {id:'fis-bawada', name:'Kasba Bawada', lat:16.7100, lng:74.2200, is_origin:0},
  {id:'fis-saneguruji', name:'Sane Guruji Vasahat', lat:16.6870, lng:74.2340, is_origin:0},
  {id:'fis-rajarampuri', name:'Rajarampuri Fire Site', lat:16.6889, lng:74.2415, is_origin:0},
];

const JUNCTIONS = [
  {code:'KOP-SIG-BND', name:'Bindu Chowk', lat:16.6980, lng:74.2333},
  {code:'KOP-SIG-DBH', name:'Dabholkar Corner', lat:16.6940, lng:74.2358},
  {code:'KOP-SIG-SHV', name:'Shivaji Chowk (Shivaji Peth)', lat:16.6906, lng:74.2371},
  {code:'KOP-SIG-RAJ', name:'Rajarampuri 3rd Lane Junction', lat:16.6887, lng:74.2413},
  {code:'KOP-SIG-KWL', name:'Kawala Naka', lat:16.6961, lng:74.2296},
  {code:'KOP-SIG-SHP', name:'Shahupuri Corner', lat:16.7014, lng:74.2300},
  {code:'KOP-SIG-MHD', name:'Mahadwar Road Junction', lat:16.6957, lng:74.2280},
  {code:'KOP-SIG-YLM', name:'Yellamma Chowk', lat:16.6928, lng:74.2299},
  {code:'KOP-SIG-UMT', name:'Uma Talkies Chowk', lat:16.6899, lng:74.2352},
  {code:'KOP-SIG-PRK', name:'Parikh Pool Junction', lat:16.6975, lng:74.2405},
  {code:'KOP-SIG-TRB', name:'Tararani Chowk', lat:16.7048, lng:74.2276},
  {code:'KOP-SIG-GDH', name:'Gadhi Chowk, Udyamnagar', lat:16.6832, lng:74.2378},
  {code:'KOP-SIG-RNK', name:'Rankala Chowk', lat:16.6952, lng:74.2242},
  {code:'KOP-SIG-CBS', name:'CBS Naka', lat:16.6972, lng:74.2360},
  {code:'KOP-SIG-FLC', name:'Fule Chowk', lat:16.6944, lng:74.2318},
  {code:'KOP-SIG-SSN', name:'Sasane Ground Junction', lat:16.6862, lng:74.2400},
  {code:'KOP-SIG-RKC', name:'Ruikar Colony Junction', lat:16.6805, lng:74.2418},
  {code:'KOP-SIG-UNV', name:'University Road Junction', lat:16.7060, lng:74.2440},
  {code:'KOP-SIG-AMB', name:'Ambabai Chowk', lat:16.6924, lng:74.2263},
  {code:'KOP-SIG-LXP', name:'Laxmipuri Chowk', lat:16.6942, lng:74.2408},
  {code:'KOP-SIG-PTV', name:'Petha Vesh Naka', lat:16.6885, lng:74.2280},
  {code:'KOP-SIG-GNV', name:'Gangavesh Naka', lat:16.6902, lng:74.2268},
  {code:'KOP-SIG-PNC', name:'Panchganga Naka', lat:16.7080, lng:74.2390},
  {code:'KOP-SIG-NSH', name:'New Shahupuri Naka', lat:16.7030, lng:74.2312},
  {code:'KOP-SIG-KBW', name:'Kasaba Bawada Naka', lat:16.7112, lng:74.2210},
  {code:'KOP-SIG-SDB', name:'Sadar Bazar Chowk', lat:16.6965, lng:74.2318},
  {code:'KOP-SIG-SHN', name:'Shahu Naka', lat:16.6912, lng:74.2260},
  {code:'KOP-SIG-TMB', name:'Timber Market Chowk', lat:16.6845, lng:74.2360},
  {code:'KOP-SIG-PLW', name:'Phulewadi Naka', lat:16.7150, lng:74.2300},
  {code:'KOP-SIG-BPC', name:'Bapat Camp Chowk', lat:16.6790, lng:74.2400},
  {code:'KOP-SIG-VKN', name:'Vikramnagar Chowk', lat:16.6860, lng:74.2320},
  {code:'KOP-SIG-KLB', name:'Kalamba Naka', lat:16.7005, lng:74.2470},
  {code:'KOP-SIG-RTO', name:'RTO Chowk', lat:16.6810, lng:74.2500},
  {code:'KOP-SIG-SHS', name:'Shastrinagar Chowk', lat:16.6858, lng:74.2495},
  {code:'KOP-SIG-LNB', name:'Line Bazar Chowk', lat:16.6935, lng:74.2255},
  {code:'KOP-SIG-STN', name:'Station Road Junction', lat:16.6825, lng:74.2440},
  {code:'KOP-SIG-JTB', name:'Jyotiba Road Chowk', lat:16.7135, lng:74.2245},
  {code:'KOP-SIG-KGL', name:'Kagal Naka', lat:16.6640, lng:74.2680},
];

function seedDatabase() {
  const insertHospital = db.prepare('INSERT OR REPLACE INTO hospitals (id, name, lat, lng) VALUES (?, ?, ?, ?)');
  const insertLandmark = db.prepare('INSERT OR REPLACE INTO landmarks (id, name, lat, lng, is_origin) VALUES (?, ?, ?, ?, ?)');
  const insertJunction = db.prepare('INSERT OR REPLACE INTO junctions (code, name, lat, lng) VALUES (?, ?, ?, ?)');

  const insertHospitalsTx = db.transaction(() => {
    HOSPITALS.forEach(h => insertHospital.run(h.id, h.name, h.lat, h.lng));
  });
  insertHospitalsTx();

  const insertLandmarksTx = db.transaction(() => {
    LANDMARKS.forEach(l => insertLandmark.run(l.id, l.name, l.lat, l.lng, l.is_origin));
  });
  insertLandmarksTx();

  const insertJunctionsTx = db.transaction(() => {
    JUNCTIONS.forEach(j => insertJunction.run(j.code, j.name, j.lat, j.lng));
  });
  insertJunctionsTx();

  // Seed Users & Vehicles
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, role, full_name, driver_id, staff_id, officer_id, zone, vehicle_id, vehicle_type, reg_no, hospital_id, base_lat, base_lng, base_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertVehicle = db.prepare(`
      INSERT INTO vehicles (vehicle_id, reg_no, vehicle_type, status, fitness, insurance, authorized, username, current_lat, current_lng)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedUsersTx = db.transaction(() => {
      // Drivers
      const driverData = [
        {pref:'dv', vtype:'AMBULANCE', names:['Vaibhav Jadhav','Suresh Patil','Anil Kamble','Ramesh Sawant'], offset:0},
        {pref:'fb', vtype:'FIRE_BRIGADE', names:['Fire Op. Dinesh Patil','Fire Op. Santosh Yadav','Fire Op. Ganesh Koli','Fire Op. Mahadev Salunkhe'], offset:2},
        {pref:'pv', vtype:'POLICE_VEHICLE', names:['Const. Rohit Mane','Const. Sandeep Bhoite','Const. Amol Gaikwad','Const. Nitin Powar'], offset:4},
        {pref:'nd', vtype:'NDRF', names:['NDRF Havildar Kadam','NDRF Havildar Jagtap','NDRF Havildar Bhosale','NDRF Havildar Chougule'], offset:6}
      ];

      driverData.forEach(d => {
        for (let i = 1; i <= 4; i++) {
          const n = String(i).padStart(2, '0');
          const username = `${d.pref}2026${n}`;
          const base = LANDMARKS[(i - 1 + d.offset) % LANDMARKS.length];
          const vehicleId = `${d.pref.toUpperCase()}-2026-0${n}`;
          const regNo = `MH09-${d.pref.toUpperCase()}-${1000 + i}`;
          const baseLat = base.lat + (Math.random() - 0.5) * 0.004;
          const baseLng = base.lng + (Math.random() - 0.5) * 0.004;

          insertUser.run(
            username, DEMO_PASSWORD, 'DRIVER', d.names[i - 1],
            vehicleId, null, null, null, vehicleId, d.vtype, regNo, null,
            baseLat, baseLng, base.name
          );

          insertVehicle.run(
            vehicleId, regNo, d.vtype, 'IDLE', 'VALID', 'VALID', 1, username, baseLat, baseLng
          );
        }
      });

      // Medical Staff
      const medNames = ['Dr. Snehal Kore','Dr. Priya Deshmukh','Dr. Rahul Naik','Dr. Aarti Shinde'];
      for (let i = 1; i <= 4; i++) {
        const n = String(i).padStart(2, '0');
        insertUser.run(`mo2026${n}`, DEMO_PASSWORD, 'MEDICAL_STAFF', medNames[i - 1], null, `MO-2026-0${n}`, null, null, `DV-2026-0${n}`, null, null, null, null, null, null);
      }

      // Traffic Police
      const tpNames = ['PSI Mahesh Bhosale','PSI Sunita Chavan','PSI Vikram More','PSI Ashwini Pawar'];
      for (let i = 1; i <= 4; i++) {
        const n = String(i).padStart(2, '0');
        insertUser.run(`tp2026${n}`, DEMO_PASSWORD, 'TRAFFIC_POLICE', tpNames[i - 1], null, null, `TP-2026-0${n}`, `Zone ${i}`, null, null, null, null, null, null, null);
      }

      // Hospitals
      HOSPITALS.forEach((h, idx) => {
        const n = String(idx + 1).padStart(2, '0');
        insertUser.run(`hp2026${n}`, DEMO_PASSWORD, 'HOSPITAL', `${h.name} Desk`, null, null, null, null, null, null, null, h.id, h.lat, h.lng, h.name);
      });

      // Admin
      insertUser.run('admin2026', DEMO_PASSWORD, 'ADMIN', 'System Administrator', null, null, null, null, null, null, null, null, null, null, null);
    });

    seedUsersTx();
  }

  // Insert startup audit log if empty
  const logCount = db.prepare('SELECT count(*) as count FROM audit_logs').get().count;
  if (logCount === 0) {
    db.prepare('INSERT INTO audit_logs (time, user, action, meta) VALUES (?, ?, ?, ?)').run(
      new Date().toLocaleTimeString('en-GB'),
      'system',
      'SYSTEM_INITIALIZED',
      'Kolhapur Green Corridor Database loaded with pre-configured city data'
    );
  }
}

module.exports = { seedDatabase, HOSPITALS, LANDMARKS, JUNCTIONS };
