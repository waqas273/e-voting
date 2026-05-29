import React, { useEffect } from 'react';
import { X, Trash2, Mail, Clock, CheckCircle, Inbox, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const typeConfig = {
  ballot:   { color: '#34d399', bg: 'rgba(5,150,105,0.12)', border: 'rgba(16,185,129,0.25)', label: 'Ballot Receipt' },
  approval: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  label: 'ECP Decision' },
  default:  { color: '#a78bfa', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)', label: 'ECP Notice' },
};

const NotificationDrawer = () => {
  const { notifications: rawNotifications, showNotificationDrawer, setShowNotificationDrawer, clearNotifications, markAllRead, user } = useAuth();

  if (!showNotificationDrawer) return null;

  const notifications = rawNotifications.filter(n => user && n.recipient.toLowerCase() === user.email.toLowerCase());

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleClose = () => {
    markAllRead();
    setShowNotificationDrawer(false);
  };

  const formatDate = (isoString) =>
    new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={handleClose}
      />

      {/* Drawer Panel */}
      <div
        className="relative ml-auto h-full w-full max-w-md flex flex-col animate-slide-up"
        style={{
          background: 'rgba(2, 8, 5, 0.97)',
          borderLeft: '1px solid rgba(16,185,129,0.15)',
          boxShadow: '-20px 0 60px -10px rgba(0,0,0,0.8)',
          animationDuration: '0.3s',
        }}
      >
        {/* ─── Header ─── */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(16,185,129,0.1)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}
            >
              <Mail className="h-4.5 w-4.5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">ECP Mail Simulator</h2>
              <p className="text-[10px]" style={{ color: 'rgba(52,211,153,0.5)' }}>
                Official ECP notifications & receipts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span
                className="text-[10px] font-black rounded-full px-2 py-0.5"
                style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}
              >
                {unreadCount} New
              </span>
            )}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(4,20,13,0.6)', border: '1px solid rgba(16,185,129,0.1)', color: 'rgba(52,211,153,0.6)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ─── Toolbar ─── */}
        <div
          className="flex items-center justify-between px-5 py-2.5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(16,185,129,0.07)', background: 'rgba(4,20,13,0.4)' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(52,211,153,0.4)' }}>
            {notifications.length} message{notifications.length !== 1 ? 's' : ''}
          </span>
          {notifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="flex items-center gap-1 text-[10px] font-bold transition-all"
              style={{ color: 'rgba(239,68,68,0.6)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.6)'; }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </button>
          )}
        </div>

        {/* ─── Email List ─── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 px-6">
              <div
                className="h-20 w-20 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(4,20,13,0.8)', border: '1px solid rgba(16,185,129,0.08)' }}
              >
                <Inbox className="h-10 w-10" style={{ color: 'rgba(16,185,129,0.2)' }} />
              </div>
              <h3 className="text-base font-black text-white">Inbox Empty</h3>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: 'rgba(52,211,153,0.4)' }}>
                ECP official emails (ballot receipts, approvals, notices) will appear here in real-time.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const cfg = typeConfig[notif.type] || typeConfig.default;
              return (
                <div
                  key={notif.id}
                  className="rounded-xl overflow-hidden transition-all duration-200"
                  style={{
                    background: notif.read ? 'rgba(4,15,10,0.6)' : cfg.bg,
                    border: `1px solid ${notif.read ? 'rgba(16,185,129,0.08)' : cfg.border}`,
                  }}
                >
                  {/* Type bar */}
                  {!notif.read && (
                    <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${cfg.color}, transparent)` }} />
                  )}

                  {/* Meta */}
                  <div
                    className="px-4 py-3 flex justify-between items-start gap-3"
                    style={{ borderBottom: '1px solid rgba(16,185,129,0.06)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-[9px] font-black uppercase tracking-widest rounded px-1.5 py-0.5"
                          style={{ background: `${cfg.bg}`, border: `1px solid ${cfg.border}`, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                        {!notif.read && (
                          <span className="text-[9px] font-black text-yellow-400 uppercase">● New</span>
                        )}
                      </div>
                      <p className="text-sm font-black text-white leading-snug">{notif.subject}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(52,211,153,0.45)' }}>
                        To: {notif.recipient}
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-1 text-[10px] flex-shrink-0"
                      style={{ color: 'rgba(52,211,153,0.35)' }}
                    >
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(notif.timestamp)}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div
                    className="px-4 py-3 text-xs leading-relaxed"
                    style={{ color: 'rgba(200,220,210,0.7)' }}
                    dangerouslySetInnerHTML={{ __html: notif.body }}
                  />

                  {/* Footer */}
                  <div
                    className="px-4 py-2 flex items-center justify-between"
                    style={{ borderTop: '1px solid rgba(16,185,129,0.05)', background: 'rgba(2,8,5,0.4)' }}
                  >
                    <span className="text-[9px]" style={{ color: 'rgba(52,211,153,0.3)' }}>
                      official@ecp.gov.pk
                    </span>
                    {notif.read && (
                      <span className="flex items-center gap-1 text-[9px]" style={{ color: 'rgba(52,211,153,0.35)' }}>
                        <CheckCircle className="h-3 w-3" /> Read
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── Footer ─── */}
        <div
          className="px-5 py-3 text-center text-[10px] flex-shrink-0"
          style={{ borderTop: '1px solid rgba(16,185,129,0.08)', color: 'rgba(52,211,153,0.3)' }}
        >
          <Shield className="h-3 w-3 inline mr-1" />
          ECP Simulation Console © 2026 • Govt. of Pakistan
        </div>
      </div>
    </div>
  );
};

export default NotificationDrawer;
