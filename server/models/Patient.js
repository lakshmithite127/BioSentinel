const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    age: {
      type: Number,
      required: true
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male'
    },
    condition: {
      type: String,
      required: true
    },
    primaryCondition: {
      type: String,
      default: ''
    },
    situation: {
      type: String,
      default: 'Stable'
    },
    situationDetails: {
      type: String,
      default: 'Baseline telemetry evaluation normal'
    },
    riskStatus: {
      type: String,
      default: 'Stable'
    },
    riskStatusDetails: {
      type: String,
      default: 'Low telemetry decompensation risk'
    },
    healthStatus: {
      type: String,
      enum: ['Critical', 'At risk', 'Stable'],
      default: 'Stable'
    },
    heartRate: {
      type: Number,
      default: 72
    },
    bloodPressure: {
      type: String,
      default: '120/80'
    },
    systolic: {
      type: Number,
      default: 120
    },
    diastolic: {
      type: Number,
      default: 80
    },
    spo2: {
      type: Number,
      default: 98
    },
    temperature: {
      type: Number,
      default: 98.6
    },
    device: {
      type: String,
      default: 'PBM100'
    },
    bed: {
      type: String,
      default: 'Ward Bed 01'
    },
    bloodType: {
      type: String,
      default: 'O+'
    },
    allergies: {
      type: String,
      default: 'None reported'
    },
    assignedDoctor: {
      type: String,
      default: 'Dr. Alexander Wright, MD'
    },
    assignedDevices: {
      type: [String],
      default: []
    },
    discharged: {
      type: Boolean,
      default: false
    },
    dischargedAt: {
      type: Date,
      default: null
    },
    admittedAt: {
      type: Date,
      default: Date.now
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
    },
    organName: {
      type: String,
      default: 'Cardiovascular & Respiratory'
    },
    organImage: {
      type: String,
      default: '/heart.png'
    },
    organStatus: {
      organ: { type: String, default: 'General System' },
      state: { type: String, default: 'Normal' },
      diagnostic: { type: String, default: 'Perfusion stable' }
    },
    criticalVal: {
      type: String,
      default: '72 bpm'
    },
    medications: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        active: { type: Boolean, default: true }
      }
    ],
    medicalHistory: {
      type: [String],
      default: []
    },
    vitalsHistory: [
      {
        time: { type: String },
        bpm: { type: Number },
        spo2: { type: Number },
        bp: { type: String },
        recordedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patient', patientSchema);

