import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, Users, CheckCircle, BarChart2, Award, TrendingUp, Shield, Mail, FileText, User, Hash, Compass, ArrowRight, Lock } from 'lucide-react';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { motion } from 'framer-motion';
import ChangePasswordModal from '../../components/ChangePasswordModal.jsx';

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [candidateDetails, setCandidateDetails] = useState(null);
  const [constituencyDetails, setConstituencyDetails] = useState(null);
  const [contenders, setContenders] = useState([]);
  const [totalVoters, setTotalVoters] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      if (!user || user.role !== 'independent') {
        navigate('/login');
        return;
      }

      // 1. Fetch Candidate Details
      const candRef = doc(db, 'candidates', user.id);
      const candSnap = await getDoc(candRef);
      if (!candSnap.exists()) {
        toast.error('Independent candidate profile not found');
        navigate('/login');
        return;
      }
      const candData = candSnap.data();
      setCandidateDetails({ id: candSnap.id, ...candData });

      // 2. Fetch Constituency Details
      const constRef = doc(db, 'constituencies', candData.constituencyId);
      const constSnap = await getDoc(constRef);
      let constData = null;
      if (constSnap.exists()) {
        constData = constSnap.data();
        setConstituencyDetails({ id: constSnap.id, ...constData });
      }

      // 3. Fetch Contenders in the same constituency (status: approved)
      const contendersQuery = query(
        collection(db, 'candidates'),
        where('constituencyId', '==', candData.constituencyId),
        where('status', '==', 'approved')
      );
      const contendersSnap = await getDocs(contendersQuery);
      const contendersList = contendersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      contendersList.sort((a, b) => b.voteCount - a.voteCount);
      setContenders(contendersList);

      // 4. Fetch Voters in the same constituency
      if (constData) {
        const fieldName = constData.type === 'national' ? 'naConstituencyId' : 'paConstituencyId';
        const votersQuery = query(
          collection(db, 'voters'),
          where(fieldName, '==', candData.constituencyId)
        );
        const votersSnap = await getDocs(votersQuery);
        setTotalVoters(votersSnap.size);
      }
    } catch (err) {
      console.error('Error loading candidate statistics:', err);
      toast.error('Failed to load candidate dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Calculate statistics
  const totalVotesCast = contenders.reduce((acc, curr) => acc + (curr.voteCount || 0), 0);
  const candidateVotes = candidateDetails?.voteCount || 0;
  const turnoutPercentage = totalVoters > 0 ? ((totalVotesCast / totalVoters) * 100).toFixed(1) : '0.0';
  const voteSharePercentage = totalVotesCast > 0 ? ((candidateVotes / totalVotesCast) * 100).toFixed(1) : '0.0';
  const leaderboardIndex = contenders.findIndex(c => c.id === candidateDetails?.id);
  const positionString = leaderboardIndex !== -1 ? `${leaderboardIndex + 1}` : 'N/A';

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 text-slate-50 font-sans relative overflow-hidden bg-emerald-950">
      {/* Background Glow */}
      <div className="absolute top-0 left-[50%] w-[80%] h-[50%] bg-emerald-800/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-6 relative z-10 animate-fade-in">
        
        {/* Hero Welcome Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl overflow-hidden shadow-glass relative"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-yellow-400 to-emerald-500" />
          <div className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 flex-col sm:flex-row text-center sm:text-left">
              <div className="h-20 w-20 rounded-2xl bg-emerald-900 border-2 border-yellow-500/30 flex items-center justify-center overflow-hidden relative shadow-lg">
                {candidateDetails?.profilePictureUrl ? (
                  <img src={candidateDetails.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-emerald-400/50" />
                )}
                {candidateDetails?.symbolUrl && (
                  <div className="absolute bottom-0 right-0 h-6 w-6 bg-white/95 rounded-tl-lg border-t border-l border-emerald-500/10 p-0.5 flex items-center justify-center">
                    <img src={candidateDetails.symbolUrl} alt="" className="h-full w-full object-contain" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1 text-emerald-300/70 flex items-center gap-1.5 justify-center sm:justify-start">
                  🇵🇰 ECP Candidate Console &bull; Approved
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {candidateDetails?.name}
                </h1>
                <p className="text-xs italic text-yellow-400/90 font-semibold mt-1">
                  "{candidateDetails?.motto || 'Serving the people with integrity.'}"
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/10 border border-amber-450/30 text-yellow-400 flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-yellow-400" /> Independent Nominee
                  </span>
                  <span className="text-xs font-mono text-emerald-350">
                    CNIC: {candidateDetails?.cnic}
                  </span>
                  <span className="text-xs font-mono text-emerald-350">
                    ID: {candidateDetails?.candidateId}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <button 
                onClick={loadData}
                className="btn-primary text-xs inline-flex items-center justify-center gap-2"
              >
                <TrendingUp className="h-4 w-4" /> Refresh Statistics
              </button>
              <button
                onClick={() => setShowChangePassword(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                style={{ background: 'rgba(4,20,13,0.6)', border: '1px solid rgba(16,185,129,0.2)', color: 'rgba(52,211,153,0.7)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.4)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)'; e.currentTarget.style.color = 'rgba(52,211,153,0.7)'; }}
              >
                <Lock className="h-4 w-4" /> Change Password
              </button>
            </div>
          </div>
        </motion.div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { 
              label: 'Your Vote Count', 
              value: candidateVotes.toLocaleString(), 
              sub: `Share: ${voteSharePercentage}% of cast`, 
              icon: BarChart2, 
              color: 'text-yellow-400', 
              bg: 'bg-yellow-500/10 border-yellow-500/20' 
            },
            { 
              label: 'Position in Halka', 
              value: `#${positionString}`, 
              sub: contenders.length > 0 ? `Out of ${contenders.length} candidates` : 'N/A', 
              icon: Award, 
              color: 'text-emerald-400', 
              bg: 'bg-emerald-500/10 border-emerald-500/20' 
            },
            { 
              label: 'Total Halka Voters', 
              value: totalVoters.toLocaleString(), 
              sub: `Turnout: ${turnoutPercentage}%`, 
              icon: Users, 
              color: 'text-blue-400', 
              bg: 'bg-blue-500/10 border-blue-500/20' 
            },
            { 
              label: 'Total Ballots Cast', 
              value: totalVotesCast.toLocaleString(), 
              sub: `Remaining: ${(totalVoters - totalVotesCast).toLocaleString()}`, 
              icon: CheckCircle, 
              color: 'text-purple-400', 
              bg: 'bg-purple-500/10 border-purple-500/20' 
            },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              className={`stat-card rounded-2xl p-5 border text-left relative overflow-hidden ${stat.bg}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-350">{stat.label}</p>
                  <p className="text-2xl font-black text-white mt-2 leading-none">{stat.value}</p>
                  <p className="text-xxs text-emerald-400 mt-2 font-medium">{stat.sub}</p>
                </div>
                <div className={`p-2 rounded-xl bg-black/20 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Live Leaderboard Progress bars */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="glass-panel rounded-2xl p-6 space-y-6"
            >
              <div>
                <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-yellow-500" />
                  Halka Standing Leaderboard
                </h2>
                <p className="text-xs text-emerald-350">Real-time vote distribution across all approved contenders</p>
              </div>

              <div className="space-y-4">
                {contenders.map((c, index) => {
                  const isCurrentCandidate = c.id === candidateDetails?.id;
                  const votePercentage = totalVotesCast > 0 ? ((c.voteCount || 0) / totalVotesCast) * 100 : 0;
                  const isLeading = index === 0;

                  return (
                    <div 
                      key={c.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrentCandidate 
                          ? 'bg-yellow-500/10 border-yellow-450/45 shadow-[0_0_15px_rgba(251,191,36,0.15)] scale-[1.01]' 
                          : 'bg-emerald-950/30 border-emerald-500/10'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-xs font-black font-mono h-5 w-5 flex items-center justify-center rounded-full ${
                            index === 0 ? 'bg-yellow-400 text-emerald-950' : 
                            index === 1 ? 'bg-slate-300 text-emerald-950' : 
                            index === 2 ? 'bg-amber-600 text-white' : 
                            'bg-emerald-900/60 text-emerald-300'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="h-8 w-8 rounded-lg bg-emerald-950 border border-emerald-500/25 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                            {c.profilePictureUrl ? (
                              <img src={c.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-4 w-4 text-emerald-450" />
                            )}
                            {c.symbolUrl && (
                              <div className="absolute bottom-0 right-0 h-3 w-3 bg-white/95 rounded-tl p-0.5 flex items-center justify-center">
                                <img src={c.symbolUrl} alt="" className="h-full w-full object-contain" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">
                              {c.name} {isCurrentCandidate && <span className="text-yellow-400 text-xxs font-black uppercase tracking-wider ml-1">(YOU)</span>}
                            </span>
                            <span className="text-[10px] text-emerald-400">
                              {c.partyAcronym || 'Independent'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-white block">
                            {(c.voteCount || 0).toLocaleString()} votes
                          </span>
                          <span className="text-[10px] text-emerald-400">
                            {votePercentage.toFixed(1)}% Share
                          </span>
                        </div>
                      </div>

                      {/* Custom Progress bar */}
                      <div className="live-bar h-2.5 w-full bg-emerald-950 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.max(votePercentage, 2)}%` }} 
                          className={`live-bar-fill h-full rounded-full transition-all duration-500 ${isLeading ? 'leading' : ''}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Halka Info, Election Symbol, Motto details */}
          <div className="space-y-6">
            
            {/* Constituency Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="glass-panel rounded-2xl p-6 space-y-4"
            >
              <h3 className="text-xs font-black text-emerald-350 uppercase tracking-widest border-b border-emerald-500/10 pb-2">
                Your Registered Constituency
              </h3>
              {constituencyDetails ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 flex-shrink-0">
                      <Landmark className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-white leading-tight">{constituencyDetails.name}</p>
                      <p className="text-xxs font-black text-yellow-400 uppercase mt-0.5 tracking-wider">
                        {constituencyDetails.type === 'national' ? 'National Assembly Seat (MNA)' : 'Provincial Assembly Seat (MPA)'}
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-emerald-500/10 space-y-2.5 text-xs">
                    <div className="pt-2.5 flex justify-between">
                      <span className="text-emerald-400">Constituency Title</span>
                      <span className="text-white font-semibold text-right max-w-[150px] truncate" title={constituencyDetails.constituencyName}>
                        {constituencyDetails.constituencyName}
                      </span>
                    </div>
                    <div className="pt-2.5 flex justify-between">
                      <span className="text-emerald-400">District Boundary</span>
                      <span className="text-white font-semibold">{constituencyDetails.district}</span>
                    </div>
                    <div className="pt-2.5 flex justify-between">
                      <span className="text-emerald-400">Province Domain</span>
                      <span className="text-white font-semibold">{constituencyDetails.province}</span>
                    </div>
                    <div className="pt-2.5 flex justify-between">
                      <span className="text-emerald-400">Voters Assigned</span>
                      <span className="text-white font-semibold">{totalVoters.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-emerald-450 italic">Loading constituency parameters...</p>
              )}
            </motion.div>

            {/* Campaign Symbol & Motto Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 }}
              className="glass-panel rounded-2xl p-6 space-y-5"
            >
              <h3 className="text-xs font-black text-emerald-350 uppercase tracking-widest border-b border-emerald-500/10 pb-2">
                Electoral Brand & Symbol
              </h3>
              
              <div className="flex flex-col items-center text-center p-4 bg-emerald-950/40 border border-emerald-500/15 rounded-xl space-y-3">
                <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center p-2.5 shadow-inner">
                  {candidateDetails?.symbolUrl ? (
                    <img src={candidateDetails.symbolUrl} alt={candidateDetails.symbolName} className="h-full w-full object-contain filter drop-shadow" />
                  ) : (
                    <Compass className="h-10 w-10 text-emerald-950" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">{candidateDetails?.symbolName}</h4>
                  <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mt-0.5">Official Campaign Symbol</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-lg flex items-start gap-2.5">
                  <FileText className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-emerald-300 uppercase block tracking-wider">Candidate Campaign Motto</span>
                    <p className="text-slate-200 mt-1 italic leading-relaxed">
                      "{candidateDetails?.motto || 'Working together for a better, brighter future for our local constituency.'}"
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>

        </div>

      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal role="independent" onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
};

export default CandidateDashboard;
