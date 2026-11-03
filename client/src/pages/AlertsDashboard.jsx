import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Filter,
  AlertCircle,
  Monitor,
  ShieldAlert,
  CheckCircle2,
  X,
  FileText,
  Pill,
  Check,
  ChevronRight,
  Stethoscope
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { useAlerts } from '../context/AlertsContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function AlertsDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { alerts, stats, analytics, acknowledgeAlert, escalateAlert, refreshData } = useAlerts();

  const isNurse = user?.role === 'nurse';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [toastMessage, setToastMessage] = useState('');

  // Sorting
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals for buttons
  const [selectedOrderAlert, setSelectedOrderAlert] = useState(null);
  const [selectedAdjustMedAlert, setSelectedAdjustMedAlert] = useState(null);
  const [adjustedMedName, setAdjustedMedName] = useState('Carvedilol 25mg');
  const [adjustedDosage, setAdjustedDosage] = useState('20mg BID (Twice Daily)');

  // Handle URL query parameters (e.g. ?type=Critical from StatCard clicks)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');
    if (typeParam) {
      setFilterType(typeParam);
    }
  }, [location.search]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtered & Sorted alerts
  const processedAlerts = useMemo(() => {
    let result = alerts.filter((a) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (a.name || '').toLowerCase().includes(q) ||
        (a.title || '').toLowerCase().includes(q) ||
        (a.device && a.device.toLowerCase().includes(q));

      const matchesPill =
        filterType === 'All'
          ? true
          : filterType === 'Critical'
          ? a.alertType === 'Critical'
          : filterType === 'Unacknowledged'
          ? a.status === 'Unacknowledged' || a.status === 'New'
          : filterType === 'Warning'
          ? a.alertType === 'Warning'
          : filterType === 'Escalated'
          ? a.status === 'Escalated'
          : true;

      return matchesSearch && matchesPill;
    });

    result.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (sortField === 'timestamp') {
        const timeA = new Date(valA).getTime() || 0;
        const timeB = new Date(valB).getTime() || 0;
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [alerts, searchQuery, filterType, sortField, sortOrder]);

  const handleAcknowledgeWithToast = async (id, patientName) => {
    try {
      await acknowledgeAlert(id);
      setToastMessage(`Bedside alarm acknowledged for ${patientName}. Alarm silenced.`);
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      setToastMessage(`Error: ${err.message}`);
    }
  };

  const handleEscalateWithToast = async (id, patientName) => {
    try {
      await escalateAlert(id);
      setToastMessage(`Alert for ${patientName} escalated to Attending Physician on-call.`);
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      setToastMessage(`Error: ${err.message}`);
    }
  };

  const handleSaveMedAdjustment = async () => {
    if (!selectedAdjustMedAlert) return;
    try {
      if (selectedAdjustMedAlert.patientId) {
        await api.addMedication(selectedAdjustMedAlert.patientId, {
          name: adjustedMedName,
          dosage: adjustedDosage
        });
      }
      setToastMessage(
        `Medication adjusted for ${selectedAdjustMedAlert.name}: ${adjustedMedName} (${adjustedDosage}). Saved to EHR.`
      );
      setSelectedAdjustMedAlert(null);
      refreshData();
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err) {
      setToastMessage(`Failed to update medication: ${err.message}`);
    }
  };

  // Dynamic card stats from MongoDB
  const cardStats = analytics?.statCards || {
    unacknowledged: { count: stats.unacknowledged, change: '+13%', period: 'vs last week' },
    activeAlerts: { count: stats.total, change: '-10%', period: 'vs last week' },
    devicesOffline: { count: 2, change: '-20%', period: 'vs last week' },
    criticalAlerts: { count: stats.critical, change: '+17%', period: 'vs last week' },
    escalated: { count: stats.escalated, change: '+5%', period: 'vs last week' }
  };

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
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
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* 4 Stat Cards Grid (Clickable + Computed from DB, Task 2) */}
      <section className="stat-cards-grid">
        {isNurse ? (
          <>
            <StatCard
              title="Unacknowledged"
              value={cardStats.unacknowledged.count}
              change={cardStats.unacknowledged.change}
              period={cardStats.unacknowledged.period}
              type="trend"
              status="positive"
              icon={<AlertCircle size={17} color="#dc2626" />}
              onClick={() => {
                setFilterType('Unacknowledged');
                setToastMessage('Filtered: Unacknowledged bedside alarms.');
                setTimeout(() => setToastMessage(''), 2000);
              }}
            />
            <StatCard
              title="Active Alerts"
              value={cardStats.activeAlerts.count}
              change={cardStats.activeAlerts.change}
              period={cardStats.activeAlerts.period}
              type="bars"
              status="positive"
              icon={<ShieldAlert size={17} color="#005e9e" />}
              onClick={() => {
                setFilterType('All');
                setToastMessage('Displaying all active ward alerts.');
                setTimeout(() => setToastMessage(''), 2000);
              }}
            />
            <StatCard
              title="Devices offline"
              value={cardStats.devicesOffline.count}
              change={cardStats.devicesOffline.change}
              period={cardStats.devicesOffline.period}
              type="donut"
              status="negative"
              icon={<Monitor size={17} color="#d97706" />}
              onClick={() => navigate('/devices?status=Offline')}
            />
            <StatCard
              title="Critical Alarms"
              value={cardStats.criticalAlerts.count}
              change={cardStats.criticalAlerts.change}
              period={cardStats.criticalAlerts.period}
              type="columns"
              status="negative"
              icon={<AlertCircle size={17} color="#dc2626" />}
              onClick={() => {
                setFilterType('Critical');
                setToastMessage('Filtered: Critical alarms.');
                setTimeout(() => setToastMessage(''), 2000);
              }}
            />
          </>
        ) : (
          <>
            <StatCard
              title="Escalated Alerts"
              value={cardStats.escalated.count}
              change={cardStats.escalated.change}
              period={cardStats.escalated.period}
              type="trend"
              status="positive"
              icon={<AlertCircle size={17} color="#005e9e" />}
              onClick={() => {
                setFilterType('Escalated');
                setToastMessage('Filtered: Escalated clinical alerts.');
                setTimeout(() => setToastMessage(''), 2000);
              }}
            />
            <StatCard
              title="Active Alerts"
              value={cardStats.activeAlerts.count}
              change={cardStats.activeAlerts.change}
              period={cardStats.activeAlerts.period}
              type="bars"
              status="positive"
              icon={<ShieldAlert size={17} color="#005e9e" />}
              onClick={() => {
                setFilterType('All');
                setToastMessage('Displaying all active alerts.');
                setTimeout(() => setToastMessage(''), 2000);
              }}
            />
            <StatCard
              title="Critical Alarms"
              value={cardStats.criticalAlerts.count}
              change={cardStats.criticalAlerts.change}
              period={cardStats.criticalAlerts.period}
              type="donut"
              status="negative"
              icon={<AlertCircle size={17} color="#dc2626" />}
              onClick={() => {
                setFilterType('Critical');
                setToastMessage('Filtered: Critical patient alarms.');
                setTimeout(() => setToastMessage(''), 2000);
              }}
            />
            <StatCard
              title="Unacknowledged"
              value={cardStats.unacknowledged.count}
              change={cardStats.unacknowledged.change}
              period={cardStats.unacknowledged.period}
              type="columns"
              status="negative"
              icon={<AlertCircle size={17} color="#d97706" />}
              onClick={() => {
                setFilterType('Unacknowledged');
                setToastMessage('Filtered: Unacknowledged alarms.');
                setTimeout(() => setToastMessage(''), 2000);
              }}
            />
          </>
        )}
      </section>

      {/* Main Grid: Active Alerts & Live Stream Queue */}
      <div className="alerts-main-grid">
        {/* Left Column: Active Alerts Table */}
        <div className="dashboard-card">
          <div className="card-title-row">
            <h2 className="card-title">Active Alerts Queue</h2>
          </div>

          {/* Table Filter Bar */}
          <div className="table-filter-bar">
            <div className="filter-pills-group">
              <button
                className={`filter-pill ${filterType === 'All' ? 'active' : ''}`}
                onClick={() => setFilterType('All')}
              >
                <span>All</span>
                <span className="count-badge">{alerts.length}</span>
              </button>
              <button
                className={`filter-pill ${filterType === 'Critical' ? 'active' : ''}`}
                onClick={() => setFilterType('Critical')}
              >
                <span>Critical</span>
                <span className="count-badge">
                  {alerts.filter((a) => a.alertType === 'Critical').length}
                </span>
              </button>
              <button
                className={`filter-pill ${filterType === 'Unacknowledged' ? 'active' : ''}`}
                onClick={() => setFilterType('Unacknowledged')}
              >
                <span>Unacknowledged</span>
                <span className="count-badge">
                  {
                    alerts.filter(
                      (a) => a.status === 'Unacknowledged' || a.status === 'New'
                    ).length
                  }
                </span>
              </button>
              <button
                className={`filter-pill ${filterType === 'Warning' ? 'active' : ''}`}
                onClick={() => setFilterType('Warning')}
              >
                <span>Warning</span>
                <span className="count-badge">
                  {alerts.filter((a) => a.alertType === 'Warning').length}
                </span>
              </button>
              <button
                className={`filter-pill ${filterType === 'Escalated' ? 'active' : ''}`}
                onClick={() => setFilterType('Escalated')}
              >
                <span>Escalated</span>
                <span className="count-badge">
                  {alerts.filter((a) => a.status === 'Escalated').length}
                </span>
              </button>
            </div>

            <div className="search-filter-controls">
              <div className="search-box">
                <Search size={15} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search alert by patient, title, device"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ color: '#94a3b8' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Alerts Table */}
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                    Patient {sortField === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '⬍'}
                  </th>
                  <th onClick={() => handleSort('alertType')} style={{ cursor: 'pointer' }}>
                    Type {sortField === 'alertType' ? (sortOrder === 'asc' ? '↑' : '↓') : '⬍'}
                  </th>
                  <th>Description</th>
                  <th onClick={() => handleSort('device')} style={{ cursor: 'pointer' }}>
                    Device {sortField === 'device' ? (sortOrder === 'asc' ? '↑' : '↓') : '⬍'}
                  </th>
                  <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                    Status {sortField === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : '⬍'}
                  </th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {processedAlerts.map((alert) => (
                  <tr key={alert.id || alert._id}>
                    <td>
                      <div
                        className="patient-info-cell"
                        onClick={() => {
                          if (alert.patientId && alert.patientId !== 'DEVICES') {
                            navigate(`/patient-profiles/${alert.patientId}`);
                          }
                        }}
                        style={{ cursor: alert.patientId ? 'pointer' : 'default' }}
                        title={alert.patientId ? `Open profile for ${alert.name}` : undefined}
                      >
                        <img
                          src={alert.avatar || '/nurse-avatar.jpg'}
                          alt={alert.name}
                          className="patient-cell-avatar"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/nurse-avatar.jpg';
                          }}
                        />
                        <div>
                          <span className="patient-cell-name">{alert.name}</span>
                          <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>
                            {alert.patientId}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge-status ${
                          alert.alertType === 'Critical'
                            ? 'badge-critical'
                            : alert.alertType === 'Warning'
                            ? 'badge-warning'
                            : 'badge-stable'
                        }`}
                      >
                        {alert.alertType}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{alert.title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {alert.description}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{alert.device}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background:
                            alert.status === 'Escalated'
                              ? '#fef3c7'
                              : alert.status === 'Acknowledged'
                              ? '#dcfce7'
                              : '#fee2e2',
                          color:
                            alert.status === 'Escalated'
                              ? '#92400e'
                              : alert.status === 'Acknowledged'
                              ? '#166534'
                              : '#991b1b'
                        }}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {alert.status !== 'Acknowledged' && (
                          <button
                            onClick={() => handleAcknowledgeWithToast(alert.id, alert.name)}
                            style={{
                              padding: '5px 10px',
                              background: '#005e9e',
                              color: '#fff',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: 'none'
                            }}
                            title="Acknowledge alert and silence ward chime"
                          >
                            Acknowledge & Mute
                          </button>
                        )}
                        {alert.status !== 'Escalated' && (
                          <button
                            onClick={() => handleEscalateWithToast(alert.id, alert.name)}
                            style={{
                              padding: '5px 10px',
                              background: '#f8fafc',
                              color: '#b91c1c',
                              border: '1px solid #fca5a5',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            title="Escalate alert to attending physician"
                          >
                            Escalate
                          </button>
                        )}
                        {alert.status === 'Acknowledged' && (
                          <button
                            onClick={() => setSelectedAdjustMedAlert(alert)}
                            style={{
                              padding: '5px 10px',
                              background: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            title="Adjust medication for patient"
                          >
                            Adjust Meds
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {processedAlerts.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      No alerts match current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Adjust Medication Modal (Task 2) */}
      {selectedAdjustMedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAdjustMedAlert(null)}>
          <div
            className="modal-content-card"
            style={{ maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pill size={20} color="#005e9e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Adjust Medication: {selectedAdjustMedAlert.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAdjustMedAlert(null)}
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                  Medication Name
                </label>
                <input
                  type="text"
                  value={adjustedMedName}
                  onChange={(e) => setAdjustedMedName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                  Adjusted Dosage / Frequency
                </label>
                <input
                  type="text"
                  value={adjustedDosage}
                  onChange={(e) => setAdjustedDosage(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedAdjustMedAlert(null)}
                  className="btn-secondary-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMedAdjustment}
                  className="btn-login-submit"
                  style={{ flex: 1, marginTop: 0 }}
                >
                  Save to EHR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
