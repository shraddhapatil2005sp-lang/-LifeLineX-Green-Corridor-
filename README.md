# Emergency Vehicle Green Corridor Management System — Kolhapur 🚨

A full-stack, real-time emergency traffic coordination system designed for Kolhapur City. Built with **Node.js, Express, WebSockets (Socket.IO), SQLite**, and **Modular Frontend (Leaflet.js)**.

---

## 🌟 Architecture Overview

```
green-co/
├── data/
│   ├── schema.sql             # Relational Database Schema DDL
│   └── greencorridor.db       # SQLite Database (Auto-generated & Seeded)
├── backend/
│   ├── config/
│   │   └── db.js              # SQLite connection (WAL mode & foreign keys)
│   ├── models/
│   │   ├── UserModel.js       # User & authentication queries
│   │   ├── VehicleModel.js    # Vehicle registry & status
│   │   ├── HospitalModel.js   # 33+ Kolhapur Hospitals & Junctions
│   │   ├── IncidentModel.js   # Public emergency reports & nearest unit routing
│   │   ├── TripModel.js       # Corridor dispatch & patient cases
│   │   └── AuditModel.js      # System audit logging
│   ├── routes/
│   │   ├── authRoutes.js      # /api/auth
│   │   ├── userRoutes.js      # /api/users
│   │   ├── vehicleRoutes.js   # /api/vehicles
│   │   ├── hospitalRoutes.js  # /api/locations
│   │   ├── incidentRoutes.js  # /api/incidents
│   │   ├── tripRoutes.js      # /api/trips
│   │   └── auditRoutes.js     # /api/audit-logs
│   ├── socket/
│   │   └── socketHandler.js   # Real-time WebSocket event broadcaster
│   ├── seeds/
│   │   └── seedData.js        # Initial data for hospitals, junctions, and crew
│   └── server.js              # Express + Socket.IO server entry point
├── public/
│   ├── index.html             # Clean semantic HTML5 UI
│   ├── css/
│   │   └── styles.css         # Dark theme & responsive CSS
│   └── js/
│       ├── config.js          # App constants & configuration
│       ├── api.js             # REST API Client wrapper
│       ├── socketClient.js    # WebSocket client listener & emitter
│       ├── mapHandler.js      # Leaflet map, OSRM routing & signal calculations
│       └── app.js             # Role-based dashboard logic & state management
├── package.json
└── README.md
```

---

## 🚀 How to Run

1. **Install Dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Start the Application**:
   ```bash
   npm start
   ```

3. **Open in Browser**:
   ```
   http://localhost:3000
   ```

---

## 🔐 Default Test Accounts

All accounts use password: `Pass@123`

| Role | Username | Notes |
| :--- | :--- | :--- |
| **Ambulance Driver** | `dv202601` to `dv202604` | Live dispatch, corridor request, GPS |
| **Fire Brigade Driver** | `fb202601` to `fb202604` | Fire station dispatch to incident sites |
| **Police Vehicle** | `pv202601` to `pv202604` | Law & order response units |
| **NDRF Rescue** | `nd202601` to `nd202604` | Disaster & flood rescue teams |
| **Medical Staff** | `mo202601` to `mo202604` | Patient case & triage updates |
| **Traffic Police / RTO** | `tp202601` to `tp202604` | Corridor approval, signal control |
| **Hospitals** | `hp202601` to `hp202633` | Incoming ambulance triage & ED prep |
| **System Admin** | `admin2026` | User & vehicle registry, audit logs |

---

## 🆘 Public Emergency Reporting

Any citizen can report a road accident, fire, or medical emergency directly from the landing page **without login**. The system automatically computes the nearest standby emergency vehicle using Haversine distance and alerts the driver.
