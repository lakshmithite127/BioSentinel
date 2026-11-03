import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, AlertCircle, Lock, Mail } from 'lucide-react';
import { useAuth, validateBioSentinelEmail } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      setError('Please enter your BioSentinel email and password.');
      return;
    }

    // Client-side strict validation for firstname.lastname@biosentinel.com
    if (!validateBioSentinelEmail(cleanEmail)) {
      setError(
        "Email must follow the format 'firstname.lastname@biosentinel.com' (e.g. alexander.wright@biosentinel.com)."
      );
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const user = await login(cleanEmail, password);
      // Route user to Nurse Portal or Doctor Portal based on their account role
      if (user.role === 'nurse') {
        navigate('/overview');
      } else {
        navigate('/patients');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-split-page">
      {/* Left Hero Pane */}
      <div className="login-hero-pane">
        <img
          src="/doctor.jpg"
          alt="BioSentinel Telemetry Specialist"
          className="login-hero-bg"
        />
        <div className="login-hero-overlay" />

        {/* Top Spacer */}
        <div />

        {/* Bottom Brand Wordmark */}
        <div className="hero-brand-bottom">
          <img src="/logo-capsule.svg" alt="BioSentinel Capsule" className="hero-capsule-logo" />
          <span className="hero-brand-text">BIOSENTINEL</span>
        </div>
      </div>

      {/* Right Login Card Pane */}
      <div className="login-card-pane">
        <div className="login-card-inner">
          {/* Capsule Icon */}
          <img src="/logo-capsule.svg" alt="BioSentinel Icon" className="login-capsule-icon" />

          {/* Heading */}
          <h1 className="login-heading">Hospital Staff Portal</h1>
          <p className="login-subheading">
            Dual-role telemetry dashboard for hospital telemetry & ICU wards
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} className="login-form">
            {error && (
              <div
                style={{
                  padding: '12px 14px',
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  lineHeight: '1.4'
                }}
              >
                <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                <span>Staff Email Address</span>
              </label>
              <div className="form-input-container">
                <input
                  type="email"
                  placeholder="firstname.lastname@biosentinel.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className="form-input"
                  required
                  autoFocus
                />
              </div>
              <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Required format: <code>firstname.lastname@biosentinel.com</code>
              </span>
            </div>

            <div className="form-group">
              <div className="form-label">
                <span>Password</span>
                <span style={{ color: '#005e9e', fontSize: '0.82rem', fontWeight: 500 }}>
                  Hospital Single Sign-On
                </span>
              </div>
              <div className="form-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your clinical account password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="form-input"
                  required
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-login-submit" disabled={isLoading}>
              {isLoading ? 'Authenticating...' : 'Sign In to Ward Dashboard'}
            </button>

            {/* Test Credentials Reference Note */}
            <div
              style={{
                marginTop: '20px',
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#475569'
              }}
            >
              <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={14} color="#005e9e" />
                <span>Default Seed Accounts (Password: <code>Password@2026</code>)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.74rem' }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#0369a1' }}>🩺 Doctor Portal:</span>
                  <div>alexander.wright@biosentinel.com</div>
                  <div>sarah.connor@biosentinel.com</div>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#15803d' }}>📋 Nurse Portal:</span>
                  <div>elena.rostova@biosentinel.com</div>
                  <div>marcus.vance@biosentinel.com</div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
