const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    patientId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    alertType: {
      type: String,
      enum: ['Critical', 'Warning', 'Info'],
      default: 'Critical'
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    device: {
      type: String,
      default: 'PBM100'
    },
    status: {
      type: String,
      enum: ['New', 'Unacknowledged', 'Acknowledged', 'Escalated', 'Resolved'],
      default: 'Unacknowledged'
    },
    time: {
      type: String,
      default: 'Just now'
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    action: {
      type: String,
      default: 'Acknowledge'
    },
    severity: {
      type: String,
      enum: ['critical', 'warning', 'info'],
      default: 'critical'
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);

