// Main Application Logic
class GreenCorridorApp {
  constructor() {
    this.currentUser = null;
    this.activeTrip = null;
    this.hospitals = [];
    this.landmarks = [];
    this.fireSites = [];
    this.junctions = [];
    this.publicIncidents = [];
    
    // Driver Map state
    this.driverMap = null;
    this.driverMapInited = false;
    this.driverOriginMarker = null;
    this.driverDestMarker = null;
    this.driverRouteLine = null;
    this.driverAmbMarker = null;
    this.driverSignalMarkers = [];
    this.driverLiveMarker = null;
    this.animTimer = null;
    this.liveGPSWatchId = null;

    // Traffic Police Map state
    this.tpMap = null;
    this.tpMapInited = false;
    this.tpVehMarker = null;
    this.tpSignalMarkers = [];

    // Hospital Map state
    this.hospMap = null;
    this.hospMapInited = false;
    this.hospVehMarker = null;
    this.hospMarker = null;
  }

  async init() {
    this.setupClock();
    this.bindAuthEvents();
    this.bindPublicReportEvents();

    try {
      // Load reference data
      const [hospRes, landRes, fireRes, juncRes] = await Promise.all([
        API.getHospitals(),
        API.getLandmarks(true),
        API.getFireIncidentSites(),
        API.getJunctions()
      ]);
      this.hospitals = hospRes.hospitals || [];
      this.landmarks = landRes.landmarks || [];
      this.fireSites = fireRes.sites || [];
      this.junctions = juncRes.junctions || [];

      // Check existing session
      const savedUserJson = localStorage.getItem('gc_session_user');
      if (savedUserJson) {
        const parsed = JSON.parse(savedUserJson);
        const meRes = await API.getMe(parsed.username);
        if (meRes.success && meRes.user) {
          this.setCurrentUser(meRes.user);
          this.showApp();
        }
      }

      // Check active trip
      const tripRes = await API.getActiveTrip();
      if (tripRes.success && tripRes.trip) {
        this.activeTrip = tripRes.trip;
      }
    } catch (e) {
      console.error('App init error:', e);
    }

    // Initialize WebSockets
    SocketClient.init();
  }

  setupClock() {
    const pad = n => n.toString().padStart(2, '0');
    setInterval(() => {
      const d = new Date();
      const str = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      const c = document.getElementById('clock');
      if (c) c.textContent = str;
    }, 1000);
  }

  bindAuthEvents() {
    const loginBtn = document.getElementById('loginBtn');
    const loginPass = document.getElementById('loginPass');
    const logoutBtn = document.getElementById('logoutBtn');

    const handleLogin = async () => {
      const u = document.getElementById('loginUser').value.trim();
      const p = document.getElementById('loginPass').value.trim();
      const errBox = document.getElementById('loginError');

      try {
        const res = await API.login(u, p);
        if (res.success && res.user) {
          errBox.style.display = 'none';
          this.setCurrentUser(res.user);
          this.showApp();
        }
      } catch (err) {
        errBox.textContent = err.message || 'Invalid username or password.';
        errBox.style.display = 'block';
      }
    };

    loginBtn.addEventListener('click', handleLogin);
    loginPass.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });

    logoutBtn.addEventListener('click', () => {
      if (this.currentUser) {
        API.logAudit(this.currentUser.username, 'LOGOUT').catch(() => {});
      }
      this.currentUser = null;
      window.currentUser = null;
      localStorage.removeItem('gc_session_user');
      document.getElementById('app').classList.remove('active');
      document.getElementById('loginWrap').style.display = 'flex';
      document.getElementById('loginUser').value = '';
      document.getElementById('loginPass').value = '';
      document.querySelectorAll('.dash').forEach(d => d.classList.remove('active'));
    });
  }

  async setCurrentUser(user) {
    this.currentUser = user;
    window.currentUser = user;
    localStorage.setItem('gc_session_user', JSON.stringify(user));
    SocketClient.joinRole(user.role, user.username);

    try {
      const tripRes = await API.getActiveTrip(user.vehicleId || '');
      if (tripRes.success && tripRes.trip) {
        this.activeTrip = tripRes.trip;
      } else {
        this.activeTrip = null;
      }
    } catch (e) {
      this.activeTrip = null;
    }
  }

  showApp() {
    document.getElementById('loginWrap').style.display = 'none';
    document.getElementById('publicWrap').style.display = 'none';
    document.getElementById('app').classList.add('active');
    
    document.getElementById('roleChipText').textContent = `${this.currentUser.fullName} · ${CONFIG.ROLE_LABELS[this.currentUser.role] || this.currentUser.role}`;
    
    this.openDashboardForRole(this.currentUser.role);
  }

  openDashboardForRole(role) {
    document.querySelectorAll('.dash').forEach(d => d.classList.remove('active'));
    const targetDash = document.getElementById('dash-' + role);
    if (targetDash) targetDash.classList.add('active');

    if (role === 'DRIVER') this.initDriverDashboard();
    if (role === 'MEDICAL_STAFF') this.initMedicalDashboard();
    if (role === 'TRAFFIC_POLICE') this.initTrafficDashboard();
    if (role === 'HOSPITAL') this.initHospitalDashboard();
    if (role === 'ADMIN') this.initAdminDashboard();
  }

  /* ================================================================
     DRIVER DASHBOARD
     ================================================================ */
  async initDriverDashboard() {
    document.getElementById('drvName').textContent = this.currentUser.fullName;
    document.getElementById('drvId').textContent = this.currentUser.driverId || '—';
    document.getElementById('drvVehId').textContent = this.currentUser.vehicleId || '—';
    document.getElementById('drvReg').textContent = this.currentUser.regNo || '—';
    document.getElementById('drvType').textContent = (this.currentUser.vehicleType || '—').replace('_', ' ');

    const originSel = document.getElementById('origin');
    const destSel = document.getElementById('destination');
    const isFireBrigade = this.currentUser.vehicleType === 'FIRE_BRIGADE';

    originSel.innerHTML = '';
    destSel.innerHTML = '';

    const origins = isFireBrigade 
      ? this.landmarks 
      : this.landmarks;

    origins.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = l.name;
      originSel.appendChild(opt);
    });

    if (isFireBrigade) {
      document.getElementById('destLabel').textContent = '🔥 Fire Incident Location';
      this.fireSites.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        destSel.appendChild(opt);
      });
      originSel.value = 'firehq';
      destSel.selectedIndex = 0;
    } else {
      document.getElementById('destLabel').textContent = 'Destination Hospital';
      this.hospitals.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h.id;
        opt.textContent = h.name;
        destSel.appendChild(opt);
      });
      originSel.selectedIndex = 6;
      destSel.selectedIndex = 0;
    }

    if (!this.driverMapInited) {
      const center = isFireBrigade ? [16.6928, 74.2288] : CONFIG.DEFAULT_MAP_CENTER;
      this.driverMap = MapHandler.createMap('map', center, 14);

      // Add city landmarks and hospitals
      const fireStation = this.landmarks.find(l => l.id === 'firehq');
      if (fireStation) {
        L.marker([fireStation.lat, fireStation.lng], { icon: MapHandler.makeDivIcon('loc-incident', '🚒', 24) })
          .addTo(this.driverMap).bindPopup(`<b>${fireStation.name}</b>`);
      }

      this.hospitals.forEach(h => {
        L.marker([h.lat, h.lng], { icon: MapHandler.makeDivIcon('loc-hospital', '🏥', 18) })
          .addTo(this.driverMap).bindPopup(`<b>${h.name}</b>`);
      });

      this.landmarks.forEach(l => {
        L.circleMarker([l.lat, l.lng], { radius: 4, color: '#5B8CFF', weight: 1, fillColor: '#5B8CFF', fillOpacity: 0.7 })
          .addTo(this.driverMap).bindPopup(`<b>${l.name}</b>`);
      });

      this.driverMapInited = true;
    } else {
      setTimeout(() => this.driverMap.invalidateSize(), 100);
    }

    this.bindDriverActionButtons();
    await this.loadDriverIncidents();
    this.refreshDriverTripUI();
  }

  bindDriverActionButtons() {
    document.getElementById('dispatchBtn').onclick = () => this.handleDriverStartTrip();
    document.getElementById('stopTripBtn').onclick = () => this.handleDriverStopTrip();
    document.getElementById('cancelTripBtn').onclick = () => this.handleDriverCancelTrip();
    document.getElementById('shareLocBtn').onclick = () => this.handleDriverToggleGPS();
    document.getElementById('requestCorridorBtn').onclick = () => this.handleDriverRequestCorridor();
    document.getElementById('pickedUpBtn').onclick = () => this.handleDriverPickedUpContinue();
    document.getElementById('sosBtn').onclick = () => this.handleDriverSOS();
  }

  async loadDriverIncidents() {
    if (!this.currentUser) return;
    try {
      const res = await API.getDriverIncidents(this.currentUser.username);
      if (res.success) {
        this.renderDriverIncidents(res.incidents);
      }
    } catch (e) {
      console.error('Failed to load incidents:', e);
    }
  }

  renderDriverIncidents(incidents) {
    const box = document.getElementById('incidentAlertList');
    const countChip = document.getElementById('incidentAlertCount');
    if (!box) return;

    if (!incidents || !incidents.length) {
      box.innerHTML = '<div class="empty">No public accident/fire reports assigned to your vehicle right now.</div>';
      countChip.style.display = 'none';
      return;
    }

    countChip.style.display = 'inline-block';
    countChip.textContent = incidents.length;

    box.innerHTML = incidents.map(inc => `
      <div class="signal-item" style="align-items:flex-start;">
        <div class="signal-dot" style="background:var(--red);box-shadow:0 0 6px var(--red);margin-top:4px;"></div>
        <div class="signal-info">
          <div class="signal-name">${CONFIG.INCIDENT_ICONS[inc.type] || '🆘'} ${inc.type_label} — ${inc.location_name}</div>
          <div class="signal-sub">${inc.description ? inc.description.slice(0, 70) : 'No description'} · ${inc.created_at}</div>
          ${inc.status === 'ASSIGNED' 
            ? '<span class="badge amber" style="margin-top:4px;">DISPATCHED</span>' 
            : `<button class="btn primary sm" style="margin-top:6px;" onclick="window.app.acceptAssignedIncident('${inc.id}')">🚑 ACCEPT & DISPATCH</button>`}
        </div>
      </div>
    `).join('');
  }

  async acceptAssignedIncident(incidentId) {
    try {
      const res = await API.getIncidents();
      const inc = (res.incidents || []).find(x => x.id === incidentId);
      if (!inc) return;

      // If this vehicle already has an ongoing trip, offer to cancel and switch
      if (this.activeTrip && this.activeTrip.vehicleId === this.currentUser.vehicleId && this.activeTrip.status === 'EN_ROUTE') {
        const confirmSwitch = confirm('You currently have an ongoing trip. Do you want to cancel it and dispatch immediately to this new emergency incident?');
        if (!confirmSwitch) return;
        try {
          await API.cancelTrip(this.activeTrip.emergencyCode, this.currentUser.username);
        } catch (err) {}
        this.activeTrip = null;
        this.clearDriverMapLayers();
      }

      await API.acceptIncident(inc.id, this.currentUser.username);

      const origin = {
        name: this.currentUser.base_name ? `${this.currentUser.base_name} (Vehicle Base)` : 'Vehicle Base',
        lat: this.currentUser.base_lat || 16.6980,
        lng: this.currentUser.base_lng || 74.2400
      };
      const dest = {
        name: `Incident Site — ${inc.location_name}`,
        lat: inc.lat,
        lng: inc.lng
      };

      await this.startTripExecution(origin, dest, {
        leg: 'TO_INCIDENT',
        incidentId: inc.id,
        autoRequestCorridor: true,
        patientCase: {
          criticality: inc.type === 'FIRE' ? 'SERIOUS' : 'CRITICAL',
          category: inc.type,
          oxygen: false,
          notes: inc.description || '',
          incomingSent: false,
          hospitalReady: false,
          hospAccepted: false,
          hospPreparing: false
        }
      });
      await this.loadDriverIncidents();
    } catch (e) {
      alert('Failed to accept incident: ' + e.message);
    }
  }

  async handleDriverStartTrip() {
    if (this.activeTrip && this.activeTrip.vehicleId === this.currentUser.vehicleId && this.activeTrip.status === 'EN_ROUTE') {
      const confirmRestart = confirm('You already have an active trip. Do you want to cancel the previous trip and start this new one?');
      if (!confirmRestart) return;
      try {
        await API.cancelTrip(this.activeTrip.emergencyCode, this.currentUser.username);
      } catch (err) {}
      this.activeTrip = null;
      this.clearDriverMapLayers();
    }

    const originSel = document.getElementById('origin');
    const destSel = document.getElementById('destination');
    const isFireBrigade = this.currentUser.vehicleType === 'FIRE_BRIGADE';

    const origin = this.landmarks.find(l => l.id === originSel.value) || this.landmarks[0];
    const dest = isFireBrigade
      ? (this.fireSites.find(s => s.id === destSel.value) || this.fireSites[0])
      : (this.hospitals.find(h => h.id === destSel.value) || this.hospitals[0]);

    await this.startTripExecution(origin, dest, { leg: 'DIRECT' });
  }

  async startTripExecution(origin, dest, options = {}) {
    const btn = document.getElementById('dispatchBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Computing route…';

    try {
      const route = await MapHandler.fetchOSRMRoute(origin, dest);
      const totalDist = route.distance;
      const signals = MapHandler.buildSignals(route.coords, totalDist, this.junctions);
      const etaNormalSec = totalDist / CONFIG.SPEED.NORMAL_SPEED_MPS;
      const etaCorridorSec = totalDist / CONFIG.SPEED.CORRIDOR_SPEED_MPS;
      const emergencyCode = 'EMG-2026-' + Math.floor(1000 + Math.random() * 8999);

      const tripPayload = {
        emergencyCode,
        vehicleId: this.currentUser.vehicleId,
        vehicleType: this.currentUser.vehicleType,
        driverUsername: this.currentUser.username,
        driverName: this.currentUser.fullName,
        medicalStaffName: null,
        originName: origin.name,
        originLat: origin.lat,
        originLng: origin.lng,
        destHospital: {
          id: dest.id,
          name: dest.name,
          lat: dest.lat,
          lng: dest.lng
        },
        status: 'EN_ROUTE',
        corridorStatus: 'NONE',
        leg: options.leg || 'DIRECT',
        incidentId: options.incidentId || null,
        distance: totalDist,
        etaNormalSec,
        etaCorridorSec,
        routeCoords: route.coords,
        signals,
        progressFrac: 0,
        currentSpeedKmh: 0,
        liveGPS: { lat: origin.lat, lng: origin.lng, speedKmh: 0, ts: Date.now() },
        sosActive: false,
        patientCase: options.patientCase || {
          criticality: 'STABLE',
          category: 'OTHER',
          oxygen: false,
          notes: '',
          incomingSent: false,
          hospitalReady: false,
          hospAccepted: false,
          hospPreparing: false
        }
      };

      const res = await API.startTrip(tripPayload);
      if (res.success && res.trip) {
        this.activeTrip = res.trip;
        this.renderDriverRouteVisuals(this.activeTrip);
        this.driverLog(`Emergency trip started: <b>${origin.name}</b> → <b>${dest.name}</b>`, 'l-amber');

        if (options.autoRequestCorridor) {
          await this.handleDriverRequestCorridor();
        }
      }
    } catch (err) {
      this.driverLog('Failed to start trip: ' + err.message, 'l-red');
      alert('Error starting trip: ' + err.message);
    } finally {
      btn.disabled = false;
      this.refreshDriverTripUI();
    }
  }

  renderDriverRouteVisuals(trip) {
    this.clearDriverMapLayers();

    const originData = { lat: trip.originLat, lng: trip.originLng, name: trip.originName };
    const destData = trip.destHospital;
    const isFireBrigade = trip.vehicleType === 'FIRE_BRIGADE';
    const destEmoji = trip.leg === 'TO_INCIDENT' ? '🚨' : isFireBrigade ? '🔥' : '🏥';
    const destCls = trip.leg === 'TO_INCIDENT' ? 'loc-incident' : isFireBrigade ? 'loc-incident' : 'loc-hospital';

    this.driverOriginMarker = L.marker([originData.lat, originData.lng], { icon: MapHandler.makeDivIcon('loc-incident', '📍', 26) })
      .addTo(this.driverMap).bindPopup(`<b>Pickup:</b> ${originData.name}`);
    this.driverDestMarker = L.marker([destData.lat, destData.lng], { icon: MapHandler.makeDivIcon(destCls, destEmoji, 26) })
      .addTo(this.driverMap).bindPopup(`<b>Destination:</b> ${destData.name}`);

    this.driverRouteLine = L.polyline(trip.routeCoords.map(c => [c.lat, c.lng]), { color: '#5B8CFF', weight: 5, opacity: 0.85 }).addTo(this.driverMap);
    const glow = L.polyline(trip.routeCoords.map(c => [c.lat, c.lng]), { color: '#5B8CFF', weight: 12, opacity: 0.15 }).addTo(this.driverMap);
    this.driverRouteLine._glow = glow;

    this.driverMap.fitBounds(this.driverRouteLine.getBounds(), { padding: [40, 40] });

    // Place signal markers
    trip.signals.forEach((s, i) => {
      const m = L.marker([s.coord.lat, s.coord.lng], {
        icon: L.divIcon({ className: '', html: `<div class="sig-marker" id="sig-map-${i}"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] })
      }).addTo(this.driverMap).bindPopup(`<b>${s.name}</b> (${s.code})`);
      this.driverSignalMarkers.push(m);
    });

    this.renderDriverMetrics(trip);
    this.renderDriverSignalList(trip.signals);
    this.renderDriverIotList(trip.signals);
    this.renderDriverRail(trip.signals);
  }

  clearDriverMapLayers() {
    if (this.animTimer) cancelAnimationFrame(this.animTimer);
    [this.driverOriginMarker, this.driverDestMarker, this.driverAmbMarker].forEach(m => { if (m) this.driverMap.removeLayer(m); });
    if (this.driverRouteLine) {
      if (this.driverRouteLine._glow) this.driverMap.removeLayer(this.driverRouteLine._glow);
      this.driverMap.removeLayer(this.driverRouteLine);
    }
    this.driverSignalMarkers.forEach(m => this.driverMap.removeLayer(m));
    this.driverSignalMarkers = [];
    this.driverOriginMarker = this.driverDestMarker = this.driverAmbMarker = this.driverRouteLine = null;
  }

  renderDriverMetrics(trip) {
    const box = document.getElementById('metricsBox');
    if (!box) return;
    if (!trip) {
      box.innerHTML = '<div class="empty">Select pickup + hospital, then start emergency trip.</div>';
      return;
    }
    const fmt = sec => {
      sec = Math.max(0, Math.round(sec));
      const m = Math.floor(sec / 60), s = sec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    box.innerHTML = `<div class="metric-grid">
      <div class="metric"><div class="val">${(trip.distance / 1000).toFixed(2)} km</div><div class="lbl">DISTANCE</div></div>
      <div class="metric"><div class="val">${fmt(trip.etaCorridorSec)}</div><div class="lbl">CORRIDOR ETA</div></div>
      <div class="metric"><div class="val">${fmt(trip.etaNormalSec)}</div><div class="lbl">NORMAL ETA</div></div>
      <div class="metric save"><div class="val">${fmt(trip.etaNormalSec - trip.etaCorridorSec)}</div><div class="lbl">TIME SAVED</div></div>
    </div>`;
  }

  renderDriverSignalList(signals) {
    const box = document.getElementById('signalList');
    if (!box) return;
    if (!signals || !signals.length) {
      box.innerHTML = '<div class="empty">No signal junctions on this route.</div>';
      return;
    }
    const fmt = sec => {
      sec = Math.max(0, Math.round(sec));
      const m = Math.floor(sec / 60), s = sec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    box.innerHTML = signals.map((s, i) => `<div class="signal-item" id="sig-row-${i}">
      <div class="signal-dot" id="sig-dot-${i}"></div>
      <div class="signal-info"><div class="signal-name">${s.name}</div><div class="signal-sub">${(s.distM / 1000).toFixed(2)} km · ${s.code}</div></div>
      <div class="signal-eta">${fmt(s.etaCorridor)}</div>
    </div>`).join('');
  }

  renderDriverIotList(signals) {
    const box = document.getElementById('iotList');
    if (!box) return;
    if (!signals || !signals.length) {
      box.innerHTML = '<div class="empty">No connected controllers on this route.</div>';
      return;
    }
    box.innerHTML = signals.map((s, i) => `<div class="iot-item"><div><div>${s.name}</div><span class="iot-id">CTRL-ID: ${s.code}</span></div><div class="iot-chip" id="iot-chip-${i}">OFF</div></div>`).join('');
  }

  renderDriverRail(signals) {
    const track = document.getElementById('railTrack');
    if (!track) return;
    if (!signals || !signals.length) {
      track.innerHTML = '<div class="rail-empty">No intermediate signals on this route.</div>';
      return;
    }
    const lastFrac = 96;
    track.innerHTML = `<div class="rail-line"></div><div class="rail-line-fill" id="railFill"></div>
      ${signals.map((s, i) => {
        const pct = 6 + (s.distM / (signals[signals.length - 1].distM || 1)) * (lastFrac - 6);
        return `<div class="rail-node" id="rail-node-${i}" style="left:${pct}%;"><div class="dot"></div><div class="rn-label">${s.name}</div></div>`;
      }).join('')}
      <div class="rail-veh" id="railVeh" style="left:6%;">🚑</div>`;
  }

  refreshDriverTripUI() {
    const hasTrip = !!(this.activeTrip && this.activeTrip.status === 'EN_ROUTE');
    const isMyTrip = hasTrip && this.activeTrip.vehicleId === this.currentUser?.vehicleId;

    const reqBtn = document.getElementById('requestCorridorBtn');
    const stopBtn = document.getElementById('stopTripBtn');
    const cancelBtn = document.getElementById('cancelTripBtn');
    const dispatchBtn = document.getElementById('dispatchBtn');
    const pickedUpBtn = document.getElementById('pickedUpBtn');

    if (reqBtn) reqBtn.disabled = !isMyTrip || this.activeTrip.corridorStatus !== 'NONE';
    if (stopBtn) stopBtn.disabled = !isMyTrip;
    if (cancelBtn) cancelBtn.disabled = !isMyTrip;
    if (dispatchBtn) {
      dispatchBtn.disabled = isMyTrip;
      dispatchBtn.textContent = isMyTrip ? '🚑 Trip En Route' : '🚨 START EMERGENCY TRIP';
    }
    if (pickedUpBtn) {
      pickedUpBtn.style.display = (isMyTrip && this.activeTrip.leg === 'TO_INCIDENT') ? 'block' : 'none';
    }
  }

  async handleDriverRequestCorridor() {
    if (!this.activeTrip) return;
    try {
      const res = await API.requestCorridor(this.activeTrip.emergencyCode, this.currentUser.username);
      if (res.success && res.trip) {
        this.activeTrip = res.trip;
        this.driverLog('Green Corridor requested — awaiting Traffic Police authorization.', 'l-amber');
        document.getElementById('railStatus').textContent = 'CORRIDOR REQUESTED';
        document.getElementById('railStatus').style.color = 'var(--amber)';
        this.refreshDriverTripUI();
      }
    } catch (e) {
      alert('Error requesting corridor: ' + e.message);
    }
  }

  async handleDriverStopTrip() {
    if (!this.activeTrip) return;
    try {
      const res = await API.stopTrip(this.activeTrip.emergencyCode, this.currentUser.username);
      if (res.success) {
        if (this.animTimer) cancelAnimationFrame(this.animTimer);
        this.activeTrip = res.trip;
        this.driverLog('Emergency trip completed/stopped.', 'l-amber');
        this.refreshDriverTripUI();
      }
    } catch (e) {
      alert('Error stopping trip: ' + e.message);
    }
  }

  async handleDriverCancelTrip() {
    if (!this.activeTrip) return;
    try {
      const res = await API.cancelTrip(this.activeTrip.emergencyCode, this.currentUser.username);
      if (res.success) {
        if (this.animTimer) cancelAnimationFrame(this.animTimer);
        this.activeTrip = null;
        this.clearDriverMapLayers();
        this.renderDriverMetrics(null);
        this.renderDriverSignalList([]);
        this.renderDriverIotList([]);
        this.renderDriverRail([]);
        document.getElementById('railStatus').textContent = 'STANDBY';
        document.getElementById('railStatus').style.color = 'var(--muted-2)';
        this.driverLog('Emergency cancelled.', 'l-red');
        this.refreshDriverTripUI();
        await this.loadDriverIncidents();
      }
    } catch (e) {
      alert('Error cancelling trip: ' + e.message);
    }
  }

  async handleDriverPickedUpContinue() {
    if (!this.activeTrip || this.activeTrip.leg !== 'TO_INCIDENT') return;
    const incidentPoint = {
      lat: this.activeTrip.destHospital.lat,
      lng: this.activeTrip.destHospital.lng,
      name: this.activeTrip.destHospital.name
    };

    let nearestHosp = this.hospitals[0];
    let bestDist = Infinity;
    this.hospitals.forEach(h => {
      const d = MapHandler.haversine(incidentPoint, h);
      if (d < bestDist) {
        bestDist = d;
        nearestHosp = h;
      }
    });

    this.driverLog('Patient picked up at incident site — continuing to nearest hospital.', 'l-green');
    await this.startTripExecution(incidentPoint, nearestHosp, {
      leg: 'TO_HOSPITAL',
      incidentId: this.activeTrip.incidentId,
      autoRequestCorridor: true,
      patientCase: this.activeTrip.patientCase
    });
  }

  async handleDriverSOS() {
    if (!this.activeTrip) {
      alert('Please start an emergency trip first to broadcast active SOS route.');
      return;
    }
    try {
      const res = await API.triggerSOS(this.activeTrip.emergencyCode, this.currentUser.username);
      if (res.success && res.trip) {
        this.activeTrip = res.trip;
        this.driverLog('🆘 EMERGENCY SOS TRIGGERED — highest priority alert sent to Traffic Control and Hospital.', 'l-red');
      }
    } catch (e) {
      alert('Failed to trigger SOS: ' + e.message);
    }
  }

  handleDriverToggleGPS() {
    const btn = document.getElementById('shareLocBtn');
    const statusText = document.getElementById('drvGps');

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser/device.');
      return;
    }

    if (this.liveGPSWatchId !== null) {
      navigator.geolocation.clearWatch(this.liveGPSWatchId);
      this.liveGPSWatchId = null;
      statusText.textContent = 'OFF';
      btn.textContent = '📡 SHARE LIVE LOCATION';
      if (this.driverLiveMarker) {
        this.driverMap.removeLayer(this.driverLiveMarker);
        this.driverLiveMarker = null;
      }
      this.driverLog('Live GPS sharing stopped.', 'l-amber');
      return;
    }

    btn.textContent = '⏳ FETCHING GPS…';
    this.liveGPSWatchId = navigator.geolocation.watchPosition(
      pos => {
        statusText.textContent = 'ON';
        btn.textContent = '📡 SHARING…';
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speedKmh = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;

        if (!this.driverLiveMarker) {
          this.driverLiveMarker = L.marker([lat, lng], {
            icon: L.divIcon({ className: '', html: '<div class="drv-icon"><div class="core"></div></div>', iconSize: [20, 20], iconAnchor: [10, 10] })
          }).addTo(this.driverMap);
        } else {
          this.driverLiveMarker.setLatLng([lat, lng]);
        }
        this.driverMap.panTo([lat, lng]);

        if (this.activeTrip && this.activeTrip.vehicleId === this.currentUser.vehicleId) {
          API.updateGPS(this.activeTrip.emergencyCode, { lat, lng, speedKmh, progressFrac: this.activeTrip.progressFrac }).catch(() => {});
        }
      },
      err => {
        btn.textContent = '📡 SHARE LIVE LOCATION';
        statusText.textContent = 'OFF';
        this.driverLog('GPS Error: ' + err.message, 'l-red');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }

  driverLog(msg, cls) {
    const box = document.getElementById('drvLogBox');
    if (!box) return;
    const now = new Date().toLocaleTimeString('en-GB');
    const line = document.createElement('div');
    line.innerHTML = `<span class="l-time">[${now}]</span> <span class="${cls || ''}">${msg}</span>`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  /* ================================================================
     MEDICAL STAFF DASHBOARD
     ================================================================ */
  initMedicalDashboard() {
    this.renderMedicalDashboard();
    document.getElementById('medUpdateBtn').onclick = () => this.handleMedicalUpdateCase();
    document.getElementById('medIncomingBtn').onclick = () => this.handleMedicalSendIncoming();
  }

  renderMedicalDashboard() {
    const has = !!(this.activeTrip && this.activeTrip.vehicleId === this.currentUser.vehicleId);
    const trip = this.activeTrip;

    document.getElementById('medCaseId').textContent = has ? trip.emergencyCode.replace('EMG', 'CASE') : '—';
    document.getElementById('medVehId').textContent = has ? trip.vehicleId : (this.currentUser.vehicleId || '—');
    document.getElementById('medDriver').textContent = has ? trip.driverName : '—';
    document.getElementById('medDest').textContent = has ? trip.destHospital.name : '—';
    document.getElementById('medDist').textContent = has ? ((trip.distance * (1 - trip.progressFrac)) / 1000).toFixed(2) + ' km' : '—';
    
    const fmt = sec => {
      sec = Math.max(0, Math.round(sec));
      const m = Math.floor(sec / 60), s = sec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    document.getElementById('medEta').textContent = has ? fmt(trip.etaCorridorSec * (1 - trip.progressFrac)) : '—';

    const cb = document.getElementById('medCorridorBadge');
    cb.textContent = has ? trip.corridorStatus : 'NO ACTIVE TRIP';
    cb.className = 'badge ' + (has && trip.corridorStatus === 'ACTIVE' ? 'green' : has && trip.corridorStatus === 'REQUESTED' ? 'amber' : 'grey');

    const hb = document.getElementById('medHospBadge');
    hb.textContent = has && trip.patientCase.hospitalReady ? 'READY TO RECEIVE' : has ? 'AWAITING PREP' : '—';
    hb.className = 'badge ' + (has && trip.patientCase.hospitalReady ? 'green' : 'grey');

    if (has) {
      document.getElementById('medCriticality').value = trip.patientCase.criticality || 'STABLE';
      document.getElementById('medCategory').value = trip.patientCase.category || 'OTHER';
      document.getElementById('medOxygen').checked = !!trip.patientCase.oxygen;
      document.getElementById('medNotes').value = trip.patientCase.notes || '';
    }

    const updateBtn = document.getElementById('medUpdateBtn');
    const incomingBtn = document.getElementById('medIncomingBtn');
    if (updateBtn) updateBtn.disabled = !has;
    if (incomingBtn) incomingBtn.disabled = !has;
  }

  async handleMedicalUpdateCase() {
    if (!this.activeTrip) return;
    try {
      const payload = {
        criticality: document.getElementById('medCriticality').value,
        category: document.getElementById('medCategory').value,
        oxygen: document.getElementById('medOxygen').checked,
        notes: document.getElementById('medNotes').value,
        username: this.currentUser.username
      };
      const res = await API.updatePatientCase(this.activeTrip.emergencyCode, payload);
      if (res.success && res.trip) {
        this.activeTrip = res.trip;
        this.renderMedicalDashboard();
        alert('Patient case details updated successfully!');
      }
    } catch (e) {
      alert('Failed to update case: ' + e.message);
    }
  }

  async handleMedicalSendIncoming() {
    if (!this.activeTrip) return;
    try {
      const res = await API.updatePatientCase(this.activeTrip.emergencyCode, { incomingSent: true, username: this.currentUser.username });
      if (res.success && res.trip) {
        this.activeTrip = res.trip;
        this.renderMedicalDashboard();
        alert('Patient Incoming alert broadcast to destination hospital!');
      }
    } catch (e) {
      alert('Failed to send alert: ' + e.message);
    }
  }

  /* ================================================================
     TRAFFIC POLICE DASHBOARD
     ================================================================ */
  initTrafficDashboard() {
    if (!this.tpMapInited) {
      this.tpMap = MapHandler.createMap('mapTP', CONFIG.DEFAULT_MAP_CENTER, 13);
      this.hospitals.forEach(h => {
        L.marker([h.lat, h.lng], { icon: MapHandler.makeDivIcon('loc-hospital', '🏥', 22) })
          .addTo(this.tpMap).bindPopup(`<b>${h.name}</b>`);
      });
      this.tpMapInited = true;
    } else {
      setTimeout(() => this.tpMap.invalidateSize(), 100);
    }

    document.getElementById('tpApproveBtn').onclick = () => this.handleTrafficApprove();
    document.getElementById('tpRejectBtn').onclick = () => this.handleTrafficReject();
    document.getElementById('tpPauseBtn').onclick = () => this.handleTrafficPause();
    document.getElementById('tpEndBtn').onclick = () => this.handleTrafficEnd();
    document.getElementById('tpOverrideBtn').onclick = () => this.handleTrafficOverride();
    document.getElementById('tpAlertBtn').onclick = () => this.handleTrafficBroadcast();

    this.renderTrafficDashboard();
  }

  renderTrafficDashboard() {
    this.tpSignalMarkers.forEach(m => this.tpMap.removeLayer(m));
    this.tpSignalMarkers = [];
    if (this.tpVehMarker) {
      this.tpMap.removeLayer(this.tpVehMarker);
      this.tpVehMarker = null;
    }

    const card = document.getElementById('tpVehicleCard');
    const seq = document.getElementById('tpSignalSeq');
    const approveBtn = document.getElementById('tpApproveBtn');
    const rejectBtn = document.getElementById('tpRejectBtn');
    const pauseBtn = document.getElementById('tpPauseBtn');
    const endBtn = document.getElementById('tpEndBtn');
    const overrideBtn = document.getElementById('tpOverrideBtn');

    if (!this.activeTrip) {
      card.innerHTML = '<div class="empty">No active emergency vehicle right now.</div>';
      seq.innerHTML = '<div class="empty">Appears once a route is dispatched.</div>';
      [approveBtn, rejectBtn, pauseBtn, endBtn, overrideBtn].forEach(b => { if (b) b.disabled = true; });
      return;
    }

    const trip = this.activeTrip;
    const fmt = sec => {
      sec = Math.max(0, Math.round(sec));
      const m = Math.floor(sec / 60), s = sec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    card.innerHTML = `
      <div class="kv"><span class="k">Vehicle ID</span><span class="v">${trip.vehicleId}</span></div>
      <div class="kv"><span class="k">Type</span><span class="v">${trip.vehicleType}</span></div>
      <div class="kv"><span class="k">Driver</span><span class="v">${trip.driverName}</span></div>
      <div class="kv"><span class="k">Destination</span><span class="v">${trip.destHospital.name}</span></div>
      <div class="kv"><span class="k">Distance</span><span class="v">${(trip.distance / 1000).toFixed(2)} km</span></div>
      <div class="kv"><span class="k">ETA (corridor)</span><span class="v">${fmt(trip.etaCorridorSec)}</span></div>
      <div class="kv"><span class="k">Priority</span><span class="v">${trip.sosActive ? '<span class="badge red">SOS</span>' : '<span class="badge amber">HIGH</span>'}</span></div>
      <div class="kv"><span class="k">Corridor Status</span><span class="v"><span class="badge ${trip.corridorStatus === 'ACTIVE' ? 'green' : trip.corridorStatus === 'REQUESTED' ? 'amber' : trip.corridorStatus === 'REJECTED' ? 'red' : 'grey'}">${trip.corridorStatus}</span></span></div>
      <div class="kv"><span class="k">Live GPS</span><span class="v">${trip.liveGPS ? trip.liveGPS.lat.toFixed(4) + ', ' + trip.liveGPS.lng.toFixed(4) + ' · ' + (trip.currentSpeedKmh || 0) + ' km/h' : '—'}</span></div>
    `;

    seq.innerHTML = (trip.signals || []).map((s, i) => {
      const status = trip.corridorStatus === 'ACTIVE' ? (i === 0 ? 'GREEN' : 'PREPARE') : 'PENDING';
      return `<div class="kv"><span class="k">${s.code} — ${s.name}</span><span class="v"><span class="badge ${status === 'GREEN' ? 'green' : status === 'PREPARE' ? 'amber' : 'grey'}">${status}</span></span></div>`;
    }).join('') || '<div class="empty">No intermediate signals on this route.</div>';

    // Plot route & signals
    trip.signals.forEach(s => {
      const m = L.circleMarker([s.coord.lat, s.coord.lng], { radius: 5, color: '#F5A524', fillOpacity: 0.8 }).addTo(this.tpMap).bindPopup(s.name);
      this.tpSignalMarkers.push(m);
    });

    if (trip.routeCoords && trip.routeCoords.length) {
      const line = L.polyline(trip.routeCoords.map(c => [c.lat, c.lng]), { color: '#5B8CFF', weight: 4, opacity: 0.7 }).addTo(this.tpMap);
      this.tpSignalMarkers.push(line);
      this.tpMap.fitBounds(line.getBounds(), { padding: [30, 30] });
    }

    const liveLat = trip.liveGPS ? trip.liveGPS.lat : (trip.routeCoords[0]?.lat || 16.698);
    const liveLng = trip.liveGPS ? trip.liveGPS.lng : (trip.routeCoords[0]?.lng || 74.24);
    this.tpVehMarker = L.marker([liveLat, liveLng], { icon: MapHandler.makeDivIcon('loc-incident', '🚑', 24) })
      .addTo(this.tpMap).bindPopup(`<b>${trip.vehicleId}</b><br>Live position · ${(trip.currentSpeedKmh || 0)} km/h`);

    approveBtn.disabled = trip.corridorStatus !== 'REQUESTED';
    rejectBtn.disabled = trip.corridorStatus !== 'REQUESTED';
    pauseBtn.disabled = trip.corridorStatus !== 'ACTIVE';
    endBtn.disabled = !(trip.corridorStatus === 'ACTIVE' || trip.corridorStatus === 'PAUSED');
    overrideBtn.disabled = false;
  }

  async handleTrafficApprove() {
    if (!this.activeTrip) return;
    try {
      const res = await API.approveCorridor(this.activeTrip.emergencyCode, this.currentUser.username);
      if (res.success && res.trip) {
        this.activeTrip = res.trip;
        this.tpLog(`Green Corridor <b>APPROVED</b> for ${this.activeTrip.emergencyCode}.`, 'l-green');
        this.renderTrafficDashboard();
      }
    } catch (e) {
      alert('Error approving corridor: ' + e.message);
    }
  }

  async handleTrafficReject() {
    if (!this.activeTrip) return;
    try {
      const res = await API.rejectCorridor(this.activeTrip.emergencyCode, this.currentUser.username);
      if (res.success && res.trip) {
        this.activeTrip = res.trip;
        this.tpLog(`Green Corridor <b>REJECTED</b> for ${this.activeTrip.emergencyCode}.`, 'l-red');
        this.renderTrafficDashboard();
      }
    } catch (e) {
      alert('Error rejecting corridor: ' + e.message);
    }
  }

  async handleTrafficPause() {
    if (!this.activeTrip) return;
    try {
      const res = await API.pauseCorridor(this.activeTrip.emergencyCode, this.currentUser.username);
      if (res.success && res.trip) {
        this.activeTrip = res.trip;
        this.tpLog(`Corridor <b>PAUSED</b> by traffic control.`, 'l-amber');
        this.renderTrafficDashboard();
      }
    } catch (e) {
      alert('Error pausing corridor: ' + e.message);
    }
  }

  async handleTrafficEnd() {
    if (!this.activeTrip) return;
    try {
      const res = await API.endCorridor(this.activeTrip.emergencyCode, this.currentUser.username);
      if (res.success && res.trip) {
        this.activeTrip = res.trip;
        this.tpLog(`Corridor <b>CLOSED</b> — normal cycle restored.`, 'l-amber');
        this.renderTrafficDashboard();
      }
    } catch (e) {
      alert('Error ending corridor: ' + e.message);
    }
  }

  handleTrafficOverride() {
    if (!this.activeTrip) return;
    API.logAudit(this.currentUser.username, 'SYSTEM_OVERRIDE', this.activeTrip.emergencyCode).catch(() => {});
    this.tpLog('Manual <b>override</b> of system recommendation logged.', 'l-amber');
  }

  handleTrafficBroadcast() {
    API.logAudit(this.currentUser.username, 'ALERT_SENT', this.activeTrip ? this.activeTrip.emergencyCode : 'general').catch(() => {});
    this.tpLog('Alert broadcast to all field units.', 'l-blue');
  }

  tpLog(msg, cls) {
    const box = document.getElementById('tpLogBox');
    if (!box) return;
    const now = new Date().toLocaleTimeString('en-GB');
    const line = document.createElement('div');
    line.innerHTML = `<span class="l-time">[${now}]</span> <span class="${cls || ''}">${msg}</span>`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  /* ================================================================
     HOSPITAL DASHBOARD
     ================================================================ */
  initHospitalDashboard() {
    const hospital = this.hospitals.find(h => h.id === this.currentUser.hospitalId);
    document.getElementById('hHospName').textContent = hospital ? hospital.name : '—';

    if (!this.hospMapInited) {
      this.hospMap = MapHandler.createMap('mapHosp', hospital ? [hospital.lat, hospital.lng] : CONFIG.DEFAULT_MAP_CENTER, 13);
      if (hospital) {
        this.hospMarker = L.marker([hospital.lat, hospital.lng], { icon: MapHandler.makeDivIcon('loc-hospital', '🏥', 24) })
          .addTo(this.hospMap).bindPopup(`<b>${hospital.name}</b> (this hospital)`);
      }
      this.hospMapInited = true;
    } else {
      setTimeout(() => this.hospMap.invalidateSize(), 100);
    }

    this.renderHospitalDashboard();
  }

  renderHospitalDashboard() {
    const hospital = this.hospitals.find(h => h.id === this.currentUser.hospitalId);
    const has = !!(this.activeTrip && this.activeTrip.destHospital.id === this.currentUser.hospitalId && this.activeTrip.status !== 'CANCELLED');
    const trip = this.activeTrip;

    document.getElementById('hCardAmb').textContent = has && trip.vehicleType === 'AMBULANCE' ? 1 : 0;
    document.getElementById('hCardCritical').textContent = has && trip.patientCase.criticality === 'CRITICAL' ? 1 : 0;
    document.getElementById('hCardEta5').textContent = has && trip.etaCorridorSec < 300 ? 1 : 0;
    document.getElementById('hCardCorridor').textContent = has && trip.corridorStatus === 'ACTIVE' ? 1 : 0;

    const liveBadge = document.getElementById('hLiveBadge');
    if (has && trip.liveGPS) {
      liveBadge.textContent = `LIVE · ${trip.vehicleId} · ${trip.currentSpeedKmh || 0} km/h`;
      liveBadge.className = 'badge green';
      if (!this.hospVehMarker) {
        this.hospVehMarker = L.marker([trip.liveGPS.lat, trip.liveGPS.lng], { icon: MapHandler.makeDivIcon('loc-incident', '🚑', 24) }).addTo(this.hospMap);
      } else {
        this.hospVehMarker.setLatLng([trip.liveGPS.lat, trip.liveGPS.lng]);
      }
      this.hospVehMarker.bindPopup(`<b>${trip.vehicleId}</b><br>${trip.driverName} · ${trip.currentSpeedKmh || 0} km/h`);
    } else {
      liveBadge.textContent = 'NO ACTIVE TRIP';
      liveBadge.className = 'badge grey';
      if (this.hospVehMarker) {
        this.hospMap.removeLayer(this.hospVehMarker);
        this.hospVehMarker = null;
      }
    }

    const list = document.getElementById('hospitalList');
    if (!has) {
      list.innerHTML = '<div class="empty">No incoming emergency vehicles.</div>';
      return;
    }

    const fmt = sec => {
      sec = Math.max(0, Math.round(sec));
      const m = Math.floor(sec / 60), s = sec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    list.innerHTML = `
      <table>
        <thead><tr><th>Vehicle</th><th>Driver</th><th>Patient</th><th>Location / Route</th><th>Distance</th><th>ETA</th><th>Speed</th><th>Corridor</th><th>Actions</th></tr></thead>
        <tbody>
          <tr>
            <td>${trip.vehicleId}</td>
            <td>${trip.driverName}</td>
            <td><span class="badge ${trip.patientCase.criticality === 'CRITICAL' ? 'red' : trip.patientCase.criticality === 'SERIOUS' ? 'amber' : 'grey'}">${trip.patientCase.criticality}</span></td>
            <td>${trip.originName} → ${trip.destHospital.name}</td>
            <td>${((trip.distance * (1 - trip.progressFrac)) / 1000).toFixed(2)} km</td>
            <td>${fmt(trip.etaCorridorSec * (1 - trip.progressFrac))}</td>
            <td>${trip.currentSpeedKmh || 0} km/h</td>
            <td><span class="badge ${trip.corridorStatus === 'ACTIVE' ? 'green' : 'grey'}">${trip.corridorStatus}</span></td>
            <td>
              <button class="btn ghost sm" onclick="window.app.handleHospAccept()" ${trip.patientCase.hospAccepted ? 'disabled' : ''}>${trip.patientCase.hospAccepted ? '✓ Accepted' : 'Accept'}</button>
              <button class="btn ghost sm" onclick="window.app.handleHospPrepare()" ${trip.patientCase.hospPreparing ? 'disabled' : ''}>${trip.patientCase.hospPreparing ? '✓ ED Preparing' : 'Prepare ED'}</button>
              <button class="btn green sm" onclick="window.app.handleHospReady()" ${trip.patientCase.hospitalReady ? 'disabled' : ''}>${trip.patientCase.hospitalReady ? '✓ Ready' : 'Ready to Receive'}</button>
            </td>
          </tr>
        </tbody>
      </table>
      ${trip.patientCase.hospAccepted ? '<div class="footer-note" style="padding:10px 0 0;">✅ Hospital has accepted this incoming case.</div>' : ''}
      ${trip.patientCase.hospPreparing ? '<div class="footer-note" style="padding:2px 0 0;">🛏️ Emergency Department is being prepared.</div>' : ''}
      ${trip.patientCase.hospitalReady ? '<div class="footer-note" style="padding:2px 0 0;">🟢 Hospital marked as Ready to Receive.</div>' : ''}
      ${trip.patientCase.incomingSent ? '<div class="footer-note" style="padding:10px 0 0;">📨 "Patient Incoming" notification received from medical staff.</div>' : ''}
      ${trip.patientCase.notes ? `<div class="card" style="margin-top:10px;"><h3>Clinical Notes from Medical Staff</h3><div style="font-size:12.5px;white-space:pre-wrap;">${trip.patientCase.notes}</div></div>` : ''}
    `;
  }

  async handleHospAccept() {
    if (!this.activeTrip) return;
    try {
      const res = await API.updatePatientCase(this.activeTrip.emergencyCode, { hospAccepted: true, username: this.currentUser.username });
      if (res.success && res.trip) {
        this.activeTrip = res.trip;
        this.renderHospitalDashboard();
      }
    } catch (e) {
      alert('Error updating case: ' + e.message);
    }
  }

  async handleHospPrepare() {
    if (!this.activeTrip) return;
    try {
      const res = await API.updatePatientCase(this.activeTrip.emergencyCode, { hospPreparing: true, username: this.currentUser.username });
      if (res.success && res.trip) {
        this.activeTrip = res.trip;
        this.renderHospitalDashboard();
      }
    } catch (e) {
      alert('Error updating case: ' + e.message);
    }
  }

  async handleHospReady() {
    if (!this.activeTrip) return;
    try {
      const res = await API.updatePatientCase(this.activeTrip.emergencyCode, { hospitalReady: true, username: this.currentUser.username });
      if (res.success && res.trip) {
        this.activeTrip = res.trip;
        this.renderHospitalDashboard();
      }
    } catch (e) {
      alert('Error updating case: ' + e.message);
    }
  }

  /* ================================================================
     ADMIN DASHBOARD
     ================================================================ */
  async initAdminDashboard() {
    this.renderAdminTabs();
    this.setupAdminAddUserModal();
    await this.renderAdminStats();
    await this.renderAdminUsers();
    await this.renderAdminVehicles();
    await this.renderAdminAuditLogs();
  }

  renderAdminTabs() {
    document.querySelectorAll('.tabs .tab').forEach(t => {
      t.onclick = () => {
        document.querySelectorAll('.tabs .tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        ['users', 'vehicles', 'reports', 'audit'].forEach(k => {
          document.getElementById('admin-' + k).style.display = (k === t.dataset.atab) ? 'block' : 'none';
        });
      };
    });
  }

  async renderAdminStats() {
    const trip = this.activeTrip;
    const userRes = await API.getUsers();
    const usersCount = (userRes.users || []).length;

    document.getElementById('aStatTotal').textContent = trip ? 1 : 0;
    const fmt = sec => {
      sec = Math.max(0, Math.round(sec));
      const m = Math.floor(sec / 60), s = sec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    document.getElementById('aStatSaved').textContent = trip ? fmt(trip.etaNormalSec - trip.etaCorridorSec) : '0:00';
    document.getElementById('aStatSignals').textContent = trip ? trip.signals.length : 0;
    document.getElementById('aStatUsers').textContent = usersCount;
  }

  async renderAdminUsers() {
    const q = document.getElementById('adminSearch').value.trim();
    const rf = document.getElementById('adminRoleFilter').value;

    const res = await API.getUsers(q, rf);
    const users = res.users || [];

    const rows = users.map(u => `
      <tr>
        <td>${u.username}</td>
        <td>${u.full_name}</td>
        <td><span class="badge blue">${(u.role || '').replace('_', ' ')}</span></td>
        <td>${u.vehicle_id || u.hospital_id || '—'}</td>
        <td><span class="badge green">ACTIVE</span></td>
      </tr>
    `).join('');

    document.getElementById('adminUserTbody').innerHTML = rows || '<tr><td colspan="5" class="empty">No matches found.</td></tr>';

    document.getElementById('adminSearch').oninput = () => this.renderAdminUsers();
    document.getElementById('adminRoleFilter').onchange = () => this.renderAdminUsers();
  }

  async renderAdminVehicles() {
    const res = await API.getVehicles();
    const vehicles = res.vehicles || [];

    document.getElementById('adminVehicleTbody').innerHTML = vehicles.map(v => `
      <tr>
        <td>${v.vehicle_id}</td>
        <td>${v.reg_no}</td>
        <td>${v.vehicle_type}</td>
        <td><span class="badge ${this.activeTrip && this.activeTrip.vehicleId === v.vehicle_id ? 'amber' : 'grey'}">${this.activeTrip && this.activeTrip.vehicleId === v.vehicle_id ? 'ON_TRIP' : 'IDLE'}</span></td>
        <td><span class="badge green">${v.fitness}</span></td>
        <td><span class="badge green">${v.insurance}</span></td>
        <td><span class="badge ${v.authorized ? 'green' : 'red'}">${v.authorized ? 'YES' : 'NO'}</span></td>
      </tr>
    `).join('');

    // Render reports chart
    const counts = { AMBULANCE: 0, FIRE_BRIGADE: 0, POLICE_VEHICLE: 0, NDRF: 0 };
    if (this.activeTrip) counts[this.activeTrip.vehicleType] = (counts[this.activeTrip.vehicleType] || 0) + 1;
    const max = Math.max(1, ...Object.values(counts));
    document.getElementById('reportBars').innerHTML = Object.entries(counts).map(([k, v]) => `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);margin-bottom:4px;"><span>${k.replace('_', ' ')}</span><span>${v}</span></div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:5px;height:10px;overflow:hidden;">
          <div style="width:${(v / max * 100)}%;height:100%;background:linear-gradient(90deg,#5B8CFF,#2FD9A7);"></div>
        </div>
      </div>
    `).join('');
  }

  async renderAdminAuditLogs() {
    const res = await API.getAuditLogs(80);
    const logs = res.logs || [];
    const box = document.getElementById('adminLogBox');
    if (!box) return;

    if (!logs.length) {
      box.innerHTML = '<div><span class="l-time">[--:--:--]</span> No audit events yet.</div>';
      return;
    }

    box.innerHTML = logs.map(e => `
      <div><span class="l-time">[${e.time}]</span> <b>${e.user}</b> → ${e.action}${e.meta ? ' — ' + e.meta : ''}</div>
    `).join('');
  }

  setupAdminAddUserModal() {
    const auOverlay = document.getElementById('addUserOverlay');
    const auRoleSel = document.getElementById('auRole');
    const auErr = document.getElementById('auError');
    const auOk = document.getElementById('auOk');

    const toggleFields = () => {
      const r = auRoleSel.value;
      document.getElementById('auDriverFields').style.display = (r === 'DRIVER') ? 'block' : 'none';
      document.getElementById('auMedicalFields').style.display = (r === 'MEDICAL_STAFF') ? 'block' : 'none';
      document.getElementById('auPoliceFields').style.display = (r === 'TRAFFIC_POLICE') ? 'block' : 'none';
      document.getElementById('auHospitalFields').style.display = (r === 'HOSPITAL') ? 'block' : 'none';
    };
    auRoleSel.onchange = toggleFields;

    const populateHospitals = () => {
      const sel = document.getElementById('auHospitalId');
      sel.innerHTML = this.hospitals.map(h => `<option value="${h.id}">${h.name} (${h.id})</option>`).join('');
    };

    const openModal = () => {
      ['auUsername', 'auPassword', 'auFullName', 'auVehicleId', 'auRegNo', 'auStaffId', 'auOfficerId', 'auZone'].forEach(id => {
        document.getElementById(id).value = '';
      });
      document.getElementById('auPassword').value = 'Pass@123';
      auRoleSel.value = 'DRIVER';
      toggleFields();
      populateHospitals();
      auErr.style.display = 'none';
      auOk.style.display = 'none';
      auOverlay.classList.add('active');
    };

    const closeModal = () => auOverlay.classList.remove('active');

    document.getElementById('openAddUserBtn').onclick = openModal;
    document.getElementById('closeAddUserBtn').onclick = closeModal;
    document.getElementById('cancelAddUserBtn').onclick = closeModal;
    auOverlay.onclick = e => { if (e.target === auOverlay) closeModal(); };

    document.getElementById('submitAddUserBtn').onclick = async () => {
      const role = auRoleSel.value;
      const username = document.getElementById('auUsername').value.trim();
      const password = document.getElementById('auPassword').value.trim() || 'Pass@123';
      const fullName = document.getElementById('auFullName').value.trim();
      auErr.style.display = 'none';
      auOk.style.display = 'none';

      if (!username || !fullName) {
        auErr.textContent = 'Username and Full Name are required.';
        auErr.style.display = 'block';
        return;
      }

      const payload = { username, password, role, fullName };
      if (role === 'DRIVER') {
        payload.vehicleType = document.getElementById('auVehicleType').value;
        payload.vehicleId = document.getElementById('auVehicleId').value.trim();
        payload.regNo = document.getElementById('auRegNo').value.trim();
        if (!payload.vehicleId || !payload.regNo) {
          auErr.textContent = 'Vehicle ID and Registration No. are required.';
          auErr.style.display = 'block';
          return;
        }
      } else if (role === 'MEDICAL_STAFF') {
        payload.staffId = document.getElementById('auStaffId').value.trim();
        if (!payload.staffId) {
          auErr.textContent = 'Staff ID is required.';
          auErr.style.display = 'block';
          return;
        }
      } else if (role === 'TRAFFIC_POLICE') {
        payload.officerId = document.getElementById('auOfficerId').value.trim();
        payload.zone = document.getElementById('auZone').value.trim();
        if (!payload.officerId || !payload.zone) {
          auErr.textContent = 'Officer ID and Zone are required.';
          auErr.style.display = 'block';
          return;
        }
      } else if (role === 'HOSPITAL') {
        payload.hospitalId = document.getElementById('auHospitalId').value;
      }

      try {
        const res = await API.addUser(payload);
        if (res.success) {
          auOk.textContent = `User "${username}" added successfully!`;
          auOk.style.display = 'block';
          await this.renderAdminUsers();
          await this.renderAdminVehicles();
          await this.renderAdminStats();
          setTimeout(closeModal, 900);
        }
      } catch (err) {
        auErr.textContent = err.message || 'Failed to add user.';
        auErr.style.display = 'block';
      }
    };
  }

  /* ================================================================
     PUBLIC INCIDENT REPORTING
     ================================================================ */
  bindPublicReportEvents() {
    let pubGpsCoord = null;
    const pubLocSel = document.getElementById('pubLocation');

    // Populate landmarks once loaded
    setTimeout(() => {
      pubLocSel.innerHTML = '';
      this.landmarks.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.id;
        opt.textContent = l.name;
        pubLocSel.appendChild(opt);
      });
    }, 500);

    document.getElementById('publicReportBtn').addEventListener('click', () => {
      document.getElementById('loginWrap').style.display = 'none';
      document.getElementById('publicWrap').style.display = 'flex';
      document.getElementById('pubSuccess').style.display = 'none';
    });

    document.getElementById('pubBackBtn').addEventListener('click', e => {
      e.preventDefault();
      document.getElementById('publicWrap').style.display = 'none';
      document.getElementById('loginWrap').style.display = 'flex';
    });

    document.getElementById('pubUseGpsBtn').addEventListener('click', () => {
      const status = document.getElementById('pubGpsStatus');
      if (!navigator.geolocation) {
        status.textContent = 'GPS not available on this device.';
        return;
      }
      status.textContent = 'Fetching your live location…';
      navigator.geolocation.getCurrentPosition(pos => {
        pubGpsCoord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        status.textContent = `📍 Using your live GPS location (accuracy ±${Math.round(pos.coords.accuracy)}m).`;
      }, () => {
        status.textContent = 'Could not fetch GPS — please choose a landmark instead.';
      }, { enableHighAccuracy: true });
    });

    document.getElementById('pubSubmitBtn').addEventListener('click', async () => {
      const type = document.getElementById('pubType').value;
      const landmark = this.landmarks.find(l => l.id === pubLocSel.value) || this.landmarks[0];
      const loc = pubGpsCoord || landmark;
      const locName = pubGpsCoord ? `Live GPS Pin near ${landmark.name}` : landmark.name;
      const description = document.getElementById('pubDesc').value.trim();
      const contact = document.getElementById('pubContact').value.trim();

      try {
        const res = await API.reportIncident({
          type,
          lat: loc.lat,
          lng: loc.lng,
          locationName: locName,
          description,
          contact
        });

        if (res.success) {
          const successBox = document.getElementById('pubSuccess');
          successBox.style.display = 'block';
          successBox.innerHTML = res.assignedDriver
            ? `✅ Report received! Nearest unit (<b>${res.assignedDriver.vehicleId}</b> — ${res.assignedDriver.fullName}) has been alerted and dispatched.`
            : `✅ Report received and logged with Traffic Control.`;

          document.getElementById('pubDesc').value = '';
          document.getElementById('pubContact').value = '';
          pubGpsCoord = null;
          document.getElementById('pubGpsStatus').textContent = '';
        }
      } catch (err) {
        alert('Failed to submit report: ' + err.message);
      }
    });
  }

  /* ================================================================
     REAL-TIME WEBSOCKET EVENT LISTENERS
     ================================================================ */
  handleIncidentNew(incident) {
    if (this.currentUser && this.currentUser.role === 'DRIVER') {
      this.loadDriverIncidents();
    }
  }

  handleIncidentUpdated(data) {
    if (this.currentUser && this.currentUser.role === 'DRIVER') {
      this.loadDriverIncidents();
    }
  }

  handleTripUpdate(trip) {
    this.activeTrip = trip;
    if (!this.currentUser) return;

    if (this.currentUser.role === 'DRIVER' && this.currentUser.vehicleId === trip.vehicleId) {
      this.refreshDriverTripUI();
      if (trip.corridorStatus === 'REQUESTED') {
        document.getElementById('railStatus').textContent = 'CORRIDOR REQUESTED';
        document.getElementById('railStatus').style.color = 'var(--amber)';
      }
    } else if (this.currentUser.role === 'TRAFFIC_POLICE') {
      this.renderTrafficDashboard();
    } else if (this.currentUser.role === 'HOSPITAL') {
      this.renderHospitalDashboard();
    } else if (this.currentUser.role === 'MEDICAL_STAFF') {
      this.renderMedicalDashboard();
    }
  }

  handleCorridorApproved(trip) {
    this.activeTrip = trip;
    if (!this.currentUser) return;

    if (this.currentUser.role === 'DRIVER' && this.currentUser.vehicleId === trip.vehicleId) {
      document.getElementById('railStatus').textContent = 'CORRIDOR ACTIVE';
      document.getElementById('railStatus').style.color = 'var(--green)';
      this.driverLog('Corridor approved by Traffic Control — vehicle en route with cleared signals.', 'l-green');
      this.refreshDriverTripUI();
      this.runCorridorSimulation(trip);
    } else if (this.currentUser.role === 'TRAFFIC_POLICE') {
      this.renderTrafficDashboard();
    } else if (this.currentUser.role === 'HOSPITAL') {
      this.renderHospitalDashboard();
    } else if (this.currentUser.role === 'MEDICAL_STAFF') {
      this.renderMedicalDashboard();
    }
  }

  runCorridorSimulation(trip) {
    if (!trip || !trip.routeCoords || !trip.routeCoords.length) return;
    if (this.driverAmbMarker) this.driverMap.removeLayer(this.driverAmbMarker);

    this.driverAmbMarker = L.marker([trip.routeCoords[0].lat, trip.routeCoords[0].lng], {
      icon: L.divIcon({ className: '', html: '<div class="amb-icon">🚑</div>', iconSize: [22, 22], iconAnchor: [11, 11] })
    }).addTo(this.driverMap);

    const totalPoints = trip.routeCoords.length;
    const durationMs = 14000;
    const startTime = performance.now();
    const signals = trip.signals || [];
    const signalTriggered = new Array(signals.length).fill(false);
    const iotOn = new Array(signals.length).fill(false);
    const iotOffLogged = new Array(signals.length).fill(false);
    const PASS_MARGIN_M = 200;
    const fullDist = trip.routeCoords.reduce((acc, c, i) => i === 0 ? 0 : acc + MapHandler.haversine(trip.routeCoords[i - 1], c), 0);

    const step = t => {
      const elapsed = t - startTime;
      let frac = Math.min(1, elapsed / durationMs);
      const idx = Math.min(totalPoints - 1, Math.floor(frac * (totalPoints - 1)));
      const pt = trip.routeCoords[idx];

      this.driverAmbMarker.setLatLng([pt.lat, pt.lng]);
      trip.progressFrac = frac;
      trip.currentSpeedKmh = Math.round(CONFIG.SPEED.CORRIDOR_SPEED_MPS * 3.6);

      // Broadcast GPS via API
      API.updateGPS(trip.emergencyCode, { lat: pt.lat, lng: pt.lng, speedKmh: trip.currentSpeedKmh, progressFrac: frac }).catch(() => {});

      const railFill = document.getElementById('railFill');
      if (railFill) railFill.style.width = (frac * 94 + 6) + '%';
      const railVeh = document.getElementById('railVeh');
      if (railVeh) railVeh.style.left = (frac * 90 + 6) + '%';
      const distCovered = frac * fullDist;

      signals.forEach((s, i) => {
        const dot = document.getElementById(`sig-dot-${i}`);
        const mapDot = document.getElementById(`sig-map-${i}`);
        const railNode = document.getElementById(`rail-node-${i}`);
        const remaining = s.distM - distCovered;
        let state = 'idle';

        if (remaining < 0) state = 'green';
        else if (remaining < 300) state = 'amber';

        if (dot) dot.className = 'signal-dot ' + (state === 'idle' ? '' : state);
        if (mapDot) {
          mapDot.style.background = state === 'green' ? 'var(--green)' : state === 'amber' ? 'var(--amber)' : 'var(--muted-2)';
          mapDot.style.boxShadow = state !== 'idle' ? '0 0 8px currentColor' : 'none';
        }
        if (railNode) railNode.className = 'rail-node ' + (state === 'idle' ? '' : state);

        if (state === 'green' && !signalTriggered[i]) {
          signalTriggered[i] = true;
          iotOn[i] = true;
          const chip = document.getElementById(`iot-chip-${i}`);
          if (chip) { chip.textContent = 'ON'; chip.classList.add('on'); }
          this.driverLog(`IoT → ${s.code}: SET GREEN <b>(ON)</b> for ${s.name}.`, 'l-green');
        }

        if (iotOn[i] && !iotOffLogged[i] && (distCovered - s.distM) > PASS_MARGIN_M) {
          iotOffLogged[i] = true;
          iotOn[i] = false;
          const chip = document.getElementById(`iot-chip-${i}`);
          if (chip) { chip.textContent = 'OFF'; chip.classList.remove('on'); }
          if (dot) dot.className = 'signal-dot';
          if (mapDot) { mapDot.style.background = 'var(--muted-2)'; mapDot.style.boxShadow = 'none'; }
          if (railNode) railNode.className = 'rail-node';
          this.driverLog(`IoT → ${s.code}: RESTORED NORMAL CYCLE <b>(OFF)</b>.`, 'l-amber');
        }
      });

      if (frac < 1) {
        this.animTimer = requestAnimationFrame(step);
      } else {
        document.getElementById('railStatus').textContent = 'ARRIVED';
        document.getElementById('railStatus').style.color = 'var(--blue)';
        this.driverLog('Vehicle has arrived at destination. Corridor released.', 'l-green');
        API.stopTrip(trip.emergencyCode, this.currentUser.username).catch(() => {});
      }
    };

    this.animTimer = requestAnimationFrame(step);
  }

  handleLiveGPSUpdate(data) {
    if (this.activeTrip && this.activeTrip.emergencyCode === data.tripId) {
      this.activeTrip.liveGPS = { lat: data.lat, lng: data.lng, speedKmh: data.speedKmh, ts: data.ts };
      this.activeTrip.currentSpeedKmh = data.speedKmh;
      this.activeTrip.progressFrac = data.progressFrac;

      if (this.currentUser?.role === 'TRAFFIC_POLICE') {
        this.renderTrafficDashboard();
      } else if (this.currentUser?.role === 'HOSPITAL') {
        this.renderHospitalDashboard();
      } else if (this.currentUser?.role === 'MEDICAL_STAFF') {
        this.renderMedicalDashboard();
      }
    }
  }

  handlePatientCaseUpdate(trip) {
    this.activeTrip = trip;
    if (this.currentUser?.role === 'MEDICAL_STAFF') this.renderMedicalDashboard();
    if (this.currentUser?.role === 'HOSPITAL') this.renderHospitalDashboard();
  }

  handleTripSOS(trip) {
    this.activeTrip = trip;
    if (this.currentUser?.role === 'TRAFFIC_POLICE') {
      this.tpLog(`🚨 SOS EMERGENCY TRIGGERED by ${trip.vehicleId}!`, 'l-red');
      this.renderTrafficDashboard();
    }
  }

  handleTripStopped(trip) {
    this.activeTrip = trip;
    if (this.currentUser?.role === 'DRIVER') this.refreshDriverTripUI();
    if (this.currentUser?.role === 'TRAFFIC_POLICE') this.renderTrafficDashboard();
    if (this.currentUser?.role === 'HOSPITAL') this.renderHospitalDashboard();
  }

  handleTripCancelled(trip) {
    this.activeTrip = null;
    if (this.currentUser?.role === 'DRIVER') {
      this.clearDriverMapLayers();
      this.refreshDriverTripUI();
    }
    if (this.currentUser?.role === 'TRAFFIC_POLICE') this.renderTrafficDashboard();
    if (this.currentUser?.role === 'HOSPITAL') this.renderHospitalDashboard();
  }

  handleAuditNew(log) {
    if (this.currentUser?.role === 'ADMIN') {
      this.renderAdminAuditLogs();
      this.renderAdminStats();
    }
  }
}

// Instantiate and start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new GreenCorridorApp();
  window.app.init();
});
