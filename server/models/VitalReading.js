const mongoose = require('mongoose');

const vitalReadingSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      index: true
    },
    heartRate: {
      type: Number,
      required: true
    },
    systolic: {
      type: Number,
      required: true
    },
    diastolic: {
      type: Number,
      required: true
    },
    spo2: {
      type: Number,
      required: true
    },
    temperature: {
      type: Number,
      default: 98.6
    },
    timeLabel: {
      type: String,
      default: ''
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('VitalReading', vitalReadingSchema);

