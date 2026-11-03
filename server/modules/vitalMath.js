/**
 * Experiment 4.1 - Custom Module: vitalMath.js
 * Demonstrates:
 * 1. Exporting custom functions (add, subtract, multiply, divide) via module.exports
 * 2. Importing with require in server.js
 * 3. Clinical utility calculations (MAP, BMI, Vitals Risk Score)
 */

function add(a, b) {
  return Number(a) + Number(b);
}

function subtract(a, b) {
  return Number(a) - Number(b);
}

function multiply(a, b) {
  return Number(a) * Number(b);
}

function divide(a, b) {
  if (Number(b) === 0) {
    throw new Error("Division by zero error in math module.");
  }
  return Number(a) / Number(b);
}

/**
 * Calculates Mean Arterial Pressure (MAP)
 * Formula: MAP = (2 * Diastolic + Systolic) / 3
 * Normal range: 70 - 100 mm Hg
 */
function calculateMAP(systolic, diastolic) {
  const s = Number(systolic);
  const d = Number(diastolic);
  if (isNaN(s) || isNaN(d)) {
    throw new Error("Invalid blood pressure inputs for MAP calculation.");
  }
  const map = (2 * d + s) / 3;
  return {
    systolic: s,
    diastolic: d,
    map: Math.round(map * 10) / 10,
    status: map < 65 ? "Hypotension Risk" : map > 105 ? "Hypertension Risk" : "Normal Perfusion"
  };
}

/**
 * Calculates Body Mass Index (BMI)
 * Formula: weight (kg) / (height (m) ^ 2)
 */
function calculateBMI(weightKg, heightCm) {
  const w = Number(weightKg);
  const hM = Number(heightCm) / 100;
  if (w <= 0 || hM <= 0) {
    throw new Error("Weight and height must be positive values.");
  }
  const bmi = w / (hM * hM);
  let category = "Normal";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25) category = "Normal";
  else if (bmi < 30) category = "Overweight";
  else category = "Obese";

  return {
    weightKg: w,
    heightCm: Number(heightCm),
    bmi: Math.round(bmi * 10) / 10,
    category
  };
}

/**
 * Compute overall vital risk score based on vitals
 */
function computeVitalRiskScore(heartRate, systolic, diastolic, spo2) {
  let score = 0;
  if (heartRate < 50 || heartRate > 110) score += 25;
  if (heartRate > 140) score += 20;
  if (systolic > 140 || diastolic > 90) score += 20;
  if (systolic > 170 || diastolic > 105) score += 20;
  if (spo2 < 95) score += 15;
  if (spo2 < 90) score += 25;

  return Math.min(100, score);
}

module.exports = {
  add,
  subtract,
  multiply,
  divide,
  calculateMAP,
  calculateBMI,
  computeVitalRiskScore
};
