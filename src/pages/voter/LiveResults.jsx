import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2, TrendingUp, Landmark, Award, Users, Activity, RefreshCw } from 'lucide-react';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { motion } from 'framer-motion';

const LiveResults = () => {
  const navigate = useNavigate();
  const [constituencies, setConstituencies] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedHalkaId, setSelectedHalkaId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [partyProjections, setPartyProjections] = useState({ MNA: {}, MPA: {} });

  const loadBaseData = async () => {
    try {
      setIsLoading(true);
      const constsSnap = await getDocs(collection(db, 'constituencies'));
      const constsList = constsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setConstituencies(constsList);
      if (constsList.length > 0) setSelectedHalkaId(constsList[0].id);

      const eventSnap = await getDocs(collection(db, 'events'));
      const loadedEvents = eventSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      loadedEvents.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
      setEvents(loadedEvents);
    } catch (err) {
      console.error(err);
      toast.error('Failed to initialize results feed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadBaseData(); }, []);

  useEffect(() => {
    const q = query(collection(db, 'candidates'), where('status', '==', 'approved'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cands = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCandidates(cands);
      calculateProjections(cands);
      setLastUpdated(new Date());
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [constituencies]);

  const calculateProjections = (cands) => {
    const naLeads = {}, paLeads = {};
    constituencies.forEach(c => {
      const candidatesInHalka = cands.filter(cand => cand.constituencyId === c.id);
      if (!candidatesInHalka.length) return;
      const mnaCands = candidatesInHalka.filter(cand => cand.type === 'MNA');
      const mpaCands = candidatesInHalka.filter(cand => cand.type === 'MPA');
      if (mnaCands.length) {
        mnaCands.sort((a, b) => b.voteCount - a.voteCount);
        const leader = mnaCands[0];
        if (leader.voteCount > 0) {
          const party = leader.partyAcronym || 'Independent';
          naLeads[party] = (naLeads[party] || 0) + 1;
        }
      }
      if (mpaCands.length) {
        mpaCands.sort((a, b) => b.voteCount - a.voteCount);
        const leader = mpaCands[0];
        if (leader.voteCount > 0) {
          const party = leader.partyAcronym || 'Independent';
          paLeads[party] = (paLeads[party] || 0) + 1;
        }
      }
    });
    setPartyProjections({ MNA: naLeads, MPA: paLeads });
  };

  const getHalkaCandidates = (halkaId, type) =>
    candidates.filter(c => c.constituencyId === halkaId && c.type === type).sort((a, b) => b.voteCount - a.voteCount);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const activeElection = events.find(e => e.status === 'active') || events[0];
  const isClosed = activeElection?.status === 'closed';

  const selectedHalka = constituencies.find(c => c.id === selectedHalkaId);
  const mnaCands = getHalkaCandidates(selectedHalkaId, 'MNA');
  const mpaCands = getHalkaCandidates(selectedHalkaId, 'MPA');
  const totalMnaVotes = mnaCands.reduce((sum, c) => sum + (c.voteCount || 0), 0);
  const totalMpaVotes = mpaCands.reduce((sum, c) => sum + (c.voteCount || 0), 0);

  const allMnaProjections = Object.entries(partyProjections.MNA).sort((a, b) => b[1] - a[1]);
  const allMpaProjections = Object.entries(partyProjections.MPA).sort((a, b) => b[1] - a[1]);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 text-slate-50 font-sans relative overflow-hidden bg-emerald-950">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">

        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 rounded-2xl gap-4"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-emerald-900/50 border border-emerald-500/20 hover:bg-emerald-800/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-emerald-300" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-yellow-400" />
                {isClosed ? 'ECP Official Results' : 'ECP Live Transmission Board'}
              </h1>
              <p className="text-xs text-emerald-200/60 mt-0.5">
                {isClosed ? 'Concluded seat projections & official winners' : 'Real-time seat projections & constituency standings'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest rounded-full px-3 py-1.5 ${isClosed ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-400' : 'bg-red-500/15 border border-red-500/30 text-red-400'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isClosed ? 'bg-yellow-400 animate-bounce' : 'bg-red-400 animate-pulse'} inline-block`} />
              {isClosed ? 'Concluded' : 'Live Feed'}
            </span>
            <span className="text-[10px] text-emerald-300/50 flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '4s' }} />
              {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </motion.div>

        {/* ─── Seat Projections ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-3xl overflow-hidden"
        >
          <div className="px-6 py-4 flex items-center gap-2 border-b border-emerald-500/10 bg-emerald-900/20">
            <TrendingUp className="h-5 w-5 text-yellow-400" />
            <h2 className="text-base font-black text-white">ECP Seat Projection Tally</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProjectionPanel title="National Assembly (MNA Leads)" projections={allMnaProjections} type="MNA" />
            <ProjectionPanel title="Provincial Assembly (MPA Leads)" projections={allMpaProjections} type="MPA" />
          </div>
        </motion.div>

        {/* ─── Halka Selector ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4"
        >
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-yellow-400" />
            <h3 className="text-sm font-black text-white">Constituency Result Sheet</h3>
          </div>
          <select
            value={selectedHalkaId}
            onChange={e => setSelectedHalkaId(e.target.value)}
            className="block w-full sm:w-72 px-3 py-2.5 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm transition-all"
          >
            {constituencies.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type === 'national' ? 'MNA' : 'MPA'})
              </option>
            ))}
          </select>
        </motion.div>

        {/* ─── Live Standings ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <StandingPanel
            label="Ballot Green"
            labelStyle={{ background: 'rgba(5,150,105,0.2)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}
            title="MNA Candidates"
            candidates={mnaCands}
            totalVotes={totalMnaVotes}
            halkaName={selectedHalka?.name}
            type="MNA"
            isClosed={isClosed}
          />
          <StandingPanel
            label="Ballot White"
            labelStyle={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#e5e7eb' }}
            title="MPA Candidates"
            candidates={mpaCands}
            totalVotes={totalMpaVotes}
            halkaName={selectedHalka?.name}
            type="MPA"
            isClosed={isClosed}
          />
        </motion.div>

      </div>
    </div>
  );
};

const ProjectionPanel = ({ title, projections, type }) => {
  const totalSeats = projections.reduce((sum, [, s]) => sum + s, 0);
  return (
    <div className="rounded-2xl overflow-hidden bg-emerald-950/50 border border-emerald-500/10">
      <div className="px-4 py-3 border-b border-emerald-500/10">
        <p className="text-[11px] font-black uppercase tracking-widest text-emerald-300/60">{title}</p>
      </div>
      <div className="p-4 space-y-3">
        {projections.length === 0 ? (
          <p className="text-center text-xs py-6 text-emerald-300/40">No votes reported yet.</p>
        ) : (
          projections.map(([party, seats], idx) => {
            const pct = totalSeats > 0 ? (seats / totalSeats) * 100 : 0;
            return (
              <div key={party} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-white">{party}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-yellow-400">{seats} seat{seats > 1 ? 's' : ''}</span>
                    {idx === 0 && (
                      <span className="text-[9px] font-black uppercase rounded-full px-2 py-0.5 bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                        Leading
                      </span>
                    )}
                  </div>
                </div>
                <div className="live-bar h-2 w-full rounded-full overflow-hidden">
                  <div className={`live-bar-fill h-full rounded-full ${idx === 0 ? 'leading' : ''}`} style={{ width: `${Math.max(pct, 4)}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const StandingPanel = ({ label, labelStyle, title, candidates, totalVotes, halkaName, type, isClosed }) => {
  return (
    <div className="glass-panel rounded-3xl overflow-hidden">
      <div className="px-5 py-4 flex justify-between items-center border-b border-emerald-500/10 bg-emerald-900/20">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase" style={labelStyle}>
            {label}
          </span>
          <h3 className="text-sm font-black text-white">{title}</h3>
        </div>
        <span className="text-xs font-bold text-emerald-300/60">{totalVotes} votes</span>
      </div>

      {isClosed && candidates.length > 0 && candidates[0].voteCount > 0 && (
        <div className="bg-gradient-to-r from-yellow-900/30 to-emerald-900/30 p-4 border-b border-yellow-500/20 text-center flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-yellow-400" style={{ animation: 'spin 6s linear infinite' }} />
            <h4 className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">ECP Official Winner</h4>
          </div>
          <p className="text-xs text-white">
            <strong className="text-yellow-400 font-black">{candidates[0].name}</strong> of{' '}
            <strong className="text-emerald-300">{candidates[0].partyAcronym || 'Independent'}</strong> won with{' '}
            <strong className="text-yellow-400">{candidates[0].voteCount}</strong> votes!
          </p>
        </div>
      )}

      <div className="p-5">
        {candidates.length === 0 ? (
          <div className="text-center py-10">
            <div className="mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-3 bg-emerald-900/40 border border-emerald-500/20">
              <Users className="h-6 w-6 text-emerald-400/40" />
            </div>
            <p className="text-xs text-emerald-200/40">No approved {type} candidates in {halkaName}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map((c, idx) => {
              const pct = totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) : '0.0';
              const isLeader = idx === 0 && c.voteCount > 0;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.07 }}
                  className="rounded-xl p-3.5 space-y-2 transition-all relative"
                  style={{
                    background: isLeader ? 'rgba(251,191,36,0.06)' : 'rgba(2,20,13,0.5)',
                    border: isLeader ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(16,185,129,0.08)',
                  }}
                >
                  {isLeader && (
                    <span
                      className="absolute top-2 right-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
                      style={isClosed
                        ? { background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.5)', boxShadow: '0 0 10px rgba(251,191,36,0.3)' }
                        : { background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }
                      }
                    >
                      {isClosed ? '🏆 WINNER' : 'Leading'}
                    </span>
                  )}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      {c.symbolUrl ? (
                        <img src={c.symbolUrl} alt="" className="h-8 w-8 object-contain rounded-full bg-white/10 p-0.5 border border-white/10" />
                      ) : (
                        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                          <Award className="h-4 w-4 text-emerald-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-white leading-tight">{c.name}</p>
                        <p className="text-[10px] font-black text-yellow-400 uppercase tracking-wider">{c.partyAcronym}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white">{c.voteCount || 0}</p>
                      <p className="text-[10px] text-emerald-300/60">{pct}%</p>
                    </div>
                  </div>
                  <div className="live-bar h-2 w-full">
                    <div
                      className={`live-bar-fill h-full rounded-full ${isLeader ? 'leading' : ''}`}
                      style={{ width: `${Math.max(parseFloat(pct), 1)}%` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveResults;
