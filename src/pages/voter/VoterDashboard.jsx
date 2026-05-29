import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Vote, Clock, CheckCircle, AlertCircle, Landmark, BarChart2, History, MapPin, Shield, Zap, Lock } from 'lucide-react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { motion } from 'framer-motion';
import ChangePasswordModal from '../../components/ChangePasswordModal.jsx';

const VoterDashboard = () => {
  const [elections, setElections] = useState([]);
  const [voterDetails, setVoterDetails] = useState(null);
  const [constituencyNames, setConstituencyNames] = useState({ naName: '', paName: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);
  
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      if (!user || user.role !== 'voter') { navigate('/login'); return; }

      const voterRef = doc(db, 'voters', user.id);
      const voterSnap = await getDoc(voterRef);
      if (!voterSnap.exists()) { toast.error('Voter profile not found'); logout(); navigate('/login'); return; }
      const vData = voterSnap.data();
      setVoterDetails({ id: voterSnap.id, ...vData });
      
      if (!vData.password) {
        setShowFirstTimeSetup(true);
      }

      let naName = 'Not Assigned', paName = 'Not Assigned';
      if (vData.naConstituencyId) {
        const naSnap = await getDoc(doc(db, 'constituencies', vData.naConstituencyId));
        if (naSnap.exists()) naName = naSnap.data().name;
      }
      if (vData.paConstituencyId) {
        const paSnap = await getDoc(doc(db, 'constituencies', vData.paConstituencyId));
        if (paSnap.exists()) paName = paSnap.data().name;
      }
      setConstituencyNames({ naName, paName });

      const electionSnapshot = await getDocs(collection(db, 'events'));
      const activeElections = electionSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.status === 'active');
      setElections(activeElections);
    } catch (error) {
      console.error('Voter dashboard load error:', error);
      toast.error('Failed to sync voter credentials');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadDashboard();
  }, [isAuthenticated, user]);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const activeElection = elections[0];
  const bothVoted = voterDetails?.hasVotedMNA && voterDetails?.hasVotedMPA;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 text-slate-50 font-sans relative overflow-hidden bg-emerald-950">
      {/* Background Glow */}
      <div className="absolute top-0 left-[50%] w-[80%] h-[50%] bg-emerald-800/10 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">

        {/* ─── Hero Welcome Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl overflow-hidden shadow-glass relative"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-yellow-400 to-emerald-500" />
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-widest mb-2 text-emerald-300/70 flex items-center gap-1.5">
                🇵🇰 E-Voting Digital Polling — Verified Voter
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Assalam-o-Alaikum,
              </h1>
              <h2 className="text-xl font-bold mt-1 glow-text-gold text-yellow-400">{voterDetails?.name}</h2>
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                  <Shield className="h-3 w-3" /> Verified Voter
                </span>
                <span className="text-xs font-mono text-emerald-300/60">
                  CNIC: {voterDetails?.cnic}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <Link to="/voter/results" className="btn-primary text-sm inline-flex items-center justify-center gap-2">
                <BarChart2 className="h-4 w-4" /> Live Results
              </Link>
              <Link to="/voter/history" className="glass-panel px-5 py-2.5 rounded-xl text-sm font-bold text-emerald-300 hover:bg-emerald-800/40 transition-colors flex items-center justify-center gap-2 border border-emerald-500/20">
                <History className="h-4 w-4" /> My Receipts
              </Link>
              <button
                onClick={() => setShowChangePassword(true)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                style={{ background: 'rgba(4,20,13,0.6)', border: '1px solid rgba(16,185,129,0.15)', color: 'rgba(52,211,153,0.7)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.35)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.15)'; e.currentTarget.style.color = 'rgba(52,211,153,0.7)'; }}
              >
                <Lock className="h-4 w-4" /> Change Password
              </button>
            </div>
          </div>
        </motion.div>

        {/* ─── Constituency Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { label: 'National Assembly (MNA)', name: constituencyNames.naName, type: 'NA', voted: voterDetails?.hasVotedMNA },
            { label: 'Provincial Assembly (MPA)', name: constituencyNames.paName, type: 'PA', voted: voterDetails?.hasVotedMPA },
          ].map((c, i) => (
            <motion.div
              key={c.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="glass-panel rounded-2xl p-5 flex items-start gap-4 border border-emerald-500/15 hover:border-emerald-500/30 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20 flex-shrink-0">
                <MapPin className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300/60">{c.label}</p>
                <p className="text-lg font-black text-white mt-1 leading-tight truncate">{c.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  {c.voted ? (
                    <span className="text-[10px] font-bold flex items-center gap-1 text-emerald-400">
                      <CheckCircle className="h-3 w-3" /> Ballot Cast
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold flex items-center gap-1 text-yellow-400">
                      <AlertCircle className="h-3 w-3" /> Pending Vote
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ─── Polling Booth ─── */}
        {!activeElection ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel rounded-3xl p-12 text-center border border-emerald-500/15"
          >
            <div className="mx-auto h-20 w-20 rounded-2xl flex items-center justify-center mb-5 bg-emerald-900/40 border border-emerald-500/20 shadow-inner">
              <Vote className="h-10 w-10 text-emerald-400/50" />
            </div>
            <h3 className="text-2xl font-black text-white">Polling Booth Closed</h3>
            <p className="text-sm mt-2 max-w-md mx-auto text-emerald-200/60">
              No active election polling window. ECP will notify you when polling commences.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel rounded-3xl overflow-hidden shadow-glass relative"
          >
            {/* Active Election Header */}
            <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-emerald-900/20 border-b border-emerald-500/10">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest rounded-full px-3 py-1 bg-red-500/15 border border-red-500/30 text-red-400">
                    <span className="dot-active" /> Live Polling
                  </span>
                  {bothVoted && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">All Ballots Cast ✓</span>
                  )}
                </div>
                <h3 className="text-lg font-black text-white">{activeElection.title}</h3>
                <p className="text-xs mt-0.5 text-emerald-200/60">{activeElection.description}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-300/60 whitespace-nowrap">
                <Clock className="h-3.5 w-3.5" />
                <span>Closes {formatDate(activeElection.endDate)}</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
              <BallotBox
                label="Ballot Green"
                title="National Assembly Seat"
                subtitle={`MNA • ${constituencyNames.naName}`}
                hasVoted={voterDetails?.hasVotedMNA}
                voteLink={`/voter/vote/${activeElection.id}?type=MNA`}
                voteLabel="Cast MNA Ballot"
                color="green"
              />
              <BallotBox
                label="Ballot White"
                title="Provincial Assembly Seat"
                subtitle={`MPA • ${constituencyNames.paName}`}
                hasVoted={voterDetails?.hasVotedMPA}
                voteLink={`/voter/vote/${activeElection.id}?type=MPA`}
                voteLabel="Cast MPA Ballot"
                color="white"
              />
            </div>
          </motion.div>
        )}

        {/* ─── Helpdesk Strip ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4 border border-emerald-500/15"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20">
              <Zap className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">ECP Voter Helpdesk</p>
              <p className="text-xs mt-0.5 text-emerald-200/60">
                View past voting receipts, ECP confirmations, and transaction timestamps
              </p>
            </div>
          </div>
          <Link to="/voter/history" className="text-sm font-black text-yellow-400 hover:text-yellow-300 transition-colors whitespace-nowrap flex items-center gap-2">
            View History →
          </Link>
        </motion.div>

        {/* Change Password Modal */}
        {showChangePassword && (
          <ChangePasswordModal role="voter" onClose={() => setShowChangePassword(false)} />
        )}

        {/* First Time Password Setup Modal */}
        {showFirstTimeSetup && (
          <ChangePasswordModal
            role="voter"
            isFirstTime={true}
            onClose={() => {
              setShowFirstTimeSetup(false);
              setVoterDetails(prev => ({ ...prev, password: 'set' }));
            }}
          />
        )}
      </div>
    </div>
  );
};

const BallotBox = ({ label, title, subtitle, hasVoted, voteLink, voteLabel, color }) => {
  const isGreen = color === 'green';
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300"
      style={{
        background: isGreen ? 'rgba(5, 46, 28, 0.6)' : 'rgba(20,20,20,0.5)',
        border: `1px solid ${isGreen ? 'rgba(16,185,129,0.25)' : 'rgba(200,200,200,0.15)'}`,
      }}
    >
      <div>
        <div className="flex justify-between items-start">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase"
            style={isGreen
              ? { background: 'rgba(5,150,105,0.2)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }
              : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#e5e7eb' }
            }
          >
            {label}
          </span>
          {hasVoted ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" /> Voted
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-bold text-yellow-400 animate-pulse">
              <AlertCircle className="h-3.5 w-3.5" /> Pending
            </span>
          )}
        </div>
        <h4 className="text-base font-black text-white mt-3">{title}</h4>
        <p className="text-[11px] mt-1.5 text-emerald-200/60">{subtitle}</p>
      </div>

      {!hasVoted ? (
        <Link
          to={voteLink}
          className="w-full py-3 rounded-xl text-center text-sm font-black flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.01] hover:brightness-110 active:scale-[0.99]"
          style={isGreen
            ? { background: 'linear-gradient(135deg, #047857, #10b981)', color: 'white', boxShadow: '0 4px 20px -3px rgba(16,185,129,0.4)' }
            : { background: 'rgba(240,240,240,0.95)', color: '#020c07', boxShadow: '0 4px 20px -3px rgba(255,255,255,0.15)' }
          }
        >
          <Vote className="h-4 w-4" /> {voteLabel}
        </Link>
      ) : (
        <div
          className="w-full py-3 rounded-xl text-center text-sm font-bold"
          style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(16,185,129,0.15)', color: 'rgba(52,211,153,0.6)' }}
        >
          ✓ Ballot Recorded by ECP
        </div>
      )}
    </motion.div>
  );
};

export default VoterDashboard;

