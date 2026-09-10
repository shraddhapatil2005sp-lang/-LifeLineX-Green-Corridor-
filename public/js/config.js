// Frontend Configuration & Constants
const CONFIG = {
  API_BASE: window.location.origin + '/api',
  SPEED: {
    NORMAL_MPS: 5.0,
    CORRIDOR_SPEED_MPS: 9.7
  },
  SIGNAL: {
    MAX_SIGNALS: 7,
    SPACING_M: 550
  },
  DEFAULT_MAP_CENTER: [16.6980, 74.2400],
  ROLE_LABELS: {
    DRIVER: 'Emergency Vehicle Driver',
    MEDICAL_STAFF: 'Medical Staff',
    TRAFFIC_POLICE: 'Traffic Police / RTO',
    HOSPITAL: 'Hospital',
    ADMIN: 'System Admin'
  },
  INCIDENT_ICONS: {
    ACCIDENT: '🚗',
    FIRE: '🔥',
    MEDICAL: '🩺',
    RESCUE: '🌊'
  },
  INCIDENT_LABELS: {
    ACCIDENT: 'Road Accident',
    FIRE: 'Fire',
    MEDICAL: 'Medical Emergency',
    RESCUE: 'Rescue / Disaster'
  }
};
