import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { getSocket } from '../api/socket';

const AlertsContext = createContext();

export function AlertsProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch alerts & analytics from API
  const refreshData = useCallback(async () => {
    try {
      const [alertsData, analyticsData] = await Promise.all([
        api.getAlerts().catch(() => []),
        api.getAnalytics().catch(() => null)
      ]);
      setAlerts(alertsData || []);
      setAnalytics(analyticsData || null);
    } catch (err) {
      console.warn('[AlertsContext] Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    // Socket.io live listener
    const socket = getSocket();

    const handleAlertCreated = (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev.filter((a) => a.id !== newAlert.id)]);
      api.getAnalytics().then(setAnalytics).catch(() => {});
    };

    const handleAlertUpdated = (updatedAlert) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a))
      );
      api.getAnalytics().then(setAnalytics).catch(() => {});
    };

    socket.on('alert:created', handleAlertCreated);
    socket.on('alert:updated', handleAlertUpdated);

    // Periodic sync fallback
    const interval = setInterval(refreshData, 10000);

    return () => {
      socket.off('alert:created', handleAlertCreated);
      socket.off('alert:updated', handleAlertUpdated);
      clearInterval(interval);
    };
  }, [refreshData]);

  // Acknowledge alert in MongoDB
  const acknowledgeAlert = async (id) => {
    try {
      const res = await api.acknowledgeAlert(id);
      if (res && res.alert) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? res.alert : a)));
      }
      refreshData();
      return res;
    } catch (err) {
      console.error('[AlertsContext] Failed to acknowledge alert:', err);
      throw err;
    }
  };

  // Escalate alert in MongoDB
  const escalateAlert = async (id) => {
    try {
      const res = await api.escalateAlert(id);
      if (res && res.alert) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? res.alert : a)));
      }
      refreshData();
      return res;
    } catch (err) {
      console.error('[AlertsContext] Failed to escalate alert:', err);
      throw err;
    }
  };

  // Computed summary stats
  const stats = {
    unacknowledged: alerts.filter(
      (a) => a.status === 'Unacknowledged' || a.status === 'New'
    ).length,
    critical: alerts.filter((a) => a.alertType === 'Critical').length,
    escalated: alerts.filter((a) => a.status === 'Escalated').length,
    warning: alerts.filter((a) => a.alertType === 'Warning').length,
    total: alerts.length
  };

  return (
    <AlertsContext.Provider
      value={{
        alerts,
        stats,
        analytics,
        loading,
        refreshData,
        acknowledgeAlert,
        escalateAlert
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return context;
}
