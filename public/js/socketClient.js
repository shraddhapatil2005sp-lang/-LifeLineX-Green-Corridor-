// Socket.IO Client Wrapper
const SocketClient = {
  socket: null,
  connected: false,

  init() {
    if (typeof io === 'undefined') {
      console.warn('Socket.IO script not loaded');
      return;
    }

    this.socket = io();

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('⚡ Connected to Green Corridor WebSocket server');
      if (window.currentUser) {
        this.joinRole(window.currentUser.role, window.currentUser.username);
      }
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('❌ Disconnected from WebSocket server');
    });

    // Real-time server events
    this.socket.on('incident:new', (incident) => {
      console.log('🆘 New Incident Alert received:', incident);
      if (window.app && typeof window.app.handleIncidentNew === 'function') {
        window.app.handleIncidentNew(incident);
      }
    });

    this.socket.on('incident:updated', (data) => {
      if (window.app && typeof window.app.handleIncidentUpdated === 'function') {
        window.app.handleIncidentUpdated(data);
      }
    });

    this.socket.on('trip:started', (trip) => {
      console.log('🚨 New Trip Started:', trip);
      if (window.app && typeof window.app.handleTripUpdate === 'function') {
        window.app.handleTripUpdate(trip);
      }
    });

    this.socket.on('corridor:approved', (trip) => {
      console.log('🟢 Green Corridor Approved:', trip);
      if (window.app && typeof window.app.handleCorridorApproved === 'function') {
        window.app.handleCorridorApproved(trip);
      }
    });

    this.socket.on('corridor:requested', (trip) => {
      if (window.app && typeof window.app.handleTripUpdate === 'function') {
        window.app.handleTripUpdate(trip);
      }
    });

    this.socket.on('corridor:rejected', (trip) => {
      if (window.app && typeof window.app.handleTripUpdate === 'function') {
        window.app.handleTripUpdate(trip);
      }
    });

    this.socket.on('corridor:paused', (trip) => {
      if (window.app && typeof window.app.handleTripUpdate === 'function') {
        window.app.handleTripUpdate(trip);
      }
    });

    this.socket.on('corridor:ended', (trip) => {
      if (window.app && typeof window.app.handleTripUpdate === 'function') {
        window.app.handleTripUpdate(trip);
      }
    });

    this.socket.on('trip:stopped', (trip) => {
      if (window.app && typeof window.app.handleTripStopped === 'function') {
        window.app.handleTripStopped(trip);
      }
    });

    this.socket.on('trip:cancelled', (trip) => {
      if (window.app && typeof window.app.handleTripCancelled === 'function') {
        window.app.handleTripCancelled(trip);
      }
    });

    this.socket.on('trip:gps', (data) => {
      if (window.app && typeof window.app.handleLiveGPSUpdate === 'function') {
        window.app.handleLiveGPSUpdate(data);
      }
    });

    this.socket.on('patient_case:updated', (trip) => {
      if (window.app && typeof window.app.handlePatientCaseUpdate === 'function') {
        window.app.handlePatientCaseUpdate(trip);
      }
    });

    this.socket.on('trip:sos', (trip) => {
      if (window.app && typeof window.app.handleTripSOS === 'function') {
        window.app.handleTripSOS(trip);
      }
    });

    this.socket.on('audit:new', (log) => {
      if (window.app && typeof window.app.handleAuditNew === 'function') {
        window.app.handleAuditNew(log);
      }
    });
  },

  joinRole(role, username) {
    if (this.socket && this.connected) {
      this.socket.emit('join', { role, username });
    }
  },

  emitDriverLocation(data) {
    if (this.socket && this.connected) {
      this.socket.emit('driver:location', data);
    }
  }
};
