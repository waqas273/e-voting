import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Landmark, LogOut, User, Menu, X, Mail, ChevronDown, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';

const Navbar = () => {
  const { isAuthenticated, user, logout, notifications, setShowNotificationDrawer } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const userNotifs = notifications.filter(n => user && user.email && n.recipient.toLowerCase() === user.email.toLowerCase());
  const unreadCount = userNotifs.filter(n => !n.read).length;


  const handleLogout = async () => {
    const proceed = await confirm("Are you sure you want to exit your ECP Portal session?", {
      title: "Exit Session",
      confirmText: "Exit Portal",
      cancelText: "Stay Logged In",
      type: "danger"
    });
    if (!proceed) return;
    setIsOpen(false);
    logout();
    navigate('/login');
  };

  const navLinks = {
    admin: [
      { to: '/admin', label: 'Command' },
      { to: '/admin/constituencies', label: 'Registry' },
      { to: '/admin/approvals', label: 'Approvals' },
      { to: '/admin/overview', label: 'Overview' },
    ],
    party: [
      { to: '/party', label: 'Control Room' },
    ],
    independent: [
      { to: '/candidate', label: 'Candidate Console' },
    ],
    voter: [
      { to: '/voter', label: 'Polling Booth' },
      { to: '/voter/results', label: 'Live Results' },
      { to: '/voter/history', label: 'My Receipts' },
    ],
  };

  const roleLinks = navLinks[user?.role] || [];

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const roleLabel =
    user?.role === 'admin' ? 'ECP Admin' :
    user?.role === 'party' ? `${user?.acronym || 'Party'} Manager` :
    user?.role === 'independent' ? 'Independent Candidate' :
    user?.role === 'voter' ? 'Registered Voter' : user?.role;

  const roleBadgeColor =
    user?.role === 'admin' ? 'from-yellow-400 to-yellow-500' :
    user?.role === 'party' ? 'from-emerald-400 to-emerald-500' :
    user?.role === 'independent' ? 'from-amber-400 to-amber-500' :
    'from-sky-400 to-sky-500';

  return (
    <>
      <nav
        className="sticky top-0 z-50 font-sans"
        style={{
          background: 'rgba(2, 8, 5, 0.85)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid rgba(16, 185, 129, 0.12)',
          boxShadow: '0 4px 30px -5px rgba(0,0,0,0.6), 0 1px 0 rgba(16,185,129,0.06)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[62px]">

            {/* ─── Logo ─── */}
            <Link
              to="/"
              className="flex items-center space-x-3 flex-shrink-0 group"
              onClick={() => setIsOpen(false)}
            >
              <div className="relative">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6,78,59,0.8), rgba(4,120,87,0.6))',
                    border: '1px solid rgba(16,185,129,0.3)',
                    boxShadow: '0 0 15px -3px rgba(250,204,21,0.2)',
                  }}
                >
                  <Landmark className="h-5 w-5 text-yellow-400" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
              </div>
              <div>
                <span className="text-[15px] font-black text-white tracking-tight block">
                  ECP Portal
                </span>
                <span className="text-[9px] text-emerald-400/70 tracking-[0.15em] font-bold uppercase block">
                  Govt. of Pakistan
                </span>
              </div>
            </Link>

            {/* ─── Desktop Nav ─── */}
            <div className="hidden md:flex items-center space-x-1">
              {isAuthenticated ? (
                <>
                  {/* Nav Links */}
                  <div className="flex items-center space-x-0.5 mr-2">
                    {roleLinks.map(link => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className={`px-3.5 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all duration-200 ${
                          isActive(link.to)
                            ? 'text-yellow-400 bg-yellow-400/10'
                            : 'text-emerald-300/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {link.label}
                        {isActive(link.to) && (
                          <span className="block h-0.5 mt-0.5 bg-yellow-400 rounded-full" />
                        )}
                      </Link>
                    ))}
                  </div>

                  {/* Separator */}
                  <div className="h-6 w-px bg-emerald-500/15 mx-1" />

                  {/* Notification Bell */}
                  <button
                    onClick={() => setShowNotificationDrawer(true)}
                    className="relative p-2 rounded-lg text-emerald-300 hover:text-white transition-all hover:bg-white/5"
                    title="ECP Mailbox"
                  >
                    <Mail className="h-4.5 w-4.5" />
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 h-4 w-4 text-[9px] font-black rounded-full flex items-center justify-center animate-bounce"
                        style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#020c07' }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* User Pill */}
                  <div
                    className="flex items-center space-x-2.5 pl-2 pr-3.5 py-1.5 rounded-xl ml-1 cursor-default"
                    style={{
                      background: 'rgba(4, 20, 13, 0.7)',
                      border: '1px solid rgba(16, 185, 129, 0.15)',
                    }}
                  >
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(6,78,59,0.5)', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                      <User className="h-3.5 w-3.5 text-yellow-400" />
                    </div>
                    <div className="hidden lg:block">
                      <p className="text-[12px] font-bold text-white leading-none truncate max-w-[120px]">
                        {user?.name || user?.email || user?.voterId}
                      </p>
                      <p className="text-[10px] text-emerald-400/60 font-medium mt-0.5">{roleLabel}</p>
                    </div>
                  </div>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl ml-1 text-[12px] font-bold transition-all duration-200"
                    style={{
                      background: 'rgba(127, 29, 29, 0.35)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: 'rgba(252,165,165,0.85)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(153, 27, 27, 0.5)';
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(127, 29, 29, 0.35)';
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)';
                      e.currentTarget.style.color = 'rgba(252,165,165,0.85)';
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Exit</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="btn-primary text-[13px]"
                >
                  Sign In to ECP Portal
                </Link>
              )}
            </div>

            {/* ─── Mobile Controls ─── */}
            <div className="flex md:hidden items-center space-x-2">
              {isAuthenticated && (
                <button
                  onClick={() => setShowNotificationDrawer(true)}
                  className="relative p-2 rounded-lg text-emerald-300"
                  style={{ background: 'rgba(4,20,13,0.6)', border: '1px solid rgba(16,185,129,0.12)' }}
                >
                  <Mail className="h-4.5 w-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-yellow-400 text-[9px] text-emerald-950 font-black rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg text-emerald-300 hover:text-white transition-colors"
                style={{ background: 'rgba(4,20,13,0.6)', border: '1px solid rgba(16,185,129,0.12)' }}
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Mobile Menu ─── */}
        {isOpen && (
          <div
            className="md:hidden animate-slide-up"
            style={{
              background: 'rgba(2, 8, 5, 0.97)',
              borderTop: '1px solid rgba(16,185,129,0.1)',
            }}
          >
            <div className="px-4 py-4 space-y-2">
              {isAuthenticated ? (
                <>
                  {/* User info block */}
                  <div
                    className="flex items-center space-x-3 p-3 rounded-xl mb-3"
                    style={{ background: 'rgba(4,20,13,0.8)', border: '1px solid rgba(16,185,129,0.12)' }}
                  >
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(6,78,59,0.5)', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                      <User className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white truncate max-w-[180px]">
                        {user?.name || user?.email || user?.voterId}
                      </p>
                      <p className="text-[10px] text-emerald-400/60 uppercase font-bold tracking-wider">{roleLabel}</p>
                    </div>
                  </div>

                  {/* Nav Links */}
                  <div className="space-y-1">
                    {roleLinks.map(link => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setIsOpen(false)}
                        className={`block px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                          isActive(link.to)
                            ? 'text-yellow-400 bg-yellow-400/10'
                            : 'text-emerald-300/80 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>

                  {/* Logout */}
                  <div className="pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-sm font-bold"
                      style={{
                        background: 'rgba(127,29,29,0.4)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        color: 'rgba(252,165,165,0.9)',
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Exit Session</span>
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block text-center btn-primary w-full"
                >
                  Sign In to ECP Portal
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
