const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    type: {
      type: String,
      required: true
    },
    patient: {
      type: String,
      default: 'Unassigned'
    },
    patientId: {
      type: String,
      default: ''
    },
    bed: {
      type: String,
      default: 'Standby Cart 1'
    },
    battery: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 100
    },
    status: {
      type: String,
      enum: ['Online', 'Low Battery', 'Standby', 'Offline'],
      default: 'Online'
    },
    signal: {
      type: String,
      enum: ['Strong', 'Good', 'Weak', 'Standby', 'None'],
      default: 'Strong'
    },
    lastPing: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Device', deviceSchema);

