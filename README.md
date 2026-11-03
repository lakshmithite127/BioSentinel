# BioSentinel — Dual-Role Remote Patient Monitoring (RPM) Telemetry Platform

BioSentinel is a full-stack clinical monitoring and telemetry web platform designed for hospital telemetry and ICU wards. Built on the MERN stack (React 18 + Vite, Node.js + Express, MongoDB, and Socket.io), it provides dedicated operational experiences for **Doctors** (Attending Physicians) and **Nurses** (Bedside Telemetry Staff) with continuous real-time vitals monitoring, hardware battery surveillance, interactive alerts, 3D anatomical organ telemetry, care team messaging, and persistent clinical EHR notes.

---

## 🪟 Windows Quick Start Guide (Exact Commands)

### 1. Start MongoDB on Windows

If MongoDB is installed as a Windows Service, start it from PowerShell:
```powershell
net start MongoDB
```

*(Optional) To enable native MongoDB Change Streams via a single-node replica set:*
```powershell
& "C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe" --dbpath "C:\BioSentinel-main\server\data\db" --replSet rs0 --port 27017
```
Then initiate the replica set once in another terminal:
```powershell
mongosh --eval "rs.initiate()"
```
> **Note**: BioSentinel automatically handles standalone MongoDB setups gracefully with Socket.io real-time event broadcasting and periodic polling fallback.

---

### 2. Install Dependencies in Both Folders

Open PowerShell at `c:\BioSentinel-main`:

**Server:**
```powershell
cd server
npm install
```

**Client:**
```powershell
cd ..\client
npm install
```

---

### 3. Seed Database with Initial Clinical Data

Populate MongoDB with the 4 staff accounts, 5 telemetry devices, and exactly 3 core patients (1 Critical, 1 At-Risk, 1 Stable) with 24 hours of vital readings, alerts, care team messages, and clinical notes:

```powershell
cd ..\server
npm run seed
```

*Note: The seed script is completely idempotent and will never overwrite existing edits. If you ever need a complete fresh wipe and reseed, run:*
```powershell
npm run seed:reset
```

---

### 4. Start the Backend API & Socket.io Server

From the `server` directory:
```powershell
npm start
# or: node server.js
```
*Backend runs on: `http://localhost:5000`*

---

### 5. Start the React + Vite Frontend

In a second PowerShell window from the `client` directory:
```powershell
cd client
npm run dev
```
*Frontend runs on: `http://localhost:5173`*

---

## 🔐 Clinical Staff Login Credentials

All users authenticate with their verified hospital email (`firstname.lastname@biosentinel.com`) and test password:

**Password for all test accounts:** `Password@2026`

### 🩺 Doctor Accounts (Routes to `/patients` Doctor Portal)
- **Dr. Alexander Wright, MD**: `alexander.wright@biosentinel.com` (Attending Cardiologist)
- **Dr. Sarah Connor, MD**: `sarah.connor@biosentinel.com` (Pulmonary & Critical Care Specialist)
- **Capabilities**: Patient Overview, Diagnostic Orders placement, 3D Anatomical Organ Telemetry (Heart, Lungs, Liver, Pancreas, Kidneys, Brain), 24h vital trend analysis, patient admission & discharge, clinical notes.

### 📋 Nurse Accounts (Routes to `/overview` Nurse Portal)
- **Nurse Elena Rostova, RN**: `elena.rostova@biosentinel.com` (Lead Telemetry Nurse)
- **Nurse Marcus Vance, RN**: `marcus.vance@biosentinel.com` (ICU Telemetry Specialist)
- **Capabilities**: Ward Overview, Bedside Telemetry Alerts, Hardware Sensor Hub (live battery tracking with `<30%` threshold alerts), Acknowledge & Mute alarms, urgent physician escalation, care team messaging.

---

## 🧪 Comprehensive Verification Checklist

BioSentinel includes an automated verification script that verifies all core requirements:

```powershell
cd server
node scripts/verify-all.js
```

### Verified Capabilities:
1. **Role-Based Login & Portal Routing**:
   - `alexander.wright@biosentinel.com` (Doctor) routes to `/patients`.
   - `elena.rostova@biosentinel.com` (Nurse) routes to `/overview`.
   - Non-conformant email formats (e.g. `doctor@biosentinel.med` or non-biosentinel domains) are strictly rejected with 400 and a descriptive error message.
   - Role permissions enforced: only doctors can submit diagnostic orders (nurses receive 403 Forbidden).
2. **Real-Time Care Team Messaging & Notifications**:
   - Sending a message to another clinician delivers instant Socket.io events (`message:received` and `notification:new`).
   - Generates persistent notifications in MongoDB displayed in the navbar bell with an unread badge.
   - Background push notifications enabled via the browser Notification API.
3. **UI Edit -> MongoDB Two-Way Sync**:
   - Editing patient vitals or details in the UI immediately updates MongoDB documents.
4. **MongoDB Direct Edit -> UI Update**:
   - Direct changes in MongoDB immediately reflect across API and UI views.
5. **Data Persistence Across Restarts**:
   - Data persists across server restarts and browser reloads; MongoDB is the single source of truth.
6. **Live Vitals Background Simulation**:
   - Server background worker simulates realistic vitals fluctuations every 5s (`SIMULATE_VITALS=true`), records readings, and raises alerts when thresholds are crossed or battery drops below 30%.
7. **Clinical Data Consistency**:
   - Condition-to-organ mapping ensures a Hypertension patient displays the Heart/Cardiovascular system and never an unrelated organ.
   - "Current situation" and "Risk Status" fields are mathematically derived from real vitals using clinical thresholds so they cannot contradict each other.

---

## 📁 Project Architecture

```
biosentinel/
├── client/                      # React 18 + Vite Frontend
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js        # Unified HTTP API client with JWT & offline detection
│   │   │   └── socket.js        # Socket.io client for real-time telemetry & presence
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Top navigation, MongoDB notifications & settings
│   │   │   ├── StatCard.jsx     # Clickable stat cards with pointer & hover effects
│   │   │   └── PatientAdmissionModal.jsx # Add/edit patient modal form
│   │   ├── context/
│   │   │   ├── AuthContext.jsx  # Authentication state & email validation
│   │   │   └── AlertsContext.jsx# Live telemetry ward alerts & computed stats
│   │   └── pages/
│   │       ├── Login.jsx        # Login page enforcing firstname.lastname@biosentinel.com
│   │       ├── PatientsDashboard.jsx # Overview, dynamic trends & reports from DB
│   │       ├── AlertsDashboard.jsx   # Alarms queue, acknowledge & mute, escalate
│   │       ├── DevicesDashboard.jsx  # Hardware hub, battery <30% tracking, ping
│   │       └── PatientProfile.jsx    # 3D organ visualizer, Care Team chat, EHR notes
├── server/                      # Node.js + Express + MongoDB Backend
│   ├── middleware/
│   │   └── auth.js              # JWT verification & role-based route guard
│   ├── models/
│   │   ├── User.js              # User model (name, email, passwordHash, role)
│   │   ├── Patient.js           # Full clinical patient telemetry profile
│   │   ├── Device.js            # Hardware transmitter, battery & ping status
│   │   ├── VitalReading.js      # 24-hour historical telemetry vital readings
│   │   ├── Alert.js             # Telemetry alarms (Critical, Warning, Info)
│   │   ├── DiagnosticOrder.js   # Physician diagnostic orders
│   │   ├── Note.js              # Clinical notes with author tracking
│   │   ├── Message.js           # Care team instant messages
│   │   └── Notification.js      # Persistent staff notifications
│   ├── modules/
│   │   ├── clinicalLogic.js     # Unified situation, risk status, and organ mapping
│   │   └── vitalsSimulator.js   # Background simulated vitals & battery tracker
│   ├── scripts/
│   │   ├── seed.js              # Idempotent seed script (npm run seed / seed:reset)
│   │   └── verify-all.js        # Complete 8-point automated verification suite
│   └── server.js                # Express & Socket.io server with change streams
```
