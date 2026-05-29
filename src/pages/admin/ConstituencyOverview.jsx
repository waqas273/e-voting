import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, Users, Award, Activity, Search, X, ChevronRight, Filter, AlertCircle, ArrowLeft } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { motion, AnimatePresence } from 'framer-motion';

const ConstituencyOverview = () => {
  const navigate = useNavigate();
  const [constituencies, setConstituencies] = useState([]);
  const [voters, setVoters] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Selected Halka modal
  const [selectedHalka, setSelectedHalka] = useState(null);
  const [modalVoterSearch, setModalVoterSearch] = useState('');

  // Real-time synchronization
  useEffect(() => {
    setIsLoading(true);

    const unsubConsts = onSnapshot(collection(db, 'constituencies'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setConstituencies(list);
    }, (err) => console.error("Error syncing constituencies:", err));

    const unsubVoters = onSnapshot(collection(db, 'voters'), (snap) => {
      setVoters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Error syncing voters:", err));

    const unsubCands = onSnapshot(collection(db, 'candidates'), (snap) => {
      setCandidates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    }, (err) => {
      console.error("Error syncing candidates:", err);
      setIsLoading(false);
    });

    return () => {
      unsubConsts();
      unsubVoters();
      unsubCands();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Calculate Voter Count per constituency
  const getVotersForHalka = (halkaId, type) => {
    const fieldName = type === 'national' ? 'naConstituencyId' : 'paConstituencyId';
    return voters.filter(v => v[fieldName] === halkaId);
  };

  // Get Candidates for Halka
  const getCandidatesForHalka = (halkaId) => {
    return candidates.filter(c => c.constituencyId === halkaId);
  };

  // Filter list
  const filteredConstituencies = constituencies.filter(c => {
    // Province filter
    if (selectedProvince !== 'All') {
      const p = c.province.toLowerCase();
      if (selectedProvince === 'KPK' && p !== 'khyber paktunkhwa' && p !== 'kpk') return false;
      if (selectedProvince === 'Federal' && p !== 'islamabad' && p !== 'federal') return false;
      if (selectedProvince !== 'KPK' && selectedProvince !== 'Federal' && p !== selectedProvince.toLowerCase()) return false;
    }

    // Type filter
    if (selectedType !== 'All' && c.type !== selectedType) return false;

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchCName = (c.constituencyName || '').toLowerCase().includes(q);
      const matchDistrict = (c.district || '').toLowerCase().includes(q);
      if (!matchName && !matchCName && !matchDistrict) return false;
    }

    return true;
  });

  const totalRegisteredVoters = voters.length;
  const totalCandidatesCount = candidates.length;
  const totalApprovedCandidates = candidates.filter(c => c.status === 'approved').length;

  return (
    <div className="min-h-screen bg-emerald-950 py-8 px-4 sm:px-6 lg:px-8 text-white font-sans relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[50%] w-[50%] h-[50%] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-emerald-500/20 pb-5 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-2.5 rounded-xl bg-emerald-900/60 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-2xl font-black flex items-center gap-2 tracking-wide uppercase">
                <Activity className="h-6 w-6 text-yellow-400" /> Constituency Analytics
              </h1>
              <p className="text-xs text-emerald-400">Real-time read-only oversight of all National and Provincial Assembly seats</p>
            </div>
          </div>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Total Seats', value: constituencies.length, icon: Landmark, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Registered Voters', value: totalRegisteredVoters, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Nominee Filings', value: totalCandidatesCount, icon: Award, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Approved Candidates', value: totalApprovedCandidates, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map((s, i) => (
            <div 
              key={s.label}
              className="glass-card p-5 relative overflow-hidden group border border-emerald-500/10 rounded-2xl bg-emerald-950/40"
            >
              <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${s.color}`}>
                <s.icon className="w-16 h-16" />
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 border border-white/5 ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-emerald-200/70">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Browser Panel */}
        <div className="bg-emerald-900/20 border border-emerald-500/15 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-500/10 pb-3.5">
            <h2 className="text-lg font-bold text-yellow-400">
              Constituency Overseer ({filteredConstituencies.length} of {constituencies.length})
            </h2>
            
            {/* Type Switcher */}
            <div className="flex gap-1.5 p-0.5 bg-emerald-950/80 border border-emerald-500/10 rounded-lg text-xs self-end">
              {['All', 'national', 'provincial'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={`px-3.5 py-1.5 rounded-md font-black uppercase text-[10px] tracking-wider transition-colors ${
                    selectedType === t ? 'bg-yellow-500 text-emerald-950' : 'text-emerald-350 hover:text-white'
                  }`}
                >
                  {t === 'national' ? 'NA' : t === 'provincial' ? 'PA' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Province Tabs */}
          <div className="overflow-x-auto pb-1 flex gap-1.5 text-[11px] scrollbar-thin">
            {['All', 'Punjab', 'Sindh', 'KPK', 'Balochistan', 'Federal'].map(prov => (
              <button
                key={prov}
                type="button"
                onClick={() => setSelectedProvince(prov)}
                className={`px-4 py-2 rounded-lg border font-bold whitespace-nowrap transition-all duration-200 ${
                  selectedProvince === prov 
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' 
                    : 'bg-emerald-950/20 border-emerald-500/10 text-emerald-500 hover:text-emerald-300'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-emerald-555" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 bg-emerald-950/50 border border-emerald-500/25 rounded-xl placeholder-emerald-700 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
              placeholder="Search by Halka number, constituency name, or district..."
            />
          </div>

          {/* Constituency Cards Grid */}
          {filteredConstituencies.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 bg-emerald-950/80 border border-emerald-500/10">
                <Landmark className="h-8 w-8 text-emerald-500/30" />
              </div>
              <p className="text-sm font-bold text-white">No constituencies found</p>
              <p className="text-xs text-emerald-450 mt-1">Try modifying your filtering parameters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredConstituencies.map((c) => {
                const halkaVoters = getVotersForHalka(c.id, c.type);
                const halkaCands = getCandidatesForHalka(c.id);
                const indeps = halkaCands.filter(cand => cand.partyId === 'independent');
                const partyCands = halkaCands.filter(cand => cand.partyId !== 'independent');

                // Group party candidates by acronym
                const partyGroups = partyCands.reduce((acc, cand) => {
                  acc[cand.partyAcronym] = (acc[cand.partyAcronym] || 0) + 1;
                  return acc;
                }, {});

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedHalka(c);
                      setModalVoterSearch('');
                    }}
                    className="p-5 bg-emerald-950/30 border border-emerald-500/10 hover:border-yellow-500/30 hover:bg-emerald-900/10 rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-4 group"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-sm font-black text-white group-hover:text-yellow-400 transition-colors">
                          {c.name}
                        </h3>
                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border ${
                          c.type === 'national' ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        }`}>
                          {c.type === 'national' ? 'National Assembly' : 'Provincial Seat'}
                        </span>
                      </div>
                      {c.constituencyName && (
                        <p className="text-xs text-slate-350 mt-0.5 font-medium">{c.constituencyName}</p>
                      )}
                      
                      <div className="text-[10px] text-emerald-400 mt-2 font-bold uppercase tracking-wider">
                        {c.province} &bull; District: {c.district || 'N/A'}
                      </div>
                    </div>

                    <div className="border-t border-emerald-500/5 pt-3 space-y-2 text-xs">
                      {/* Voters & Candidate Counts */}
                      <div className="flex justify-between text-[11px] font-bold text-slate-200">
                        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-yellow-400" /> {halkaVoters.length} Voters</span>
                        <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-yellow-400" /> {halkaCands.length} Nominees</span>
                      </div>

                      {/* Party details summary snippet */}
                      {halkaCands.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-bold mt-1 text-slate-300">
                          {Object.entries(partyGroups).map(([acronym, count]) => (
                            <span key={acronym} className="px-1.5 py-0.5 rounded bg-emerald-900/30 border border-emerald-500/10">
                              {acronym}: {count}
                            </span>
                          ))}
                          {indeps.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800/40 border border-slate-700/30">
                              Indeps: {indeps.length}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[9.5px] italic text-emerald-500/50 mt-1">No candidates nominated yet.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ─── Read-Only Details Modal/Drawer ─── */}
      <AnimatePresence>
        {selectedHalka && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-emerald-950 border border-emerald-500/30 rounded-2xl w-full max-w-3xl p-6 space-y-6 shadow-2xl relative text-white font-sans max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-emerald-500/10 pb-4">
                <div>
                  <h3 className="text-xl font-black text-white">{selectedHalka.name}</h3>
                  <p className="text-xs text-yellow-400 mt-1 font-semibold flex items-center gap-1.5">
                    <Landmark className="h-4 w-4" />
                    {selectedHalka.constituencyName || 'No Constituency Name Registered'}
                  </p>
                  <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-extrabold mt-1">
                    {selectedHalka.type === 'national' ? 'National Assembly Seat' : `${selectedHalka.province} Assembly Seat`} &bull; District: {selectedHalka.district || 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedHalka(null)}
                  className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-500/15 text-emerald-450 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                
                {/* Left Column: Candidates list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-yellow-400 uppercase tracking-widest border-b border-emerald-500/5 pb-1 flex items-center gap-1.5">
                    <Award className="h-4 w-4" />
                    Nominated Candidates ({getCandidatesForHalka(selectedHalka.id).length})
                  </h4>
                  
                  {getCandidatesForHalka(selectedHalka.id).length === 0 ? (
                    <div className="py-8 text-center bg-emerald-900/10 rounded-xl border border-emerald-500/5">
                      <AlertCircle className="h-8 w-8 text-emerald-500/20 mx-auto mb-2" />
                      <p className="italic text-emerald-500/60 font-semibold">No candidates registered for this seat.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                      {getCandidatesForHalka(selectedHalka.id).map(cand => (
                        <div key={cand.id} className="p-3 bg-emerald-900/10 border border-emerald-500/5 rounded-xl flex justify-between items-center gap-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-emerald-950 border border-emerald-500/20 flex items-center justify-center overflow-hidden flex-shrink-0 relative shadow">
                              {cand.profilePictureUrl ? (
                                <img src={cand.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Users className="h-4 w-4 text-emerald-400/50" />
                              )}
                              {cand.symbolUrl && (
                                <div className="absolute bottom-0 right-0 h-4.5 w-4.5 bg-white/95 rounded-tl border-t border-l border-emerald-500/10 p-0.5 flex items-center justify-center">
                                  <img src={cand.symbolUrl} alt="" className="h-full w-full object-contain" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-white text-xs">{cand.name}</p>
                              <p className="text-[10px] text-emerald-400 mt-0.5">
                                ID: <span className="text-yellow-400 font-bold font-mono">{cand.candidateId || 'N/A'}</span> &bull; Party: <span className="text-white">{cand.partyAcronym || 'Independent'}</span>
                              </p>
                              <p className="text-[9px] text-emerald-450 mt-0.5">CNIC: {cand.cnic || 'N/A'}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                              cand.status === 'approved' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                              cand.status === 'rejected' ? 'bg-red-500/15 border-red-500/30 text-red-400' :
                              'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                            }`}>
                              {cand.status}
                            </span>
                            <span className="text-[9.5px] font-bold text-yellow-500/70">{cand.voteCount || 0} Votes</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Voters list */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-emerald-500/5 pb-1">
                    <h4 className="text-xs font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      Registered Voters ({getVotersForHalka(selectedHalka.id, selectedHalka.type).length})
                    </h4>
                  </div>

                  {/* Voters Search */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <Search className="h-3 w-3 text-emerald-500/40" />
                    </span>
                    <input
                      type="text"
                      value={modalVoterSearch}
                      onChange={e => setModalVoterSearch(e.target.value)}
                      className="block w-full pl-8 pr-2.5 py-1.5 bg-emerald-900/20 border border-emerald-500/15 rounded-lg placeholder-emerald-700 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-[10px]"
                      placeholder="Filter voters by name or CNIC..."
                    />
                  </div>

                  {getVotersForHalka(selectedHalka.id, selectedHalka.type).length === 0 ? (
                    <div className="py-8 text-center bg-emerald-900/10 rounded-xl border border-emerald-500/5">
                      <AlertCircle className="h-8 w-8 text-emerald-500/20 mx-auto mb-2" />
                      <p className="italic text-emerald-500/60 font-semibold">No voters registered in this Halka.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                      {getVotersForHalka(selectedHalka.id, selectedHalka.type)
                        .filter(v => {
                          if (modalVoterSearch.trim() === '') return true;
                          const q = modalVoterSearch.toLowerCase();
                          return v.name.toLowerCase().includes(q) || v.cnic.includes(q);
                        })
                        .map(v => (
                          <div key={v.id} className="p-3 bg-emerald-900/10 border border-emerald-500/5 rounded-xl space-y-1">
                            <div className="flex justify-between items-center">
                              <p className="font-bold text-white">{v.name}</p>
                              <div className="flex gap-2 text-[8px] font-black uppercase tracking-wider">
                                <span className={v.hasVotedMNA ? 'text-emerald-400' : 'text-yellow-400'}>
                                  MNA: {v.hasVotedMNA ? '✓ Voted' : '⏳ Pending'}
                                </span>
                                <span className={v.hasVotedMPA ? 'text-emerald-400' : 'text-yellow-400'}>
                                  MPA: {v.hasVotedMPA ? '✓ Voted' : '⏳ Pending'}
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-emerald-400 font-mono">CNIC: {v.cnic}</p>
                            <p className="text-[9.5px] text-emerald-450/70">{v.email}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-emerald-500/10">
                <button
                  type="button"
                  onClick={() => setSelectedHalka(null)}
                  className="px-6 py-2 bg-emerald-900/60 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Close Browser
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ConstituencyOverview;
