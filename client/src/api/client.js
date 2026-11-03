/**
 * BioSentinel API Client
 * Centralized HTTP client with JWT injection, offline detection, and full API methods
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Listeners for backend connectivity status
let isBackendOnline = true;
const onlineListeners = new Set();

export function onConnectivityChange(listener) {
  onlineListeners.add(listener);
  listener(isBackendOnline);
  return () => onlineListeners.delete(listener);
}

function updateConnectivity(online) {
  if (isBackendOnline !== online) {
    isBackendOnline = online;
    onlineListeners.forEach((fn) => fn(online));
  }
}

export function getStoredToken() {
  try {
    return localStorage.getItem('biosentinel_token') || null;
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem('biosentinel_token', token);
    } else {
      localStorage.removeItem('biosentinel_token');
    }
  } catch {}
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('biosentinel_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (user) {
      localStorage.setItem('biosentinel_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('biosentinel_user');
    }
  } catch {}
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getStoredToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    updateConnectivity(true);

    if (res.status === 401) {
      // Token expired or invalid
      setStoredToken(null);
      setStoredUser(null);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Session expired. Please log in again.');
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      updateConnectivity(false);
      throw new Error('Server offline: unable to reach BioSentinel telemetry backend.');
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  getMe: () => request('/auth/me'),
  getCareTeam: () => request('/auth/care-team'),

  // Patients
  getPatients: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.discharged !== undefined) query.set('discharged', params.discharged);
    if (params.recent) query.set('recent', params.recent);
    const qs = query.toString();
    return request(`/patients${qs ? `?${qs}` : ''}`);
  },
  getPatient: (id) => request(`/patients/${id}`),
  createPatient: (data) =>
    request('/patients', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updatePatient: (id, data) =>
    request(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  dischargePatient: (id) =>
    request(`/patients/${id}/discharge`, {
      method: 'PUT'
    }),
  toggleMedication: (patientId, medId, active) =>
    request(`/patients/${patientId}/medication`, {
      method: 'PUT',
      body: JSON.stringify({ medId, active })
    }),
  addMedication: (patientId, data) =>
    request(`/patients/${patientId}/medication`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Alerts
  getAlerts: () => request('/alerts'),
  acknowledgeAlert: (id) =>
    request(`/alerts/${id}/acknowledge`, {
      method: 'POST'
    }),
  escalateAlert: (id) =>
    request(`/alerts/${id}/escalate`, {
      method: 'POST'
    }),

  // Devices
  getDevices: () => request('/devices'),
  pingDevice: (id) =>
    request(`/devices/${id}/ping`, {
      method: 'POST'
    }),
  calibrateDevice: (id) =>
    request(`/devices/${id}/calibrate`, {
      method: 'POST'
    }),

  // Diagnostic Orders
  getDiagnosticOrders: (patientId) => {
    const qs = patientId ? `?patientId=${patientId}` : '';
    return request(`/diagnostic-orders${qs}`);
  },
  createDiagnosticOrder: (data) =>
    request('/diagnostic-orders', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Notes
  getNotes: (patientId) => {
    const qs = patientId ? `?patientId=${patientId}` : '';
    return request(`/notes${qs}`);
  },
  createNote: (data) =>
    request('/notes', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateNote: (id, text) =>
    request(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ text })
    }),
  deleteNote: (id) =>
    request(`/notes/${id}`, {
      method: 'DELETE'
    }),

  // Messages
  getMessages: (patientId) => {
    const qs = patientId ? `?patientId=${patientId}` : '';
    return request(`/messages${qs}`);
  },
  sendMessage: (data) =>
    request('/messages', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) =>
    request(`/notifications/${id}/read`, {
      method: 'PUT'
    }),
  markAllNotificationsRead: () =>
    request('/notifications/read-all', {
      method: 'PUT'
    }),

  // Analytics & Reports
  getAnalytics: () => request('/reports/analytics'),

  // System Health
  getHealth: () => request('/health')
};

