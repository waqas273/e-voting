import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Vote, User, Mail, Lock, Hash, Shield, Users, Landmark, AlertCircle, UserPlus, CheckCircle } from 'lucide-react';
import { collection, getDocs, doc, getDoc, query, where, addDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase.js';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '../context/AuthContext.jsx';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import CloudinaryUploader from '../components/CloudinaryUploader.jsx';

const LoginPage = () => {
  const [loginType, setLoginType] = useState('voter'); // 'voter' | 'independent' | 'party'  (admin uses party tab)
  const [isRegisteringParty, setIsRegisteringParty] = useState(false);
  const [regType, setRegType] = useState('party'); // 'party' | 'independent'
  const [constituencies, setConstituencies] = useState([]);
  const [takenSymbols, setTakenSymbols] = useState([]);
  // Target constituency selectors states
  const [selectedAssemblyType, setSelectedAssemblyType] = useState('');
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState('');
  const [halkaSearch, setHalkaSearch] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    cnic: '',
    // Party & Candidate Registration details
    partyName: '',
    acronym: '',
    leader: '',
    symbolName: 'Bat',
    symbolUrl: '',
    managerName: '',
    constituencyId: '',
    profilePictureUrl: '',
    motto: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const { login, triggerEmailNotification } = useAuth();
  const navigate = useNavigate();

  // Curated list of typical symbols
  const standardSymbols = [
    { name: 'Bat', url: 'https://cdn-icons-png.flaticon.com/512/5351/5351478.png' },
    { name: 'Lion', url: 'https://cdn-icons-png.flaticon.com/512/616/616412.png' },
    { name: 'Arrow', url: 'https://cdn-icons-png.flaticon.com/512/545/545682.png' },
    { name: 'Kite', url: 'https://cdn-icons-png.flaticon.com/512/3211/3211322.png' },
    { name: 'Tiger', url: 'https://cdn-icons-png.flaticon.com/512/3468/3468306.png' }
  ];

  const independentSymbols = [
    { name: 'Goat', url: 'https://cdn-icons-png.flaticon.com/512/375/375107.png' },
    { name: 'Bucket', url: 'https://cdn-icons-png.flaticon.com/512/3067/3067332.png' },
    { name: 'Telephone', url: 'https://cdn-icons-png.flaticon.com/512/455/455705.png' },
    { name: 'Bicycle', url: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png' },
    { name: 'Kettle', url: 'https://cdn-icons-png.flaticon.com/512/2928/2928095.png' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCnicChange = (e) => {
    let val = e.target.value.replace(/\D/g, ''); // Keep only numbers
    if (val.length > 13) val = val.substring(0, 13);
    
    let formatted = '';
    if (val.length > 0) {
      formatted += val.substring(0, Math.min(val.length, 5));
    }
    if (val.length > 5) {
      formatted += '-' + val.substring(5, Math.min(val.length, 12));
    }
    if (val.length > 12) {
      formatted += '-' + val.substring(12, 13);
    }
    
    setFormData(prev => ({ ...prev, cnic: formatted }));
  };

  // Fetch constituencies & taken symbols
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch constituencies
        const snap = await getDocs(collection(db, 'constituencies'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setConstituencies(list);

        // Fetch taken symbols from parties
        const partiesSnap = await getDocs(collection(db, 'parties'));
        const activePartiesSymbols = partiesSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.status !== 'rejected')
          .map(p => ({
            name: p.symbolName,
            url: p.symbolUrl,
            type: 'party',
            owner: `${p.name} (${p.acronym})`
          }));

        // Fetch taken symbols from candidates
        const candidatesSnap = await getDocs(collection(db, 'candidates'));
        const activeCandidatesSymbols = candidatesSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.status !== 'rejected')
          .map(c => ({
            name: c.symbolName,
            url: c.symbolUrl,
            type: 'independent',
            owner: `${c.name} (Independent)`
          }));

        // Combine and filter unique by name
        const combined = [...activePartiesSymbols, ...activeCandidatesSymbols];
        const unique = [];
        const seen = new Set();
        for (const item of combined) {
          if (item.name) {
            const lower = item.name.trim().toLowerCase();
            if (!seen.has(lower)) {
              seen.add(lower);
              unique.push(item);
            }
          }
        }
        setTakenSymbols(unique);
      } catch (err) {
        console.error("Failed to load registration data on login page:", err);
      }
    };
    if (isRegisteringParty) {
      fetchData();
    }
  }, [isRegisteringParty]);

  const handleRegisterParty = async (e) => {
    e.preventDefault();
    if (!formData.partyName || !formData.acronym || !formData.leader || !formData.email || !formData.password || !formData.symbolName) {
      toast.error('Please fill in all required registration fields');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Symbol Uniqueness Check
      const partySymbol = formData.symbolName.trim().toLowerCase();
      const isSymbolTaken = takenSymbols.some(s => s.name.trim().toLowerCase() === partySymbol);
      if (isSymbolTaken) {
        toast.error(`❌ The symbol "${formData.symbolName}" is already registered. Please enter a different unique symbol.`);
        setIsLoading(false);
        return;
      }

      // Check if email already registered as admin or party
      const partyQuery = query(collection(db, 'parties'), where('managerEmail', '==', formData.email.trim().toLowerCase()));
      const partySnapshot = await getDocs(partyQuery);

      if (!partySnapshot.empty) {
        toast.error('❌ This email is already registered for a political party');
        setIsLoading(false);
        return;
      }

      const selectedSymbol = standardSymbols.find(s => s.name.trim().toLowerCase() === partySymbol);
      const symbolUrl = formData.symbolUrl.trim() || selectedSymbol?.url || '';

      const partyData = {
        name: formData.partyName.trim(),
        acronym: formData.acronym.trim().toUpperCase(),
        leader: formData.leader.trim(),
        symbolName: formData.symbolName.trim(),
        symbolUrl: symbolUrl,
        managerName: formData.managerName.trim() || formData.leader.trim(),
        managerEmail: formData.email.trim().toLowerCase(),
        password: formData.password,   // stored as plain text
        status: 'pending',
        role: 'party',
        motto: formData.motto.trim(),
        profilePictureUrl: formData.profilePictureUrl.trim(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'parties'), partyData);
      
      // Trigger ECP simulation email
      // Notify Party Manager
      triggerEmailNotification(
        'Political Party Registration Filed - ECP',
        formData.email.trim().toLowerCase(),
        `ECP Portal: Party registration requested for ${partyData.name} (${partyData.acronym}).`,
        'approval',
        {
          recipient_name: partyData.managerName || partyData.leader,
          title: 'ECP Registration Board',
          message_body: `Your application to register the political party "${partyData.name} (${partyData.acronym})" has been received. The Election Commission will review your credentials and notify you of their decision.`,
          detail_label_1: 'Party Name',
          detail_value_1: partyData.name,
          detail_label_2: 'Symbol Name',
          detail_value_2: partyData.symbolName,
          detail_label_3: 'Application Status',
          detail_value_3: 'PENDING SCRUTINY'
        }
      );

      // Notify ECP Admin
      triggerEmailNotification(
        'New Party Registration Pending - ECP',
        'admin@ecp.gov.pk',
        `ECP Portal: New political party registration pending review: ${partyData.name}`,
        'approval',
        {
          recipient_name: 'ECP Administrator',
          title: 'ECP Command Center',
          message_body: `A new political party registration request has been submitted for "${partyData.name} (${partyData.acronym})" and is waiting for your commission review and decision.`,
          detail_label_1: 'Party Name',
          detail_value_1: partyData.name,
          detail_label_2: 'Leader',
          detail_value_2: partyData.leader,
          detail_label_3: 'Symbol Name',
          detail_value_3: partyData.symbolName
        }
      );

      toast.success('📝 Party registration request submitted to ECP for approval!');
      setIsRegisteringParty(false);
      setFormData({
        email: '', password: '', cnic: '',
        partyName: '', acronym: '', leader: '',
        symbolName: 'Bat', symbolUrl: '', managerName: '',
        constituencyId: '', profilePictureUrl: '', motto: ''
      });
    } catch (err) {
      console.error('Registration error:', err);
      toast.error('Failed to submit party registration: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterCandidate = async (e) => {
    e.preventDefault();
    if (!formData.leader || !formData.cnic || !formData.email || !formData.constituencyId || !formData.symbolName) {
      toast.error('Please fill in all required candidate fields');
      return;
    }

    if (formData.cnic.length < 15) {
      toast.error('Please enter a valid 13-digit CNIC (XXXXX-XXXXXXX-X)');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Symbol Uniqueness Check
      const candSymbol = formData.symbolName.trim().toLowerCase();
      const isSymbolTaken = takenSymbols.some(s => s.name.trim().toLowerCase() === candSymbol);
      if (isSymbolTaken) {
        toast.error(`❌ The symbol "${formData.symbolName}" is already registered. Please choose a different unique symbol.`);
        setIsLoading(false);
        return;
      }

      const selectedConstituency = constituencies.find(c => c.id === formData.constituencyId);
      if (!selectedConstituency) {
        toast.error('Invalid constituency selected');
        setIsLoading(false);
        return;
      }

      // Check if duplicate independent candidate with same CNIC or Name exists in the same Halka
      const q = query(
        collection(db, 'candidates'),
        where('constituencyId', '==', formData.constituencyId)
      );
      const snap = await getDocs(q);
      const isDuplicate = snap.docs.some(docSnap => {
        const data = docSnap.data();
        if (data.status === 'rejected') return false;
        return data.cnic === formData.cnic.trim() || data.name.toLowerCase() === formData.leader.trim().toLowerCase();
      });

      if (isDuplicate) {
        toast.error('❌ A candidate with this CNIC or name is already nominated in this constituency');
        setIsLoading(false);
        return;
      }

      const selectedSymbol = independentSymbols.find(s => s.name.trim().toLowerCase() === candSymbol);
      const symbolUrl = formData.symbolUrl.trim() || selectedSymbol?.url || '';
      
      const candidateId = 'ECP-CAND-' + Math.floor(100000 + Math.random() * 900000);

      const candidateData = {
        candidateId,
        name: formData.leader.trim(),
        cnic: formData.cnic.trim(),
        email: formData.email.trim().toLowerCase(),
        profilePictureUrl: formData.profilePictureUrl.trim(),
        partyId: 'independent',
        partyAcronym: 'Independent',
        symbolName: formData.symbolName.trim(),
        symbolUrl: symbolUrl,
        constituencyId: formData.constituencyId,
        type: selectedConstituency.type === 'national' ? 'MNA' : 'MPA',
        status: 'pending',
        voteCount: 0,
        motto: formData.motto.trim(),
        managerEmail: formData.email.trim().toLowerCase(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'candidates'), candidateData);

      // Trigger ECP simulation email
      // Notify Independent Candidate
      triggerEmailNotification(
        'Independent Candidate Registration Filed - ECP',
        formData.email.trim().toLowerCase(),
        `ECP Portal: Independent candidate registry filed for ${candidateData.name}.`,
        'approval',
        {
          recipient_name: candidateData.name,
          title: 'ECP Nominations Branch',
          message_body: `Your application to register as an Independent Candidate has been received. The ECP Scrutiny Board will review your credentials and background check.`,
          detail_label_1: 'Candidate ID',
          detail_value_1: candidateId,
          detail_label_2: 'Constituency',
          detail_value_2: `${selectedConstituency.name} (${candidateData.type})`,
          detail_label_3: 'Election Symbol',
          detail_value_3: candidateData.symbolName
        }
      );

      // Notify ECP Admin
      triggerEmailNotification(
        'Independent Candidate Nomination Alert - ECP',
        'admin@ecp.gov.pk',
        `ECP Portal: New independent candidate request pending review: ${candidateData.name}`,
        'approval',
        {
          recipient_name: 'ECP Administrator',
          title: 'ECP Command Center',
          message_body: `A new independent candidate registration request has been submitted for "${candidateData.name}" and is waiting for your scrutiny and approval.`,
          detail_label_1: 'Candidate Name',
          detail_value_1: candidateData.name,
          detail_label_2: 'Constituency',
          detail_value_2: `${selectedConstituency.name} (${candidateData.type})`,
          detail_label_3: 'Candidate CNIC',
          detail_value_3: candidateData.cnic
        }
      );

      toast.success('📝 Independent candidate registration submitted to ECP for approval!');
      setIsRegisteringParty(false);
      setSelectedAssemblyType('');
      setSelectedProvinceFilter('');
      setHalkaSearch('');
      setFormData({
        email: '', password: '', cnic: '',
        partyName: '', acronym: '', leader: '',
        symbolName: 'Bat', symbolUrl: '', managerName: '', constituencyId: '', profilePictureUrl: '', motto: ''
      });
    } catch (err) {
      console.error('Candidate registration error:', err);
      toast.error('Failed to submit candidate registration: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // ── Independent Candidate Login (CNIC + ECP Password) ──
      if (loginType === 'independent') {
        const cnic = formData.cnic.trim();
        const password = formData.password.trim();

        if (cnic.length < 15) {
          toast.error('❌ Please enter a valid 13-digit CNIC');
          setIsLoading(false);
          return;
        }

        // Query candidates by CNIC
        const candQuery = query(collection(db, 'candidates'), where('cnic', '==', cnic));
        const candSnap = await getDocs(candQuery);

        if (candSnap.empty) {
          toast.error('❌ CNIC not found in ECP candidate registry');
          setIsLoading(false);
          return;
        }

        const candDoc = candSnap.docs[0];
        const candData = candDoc.data();

        if (candData.partyId !== 'independent') {
          toast.error('❌ This CNIC belongs to a party-affiliated candidate, not an independent');
          setIsLoading(false);
          return;
        }

        if (candData.status !== 'approved') {
          toast.warning(`⚠️ Application status: ${candData.status?.toUpperCase()}. Awaiting ECP approval.`);
          setIsLoading(false);
          return;
        }

        if (!candData.password) {
          toast.error('❌ No password set yet. Contact ECP — your approval notification email contains the temporary password.');
          setIsLoading(false);
          return;
        }

        if (password !== candData.password) {
          toast.error('❌ Invalid password. Use the temporary password sent in your ECP approval email.');
          setIsLoading(false);
          return;
        }

        toast.success(`🇵🇰 Welcome, ${candData.name} (Independent Candidate)!`);
        login({
          id: candDoc.id,
          email: candData.email || candData.managerEmail,
          name: candData.name,
          partyId: 'independent',
          partyAcronym: 'Independent',
          symbolUrl: candData.symbolUrl,
          symbolName: candData.symbolName,
          cnic: candData.cnic,
          constituencyId: candData.constituencyId,
          role: 'independent'
        }, 'independent-token-' + candDoc.id);
        navigate('/candidate');
        return;
      }

      if (loginType === 'party') {
        const email = formData.email.trim().toLowerCase();
        const password = formData.password;

        // ── Step 1: Check if this email is registered in Firestore 'admins' ──
        const adminQuery = query(collection(db, 'admins'), where('email', '==', email));
        const adminSnapshot = await getDocs(adminQuery);

        if (!adminSnapshot.empty) {
          // Yes, this is an Admin! Let's authenticate using Firebase Auth.
          try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUid = userCredential.user.uid;
            const adminDoc = adminSnapshot.docs[0];
            const adminData = adminDoc.data();

            toast.success('🏛️ Welcome, ECP Administrator!');
            login({
              id: firebaseUid,
              email: adminData.email,
              name: adminData.name,
              role: 'admin'
            }, 'admin-token-' + firebaseUid);
            navigate('/admin');
            return;
          } catch (authErr) {
            console.error('Admin Auth Error:', authErr);
            if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
              toast.error('❌ Incorrect password for ECP Administrator account');
            } else if (authErr.code === 'auth/user-not-found') {
              toast.error('❌ ECP Administrator account not found in Auth system');
            } else {
              toast.error('❌ ECP Admin Authentication failed: ' + authErr.message);
            }
            setIsLoading(false);
            return;
          }
        }

        // ── Step 2: Check if this is an Independent Candidate (CNIC or Email match) ──
        const candQueryByCnic = query(collection(db, 'candidates'), where('cnic', '==', email.trim()));
        const candQueryByEmail = query(collection(db, 'candidates'), where('email', '==', email.trim()));
        
        let candSnap = await getDocs(candQueryByCnic);
        if (candSnap.empty) {
          candSnap = await getDocs(candQueryByEmail);
        }

        if (!candSnap.empty) {
          const candDoc = candSnap.docs[0];
          const candData = candDoc.data();

          if (candData.partyId === 'independent') {
            if (candData.status !== 'approved') {
              toast.warning(`⚠️ Independent Candidate status: ${candData.status.toUpperCase()}. Awaiting ECP approval.`);
              setIsLoading(false);
              return;
            }

            if (password !== candData.password) {
              toast.error('❌ Invalid password');
              setIsLoading(false);
              return;
            }

            toast.success(`🇵🇰 Welcome, ${candData.name} (Independent Candidate)!`);
            login({
              id: candDoc.id,
              email: candData.email || candData.managerEmail,
              name: candData.name,
              partyId: 'independent',
              partyAcronym: 'Independent',
              symbolUrl: candData.symbolUrl,
              symbolName: candData.symbolName,
              cnic: candData.cnic,
              constituencyId: candData.constituencyId,
              role: 'independent'
            }, 'independent-token-' + candDoc.id);
            navigate('/candidate');
            return;
          }
        }

        // ── Step 3: Check if this is a Party Manager ──
        const partyQuery = query(collection(db, 'parties'), where('managerEmail', '==', email));
        const partySnapshot = await getDocs(partyQuery);

        if (partySnapshot.empty) {
          toast.error('❌ Invalid credentials or Party not registered');
          setIsLoading(false);
          return;
        }

        const partyDoc = partySnapshot.docs[0];
        const partyData = partyDoc.data();

        if (partyData.status !== 'approved') {
          toast.warning(`⚠️ Party status: ${partyData.status.toUpperCase()}. Awaiting ECP approval.`);
          setIsLoading(false);
          return;
        }

        // Plain text password comparison (no bcrypt)
        if (password !== partyData.password) {
          toast.error('❌ Invalid password');
          setIsLoading(false);
          return;
        }

        toast.success(`🦁 Welcome, ${partyData.acronym} Party Manager!`);
        login({
          id: partyDoc.id,
          email: partyData.managerEmail,
          name: partyData.managerName,
          partyName: partyData.name,
          acronym: partyData.acronym,
          symbolUrl: partyData.symbolUrl,
          role: 'party'
        }, 'party-token-' + partyDoc.id);
        navigate('/party');

      } else {
        // Voter login (using CNIC and CNIC/password)
        const cnic = formData.cnic.trim();
        const password = formData.password.trim();

        if (cnic.length < 15) {
          toast.error('❌ Please enter a valid 13-digit CNIC');
          setIsLoading(false);
          return;
        }

        // Query voters collection directly
        const voterQuery = query(collection(db, 'voters'), where('cnic', '==', cnic));
        const voterSnapshot = await getDocs(voterQuery);

        if (voterSnapshot.empty) {
          toast.error('❌ CNIC not registered in the ECP system');
          setIsLoading(false);
          return;
        }

        const voterDoc = voterSnapshot.docs[0];
        const voterData = voterDoc.data();

        // Check password. If voter doesn't have a custom password yet, default is their CNIC
        const expectedPassword = voterData.password || cnic;
        if (password !== expectedPassword) {
          toast.error('❌ Invalid password (default is your CNIC)');
          setIsLoading(false);
          return;
        }

        toast.success(`🇵🇰 Welcome, ${voterData.name}!`);
        login({
          id: voterDoc.id,
          voterId: voterData.voterId || cnic,
          cnic: voterData.cnic,
          name: voterData.name,
          email: voterData.email,
          naConstituencyId: voterData.naConstituencyId || '',
          paConstituencyId: voterData.paConstituencyId || '',
          hasVotedMNA: voterData.hasVotedMNA || false,
          hasVotedMPA: voterData.hasVotedMPA || false,
          role: 'voter'
        }, 'voter-token-' + voterDoc.id);

        navigate('/voter');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('⚠️ An unexpected error occurred: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <motion.div 
        animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.05, 1] }} 
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-emerald-800/20 rounded-full blur-[100px] pointer-events-none" 
      />
      <motion.div 
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }} 
        transition={{ duration: 8, delay: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" 
      />

      <div className="max-w-md w-full mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="flex justify-center mb-4">
            <div className="bg-emerald-900/60 p-4 rounded-full border border-emerald-500/30 shadow-lg relative group transition-transform duration-300 hover:scale-105 animate-float">
              <Landmark className="h-14 w-14 text-yellow-400 filter drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]" />
              <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-xs opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white tracking-wide uppercase glow-text-gold">Election Commission</h2>
          <p className="text-emerald-300 text-xs font-black tracking-widest uppercase mt-1">Of Pakistan (ECP)</p>
          <p className="text-xs text-emerald-450 mt-2">Digital General Elections Voting Portal</p>
        </motion.div>

        {/* Outer Form Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl"
        >
          
          {!isRegisteringParty ? (
            <>
              {/* Login Type Switcher — 3 tabs: Voter | Independent Candidate | Party/Admin */}
              <div className="grid grid-cols-3 gap-1 bg-emerald-950/80 p-1 rounded-xl border border-emerald-500/10 mb-6">
                <button
                  type="button"
                  onClick={() => { setLoginType('voter'); setFormData({ email:'', password:'', cnic:'' }); }}
                  className={`py-2.5 px-1 rounded-lg text-center font-bold text-[11px] transition-all flex flex-col items-center gap-0.5 ${
                    loginType === 'voter'
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-emerald-400 hover:text-white'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Voter
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginType('independent'); setFormData({ email:'', password:'', cnic:'' }); }}
                  className={`py-2.5 px-1 rounded-lg text-center font-bold text-[11px] transition-all flex flex-col items-center gap-0.5 ${
                    loginType === 'independent'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-emerald-400 hover:text-white'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  Independent
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginType('party'); setFormData({ email:'', password:'', cnic:'' }); }}
                  className={`py-2.5 px-1 rounded-lg text-center font-bold text-[11px] transition-all flex flex-col items-center gap-0.5 ${
                    loginType === 'party'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-emerald-400 hover:text-white'
                  }`}
                >
                  <Landmark className="h-3.5 w-3.5" />
                  Party / Admin
                </button>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="text-center border-b border-emerald-500/10 pb-4">
                  <h3 className="text-lg font-bold text-white">
                    {loginType === 'voter' ? 'Voter Verification' :
                     loginType === 'independent' ? 'Independent Candidate Login' :
                     'Party Manager / Admin Portal'}
                  </h3>
                  <p className="text-xs text-emerald-450 mt-1">
                    {loginType === 'voter'
                      ? 'Provide your National Identity details'
                      : loginType === 'independent'
                      ? 'Use your CNIC and the ECP-issued temporary password'
                      : 'Sign in with your official email and password'}
                  </p>
                </div>

                {loginType === 'voter' ? (
                  <>
                    {/* Voter CNIC */}
                    <div>
                      <label htmlFor="voter-cnic" className="block text-xs font-semibold text-emerald-300 mb-1.5 uppercase tracking-wider">
                        CNIC Number (identity)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Hash className="h-5 w-5 text-emerald-500" />
                        </div>
                        <input
                          id="voter-cnic"
                          name="cnic"
                          type="text"
                          required
                          value={formData.cnic}
                          onChange={handleCnicChange}
                          className="block w-full pl-10 pr-3 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg placeholder-emerald-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm transition-all"
                          placeholder="35201-1234567-1"
                        />
                      </div>
                    </div>

                    {/* Voter Password */}
                    <div>
                      <label htmlFor="voter-password" className="block text-xs font-semibold text-emerald-300 mb-1.5 uppercase tracking-wider">
                        Security Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-emerald-500" />
                        </div>
                        <input
                          id="voter-password"
                          name="password"
                          type="password"
                          required
                          value={formData.password}
                          onChange={handleInputChange}
                          className="block w-full pl-10 pr-3 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg placeholder-emerald-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm transition-all"
                          placeholder="•••••••• (default is your CNIC)"
                        />
                      </div>
                      <div className="mt-2 bg-sky-950/30 border border-sky-500/15 p-2.5 rounded-lg flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5" />
                        <span className="text-[11px] text-sky-300/80">Default login password is your CNIC. Enter it in both CNIC and Password fields to verify identity.</span>
                      </div>
                    </div>
                  </>
                ) : loginType === 'independent' ? (
                  <>
                    {/* Independent CNIC */}
                    <div>
                      <label htmlFor="ind-cnic" className="block text-xs font-semibold text-emerald-300 mb-1.5 uppercase tracking-wider">
                        Your CNIC (Username)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Hash className="h-5 w-5 text-amber-500" />
                        </div>
                        <input
                          id="ind-cnic"
                          name="cnic"
                          type="text"
                          required
                          value={formData.cnic}
                          onChange={handleCnicChange}
                          className="block w-full pl-10 pr-3 py-3 bg-emerald-950/60 border border-amber-500/30 rounded-lg placeholder-emerald-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm transition-all"
                          placeholder="35201-1234567-1"
                        />
                      </div>
                    </div>

                    {/* Independent Password */}
                    <div>
                      <label htmlFor="ind-password" className="block text-xs font-semibold text-emerald-300 mb-1.5 uppercase tracking-wider">
                        ECP Temporary Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-amber-500" />
                        </div>
                        <input
                          id="ind-password"
                          name="password"
                          type="password"
                          required
                          value={formData.password}
                          onChange={handleInputChange}
                          className="block w-full pl-10 pr-3 py-3 bg-emerald-950/60 border border-amber-500/30 rounded-lg placeholder-emerald-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm transition-all"
                          placeholder="Enter ECP-issued password"
                        />
                      </div>
                      <div className="mt-2 bg-amber-950/30 border border-amber-500/20 p-3 rounded-lg flex items-start space-x-2">
                        <Shield className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px] text-amber-300/80 space-y-1">
                          <p className="font-bold text-amber-400">How to get your password?</p>
                          <p>When ECP approves your nomination, a temporary password is sent to your registered email and appears in your ECP Inbox (📩 mail icon in top bar).</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Admin / Party Email */}
                    <div>
                      <label htmlFor="party-email" className="block text-xs font-semibold text-emerald-300 mb-1.5 uppercase tracking-wider">
                        Official Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-emerald-500" />
                        </div>
                        <input
                          id="party-email"
                          name="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          className="block w-full pl-10 pr-3 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg placeholder-emerald-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm transition-all"
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>

                    {/* Admin / Party Password */}
                    <div>
                      <label htmlFor="party-password" className="block text-xs font-semibold text-emerald-300 mb-1.5 uppercase tracking-wider">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-emerald-500" />
                        </div>
                        <input
                          id="party-password"
                          name="password"
                          type="password"
                          required
                          value={formData.password}
                          onChange={handleInputChange}
                          className="block w-full pl-10 pr-3 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg placeholder-emerald-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl active:scale-98 transition-all shadow-lg focus:outline-none ${
                    loginType === 'voter'
                      ? 'text-white bg-sky-600 hover:bg-sky-500 hover:shadow-sky-500/25'
                      : loginType === 'independent'
                      ? 'text-white bg-amber-600 hover:bg-amber-500 hover:shadow-amber-500/25'
                      : 'text-emerald-950 bg-yellow-450 hover:bg-yellow-400 hover:shadow-yellow-400/25 animate-glow-pulse'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Verifying Identity...</span>
                    </>
                  ) : (
                    `Verify & Sign In`
                  )}
                </button>

                {loginType === 'party' && (
                  <div className="text-center pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisteringParty(true);
                        setRegType('party');
                        setFormData({
                          email:'', password:'', cnic:'',
                          partyName: '', acronym: '', leader: '',
                          symbolName: 'Bat', symbolUrl: '', managerName: '', constituencyId: ''
                        });
                      }}
                      className="text-xs text-yellow-400 hover:text-yellow-500 font-semibold"
                    >
                      New Party? Register Political Party Request →
                    </button>
                  </div>
                )}
                {loginType === 'independent' && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisteringParty(true);
                        setRegType('independent');
                        setFormData({
                          email:'', password:'', cnic:'',
                          partyName: '', acronym: '', leader: '',
                          symbolName: 'Goat', symbolUrl: '', managerName: '', constituencyId: ''
                        });
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      First time? File Independent Candidate Nomination →
                    </button>
                  </div>
                )}
              </form>

            </>
          ) : (
            /* Party / Independent Registration Form */
            <form onSubmit={regType === 'party' ? handleRegisterParty : handleRegisterCandidate} className="space-y-4">
              <div className="text-center border-b border-emerald-500/10 pb-4 mb-2">
                <h3 className="text-lg font-bold text-white">
                  {regType === 'party' ? 'Party Registration Request' : 'Independent Candidate Nomination'}
                </h3>
                <p className="text-xs text-emerald-450">
                  {regType === 'party' ? 'ECP Official Party Onboarding Application' : 'Direct ECP Constituency Seat Application'}
                </p>
              </div>

              {/* Tab Switcher inside registration form */}
              <div className="grid grid-cols-2 gap-1 bg-emerald-950/80 p-1 rounded-xl border border-emerald-500/10 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setRegType('party');
                    setFormData(prev => ({ ...prev, symbolName: 'Bat', symbolUrl: '' }));
                  }}
                  className={`py-2 px-1 rounded-lg text-center font-bold text-xxs transition-all ${
                    regType === 'party'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-emerald-450 hover:text-white'
                  }`}
                >
                  <Landmark className="h-3.5 w-3.5 mx-auto mb-0.5" />
                  Political Party
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegType('independent');
                    setFormData(prev => ({ ...prev, symbolName: 'Goat', symbolUrl: '' }));
                  }}
                  className={`py-2 px-1 rounded-lg text-center font-bold text-xxs transition-all ${
                    regType === 'independent'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-emerald-450 hover:text-white'
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5 mx-auto mb-0.5" />
                  Independent Candidate
                </button>
              </div>

              {regType === 'party' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider mb-1">Party Name</label>
                      <input
                        type="text"
                        name="partyName"
                        required
                        value={formData.partyName}
                        onChange={handleInputChange}
                        placeholder="e.g. Pakistan Tehreek-e-Insaf"
                        className="block w-full px-3 py-2 bg-emerald-950/65 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider mb-1">Acronym / Code</label>
                      <input
                        type="text"
                        name="acronym"
                        required
                        maxLength={10}
                        value={formData.acronym}
                        onChange={handleInputChange}
                        placeholder="e.g. PTI"
                        className="block w-full px-3 py-2 bg-emerald-950/65 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider mb-1">Party Leader</label>
                      <input
                        type="text"
                        name="leader"
                        required
                        value={formData.leader}
                        onChange={handleInputChange}
                        placeholder="e.g. Imran Khan"
                        className="block w-full px-3 py-2 bg-emerald-950/65 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider mb-1">Manager Name</label>
                      <input
                        type="text"
                        name="managerName"
                        value={formData.managerName}
                        onChange={handleInputChange}
                        placeholder="Same as leader if empty"
                        className="block w-full px-3 py-2 bg-emerald-950/65 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider mb-1">Party Motto</label>
                    <input
                      type="text"
                      name="motto"
                      required
                      value={formData.motto}
                      onChange={handleInputChange}
                      placeholder="e.g. Justice, Self-Reliance, Pakistan First"
                      className="block w-full px-3 py-2 bg-emerald-950/65 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CloudinaryUploader
                      label="Leader Profile Photo (Upload)"
                      hint="Upload party leader's official portrait"
                      currentUrl={formData.profilePictureUrl}
                      onUpload={(url) => setFormData(prev => ({ ...prev, profilePictureUrl: url }))}
                    />
                    <CloudinaryUploader
                      label="Party Symbol / Logo (Upload)"
                      hint="Upload custom party emblem - PNG/SVG recommended"
                      currentUrl={formData.symbolUrl}
                      onUpload={(url) => setFormData(prev => ({ ...prev, symbolUrl: url }))}
                    />
                  </div>

                  {/* Symbol selector system */}
                  <div className="bg-emerald-950/40 border border-emerald-500/10 p-3 rounded-lg space-y-2">
                    <div>
                      <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider mb-1">Choose Symbol Name</label>
                      <input
                        type="text"
                        name="symbolName"
                        required
                        value={formData.symbolName}
                        onChange={handleInputChange}
                        placeholder="Type custom name or click template below"
                        className="block w-full px-3 py-2 bg-emerald-950/65 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                      />
                    </div>

                    <div>
                      <span className="block text-[10px] text-emerald-400 mb-1">Select from typical standard symbols:</span>
                      <div className="flex gap-2 flex-wrap">
                        {standardSymbols.map(sym => (
                          <button
                            key={sym.name}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, symbolName: sym.name, symbolUrl: sym.url }))}
                            className={`px-2 py-1.5 rounded-lg border text-xxs flex items-center gap-1.5 transition-all ${
                              formData.symbolName.trim().toLowerCase() === sym.name.toLowerCase()
                                ? 'bg-yellow-450/20 border-yellow-450 text-yellow-400 font-bold'
                                : 'bg-emerald-950/40 border-emerald-500/10 text-emerald-300 hover:border-emerald-500/30'
                            }`}
                          >
                            <img src={sym.url} alt={sym.name} className="w-4 h-4 object-contain" />
                            {sym.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider mb-1">Official Manager Email</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="manager@party.com"
                      className="block w-full px-3 py-2 bg-emerald-950/65 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider mb-1">Access Password</label>
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create secure password"
                      className="block w-full px-3 py-2 bg-emerald-950/65 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Independent Candidate Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider mb-1">Candidate Full Name</label>
                      <input
                        type="text"
                        name="leader"
                        required
                        value={formData.leader}
                        onChange={handleInputChange}
                        placeholder="e.g. Barrister Gohar"
                        className="block w-full px-3 py-2 bg-emerald-950/65 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider mb-1">Candidate CNIC</label>
                      <input
                        type="text"
                        name="cnic"
                        required
                        value={formData.cnic}
                        onChange={handleCnicChange}
                        placeholder="35201-1234567-1"
                        className="block w-full px-3 py-2 bg-emerald-950/65 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider mb-1">Contact Email</label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="candidate@example.com"
                        className="block w-full px-3 py-2 bg-emerald-950/65 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider mb-1">Candidate Motto</label>
                      <input
                        type="text"
                        name="motto"
                        required
                        value={formData.motto}
                        onChange={handleInputChange}
                        placeholder="e.g. Devoted to Serve the Public"
                        className="block w-full px-3 py-2 bg-emerald-950/65 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Target Constituency Selection (Halka) */}
                  <div className="bg-emerald-950/40 border border-emerald-500/15 p-4 rounded-xl space-y-4">
                    <span className="block text-xs font-black text-yellow-400 uppercase tracking-wider border-b border-emerald-500/10 pb-2">
                      Target Constituency Selection (Halka)
                    </span>

                    {/* Filter 1: Assembly Type Selection */}
                    <div className="space-y-1.5">
                      <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider">
                        1. Select Assembly Type
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAssemblyType('national');
                            setSelectedProvinceFilter('');
                            setFormData(prev => ({ ...prev, constituencyId: '' }));
                          }}
                          className={`py-3 px-3 rounded-xl border text-center font-bold text-xs transition-all flex flex-col items-center gap-1 ${
                            selectedAssemblyType === 'national'
                              ? 'bg-yellow-450/20 border-yellow-450 text-yellow-400 shadow-[0_0_15px_rgba(251,191,36,0.15)] font-black'
                              : 'bg-emerald-950/60 border-emerald-500/10 text-emerald-350 hover:border-emerald-500/35 hover:text-white'
                          }`}
                        >
                          <span className="text-[11px] font-black uppercase">National Assembly</span>
                          <span className="text-[9px] opacity-75 font-normal">Member of National Assembly (MNA)</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAssemblyType('provincial');
                            setSelectedProvinceFilter('');
                            setFormData(prev => ({ ...prev, constituencyId: '' }));
                          }}
                          className={`py-3 px-3 rounded-xl border text-center font-bold text-xs transition-all flex flex-col items-center gap-1 ${
                            selectedAssemblyType === 'provincial'
                              ? 'bg-yellow-450/20 border-yellow-450 text-yellow-400 shadow-[0_0_15px_rgba(251,191,36,0.15)] font-black'
                              : 'bg-emerald-950/60 border-emerald-500/10 text-emerald-350 hover:border-emerald-500/35 hover:text-white'
                          }`}
                        >
                          <span className="text-[11px] font-black uppercase">Provincial Assembly</span>
                          <span className="text-[9px] opacity-75 font-normal">Member of Provincial Assembly (MPA)</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter 2: Province Selector */}
                    {selectedAssemblyType && (
                      <div className="space-y-1.5 animate-fade-in">
                        <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider">
                          2. Select Province Domain
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {[...new Set(constituencies.filter(c => c.type === selectedAssemblyType).map(c => c.province))].filter(Boolean).sort().map(prov => (
                            <button
                              key={prov}
                              type="button"
                              onClick={() => {
                                setSelectedProvinceFilter(prov);
                                setFormData(prev => ({ ...prev, constituencyId: '' }));
                              }}
                              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                                selectedProvinceFilter === prov
                                  ? 'bg-emerald-600 border-emerald-450 text-white font-black'
                                  : 'bg-emerald-950/60 border-emerald-500/10 text-emerald-300 hover:border-emerald-500/30'
                              }`}
                            >
                              {prov}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Filter 3: Constituency List & Search */}
                    {selectedAssemblyType && selectedProvinceFilter && (
                      <div className="space-y-2 animate-fade-in">
                        <div className="flex justify-between items-center">
                          <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider">
                            3. Select Constituency
                          </label>
                          {formData.constituencyId && (
                            <span className="text-[9px] text-yellow-450 font-bold bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded uppercase">
                              Active: {constituencies.find(c => c.id === formData.constituencyId)?.name}
                            </span>
                          )}
                        </div>

                        {/* Search Input */}
                        <input
                          type="text"
                          value={halkaSearch}
                          onChange={(e) => setHalkaSearch(e.target.value)}
                          placeholder="Search constituency code/name/district..."
                          className="block w-full px-2.5 py-1.5 bg-emerald-950/70 border border-emerald-500/20 rounded-lg placeholder-emerald-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        />

                        {/* Scrollable Constituency List */}
                        <div className="max-h-48 overflow-y-auto border border-emerald-500/15 rounded-lg p-1.5 bg-emerald-950/80 space-y-1 scrollbar-thin">
                          {constituencies
                            .filter(c => c.type === selectedAssemblyType && c.province === selectedProvinceFilter)
                            .filter(c => {
                              if (!halkaSearch.trim()) return true;
                              const q = halkaSearch.toLowerCase();
                              return (
                                c.name.toLowerCase().includes(q) ||
                                (c.constituencyName && c.constituencyName.toLowerCase().includes(q)) ||
                                (c.district && c.district.toLowerCase().includes(q))
                              );
                            })
                            .map(c => {
                              const isSelected = formData.constituencyId === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, constituencyId: c.id }))}
                                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-all border ${
                                    isSelected
                                      ? 'bg-yellow-400/10 border-yellow-450 text-white font-bold'
                                      : 'bg-transparent border-transparent hover:bg-emerald-900/15 text-slate-300 hover:text-white'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <span className={`text-xs font-black mr-2 ${isSelected ? 'text-yellow-450' : 'text-emerald-300'}`}>
                                      {c.name}
                                    </span>
                                    <span className="text-xs text-slate-200">{c.constituencyName}</span>
                                    <span className="block text-[9px] text-emerald-450 mt-0.5">District: {c.district}</span>
                                  </div>
                                  {isSelected && (
                                    <CheckCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 ml-2" />
                                  )}
                                </button>
                              );
                            })}
                          {constituencies
                            .filter(c => c.type === selectedAssemblyType && c.province === selectedProvinceFilter)
                            .filter(c => {
                              if (!halkaSearch.trim()) return true;
                              const q = halkaSearch.toLowerCase();
                              return (
                                c.name.toLowerCase().includes(q) ||
                                (c.constituencyName && c.constituencyName.toLowerCase().includes(q)) ||
                                (c.district && c.district.toLowerCase().includes(q))
                              );
                            }).length === 0 && (
                            <p className="text-xxs text-emerald-450 italic text-center py-4">No matching constituencies found</p>
                          )}
                        </div>
                      </div>
                    )}

                    {!selectedAssemblyType && (
                      <div className="p-3 bg-emerald-950/25 border border-emerald-500/10 rounded-lg text-center text-xxs text-emerald-400">
                        Please choose assembly type above.
                      </div>
                    )}
                    {selectedAssemblyType && !selectedProvinceFilter && (
                      <div className="p-3 bg-emerald-950/25 border border-emerald-500/10 rounded-lg text-center text-xxs text-emerald-400">
                        Please select a province to view available constituencies.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CloudinaryUploader
                      label="Candidate Photo (Upload) *"
                      hint="Upload professional headshot"
                      currentUrl={formData.profilePictureUrl}
                      onUpload={(url) => setFormData(prev => ({ ...prev, profilePictureUrl: url }))}
                    />
                    <CloudinaryUploader
                      label="Custom Symbol (Upload)"
                      hint="Upload election symbol emblem"
                      currentUrl={formData.symbolUrl}
                      onUpload={(url) => setFormData(prev => ({ ...prev, symbolUrl: url }))}
                    />
                  </div>

                  {/* Symbol selector system */}
                  <div className="bg-emerald-950/40 border border-emerald-500/10 p-3 rounded-lg space-y-2">
                    <div>
                      <label className="block text-xxs font-bold text-emerald-300 uppercase tracking-wider mb-1">Choose Symbol Name</label>
                      <input
                        type="text"
                        name="symbolName"
                        required
                        value={formData.symbolName}
                        onChange={handleInputChange}
                        placeholder="Type custom name or click template below"
                        className="block w-full px-3 py-2 bg-emerald-950/65 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                      />
                    </div>

                    <div>
                      <span className="block text-[10px] text-emerald-400 mb-1">Select from typical independent symbols:</span>
                      <div className="flex gap-2 flex-wrap">
                        {independentSymbols.map(sym => (
                          <button
                            key={sym.name}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, symbolName: sym.name, symbolUrl: sym.url }))}
                            className={`px-2 py-1.5 rounded-lg border text-xxs flex items-center gap-1.5 transition-all ${
                              formData.symbolName.trim().toLowerCase() === sym.name.toLowerCase()
                                ? 'bg-yellow-450/20 border-yellow-450 text-yellow-400 font-bold'
                                : 'bg-emerald-950/40 border-emerald-500/10 text-emerald-300 hover:border-emerald-500/30'
                            }`}
                          >
                            <img src={sym.url} alt={sym.name} className="w-4 h-4 object-contain" />
                            {sym.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Taken Symbols Gallery */}
              {takenSymbols.length > 0 && (
                <div className="bg-emerald-950/40 border border-yellow-500/25 p-3 rounded-lg">
                  <div className="text-xxs font-bold text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Taken Symbols (Collision Protection)
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1 max-h-[85px] scrollbar-thin">
                    {takenSymbols.map((sym, idx) => (
                      <div key={idx} className="flex-shrink-0 bg-emerald-950/80 border border-emerald-500/20 px-2 py-1.5 rounded-lg flex items-center gap-2 max-w-[150px]">
                        {sym.url ? (
                          <img src={sym.url} alt={sym.name} className="w-6 h-6 object-contain rounded" />
                        ) : (
                          <div className="w-6 h-6 bg-emerald-900 rounded flex items-center justify-center text-xxs font-bold text-emerald-400">?</div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xxs font-black text-white truncate leading-none">{sym.name}</p>
                          <p className="text-[9px] text-emerald-450 truncate mt-0.5" title={sym.owner}>{sym.owner}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-2.5 px-4 text-xs font-bold rounded-lg text-emerald-950 bg-yellow-450 hover:bg-yellow-400 active:scale-98 transition-all"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : 'Submit ECP Application'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegisteringParty(false)}
                  className="w-full py-2.5 px-4 text-xs font-bold text-emerald-350 hover:text-white bg-emerald-950/45 rounded-lg border border-emerald-500/10"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
