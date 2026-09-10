-- Database Schema for Kolhapur Emergency Vehicle Green Corridor Management System

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- DRIVER, MEDICAL_STAFF, TRAFFIC_POLICE, HOSPITAL, ADMIN
    full_name TEXT NOT NULL,
    driver_id TEXT,
    staff_id TEXT,
    officer_id TEXT,
    zone TEXT,
    vehicle_id TEXT,
    vehicle_type TEXT,
    reg_no TEXT,
    hospital_id TEXT,
    base_lat REAL,
    base_lng REAL,
    base_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT UNIQUE NOT NULL,
    reg_no TEXT NOT NULL,
    vehicle_type TEXT NOT NULL, -- AMBULANCE, FIRE_BRIGADE, POLICE_VEHICLE, NDRF
    status TEXT DEFAULT 'IDLE', -- IDLE, ON_TRIP, MAINTENANCE
    fitness TEXT DEFAULT 'VALID',
    insurance TEXT DEFAULT 'VALID',
    authorized INTEGER DEFAULT 1,
    username TEXT,
    current_lat REAL,
    current_lng REAL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hospitals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS landmarks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    is_origin INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS junctions (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- ACCIDENT, FIRE, MEDICAL, RESCUE
    type_label TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    location_name TEXT NOT NULL,
    description TEXT,
    contact TEXT,
    status TEXT DEFAULT 'NEW', -- NEW, ASSIGNED, RESOLVED, CANCELLED
    assigned_username TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY, -- EMG-2026-XXXX
    vehicle_id TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    driver_username TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    medical_staff_name TEXT,
    origin_name TEXT NOT NULL,
    origin_lat REAL NOT NULL,
    origin_lng REAL NOT NULL,
    dest_id TEXT,
    dest_name TEXT NOT NULL,
    dest_lat REAL NOT NULL,
    dest_lng REAL NOT NULL,
    status TEXT NOT NULL, -- EN_ROUTE, ARRIVED, CANCELLED
    corridor_status TEXT DEFAULT 'NONE', -- NONE, REQUESTED, APPROVED, ACTIVE, PAUSED, CLOSED, REJECTED
    leg TEXT DEFAULT 'DIRECT', -- DIRECT, TO_INCIDENT, TO_HOSPITAL
    incident_id TEXT,
    distance REAL NOT NULL,
    eta_normal_sec REAL NOT NULL,
    eta_corridor_sec REAL NOT NULL,
    route_coords_json TEXT NOT NULL,
    signals_json TEXT NOT NULL,
    progress_frac REAL DEFAULT 0,
    current_speed_kmh REAL DEFAULT 0,
    current_lat REAL,
    current_lng REAL,
    sos_active INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_cases (
    trip_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    criticality TEXT DEFAULT 'STABLE', -- STABLE, SERIOUS, CRITICAL
    category TEXT DEFAULT 'OTHER', -- TRAUMA, CARDIAC, ACCIDENT, FIRE, MEDICAL, RESCUE, OTHER
    oxygen INTEGER DEFAULT 0,
    notes TEXT,
    incoming_sent INTEGER DEFAULT 0,
    hospital_ready INTEGER DEFAULT 0,
    hosp_accepted INTEGER DEFAULT 0,
    hosp_preparing INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TEXT NOT NULL,
    user TEXT NOT NULL,
    action TEXT NOT NULL,
    meta TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
