const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      index: true
    },
    authorId: {
      type: String,
      required: true
    },
    authorName: {
      type: String,
      required: true
    },
    authorRole: {
      type: String,
      enum: ['doctor', 'nurse'],
      required: true
    },
    authorAvatar: {
      type: String,
      default: '/doctor-avatar.jpg'
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
    timeLabel: {
      type: String,
      default: 'Just now'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Note', noteSchema);

