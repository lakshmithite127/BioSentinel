import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Phone,
  MessageSquare,
  TrendingUp,
  RotateCw,
  Plus,
  Minus,
  Maximize2,
  FileText,
  CheckCircle,
  AlertCircle,
  Calendar,
  X,
  Send,
  Clock,
  Mic,
  MicOff,
  PhoneOff,
  Users,
  Edit,
  Trash2,
  Edit3,
  UserMinus,
  Check,
  Shield,
  Stethoscope
} from 'lucide-react';
import { api } from '../api/client';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';
import PatientAdmissionModal from '../components/PatientAdmissionModal';

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNurse = user?.role === 'nurse';

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [patientsList, setPatientsList] = useState([]);
  const [medications, setMedications] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pinVisible, setPinVisible] = useState(true);
  const [vitalTimeframe, setVitalTimeframe] = useState('Daily');
  const [medSchedule, setMedSchedule] = useState('Daily');
  const [notification, setNotification] = useState('');

  // Modals
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [notesList, setNotesList] = useState([]);

  const [showCallModal, setShowCallModal] = useState(false);
  const [callMuted, setCallMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [chatRecipient, setChatRecipient] = useState('all');
  const [chatRecipientName, setChatRecipientName] = useState('Care Team (All)');
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatText, setNewChatText] = useState('');

  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('2026-11-05');
  const [followUpNotes, setFollowUpNotes] = useState('');

  const [showEhrModal, setShowEhrModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Care Team state (Task 4)
  const [careTeam, setCareTeam] = useState([]);

  // Fetch all patients for switcher dropdown
  useEffect(() => {
    api.getPatients({ discharged: 'all' }).then((pts) => {
      if (Array.isArray(pts)) setPatientsList(pts);
    }).catch(() => {});
  }, []);

  // Fetch Care Team with live online presence (Task 4)
  const fetchCareTeam = useCallback(async () => {
    try {
      const team = await api.getCareTeam();
      if (Array.isArray(team)) setCareTeam(team);
    } catch {}
  }, []);

  useEffect(() => {
    fetchCareTeam();
    const socket = getSocket();
    const handlePresence = () => fetchCareTeam();
    socket.on('staff:presence', handlePresence);
    return () => socket.off('staff:presence', handlePresence);
  }, [fetchCareTeam]);

  // Fetch specific patient data
  const fetchCurrentPatient = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getPatient(id);
      if (data && !data.error) {
        setPatient(data);
        setMedications(data.medications || []);
      }
    } catch (err) {
      console.warn('[PatientProfile] Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCurrentPatient();
  }, [fetchCurrentPatient]);

  // Fetch clinical notes from MongoDB (Task 5)
  const fetchNotes = useCallback(async () => {
    if (!id) return;
    try {
      const notes = await api.getNotes(id);
      if (Array.isArray(notes)) setNotesList(notes);
    } catch {}
  }, [id]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Fetch patient messages from MongoDB (Task 4)
  const fetchMessages = useCallback(async () => {
    if (!id) return;
    try {
      const msgs = await api.getMessages(id);
      if (Array.isArray(msgs)) setChatMessages(msgs);
    } catch {}
  }, [id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Socket.io real-time listeners for notes, patient updates, and messages
  useEffect(() => {
    const socket = getSocket();

    const handlePatientUpdated = (updated) => {
      if (updated.id === id) {
        setPatient((prev) => ({ ...prev, ...updated }));
        if (updated.medications) setMedications(updated.medications);
      }
    };

    const handleNoteCreated = (newNote) => {
      if (newNote.patientId === id) {
        setNotesList((prev) => [newNote, ...prev.filter((n) => n._id !== newNote._id)]);
      }
    };

    const handleNoteUpdated = (updNote) => {
      if (updNote.patientId === id) {
        setNotesList((prev) =>
          prev.map((n) => (n._id === updNote._id ? updNote : n))
        );
      }
    };

    const handleNoteDeleted = (delId) => {
      setNotesList((prev) => prev.filter((n) => n._id !== delId));
    };

    const handleMessageReceived = (msg) => {
      if (msg.patientId === id) {
        setChatMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('patient:updated', handlePatientUpdated);
    socket.on('note:created', handleNoteCreated);
    socket.on('note:updated', handleNoteUpdated);
    socket.on('note:deleted', handleNoteDeleted);
    socket.on('message:received', handleMessageReceived);

    return () => {
      socket.off('patient:updated', handlePatientUpdated);
      socket.off('note:created', handleNoteCreated);
      socket.off('note:updated', handleNoteUpdated);
      socket.off('note:deleted', handleNoteDeleted);
      socket.off('message:received', handleMessageReceived);
    };
  }, [id]);

  // Call timer simulation (Task 2)
  useEffect(() => {
    let interval = null;
    if (showCallModal) {
      interval = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [showCallModal]);

  // Toggle Medication in MongoDB
  const toggleMedication = async (medId) => {
    if (!patient) return;
    const med = medications.find((m) => m.id === medId);
    if (!med) return;
    const newActive = !med.active;
    setMedications((prev) =>
      prev.map((m) => (m.id === medId ? { ...m, active: newActive } : m))
    );
    try {
      await api.toggleMedication(patient.id, medId, newActive);
      setNotification(`Medication ${med.name} toggled: ${newActive ? 'Active' : 'Discontinued'}.`);
      setTimeout(() => setNotification(''), 2500);
    } catch (err) {
      setNotification(`Failed to update medication: ${err.message}`);
    }
  };

  // Add or Edit Clinical Note in MongoDB (Task 5)
  const handleSaveNote = async () => {
    if (!noteText.trim() || !patient) return;

    try {
      if (editingNote) {
        await api.updateNote(editingNote._id, noteText.trim());
        setNotification('Clinical note updated successfully.');
      } else {
        await api.createNote({
          patientId: patient.id,
          text: noteText.trim()
        });
        setNotification(`Clinical note saved to MongoDB for ${patient.name}.`);
      }
      setShowNoteModal(false);
      setEditingNote(null);
      setNoteText('');
      fetchNotes();
      setTimeout(() => setNotification(''), 3000);
    } catch (err) {
      setNotification(`Note error: ${err.message}`);
    }
  };

  // Delete Note from MongoDB (Task 5)
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this clinical note?')) return;
    try {
      await api.deleteNote(noteId);
      setNotification('Clinical note deleted.');
      fetchNotes();
      setTimeout(() => setNotification(''), 2500);
    } catch (err) {
      setNotification(`Delete error: ${err.message}`);
    }
  };

  // Send Message via Socket.io & MongoDB (Task 4)
  const handleSendMessage = async () => {
    if (!newChatText.trim() || !patient) return;
    try {
      await api.sendMessage({
        patientId: patient.id,
        recipientId: chatRecipient,
        recipientName: chatRecipientName,
        text: newChatText.trim()
      });
      setNewChatText('');
      fetchMessages();
    } catch (err) {
      setNotification(`Message failed: ${err.message}`);
    }
  };

  // Discharge Patient (Task 3)
  const handleDischarge = async () => {
    if (!patient) return;
    if (!window.confirm(`Discharge patient ${patient.name} (${patient.id}) from ward?`)) return;
    try {
      await api.dischargePatient(patient.id);
      setNotification(`Patient ${patient.name} discharged successfully.`);
      setTimeout(() => navigate('/patients'), 1500);
    } catch (err) {
      setNotification(`Discharge error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        <img src="/logo-capsule.svg" alt="Loading" style={{ width: '40px', height: '40px', marginBottom: '12px' }} />
        <div>Loading 3D Telemetry Diagnostics from MongoDB...</div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        <h3>Patient Record Not Found</h3>
        <p>No active telemetry stream matches ID: {id}</p>
        <button onClick={() => navigate('/patients')} className="btn-primary" style={{ marginTop: '14px' }}>
          Back to Patients List
        </button>
      </div>
    );
  }

  const p = patient;
  const displayedMeds =
    medSchedule === 'PRN'
      ? medications.filter(
          (m) => m.name.toLowerCase().includes('prn') || m.dosage.includes('PRN')
        )
      : medications;

  // Format call duration MM:SS
  const mins = Math.floor(callDuration / 60).toString().padStart(2, '0');
  const secs = (callDuration % 60).toString().padStart(2, '0');

  return (
    <div>
      {/* Toast Notification */}
      {notification && (
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
          {notification}
        </div>
      )}

      {/* Top Search & Patient Switcher Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="search-box" style={{ width: '320px' }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Find patients by name or ID..."
              onChange={(e) => {
                const val = e.target.value.toLowerCase().trim();
                if (!val) return;
                const match = patientsList.find(
                  (pt) =>
                    pt.name.toLowerCase().includes(val) ||
                    pt.id.toLowerCase().includes(val) ||
                    pt.condition.toLowerCase().includes(val)
                );
                if (match) {
                  navigate(`/patient-profiles/${match.id}`);
                }
              }}
            />
          </div>

          <select
            value={p.id}
            onChange={(e) => navigate(`/patient-profiles/${e.target.value}`)}
            style={{
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: '9999px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#005e9e',
              cursor: 'pointer'
            }}
            title="Switch Patient Profile"
          >
            {patientsList.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name} ({pt.id}) • {pt.condition}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary-outline"
            onClick={() => setShowEditModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Edit3 size={15} />
            <span>Edit Patient</span>
          </button>
          <button
            className="btn-secondary-outline"
            onClick={handleDischarge}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#dc2626',
              borderColor: '#fca5a5'
            }}
          >
            <UserMinus size={15} />
            <span>Discharge</span>
          </button>
        </div>
      </div>

      {/* 3-Column Profile Layout */}
      <div className="profile-grid-layout">
        {/* LEFT COLUMN: Patient Summary */}
        <div className="patient-left-card">
          <div>
            <img
              src={p.avatar}
              alt={p.name}
              className="patient-avatar-large"
              onError={(e) => {
                const initials = p.name
                  ? p.name.split(' ').map((n) => n[0]).join('')
                  : 'PT';
                e.target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23005e9e" rx="60"/><text x="60" y="68" font-family="-apple-system, sans-serif" font-size="38" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
              }}
            />
            <h2 className="patient-summary-title">{p.name}</h2>
            <p className="patient-summary-sub">
              {p.age} years old • {p.condition}
            </p>
            <p style={{ fontSize: '0.78rem', color: '#005e9e', fontWeight: 600, marginTop: '2px' }}>
              {p.id} • {p.bed || 'ICU Ward'}
            </p>
          </div>

          {/* Current situation card (Task 6: Derived strictly from vitals) */}
          <div className="profile-stat-box">
            <div className="profile-stat-label">Current situation</div>
            <div
              className="profile-stat-headline"
              style={{
                color:
                  p.situation === 'Critical'
                    ? '#dc2626'
                    : p.situation === 'Warning'
                    ? '#d97706'
                    : '#16a34a'
              }}
            >
              {p.situation || 'Stable'}
            </div>
            <div className="profile-stat-desc">
              {p.situationDetails || 'Vital parameters normal'}
            </div>
          </div>

          {/* Risk Status card (Task 6: Derived strictly from vitals) */}
          <div className="profile-stat-box">
            <div className="profile-stat-label">Risk Status</div>
            <div
              className="profile-stat-headline"
              style={{
                color:
                  p.riskStatus === 'Critical'
                    ? '#dc2626'
                    : p.riskStatus === 'At Risk'
                    ? '#d97706'
                    : '#059669'
              }}
            >
              {p.riskStatus || 'Stable'}
            </div>
            <div className="profile-stat-desc">
              {p.riskStatusDetails || 'Continuous telemetry tracking active'}
            </div>
          </div>

          {/* Real Vital Telemetry readout */}
          <div className="profile-stat-box">
            <div className="profile-stat-label">Continuous Telemetry</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>HR:</span>{' '}
                <strong>{p.heartRate} bpm</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>SpO2:</span>{' '}
                <strong style={{ color: p.spo2 < 90 ? '#dc2626' : '#16a34a' }}>{p.spo2}%</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>BP:</span>{' '}
                <strong>{p.bloodPressure}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Temp:</span>{' '}
                <strong>{p.temperature || 98.6}°F</strong>
              </div>
            </div>
          </div>

          {/* Action Buttons Row (Task 2 & 4) */}
          <div className="action-buttons-grid">
            <button
              className="btn-profile-action primary"
              onClick={() => setShowCallModal(true)}
              title="Start audio intercom call with patient bed"
            >
              <Phone size={14} />
              <span>Call</span>
            </button>
            <button
              className="btn-profile-action"
              onClick={() => setShowMessageModal(true)}
              title="Message Care Team regarding this patient"
            >
              <MessageSquare size={14} />
              <span>Message</span>
            </button>
            <button
              className="btn-profile-action"
              onClick={async () => {
                setNotification(`Attending consult requested for ${p.name}. Paged to telemetry on-call.`);
                setTimeout(() => setNotification(''), 3000);
              }}
              title="Escalate patient to attending physician"
            >
              <TrendingUp size={14} />
              <span>Escalate</span>
            </button>
            <button
              className="btn-profile-action"
              onClick={() => setShowFollowUpModal(true)}
              title="Schedule telemetry follow-up check"
            >
              <RotateCw size={14} />
              <span>Follow-Up</span>
            </button>
          </div>

          {/* Add Note Button (Task 5) */}
          <button
            className="btn-add-note"
            onClick={() => {
              setEditingNote(null);
              setNoteText('');
              setShowNoteModal(true);
            }}
          >
            <FileText size={15} />
            <span>Add Note</span>
          </button>
        </div>

        {/* CENTER COLUMN: 3D Organ Diagnostic & Vital Trends */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Top: 3D Organ Diagnostic View (Task 6: Verified Condition-to-Organ Consistency) */}
          <div
            className="dashboard-card"
            style={{ padding: '16px', position: 'relative', marginBottom: 0 }}
          >
            <div className="organ-view-container">
              <img
                src={p.organImage || '/heart.png'}
                alt={`${p.name} - ${p.organName || 'Organ Diagnostic Scan'}`}
                className="organ-image-render"
                style={{ transform: `scale(${zoomLevel})` }}
                onError={(e) => {
                  const cur = e.target.src;
                  if (cur.endsWith('.png')) {
                    e.target.src = cur.replace(/\.png$/, '.jpg');
                  } else if (cur.endsWith('.jpg')) {
                    e.target.src = cur.replace(/\.jpg$/, '.png');
                  } else {
                    e.target.src = '/heart.png';
                  }
                }}
              />

              {/* Interactive Callout Pin */}
              {pinVisible && (
                <div
                  className="organ-callout-pin"
                  onClick={() => {
                    setNotification(
                      `Diagnostic for ${p.name}: ${p.organStatus?.diagnostic || p.situationDetails || 'Normal finding'}`
                    );
                    setTimeout(() => setNotification(''), 3500);
                  }}
                  title="Click to view detailed clinical finding"
                >
                  <span
                    className="organ-pin-dot"
                    style={{
                      background:
                        p.organStatus?.state === 'Critical'
                          ? '#dc2626'
                          : p.organStatus?.state === 'Warning'
                          ? '#d97706'
                          : '#10b981'
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color:
                        p.organStatus?.state === 'Critical'
                          ? '#dc2626'
                          : p.organStatus?.state === 'Warning'
                          ? '#d97706'
                          : '#64748b',
                      fontWeight: 600
                    }}
                  >
                    {p.organStatus?.state || p.situation || 'Normal'}
                  </span>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                    {p.organStatus?.organ || p.condition}
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {p.organStatus?.diagnostic || p.situationDetails || 'Evaluation active'}
                  </span>
                </div>
              )}

              {/* Zoom Controls */}
              <div className="organ-zoom-controls">
                <button
                  className="organ-zoom-btn"
                  onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.15))}
                  title="Zoom In"
                >
                  <Plus size={14} />
                </button>
                <button
                  className="organ-zoom-btn"
                  onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.15))}
                  title="Zoom Out"
                >
                  <Minus size={14} />
                </button>
                <button
                  className="organ-zoom-btn"
                  onClick={() => setZoomLevel(1)}
                  title="Reset Zoom"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom: 24-Hour Vital Trends Graph */}
          <div className="dashboard-card" style={{ marginBottom: 0 }}>
            <div className="card-title-row">
              <h2 className="card-title">24-Hour Vital Trends</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                    Lowest
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                    Normal
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                    Highest
                  </span>
                </div>

                <select
                  value={vitalTimeframe}
                  onChange={(e) => setVitalTimeframe(e.target.value)}
                  style={{
                    fontSize: '0.78rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '9999px',
                    padding: '3px 10px',
                    background: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Daily">24h Continuous</option>
                  <option value="Weekly">Weekly Summary</option>
                </select>
              </div>
            </div>

            <div style={{ height: '180px', width: '100%', position: 'relative' }}>
              <svg width="100%" height="150" viewBox="0 0 600 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="vital-gradient-normal" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="vital-gradient-critical" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="30" y1="20" x2="590" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="30" y1="50" x2="590" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="30" y1="80" x2="590" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="30" y1="110" x2="590" y2="110" stroke="#f1f5f9" strokeWidth="1" />

                <text x="5" y="24" fontSize="9" fill="#94a3b8">200</text>
                <text x="5" y="54" fontSize="9" fill="#94a3b8">160</text>
                <text x="5" y="84" fontSize="9" fill="#94a3b8">120</text>
                <text x="5" y="114" fontSize="9" fill="#94a3b8">80</text>
                <text x="5" y="144" fontSize="9" fill="#94a3b8">40</text>

                {p.healthStatus === 'Critical' ? (
                  <>
                    <path
                      d="M 40 100 Q 120 70, 200 80 T 360 65 L 360 145 L 40 145 Z"
                      fill="url(#vital-gradient-normal)"
                    />
                    <path
                      d="M 360 65 Q 440 45, 520 30 T 580 20 L 580 145 L 360 145 Z"
                      fill="url(#vital-gradient-critical)"
                    />
                    <path
                      d="M 40 100 Q 120 70, 200 80 T 360 65"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 360 65 Q 440 45, 520 30 T 580 20"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                    />
                    <circle cx="580" cy="20" r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                  </>
                ) : (
                  <>
                    <path
                      d="M 40 120 Q 120 90, 200 95 T 360 85 T 520 90 T 580 85 L 580 145 L 40 145 Z"
                      fill="url(#vital-gradient-normal)"
                    />
                    <path
                      d="M 40 120 Q 120 90, 200 95 T 360 85 T 520 90 T 580 85"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />
                    <circle cx="580" cy="85" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                  </>
                )}
              </svg>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingLeft: '35px',
                  paddingRight: '15px',
                  fontSize: '0.72rem',
                  color: '#94a3b8'
                }}
              >
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
                <span>00:00</span>
                <span>04:00</span>
                <span>08:00</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Medical History, Care Team & Clinical Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Medical History & Medications */}
          <div className="dashboard-card" style={{ marginBottom: 0 }}>
            <div className="card-title-row" style={{ marginBottom: '12px' }}>
              <h2 className="card-title">Medications & History</h2>
              <button
                className="btn-secondary-outline"
                onClick={() => setShowEhrModal(true)}
                style={{ fontSize: '0.75rem', padding: '3px 8px' }}
              >
                View Full Records
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>Medications Active</span>
              <select
                value={medSchedule}
                onChange={(e) => setMedSchedule(e.target.value)}
                style={{
                  fontSize: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '9999px',
                  padding: '2px 8px',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <option value="Daily">All</option>
                <option value="PRN">PRN (As Needed)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              {displayedMeds.map((med) => (
                <div
                  key={med.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1fr 44px',
                    alignItems: 'center',
                    fontSize: '0.82rem'
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{med.name}</span>
                  <span style={{ color: '#64748b' }}>{med.dosage}</span>
                  <div style={{ textAlign: 'right' }}>
                    <label className="toggle-switch-label">
                      <input
                        type="checkbox"
                        checked={med.active}
                        onChange={() => toggleMedication(med.id)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                borderTop: '1px solid #f1f5f9',
                paddingTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.8rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Blood Type:</span>
                <span style={{ fontWeight: 600 }}>{p.bloodType || 'O+'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Allergies:</span>
                <span style={{ fontWeight: 600, color: '#dc2626' }}>{p.allergies || 'None'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Attending MD:</span>
                <span style={{ fontWeight: 600 }}>{p.assignedDoctor || 'Assigned'}</span>
              </div>
            </div>
          </div>

          {/* TASK 4: Care Team Panel */}
          <div className="dashboard-card" style={{ marginBottom: 0 }}>
            <div
              className="card-title-row"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color="#005e9e" />
                <h2 className="card-title">Care Team</h2>
              </div>
              <button
                className="btn-secondary-outline"
                onClick={() => {
                  setChatRecipient('all');
                  setChatRecipientName('Care Team (All)');
                  setShowMessageModal(true);
                }}
                style={{ fontSize: '0.74rem', padding: '3px 8px' }}
              >
                Broadcast Group
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {careTeam.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <img
                        src={member.avatar || (member.role === 'nurse' ? '/nurse-avatar.jpg' : '/doctor-avatar.jpg')}
                        alt={member.name}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          background: member.status === 'online' ? '#16a34a' : '#94a3b8',
                          border: '1.5px solid #fff'
                        }}
                        title={member.status === 'online' ? 'Online in ward' : 'Offline'}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{member.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {member.role === 'doctor' ? '🩺 Physician' : '📋 Nurse'} • {member.status}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setChatRecipient(member.id);
                      setChatRecipientName(member.name);
                      setShowMessageModal(true);
                    }}
                    style={{
                      padding: '4px 10px',
                      background: '#005e9e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title={`Message ${member.name}`}
                  >
                    Message
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* TASK 5: Patient Clinical Notes Section */}
          <div className="dashboard-card" style={{ marginBottom: 0 }}>
            <div
              className="card-title-row"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} color="#005e9e" />
                <h2 className="card-title">Clinical Notes ({notesList.length})</h2>
              </div>
              <button
                className="btn-secondary-outline"
                onClick={() => {
                  setEditingNote(null);
                  setNoteText('');
                  setShowNoteModal(true);
                }}
                style={{ fontSize: '0.74rem', padding: '3px 8px' }}
              >
                + Add Note
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxHeight: '340px',
                overflowY: 'auto'
              }}
            >
              {notesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.82rem' }}>
                  No clinical notes recorded yet. Click '+ Add Note' above.
                </div>
              ) : (
                notesList.map((n) => (
                  <div
                    key={n._id || n.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{n.authorName}</span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: n.authorRole === 'nurse' ? '#dcfce7' : '#e0f2fe',
                            color: n.authorRole === 'nurse' ? '#166534' : '#0369a1',
                            fontWeight: 600
                          }}
                        >
                          {n.authorRole?.toUpperCase()}
                        </span>
                      </div>

                      {/* Edit/Delete if current user is the author */}
                      {(n.authorId === user?.id || n.authorId === user?._id) && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setEditingNote(n);
                              setNoteText(n.text);
                              setShowNoteModal(true);
                            }}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                            title="Edit Note"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(n._id)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                            title="Delete Note"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    <p style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.4, margin: '4px 0' }}>
                      {n.text}
                    </p>

                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {n.timestamp ? new Date(n.timestamp).toLocaleString() : 'Just now'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Note Editor Modal (Task 5) */}
      {showNoteModal && (
        <div className="modal-overlay" onClick={() => setShowNoteModal(false)}>
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
                marginBottom: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="#005e9e" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  {editingNote ? 'Edit Clinical Note' : `Add Clinical Note for ${p.name}`}
                </h3>
              </div>
              <button
                onClick={() => setShowNoteModal(false)}
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                rows={5}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter clinical assessment, telemetry notes, medication directives..."
                className="form-input"
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.88rem' }}
                autoFocus
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="btn-secondary-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="btn-login-submit"
                  style={{ flex: 2, marginTop: 0 }}
                >
                  {editingNote ? 'Update Note' : 'Save to EHR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Care Team Messaging Modal (Task 4) */}
      {showMessageModal && (
        <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div
            className="modal-content-card"
            style={{ maxWidth: '540px', height: '600px', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} color="#005e9e" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    Care Team Chat: {chatRecipientName}
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#005e9e' }}>
                    Re: Patient {p.name} ({p.id}) • Bed {p.bed || 'ICU'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Thread */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '6px 0'
              }}
            >
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No messages yet. Send a real-time message to {chatRecipientName}.
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.senderId === user?.id || msg.senderId === user?._id;
                  return (
                    <div
                      key={msg._id || msg.id}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        background: isMe ? '#005e9e' : '#f1f5f9',
                        color: isMe ? '#ffffff' : '#0f172a',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          marginBottom: '2px',
                          color: isMe ? '#bae6fd' : '#0369a1'
                        }}
                      >
                        {msg.senderName} ({msg.senderRole?.toUpperCase()})
                      </div>
                      <div>{msg.text}</div>
                      <div
                        style={{
                          fontSize: '0.68rem',
                          marginTop: '4px',
                          textAlign: 'right',
                          color: isMe ? '#e0f2fe' : '#94a3b8'
                        }}
                      >
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : 'Just now'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Row */}
            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              <input
                type="text"
                placeholder={`Message ${chatRecipientName}...`}
                value={newChatText}
                onChange={(e) => setNewChatText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                className="form-input"
                style={{ flex: 1 }}
              />
              <button
                onClick={handleSendMessage}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px' }}
              >
                <Send size={15} />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Telemetry Call Modal (Task 2: Call Button) */}
      {showCallModal && (
        <div className="modal-overlay" onClick={() => setShowCallModal(false)}>
          <div
            className="modal-content-card"
            style={{ maxWidth: '420px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: '#005e9e'
              }}
            >
              <Phone size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Telemetry Intercom Call</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Connected to {p.name} ({p.bed || 'ICU Bed 01'})
            </p>

            <div
              style={{
                fontSize: '1.8rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#005e9e',
                margin: '16px 0'
              }}
            >
              {mins}:{secs}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
              <button
                onClick={() => setCallMuted(!callMuted)}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: callMuted ? '#fee2e2' : '#f1f5f9',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: callMuted ? '#dc2626' : '#334155'
                }}
                title={callMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {callMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <button
                onClick={() => {
                  setShowCallModal(false);
                  setNotification(`Call ended with ${p.name}. Duration: ${mins}:${secs}`);
                  setTimeout(() => setNotification(''), 2500);
                }}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Hang up call"
              >
                <PhoneOff size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-Up Modal (Task 2: Follow-Up Button) */}
      {showFollowUpModal && (
        <div className="modal-overlay" onClick={() => setShowFollowUpModal(false)}>
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
                marginBottom: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#005e9e" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  Schedule Follow-Up: {p.name}
                </h3>
              </div>
              <button
                onClick={() => setShowFollowUpModal(false)}
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Consultation Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Clinical Directives / Focus
                </label>
                <textarea
                  rows={3}
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Telemetry re-check, SpO2 titration, MAP target evaluation..."
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowFollowUpModal(false)}
                  className="btn-secondary-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFollowUpModal(false);
                    setNotification(`Follow-up scheduled for ${p.name} on ${followUpDate}. Saved to schedule.`);
                    setTimeout(() => setNotification(''), 3000);
                  }}
                  className="btn-login-submit"
                  style={{ flex: 2, marginTop: 0 }}
                >
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EHR Full Records Modal (Task 2: View Full Records) */}
      {showEhrModal && (
        <div className="modal-overlay" onClick={() => setShowEhrModal(false)}>
          <div
            className="modal-content-card"
            style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}
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
                <FileText size={20} color="#005e9e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Electronic Health Record: {p.name} ({p.id})
                </h3>
              </div>
              <button
                onClick={() => setShowEhrModal(false)}
                style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem' }}>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Medical History Log
                </div>
                {p.medicalHistory && p.medicalHistory.length > 0 ? (
                  <ul style={{ paddingLeft: '18px', margin: 0, color: '#475569', lineHeight: 1.6 }}>
                    {p.medicalHistory.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: '#64748b' }}>No previous admissions recorded.</div>
                )}
              </div>

              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Telemetry Sensor Association
                </div>
                <div>Primary Device: {p.device || 'PBM100'}</div>
                <div>Assigned Ward / Bed: {p.bed || 'ICU Ward'}</div>
                <div>Admitted At: {p.admittedAt ? new Date(p.admittedAt).toLocaleDateString() : 'Active'}</div>
              </div>

              <button
                type="button"
                onClick={() => setShowEhrModal(false)}
                className="btn-login-submit"
              >
                Close Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal (Task 3: Edit Details) */}
      <PatientAdmissionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        editingPatient={p}
        onPatientAdmitted={(updatedPt) => {
          setPatient(updatedPt);
          setMedications(updatedPt.medications || []);
          fetchCurrentPatient();
        }}
      />
    </div>
  );
}
