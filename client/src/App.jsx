import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertsProvider } from './context/AlertsContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import PatientsDashboard from './pages/PatientsDashboard';
import AlertsDashboard from './pages/AlertsDashboard';
import PatientProfile from './pages/PatientProfile';
import DevicesDashboard from './pages/DevicesDashboard';
import PatientAdmissionModal from './components/PatientAdmissionModal';

// Protected layout wrapper
function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);

  // If on login route, don't show top navbar
  if (location.pathname === '/login') {
    return <Login />;
  }

  // Still verifying token
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '14px' }}>
        <img src="/logo-capsule.svg" alt="Loading" style={{ width: '48px', height: '48px' }} />
        <span style={{ color: '#005e9e', fontWeight: 600, fontSize: '0.95rem' }}>Loading BioSentinel Telemetry Portal...</span>
      </div>
    );
  }

  // Auth guard: redirect to /login if unauthenticated
  if (!user || !user.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isNurse = user.role === 'nurse';

  return (
    <div className="app-container">
      {/* Top Navbar tailored by Doctor vs Nurse role */}
      <Navbar onOpenAdmitModal={() => setIsAdmitModalOpen(true)} />

      {/* Main Content Views */}
      <main>
        <Routes>
          <Route path="/" element={<Navigate to={isNurse ? "/overview" : "/patients"} replace />} />
          <Route path="/overview" element={<PatientsDashboard />} />
          <Route path="/patients" element={<PatientsDashboard />} />
          <Route path="/alerts" element={<AlertsDashboard />} />
          <Route path="/devices" element={<DevicesDashboard />} />
          <Route path="/patient-profiles" element={isNurse ? <Navigate to="/overview" replace /> : <PatientProfile />} />
          <Route path="/patient-profiles/:id" element={isNurse ? <Navigate to="/overview" replace /> : <PatientProfile />} />
          <Route path="*" element={<Navigate to={isNurse ? "/overview" : "/patients"} replace />} />
        </Routes>
      </main>

      {/* Patient Admission Modal Form */}
      <PatientAdmissionModal
        isOpen={isAdmitModalOpen}
        onClose={() => setIsAdmitModalOpen(false)}
        onPatientAdmitted={() => {}}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AlertsProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </AlertsProvider>
    </AuthProvider>
  );
}
