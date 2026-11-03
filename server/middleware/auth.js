const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'biosentinel_clinical_secret_key_2026_telemetry_secure';

// Helper to strictly validate firstname.lastname@biosentinel.com
function isValidBioSentinelEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)+@biosentinel\.com$/i;
  // Specific check: must have at least firstname.lastname before @biosentinel.com
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2 || parts[1] !== 'biosentinel.com') return false;
  const nameParts = parts[0].split('.');
  return nameParts.length >= 2 && nameParts.every(p => p.length >= 2);
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please sign in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token. Please sign in again.' });
    }
    req.user = user;
    next();
  });
}

// Role-based authorization middleware
function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. This action requires role: ${allowed.join(' or ')} (current role: ${req.user.role})`
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  isValidBioSentinelEmail,
  authenticateToken,
  requireRole
};

