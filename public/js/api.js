// REST API Client
const API = {
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (window.currentUser) {
      headers['x-user'] = window.currentUser.username;
    }

    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth
  login: (username, password) => API.request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: (username) => API.request(`/auth/me/${username}`),

  // Locations & Reference Data
  getHospitals: () => API.request('/locations/hospitals'),
  getLandmarks: (originOnly = false) => API.request(`/locations/landmarks?originOnly=${originOnly}`),
  getFireIncidentSites: () => API.request('/locations/fire-incident-sites'),
  getJunctions: () => API.request('/locations/junctions'),

  // Incidents
  getIncidents: () => API.request('/incidents'),
  getDriverIncidents: (username) => API.request(`/incidents/driver/${username}`),
  reportIncident: (data) => API.request('/incidents/report', { method: 'POST', body: JSON.stringify(data) }),
  acceptIncident: (id, username) => API.request(`/incidents/${id}/accept`, { method: 'POST', body: JSON.stringify({ username }) }),

  // Trips & Corridors
  getActiveTrip: (vehicleId = '') => API.request('/trips/active' + (vehicleId ? `?vehicleId=${encodeURIComponent(vehicleId)}` : '')),
  startTrip: (tripData) => API.request('/trips/start', { method: 'POST', body: JSON.stringify(tripData) }),
  requestCorridor: (tripId, username) => API.request(`/trips/${tripId}/request-corridor`, { method: 'POST', body: JSON.stringify({ username }) }),
  approveCorridor: (tripId, username) => API.request(`/trips/${tripId}/approve-corridor`, { method: 'POST', body: JSON.stringify({ username }) }),
  rejectCorridor: (tripId, username) => API.request(`/trips/${tripId}/reject-corridor`, { method: 'POST', body: JSON.stringify({ username }) }),
  pauseCorridor: (tripId, username) => API.request(`/trips/${tripId}/pause-corridor`, { method: 'POST', body: JSON.stringify({ username }) }),
  endCorridor: (tripId, username) => API.request(`/trips/${tripId}/end-corridor`, { method: 'POST', body: JSON.stringify({ username }) }),
  stopTrip: (tripId, username) => API.request(`/trips/${tripId}/stop`, { method: 'POST', body: JSON.stringify({ username }) }),
  cancelTrip: (tripId, username) => API.request(`/trips/${tripId}/cancel`, { method: 'POST', body: JSON.stringify({ username }) }),
  updatePatientCase: (tripId, caseData) => API.request(`/trips/${tripId}/patient-case`, { method: 'POST', body: JSON.stringify(caseData) }),
  triggerSOS: (tripId, username) => API.request(`/trips/${tripId}/sos`, { method: 'POST', body: JSON.stringify({ username }) }),
  updateGPS: (tripId, data) => API.request(`/trips/${tripId}/gps`, { method: 'POST', body: JSON.stringify(data) }),

  // Admin & Users
  getUsers: (search = '', role = '') => API.request(`/users?search=${encodeURIComponent(search)}&role=${encodeURIComponent(role)}`),
  addUser: (userData) => API.request('/users', { method: 'POST', body: JSON.stringify(userData) }),
  getVehicles: () => API.request('/vehicles'),
  getAuditLogs: (limit = 100) => API.request(`/audit-logs?limit=${limit}`),
  logAudit: (user, action, meta) => API.request('/audit-logs', { method: 'POST', body: JSON.stringify({ user, action, meta }) })
};
