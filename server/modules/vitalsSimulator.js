const { Patient, Device, Alert, VitalReading, Notification } = require('../models');
const { deriveClinicalStatus } = require('./clinicalLogic');

let simulatorInterval = null;
let tickCount = 0;

function startVitalsSimulator(io, intervalMs = 5000) {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
  }

  console.log(`[Vitals Simulator] Started with interval ${intervalMs}ms (SIMULATE_VITALS=true).`);

  simulatorInterval = setInterval(async () => {
    try {
      tickCount++;
      // 1. Fetch active (non-discharged) patients
      const patients = await Patient.find({ discharged: false });
      if (!patients || patients.length === 0) return;

      for (const p of patients) {
        // Subtle realistic fluctuations
        const hrDelta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const spo2Delta = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
        const sysDelta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const diaDelta = Math.floor(sysDelta * 0.5);

        // Keep within reasonable bounds
        p.heartRate = Math.max(45, Math.min(150, p.heartRate + hrDelta));
        p.systolic = Math.max(85, Math.min(210, p.systolic + sysDelta));
        p.diastolic = Math.max(50, Math.min(130, p.diastolic + diaDelta));
        p.bloodPressure = `${p.systolic}/${p.diastolic}`;
        p.spo2 = Math.max(82, Math.min(100, p.spo2 + spo2Delta));

        // Derive mathematically consistent status
        const derived = deriveClinicalStatus(p);
        p.healthStatus = derived.healthStatus;
        p.situation = derived.situation;
        p.riskStatus = derived.riskStatus;
        p.situationDetails = derived.situationDetails;
        p.riskStatusDetails = derived.riskStatusDetails;
        if (p.organStatus) {
          p.organStatus.state = derived.state;
        }

        // Add to compact vitals history every 6 ticks (approx 30s)
        if (tickCount % 6 === 0) {
          const now = new Date();
          const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          p.vitalsHistory = p.vitalsHistory || [];
          p.vitalsHistory.push({
            time: timeLabel,
            bpm: p.heartRate,
            spo2: p.spo2,
            bp: p.bloodPressure,
            recordedAt: now
          });
          if (p.vitalsHistory.length > 20) {
            p.vitalsHistory.shift();
          }

          // Persist to VitalReading collection
          await VitalReading.create({
            patientId: p.id,
            heartRate: p.heartRate,
            systolic: p.systolic,
            diastolic: p.diastolic,
            spo2: p.spo2,
            temperature: p.temperature,
            timeLabel,
            recordedAt: now
          });
        }

        await p.save();

        // 2. Check clinical thresholds to raise alerts
        if (derived.healthStatus === 'Critical') {
          // Check if open alert exists for this patient within last 5 minutes
          const recentAlert = await Alert.findOne({
            patientId: p.id,
            status: { $in: ['New', 'Unacknowledged'] },
            timestamp: { $gte: new Date(Date.now() - 300000) }
          });

          if (!recentAlert) {
            const newAlertId = `ALT-${Date.now().toString().slice(-4)}`;
            const createdAlert = await Alert.create({
              id: newAlertId,
              patientId: p.id,
              name: p.name,
              alertType: 'Critical',
              title: `Telemetry Critical: ${derived.situationDetails}`,
              description: `Vitals recorded: HR ${p.heartRate} bpm, BP ${p.bloodPressure} mmHg, SpO2 ${p.spo2}%`,
              device: p.device || 'PBM100',
              status: 'Unacknowledged',
              time: 'Just now',
              timestamp: new Date(),
              action: 'Acknowledge',
              severity: 'critical',
              avatar: p.avatar
            });

            // Create notification for nurses and doctors
            const notif = await Notification.create({
              userId: 'all',
              patientId: p.id,
              patientName: p.name,
              title: `Critical Alert: ${p.name}`,
              sub: `${derived.situationDetails} (Bed: ${p.bed})`,
              type: 'critical',
              badge: 'Critical Telemetry',
              status: 'Unread',
              isRead: false
            });

            if (io) {
              io.emit('alert:created', createdAlert);
              io.emit('notification:new', notif);
            }
          }
        }

        // Broadcast live patient update to all connected clients
        if (io) {
          io.emit('patient:updated', p);
        }
      }

      // 3. Check and simulate device battery tracking (<30% threshold alert)
      if (tickCount % 12 === 0) { // roughly every 60 seconds
        const devices = await Device.find({ status: { $ne: 'Offline' } });
        for (const dev of devices) {
          if (dev.battery > 5) {
            // Drain battery by 1%
            dev.battery = Math.max(0, dev.battery - 1);
            if (dev.battery < 30 && dev.status !== 'Low Battery') {
              dev.status = 'Low Battery';
              dev.signal = 'Weak';

              // Raise battery alert
              const batteryAlertId = `ALT-BAT-${dev.id}`;
              const existingBatAlert = await Alert.findOne({ id: batteryAlertId });
              if (!existingBatAlert) {
                const bAlert = await Alert.create({
                  id: batteryAlertId,
                  patientId: dev.patientId || 'DEVICES',
                  name: dev.patient || 'Telemetry Hardware',
                  alertType: 'Warning',
                  title: `Low Battery Warning: Device ${dev.id} (${dev.battery}%)`,
                  description: `${dev.type} at ${dev.bed} has fallen below 30% battery threshold. Replace battery immediately.`,
                  device: dev.id,
                  status: 'Unacknowledged',
                  time: 'Just now',
                  timestamp: new Date(),
                  action: 'Acknowledge',
                  severity: 'warning',
                  avatar: '/nurse-avatar.jpg'
                });

                const bNotif = await Notification.create({
                  userId: 'nurse',
                  patientId: dev.patientId || '',
                  patientName: dev.patient || 'Hardware Hub',
                  title: `Telemetry Battery Low: ${dev.id}`,
                  sub: `${dev.bed} battery at ${dev.battery}% (Tracking <30%)`,
                  type: 'device',
                  badge: 'Hardware Notice',
                  status: 'Unread',
                  isRead: false
                });

                if (io) {
                  io.emit('alert:created', bAlert);
                  io.emit('notification:new', bNotif);
                }
              }
            }
            await dev.save();
            if (io) io.emit('device:updated', dev);
          }
        }
      }
    } catch (err) {
      console.error('[Vitals Simulator Error]:', err.message);
    }
  }, intervalMs);
}

function stopVitalsSimulator() {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
    console.log('[Vitals Simulator] Stopped.');
  }
}

module.exports = {
  startVitalsSimulator,
  stopVitalsSimulator
};

