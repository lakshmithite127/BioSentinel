const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      default: '',
      index: true
    },
    patientName: {
      type: String,
      default: ''
    },
    senderId: {
      type: String,
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    senderRole: {
      type: String,
      enum: ['doctor', 'nurse'],
      required: true
    },
    senderAvatar: {
      type: String,
      default: ''
    },
    recipientId: {
      type: String,
      default: 'all', // 'all' for care team broadcast, or specific user ID
      index: true
    },
    recipientName: {
      type: String,
      default: 'Care Team'
    },
    text: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    readBy: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);

