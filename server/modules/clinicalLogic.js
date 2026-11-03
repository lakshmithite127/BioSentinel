/**
 * BioSentinel Clinical Logic Module
 * Provides unified, mathematically consistent clinical decision logic for:
 * 1. Health Status, Situation, and Risk Status derivation from real vitals
 * 2. Proper organ system mapping to ensure 3D visualizer never contradicts patient condition
 */

function deriveClinicalStatus(vitals) {
  const hr = Number(vitals.heartRate) || 72;
  const sys = Number(vitals.systolic) || 120;
  const dia = Number(vitals.diastolic) || 80;
  const spo2 = Number(vitals.spo2) || 98;

  let healthStatus = 'Stable';
  let situation = 'Stable';
  let riskStatus = 'Stable';
  let situationDetails = 'Vital signs within normal clinical margins';
  let riskStatusDetails = 'Low telemetry decompensation risk';
  let state = 'Normal';

  // Critical threshold check
  if (spo2 < 90 || hr > 115 || hr < 50 || sys > 160 || sys < 90 || dia > 105) {
    healthStatus = 'Critical';
    situation = 'Critical';
    riskStatus = 'Critical';
    state = 'Critical';

    const reasons = [];
    if (spo2 < 90) reasons.push(`Severe Desaturation (${spo2}%)`);
    if (hr > 115) reasons.push(`Tachycardia (${hr} bpm)`);
    if (hr < 50) reasons.push(`Bradycardia (${hr} bpm)`);
    if (sys > 160 || dia > 105) reasons.push(`Hypertensive Crisis (${sys}/${dia} mmHg)`);
    if (sys < 90) reasons.push(`Hypotension (${sys}/${dia} mmHg)`);

    situationDetails = reasons.join(' & ');
    riskStatusDetails = 'Critical telemetry alert: ICU monitoring indicated';
  } else if (spo2 < 95 || hr > 95 || sys > 135 || dia > 88) {
    healthStatus = 'At risk';
    situation = 'Warning';
    riskStatus = 'At Risk';
    state = 'Warning';

    const reasons = [];
    if (spo2 < 95) reasons.push(`Borderline SpO2 (${spo2}%)`);
    if (hr > 95) reasons.push(`Elevated HR (${hr} bpm)`);
    if (sys > 135 || dia > 88) reasons.push(`Prehypertension (${sys}/${dia} mmHg)`);

    situationDetails = reasons.join(' & ');
    riskStatusDetails = 'Moderate telemetry elevation: nursing vitals check recommended';
  }

  return {
    healthStatus,
    situation,
    riskStatus,
    situationDetails,
    riskStatusDetails,
    state
  };
}

function getOrganForCondition(conditionStr) {
  const c = (conditionStr || '').toLowerCase();

  if (c.includes('heart') || c.includes('arrhythmia') || c.includes('hypertens') || c.includes('cardio') || c.includes('coronary') || c.includes('tachy')) {
    return {
      organName: 'Heart & Cardiovascular',
      organImage: '/heart.png',
      defaultOrgan: 'Myocardium'
    };
  }

  if (c.includes('lung') || c.includes('pulmon') || c.includes('copd') || c.includes('asthma') || c.includes('hypox') || c.includes('pneumonia') || c.includes('respirat')) {
    return {
      organName: 'Lungs & Respiratory',
      organImage: '/lungs.png',
      defaultOrgan: 'Bronchial Tree & Alveoli'
    };
  }

  if (c.includes('liver') || c.includes('hepat') || c.includes('cirrhosis') || c.includes('laparoscop') || c.includes('post-op')) {
    return {
      organName: 'Hepatic & Abdominal',
      organImage: '/liver.png',
      defaultOrgan: 'Hepatic Lobule'
    };
  }

  if (c.includes('diabet') || c.includes('pancrea') || c.includes('glucose') || c.includes('insulin')) {
    return {
      organName: 'Pancreas & Endocrine',
      organImage: '/human-pancreas.png',
      defaultOrgan: 'Islets of Langerhans'
    };
  }

  if (c.includes('kidney') || c.includes('renal') || c.includes('nephr') || c.includes('creatinine')) {
    return {
      organName: 'Kidneys & Renal',
      organImage: '/kidneys.png',
      defaultOrgan: 'Renal Cortex & Glomerulus'
    };
  }

  if (c.includes('brain') || c.includes('neuro') || c.includes('stroke') || c.includes('cerebr') || c.includes('seizure')) {
    return {
      organName: 'Brain & Cerebrovascular',
      organImage: '/brain.png',
      defaultOrgan: 'Cerebral Cortex'
    };
  }

  // Fallback
  return {
    organName: 'Cardiovascular & Respiratory',
    organImage: '/heart.png',
    defaultOrgan: 'Cardiovascular System'
  };
}

module.exports = {
  deriveClinicalStatus,
  getOrganForCondition
};

