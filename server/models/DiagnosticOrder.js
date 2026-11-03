const mongoose = require('mongoose');

const diagnosticOrderSchema = new mongoose.Schema(
  {
    orderId: {
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
    patientName: {
      type: String,
      required: true
    },
    doctorName: {
      type: String,
      required: true
    },
    orderType: {
      type: String,
      required: true
    },
    details: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Cancelled'],
      default: 'Pending'
    },
    orderedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DiagnosticOrder', diagnosticOrderSchema);

