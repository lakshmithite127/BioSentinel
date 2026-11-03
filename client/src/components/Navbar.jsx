import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Settings,
  Bell,
  PlusCircle,
  LogOut,
  CheckCircle,
  Shield,
  X,
  Activity,
  AlertTriangle,
  FileText,
  ChevronRight,
  WifiOff,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertsContext';
import { api } from '../api/client';
import { getSocket } from '../api/socket';

export default function Navbar({ onOpenAdmitModal }) {
  const { user, logout, isServerOffline } = useAuth();
  const { stats } = useAlerts();
  const navigate = useNavigate();

  const isNurse = user?.role === 'nurse';

  // Modal toggles
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [settingsSavedToast, setSettingsSavedToast] = useState('');

  // Persistent Notifications from MongoDB
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Settings state (persisted in localStorage)
  const [nurseSoundEnabled, setNurseSoundEnabled] = useState(() => {
    return localStorage.getItem('pref_nurse_sound') !== 'false';
  });
  const [nurseAutoEscalate, setNurseAutoEscalate] = useState(() => {
    return localStorage.getItem('pref_nurse_escalate') !== 'false';
  });
  const [docPagingEnabled, setDocPagingEnabled] = useState(() => {
    return localStorage.getItem('pref_doc_paging') !== 'false';
  });
  const [browserPushEnabled, setBrowserPushEnabled] = useState(() => {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  });

  // Request browser push notification permission
  const requestPushPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setBrowserPushEnabled(perm === 'granted');
      if (perm === 'granted') {
        setSettingsSavedToast('Browser push notifications enabled for background alerts.');
        setTimeout(() => setSettingsSavedToast(''), 3000);
      }
    }
  };

  // Fetch real notifications from API
  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.isRead).length);
      }
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();

    const handleNewNotif = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);

      // In-app toast for instant awareness
      setSettingsSavedToast(`🔔 ${notif.title}: ${notif.sub || ''}`);
      setTimeout(() => setSettingsSavedToast(''), 4500);

      // Background browser push notification if tab hidden
      if (
        document.hidden &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(notif.title, {
            body: notif.sub || 'BioSentinel Ward Alert',
            icon: '/logo-capsule.svg'
          });
        } catch {}
      }
    };

    socket.on('notification:new', handleNewNotif);

    const interval = setInterval(fetchNotifications, 12000);

    return () => {
      socket.off('notification:new', handleNewNotif);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveSettings = () => {
    localStorage.setItem('pref_nurse_sound', nurseSoundEnabled);
    localStorage.setItem('pref_nurse_escalate', nurseAutoEscalate);
    localStorage.setItem('pref_doc_paging', docPagingEnabled);
    setSettingsSavedToast(
      isNurse
        ? 'Nursing ward telemetry preferences saved.'
        : 'Physician consultation preferences saved.'
    );
    setShowSettingsModal(false);
    setTimeout(() => setSettingsSavedToast(''), 3000);
  };

  const handleMarkAsRead = async (id, patientId) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      if (patientId) {
        setShowNotificationsModal(false);
        navigate(`/patient-profiles/${patientId}`);
      }
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setSettingsSavedToast('All notifications marked as read.');
      setTimeout(() => setSettingsSavedToast(''), 2500);
    } catch {}
  };

  return (
    <>
      {/* Server Offline Alert Banner */}
      {isServerOffline && (
        <div
          style={{
            background: '#b91c1c',
            color: '#ffffff',
            padding: '8px 16px',
            fontSize: '0.84rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            position: 'sticky',
            top: 0,
            zIndex: 100000
          }}
        >
          <WifiOff size={16} />
          <span>
            Server offline: BioSentinel telemetry backend is unreachable on port 5000. Changes may
            not sync until reconnected.
          </span>
        </div>
      )}

      {/* Real-time Toast Banner */}
      {settingsSavedToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            background: '#005e9e',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            fontSize: '0.88rem',
            fontWeight: 600,
            maxWidth: '380px',
            lineHeight: '1.4'
          }}
        >
          {settingsSavedToast}
        </div>
      )}

      <header className="top-navbar">
        {/* Brand Capsule Logo */}
        <div
          className="nav-brand"
          onClick={() => navigate(isNurse ? '/overview' : '/patients')}
          title="BioSentinel Clinical Telemetry"
          style={{ cursor: 'pointer' }}
        >
          <img src="/logo-capsule.svg" alt="BioSentinel Logo" className="capsule-logo" />
          <span className="brand-text">BIOSENTINEL</span>
        </div>

        {/* Main Role-Tailored Nav Tabs */}
        <nav className="nav-tabs">
          {isNurse ? (
            // Nurse View Tabs
            <>
              <NavLink
                to="/overview"
                className={({ isActive }) => `nav-tab-item ${isActive ? 'active' : ''}`}
              >
                Overview
              </NavLink>
              <NavLink
                to="/alerts"
                className={({ isActive }) => `nav-tab-item ${isActive ? 'active' : ''}`}
              >
                Alerts
              </NavLink>
              <NavLink
                to="/devices"
                className={({ isActive }) => `nav-tab-item ${isActive ? 'active' : ''}`}
              >
                Devices
              </NavLink>
            </>
          ) : (
            // Doctor View Tabs
            <>
              <NavLink
                to="/patients"
                className={({ isActive }) => `nav-tab-item ${isActive ? 'active' : ''}`}
              >
                Patients
              </NavLink>
              <NavLink
                to="/alerts"
                className={({ isActive }) => `nav-tab-item ${isActive ? 'active' : ''}`}
              >
                Alerts
              </NavLink>
              <NavLink
                to="/patient-profiles"
                className={({ isActive }) => `nav-tab-item ${isActive ? 'active' : ''}`}
              >
                Patient Profiles
              </NavLink>
            </>
          )}
        </nav>

        {/* Right Action Icons */}
        <div className="nav-actions">
          {/* Quick Add Patient Button */}
          {onOpenAdmitModal && (
            <button
              onClick={onOpenAdmitModal}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                borderRadius: '8px'
              }}
              title="Admit new patient to telemetry ward"
            >
              <PlusCircle size={15} />
              <span>+ Add Patient</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            className="nav-icon-btn"
            title="Ward & Telemetry Settings"
            onClick={() => setShowSettingsModal(true)}
          >
            <Settings size={18} />
          </button>

          {/* Notifications Bell with Live Badge */}
          <button
            className="nav-icon-btn"
            onClick={() => setShowNotificationsModal(true)}
            title={`${unreadCount} unread telemetry notifications`}
            style={{ position: 'relative' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px'
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar with Role Info */}
          <div
            className="user-avatar-btn"
            onClick={() => setShowProfileModal(true)}
            title={`${user?.name} (${user?.title || user?.role}) - Click for Profile / Logout`}
          >
            <img
              src={user?.avatar || (isNurse ? '/nurse-avatar.jpg' : '/doctor-avatar.jpg')}
              alt={user?.name || 'Staff'}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = isNurse ? '/nurse-avatar.jpg' : '/doctor-avatar.jpg';
              }}
            />
          </div>
        </div>
      </header>

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="modal-overlay" onClick={() => setShowNotificationsModal(false)}>
          <div
            className="modal-content-card"
            style={{ maxWidth: '520px', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} color="#005e9e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Telemetry Notifications</h3>
                {unreadCount > 0 && (
                  <span
                    style={{
                      background: '#fee2e2',
                      color: '#991b1b',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px'
                    }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    style={{
                      fontSize: '0.78rem',
                      color: '#005e9e',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotificationsModal(false)}
                  style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No telemetry notifications. All quiet in ward.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif._id || notif.id}
                    onClick={() => handleMarkAsRead(notif._id || notif.id, notif.patientId)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: notif.isRead ? '#ffffff' : '#f0f9ff',
                      border: `1px solid ${notif.isRead ? '#f1f5f9' : '#bae6fd'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                    title={
                      notif.patientId
                        ? `Click to view patient profile (${notif.patientId})`
                        : undefined
                    }
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div
                        style={{
                          fontWeight: notif.isRead ? 600 : 700,
                          fontSize: '0.9rem',
                          color: '#0f172a'
                        }}
                      >
                        {notif.title}
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background:
                            notif.type === 'critical'
                              ? '#fee2e2'
                              : notif.type === 'order'
                              ? '#fef3c7'
                              : notif.type === 'message'
                              ? '#e0e7ff'
                              : '#e0f2fe',
                          color:
                            notif.type === 'critical'
                              ? '#991b1b'
                              : notif.type === 'order'
                              ? '#92400e'
                              : notif.type === 'message'
                              ? '#3730a3'
                              : '#0369a1',
                          fontWeight: 600
                        }}
                      >
                        {notif.badge || notif.type}
                      </span>
                    </div>
                    {notif.sub && (
                      <div style={{ fontSize: '0.8rem', color: '#475569' }}>{notif.sub}</div>
                    )}
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: '#94a3b8',
                        marginTop: '2px',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>
                        {notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString() : 'Recent'}
                      </span>
                      {notif.patientId && (
                        <span style={{ color: '#005e9e', fontWeight: 600 }}>
                          View Patient {notif.patientId} →
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div
            className="modal-content-card"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} color="#005e9e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {isNurse ? 'Nursing Ward Telemetry Settings' : 'Physician Telemetry Preferences'}
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                fontSize: '0.88rem'
              }}
            >
              {isNurse ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>Audible Bedside Alarm Tones</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Audio chime on critical arrhythmia or desaturation &lt;90%
                      </div>
                    </div>
                    <label className="toggle-switch-label">
                      <input
                        type="checkbox"
                        checked={nurseSoundEnabled}
                        onChange={() => setNurseSoundEnabled(!nurseSoundEnabled)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>Auto-Escalation Protocol</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Auto-page attending MD if critical alert unacknowledged &gt; 90s
                      </div>
                    </div>
                    <label className="toggle-switch-label">
                      <input
                        type="checkbox"
                        checked={nurseAutoEscalate}
                        onChange={() => setNurseAutoEscalate(!nurseAutoEscalate)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>Urgent Physician Paging</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Receive immediate priority push pings on critical telemetry spikes
                      </div>
                    </div>
                    <label className="toggle-switch-label">
                      <input
                        type="checkbox"
                        checked={docPagingEnabled}
                        onChange={() => setDocPagingEnabled(!docPagingEnabled)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </>
              )}

              {/* Browser Push Notifications (Task 4) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>Browser Push Notifications</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Alert you when tab is backgrounded / minimized
                  </div>
                </div>
                <button
                  type="button"
                  onClick={requestPushPermission}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: browserPushEnabled ? '#dcfce7' : '#f8fafc',
                    color: browserPushEnabled ? '#166534' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {browserPushEnabled ? 'Enabled ✓' : 'Enable'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="btn-secondary-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="btn-login-submit"
                  style={{ flex: 2, marginTop: 0 }}
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div
            className="modal-content-card"
            style={{ maxWidth: '420px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                margin: '0 auto 14px',
                overflow: 'hidden',
                border: '3px solid #005e9e'
              }}
            >
              <img
                src={user?.avatar || (isNurse ? '/nurse-avatar.jpg' : '/doctor-avatar.jpg')}
                alt={user?.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = isNurse ? '/nurse-avatar.jpg' : '/doctor-avatar.jpg';
                }}
              />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{user?.name}</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              {user?.title || (isNurse ? 'Lead Telemetry Ward Nurse' : 'Attending Cardiologist')}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#005e9e', fontWeight: 500, marginTop: '2px' }}>
              {user?.email}
            </p>

            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
                textAlign: 'left',
                fontSize: '0.8rem',
                color: '#475569',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div>
                <strong>Role:</strong> {user?.role?.toUpperCase()}
              </div>
              <div>
                <strong>Portal:</strong> {isNurse ? 'Nurse Telemetry Hub' : 'Physician RPM Center'}
              </div>
              <div>
                <strong>Session:</strong> Active (JWT Authenticated)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="btn-secondary-outline"
                style={{ flex: 1 }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '10px'
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
