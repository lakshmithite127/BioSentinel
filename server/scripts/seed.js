require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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
} = require('../models');
const { deriveClinicalStatus, getOrganForCondition } = require('../modules/clinicalLogic');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/biosentinel';
const isReset = process.argv.includes('--reset');

async function seed() {
  console.log('====================================================');
  console.log(`[BioSentinel Seeder] Connecting to MongoDB: ${MONGO_URI}`);
  console.log('====================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✓ MongoDB Connected Successfully.');

  const existingPatients = await Patient.countDocuments();
  const existingUsers = await User.countDocuments();

  if (!isReset && (existingPatients > 0 || existingUsers > 0)) {
    console.log(`\nDatabase already contains data (${existingUsers} users, ${existingPatients} patients).`);
    console.log('To prevent overwriting your edits, seeding was skipped.');
    console.log('Run "npm run seed:reset" if you want a complete wipe and fresh reseed.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (isReset) {
    console.log('\n[seed:reset] Clearing all BioSentinel collections...');
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Device.deleteMany({}),
      VitalReading.deleteMany({}),
      Alert.deleteMany({}),
      DiagnosticOrder.deleteMany({}),
      Note.deleteMany({}),
      Message.deleteMany({}),
      Notification.deleteMany({})
    ]);
    console.log('✓ All collections cleared.');
  }

  // 1. Seed Users (2 Doctors, 2 Nurses)
  console.log('\n--> Seeding Clinical Staff Users (Task 1)...');
  const commonPassword = 'Password@2026';
  const passwordHash = await bcrypt.hash(commonPassword, 10);

  const seedUsers = [
    {
      name: 'Dr. Alexander Wright, MD',
      email: 'alexander.wright@biosentinel.com',
      passwordHash,
      role: 'doctor',
      title: 'Attending Cardiologist',
      avatar: '/doctor-avatar.jpg'
    },
    {
      name: 'Dr. Sarah Connor, MD',
      email: 'sarah.connor@biosentinel.com',
      passwordHash,
      role: 'doctor',
      title: 'Pulmonary & Critical Care Specialist',
      avatar: '/doctor-avatar.jpg'
    },
    {
      name: 'Nurse Elena Rostova, RN',
      email: 'elena.rostova@biosentinel.com',
      passwordHash,
      role: 'nurse',
      title: 'Lead Telemetry Nurse',
      avatar: '/nurse-avatar.jpg'
    },
    {
      name: 'Nurse Marcus Vance, RN',
      email: 'marcus.vance@biosentinel.com',
      passwordHash,
      role: 'nurse',
      title: 'ICU Telemetry Specialist',
      avatar: '/nurse-avatar.jpg'
    }
  ];

  const createdUsers = await User.insertMany(seedUsers);
  console.log(`✓ Inserted ${createdUsers.length} staff user accounts.`);

  // 2. Seed Devices
  console.log('\n--> Seeding Telemetry Devices...');
  const seedDevices = [
    {
      id: 'PBM101',
      type: 'Continuous ECG & BP Telemetry Monitor',
      patient: 'Jane Doe',
      patientId: 'P-101',
      bed: 'ICU Bed 01',
      battery: 88,
      status: 'Online',
      signal: 'Strong',
      lastPing: new Date()
    },
    {
      id: 'PBM102',
      type: 'Continuous SpO2 & Respiratory Flow Unit',
      patient: 'Roger Lewis',
      patientId: 'P-102',
      bed: 'Step-Down Ward 04',
      battery: 62,
      status: 'Online',
      signal: 'Good',
      lastPing: new Date()
    },
    {
      id: 'PBM103',
      type: 'Multi-Parameter Telemetry Hub',
      patient: 'Sarah Jenkins',
      patientId: 'P-103',
      bed: 'Ward Bed 08',
      battery: 95,
      status: 'Online',
      signal: 'Strong',
      lastPing: new Date()
    },
    {
      id: 'PBM556',
      type: 'Cardiac Holter Transmitter',
      patient: 'Standby Device',
      patientId: '',
      bed: 'Biomed Cart 2',
      battery: 22, // Low battery < 30% for nurse tracking
      status: 'Low Battery',
      signal: 'Weak',
      lastPing: new Date(Date.now() - 3600000)
    },
    {
      id: 'PBM901',
      type: 'Arterial Line Monitor',
      patient: 'Maintenance',
      patientId: '',
      bed: 'Biomed Tech Station',
      battery: 0,
      status: 'Offline',
      signal: 'None',
      lastPing: new Date(Date.now() - 7200000)
    }
  ];

  await Device.insertMany(seedDevices);
  console.log(`✓ Inserted ${seedDevices.length} hardware telemetry devices.`);

  // 3. Seed Exactly 3 Patients (1 Critical, 1 At-Risk, 1 Stable)
  console.log('\n--> Seeding Exactly 3 Patients (1 Critical, 1 At-Risk, 1 Stable)...');

  // Patient 1: Critical (Jane Doe - Severe Arrhythmia & Hypertensive Crisis)
  const p1Vitals = { heartRate: 118, systolic: 180, diastolic: 110, spo2: 88 };
  const p1Status = deriveClinicalStatus(p1Vitals);
  const p1Organ = getOrganForCondition('Arrhythmia & Hypertensive Crisis');

  const p1 = {
    id: 'P-101',
    name: 'Jane Doe',
    age: 42,
    gender: 'Female',
    condition: 'Severe Arrhythmia & Hypertensive Crisis',
    primaryCondition: 'Severe Arrhythmia & Hypertensive Crisis',
    ...p1Status,
    heartRate: p1Vitals.heartRate,
    bloodPressure: `${p1Vitals.systolic}/${p1Vitals.diastolic}`,
    systolic: p1Vitals.systolic,
    diastolic: p1Vitals.diastolic,
    spo2: p1Vitals.spo2,
    temperature: 99.1,
    device: 'PBM101',
    bed: 'ICU Bed 01',
    bloodType: 'A+',
    allergies: 'Sulfa drugs, Penicillin',
    assignedDoctor: 'Dr. Alexander Wright, MD',
    assignedDevices: ['PBM101'],
    discharged: false,
    admittedAt: new Date(Date.now() - 3 * 86400000), // admitted 3 days ago
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    organName: p1Organ.organName,
    organImage: p1Organ.organImage,
    organStatus: {
      organ: 'Myocardium',
      state: 'Critical',
      diagnostic: 'Vascular BP spike 180/110 & Supraventricular Arrhythmia'
    },
    criticalVal: '180/110 mm/Hg',
    medications: [
      { id: 'm-101', name: 'Carvedilol 25mg', dosage: '2 Pills Daily (Oral)', active: true },
      { id: 'm-102', name: 'Furosemide 40mg', dosage: '1 Pill Daily (Oral)', active: true },
      { id: 'm-103', name: 'Labetalol 20mg PRN', dosage: 'IV Push Q4H (Telemetry)', active: true }
    ],
    medicalHistory: [
      'Essential Hypertension diagnosed 2021',
      'Atrial Fibrillation episode post-viral illness 2024',
      'No previous coronary artery interventions'
    ],
    vitalsHistory: []
  };

  // Patient 2: At Risk (Roger Lewis - COPD Exacerbation)
  const p2Vitals = { heartRate: 84, systolic: 138, diastolic: 88, spo2: 92 };
  const p2Status = deriveClinicalStatus(p2Vitals);
  const p2Organ = getOrganForCondition('Chronic Obstructive Pulmonary Disease');

  const p2 = {
    id: 'P-102',
    name: 'Roger Lewis',
    age: 64,
    gender: 'Male',
    condition: 'Chronic Obstructive Pulmonary Disease (COPD Exacerbation)',
    primaryCondition: 'Chronic Obstructive Pulmonary Disease (COPD Exacerbation)',
    ...p2Status,
    heartRate: p2Vitals.heartRate,
    bloodPressure: `${p2Vitals.systolic}/${p2Vitals.diastolic}`,
    systolic: p2Vitals.systolic,
    diastolic: p2Vitals.diastolic,
    spo2: p2Vitals.spo2,
    temperature: 98.6,
    device: 'PBM102',
    bed: 'Step-Down Ward 04',
    bloodType: 'B-',
    allergies: 'Aspirin',
    assignedDoctor: 'Dr. Sarah Connor, MD',
    assignedDevices: ['PBM102'],
    discharged: false,
    admittedAt: new Date(Date.now() - 2 * 86400000), // admitted 2 days ago
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    organName: p2Organ.organName,
    organImage: p2Organ.organImage,
    organStatus: {
      organ: 'Bronchial Tree & Alveoli',
      state: 'Warning',
      diagnostic: 'Expiratory wheezing & SpO2 92% on 2L NC'
    },
    criticalVal: '92% SpO2',
    medications: [
      { id: 'm-201', name: 'Albuterol Sulfate Inhaler', dosage: '2 Puffs PRN Q4H', active: true },
      { id: 'm-202', name: 'Tiotropium Bromide 18mcg', dosage: '1 Inhalation Daily', active: true },
      { id: 'm-203', name: 'Prednisone 20mg', dosage: '1 Tablet Daily with meals', active: true }
    ],
    medicalHistory: [
      'Chronic Bronchitis x 8 years',
      '40-pack-year smoking history (quit 2022)',
      'Seasonal exacerbations'
    ],
    vitalsHistory: []
  };

  // Patient 3: Stable (Sarah Jenkins - Post-Operative Laparoscopic Recovery)
  const p3Vitals = { heartRate: 72, systolic: 118, diastolic: 76, spo2: 99 };
  const p3Status = deriveClinicalStatus(p3Vitals);
  const p3Organ = getOrganForCondition('Post-Operative Recovery Laparoscopic');

  const p3 = {
    id: 'P-103',
    name: 'Sarah Jenkins',
    age: 31,
    gender: 'Female',
    condition: 'Post-Operative Laparoscopic Recovery',
    primaryCondition: 'Post-Operative Laparoscopic Recovery',
    ...p3Status,
    heartRate: p3Vitals.heartRate,
    bloodPressure: `${p3Vitals.systolic}/${p3Vitals.diastolic}`,
    systolic: p3Vitals.systolic,
    diastolic: p3Vitals.diastolic,
    spo2: p3Vitals.spo2,
    temperature: 98.4,
    device: 'PBM103',
    bed: 'Ward Bed 08',
    bloodType: 'O+',
    allergies: 'None reported',
    assignedDoctor: 'Dr. Alexander Wright, MD',
    assignedDevices: ['PBM103'],
    discharged: false,
    admittedAt: new Date(Date.now() - 1 * 86400000), // admitted yesterday
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    organName: p3Organ.organName,
    organImage: p3Organ.organImage,
    organStatus: {
      organ: 'Hepatic Margin & Peritoneum',
      state: 'Normal',
      diagnostic: 'Post-surgical telemetry nominal, wound clean'
    },
    criticalVal: '72 bpm',
    medications: [
      { id: 'm-301', name: 'Maintenance Hydration IV', dosage: '50ml/hr Continuous', active: true },
      { id: 'm-302', name: 'Acetaminophen 500mg', dosage: '1 Tablet Q6H PRN', active: true },
      { id: 'm-303', name: 'Enoxaparin 40mg', dosage: 'SubQ Daily DVT prophylaxis', active: true }
    ],
    medicalHistory: [
      'Uncomplicated Laparoscopic Cholecystectomy (Day 2 Post-Op)',
      'No significant past medical history',
      'No known drug allergies'
    ],
    vitalsHistory: []
  };

  // 4. Generate 24 Hours of Vital Readings for each patient
  console.log('\n--> Generating 24-Hour Vital Readings for all 3 patients...');
  const patientsList = [p1, p2, p3];
  const vitalReadings = [];

  const now = Date.now();
  for (const patient of patientsList) {
    const history = [];
    for (let i = 24; i >= 0; i--) {
      const timeOffset = now - i * 3600000;
      const date = new Date(timeOffset);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = '00';
      const timeLabel = `${hours}:${minutes}`;

      let hrDelta = 0;
      let spo2Delta = 0;
      let sysDelta = 0;

      if (patient.id === 'P-101') {
        // Critical: elevated vitals, spike around 2 hours ago
        hrDelta = i <= 3 ? 12 : Math.round((Math.sin(i) * 6));
        sysDelta = i <= 3 ? 20 : Math.round((Math.sin(i * 0.8) * 10));
        spo2Delta = i <= 3 ? -3 : Math.round((Math.cos(i) * 1.5));
      } else if (patient.id === 'P-102') {
        // At Risk: lower SpO2, slight tachy
        hrDelta = Math.round((Math.sin(i * 1.2) * 5));
        sysDelta = Math.round((Math.cos(i) * 6));
        spo2Delta = Math.round((Math.sin(i * 0.7) * 2));
      } else {
        // Stable: calm vitals
        hrDelta = Math.round((Math.sin(i * 0.5) * 4));
        sysDelta = Math.round((Math.cos(i * 0.5) * 4));
        spo2Delta = 0;
      }

      const reading = {
        patientId: patient.id,
        heartRate: Math.max(45, Math.min(160, patient.heartRate + hrDelta)),
        systolic: Math.max(85, Math.min(210, patient.systolic + sysDelta)),
        diastolic: Math.max(50, Math.min(130, patient.diastolic + Math.round(sysDelta * 0.5))),
        spo2: Math.max(82, Math.min(100, patient.spo2 + spo2Delta)),
        temperature: patient.temperature,
        timeLabel,
        recordedAt: date
      };

      vitalReadings.push(reading);

      // Add to patient's compact vitalsHistory array (sampled every 2 hours)
      if (i % 2 === 0) {
        history.push({
          time: timeLabel,
          bpm: reading.heartRate,
          spo2: reading.spo2,
          bp: `${reading.systolic}/${reading.diastolic}`,
          recordedAt: date
        });
      }
    }
    patient.vitalsHistory = history;
  }

  await VitalReading.insertMany(vitalReadings);
  console.log(`✓ Inserted ${vitalReadings.length} historical vital readings (24 hours per patient).`);

  await Patient.insertMany(patientsList);
  console.log(`✓ Inserted 3 core patients into MongoDB.`);

  // 5. Seed Alerts (Critical, Warning, Escalate)
  console.log('\n--> Seeding Telemetry Ward Alerts...');
  const seedAlerts = [
    {
      id: 'ALT-1',
      patientId: 'P-101',
      name: 'Jane Doe',
      alertType: 'Critical',
      title: 'High BP Spike (180/110)',
      description: 'Recorded: 180/110 mmHg on ICU Bed 01 sensor',
      device: 'PBM101',
      status: 'Unacknowledged',
      time: '3 mins ago',
      timestamp: new Date(Date.now() - 180000),
      action: 'Acknowledge',
      severity: 'critical',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80'
    },
    {
      id: 'ALT-2',
      patientId: 'P-101',
      name: 'Jane Doe',
      alertType: 'Critical',
      title: 'Desaturation Alarm (SpO2 88%)',
      description: 'Recorded: SpO2 dropped below 90% threshold',
      device: 'PBM101',
      status: 'Escalated',
      time: '12 mins ago',
      timestamp: new Date(Date.now() - 720000),
      action: 'Adjust Meds',
      severity: 'critical',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80'
    },
    {
      id: 'ALT-3',
      patientId: 'P-102',
      name: 'Roger Lewis',
      alertType: 'Warning',
      title: 'Low SpO2 Drop (92%)',
      description: 'Recorded: 92% SpO2 on nasal cannula 2L',
      device: 'PBM102',
      status: 'New',
      time: '25 mins ago',
      timestamp: new Date(Date.now() - 1500000),
      action: 'Acknowledge',
      severity: 'warning',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
    },
    {
      id: 'ALT-4',
      patientId: 'P-103',
      name: 'Sarah Jenkins',
      alertType: 'Info',
      title: 'Routine Post-Op Vitals Verified',
      description: 'Stable 72 bpm, BP 118/76 mmHg',
      device: 'PBM103',
      status: 'Acknowledged',
      time: '1 hour ago',
      timestamp: new Date(Date.now() - 3600000),
      action: 'View Order',
      severity: 'info',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80'
    }
  ];

  await Alert.insertMany(seedAlerts);
  console.log(`✓ Inserted ${seedAlerts.length} telemetry alerts.`);

  // 6. Seed Notes (A couple of notes for each patient, Task 5)
  console.log('\n--> Seeding Patient Clinical Notes (Task 5)...');
  const seedNotes = [
    {
      patientId: 'P-101',
      authorId: createdUsers[0]._id.toString(),
      authorName: createdUsers[0].name,
      authorRole: createdUsers[0].role,
      authorAvatar: createdUsers[0].avatar,
      text: 'Patient exhibits hypertensive urgency with arrhythmia. Initiated Labetalol 20mg IV push protocol and continuous 12-lead telemetry surveillance. Strict BP map < 110 mmHg target.',
      timestamp: new Date(Date.now() - 7200000),
      timeLabel: '2 hours ago'
    },
    {
      patientId: 'P-101',
      authorId: createdUsers[2]._id.toString(),
      authorName: createdUsers[2].name,
      authorRole: createdUsers[2].role,
      authorAvatar: createdUsers[2].avatar,
      text: 'Bedside telemetry monitor calibrated. Patient calm in semi-fowler position. Administered scheduled Carvedilol. Rechecked manual cuff: 178/108 mmHg.',
      timestamp: new Date(Date.now() - 1800000),
      timeLabel: '30 mins ago'
    },
    {
      patientId: 'P-102',
      authorId: createdUsers[1]._id.toString(),
      authorName: createdUsers[1].name,
      authorRole: createdUsers[1].role,
      authorAvatar: createdUsers[1].avatar,
      text: 'COPD exacerbation responsive to supplemental oxygen at 2L/min via nasal cannula. Continue Q4H Albuterol nebulizer. Chest auscultation shows scattered bilateral wheezing.',
      timestamp: new Date(Date.now() - 14400000),
      timeLabel: '4 hours ago'
    },
    {
      patientId: 'P-102',
      authorId: createdUsers[3]._id.toString(),
      authorName: createdUsers[3].name,
      authorRole: createdUsers[3].role,
      authorAvatar: createdUsers[3].avatar,
      text: 'Incentive spirometry encouraged (800 mL achieved). Nebulizer treatment completed without tachycardia spike.',
      timestamp: new Date(Date.now() - 3600000),
      timeLabel: '1 hour ago'
    },
    {
      patientId: 'P-103',
      authorId: createdUsers[0]._id.toString(),
      authorName: createdUsers[0].name,
      authorRole: createdUsers[0].role,
      authorAvatar: createdUsers[0].avatar,
      text: 'Laparoscopic post-op day 2 progressing favorably. Tolerating clear liquids, surgical incisions intact without erythema. Plan for discharge tomorrow morning if vitals stay stable.',
      timestamp: new Date(Date.now() - 21600000),
      timeLabel: '6 hours ago'
    },
    {
      patientId: 'P-103',
      authorId: createdUsers[2]._id.toString(),
      authorName: createdUsers[2].name,
      authorRole: createdUsers[2].role,
      authorAvatar: createdUsers[2].avatar,
      text: 'Patient ambulated in hall for 10 minutes x 2. Denies acute pain (reported 2/10). Stable vitals maintained.',
      timestamp: new Date(Date.now() - 5400000),
      timeLabel: '1.5 hours ago'
    }
  ];

  await Note.insertMany(seedNotes);
  console.log(`✓ Inserted ${seedNotes.length} clinical patient notes.`);

  // 7. Seed Initial Diagnostic Orders (Task 1 Permission Check)
  console.log('\n--> Seeding Diagnostic Orders...');
  const seedOrders = [
    {
      orderId: 'ORD-101',
      patientId: 'P-101',
      patientName: 'Jane Doe',
      doctorName: 'Dr. Alexander Wright, MD',
      orderType: 'Cardiac Troponin I & Electrolytes',
      details: 'STAT blood draw to evaluate acute myocardium strain under hypertensive crisis.',
      status: 'Pending',
      orderedAt: new Date(Date.now() - 3600000)
    },
    {
      orderId: 'ORD-102',
      patientId: 'P-102',
      patientName: 'Roger Lewis',
      doctorName: 'Dr. Sarah Connor, MD',
      orderType: 'Arterial Blood Gas (ABG)',
      details: 'Evaluate PaO2 and PaCO2 levels post-nebulizer therapy.',
      status: 'Completed',
      orderedAt: new Date(Date.now() - 7200000)
    }
  ];
  await DiagnosticOrder.insertMany(seedOrders);
  console.log(`✓ Inserted ${seedOrders.length} diagnostic orders.`);

  // 8. Seed Messages (Task 4 Care Team Messaging)
  console.log('\n--> Seeding Care Team Messages (Task 4)...');
  const seedMessages = [
    {
      patientId: 'P-101',
      patientName: 'Jane Doe',
      senderId: createdUsers[0]._id.toString(),
      senderName: createdUsers[0].name,
      senderRole: createdUsers[0].role,
      senderAvatar: createdUsers[0].avatar,
      recipientId: 'all',
      recipientName: 'Care Team',
      text: 'Jane Doe had a BP spike of 180/110. Please ensure continuous arterial line or automated cuff cycling every 15 minutes.',
      timestamp: new Date(Date.now() - 3000000),
      readBy: [createdUsers[0]._id.toString(), createdUsers[2]._id.toString()]
    },
    {
      patientId: 'P-101',
      patientName: 'Jane Doe',
      senderId: createdUsers[2]._id.toString(),
      senderName: createdUsers[2].name,
      senderRole: createdUsers[2].role,
      senderAvatar: createdUsers[2].avatar,
      recipientId: 'all',
      recipientName: 'Care Team',
      text: 'Understood Dr. Wright. IV Labetalol administered, monitoring ECG rhythm strip at telemetry central station.',
      timestamp: new Date(Date.now() - 2400000),
      readBy: [createdUsers[0]._id.toString(), createdUsers[2]._id.toString()]
    }
  ];
  await Message.insertMany(seedMessages);
  console.log(`✓ Inserted ${seedMessages.length} care team messages.`);

  // 9. Seed Notifications (Task 4 Header Bell)
  console.log('\n--> Seeding Notifications (Task 4)...');
  const seedNotifications = [
    {
      userId: 'nurse',
      patientId: 'P-101',
      patientName: 'Jane Doe',
      title: 'High BP Spike (180/110)',
      sub: 'Bed 01 • Sensor PBM101 • Critical Arrhythmia',
      type: 'critical',
      badge: 'Immediate Bedside Check',
      status: 'Unread',
      isRead: false,
      timestamp: new Date(Date.now() - 180000)
    },
    {
      userId: 'doctor',
      patientId: 'P-101',
      patientName: 'Jane Doe',
      title: 'Nurse Consultation Paged: Severe BP Spike',
      sub: 'Nurse Elena Rostova paged: Bed 01 BP 180/110, HR 118 bpm',
      type: 'escalation',
      badge: 'Urgent Consult',
      status: 'Unread',
      isRead: false,
      timestamp: new Date(Date.now() - 360000)
    },
    {
      userId: 'nurse',
      patientId: 'P-102',
      patientName: 'Roger Lewis',
      title: 'Low SpO2 Drop (92%)',
      sub: 'Step-Down 04 • Sensor PBM102 • Desaturation Alert',
      type: 'warning',
      badge: 'Desaturation Alarm',
      status: 'Unread',
      isRead: false,
      timestamp: new Date(Date.now() - 1500000)
    }
  ];
  await Notification.insertMany(seedNotifications);
  console.log(`✓ Inserted ${seedNotifications.length} clinical notifications.`);

  console.log('\n====================================================');
  console.log('✓ SEEDING COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
  console.log('\nKnown Test User Accounts (All passwords: "Password@2026"):');
  console.log('----------------------------------------------------');
  console.log('1. DOCTOR: alexander.wright@biosentinel.com');
  console.log('   Role: doctor | Name: Dr. Alexander Wright, MD');
  console.log('2. DOCTOR: sarah.connor@biosentinel.com');
  console.log('   Role: doctor | Name: Dr. Sarah Connor, MD');
  console.log('3. NURSE:  elena.rostova@biosentinel.com');
  console.log('   Role: nurse  | Name: Nurse Elena Rostova, RN');
  console.log('4. NURSE:  marcus.vance@biosentinel.com');
  console.log('   Role: nurse  | Name: Nurse Marcus Vance, RN');
  console.log('----------------------------------------------------\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('[BioSentinel Seeder Error]:', err);
  process.exit(1);
});

