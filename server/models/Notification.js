const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: 'all', // 'all', 'doctor', 'nurse', or user ID
      index: true
    },
    patientId: {
      type: String,
      default: ''
    },
    patientName: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      required: true
    },
    sub: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      enum: ['critical', 'warning', 'order', 'device', 'escalation', 'message', 'note', 'general'],
      default: 'general'
    },
    badge: {
      type: String,
      default: 'Notice'
    },
    status: {
      type: String,
      default: 'Unread'
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readBy: {
      type: [String],
      default: []
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);

