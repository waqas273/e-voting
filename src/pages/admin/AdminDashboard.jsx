import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Play, Plus, Eye, Square, Trash2, Landmark, Shield, Users, Award, Activity, Zap, ChevronRight, Lock } from 'lucide-react';
import { toast } from 'react-toastify';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { motion } from 'framer-motion';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import ChangePasswordModal from '../../components/ChangePasswordModal.jsx';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [constituencyCount, setConstituencyCount] = useState(0);
  const [partyCount, setPartyCount] = useState(0);
  const [voterCount, setVoterCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const eventsQuery = query(collection(db, 'events'), orderBy('startDate', 'desc'));
      const eventsSnapshot = await getDocs(eventsQuery);
      const loadedEvents = eventsSnapshot.docs.map(docSnap => ({ id: docSnap.id, _id: docSnap.id, ...docSnap.data() }));
      setEvents(loadedEvents);
      const consts = await getDocs(collection(db, 'constituencies'));
      setConstituencyCount(consts.size);
      const parties = await getDocs(collection(db, 'parties'));
      setPartyCount(parties.size);
      const voters = await getDocs(collection(db, 'voters'));
      setVoterCount(voters.size);
    } catch (err) {
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
      console.error('Dashboard load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleStatusChange = async (eventId, status) => {
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, { status });
      setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, status } : ev));
      toast.success(`Election event ${status === 'active' ? 'started' : 'ended'} successfully!`);
    } catch (err) {
      toast.error('Failed to update event status');
      console.error(err);
    }
  };

  const handleDeleteEvent = async (eventId, title) => {
    const isConfirmed = await confirm(`Are you sure you want to permanently delete "${title}"?`, {
      title: 'Delete Election Event',
      confirmText: 'Delete Event',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await deleteDoc(doc(db, 'events', eventId));
      setEvents(prev => prev.filter(ev => ev.id !== eventId));
      toast.success('Event deleted successfully');
    } catch (err) {
      toast.error('Failed to delete event');
      console.error(err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const statusConfig = {
    active:   { label: 'Active',   cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'dot-active' },
    inactive: { label: 'Inactive', cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30',  dot: 'dot-inactive' },
    closed:   { label: 'Closed',   cls: 'bg-red-500/20 text-red-400 border-red-500/30',   dot: 'dot-closed' },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const activeEventsCount = events.filter(e => e.status === 'active').length;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 text-slate-50 font-sans relative overflow-hidden bg-emerald-950">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[50%] w-[50%] h-[50%] bg-emerald-800/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">

        {/* ─── Header ─── */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-2xl"
        >
          <div>
            <div className="flex items-center gap-4 mb-4 sm:mb-0">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20 shadow-inner">
                <Landmark className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black glow-text-gold tracking-wide uppercase">ECP Administrative Command</h1>
                <p className="text-emerald-300 text-xs mt-1 font-semibold uppercase tracking-wider">Manage elections, constituencies, and candidates</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowChangePassword(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
              style={{ background: 'rgba(4,20,13,0.6)', border: '1px solid rgba(16,185,129,0.2)', color: 'rgba(52,211,153,0.7)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.4)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)'; e.currentTarget.style.color = 'rgba(52,211,153,0.7)'; }}
            >
              <Lock className="h-4 w-4" /> Change Password
            </button>
            <Link to="/admin/events/create" className="btn-primary text-sm inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" /> Create Election
            </Link>
          </div>
        </motion.div>

        {/* ─── Stats ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Constituencies', value: constituencyCount, icon: Landmark, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Registered Voters', value: voterCount, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Parties', value: partyCount, icon: Shield, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Elections', value: events.length, icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-500/10', sub: activeEventsCount > 0 ? `${activeEventsCount} Active` : undefined },
          ].map((s, i) => (
            <motion.div 
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5 relative overflow-hidden group"
            >
              <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${s.color}`}>
                <s.icon className="w-16 h-16" />
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 border border-white/5 ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-3xl font-black text-white">{s.value}</p>
              <p className="text-xs font-bold uppercase tracking-widest mt-1 text-emerald-200/70">{s.label}</p>
              {s.sub && (
                <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                  <span className="dot-active mr-1.5 h-1.5 w-1.5" /> {s.sub}
                </span>
              )}
            </motion.div>
          ))}
        </div>

        {/* ─── Quick Action Cards ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6 flex cursor-pointer hover:bg-emerald-900/60 group" 
            onClick={() => navigate('/admin/constituencies')}
          >
            <div className="h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20 mr-4 group-hover:scale-110 transition-transform">
              <Landmark className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-white group-hover:text-yellow-400 transition-colors">
                Constituency & Voter Registry
              </h3>
              <p className="text-xs mt-1 leading-relaxed text-emerald-200/60">
                Add National Assembly (NA) and Provincial Assembly seats. Upload CNIC voters by Halka.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-yellow-400 uppercase tracking-widest mt-3">
                Configure Halkas <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6 flex cursor-pointer hover:bg-emerald-900/60 group" 
            onClick={() => navigate('/admin/approvals')}
          >
            <div className="h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20 mr-4 group-hover:scale-110 transition-transform">
              <Shield className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-white group-hover:text-yellow-400 transition-colors">
                ECP Approvals Desk
              </h3>
              <p className="text-xs mt-1 leading-relaxed text-emerald-200/60">
                Authorize party registrations and candidate nominations. Auto-notifies managers via ECP mailbox.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-yellow-400 uppercase tracking-widest mt-3">
                Review Requests <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6 flex cursor-pointer hover:bg-emerald-900/60 group" 
            onClick={() => navigate('/admin/overview')}
          >
            <div className="h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20 mr-4 group-hover:scale-110 transition-transform">
              <Activity className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-white group-hover:text-yellow-400 transition-colors">
                Real-Time Overview
              </h3>
              <p className="text-xs mt-1 leading-relaxed text-emerald-200/60">
                Read-only analysis desk for all NAs/PAs. Tracks candidate registries, party stats, and voter lists.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-yellow-400 uppercase tracking-widest mt-3">
                Explore Analytics <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </motion.div>
        </div>

        {/* ─── Elections Table ─── */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-panel rounded-2xl overflow-hidden"
        >
          <div className="px-5 sm:px-6 py-4 flex items-center justify-between border-b border-emerald-500/10 bg-emerald-900/20">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-yellow-400" />
              <h2 className="text-lg font-black text-white">General Election Events</h2>
            </div>
            {activeEventsCount > 0 && (
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest rounded-full px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400">
                <span className="dot-active mr-1 h-1.5 w-1.5" />
                {activeEventsCount} Live
              </span>
            )}
          </div>

          {events.length === 0 && !error ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 bg-emerald-900/40 border border-emerald-500/20 shadow-inner">
                <Calendar className="h-8 w-8 text-emerald-400/50" />
              </div>
              <h3 className="text-xl font-black text-white">No Elections Created</h3>
              <p className="text-sm mt-2 text-emerald-200/50">
                Get started by setting up a general election event.
              </p>
              <Link to="/admin/events/create" className="btn-primary inline-flex mt-6 text-sm">
                <Plus className="h-4 w-4 mr-2" /> Create Election Event
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-emerald-950/40 border-b border-emerald-500/10 text-xs uppercase tracking-wider text-emerald-400 font-bold">
                  <tr>
                    <th className="px-6 py-4">Election Event</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Polling Window</th>
                    <th className="px-6 py-4">Votes Cast</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/10">
                  {events.map((event, idx) => {
                    const cfg = statusConfig[event.status] || statusConfig.inactive;
                    const totalVotes = (event.totalMNAVotes || 0) + (event.totalMPAVotes || 0);
                    return (
                      <motion.tr 
                        key={event.id} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 + (idx * 0.05) }}
                        className="hover:bg-emerald-900/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-black text-white">{event.title}</div>
                          {event.description && (
                            <div className="text-xs mt-1 max-w-xs truncate text-emerald-200/50">
                              {event.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${cfg.cls}`}>
                            <span className={cfg.dot} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-emerald-200/60 space-y-1">
                            <div>Start: <span className="text-emerald-100">{formatDate(event.startDate)}</span></div>
                            <div>End: <span className="text-emerald-100">{formatDate(event.endDate)}</span></div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-base font-black text-white">{totalVotes.toLocaleString()}</div>
                          <div className="text-[10px] font-bold text-emerald-200/40 mt-1 tracking-wider">
                            MNA: {event.totalMNAVotes || 0} &middot; MPA: {event.totalMPAVotes || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2.5">
                            <Link
                              to={`/admin/events/${event.id}`}
                              className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-all flex items-center justify-center"
                              title="View Live Results"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>

                            {event.status === 'inactive' && (
                              <button
                                onClick={() => handleStatusChange(event.id, 'active')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-md hover:shadow-emerald-600/20"
                                title="Commence Polling"
                              >
                                <Play className="h-3 w-3 fill-current" />
                                Start Polling
                              </button>
                            )}

                            {event.status === 'active' && (
                              <button
                                onClick={() => handleStatusChange(event.id, 'closed')}
                                className="px-3 py-1.5 bg-red-650 hover:bg-red-700 border border-red-500/30 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-md hover:shadow-red-650/20 animate-pulse"
                                title="Conclude Polling"
                              >
                                <Square className="h-3 w-3 fill-current" />
                                Stop Polling
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteEvent(event.id, event.title)}
                              className="p-2 rounded-lg bg-red-550/10 border border-red-500/15 text-red-400 hover:bg-red-650/20 hover:text-white transition-all flex items-center justify-center"
                              title="Delete Election"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <div className="p-4 m-6 rounded-xl text-sm font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
              {error}
            </div>
          )}
        </motion.div>

      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal role="admin" onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
};

export default AdminDashboard;
