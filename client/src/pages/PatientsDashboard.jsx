import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Filter,
  AlertCircle,
  ChevronRight,
  Activity,
  Users,
  CheckCircle,
  X,
  PlusCircle,
  Stethoscope,
  Heart,
  UserMinus
} from 'lucide-react';
import StatCard from '../components/StatCard';
import PatientAdmissionModal from '../components/PatientAdmissionModal';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertsContext';
import { api } from '../api/client';
import { getSocket } from '../api/socket';

export default function PatientsDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { analytics, refreshData: refreshAlerts } = useAlerts();
  const isNurse = user?.role === 'nurse';

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('Feb 2026');
  const [viewDischarged, setViewDischarged] = useState(false);
  const [filterRecentOnly, setFilterRecentOnly] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modals & Drawers
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterHeartRate, setFilterHeartRate] = useState('all');
  const [filterSpo2, setFilterSpo2] = useState('all');
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [reviewChartPatient, setReviewChartPatient] = useState(null);
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch patients from MongoDB
  const fetchPatients = useCallback(async () => {
    try {
      const data = await api.getPatients({
        discharged: viewDischarged ? 'true' : 'false',
        recent: filterRecentOnly ? 'true' : undefined
      });
      if (Array.isArray(data)) {
        setPatients(data);
      }
    } catch (err) {
      console.warn('[PatientsDashboard] Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [viewDischarged, filterRecentOnly]);

  useEffect(() => {
    fetchPatients();

    // Socket.io real-time updates
    const socket = getSocket();

    const handlePatientCreated = (newPatient) => {
      setPatients((prev) => [newPatient, ...prev.filter((p) => p.id !== newPatient.id)]);
      refreshAlerts();
    };

    const handlePatientUpdated = (updatedPatient) => {
      setPatients((prev) =>
        prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p))
      );
      refreshAlerts();
    };

    const handlePatientDischarged = ({ id, name }) => {
      setPatients((prev) => prev.filter((p) => p.id !== id));
      refreshAlerts();
    };

    socket.on('patient:created', handlePatientCreated);
    socket.on('patient:updated', handlePatientUpdated);
    socket.on('patient:discharged', handlePatientDischarged);

    return () => {
      socket.off('patient:created', handlePatientCreated);
      socket.off('patient:updated', handlePatientUpdated);
      socket.off('patient:discharged', handlePatientDischarged);
    };
  }, [fetchPatients, refreshAlerts]);

  // Handle URL query parameters for card navigations (e.g. ?filter=new, ?filter=discharged)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    if (filter === 'new') {
      setFilterRecentOnly(true);
      setViewDischarged(false);
      setStatusFilter('All');
    } else if (filter === 'discharged') {
      setViewDischarged(true);
      setFilterRecentOnly(false);
      setStatusFilter('All');
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

  // Filtered and sorted patients list
  const processedPatients = useMemo(() => {
    let result = patients.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.condition && p.condition.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Critical'
          ? p.healthStatus === 'Critical'
          : statusFilter === 'At risk'
          ? p.healthStatus === 'At risk' || p.situation === 'Warning'
          : p.healthStatus === 'Stable';

      const matchesHr =
        filterHeartRate === 'all'
          ? true
          : filterHeartRate === 'bradycardia'
          ? p.heartRate < 60
          : filterHeartRate === 'tachycardia'
          ? p.heartRate > 100
          : p.heartRate >= 60 && p.heartRate <= 100;

      const matchesOxy =
        filterSpo2 === 'all'
          ? true
          : filterSpo2 === 'critical'
          ? p.spo2 < 90
          : p.spo2 >= 90;

      return matchesSearch && matchesStatus && matchesHr && matchesOxy;
    });

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [patients, searchQuery, statusFilter, filterHeartRate, filterSpo2, sortField, sortOrder]);

  // Stat Card click handlers (Task 2)
  const handleCardActivePatients = () => {
    setViewDischarged(false);
    setFilterRecentOnly(false);
    setStatusFilter('All');
    setSearchQuery('');
    setToastMessage('Displaying all active hospital telemetry patients.');
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleCardNewPatients = () => {
    setViewDischarged(false);
    setFilterRecentOnly(true);
    setStatusFilter('All');
    setToastMessage('Filtered: recently admitted patients (past 7 days).');
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleCardCriticalAlerts = () => {
    navigate('/alerts?type=Critical');
  };

  const handleCardDischarged = () => {
    setFilterRecentOnly(false);
    setViewDischarged(true);
    setStatusFilter('All');
    setToastMessage('Displaying discharged telemetry patient records.');
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Discharge action from Chart Review
  const handleDischargePatient = async (patient) => {
    try {
      await api.dischargePatient(patient.id);
      setToastMessage(`Patient ${patient.name} successfully discharged. Recorded in EHR.`);
      setReviewChartPatient(null);
      fetchPatients();
      refreshAlerts();
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err) {
      setToastMessage(`Discharge error: ${err.message}`);
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  // Computed stat values from MongoDB analytics
  const cardStats = analytics?.statCards || {
    totalActivePatients: { count: patients.length, change: '+13%', period: 'vs last week' },
    newPatients: { count: '03', change: '+13%', period: 'vs last week' },
    criticalAlerts: { count: 2, change: '-20%', period: 'vs last week' },
    discharged: { count: '00', change: '+20%', period: 'vs last week' }
  };

  const reports = analytics?.reportsBreakdown || {
    totalReports: patients.length * 12 + 10,
    stable: { percentage: 60, count: 2, trend: '+22%' },
    atRisk: { percentage: 20, count: 1, trend: '-12%' },
    critical: { percentage: 20, count: 1, trend: '+17%' }
  };

  // Circumference calculation for Donut (r=60, circumference ~ 377)
  const circumference = 377;
  const stableDash = Math.round((reports.stable.percentage / 100) * circumference);
  const atRiskDash = Math.round((reports.atRisk.percentage / 100) * circumference);
  const criticalDash = Math.round((reports.critical.percentage / 100) * circumference);

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
        <StatCard
          title="Total active patients"
          value={cardStats.totalActivePatients.count}
          change={cardStats.totalActivePatients.change}
          period={cardStats.totalActivePatients.period}
          type="trend"
          status="positive"
          icon={<Users size={17} color="#005e9e" />}
          onClick={handleCardActivePatients}
        />
        <StatCard
          title="New Patients"
          value={cardStats.newPatients.count}
          change={cardStats.newPatients.change}
          period={cardStats.newPatients.period}
          type="bars"
          status="positive"
          icon={<Users size={17} color="#0d9488" />}
          onClick={handleCardNewPatients}
        />
        <StatCard
          title="Critical Alerts"
          value={cardStats.criticalAlerts.count}
          change={cardStats.criticalAlerts.change}
          period={cardStats.criticalAlerts.period}
          type="donut"
          status="negative"
          icon={<AlertCircle size={17} color="#dc2626" />}
          onClick={handleCardCriticalAlerts}
        />
        <StatCard
          title="Discharged"
          value={cardStats.discharged.count}
          change={cardStats.discharged.change}
          period={cardStats.discharged.period}
          type="columns"
          status="positive"
          icon={<CheckCircle size={17} color="#16a34a" />}
          onClick={handleCardDischarged}
        />
      </section>

      {/* Active Filter Pill indicator if special view is active */}
      {(viewDischarged || filterRecentOnly) && (
        <div
          style={{
            marginBottom: '16px',
            padding: '8px 14px',
            background: '#e0f2fe',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            color: '#0369a1'
          }}
        >
          <span>
            {viewDischarged
              ? 'Viewing Discharged Patients Archive'
              : 'Viewing Recently Admitted Patients (Past 7 Days)'}
          </span>
          <button
            onClick={() => {
              setViewDischarged(false);
              setFilterRecentOnly(false);
            }}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reset to All Active
          </button>
        </div>
      )}

      {/* Mid Section: Trends & Donut Insights */}
      <div className="dashboard-main-grid">
        {/* Left Column: Patient Trends & Patient Overview Table */}
        <div>
          {/* Patient Trends Card */}
          <div className="dashboard-card">
            <div className="card-title-row">
              <h2 className="card-title">Patient Trends</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setToastMessage(`Viewing telemetry trend curves for ${e.target.value}`);
                    setTimeout(() => setToastMessage(''), 2500);
                  }}
                  style={{
                    fontSize: '0.8rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    background: '#ffffff',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Feb 2026">Feb 2026</option>
                  <option value="Jan 2026">Jan 2026</option>
                  <option value="Dec 2025">Dec 2025</option>
                </select>
              </div>
            </div>

            {/* SVG Patient Trends Chart */}
            <div style={{ height: '170px', width: '100%', position: 'relative' }}>
              <svg width="100%" height="140" viewBox="0 0 700 140" preserveAspectRatio="none">
                <line x1="40" y1="20" x2="690" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="50" x2="690" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="80" x2="690" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="110" x2="690" y2="110" stroke="#f1f5f9" strokeWidth="1" />

                <text x="5" y="24" fontSize="10" fill="#94a3b8">800</text>
                <text x="5" y="54" fontSize="10" fill="#94a3b8">400</text>
                <text x="5" y="84" fontSize="10" fill="#94a3b8">200</text>
                <text x="5" y="114" fontSize="10" fill="#94a3b8">50</text>

                {selectedMonth === 'Jan 2026' ? (
                  <>
                    <path
                      d="M 50 90 Q 110 95, 160 70 T 270 50 T 380 65 T 490 60 T 600 70 T 680 50"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 50 85 Q 110 70, 160 45 T 270 35 T 380 50 T 490 40 T 600 35 T 680 30"
                      fill="none"
                      stroke="#005e9e"
                      strokeWidth="3"
                    />
                    <circle cx="50" cy="85" r="4.5" fill="#005e9e" stroke="#ffffff" strokeWidth="2" />
                  </>
                ) : selectedMonth === 'Dec 2025' ? (
                  <>
                    <path
                      d="M 50 120 Q 110 110, 160 100 T 270 85 T 380 90 T 490 75 T 600 80 T 680 60"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 50 115 Q 110 100, 160 85 T 270 70 T 380 80 T 490 60 T 600 70 T 680 45"
                      fill="none"
                      stroke="#005e9e"
                      strokeWidth="3"
                    />
                    <circle cx="680" cy="45" r="4.5" fill="#005e9e" stroke="#ffffff" strokeWidth="2" />
                  </>
                ) : (
                  <>
                    <path
                      d="M 50 110 Q 110 90, 160 85 T 270 65 T 380 75 T 490 50 T 600 55 T 680 40"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 50 110 Q 110 80, 160 55 T 270 45 T 380 60 T 490 35 T 600 45 T 680 25"
                      fill="none"
                      stroke="#005e9e"
                      strokeWidth="3"
                    />
                    <circle cx="110" cy="80" r="4.5" fill="#005e9e" stroke="#ffffff" strokeWidth="2" />
                  </>
                )}
              </svg>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingLeft: '45px',
                  paddingRight: '10px',
                  fontSize: '0.78rem',
                  color: '#94a3b8'
                }}
              >
                <span style={{ color: selectedMonth === 'Jan 2026' ? '#005e9e' : '#94a3b8', fontWeight: selectedMonth === 'Jan 2026' ? 700 : 400 }}>Jan</span>
                <span style={{ color: selectedMonth === 'Feb 2026' ? '#005e9e' : '#94a3b8', fontWeight: selectedMonth === 'Feb 2026' ? 700 : 400 }}>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
                <span>Nov</span>
                <span style={{ color: selectedMonth === 'Dec 2025' ? '#005e9e' : '#94a3b8', fontWeight: selectedMonth === 'Dec 2025' ? 700 : 400 }}>Dec</span>
              </div>
            </div>
          </div>

          {/* Patient Overview Table */}
          <div className="dashboard-card">
            <div
              className="card-title-row"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 className="card-title">Patient Overview</h2>
                {loading && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Syncing with DB...</span>
                )}
              </div>

              {/* Task 3: + Add Patient Button */}
              <button
                className="btn-primary"
                onClick={() => setIsAdmitModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  borderRadius: '8px'
                }}
                title="Admit new patient to ward"
              >
                <PlusCircle size={15} />
                <span>+ Add Patient</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="table-filter-bar">
              <div className="filter-pills-group">
                <button
                  className={`filter-pill ${statusFilter === 'All' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('All')}
                >
                  <span>All</span>
                  <span className="count-badge">{patients.length}</span>
                </button>
                <button
                  className={`filter-pill ${statusFilter === 'Critical' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('Critical')}
                >
                  <span>Critical</span>
                  <span className="count-badge">
                    {patients.filter((p) => p.healthStatus === 'Critical').length}
                  </span>
                </button>
                <button
                  className={`filter-pill ${statusFilter === 'At risk' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('At risk')}
                >
                  <span>At risk</span>
                  <span className="count-badge">
                    {
                      patients.filter(
                        (p) => p.healthStatus === 'At risk' || p.situation === 'Warning'
                      ).length
                    }
                  </span>
                </button>
                <button
                  className={`filter-pill ${statusFilter === 'Stable' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('Stable')}
                >
                  <span>Stable</span>
                  <span className="count-badge">
                    {patients.filter((p) => p.healthStatus === 'Stable').length}
                  </span>
                </button>
              </div>

              <div className="search-filter-controls">
                <div className="search-box">
                  <Search size={15} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, or condition"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ color: '#94a3b8' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  className="filter-action-btn"
                  onClick={() => setShowFilterModal(true)}
                  style={{
                    background:
                      filterHeartRate !== 'all' || filterSpo2 !== 'all' ? '#e0f2fe' : '#ffffff',
                    borderColor:
                      filterHeartRate !== 'all' || filterSpo2 !== 'all' ? '#005e9e' : '#cbd5e1'
                  }}
                >
                  <Filter
                    size={14}
                    color={
                      filterHeartRate !== 'all' || filterSpo2 !== 'all' ? '#005e9e' : '#475569'
                    }
                  />
                  <span>Filter {filterHeartRate !== 'all' || filterSpo2 !== 'all' ? '•' : ''}</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                      Name {sortField === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '⬍'}
                    </th>
                    <th onClick={() => handleSort('healthStatus')} style={{ cursor: 'pointer' }}>
                      Health Status {sortField === 'healthStatus' ? (sortOrder === 'asc' ? '↑' : '↓') : '⬍'}
                    </th>
                    <th onClick={() => handleSort('heartRate')} style={{ cursor: 'pointer' }}>
                      Heart Rate {sortField === 'heartRate' ? (sortOrder === 'asc' ? '↑' : '↓') : '⬍'}
                    </th>
                    <th onClick={() => handleSort('bloodPressure')} style={{ cursor: 'pointer' }}>
                      Blood pressure {sortField === 'bloodPressure' ? (sortOrder === 'asc' ? '↑' : '↓') : '⬍'}
                    </th>
                    <th onClick={() => handleSort('spo2')} style={{ cursor: 'pointer' }}>
                      SpO2 {sortField === 'spo2' ? (sortOrder === 'asc' ? '↑' : '↓') : '⬍'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {processedPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      onClick={() => {
                        if (isNurse) {
                          setReviewChartPatient(patient);
                        } else {
                          navigate(`/patient-profiles/${patient.id}`);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                      title={
                        isNurse
                          ? `Bedside telemetry check for ${patient.name}`
                          : `Open 3D diagnostic profile for ${patient.name}`
                      }
                    >
                      <td>
                        <div className="patient-info-cell">
                          <img
                            src={patient.avatar}
                            alt={patient.name}
                            className="patient-cell-avatar"
                            onError={(e) => {
                              const initials = (patient.name || 'PT')
                                .split(' ')
                                .map((n) => n[0])
                                .join('');
                              e.target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><rect width="36" height="36" fill="%23005e9e" rx="18"/><text x="18" y="21" font-family="-apple-system, sans-serif" font-size="13" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
                            }}
                          />
                          <div>
                            <span className="patient-cell-name">{patient.name}</span>
                            <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>
                              {patient.id} • {patient.bed || 'Ward Bed'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge-status ${
                            patient.healthStatus === 'Critical'
                              ? 'badge-critical'
                              : patient.healthStatus === 'At risk' || patient.healthStatus === 'Warning'
                              ? 'badge-warning'
                              : 'badge-stable'
                          }`}
                        >
                          {patient.healthStatus}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{patient.heartRate}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}> bpm</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{patient.bloodPressure}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}> mmHg</span>
                      </td>
                      <td>
                        {patient.spo2 < 90 ? (
                          <span
                            style={{
                              color: '#dc2626',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span style={{ fontSize: '1rem' }}>ılı</span> &lt;90%
                          </span>
                        ) : (
                          <span style={{ color: '#059669', fontWeight: 600 }}>
                            {patient.spo2}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {processedPatients.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                        {loading
                          ? 'Loading telemetry data from MongoDB...'
                          : 'No patients match current filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Reports & Insights (Computed from MongoDB) */}
        <div>
          {/* Reports & Insights Donut Card */}
          <div className="dashboard-card">
            <div className="card-title-row">
              <h2 className="card-title">Reports & Insights</h2>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px'
              }}
            >
              {/* Stats Legend on Left */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span style={{ color: '#64748b' }}>Stable</span>
                    <span style={{ fontWeight: 700 }}>{reports.stable.count}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.78rem'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#16a34a' }}>
                      {reports.stable.percentage}%
                    </span>
                    <span style={{ color: '#16a34a' }}>{reports.stable.trend}</span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      width: '100%',
                      background: '#e2e8f0',
                      borderRadius: '4px',
                      marginTop: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${reports.stable.percentage}%`,
                        background: '#10b981',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span style={{ color: '#64748b' }}>At Risk</span>
                    <span style={{ fontWeight: 700 }}>{reports.atRisk.count}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.78rem'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#d97706' }}>
                      {reports.atRisk.percentage}%
                    </span>
                    <span style={{ color: '#d97706' }}>{reports.atRisk.trend}</span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      width: '100%',
                      background: '#e2e8f0',
                      borderRadius: '4px',
                      marginTop: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${reports.atRisk.percentage}%`,
                        background: '#f59e0b',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span style={{ color: '#64748b' }}>Critical</span>
                    <span style={{ fontWeight: 700 }}>{reports.critical.count}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.78rem'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#dc2626' }}>
                      {reports.critical.percentage}%
                    </span>
                    <span style={{ color: '#dc2626' }}>{reports.critical.trend}</span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      width: '100%',
                      background: '#e2e8f0',
                      borderRadius: '4px',
                      marginTop: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${reports.critical.percentage}%`,
                        background: '#ef4444',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>

                {/* View Analytics Button (Task 2) */}
                <button
                  className="btn-secondary-outline"
                  onClick={() => setShowAnalyticsModal(true)}
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: '6px',
                    fontSize: '0.82rem',
                    padding: '6px 14px'
                  }}
                >
                  <span>View Analytics</span>
                  <ChevronRight size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                </button>
              </div>

              {/* Segmented Donut Ring computed dynamically */}
              <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="14"
                    strokeDasharray={`${stableDash} 377`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="14"
                    strokeDasharray={`${atRiskDash} 377`}
                    strokeDashoffset={`-${stableDash}`}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="14"
                    strokeDasharray={`${criticalDash} 377`}
                    strokeDashoffset={`-${stableDash + atRiskDash}`}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Center Stats */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                    {reports.totalReports}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                    Total reports
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Modal (Task 2) */}
      {showFilterModal && (
        <div className="modal-overlay" onClick={() => setShowFilterModal(false)}>
          <div
            className="modal-content-card"
            style={{ maxWidth: '440px' }}
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
                <Filter size={18} color="#005e9e" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Telemetry Vitals Filter</h3>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                  Heart Rate Threshold
                </label>
                <select
                  value={filterHeartRate}
                  onChange={(e) => setFilterHeartRate(e.target.value)}
                  className="form-input"
                >
                  <option value="all">All Heart Rates</option>
                  <option value="bradycardia">Bradycardia (&lt; 60 bpm)</option>
                  <option value="normal">Normal (60 - 100 bpm)</option>
                  <option value="tachycardia">Tachycardia (&gt; 100 bpm)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                  Oxygen Saturation (SpO2)
                </label>
                <select
                  value={filterSpo2}
                  onChange={(e) => setFilterSpo2(e.target.value)}
                  className="form-input"
                >
                  <option value="all">All SpO2 Levels</option>
                  <option value="critical">Critical Desaturation (&lt; 90%)</option>
                  <option value="normal">Normal / Acceptable (≥ 90%)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setFilterHeartRate('all');
                    setFilterSpo2('all');
                    setShowFilterModal(false);
                  }}
                  className="btn-secondary-outline"
                  style={{ flex: 1 }}
                >
                  Reset Filters
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="btn-login-submit"
                  style={{ flex: 1, marginTop: 0 }}
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal (Task 2: View Analytics) */}
      {showAnalyticsModal && (
        <div className="modal-overlay" onClick={() => setShowAnalyticsModal(false)}>
          <div
            className="modal-content-card"
            style={{ maxWidth: '580px' }}
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
                <Activity size={20} color="#005e9e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Telemetry Analytics Breakdown</h3>
              </div>
              <button
                onClick={() => setShowAnalyticsModal(false)}
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '10px',
                  textAlign: 'center'
                }}
              >
                <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#16a34a' }}>
                    {reports.stable.count}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#166534' }}>Stable Patients</div>
                </div>
                <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#d97706' }}>
                    {reports.atRisk.count}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#92400e' }}>At Risk Patients</div>
                </div>
                <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#dc2626' }}>
                    {reports.critical.count}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#991b1b' }}>Critical Patients</div>
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>Ward Vitals Summary</div>
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                  Active Patients: {patients.length} monitored continuous telemetry beds.
                  Mean Arterial Pressure (MAP) and continuous Holter tracings sync every 5 seconds.
                  Historical vital trends recorded in MongoDB `VitalReading` collection.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAnalyticsModal(false)}
                className="btn-login-submit"
                style={{ marginTop: '8px' }}
              >
                Close Analytics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Chart Modal (Task 2 & 3: Review Chart & Discharge) */}
      {reviewChartPatient && (
        <div className="modal-overlay" onClick={() => setReviewChartPatient(null)}>
          <div
            className="modal-content-card"
            style={{ maxWidth: '520px' }}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Stethoscope size={20} color="#005e9e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Clinical Chart: {reviewChartPatient.name}
                </h3>
              </div>
              <button
                onClick={() => setReviewChartPatient(null)}
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  background: '#f8fafc',
                  padding: '12px',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <strong>Patient ID:</strong> {reviewChartPatient.id}
                </div>
                <div>
                  <strong>Location:</strong> {reviewChartPatient.bed || 'Ward Bed'}
                </div>
                <div>
                  <strong>Heart Rate:</strong> {reviewChartPatient.heartRate} bpm
                </div>
                <div>
                  <strong>Blood Pressure:</strong> {reviewChartPatient.bloodPressure} mmHg
                </div>
                <div>
                  <strong>SpO2 Saturation:</strong> {reviewChartPatient.spo2}%
                </div>
                <div>
                  <strong>Status:</strong> {reviewChartPatient.healthStatus}
                </div>
              </div>

              <div>
                <strong>Primary Diagnosis:</strong> {reviewChartPatient.condition}
              </div>
              <div>
                <strong>Current Clinical Evaluation:</strong>
                <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                  {reviewChartPatient.situationDetails || 'Vital parameters normal'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => navigate(`/patient-profiles/${reviewChartPatient.id}`)}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  View Full Profile
                </button>
                <button
                  type="button"
                  onClick={() => handleDischargePatient(reviewChartPatient)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '8px 12px'
                  }}
                  title="Discharge patient from ward"
                >
                  <UserMinus size={16} />
                  <span>Discharge Patient</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Admission Modal (Task 3) */}
      <PatientAdmissionModal
        isOpen={isAdmitModalOpen}
        onClose={() => setIsAdmitModalOpen(false)}
        onPatientAdmitted={(newPt) => {
          setPatients((prev) => [newPt, ...prev.filter((p) => p.id !== newPt.id)]);
          fetchPatients();
          refreshAlerts();
        }}
      />
    </div>
  );
}
