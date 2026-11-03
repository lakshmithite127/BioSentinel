import React, { useState, useRef, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, UserPlus, Edit3, Activity } from 'lucide-react';
import { api } from '../api/client';

export default function PatientAdmissionModal({
  isOpen,
  onClose,
  onPatientAdmitted,
  editingPatient = null
}) {
  const nameInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    condition: '',
    bed: 'Ward Bed 01',
    bloodType: 'O+',
    allergies: 'None reported',
    assignedDoctor: 'Dr. Alexander Wright, MD',
    assignedDevices: 'PBM100',
    initialMedication: 'Maintenance Hydration IV 50ml/hr',
    systolic: '120',
    diastolic: '80',
    heartRate: '72',
    spo2: '98'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Populate form if editing
  useEffect(() => {
    if (isOpen) {
      setSuccessMessage('');
      setErrors({});

      if (editingPatient) {
        setFormData({
          name: editingPatient.name || '',
          age: editingPatient.age?.toString() || '',
          gender: editingPatient.gender || 'Male',
          condition: editingPatient.condition || '',
          bed: editingPatient.bed || 'Ward Bed 01',
          bloodType: editingPatient.bloodType || 'O+',
          allergies: editingPatient.allergies || 'None reported',
          assignedDoctor: editingPatient.assignedDoctor || 'Dr. Alexander Wright, MD',
          assignedDevices: Array.isArray(editingPatient.assignedDevices)
            ? editingPatient.assignedDevices.join(', ')
            : editingPatient.device || 'PBM100',
          initialMedication: editingPatient.medications?.[0]?.name || '',
          systolic: editingPatient.systolic?.toString() || '120',
          diastolic: editingPatient.diastolic?.toString() || '80',
          heartRate: editingPatient.heartRate?.toString() || '72',
          spo2: editingPatient.spo2?.toString() || '98'
        });
      } else {
        setFormData({
          name: '',
          age: '',
          gender: 'Male',
          condition: '',
          bed: 'Ward Bed 01',
          bloodType: 'O+',
          allergies: 'None reported',
          assignedDoctor: 'Dr. Alexander Wright, MD',
          assignedDevices: `PBM${Math.floor(100 + Math.random() * 899)}`,
          initialMedication: 'Maintenance Hydration IV 50ml/hr',
          systolic: '120',
          diastolic: '80',
          heartRate: '72',
          spo2: '98'
        });
      }

      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, editingPatient]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Patient full name is required.';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Patient name must be at least 3 characters.';
    }

    const ageNum = parseInt(formData.age, 10);
    if (!formData.age) {
      newErrors.age = 'Age is required.';
    } else if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      newErrors.age = 'Age must be between 1 and 120.';
    }

    if (!formData.condition.trim()) {
      newErrors.condition = 'Medical diagnosis / condition is required.';
    }

    if (!formData.bed.trim()) {
      newErrors.bed = 'Assigned ward/bed is required.';
    }

    const sys = parseInt(formData.systolic, 10);
    const dia = parseInt(formData.diastolic, 10);
    if (isNaN(sys) || sys < 50 || sys > 250) {
      newErrors.systolic = 'Systolic BP must be 50-250 mmHg.';
    }
    if (isNaN(dia) || dia < 30 || dia > 150) {
      newErrors.diastolic = 'Diastolic BP must be 30-150 mmHg.';
    }

    const hr = parseInt(formData.heartRate, 10);
    if (isNaN(hr) || hr < 30 || hr > 220) {
      newErrors.heartRate = 'Heart rate must be 30-220 bpm.';
    }

    const oxy = parseInt(formData.spo2, 10);
    if (isNaN(oxy) || oxy < 50 || oxy > 100) {
      newErrors.spo2 = 'SpO2 must be between 50% and 100%.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        condition: formData.condition.trim(),
        bed: formData.bed.trim(),
        bloodType: formData.bloodType,
        allergies: formData.allergies.trim(),
        assignedDoctor: formData.assignedDoctor,
        assignedDevices: formData.assignedDevices
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean),
        initialMedication: formData.initialMedication.trim(),
        systolic: parseInt(formData.systolic, 10),
        diastolic: parseInt(formData.diastolic, 10),
        heartRate: parseInt(formData.heartRate, 10),
        spo2: parseInt(formData.spo2, 10)
      };

      let resultPatient = null;
      if (editingPatient) {
        const res = await api.updatePatient(editingPatient.id, payload);
        resultPatient = res.patient;
        setSuccessMessage(`Patient ${formData.name} updated successfully!`);
      } else {
        const res = await api.createPatient(payload);
        resultPatient = res.patient;
        setSuccessMessage(
          `Patient ${formData.name} admitted successfully! Assigned ID: ${resultPatient.id}`
        );
      }

      if (onPatientAdmitted) {
        onPatientAdmitted(resultPatient);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content-card"
        style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
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
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#005e9e'
              }}
            >
              {editingPatient ? <Edit3 size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {editingPatient ? 'Edit Patient Details' : 'Admit New Patient'}
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                {editingPatient
                  ? `Editing medical telemetry profile for ${editingPatient.id}`
                  : 'Saves directly to MongoDB with continuous telemetry initialization'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#94a3b8', padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div
            style={{
              padding: '12px 16px',
              background: '#dcfce7',
              border: '1px solid #86efac',
              borderRadius: '10px',
              color: '#166534',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.88rem'
            }}
          >
            <CheckCircle size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errors.form && (
          <div
            style={{
              padding: '12px 16px',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '10px',
              color: '#991b1b',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.88rem'
            }}
          >
            <AlertTriangle size={18} />
            <span>{errors.form}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {/* Patient Full Name */}
          <div className="form-group">
            <label className="form-label">
              <span>Full Name *</span>
              {errors.name && <span className="form-error-msg">{errors.name}</span>}
            </label>
            <input
              ref={nameInputRef}
              type="text"
              name="name"
              placeholder="e.g. John Pork, Jane Doe"
              value={formData.name}
              onChange={handleChange}
              className={`form-input ${errors.name ? 'error' : ''}`}
            />
          </div>

          {/* Age, Gender & Blood Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">
                <span>Age (1–120) *</span>
                {errors.age && <span className="form-error-msg">{errors.age}</span>}
              </label>
              <input
                type="number"
                name="age"
                placeholder="45"
                min="1"
                max="120"
                value={formData.age}
                onChange={handleChange}
                className={`form-input ${errors.age ? 'error' : ''}`}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="form-input"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Blood Type</label>
              <select
                name="bloodType"
                value={formData.bloodType}
                onChange={handleChange}
                className="form-input"
              >
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          {/* Diagnosis / Primary Condition */}
          <div className="form-group">
            <label className="form-label">
              <span>Primary Condition / Diagnosis *</span>
              {errors.condition && <span className="form-error-msg">{errors.condition}</span>}
            </label>
            <input
              type="text"
              name="condition"
              placeholder="e.g. Hypertension, COPD, Severe Arrhythmia, Post-Operative Recovery"
              value={formData.condition}
              onChange={handleChange}
              className={`form-input ${errors.condition ? 'error' : ''}`}
            />
          </div>

          {/* Bed/Ward, Assigned Doctor & Devices */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">
                <span>Ward / Bed Location *</span>
                {errors.bed && <span className="form-error-msg">{errors.bed}</span>}
              </label>
              <input
                type="text"
                name="bed"
                placeholder="e.g. ICU Bed 02, Ward Bed 08"
                value={formData.bed}
                onChange={handleChange}
                className={`form-input ${errors.bed ? 'error' : ''}`}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Attending Doctor</label>
              <select
                name="assignedDoctor"
                value={formData.assignedDoctor}
                onChange={handleChange}
                className="form-input"
              >
                <option value="Dr. Alexander Wright, MD">Dr. Alexander Wright, MD (Cardiology)</option>
                <option value="Dr. Sarah Connor, MD">Dr. Sarah Connor, MD (Pulmonary / ICU)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Assigned Telemetry Devices</label>
              <input
                type="text"
                name="assignedDevices"
                placeholder="e.g. PBM101, PBM102"
                value={formData.assignedDevices}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Allergies</label>
              <input
                type="text"
                name="allergies"
                placeholder="e.g. Penicillin, Sulfa drugs, None"
                value={formData.allergies}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Initial Medication</label>
            <input
              type="text"
              name="initialMedication"
              placeholder="e.g. Carvedilol 25mg, Albuterol Inhaler, IV Hydration"
              value={formData.initialMedication}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          {/* Initial Vitals Grid */}
          <div
            style={{
              background: '#f8fafc',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              marginTop: '6px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '10px'
              }}
            >
              <Activity size={16} color="#005e9e" />
              <span>Initial Telemetry Vitals</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Systolic (mmHg)</label>
                <input
                  type="number"
                  name="systolic"
                  value={formData.systolic}
                  onChange={handleChange}
                  className="form-input"
                  style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Diastolic (mmHg)</label>
                <input
                  type="number"
                  name="diastolic"
                  value={formData.diastolic}
                  onChange={handleChange}
                  className="form-input"
                  style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Heart Rate (bpm)</label>
                <input
                  type="number"
                  name="heartRate"
                  value={formData.heartRate}
                  onChange={handleChange}
                  className="form-input"
                  style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>SpO2 (%)</label>
                <input
                  type="number"
                  name="spo2"
                  value={formData.spo2}
                  onChange={handleChange}
                  className="form-input"
                  style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary-outline"
              style={{ flex: 1, padding: '10px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-login-submit"
              style={{ flex: 2, padding: '10px', marginTop: 0 }}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving to MongoDB...'
                : editingPatient
                ? 'Save Patient Changes'
                : 'Confirm Admission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
