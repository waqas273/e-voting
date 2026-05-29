import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Shield, Users, Landmark, Clock, ChevronRight, Search, Filter, Eye, AlertCircle, FileText, CheckCircle, XCircle } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const AdminApprovals = () => {
  const navigate = useNavigate();
  const { triggerEmailNotification } = useAuth();

  const [parties, setParties] = useState([]);
  const [pendingCandidates, setPendingCandidates] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('parties'); // 'parties' | 'candidates'

  // Parties Filtering & Modal States
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const [partyStatusFilter, setPartyStatusFilter] = useState('pending'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [selectedParty, setSelectedParty] = useState(null);

  // Rejection Modal States
  const [rejectingItem, setRejectingItem] = useState(null); // { type: 'party' | 'candidate', id: string, name: string }
  const [rejectionInput, setRejectionInput] = useState('');

  // Candidates Filtering & Modal States
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [activeCandidatePartyTab, setActiveCandidatePartyTab] = useState('independent'); // party.id or 'independent'
  const [activeCandidateType, setActiveCandidateType] = useState('All'); // 'All' | 'MNA' | 'MPA'

  const loadData = async () => {
    try {
      setIsLoading(true);
      const constSnapshot = await getDocs(collection(db, 'constituencies'));
      setConstituencies(constSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

      const partySnapshot = await getDocs(collection(db, 'parties'));
      const loadedParties = partySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setParties(loadedParties);

      const candQuery = query(collection(db, 'candidates'), where('status', '==', 'pending'));
      const candSnapshot = await getDocs(candQuery);
      setPendingCandidates(candSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

      // Initialize the candidates party tab to the first approved party if available, else 'independent'
      const approvedPartiesList = loadedParties.filter(p => p.status === 'approved');
      if (approvedPartiesList.length > 0) {
        setActiveCandidatePartyTab(approvedPartiesList[0].id);
      } else {
        setActiveCandidatePartyTab('independent');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pending approvals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handlePartyApproval = async (partyId, status, reason = '') => {
    try {
      const updates = { status };
      if (reason) updates.rejectionReason = reason;
      await updateDoc(doc(db, 'parties', partyId), updates);
      setParties(prev => prev.map(p => p.id === partyId ? { ...p, ...updates } : p));
      
      const party = parties.find(p => p.id === partyId);
      toast.success(`Party registration ${status === 'approved' ? 'approved ✓' : 'rejected ✗'}`);
      setSelectedParty(null); // Close modal if open

      // Trigger Structured Email notification to Party Manager
      triggerEmailNotification(
        `Political Party Application: ${status.toUpperCase()} - ECP`,
        party.managerEmail,
        `ECP Registration Board: Party ${party.name} (${party.acronym}) has been ${status.toUpperCase()}.`,
        'approval',
        {
          recipient_name: party.managerName || party.leader,
          title: 'ECP Registration Board',
          message_body: `We are writing to inform you that your application to register the political party "${party.name} (${party.acronym})" has been officially reviewed and ${status.toUpperCase()} by the Election Commission of Pakistan.`,
          detail_label_1: 'Party Name',
          detail_value_1: party.name,
          detail_label_2: 'Acronym',
          detail_value_2: party.acronym,
          detail_label_3: 'Application Status',
          detail_value_3: status.toUpperCase(),
          rejection_reason: reason
        }
      );
    } catch (err) {
      toast.error('Failed to update party status');
    }
  };

  const handleCandidateApproval = async (candidateId, status, reason = '') => {
    try {
      const cand = pendingCandidates.find(c => c.id === candidateId);
      const updates = { status };
      if (reason) updates.rejectionReason = reason;

      let generatedPassword = '';
      if (cand && cand.partyId === 'independent' && status === 'approved') {
        const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
        for (let i = 0; i < 8; i++) {
          generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        updates.password = generatedPassword;
      }

      await updateDoc(doc(db, 'candidates', candidateId), updates);
      
      setPendingCandidates(prev => prev.filter(c => c.id !== candidateId));
      toast.success(`Candidate nomination ${status === 'approved' ? 'approved ✓' : 'rejected ✗'}`);
      setSelectedCandidate(null); // Close modal if open

      const seatDetails = getConstituencyDetails(cand.constituencyId);

      // Email 1: Send to Candidate Manager Email (which is the party manager or candidate email)
      if (cand.managerEmail) {
        let msgBody = `The ECP Scrutiny Board has officially completed reviewing the nomination petition for candidate "${cand.name}" running for the ${cand.type} assembly seat. The application is ${status.toUpperCase()}.`;
        
        let detailVal3 = cand.candidateId || 'N/A';
        let detailLabel3 = 'Nomination ID';

        if (cand.partyId === 'independent' && status === 'approved') {
          msgBody += ` You can now access your candidate control console by logging into the party/candidate portal using your CNIC as username and the temporary password below.`;
          detailVal3 = generatedPassword;
          detailLabel3 = 'Temporary Password';
        }

        triggerEmailNotification(
          `Candidate Nomination: ${status.toUpperCase()} - ECP`,
          cand.managerEmail,
          `ECP Nominations Branch: Candidate ${cand.name} for ${cand.type} has been ${status.toUpperCase()}.`,
          'approval',
          {
            recipient_name: cand.name,
            title: 'ECP Nominations Branch',
            message_body: msgBody,
            detail_label_1: 'Candidate Name',
            detail_value_1: cand.name,
            detail_label_2: 'Constituency',
            detail_value_2: seatDetails,
            detail_label_3: detailLabel3,
            detail_value_3: detailVal3,
            rejection_reason: reason
          }
        );
      }

      // Also notify ECP Admin (simulated)
      triggerEmailNotification(
        `Candidate decision completed: ${cand.name} - ${status.toUpperCase()}`,
        'admin@ecp.gov.pk',
        `Candidate nomination application for ${cand.name} (${cand.type}) has been marked as ${status.toUpperCase()}.`,
        'approval',
        {
          recipient_name: 'ECP Administrator',
          title: 'ECP System Log',
          message_body: `Candidate nomination request for "${cand.name}" in ${seatDetails} has been marked as ${status.toUpperCase()}.`,
          detail_label_1: 'Candidate CNIC',
          detail_value_1: cand.cnic || 'N/A',
          detail_label_2: 'Party Affiliation',
          detail_value_2: cand.partyAcronym || 'Independent',
          detail_label_3: 'Nomination Status',
          detail_value_3: status.toUpperCase(),
          rejection_reason: reason
        }
      );
    } catch (err) {
      toast.error('Failed to update candidate status');
    }
  };

  const getConstituencyName = (id) => {
    const found = constituencies.find(c => c.id === id);
    return found ? found.name : 'Unknown Halka';
  };

  const getConstituencyDetails = (id) => {
    const found = constituencies.find(c => c.id === id);
    return found ? `${found.name} (${found.province})` : 'Unknown Halka';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Filter Parties
  const filteredParties = parties.filter(p => {
    // Status Filter
    if (partyStatusFilter !== 'all' && p.status !== partyStatusFilter) return false;
    
    // Search Query
    if (partySearchQuery.trim() !== '') {
      const q = partySearchQuery.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchAcronym = p.acronym?.toLowerCase().includes(q);
      const matchLeader = p.leader?.toLowerCase().includes(q);
      const matchEmail = p.managerEmail?.toLowerCase().includes(q);
      return matchName || matchAcronym || matchLeader || matchEmail;
    }
    return true;
  });

  // Approved parties for Candidates grouping
  const approvedParties = parties.filter(p => p.status === 'approved');

  // Filter Candidates
  const filteredCandidates = pendingCandidates.filter(c => {
    // Party Tab Grouping
    if (activeCandidatePartyTab === 'independent') {
      if (c.partyId !== 'independent') return false;
    } else {
      if (c.partyId !== activeCandidatePartyTab) return false;
    }

    // Assembly Seat Type sub-tab
    if (activeCandidateType !== 'All' && c.type !== activeCandidateType) return false;

    // Search query (checks candidate name or constituency code)
    if (candidateSearchQuery.trim() !== '') {
      const q = candidateSearchQuery.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const constName = getConstituencyName(c.constituencyId).toLowerCase();
      const matchConstituency = constName.includes(q);
      return matchName || matchConstituency;
    }

    return true;
  });

  const pendingPartiesCount = parties.filter(p => p.status === 'pending').length;
  const pendingCandidatesCount = pendingCandidates.length;

  return (
    <div className="min-h-screen bg-emerald-950 py-8 px-4 sm:px-6 lg:px-8 text-white font-sans relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[50%] w-[50%] h-[50%] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-6 relative z-10 animate-fade-in">
        
        {/* ─── Header ─── */}
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
                <Shield className="h-6 w-6 text-yellow-400" /> ECP Approvals Desk
              </h1>
              <p className="text-xs text-emerald-400">Validate political parties and scrutiny candidate nomination papers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(pendingPartiesCount + pendingCandidatesCount) > 0 && (
              <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-yellow-500/20 border border-yellow-500/35 text-yellow-400 flex items-center gap-1.5 shadow-inner">
                <Clock className="h-3 w-3" />
                {pendingPartiesCount + pendingCandidatesCount} Total Pending
              </span>
            )}
          </div>
        </div>

        {/* ─── Tab Switcher ─── */}
        <div className="flex gap-2 p-1.5 bg-emerald-950/80 border border-emerald-500/15 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('parties')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeTab === 'parties'
                ? 'bg-yellow-500 text-emerald-950 shadow-lg font-black'
                : 'text-emerald-400 hover:text-white'
            }`}
          >
            <Landmark className="h-4 w-4" />
            Party Applications
            {pendingPartiesCount > 0 && (
              <span className={`text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center ${activeTab === 'parties' ? 'bg-emerald-950 text-yellow-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {pendingPartiesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeTab === 'candidates'
                ? 'bg-yellow-500 text-emerald-950 shadow-lg font-black'
                : 'text-emerald-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            Candidate Nominations
            {pendingCandidatesCount > 0 && (
              <span className={`text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center ${activeTab === 'candidates' ? 'bg-emerald-950 text-yellow-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {pendingCandidatesCount}
              </span>
            )}
          </button>
        </div>

        {/* ─── Tab 1: Party Registrations ─── */}
        {activeTab === 'parties' && (
          <div className="bg-emerald-900/20 border border-emerald-500/15 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-yellow-500" />
                  Political Party Directory
                </h2>
                <p className="text-xs text-emerald-350">Approve new political entities to enable candidate nominations</p>
              </div>

              {/* Status Segmented Control */}
              <div className="flex gap-1 p-0.5 bg-emerald-950/80 border border-emerald-500/10 rounded-lg text-xs self-end">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'approved', label: 'Approved' },
                  { key: 'rejected', label: 'Rejected' }
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setPartyStatusFilter(item.key)}
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors ${
                      partyStatusFilter === item.key ? 'bg-yellow-500 text-emerald-950' : 'text-emerald-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-emerald-555" />
              </span>
              <input
                type="text"
                value={partySearchQuery}
                onChange={e => setPartySearchQuery(e.target.value)}
                placeholder="Search parties by name, acronym, leader, or contact email..."
                className="block w-full pl-9 pr-3 py-2.5 bg-emerald-950/50 border border-emerald-500/25 rounded-xl placeholder-emerald-700 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
              />
            </div>

            {filteredParties.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 bg-emerald-950/80 border border-emerald-500/10">
                  <Landmark className="h-8 w-8 text-emerald-500/30" />
                </div>
                <p className="text-sm font-bold text-white">No political parties found</p>
                <p className="text-xs text-emerald-450 mt-1">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredParties.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedParty(p)}
                    className="p-5 bg-emerald-950/30 border border-emerald-500/10 hover:border-yellow-500/30 hover:bg-emerald-900/10 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 group relative"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-xl bg-white border border-yellow-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden p-1.5">
                        {p.symbolUrl ? (
                          <img src={p.symbolUrl} alt={p.symbolName} className="h-full w-full object-contain filter drop-shadow" />
                        ) : (
                          <span className="text-emerald-950 font-black text-[10px] tracking-tighter uppercase">{p.acronym}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-white group-hover:text-yellow-400 transition-colors">{p.name}</h3>
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            {p.acronym}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-300 mt-1">Leader: <span className="text-white font-medium">{p.leader}</span></p>
                        <p className="text-[10px] text-emerald-450 mt-0.5">{p.managerEmail}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        p.status === 'approved' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                        p.status === 'rejected' ? 'bg-red-500/15 border-red-500/30 text-red-400' :
                        'bg-yellow-500/15 border-yellow-500/30 text-yellow-400 animate-pulse'
                      }`}>
                        {p.status}
                      </span>
                      <span className="text-[9px] font-black uppercase text-yellow-500/70 tracking-widest flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        View <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab 2: Candidate Nominations ─── */}
        {activeTab === 'candidates' && (
          <div className="bg-emerald-900/20 border border-emerald-500/15 rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                <Users className="h-5 w-5 text-yellow-500" />
                Seat Nomination Scrutiny Board
              </h2>
              <p className="text-xs text-emerald-350">Scrutinize and verify candidate registry credentials by party affiliations</p>
            </div>

            {/* Approved Parties list for Candidate Tabs */}
            <div className="flex gap-2 border-b border-emerald-500/10 pb-3 overflow-x-auto scrollbar-thin">
              <button
                type="button"
                onClick={() => setActiveCandidatePartyTab('independent')}
                className={`px-4 py-2 text-xs font-bold rounded-lg border whitespace-nowrap transition-all duration-200 ${
                  activeCandidatePartyTab === 'independent'
                    ? 'bg-yellow-500 text-emerald-950 border-yellow-500 font-black shadow-lg'
                    : 'bg-emerald-950/30 border-emerald-500/10 text-emerald-400 hover:text-white'
                }`}
              >
                Independent Nominees
              </button>
              
              {approvedParties.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveCandidatePartyTab(p.id)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                    activeCandidatePartyTab === p.id
                      ? 'bg-yellow-500 text-emerald-950 border-yellow-500 font-black shadow-lg'
                      : 'bg-emerald-950/30 border-emerald-500/10 text-emerald-400 hover:text-white'
                  }`}
                >
                  {p.symbolUrl && (
                    <img src={p.symbolUrl} alt="" className="h-4 w-4 object-contain rounded-full bg-white/95 p-0.5" />
                  )}
                  {p.acronym} Nominees
                </button>
              ))}
            </div>

            {/* Candidate Sub Filters (MNA / MPA) + Search Bar Row */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              {/* Assembly Sub-tabs */}
              <div className="flex gap-1.5 p-0.5 bg-emerald-950/80 border border-emerald-500/10 rounded-lg text-xs w-fit">
                {['All', 'MNA', 'MPA'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActiveCandidateType(type)}
                    className={`px-4 py-1.5 rounded-md font-black uppercase text-[10px] tracking-wider transition-colors ${
                      activeCandidateType === type ? 'bg-yellow-500 text-emerald-950' : 'text-emerald-350 hover:text-white'
                    }`}
                  >
                    {type === 'MNA' ? 'NA (MNA Seat)' : type === 'MPA' ? 'PA (MPA Seat)' : 'All Seats'}
                  </button>
                ))}
              </div>

              {/* Candidate Search bar */}
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-emerald-555" />
                </span>
                <input
                  type="text"
                  value={candidateSearchQuery}
                  onChange={e => setCandidateSearchQuery(e.target.value)}
                  placeholder="Search nominees by candidate name or seat code (e.g. NA-120)..."
                  className="block w-full pl-9 pr-3 py-2 bg-emerald-950/50 border border-emerald-500/25 rounded-xl placeholder-emerald-700 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                />
              </div>
            </div>

            {/* Candidates Lists */}
            {filteredCandidates.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 bg-emerald-950/80 border border-emerald-500/10">
                  <Users className="h-8 w-8 text-emerald-500/30" />
                </div>
                <p className="text-sm font-bold text-white">No pending candidate nominations</p>
                <p className="text-xs text-emerald-450 mt-1">There are no pending filings under the selected filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-emerald-500/10 bg-emerald-950/20 border border-emerald-500/10 rounded-xl overflow-hidden">
                {filteredCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-emerald-900/10 transition-all duration-200"
                  >
                    {/* Candidate Identity */}
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedCandidate(c)}>
                      <div className="h-14 w-14 rounded-xl bg-emerald-950 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden relative shadow">
                        {c.profilePictureUrl ? (
                          <img src={c.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Users className="h-6 w-6 text-emerald-400/50" />
                        )}
                        {/* Overlay Symbol badge */}
                        {c.symbolUrl && (
                          <div className="absolute bottom-0 right-0 h-5 w-5 bg-white/95 rounded-tl-lg border-t border-l border-emerald-500/10 p-0.5 flex items-center justify-center">
                            <img src={c.symbolUrl} alt="" className="h-full w-full object-contain" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black text-white hover:text-yellow-400 transition-colors">{c.name}</h3>
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded ${
                            c.partyId === 'independent'
                              ? 'bg-slate-500/15 border border-slate-500/30 text-slate-400'
                              : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                          }`}>
                            {c.partyAcronym || 'Independent'}
                          </span>
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            {c.type}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-350 mt-1 flex items-center gap-1">
                          <Landmark className="h-3.5 w-3.5 text-yellow-500" />
                          {getConstituencyDetails(c.constituencyId)}
                        </p>
                        <p className="text-[10px] text-emerald-450 mt-0.5">
                          ID: <span className="text-yellow-400 font-bold font-mono">{c.candidateId || 'N/A'}</span> &bull; CNIC: {c.cnic || 'N/A'} &bull; Manager: {c.managerEmail}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 w-full md:w-auto">
                      <button
                        onClick={() => setSelectedCandidate(c)}
                        className="px-3.5 py-2 bg-emerald-950/60 hover:bg-emerald-800/80 border border-emerald-500/25 rounded-xl text-xs font-bold transition-all text-white flex items-center justify-center gap-1.5 flex-1 md:flex-none"
                      >
                        <Eye className="h-3.5 w-3.5 text-yellow-400" />
                        Details
                      </button>
                      <button
                        onClick={() => handleCandidateApproval(c.id, 'approved')}
                        className="px-4 py-2 bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-400 hover:text-emerald-350 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 flex-1 md:flex-none"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setRejectingItem({ type: 'candidate', id: c.id, name: c.name });
                          setRejectionInput('');
                        }}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/35 text-red-400 hover:text-red-350 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 flex-1 md:flex-none"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ─── Party Details Modal ─── */}
      {selectedParty && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-emerald-950 border border-emerald-500/30 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex items-center gap-4 border-b border-emerald-500/10 pb-4">
              <div className="h-16 w-16 rounded-xl bg-white border border-yellow-500/20 flex items-center justify-center p-2 flex-shrink-0 shadow-lg">
                {selectedParty.symbolUrl ? (
                  <img src={selectedParty.symbolUrl} alt={selectedParty.symbolName} className="h-full w-full object-contain" />
                ) : (
                  <Landmark className="h-8 w-8 text-emerald-950" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{selectedParty.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    {selectedParty.acronym}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                    selectedParty.status === 'approved' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                    selectedParty.status === 'rejected' ? 'bg-red-500/15 border-red-500/30 text-red-400' :
                    'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                  }`}>
                    {selectedParty.status}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedParty(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-emerald-950 border border-emerald-500/15 text-emerald-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body Info */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Party Leader</span>
                  <p className="text-white text-sm font-semibold">{selectedParty.leader}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Official Symbol Name</span>
                  <p className="text-white text-sm font-semibold">{selectedParty.symbolName || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Manager Name</span>
                  <p className="text-white text-sm font-semibold">{selectedParty.managerName || selectedParty.leader}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Official Email</span>
                  <p className="text-white text-sm font-semibold truncate">{selectedParty.managerEmail}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Onboarding Request Date</span>
                  <p className="text-white text-sm font-semibold">
                    {selectedParty.createdAt ? new Date(selectedParty.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Credentials State</span>
                  <p className="text-yellow-400 text-sm font-black uppercase tracking-wider">Awaiting Commission Review</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 border-t border-emerald-500/10 pt-5">
              <button
                type="button"
                onClick={() => setSelectedParty(null)}
                className="flex-1 px-4 py-2.5 bg-emerald-900/60 border border-emerald-500/20 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors"
              >
                Close Profile
              </button>
              
              {selectedParty.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingItem({ type: 'party', id: selectedParty.id, name: selectedParty.name });
                      setRejectionInput('');
                    }}
                    className="flex-1 px-4 py-2.5 bg-red-650 hover:bg-red-700 text-white border border-red-500/30 rounded-lg text-xs font-black transition-colors flex justify-center items-center gap-1.5"
                  >
                    <XCircle className="h-4 w-4" /> Reject Party
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePartyApproval(selectedParty.id, 'approved')}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/30 rounded-lg text-xs font-black transition-colors flex justify-center items-center gap-1.5"
                  >
                    <CheckCircle className="h-4 w-4" /> Approve Party
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ─── Candidate Details Modal ─── */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-emerald-950 border border-emerald-500/30 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex items-center gap-4 border-b border-emerald-500/10 pb-4">
              <div className="h-16 w-16 rounded-xl bg-emerald-900 border border-emerald-500/20 flex items-center justify-center overflow-hidden flex-shrink-0 relative shadow-lg">
                {selectedCandidate.profilePictureUrl ? (
                  <img src={selectedCandidate.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Users className="h-8 w-8 text-emerald-450" />
                )}
                {/* Symbol overlay badge */}
                {selectedCandidate.symbolUrl && (
                  <div className="absolute bottom-0 right-0 h-6 w-6 bg-white/95 rounded-tl-lg border-t border-l border-emerald-500/10 p-0.5 flex items-center justify-center">
                    <img src={selectedCandidate.symbolUrl} alt="" className="h-full w-full object-contain" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{selectedCandidate.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-mono">
                    {selectedCandidate.candidateId || 'No ID'}
                  </span>
                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded ${
                    selectedCandidate.partyId === 'independent' ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {selectedCandidate.partyAcronym || 'Independent'}
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    {selectedCandidate.type}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCandidate(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-emerald-950 border border-emerald-500/15 text-emerald-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body Info */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Candidate CNIC</span>
                  <p className="text-white text-sm font-semibold">{selectedCandidate.cnic || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Registered Assembly Seat</span>
                  <p className="text-white text-sm font-semibold">
                    {selectedCandidate.type === 'MNA' ? 'National Assembly (MNA)' : 'Provincial Assembly (MPA)'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Contact Email</span>
                  <p className="text-white text-sm font-semibold truncate">{selectedCandidate.email || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Candidate ID</span>
                  <p className="text-yellow-400 text-sm font-bold font-mono">{selectedCandidate.candidateId || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Constituency Info</span>
                <p className="text-white text-sm font-semibold flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-yellow-500" />
                  {getConstituencyDetails(selectedCandidate.constituencyId)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Contact Email / Manager</span>
                  <p className="text-white text-sm font-semibold truncate">{selectedCandidate.managerEmail}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Nomination Date</span>
                  <p className="text-white text-sm font-semibold">
                    {selectedCandidate.createdAt ? new Date(selectedCandidate.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3 space-y-1 text-slate-350 leading-relaxed text-[11px]">
                <strong className="text-yellow-400 text-xs block mb-1">Scrutiny Guidelines:</strong>
                Verify that candidate has filed valid nomination papers, possesses clean background check, does not hold dual nationality, and satisfies Article 62 & 63 requirements.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 border-t border-emerald-500/10 pt-5">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="flex-1 px-4 py-2.5 bg-emerald-900/60 border border-emerald-500/20 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors"
              >
                Close Details
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setRejectingItem({ type: 'candidate', id: selectedCandidate.id, name: selectedCandidate.name });
                  setRejectionInput('');
                }}
                className="flex-1 px-4 py-2.5 bg-red-650 hover:bg-red-700 text-white border border-red-500/30 rounded-lg text-xs font-black transition-colors flex justify-center items-center gap-1.5"
              >
                <XCircle className="h-4 w-4" /> Reject Nomination
              </button>
              <button
                type="button"
                onClick={() => handleCandidateApproval(selectedCandidate.id, 'approved')}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/30 rounded-lg text-xs font-black transition-colors flex justify-center items-center gap-1.5"
              >
                <CheckCircle className="h-4 w-4" /> Approve Nomination
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── Rejection Reason Modal ─── */}
      {rejectingItem && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-emerald-950 border border-red-500/30 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3 border-b border-red-500/10 pb-3">
              <AlertCircle className="h-6 w-6 text-red-500 animate-pulse" />
              <div>
                <h3 className="text-lg font-black text-white">Rejection Specification</h3>
                <p className="text-xxs text-red-400 font-bold uppercase tracking-wider">Provide Scrutiny Defect Details</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs text-slate-350">
                You are rejecting the nomination / registry request for <strong className="text-white">"{rejectingItem.name}"</strong>. 
                Please enter the exact legal reasons or compliance defects below. This message will be recorded in Firestore and dispatched immediately via email notification.
              </p>
              
              <div className="space-y-2">
                <label className="block text-xxs font-black uppercase text-slate-400 tracking-wider">
                  Rejection Reason / Scrutiny Remarks
                </label>
                <textarea
                  value={rejectionInput}
                  onChange={(e) => setRejectionInput(e.target.value)}
                  placeholder="e.g. Article 63 compliance check failed: asset declarations are incomplete or inconsistent."
                  className="w-full h-32 px-3 py-2 bg-emerald-900/40 border border-emerald-500/25 rounded-xl placeholder-emerald-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-emerald-500/10">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="flex-1 px-4 py-2.5 bg-emerald-900/60 border border-emerald-500/20 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!rejectionInput.trim()) {
                    toast.warning('Please state a reason for rejection.');
                    return;
                  }
                  const reason = rejectionInput.trim();
                  if (rejectingItem.type === 'party') {
                    await handlePartyApproval(rejectingItem.id, 'rejected', reason);
                  } else {
                    await handleCandidateApproval(rejectingItem.id, 'rejected', reason);
                  }
                  setRejectingItem(null);
                }}
                className="flex-1 px-4 py-2.5 bg-red-650 hover:bg-red-700 text-white border border-red-500/30 rounded-lg text-xs font-black transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminApprovals;
