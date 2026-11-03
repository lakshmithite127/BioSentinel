import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getStoredToken, setStoredToken, getStoredUser, setStoredUser, onConnectivityChange } from '../api/client';
import { registerSocketUser, disconnectSocket } from '../api/socket';

const AuthContext = createContext();

export function validateBioSentinelEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2 || parts[1] !== 'biosentinel.com') return false;
  const nameParts = parts[0].split('.');
  return nameParts.length >= 2 && nameParts.every(p => p.length >= 2);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getStoredToken());
  const [isServerOffline, setIsServerOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Connectivity listener
  useEffect(() => {
    const unsub = onConnectivityChange((isOnline) => {
      setIsServerOffline(!isOnline);
    });
    return unsub;
  }, []);

  // Check token on mount
  useEffect(() => {
    async function verifyAuth() {
      const storedToken = getStoredToken();
      if (storedToken) {
        try {
          const profile = await api.getMe();
          if (profile && profile._id) {
            const userData = {
              id: profile._id,
              name: profile.name,
              email: profile.email,
              role: profile.role,
              title: profile.title,
              avatar: profile.avatar,
              isAuthenticated: true
            };
            setUser(userData);
            setStoredUser(userData);
            registerSocketUser(userData);
          }
        } catch (err) {
          // Token invalid or expired
          if (!err.message.includes('Server offline')) {
            logout();
          }
        }
      }
      setLoading(false);
    }
    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!validateBioSentinelEmail(cleanEmail)) {
      throw new Error(
        "Invalid email format. Access restricted to 'firstname.lastname@biosentinel.com' (e.g. alexander.wright@biosentinel.com)."
      );
    }

    if (!password || !password.trim()) {
      throw new Error('Please enter your account password.');
    }

    const data = await api.login(cleanEmail, password);
    const authenticatedUser = {
      ...data.user,
      isAuthenticated: true
    };

    setStoredToken(data.token);
    setStoredUser(authenticatedUser);
    setToken(data.token);
    setUser(authenticatedUser);
    registerSocketUser(authenticatedUser);

    return authenticatedUser;
  };

  const logout = () => {
    setStoredToken(null);
    setStoredUser(null);
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && user.isAuthenticated),
        isServerOffline,
        loading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
