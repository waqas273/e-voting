// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { sendEmail } from '../services/emailService.js';

const AuthContext = createContext(null);

// Helper: read all notifications from localStorage
const readNotifsFromStorage = () => {
  try {
    const raw = localStorage.getItem('simulated_notifications');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [notifications, setNotifications] = useState([]);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  // Track if we have already shown the "you have unread" toast on this login
  const loginNotifShownRef = useRef(false);

  // On mount: restore user and notifications
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setNotifications(readNotifsFromStorage());
  }, []);

  // Whenever the user changes (login/logout), refresh notifications from storage
  // and show the drawer if the user has unread messages waiting
  useEffect(() => {
    if (!user) {
      loginNotifShownRef.current = false;
      return;
    }
    // Re-read from localStorage so any messages sent while this user was offline appear
    const fresh = readNotifsFromStorage();
    setNotifications(fresh);

    // Check if this user has unread notifications – if so, open drawer once on login
    if (!loginNotifShownRef.current) {
      const userUnread = fresh.filter(
        n => n.recipient.toLowerCase() === user.email?.toLowerCase() && !n.read
      );
      if (userUnread.length > 0) {
        // Small delay so page renders first
        setTimeout(() => setShowNotificationDrawer(true), 800);
      }
      loginNotifShownRef.current = true;
    }
  }, [user?.email]);

  // Poll localStorage every 5s to pick up notifications sent by other sessions
  // (e.g. admin approves party in one tab; party sees notification in their tab)
  useEffect(() => {
    if (!user?.email) return;

    const interval = setInterval(() => {
      const fresh = readNotifsFromStorage();
      setNotifications(prev => {
        // Only update state if something actually changed (avoid unnecessary re-renders)
        const prevCount = prev.length;
        const newCount = fresh.length;
        if (newCount === prevCount) return prev;

        // Check if there are NEW unread messages for this user
        const userEmail = user.email?.toLowerCase();
        const prevUserIds = new Set(prev.filter(n => n.recipient.toLowerCase() === userEmail).map(n => n.id));
        const newUserNotifs = fresh.filter(n => n.recipient.toLowerCase() === userEmail && !prevUserIds.has(n.id));

        if (newUserNotifs.length > 0) {
          // New notification arrived for this user — auto-open the drawer
          setShowNotificationDrawer(true);
        }

        return fresh;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.email]);



  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setShowNotificationDrawer(false);
  };

  const triggerEmailNotification = (subject, recipient, body, type = 'general', extraParams = {}) => {
    let simulatedBody = body;
    if (extraParams && Object.keys(extraParams).length > 0) {
      simulatedBody = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #f1f5f9;">
          <h4 style="color: #fbbf24; border-bottom: 1px solid rgba(16,185,129,0.2); padding-bottom: 8px; text-transform: uppercase;">${extraParams.title || 'ECP Portal Notification'}</h4>
          <p>Dear <strong>${extraParams.recipient_name || 'Citizen'}</strong>,</p>
          <p>${extraParams.message_body || ''}</p>
      `;
      if (extraParams.detail_label_1) {
        simulatedBody += `
          <div style="background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.1); border-radius: 8px; padding: 12px; margin: 15px 0;">
            <table style="width: 100%; font-size: 12px;">
              <tr>
                <td style="color: rgba(52,211,153,0.6);">${extraParams.detail_label_1}:</td>
                <td style="text-align: right; font-weight: bold; color: #fff;">${extraParams.detail_value_1}</td>
              </tr>
        `;
        if (extraParams.detail_label_2) {
          simulatedBody += `
              <tr>
                <td style="color: rgba(52,211,153,0.6);">${extraParams.detail_label_2}:</td>
                <td style="text-align: right; font-weight: bold; color: #fff;">${extraParams.detail_value_2}</td>
              </tr>
          `;
        }
        if (extraParams.detail_label_3) {
          simulatedBody += `
              <tr>
                <td style="color: rgba(52,211,153,0.6);">${extraParams.detail_label_3}:</td>
                <td style="text-align: right; font-weight: bold; color: #fff;">${extraParams.detail_value_3}</td>
              </tr>
          `;
        }
        simulatedBody += `
            </table>
          </div>
        `;
      }
      if (extraParams.rejection_reason) {
        simulatedBody += `
          <div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-left: 4px solid #ef4444; padding: 12px; border-radius: 6px; margin: 15px 0; font-size: 12px;">
            <strong style="color: #fca5a5; display: block;">Rejection Reason:</strong>
            <span style="color: #fee2e2;">${extraParams.rejection_reason}</span>
          </div>
        `;
      }
      simulatedBody += `</div>`;
    }

    const newNotif = {
      id: Date.now().toString(),
      subject,
      recipient,
      body: simulatedBody,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      localStorage.setItem('simulated_notifications', JSON.stringify(updated));
      return updated;
    });
    
    // Only auto-open the notification drawer if the recipient IS the currently logged-in user
    // (Don't open admin's drawer when sending a notification to a party manager)
    setUser(currentUser => {
      if (currentUser && currentUser.email?.toLowerCase() === recipient.toLowerCase()) {
        setShowNotificationDrawer(true);
      }
      return currentUser; // no change
    });

    // Call real EmailJS Service
    const emailParams = {
      subject,
      to_email: recipient,
      recipient_name: extraParams.recipient_name || 'Citizen',
      title: extraParams.title || 'Election Commission of Pakistan',
      message_body: extraParams.message_body || '',
      detail_label_1: extraParams.detail_label_1 || '',
      detail_value_1: extraParams.detail_value_1 || '',
      detail_label_2: extraParams.detail_label_2 || '',
      detail_value_2: extraParams.detail_value_2 || '',
      detail_label_3: extraParams.detail_label_3 || '',
      detail_value_3: extraParams.detail_value_3 || '',
      rejection_reason: extraParams.rejection_reason || ''
    };
    
    sendEmail(emailParams).catch(err => {
      console.error('Failed to send real email notification:', err);
    });
  };

  const clearNotifications = () => {
    if (!user) return;
    setNotifications(prev => {
      const updated = prev.filter(n => n.recipient.toLowerCase() !== user.email.toLowerCase());
      localStorage.setItem('simulated_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const markAllRead = () => {
    if (!user) return;
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.recipient.toLowerCase() === user.email?.toLowerCase() ? { ...n, read: true } : n
      );
      localStorage.setItem('simulated_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isAuthenticated: !!token, 
      login, 
      logout,
      notifications,
      triggerEmailNotification,
      clearNotifications,
      markAllRead,
      showNotificationDrawer,
      setShowNotificationDrawer
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
