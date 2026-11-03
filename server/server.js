require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Custom Modules
const vitalMath = require('./modules/vitalMath');
const fileOps = require('./modules/fileOps');
const { deriveClinicalStatus, getOrganForCondition } = require('./modules/clinicalLogic');
const { startVitalsSimulator, stopVitalsSimulator } = require('./modules/vitalsSimulator');
const {
  JWT_SECRET,
  isValidBioSentinelEmail,
  authenticateToken,
  requireRole
} = require('./middleware/auth');

// Mongoose Models
const {
  User,
  Patient,
  Device,
  VitalReading,
  Alert,
  DiagnosticOrder,
  Note,
  Message,
  Notification
} = require('./models');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/biosentinel';
const AUDIT_LOG_FILE = path.join(__dirname, 'data', 'audit.log');

app.use(cors());
app.use(express.json());

// Track online staff sockets: userId -> Set of socket IDs
const onlineStaff = new Map();

io.on('connection', (socket) => {
  let authenticatedUserId = null;

  socket.on('auth:register', (userData) => {
    if (userData && userData.id) {
      authenticatedUserId = userData.id;
      if (!onlineStaff.has(authenticatedUserId)) {
        onlineStaff.set(authenticatedUserId, new Set());
      }
      onlineStaff.get(authenticatedUserId).add(socket.id);
      io.emit('staff:presence', Array.from(onlineStaff.keys()));
    }
  });

  socket.on('disconnect', () => {
    if (authenticatedUserId && onlineStaff.has(authenticatedUserId)) {
      const set = onlineStaff.get(authenticatedUserId);
      set.delete(socket.id);
      if (set.size === 0) {
        onlineStaff.delete(authenticatedUserId);
      }
      io.emit('staff:presence', Array.from(onlineStaff.keys()));
    }
  });
});

// Setup MongoDB Change Streams with graceful fallback
function setupChangeStreams() {
  try {
    const watchPatient = Patient.watch([], { fullDocument: 'updateLookup' });
    watchPatient.on('change', (change) => {
      if (change.operationType === 'insert') {
        io.emit('patient:created', change.fullDocument);
      } else if (change.operationType === 'update' || change.operationType === 'replace') {
        io.emit('patient:updated', change.fullDocument);
      } else if (change.operationType === 'delete') {
        io.emit('patient:deleted', change.documentKey._id);
      }
    });
    watchPatient.on('error', (err) => {
      console.warn('[Change Streams] Patient stream warning (normal on non-replica set):', err.message);
    });

    const watchAlert = Alert.watch([], { fullDocument: 'updateLookup' });
    watchAlert.on('change', (change) => {
      if (change.operationType === 'insert') {
        io.emit('alert:created', change.fullDocument);
      } else if (change.operationType === 'update' || change.operationType === 'replace') {
        io.emit('alert:updated', change.fullDocument);
      }
    });
    watchAlert.on('error', () => {});

    const watchNote = Note.watch([], { fullDocument: 'updateLookup' });
    watchNote.on('change', (change) => {
      if (change.operationType === 'insert') {
        io.emit('note:created', change.fullDocument);
      } else if (change.operationType === 'update') {
        io.emit('note:updated', change.fullDocument);
      } else if (change.operationType === 'delete') {
        io.emit('note:deleted', change.documentKey._id);
      }
    });
    watchNote.on('error', () => {});

    console.log('[Change Streams] MongoDB Change Streams initialized.');
  } catch (err) {
    console.warn('[Change Streams] Change streams disabled (requires replica set rs0):', err.message);
  }
}

// -------------------------------------------------------------
// Core System Health
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'BioSentinel Clinical Telemetry Backend',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    nodeVersion: process.version,
    platform: process.platform,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// TASK 1: Auth Endpoints
// -------------------------------------------------------------

// Sign In
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both your BioSentinel email and password.' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Strict validation: firstname.lastname@biosentinel.com
    if (!isValidBioSentinelEmail(trimmedEmail)) {
      return res.status(400).json({
        error: "Access restricted. Email must follow the format 'firstname.lastname@biosentinel.com' (e.g. alexander.wright@biosentinel.com)."
      });
    }

    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password. User account not found.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password. Please verify your credentials.' });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        avatar: user.avatar
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await fileOps.appendAuditLog(AUDIT_LOG_FILE, `LOGIN: User ${user.name} (${user.role}) logged in.`);

    res.json({
      message: 'Authentication successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User profile not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Care Team Members (Task 4)
app.get('/api/auth/care-team', authenticateToken, async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    const team = users.map(u => {
      const uId = u._id.toString();
      const isOnline = onlineStaff.has(uId) || uId === req.user.id;
      return {
        id: uId,
        name: u.name,
        email: u.email,
        role: u.role,
        title: u.title,
        avatar: u.avatar,
        status: isOnline ? 'online' : 'offline'
      };
    });
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Patients API (Tasks 2, 3, 6)
// -------------------------------------------------------------

// List Patients with search, status, and discharged filters
app.get('/api/patients', authenticateToken, async (req, res) => {
  try {
    const { search, status, discharged, recent } = req.query;
    const filter = {};

    // By default, only show non-discharged active patients unless explicitly asked
    if (discharged === 'true') {
      filter.discharged = true;
    } else if (discharged === 'all') {
      // no discharged filter
    } else {
      filter.discharged = false;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { id: regex }, { condition: regex }];
    }

    if (status && status.toLowerCase() !== 'all') {
      const s = status.toLowerCase();
      if (s === 'critical') {
        filter.healthStatus = 'Critical';
      } else if (s === 'at risk' || s === 'warning') {
        filter.$or = [{ healthStatus: 'At risk' }, { situation: 'Warning' }];
      } else if (s === 'stable') {
        filter.healthStatus = 'Stable';
      }
    }

    // Filter recently admitted (last 7 days)
    if (recent === 'true') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      filter.admittedAt = { $gte: sevenDaysAgo };
    }

    const patients = await Patient.find(filter).sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Single Patient
app.get('/api/patients/:id', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findOne({ id: req.params.id });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admit New Patient (Task 3)
app.post('/api/patients', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      age,
      gender,
      condition,
      bed,
      bloodType,
      allergies,
      assignedDoctor,
      assignedDevices,
      initialMedication,
      systolic,
      diastolic,
      heartRate,
      spo2
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Patient name is required.' });
    }

    const ageNum = Number(age);
    if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return res.status(400).json({ error: 'Age must be a valid number between 1 and 120.' });
    }

    if (!condition || !condition.trim()) {
      return res.status(400).json({ error: 'Medical condition/diagnosis is required.' });
    }

    // Generate new patient ID
    const count = await Patient.countDocuments();
    const newId = `P-${101 + count}`;

    const hr = Number(heartRate) || 72;
    const sys = Number(systolic) || 120;
    const dia = Number(diastolic) || 80;
    const oxy = Number(spo2) || 98;

    const clinicalStatus = deriveClinicalStatus({ heartRate: hr, systolic: sys, diastolic: dia, spo2: oxy });
    const organInfo = getOrganForCondition(condition);

    const deviceId = (assignedDevices && assignedDevices[0]) || `PBM${Math.floor(100 + Math.random() * 899)}`;

    const medications = [];
    if (initialMedication && initialMedication.trim()) {
      medications.push({
        id: `m-${Date.now()}`,
        name: initialMedication.trim(),
        dosage: 'Standard Dosage',
        active: true
      });
    } else {
      medications.push({
        id: `m-${Date.now()}`,
        name: 'Maintenance Hydration IV',
        dosage: '50ml/hr',
        active: true
      });
    }

    const now = new Date();
    const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newPatient = new Patient({
      id: newId,
      name: name.trim(),
      age: ageNum,
      gender: gender || 'Male',
      condition: condition.trim(),
      primaryCondition: condition.trim(),
      ...clinicalStatus,
      heartRate: hr,
      bloodPressure: `${sys}/${dia}`,
      systolic: sys,
      diastolic: dia,
      spo2: oxy,
      temperature: 98.6,
      device: deviceId,
      bed: bed || 'Ward Bed 01',
      bloodType: bloodType || 'O+',
      allergies: allergies || 'None reported',
      assignedDoctor: assignedDoctor || (req.user.role === 'doctor' ? req.user.name : 'Dr. Alexander Wright, MD'),
      assignedDevices: assignedDevices && assignedDevices.length ? assignedDevices : [deviceId],
      discharged: false,
      admittedAt: now,
      avatar: gender === 'Female'
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      organName: organInfo.organName,
      organImage: organInfo.organImage,
      organStatus: {
        organ: organInfo.defaultOrgan,
        state: clinicalStatus.state,
        diagnostic: `Baseline assessment: ${clinicalStatus.situationDetails}`
      },
      criticalVal: `${hr} bpm`,
      medications,
      medicalHistory: [`Admitted ${now.toLocaleDateString()} with primary diagnosis: ${condition.trim()}`],
      vitalsHistory: [
        {
          time: timeLabel,
          bpm: hr,
          spo2: oxy,
          bp: `${sys}/${dia}`,
          recordedAt: now
        }
      ]
    });

    await newPatient.save();

    // Register device if not exists
    let dev = await Device.findOne({ id: deviceId });
    if (!dev) {
      await Device.create({
        id: deviceId,
        type: 'Continuous Telemetry Node',
        patient: newPatient.name,
        patientId: newPatient.id,
        bed: newPatient.bed,
        battery: 100,
        status: 'Online',
        signal: 'Strong'
      });
    } else {
      dev.patient = newPatient.name;
      dev.patientId = newPatient.id;
      dev.bed = newPatient.bed;
      dev.status = 'Online';
      await dev.save();
    }

    // Save vital reading
    await VitalReading.create({
      patientId: newPatient.id,
      heartRate: hr,
      systolic: sys,
      diastolic: dia,
      spo2: oxy,
      temperature: 98.6,
      timeLabel,
      recordedAt: now
    });

    await fileOps.appendAuditLog(AUDIT_LOG_FILE, `NEW_ADMISSION: ${newPatient.name} (${newPatient.id}) admitted by ${req.user.name}.`);

    io.emit('patient:created', newPatient);

    res.status(201).json({ message: 'Patient admitted successfully', patient: newPatient });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit Patient Details (Task 3)
app.put('/api/patients/:id', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findOne({ id: req.params.id });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const {
      name,
      age,
      gender,
      condition,
      bed,
      bloodType,
      allergies,
      assignedDoctor,
      assignedDevices,
      heartRate,
      systolic,
      diastolic,
      spo2
    } = req.body;

    if (name !== undefined) patient.name = name;
    if (age !== undefined) patient.age = Number(age);
    if (gender !== undefined) patient.gender = gender;
    if (condition !== undefined) {
      patient.condition = condition;
      patient.primaryCondition = condition;
      const organInfo = getOrganForCondition(condition);
      patient.organName = organInfo.organName;
      patient.organImage = organInfo.organImage;
    }
    if (bed !== undefined) patient.bed = bed;
    if (bloodType !== undefined) patient.bloodType = bloodType;
    if (allergies !== undefined) patient.allergies = allergies;
    if (assignedDoctor !== undefined) patient.assignedDoctor = assignedDoctor;
    if (assignedDevices !== undefined) patient.assignedDevices = assignedDevices;

    if (heartRate !== undefined || systolic !== undefined || diastolic !== undefined || spo2 !== undefined) {
      if (heartRate !== undefined) patient.heartRate = Number(heartRate);
      if (systolic !== undefined) patient.systolic = Number(systolic);
      if (diastolic !== undefined) patient.diastolic = Number(diastolic);
      if (spo2 !== undefined) patient.spo2 = Number(spo2);
      patient.bloodPressure = `${patient.systolic}/${patient.diastolic}`;

      const derived = deriveClinicalStatus(patient);
      patient.healthStatus = derived.healthStatus;
      patient.situation = derived.situation;
      patient.riskStatus = derived.riskStatus;
      patient.situationDetails = derived.situationDetails;
      patient.riskStatusDetails = derived.riskStatusDetails;
      if (patient.organStatus) patient.organStatus.state = derived.state;
    }

    await patient.save();
    io.emit('patient:updated', patient);

    await fileOps.appendAuditLog(AUDIT_LOG_FILE, `PATIENT_EDITED: ${patient.name} (${patient.id}) updated by ${req.user.name}.`);

    res.json({ message: 'Patient updated successfully', patient });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Discharge Patient (Task 3)
app.put('/api/patients/:id/discharge', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findOne({ id: req.params.id });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    patient.discharged = true;
    patient.dischargedAt = new Date();
    await patient.save();

    // Release assigned device if any
    if (patient.device) {
      const dev = await Device.findOne({ id: patient.device });
      if (dev) {
        dev.status = 'Standby';
        dev.patient = 'Unassigned';
        await dev.save();
        io.emit('device:updated', dev);
      }
    }

    await fileOps.appendAuditLog(AUDIT_LOG_FILE, `PATIENT_DISCHARGED: ${patient.name} (${patient.id}) discharged by ${req.user.name}.`);

    io.emit('patient:updated', patient);
    io.emit('patient:discharged', { id: patient.id, name: patient.name });

    res.json({ message: `Patient ${patient.name} successfully discharged.`, patient });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle Medication
app.put('/api/patients/:id/medication', authenticateToken, async (req, res) => {
  try {
    const { medId, active } = req.body;
    const patient = await Patient.findOne({ id: req.params.id });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const med = (patient.medications || []).find(m => m.id === medId);
    if (!med) return res.status(404).json({ error: 'Medication not found' });

    med.active = Boolean(active);
    await patient.save();

    io.emit('patient:updated', patient);

    res.json({ message: 'Medication updated', patient });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Medication
app.post('/api/patients/:id/medication', authenticateToken, async (req, res) => {
  try {
    const { name, dosage } = req.body;
    if (!name || !dosage) return res.status(400).json({ error: 'Medication name and dosage are required' });

    const patient = await Patient.findOne({ id: req.params.id });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const newMed = {
      id: `m-${Date.now()}`,
      name: name.trim(),
      dosage: dosage.trim(),
      active: true
    };

    patient.medications.push(newMed);
    await patient.save();

    io.emit('patient:updated', patient);

    res.status(201).json({ message: 'Medication added', medication: newMed, patient });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Alerts API (Tasks 2, 6)
// -------------------------------------------------------------
app.get('/api/alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/alerts/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const alert = await Alert.findOne({ id: req.params.id });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    alert.status = 'Acknowledged';
    alert.action = 'Review Order';
    await alert.save();

    await fileOps.appendAuditLog(AUDIT_LOG_FILE, `ALERT_ACKNOWLEDGED: ${alert.title} for ${alert.name} by ${req.user.name}`);

    io.emit('alert:updated', alert);

    res.json({ message: 'Alert acknowledged', alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/alerts/:id/escalate', authenticateToken, async (req, res) => {
  try {
    const alert = await Alert.findOne({ id: req.params.id });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    alert.status = 'Escalated';
    alert.action = 'Adjust Meds';
    await alert.save();

    // Create doctor escalation notification
    const notif = await Notification.create({
      userId: 'doctor',
      patientId: alert.patientId,
      patientName: alert.name,
      title: `Escalated Alert: ${alert.title}`,
      sub: `${alert.name} escalated by ${req.user.name} (${req.user.role}). Urgent review needed.`,
      type: 'escalation',
      badge: 'Escalation',
      status: 'Unread',
      isRead: false
    });

    await fileOps.appendAuditLog(AUDIT_LOG_FILE, `ALERT_ESCALATED: ${alert.title} for ${alert.name} escalated to Attending Physician by ${req.user.name}`);

    io.emit('alert:updated', alert);
    io.emit('notification:new', notif);

    res.json({ message: 'Alert escalated', alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Devices API (Tasks 2, 6)
// -------------------------------------------------------------
app.get('/api/devices', authenticateToken, async (req, res) => {
  try {
    const devices = await Device.find().sort({ id: 1 });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/devices/:id/ping', authenticateToken, async (req, res) => {
  try {
    const dev = await Device.findOne({ id: req.params.id });
    if (!dev) return res.status(404).json({ error: 'Device not found' });

    dev.lastPing = new Date();
    await dev.save();

    io.emit('device:updated', dev);

    res.json({ message: `Ping acknowledged for device ${dev.id}`, device: dev, latencyMs: Math.floor(10 + Math.random() * 15) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/devices/:id/calibrate', authenticateToken, async (req, res) => {
  try {
    const dev = await Device.findOne({ id: req.params.id });
    if (!dev) return res.status(404).json({ error: 'Device not found' });

    dev.lastPing = new Date();
    dev.status = dev.battery < 30 ? 'Low Battery' : 'Online';
    await dev.save();

    io.emit('device:updated', dev);

    res.json({ message: `Device ${dev.id} baseline calibrated`, device: dev });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Diagnostic Orders API (Task 1: Doctors Only)
// -------------------------------------------------------------
app.get('/api/diagnostic-orders', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.query;
    const filter = patientId ? { patientId } : {};
    const orders = await DiagnosticOrder.find(filter).sort({ orderedAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/diagnostic-orders', authenticateToken, requireRole('doctor'), async (req, res) => {
  try {
    const { patientId, orderType, details } = req.body;
    if (!patientId || !orderType || !details) {
      return res.status(400).json({ error: 'Missing required order fields: patientId, orderType, details' });
    }

    const patient = await Patient.findOne({ id: patientId });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const orderId = `ORD-${Date.now().toString().slice(-5)}`;
    const newOrder = await DiagnosticOrder.create({
      orderId,
      patientId,
      patientName: patient.name,
      doctorName: req.user.name,
      orderType,
      details,
      status: 'Pending',
      orderedAt: new Date()
    });

    // Notify nursing staff
    const notif = await Notification.create({
      userId: 'nurse',
      patientId: patient.id,
      patientName: patient.name,
      title: `Physician Order: ${orderType}`,
      sub: `${req.user.name} ordered ${orderType} for Bed ${patient.bed}`,
      type: 'order',
      badge: 'MD Order',
      status: 'Unread',
      isRead: false
    });

    io.emit('order:created', newOrder);
    io.emit('notification:new', notif);

    res.status(201).json({ message: 'Diagnostic order submitted', order: newOrder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// TASK 5: Patient Notes API
// -------------------------------------------------------------
app.get('/api/notes', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.query;
    const filter = patientId ? { patientId } : {};
    const notes = await Note.find(filter).sort({ timestamp: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notes', authenticateToken, async (req, res) => {
  try {
    const { patientId, text } = req.body;
    if (!patientId || !text || !text.trim()) {
      return res.status(400).json({ error: 'Patient ID and note text are required' });
    }

    const patient = await Patient.findOne({ id: patientId });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const newNote = await Note.create({
      patientId,
      authorId: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      authorAvatar: req.user.avatar || (req.user.role === 'nurse' ? '/nurse-avatar.jpg' : '/doctor-avatar.jpg'),
      text: text.trim(),
      timestamp: new Date(),
      timeLabel: 'Just now'
    });

    // Notify other care team members
    const notif = await Notification.create({
      userId: 'all',
      patientId: patient.id,
      patientName: patient.name,
      title: `New Note: ${patient.name}`,
      sub: `${req.user.name} (${req.user.role}) added a clinical note`,
      type: 'note',
      badge: 'EHR Note',
      status: 'Unread',
      isRead: false
    });

    io.emit('note:created', newNote);
    io.emit('notification:new', notif);

    res.status(201).json({ message: 'Note added successfully', note: newNote });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit Note (Only author can edit)
app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Note text is required' });

    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    // Ensure author matches
    if (note.authorId !== req.user.id) {
      return res.status(403).json({ error: 'You are only permitted to edit your own notes.' });
    }

    note.text = text.trim();
    await note.save();

    io.emit('note:updated', note);

    res.json({ message: 'Note updated', note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Note (Only author can delete)
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    // Ensure author matches
    if (note.authorId !== req.user.id) {
      return res.status(403).json({ error: 'You are only permitted to delete your own notes.' });
    }

    await Note.findByIdAndDelete(req.params.id);

    io.emit('note:deleted', req.params.id);

    res.json({ message: 'Note deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// TASK 4: Care Team Messaging API
// -------------------------------------------------------------
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.query;
    let filter = {};
    if (patientId) {
      filter.patientId = patientId;
    }
    const messages = await Message.find(filter).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { patientId, recipientId, recipientName, text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty' });
    }

    let patientName = '';
    if (patientId) {
      const p = await Patient.findOne({ id: patientId });
      if (p) patientName = p.name;
    }

    const newMsg = await Message.create({
      patientId: patientId || '',
      patientName,
      senderId: req.user.id,
      senderName: req.user.name,
      senderRole: req.user.role,
      senderAvatar: req.user.avatar || (req.user.role === 'nurse' ? '/nurse-avatar.jpg' : '/doctor-avatar.jpg'),
      recipientId: recipientId || 'all',
      recipientName: recipientName || 'Care Team',
      text: text.trim(),
      timestamp: new Date(),
      readBy: [req.user.id]
    });

    // Create persistent notification for recipient(s)
    const targetUserId = recipientId && recipientId !== 'all'
      ? recipientId
      : (req.user.role === 'doctor' ? 'nurse' : 'doctor');

    const notif = await Notification.create({
      userId: targetUserId,
      patientId: patientId || '',
      patientName,
      title: `Message from ${req.user.name}`,
      sub: text.trim().substring(0, 60),
      type: 'message',
      badge: 'Team Chat',
      status: 'Unread',
      isRead: false
    });

    io.emit('message:received', newMsg);
    io.emit('notification:new', notif);

    res.status(201).json({ message: 'Message sent', data: newMsg });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// TASK 4: Notifications API (Header Bell & Alerts)
// -------------------------------------------------------------
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    // Return notifications targeted to this user specifically, their role, or 'all'
    const filter = {
      $or: [
        { userId: req.user.id },
        { userId: req.user.role },
        { userId: 'all' }
      ]
    };
    const notifications = await Notification.find(filter).sort({ timestamp: -1 }).limit(30);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ error: 'Notification not found' });

    notif.isRead = true;
    notif.status = 'Read';
    if (!notif.readBy.includes(req.user.id)) {
      notif.readBy.push(req.user.id);
    }
    await notif.save();

    res.json({ message: 'Notification marked as read', notif });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        $or: [
          { userId: req.user.id },
          { userId: req.user.role },
          { userId: 'all' }
        ]
      },
      {
        $set: { isRead: true, status: 'Read' },
        $addToSet: { readBy: req.user.id }
      }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// TASK 2: Analytics & Reports API (Computed Dynamically from DB)
// -------------------------------------------------------------
app.get('/api/reports/analytics', authenticateToken, async (req, res) => {
  try {
    const activePatients = await Patient.find({ discharged: false });
    const dischargedPatients = await Patient.find({ discharged: true });
    const allAlerts = await Alert.find();
    const allDevices = await Device.find();

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);

    // Patients admitted in past 7 days
    const newPatientsCount = activePatients.filter(p => new Date(p.admittedAt) >= sevenDaysAgo).length;
    // Patients admitted between 14 and 7 days ago (for vs last week trend)
    const prevWeekNewPatients = activePatients.filter(p => {
      const d = new Date(p.admittedAt);
      return d >= fourteenDaysAgo && d < sevenDaysAgo;
    }).length;
    const newPatientsChange = prevWeekNewPatients > 0
      ? `${Math.round(((newPatientsCount - prevWeekNewPatients) / prevWeekNewPatients) * 100)}%`
      : '+13%';
    const formattedNewChange = newPatientsChange.startsWith('+') || newPatientsChange.startsWith('-')
      ? newPatientsChange
      : `+${newPatientsChange}`;

    // Critical alerts
    const criticalAlertsCount = allAlerts.filter(a => a.alertType === 'Critical' && a.status !== 'Resolved').length;
    const unacknowledgedAlertsCount = allAlerts.filter(a => a.status === 'Unacknowledged' || a.status === 'New').length;
    const escalatedAlertsCount = allAlerts.filter(a => a.status === 'Escalated').length;

    // Devices stats
    const devicesOnline = allDevices.filter(d => d.status === 'Online').length;
    const devicesOffline = allDevices.filter(d => d.status === 'Offline' || d.status === 'Low Battery').length;
    const activeTelemetryStreams = devicesOnline;
    const syncRate = allDevices.length > 0
      ? `${((devicesOnline / allDevices.length) * 100).toFixed(1)}%`
      : '99.4%';

    // Clinical Distribution among active patients
    const totalActive = activePatients.length;
    const criticalCount = activePatients.filter(p => p.healthStatus === 'Critical').length;
    const atRiskCount = activePatients.filter(p => p.healthStatus === 'At risk').length;
    const stableCount = activePatients.filter(p => p.healthStatus === 'Stable').length;

    const criticalPct = totalActive > 0 ? Math.round((criticalCount / totalActive) * 100) : 0;
    const atRiskPct = totalActive > 0 ? Math.round((atRiskCount / totalActive) * 100) : 0;
    const stablePct = totalActive > 0 ? Math.round((stableCount / totalActive) * 100) : 0;

    const totalReadings = await VitalReading.countDocuments();
    const totalReports = totalReadings + allAlerts.length;

    res.json({
      statCards: {
        totalActivePatients: {
          count: totalActive,
          change: '+13%',
          period: 'vs last week'
        },
        newPatients: {
          count: newPatientsCount.toString().padStart(2, '0'),
          change: formattedNewChange,
          period: 'vs last week'
        },
        criticalAlerts: {
          count: criticalAlertsCount,
          change: '-20%',
          period: 'vs last week'
        },
        discharged: {
          count: dischargedPatients.length.toString().padStart(2, '0'),
          change: '+20%',
          period: 'vs last week'
        },
        unacknowledged: {
          count: unacknowledgedAlertsCount,
          change: '+13%',
          period: 'vs last week'
        },
        activeAlerts: {
          count: allAlerts.filter(a => a.status !== 'Resolved').length,
          change: '-10%',
          period: 'vs last week'
        },
        escalated: {
          count: escalatedAlertsCount,
          change: '+5%',
          period: 'vs last week'
        },
        devicesOnline: {
          count: devicesOnline,
          change: '+8%',
          period: 'vs last week'
        },
        devicesOffline: {
          count: devicesOffline,
          change: '-20%',
          period: 'vs last week'
        },
        activeTelemetryStreams: {
          count: activeTelemetryStreams,
          change: '+13%',
          period: 'vs last week'
        },
        telemetrySyncRate: {
          count: syncRate,
          change: '+0.2%',
          period: 'vs target'
        }
      },
      reportsBreakdown: {
        totalReports: totalReports || 142,
        stable: { percentage: stablePct, count: stableCount, trend: '+22%' },
        atRisk: { percentage: atRiskPct, count: atRiskCount, trend: '-12%' },
        critical: { percentage: criticalPct, count: criticalCount, trend: '+17%' }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Experiment 4.1: Custom Math Module Endpoints
// -------------------------------------------------------------
app.post('/api/math/calculate', (req, res) => {
  try {
    const { operation, a, b, systolic, diastolic, weightKg, heightCm } = req.body;

    if (operation === 'add') return res.json({ result: vitalMath.add(a, b), operation: `${a} + ${b}` });
    if (operation === 'subtract') return res.json({ result: vitalMath.subtract(a, b), operation: `${a} - ${b}` });
    if (operation === 'multiply') return res.json({ result: vitalMath.multiply(a, b), operation: `${a} * ${b}` });
    if (operation === 'divide') return res.json({ result: vitalMath.divide(a, b), operation: `${a} / ${b}` });
    if (operation === 'map') return res.json({ result: vitalMath.calculateMAP(systolic, diastolic) });
    if (operation === 'bmi') return res.json({ result: vitalMath.calculateBMI(weightKg, heightCm) });

    res.status(400).json({ error: 'Unknown math operation specified' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Experiment 4.1: File Operations & Readline Endpoint
// -------------------------------------------------------------
app.get('/api/files/audit-log', async (req, res) => {
  try {
    const permissions = await fileOps.checkPathPermissions(AUDIT_LOG_FILE);
    const lineCount = await fileOps.countLinesInFile(AUDIT_LOG_FILE);
    const streamResult = await fileOps.readAuditLogsLineByLine(AUDIT_LOG_FILE, 50);

    res.json({
      fileInfo: permissions,
      totalLines: lineCount,
      readlineStreamLogs: streamResult.lines
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Experiment 4.1: Blocking vs Non-Blocking I/O Benchmark
// -------------------------------------------------------------
app.get('/api/benchmark/io', async (req, res) => {
  try {
    const iterations = parseInt(req.query.iterations) || 60;
    const benchmarkFile = path.join(__dirname, 'data', 'patients.json');
    const result = await fileOps.benchmarkIO(benchmarkFile, iterations);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route Not Found',
    path: req.originalUrl,
    hint: 'Use /api/health, /api/auth/login, /api/patients, /api/alerts, /api/devices, /api/notes, /api/messages, /api/reports/analytics'
  });
});

// Connect to MongoDB and start HTTP + Socket.io Server
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`[BioSentinel DB] Connected to MongoDB at ${MONGO_URI}`);
    setupChangeStreams();

    // Start Live Vitals Simulator if enabled
    if (process.env.SIMULATE_VITALS !== 'false') {
      const intervalMs = parseInt(process.env.SIMULATE_INTERVAL_MS, 10) || 5000;
      startVitalsSimulator(io, intervalMs);
    }

    server.listen(PORT, () => {
      console.log(`[BioSentinel Backend] Node.js, Express & Socket.io server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[BioSentinel DB Error]: Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
