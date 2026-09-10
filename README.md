# LifelineX — Emergency Vehicle Green Corridor Management System

**LifelineX** is a real-time coordination platform that links citizens, emergency vehicle drivers, Traffic Police/RTO, and hospitals to enable faster, safer emergency response through live GPS tracking, Green Corridor signal-priority requests, and hospital pre-alerts.

Built for **Smart India Hackathon (SIH)** — Student Innovation track
**Problem Statement ID:** 26205 (AICTE)
**Theme:** Transportation & Logistics

## Overview

Emergency vehicles (ambulances, fire brigades, police vehicles, NDRF units) often lose critical minutes navigating congested city traffic. LifelineX addresses this by giving each stakeholder a role-specific live dashboard:

- **Driver** — starts a trip, requests a Green Corridor, and sees live route/status
- **Traffic Police** — reviews and approves Green Corridor requests, monitors active corridors by zone
- **Hospital** — receives pre-alerts for incoming emergency vehicles and patient status
- **Medical Staff** — tracks assigned trips and incident details
- **Admin** — manages users and vehicles, views system-wide audit logs and reports

The current build is a **self-contained interactive prototype**: a single HTML file with an in-browser simulation of live vehicle movement, corridor approval flow, and role-based dashboards, backed by shared state so multiple simulated devices/roles stay in sync.

## Tech Stack

- HTML, CSS, JavaScript (vanilla — no build tools or frameworks)
- [Leaflet.js](https://leafletjs.com/) for interactive maps
- Google Fonts (Space Grotesk, Inter, JetBrains Mono)

## How to Run

No installation or build step required.

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd <repo-folder>
   ```
2. Open `index.html` directly in a browser, **or** serve it locally:
   ```bash
   python3 -m http.server 8000
   ```
   then visit `http://localhost:8000`

3. Log in using one of the demo role credentials shown on the login screen (Driver, Traffic Police, Hospital, Medical Staff, or Admin) to explore that dashboard.

## Project Status

Prototype / hackathon submission — built to demonstrate the core coordination workflow and UX across all five stakeholder roles. Not yet connected to real GPS hardware, live traffic signal systems, or a production backend.

## Team

_Add team name/members here._

## License

_Add license here (optional for hackathon submissions)._
