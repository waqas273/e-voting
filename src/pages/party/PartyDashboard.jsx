import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, UserPlus, Users, CheckCircle, Clock, XCircle, BarChart2, Award, TrendingUp, X, Search, Lock } from 'lucide-react';
import { collection, getDocs, doc, addDoc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { motion } from 'framer-motion';
import CloudinaryUploader from '../../components/CloudinaryUploader.jsx';
import ChangePasswordModal from '../../components/ChangePasswordModal.jsx';

const PartyDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, triggerEmailNotification } = useAuth();

  const [constituencies, setConstituencies] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNominating, setIsNominating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'overview'
  const [overviewSearch, setOverviewSearch] = useState('');
  const [overviewType, setOverviewType] = useState('All'); // 'All' | 'national' | 'provincial'
  const [overviewProvince, setOverviewProvince] = useState('All'); // 'All' | 'Punjab' | 'Sindh' | 'KPK' | 'Balochistan'
  const [collapsedGroups, setCollapsedGroups] = useState({
    approved: false,
    pending: false,
    rejected: false,
    notNominating: false,
    requestsSubmitted: true
  });

  const [nomForm, setNomForm] = useState({ 
    name: '', 
    constituencyId: '', 
    symbolUrl: '', 
    cnic: '', 
    email: '', 
    profilePictureUrl: '' 
  });

  const handleCnicFormatter = (val) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 13) clean = clean.substring(0, 13);
    let formatted = '';
    if (clean.length > 0) formatted += clean.substring(0, Math.min(clean.length, 5));
    if (clean.length > 5) formatted += '-' + clean.substring(5, Math.min(clean.length, 12));
    if (clean.length > 12) formatted += '-' + clean.substring(12, 13);
    return formatted;
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      if (!user || user.role !== 'party') { navigate('/login'); return; }
      const constsSnapshot = await getDocs(collection(db, 'constituencies'));
      setConstituencies(constsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      const candQuery = query(collection(db, 'candidates'), where('partyAcronym', '==', user.acronym));
      const candSnapshot = await getDocs(candQuery);
      setCandidates(candSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load party statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, user]);

  const handleNomination = async (e) => {
    e.preventDefault();
    const candidateName = nomForm.name.trim();
    const cnic = nomForm.cnic.trim();
    const email = nomForm.email.trim().toLowerCase();
    const constituencyId = nomForm.constituencyId;
    const profilePictureUrl = nomForm.profilePictureUrl.trim();

    if (!candidateName || !cnic || !email || !constituencyId) {
      toast.error('Please fill in all required candidate fields');
      return;
    }

    if (cnic.length < 15) {
      toast.error('Please enter a valid 13-digit CNIC (XXXXX-XXXXXXX-X)');
      return;
    }

    setIsSaving(true);
    try {
      const constituency = constituencies.find(c => c.id === constituencyId);
      if (!constituency) {
        toast.error('Invalid constituency selected');
        setIsSaving(false);
        return;
      }
      const seatType = constituency.type === 'national' ? 'MNA' : 'MPA';

      // Rule 1: One candidate per Halka per party (ignore rejected filings)
      const partyDupQuery = query(
        collection(db, 'candidates'),
        where('constituencyId', '==', constituencyId),
        where('partyAcronym', '==', user.acronym)
      );
      const partyDupSnapshot = await getDocs(partyDupQuery);
      const hasActivePartyNomination = partyDupSnapshot.docs.some(docSnap => docSnap.data().status !== 'rejected');
      if (hasActivePartyNomination) {
        toast.error(`❌ Your party already has a candidate nominated for ${constituency.name} (${seatType})! Each party is restricted to 1 candidate per constituency.`);
        setIsSaving(false);
        return;
      }

      // Rule 2: Check if this candidate (CNIC) is already nominated in this constituency by any party
      const cnicDupQuery = query(
        collection(db, 'candidates'),
        where('constituencyId', '==', constituencyId),
        where('cnic', '==', cnic)
      );
      const cnicDupSnapshot = await getDocs(cnicDupQuery);
      const hasActiveCnicNomination = cnicDupSnapshot.docs.some(docSnap => docSnap.data().status !== 'rejected');
      if (hasActiveCnicNomination) {
        toast.error(`❌ This candidate is already nominated in ${constituency.name} under another registration!`);
        setIsSaving(false);
        return;
      }

      // Generate a professional Candidate ID
      const candidateId = 'ECP-CAND-' + Math.floor(100000 + Math.random() * 900000);

      const newCandidate = {
        candidateId,
        cnic,
        email,
        name: candidateName,
        profilePictureUrl,
        partyId: user.id,
        partyAcronym: user.acronym,
        symbolUrl: nomForm.symbolUrl.trim() || user.symbolUrl || '',
        constituencyId,
        type: seatType,
        status: 'pending',
        voteCount: 0,
        managerEmail: user.email,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'candidates'), newCandidate);
      setCandidates(prev => [...prev, { id: docRef.id, ...newCandidate }]);
      setNomForm({ name: '', constituencyId: '', symbolUrl: '', cnic: '', email: '', profilePictureUrl: '' });
      setIsNominating(false);

      const seatDetails = `${constituency.name} (${constituency.province})`;

      // Email 1: Notify Party Manager
      triggerEmailNotification(
        `Nomination Filed: ${newCandidate.name} (${seatType}) - ECP`,
        user.email,
        `ECP Portal: Nomination request submitted for candidate ${newCandidate.name} under party ${newCandidate.partyAcronym}.`,
        'approval',
        {
          recipient_name: user.name || `${newCandidate.partyAcronym} Party Manager`,
          title: 'ECP Nominations Branch',
          message_body: `Your political party has successfully filed a nomination petition for candidate "${newCandidate.name}" running for the ${seatType} assembly seat. The ECP Scrutiny Board is verifying the filing.`,
          detail_label_1: 'Candidate Name',
          detail_value_1: newCandidate.name,
          detail_label_2: 'Constituency',
          detail_value_2: seatDetails,
          detail_label_3: 'Nomination ID',
          detail_value_3: candidateId
        }
      );

      // Email 2: Notify Candidate
      if (newCandidate.email) {
        triggerEmailNotification(
          `Your ECP Seat Nomination Filed - ECP`,
          newCandidate.email.trim().toLowerCase(),
          `ECP Portal: You have been nominated as candidate by party ${newCandidate.partyAcronym}.`,
          'approval',
          {
            recipient_name: newCandidate.name,
            title: 'ECP Nominations Board',
            message_body: `You have been nominated by your party "${newCandidate.partyAcronym}" as their official candidate for the ${seatType} seat. ECP Scrutiny Board is validating your eligibility.`,
            detail_label_1: 'Candidate ID',
            detail_value_1: candidateId,
            detail_label_2: 'Constituency',
            detail_value_2: seatDetails,
            detail_label_3: 'Party Affiliation',
            detail_value_3: newCandidate.partyAcronym
          }
        );
      }

      // Email 3: Notify ECP Admin
      triggerEmailNotification(
        `Party Candidate Nomination Filed - ECP`,
        'admin@ecp.gov.pk',
        `ECP Portal: New candidate nomination pending review for ${newCandidate.name}`,
        'approval',
        {
          recipient_name: 'ECP Administrator',
          title: 'ECP Command Center',
          message_body: `A new candidate nomination has been submitted by political party "${newCandidate.partyAcronym}" for candidate "${newCandidate.name}". The request is waiting for your scrutiny.`,
          detail_label_1: 'Candidate Name',
          detail_value_1: newCandidate.name,
          detail_label_2: 'Constituency',
          detail_value_2: seatDetails,
          detail_label_3: 'Party Acronym',
          detail_value_3: newCandidate.partyAcronym
        }
      );
      toast.success('📝 Nomination petition filed and submitted to ECP!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to file candidate nomination: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getConstituencyName = (id) => {
    const found = constituencies.find(c => c.id === id);
    return found ? found.name : 'Unknown Halka';
  };

  const nationalHalkas = constituencies.filter(c => c.type === 'national');
  const provincialHalkas = constituencies.filter(c => c.type === 'provincial');

  const approvedCount = candidates.filter(c => c.status === 'approved').length;
  const pendingCount = candidates.filter(c => c.status === 'pending').length;
  const rejectedCount = candidates.filter(c => c.status === 'rejected').length;
  const totalVotes = candidates.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.voteCount || 0), 0);

  const filteredOverviewConstituencies = constituencies.filter(c => {
    if (overviewSearch.trim() !== '') {
      const q = overviewSearch.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchDistrict = (c.district || '').toLowerCase().includes(q);
      const matchProv = (c.province || '').toLowerCase().includes(q);
      if (!matchName && !matchDistrict && !matchProv) return false;
    }
    if (overviewType !== 'All' && c.type !== overviewType) return false;
    
    // Province filter for Provincial Assembly seats
    if (overviewType === 'provincial' && overviewProvince !== 'All') {
      const p = c.province.toLowerCase();
      if (overviewProvince === 'KPK' && p !== 'khyber pakhtunkhwa' && p !== 'khyber paktunkhwa' && p !== 'kpk') return false;
      if (overviewProvince !== 'KPK' && p !== overviewProvince.toLowerCase()) return false;
    }
    return true;
  });

  const groups = {
    approved: [],
    pending: [],
    rejected: [],
    notNominating: [],
    requestsSubmitted: []
  };

  filteredOverviewConstituencies.forEach(c => {
    const cand = candidates.find(cand => cand.constituencyId === c.id);
    if (!cand) {
      groups.notNominating.push(c);
    } else {
      groups.requestsSubmitted.push({ constituency: c, candidate: cand });
      if (cand.status === 'approved') {
        groups.approved.push({ constituency: c, candidate: cand });
      } else if (cand.status === 'pending') {
        groups.pending.push({ constituency: c, candidate: cand });
      } else if (cand.status === 'rejected') {
        groups.rejected.push({ constituency: c, candidate: cand });
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statusBadge = (status) => {
    if (status === 'approved') return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ Approved</span>;
    if (status === 'pending') return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">⏳ Pending</span>;
    if (status === 'rejected') return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">✗ Rejected</span>;
    return null;
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 text-slate-50 font-sans relative overflow-hidden bg-emerald-950">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[50%] w-[50%] h-[50%] bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">

        {/* ─── Party Hero ─── */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 shadow-neon-gold" />
          <div className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="h-20 w-20 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white/5 border border-yellow-500/30 shadow-glass-gold">
                {user.symbolUrl ? (
                  <img src={user.symbolUrl} alt={user.acronym} className="h-14 w-14 object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                ) : (
                  <Landmark className="h-10 w-10 text-emerald-400" />
                )}
              </div>
              <div>
                <div className="flex items-center flex-wrap justify-center sm:justify-start gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white glow-text-gold">{user.partyName}</h1>
                  <span className="text-xs font-black px-3 py-1 rounded-lg uppercase bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 shadow-inner">
                    {user.acronym}
                  </span>
                </div>
                <p className="text-xs text-emerald-200/60 font-semibold tracking-wide">
                  Official Party Manager Console &bull; {user.email}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setShowChangePassword(true)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                style={{ background: 'rgba(4,20,13,0.6)', border: '1px solid rgba(16,185,129,0.2)', color: 'rgba(52,211,153,0.7)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.4)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)'; e.currentTarget.style.color = 'rgba(52,211,153,0.7)'; }}
              >
                <Lock className="h-4 w-4" /> Change Password
              </button>
              <button
                onClick={() => setIsNominating(!isNominating)}
                className={isNominating ? 'btn-secondary text-sm' : 'btn-primary text-sm whitespace-nowrap inline-flex items-center'}
              >
                {isNominating ? (
                  <><X className="h-4 w-4 mr-2" /> Cancel</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" /> Nominate Candidate</>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ─── Tab Switcher ─── */}
        <div className="flex gap-2 p-1.5 bg-emerald-950/80 border border-emerald-500/15 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-yellow-500 text-emerald-950 shadow-lg font-black'
                : 'text-emerald-400 hover:text-white'
            }`}
          >
            Console Dashboard
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeTab === 'overview'
                ? 'bg-yellow-500 text-emerald-950 shadow-lg font-black'
                : 'text-emerald-400 hover:text-white'
            }`}
          >
            Constituency Overview
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <>
            {/* ─── Stats Row ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Total Nominees', value: candidates.length, icon: Users, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Approved', value: approvedCount, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Pending ECP', value: pendingCount, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Total Votes', value: totalVotes, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
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
              <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-emerald-200/70">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ─── Nomination Form ─── */}
        {isNominating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-2xl overflow-hidden max-w-lg mx-auto border-yellow-500/20"
          >
            <div className="px-6 py-4 flex items-center gap-2 border-b border-yellow-500/10 bg-yellow-500/5">
              <UserPlus className="h-5 w-5 text-yellow-400" />
              <h2 className="text-base font-black text-white">Nominate Candidate Petition</h2>
            </div>
            <form onSubmit={handleNomination} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-emerald-300">
                  Candidate Full Name *
                </label>
                <input
                  type="text" required
                  value={nomForm.name}
                  onChange={e => setNomForm({ ...nomForm, name: e.target.value })}
                  placeholder="e.g. Khawaja Saad Rafique"
                  className="block w-full px-3 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg placeholder-emerald-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-emerald-300">
                    Candidate CNIC *
                  </label>
                  <input
                    type="text" required
                    value={nomForm.cnic}
                    onChange={e => setNomForm({ ...nomForm, cnic: handleCnicFormatter(e.target.value) })}
                    placeholder="35201-1234567-1"
                    className="block w-full px-3 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg placeholder-emerald-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm font-mono transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-emerald-300">
                    Candidate Contact Email *
                  </label>
                  <input
                    type="email" required
                    value={nomForm.email}
                    onChange={e => setNomForm({ ...nomForm, email: e.target.value })}
                    placeholder="candidate@party.com"
                    className="block w-full px-3 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg placeholder-emerald-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-emerald-300">
                  Target Halka *
                </label>
                <select
                  value={nomForm.constituencyId}
                  onChange={e => setNomForm({ ...nomForm, constituencyId: e.target.value })}
                  required 
                  className="block w-full px-3 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm transition-all"
                >
                  <option value="">Select Constituency</option>
                  <optgroup label="National Assembly (NA)">
                    {nationalHalkas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                  <optgroup label="Provincial Assembly (PA)">
                    {provincialHalkas.map(c => <option key={c.id} value={c.id}>{c.name} ({c.province})</option>)}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CloudinaryUploader
                  label="Candidate Profile Picture (Upload) *"
                  hint="Upload candidate's professional face photo"
                  currentUrl={nomForm.profilePictureUrl}
                  onUpload={(url) => setNomForm({ ...nomForm, profilePictureUrl: url })}
                />
                <CloudinaryUploader
                  label="Election Symbol (Optional)"
                  hint="Defaults to the official party symbol"
                  currentUrl={nomForm.symbolUrl}
                  onUpload={(url) => setNomForm({ ...nomForm, symbolUrl: url })}
                />
              </div>

              <button type="submit" disabled={isSaving} className="btn-primary w-full justify-center text-sm inline-flex items-center">
                {isSaving ? <LoadingSpinner size="sm" /> : <><UserPlus className="h-4 w-4 mr-2" /> File Nomination Request</>}
              </button>
            </form>
          </motion.div>
        )}

        {/* ─── Main Panels ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Nominees Registry Table */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel rounded-2xl overflow-hidden lg:col-span-2"
          >
            <div className="px-5 py-4 flex items-center justify-between border-b border-emerald-500/10 bg-emerald-900/20">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-yellow-400" />
                <h2 className="text-base font-black text-white">Party Nominees Registry</h2>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 uppercase tracking-widest">
                {candidates.length} Filed
              </span>
            </div>

            {candidates.length === 0 ? (
              <div className="py-14 text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 bg-emerald-900/40 border border-emerald-500/20 shadow-inner">
                  <Users className="h-8 w-8 text-emerald-400/50" />
                </div>
                <p className="text-lg font-black text-white">No Candidates Yet</p>
                <p className="text-xs mt-1 text-emerald-200/50">
                  Click "Nominate Candidate" to begin filing.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-emerald-950/40 border-b border-emerald-500/10 text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
                    <tr>
                      <th className="px-6 py-4">Candidate</th>
                      <th className="px-6 py-4">Halka</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">ECP Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-500/10">
                    {candidates.map((c, idx) => (
                      <motion.tr 
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 + (idx * 0.05) }}
                        className="hover:bg-emerald-900/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedCandidate(c)}>
                            {c.profilePictureUrl ? (
                              <img src={c.profilePictureUrl} alt="" className="h-9 w-9 object-cover rounded-full bg-emerald-950 border border-emerald-500/20" />
                            ) : (
                              <div className="h-9 w-9 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                                <Users className="h-4 w-4 text-emerald-400" />
                              </div>
                            )}
                            <div>
                              <span className="text-sm font-bold text-white hover:text-yellow-400 transition-colors block">{c.name}</span>
                              <span className="text-[10px] text-yellow-400/80 font-mono tracking-wider block">{c.candidateId || 'N/A'}</span>
                              <span className="text-[9px] text-emerald-400 font-mono mt-0.5 block">CNIC: {c.cnic || 'N/A'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-emerald-200/70 font-semibold">
                            {getConstituencyName(c.constituencyId)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">{c.type}</span>
                        </td>
                        <td className="px-6 py-4">{statusBadge(c.status)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Live Performance Panel */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-panel rounded-2xl overflow-hidden"
          >
            <div className="px-5 py-4 flex items-center gap-2 border-b border-emerald-500/10 bg-emerald-900/20">
              <BarChart2 className="h-5 w-5 text-yellow-400" />
              <h2 className="text-base font-black text-white">Live Performance</h2>
            </div>
            <div className="p-5">
              {candidates.filter(c => c.status === 'approved').length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-3 bg-emerald-900/40 border border-emerald-500/20 shadow-inner">
                    <BarChart2 className="h-6 w-6 text-emerald-400/50" />
                  </div>
                  <p className="text-xs text-emerald-200/50">No approved candidates running.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {candidates.filter(c => c.status === 'approved')
                    .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
                    .map((c, idx) => {
                      const maxVotes = Math.max(...candidates.filter(cc => cc.status === 'approved').map(cc => cc.voteCount || 0), 1);
                      const pct = ((c.voteCount || 0) / maxVotes) * 100;
                      return (
                        <div key={c.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-bold text-white leading-tight truncate max-w-[150px]">{c.name}</p>
                              <p className="text-[10px] text-emerald-200/60 uppercase tracking-wider font-semibold mt-0.5">
                                {getConstituencyName(c.constituencyId)} • {c.type}
                              </p>
                            </div>
                            <div className="text-sm font-black rounded-lg px-2.5 py-1 ml-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                              {c.voteCount || 0}
                            </div>
                          </div>
                          <div className="live-bar h-2 w-full">
                            <div className={`live-bar-fill h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'leading' : ''}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </motion.div>

        </div>

          </>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in bg-emerald-900/20 border border-emerald-500/15 rounded-2xl p-6">
            
            {/* Header / Subtitle */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-yellow-500" />
                  Constituency Overview
                </h2>
                <p className="text-xs text-emerald-350">Track ECP status and nominate candidates in all Pakistan constituencies</p>
              </div>
            </div>

            {/* Assembly Filter and Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              {/* Assembly Sub-tabs */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full sm:w-auto">
                <div className="flex gap-1.5 p-0.5 bg-emerald-950/80 border border-emerald-500/10 rounded-lg text-xs w-fit">
                  {[
                    { key: 'All', label: 'All Assemblies' },
                    { key: 'national', label: 'NA (MNA Seat)' },
                    { key: 'provincial', label: 'PA (MPA Seat)' }
                  ].map(type => (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => {
                        setOverviewType(type.key);
                        setOverviewProvince('All'); // Reset province filter
                      }}
                      className={`px-4 py-1.5 rounded-md font-black uppercase text-[10px] tracking-wider transition-colors ${
                        overviewType === type.key ? 'bg-yellow-500 text-emerald-950' : 'text-emerald-350 hover:text-white'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>

                {/* Province filters under PA seats */}
                {overviewType === 'provincial' && (
                  <div className="flex gap-1 p-0.5 bg-emerald-950/80 border border-emerald-500/10 rounded-lg text-xs w-fit animate-fade-in">
                    {[
                      { key: 'All', label: 'All Provinces' },
                      { key: 'Punjab', label: 'Punjab' },
                      { key: 'Sindh', label: 'Sindh' },
                      { key: 'KPK', label: 'KPK' },
                      { key: 'Balochistan', label: 'Balochistan' }
                    ].map(prov => (
                      <button
                        key={prov.key}
                        type="button"
                        onClick={() => setOverviewProvince(prov.key)}
                        className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${
                          overviewProvince === prov.key ? 'bg-emerald-500 text-white' : 'text-emerald-400 hover:text-white'
                        }`}
                      >
                        {prov.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search bar */}
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-emerald-500" />
                </span>
                <input
                  type="text"
                  value={overviewSearch}
                  onChange={e => setOverviewSearch(e.target.value)}
                  placeholder="Search Halka by name, code, or province..."
                  className="block w-full pl-9 pr-3 py-2 bg-emerald-950/50 border border-emerald-500/25 rounded-xl placeholder-emerald-700 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                />
              </div>
            </div>

            {/* Groups */}
            <div className="space-y-4">
              
              {/* Category 1: Approved */}
              <div className="bg-emerald-950/30 border border-emerald-500/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setCollapsedGroups(p => ({ ...p, approved: !p.approved }))}
                  className="w-full flex items-center justify-between p-4 bg-emerald-900/10 hover:bg-emerald-900/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-black uppercase tracking-wider text-emerald-400">Approved Nominations</span>
                    <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      {groups.approved.length}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-555 font-bold uppercase tracking-wider">
                    {collapsedGroups.approved ? 'Expand ▾' : 'Collapse ▴'}
                  </span>
                </button>
                
                {!collapsedGroups.approved && (
                  <div className="p-4 border-t border-emerald-500/5">
                    {groups.approved.length === 0 ? (
                      <p className="text-xs text-emerald-600/80 italic text-center py-4">No approved nominations match current filters.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groups.approved.map(item => (
                          <div key={item.constituency.id} className="p-4 bg-emerald-950/50 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-white">{item.constituency.name}</h4>
                              <p className="text-[10px] text-emerald-400 mt-1 font-semibold uppercase tracking-wider">{item.constituency.type === 'national' ? 'National Assembly' : `${item.constituency.province} Assembly`}</p>
                              <p className="text-[11px] text-slate-350 mt-1">Candidate: <strong className="text-white">{item.candidate.name}</strong></p>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                              Approved
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Category 2: Pending */}
              <div className="bg-emerald-950/30 border border-emerald-500/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setCollapsedGroups(p => ({ ...p, pending: !p.pending }))}
                  className="w-full flex items-center justify-between p-4 bg-emerald-900/10 hover:bg-emerald-900/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="text-sm font-black uppercase tracking-wider text-yellow-400">Pending Scrutiny</span>
                    <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                      {groups.pending.length}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-555 font-bold uppercase tracking-wider">
                    {collapsedGroups.pending ? 'Expand ▾' : 'Collapse ▴'}
                  </span>
                </button>
                
                {!collapsedGroups.pending && (
                  <div className="p-4 border-t border-emerald-500/5">
                    {groups.pending.length === 0 ? (
                      <p className="text-xs text-emerald-600/80 italic text-center py-4">No pending applications match current filters.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groups.pending.map(item => (
                          <div key={item.constituency.id} className="p-4 bg-emerald-950/50 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-white">{item.constituency.name}</h4>
                              <p className="text-[10px] text-yellow-500 mt-1 font-semibold uppercase tracking-wider">{item.constituency.type === 'national' ? 'National Assembly' : `${item.constituency.province} Assembly`}</p>
                              <p className="text-[11px] text-slate-350 mt-1">Candidate: <strong className="text-white">{item.candidate.name}</strong></p>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 animate-pulse">
                              Pending
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Category 3: Rejected */}
              <div className="bg-emerald-950/30 border border-emerald-500/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setCollapsedGroups(p => ({ ...p, rejected: !p.rejected }))}
                  className="w-full flex items-center justify-between p-4 bg-emerald-900/10 hover:bg-emerald-900/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-black uppercase tracking-wider text-red-400">Rejected / Scrutiny Defect</span>
                    <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400">
                      {groups.rejected.length}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-555 font-bold uppercase tracking-wider">
                    {collapsedGroups.rejected ? 'Expand ▾' : 'Collapse ▴'}
                  </span>
                </button>
                
                {!collapsedGroups.rejected && (
                  <div className="p-4 border-t border-emerald-500/5">
                    {groups.rejected.length === 0 ? (
                      <p className="text-xs text-emerald-600/80 italic text-center py-4">No rejected nominations match current filters.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {groups.rejected.map(item => (
                          <div key={item.constituency.id} className="p-4 bg-emerald-950/50 border border-red-500/15 rounded-xl space-y-3 relative group">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-black text-white">{item.constituency.name}</h4>
                                <p className="text-[10px] text-emerald-450 mt-1 uppercase font-semibold tracking-wider">
                                  {item.constituency.type === 'national' ? 'National Assembly' : `${item.constituency.province} Assembly`}
                                </p>
                                <p className="text-[11px] text-slate-350 mt-1">Rejected Candidate: <strong className="text-white">{item.candidate.name}</strong></p>
                              </div>
                              <button
                                onClick={() => {
                                  setNomForm(prev => ({ ...prev, constituencyId: item.constituency.id }));
                                  setIsNominating(true);
                                  setActiveTab('dashboard');
                                  window.scrollTo({ top: 100, behavior: 'smooth' });
                                }}
                                className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-emerald-950 font-black rounded-lg text-[9px] uppercase tracking-wider transition-colors shadow-lg"
                              >
                                Nominate Again
                              </button>
                            </div>
                            {item.candidate.rejectionReason && (
                              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-xxs text-red-350">
                                <strong className="block font-black text-red-400 uppercase tracking-widest text-[9px] mb-1">Scrutiny remarks:</strong>
                                {item.candidate.rejectionReason}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Category 4: Not Nominating Yet */}
              <div className="bg-emerald-950/30 border border-emerald-500/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setCollapsedGroups(p => ({ ...p, notNominating: !p.notNominating }))}
                  className="w-full flex items-center justify-between p-4 bg-emerald-900/10 hover:bg-emerald-900/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-500" />
                    <span className="text-sm font-black uppercase tracking-wider text-slate-300 font-medium">Not Nominating Yet (Open Seats)</span>
                    <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-slate-500/10 border border-slate-500/20 text-slate-350">
                      {groups.notNominating.length}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-555 font-bold uppercase tracking-wider">
                    {collapsedGroups.notNominating ? 'Expand ▾' : 'Collapse ▴'}
                  </span>
                </button>
                
                {!collapsedGroups.notNominating && (
                  <div className="p-4 border-t border-emerald-500/5">
                    {groups.notNominating.length === 0 ? (
                      <p className="text-xs text-emerald-600/80 italic text-center py-4">All constituencies have active nominations!</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groups.notNominating.map(c => (
                          <div key={c.id} className="p-4 bg-emerald-950/50 border border-dashed border-emerald-500/15 rounded-xl flex items-center justify-between hover:border-yellow-500/25 transition-colors">
                            <div>
                              <h4 className="text-sm font-bold text-white">{c.name}</h4>
                              <p className="text-[10px] text-emerald-450 mt-1 uppercase font-semibold tracking-wider">
                                {c.type === 'national' ? 'National Assembly' : `${c.province} Assembly`}
                              </p>
                              {c.district && <p className="text-[9px] text-emerald-600 font-mono mt-0.5">District: {c.district}</p>}
                            </div>
                            <button
                              onClick={() => {
                                setNomForm(prev => ({ ...prev, constituencyId: c.id }));
                                setIsNominating(true);
                                setActiveTab('dashboard');
                                window.scrollTo({ top: 100, behavior: 'smooth' });
                              }}
                              className="px-3 py-1.5 bg-emerald-800/80 hover:bg-yellow-500 hover:text-emerald-950 border border-emerald-500/20 hover:border-transparent text-emerald-300 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all"
                            >
                              Nominate
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Category 5: All Requests Submitted */}
              <div className="bg-emerald-950/30 border border-emerald-500/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setCollapsedGroups(p => ({ ...p, requestsSubmitted: !p.requestsSubmitted }))}
                  className="w-full flex items-center justify-between p-4 bg-emerald-900/10 hover:bg-emerald-900/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-sm font-black uppercase tracking-wider text-slate-355">All Requested Placements</span>
                    <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                      {groups.requestsSubmitted.length}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-555 font-bold uppercase tracking-wider">
                    {collapsedGroups.requestsSubmitted ? 'Expand ▾' : 'Collapse ▴'}
                  </span>
                </button>
                
                {!collapsedGroups.requestsSubmitted && (
                  <div className="p-4 border-t border-emerald-500/5">
                    {groups.requestsSubmitted.length === 0 ? (
                      <p className="text-xs text-emerald-600/80 italic text-center py-4">No requested placements match current filters.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groups.requestsSubmitted.map(item => (
                          <div key={item.constituency.id} className="p-4 bg-emerald-950/50 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-white">{item.constituency.name}</h4>
                              <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold tracking-wider">
                                {item.constituency.type === 'national' ? 'National Assembly' : `${item.constituency.province} Assembly`}
                              </p>
                              <p className="text-[11px] text-slate-350 mt-1">Candidate: <strong className="text-white">{item.candidate.name}</strong></p>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                              item.candidate.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              item.candidate.status === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                              'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 animate-pulse'
                            }`}>
                              {item.candidate.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>

      {/* ─── Candidate Details Modal ─── */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-emerald-950 border border-emerald-500/30 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative text-white">
            
            {/* Modal Header */}
            <div className="flex items-center gap-4 border-b border-emerald-500/10 pb-4">
              <div className="h-16 w-16 rounded-xl bg-emerald-900 border border-yellow-500/20 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg">
                {selectedCandidate.profilePictureUrl ? (
                  <img src={selectedCandidate.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Users className="h-8 w-8 text-emerald-450" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{selectedCandidate.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    {selectedCandidate.candidateId || 'No ID Assigned'}
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
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

            {/* Modal Body */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Candidate CNIC</span>
                  <p className="text-white text-sm font-semibold">{selectedCandidate.cnic || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Contact Email</span>
                  <p className="text-white text-sm font-semibold truncate">{selectedCandidate.email || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Constituency Info</span>
                  <p className="text-white text-sm font-semibold">{getConstituencyName(selectedCandidate.constituencyId)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Nomination Status</span>
                  <p className="text-white text-sm font-semibold flex items-center gap-1.5">
                    {statusBadge(selectedCandidate.status)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Nomination Date</span>
                  <p className="text-white text-sm font-semibold">
                    {selectedCandidate.createdAt ? new Date(selectedCandidate.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-450 tracking-wider">Votes Tally</span>
                  <p className="text-yellow-400 text-sm font-black">{selectedCandidate.voteCount || 0} Votes</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-emerald-500/10 pt-4">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-5 py-2 bg-emerald-900/60 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal role="party" onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
};

export default PartyDashboard;
