import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Landmark, Plus, Upload, Users, HelpCircle, Check, Trash2, Search, AlertTriangle, ShieldAlert, CheckCircle, Clock, X } from 'lucide-react';
import { collection, getDocs, doc, addDoc, deleteDoc, query, writeBatch, where } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import defaultConstituencies from '../../data/constituencies.json';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const AdminConstituencies = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { triggerEmailNotification } = useAuth();
  const [constituencies, setConstituencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Seeding/Reset States
  const [isResetting, setIsResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetVerificationCode, setResetVerificationCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [inputPhrase, setInputPhrase] = useState('');
  const [mathX, setMathX] = useState(0);
  const [mathY, setMathY] = useState(0);
  const [inputMath, setInputMath] = useState('');
  const [understandRisk, setUnderstandRisk] = useState(false);
  const [destructTimer, setDestructTimer] = useState(0);

  // Filtering & Searching States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Expanded Constituency & Voters States
  const [expandedConstituencyId, setExpandedConstituencyId] = useState('');
  const [voters, setVoters] = useState([]);
  const [isLoadingVoters, setIsLoadingVoters] = useState(false);
  const [voterSearchQuery, setVoterSearchQuery] = useState('');

  // Halka-Specific Voter Addition States
  const [addVoterHalka, setAddVoterHalka] = useState(null);
  const [halkaModalTab, setHalkaModalTab] = useState('manual'); // 'manual' | 'csv'
  const [halkaVoterForm, setHalkaVoterForm] = useState({
    cnic: '',
    name: '',
    email: '',
    naConstituencyId: '',
    paConstituencyId: ''
  });

  useEffect(() => {
    if (!addVoterHalka) return;
    setHalkaVoterForm({
      cnic: '',
      name: '',
      email: '',
      naConstituencyId: addVoterHalka.type === 'national' ? addVoterHalka.id : '',
      paConstituencyId: addVoterHalka.type === 'provincial' ? addVoterHalka.id : ''
    });
    setHalkaModalTab('manual');
  }, [addVoterHalka]);

  // Auto Destruct Timer Effect
  useEffect(() => {
    if (!showResetModal || destructTimer <= 0) return;
    const interval = setInterval(() => {
      setDestructTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [showResetModal, destructTimer]);

  const generateVerificationCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleTriggerReset = async () => {
    const c1 = await confirm("🚨 CRITICAL WARNING:\n\nThis will completely delete ALL constituencies, voters, candidates, and election events from Firestore.\n\nAre you absolutely sure?", {
      title: "Critical Warning",
      confirmText: "Yes, Proceed",
      cancelText: "Cancel",
      type: "danger"
    });
    if (!c1) return;

    const c2 = await confirm("⚠️ THIS IS IRREVERSIBLE!\n\nYou will lose all candidate registries, voter logins, and poll turnouts.\n\nDo you really want to proceed?", {
      title: "Irreversible Action",
      confirmText: "Understood, Next",
      cancelText: "Abort",
      type: "danger"
    });
    if (!c2) return;

    const c3 = await confirm("🛑 FINAL CONFIRMATION:\n\nAll databases will be wiped. Click OK to open the security verification panel.", {
      title: "Final Confirmation Check",
      confirmText: "Open Security Panel",
      cancelText: "Abort",
      type: "danger"
    });
    if (!c3) return;

    const code = generateVerificationCode();
    const x = Math.floor(Math.random() * 15) + 5;
    const y = Math.floor(Math.random() * 15) + 5;
    
    setResetVerificationCode(code);
    setMathX(x);
    setMathY(y);
    setInputCode('');
    setInputPhrase('');
    setInputMath('');
    setUnderstandRisk(false);
    setDestructTimer(5);
    setShowResetModal(true);
  };

  const handleExecuteSystemReset = async () => {
    const isDestructActive = 
      understandRisk &&
      destructTimer === 0 &&
      inputCode === resetVerificationCode &&
      inputPhrase === "DELETE ALL HALKAS" &&
      parseInt(inputMath) === (mathX + mathY);

    if (!isDestructActive) return;

    setIsResetting(true);
    try {
      // 1. Delete all voters in chunks
      const votersSnap = await getDocs(collection(db, 'voters'));
      const voterBatches = [];
      let currentVoterBatch = writeBatch(db);
      let vCount = 0;
      for (const d of votersSnap.docs) {
        currentVoterBatch.delete(d.ref);
        vCount++;
        if (vCount === 400) {
          voterBatches.push(currentVoterBatch);
          currentVoterBatch = writeBatch(db);
          vCount = 0;
        }
      }
      if (vCount > 0) voterBatches.push(currentVoterBatch);
      for (const b of voterBatches) { await b.commit(); }

      // 2. Delete all candidates
      const candsSnap = await getDocs(collection(db, 'candidates'));
      const candBatches = [];
      let currentCandBatch = writeBatch(db);
      let cCount = 0;
      for (const d of candsSnap.docs) {
        currentCandBatch.delete(d.ref);
        cCount++;
        if (cCount === 400) {
          candBatches.push(currentCandBatch);
          currentCandBatch = writeBatch(db);
          cCount = 0;
        }
      }
      if (cCount > 0) candBatches.push(currentCandBatch);
      for (const b of candBatches) { await b.commit(); }

      // 3. Delete all constituencies
      const constsSnap = await getDocs(collection(db, 'constituencies'));
      const constBatches = [];
      let currentConstBatch = writeBatch(db);
      let ctCount = 0;
      for (const d of constsSnap.docs) {
        currentConstBatch.delete(d.ref);
        ctCount++;
        if (ctCount === 400) {
          constBatches.push(currentConstBatch);
          currentConstBatch = writeBatch(db);
          ctCount = 0;
        }
      }
      if (ctCount > 0) constBatches.push(currentConstBatch);
      for (const b of constBatches) { await b.commit(); }

      // 4. Delete all events
      const eventsSnap = await getDocs(collection(db, 'events'));
      const eventBatch = writeBatch(db);
      eventsSnap.docs.forEach(d => eventBatch.delete(d.ref));
      await eventBatch.commit();

      setConstituencies([]);
      setVoters([]);
      setExpandedConstituencyId('');

      toast.success("💥 Electoral system completely destructed and reset!");
      setShowResetModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reset system: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSeedConstituencies = async () => {
    if (constituencies.length > 0) {
      const proceed = await confirm("Constituencies already exist in your directory. Seeding will only add missing ones. Do you want to continue?", {
        title: "Seed Directory Warning",
        confirmText: "Continue Seeding",
        cancelText: "Cancel",
        type: "warning"
      });
      if (!proceed) return;
    }

    setIsSeeding(true);
    try {
      const existingNames = new Set(constituencies.map(c => c.name.toUpperCase()));
      const toSeed = defaultConstituencies.filter(c => !existingNames.has(c.name.toUpperCase()));

      if (toSeed.length === 0) {
        toast.info("All default constituencies are already registered.");
        setIsSeeding(false);
        return;
      }

      // Chunk array to avoid Firestore batch limit of 500
      const chunkSize = 400;
      let seededCount = 0;

      for (let i = 0; i < toSeed.length; i += chunkSize) {
        const chunk = toSeed.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach(item => {
          const docRef = doc(collection(db, 'constituencies'));
          batch.set(docRef, {
            name: item.name.toUpperCase(),
            type: item.type,
            province: item.province,
            district: item.district,
            constituencyName: item.constituencyName,
            voterCount: 0
          });
        });

        await batch.commit();
        seededCount += chunk.length;
      }

      toast.success(`Successfully seeded ${seededCount} Pakistan constituencies!`);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to seed constituencies: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const loadVotersForConstituency = async (constId, constType) => {
    setIsLoadingVoters(true);
    try {
      const fieldName = constType === 'national' ? 'naConstituencyId' : 'paConstituencyId';
      const q = query(collection(db, 'voters'), where(fieldName, '==', constId));
      const snap = await getDocs(q);
      setVoters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load voters list");
    } finally {
      setIsLoadingVoters(false);
    }
  };

  const handleToggleExpand = async (c) => {
    if (expandedConstituencyId === c.id) {
      setExpandedConstituencyId('');
      setVoters([]);
    } else {
      setExpandedConstituencyId(c.id);
      setVoters([]);
      await loadVotersForConstituency(c.id, c.type);
    }
  };

  const handleDeleteVoter = async (voterId, voterName) => {
    const proceed = await confirm(`Are you sure you want to delete voter "${voterName}"?`, {
      title: "Delete Voter Registration",
      confirmText: "Delete Voter",
      cancelText: "Cancel",
      type: "danger"
    });
    if (!proceed) return;
    try {
      await deleteDoc(doc(db, 'voters', voterId));
      setVoters(prev => prev.filter(v => v.id !== voterId));
      toast.success(`Voter ${voterName} deleted successfully`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete voter");
    }
  };
  
  // Halka form
  const [halkaForm, setHalkaForm] = useState({
    name: '',
    type: 'national', // 'national' or 'provincial'
    province: 'Punjab'
  });

  // Single voter form
  const [voterForm, setVoterForm] = useState({
    cnic: '',
    name: '',
    email: '',
    naConstituencyId: '',
    paConstituencyId: ''
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const snapshot = await getDocs(collection(db, 'constituencies'));
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setConstituencies(list);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load constituencies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCnicFormatter = (val) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 13) clean = clean.substring(0, 13);
    let formatted = '';
    if (clean.length > 0) formatted += clean.substring(0, Math.min(clean.length, 5));
    if (clean.length > 5) formatted += '-' + clean.substring(5, Math.min(clean.length, 12));
    if (clean.length > 12) formatted += '-' + clean.substring(12, 13);
    return formatted;
  };

  const handleHalkaSubmit = async (e) => {
    e.preventDefault();
    if (!halkaForm.name.trim()) return;

    setIsSaving(true);
    try {
      let name = halkaForm.name.trim().toUpperCase();
      
      // Auto prefix PP/NA/etc if not entered
      if (halkaForm.type === 'national' && !name.startsWith('NA-')) {
        name = 'NA-' + name;
      } else if (halkaForm.type === 'provincial') {
        const prefix = halkaForm.province === 'Punjab' ? 'PP-' :
                       halkaForm.province === 'Sindh' ? 'PS-' :
                       halkaForm.province === 'KPK' ? 'PK-' : 'PB-';
        if (!name.startsWith(prefix)) {
          name = prefix + name;
        }
      }

      // Check duplicate name
      if (constituencies.some(c => c.name === name)) {
        toast.error(`Constituency ${name} already exists!`);
        setIsSaving(false);
        return;
      }

      const newHalka = {
        name,
        type: halkaForm.type,
        province: halkaForm.province,
        voterCount: 0
      };

      const docRef = await addDoc(collection(db, 'constituencies'), newHalka);
      setConstituencies(prev => [...prev, { id: docRef.id, ...newHalka }]);
      setHalkaForm({ name: '', type: 'national', province: 'Punjab' });
      toast.success(`Constituency ${name} created!`);
    } catch (err) {
      toast.error('Failed to create constituency');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHalka = async (id, name) => {
    const proceed = await confirm(`Are you sure you want to delete constituency "${name}"? All voters inside this Halka will need manual re-assignment.`, {
      title: "Delete Constituency",
      confirmText: "Delete Halka",
      cancelText: "Cancel",
      type: "danger"
    });
    if (!proceed) return;
    try {
      await deleteDoc(doc(db, 'constituencies', id));
      setConstituencies(prev => prev.filter(c => c.id !== id));
      toast.success(`${name} deleted successfully`);
    } catch (err) {
      toast.error('Failed to delete constituency');
    }
  };

  const handleVoterSubmit = async (e) => {
    e.preventDefault();
    const cleanCnic = voterForm.cnic.trim();
    if (cleanCnic.length < 15) {
      toast.error('Please enter a valid 13-digit CNIC (XXXXX-XXXXXXX-X)');
      return;
    }
    if (!voterForm.name.trim() || !voterForm.email.trim() || !voterForm.naConstituencyId || !voterForm.paConstituencyId) {
      toast.error('Please fill in all voter fields');
      return;
    }

    const selectedNa = constituencies.find(c => c.id === voterForm.naConstituencyId);
    const selectedPa = constituencies.find(c => c.id === voterForm.paConstituencyId);
    if (!selectedNa || !selectedPa || !areConstituenciesAssociated(selectedNa, selectedPa)) {
      toast.error('The selected National Assembly and Provincial Assembly seats must be associated (same district or province).');
      return;
    }

    try {
      setIsSaving(true);
      // Check duplicate CNIC
      const q = query(collection(db, 'voters'), where('cnic', '==', cleanCnic));
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast.error('Voter with this CNIC already exists!');
        setIsSaving(false);
        return;
      }

      const voterData = {
        cnic: cleanCnic,
        name: voterForm.name.trim(),
        email: voterForm.email.trim().toLowerCase(),
        password: cleanCnic, // Default password is CNIC
        naConstituencyId: voterForm.naConstituencyId,
        paConstituencyId: voterForm.paConstituencyId,
        hasVotedMNA: false,
        hasVotedMPA: false,
        role: 'voter',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'voters'), voterData);
      
      // Send credentials email notification
      const naName = constituencies.find(c => c.id === voterData.naConstituencyId)?.name || 'N/A';
      const paName = constituencies.find(c => c.id === voterData.paConstituencyId)?.name || 'N/A';
      triggerEmailNotification(
        'ECP Voter Portal Registration - Credentials',
        voterData.email,
        `ECP Portal: Registered as a voter in ${naName} and ${paName}.`,
        'default',
        {
          recipient_name: voterData.name,
          title: 'ECP Voter Database',
          message_body: `You have been officially registered as a voter in the Election Commission of Pakistan database. Use your CNIC as password to log in and cast your ballot.`,
          detail_label_1: 'CNIC Username/Password',
          detail_value_1: voterData.cnic,
          detail_label_2: 'National Assembly',
          detail_value_2: naName,
          detail_label_3: 'Provincial Assembly',
          detail_value_3: paName
        }
      );
      
      // Update voterCount on constituencies
      toast.success(`Voter ${voterData.name} registered! Default password is CNIC.`);
      setVoterForm({ cnic: '', name: '', email: '', naConstituencyId: '', paConstituencyId: '' });
      loadData();
    } catch (err) {
      toast.error('Failed to save voter');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCsv(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      if (lines.length <= 1) {
        toast.error('CSV file is empty');
        setUploadingCsv(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const cnicIdx = headers.indexOf('cnic');
      const nameIdx = headers.indexOf('name');
      const emailIdx = headers.indexOf('email');
      const naIdx = headers.indexOf('naconstituency'); // name of NA halka
      const paIdx = headers.indexOf('paconstituency'); // name of PA halka

      if (cnicIdx === -1 || nameIdx === -1 || emailIdx === -1 || naIdx === -1 || paIdx === -1) {
        toast.error("CSV columns must match: 'cnic', 'name', 'email', 'naConstituency', 'paConstituency'");
        setUploadingCsv(false);
        return;
      }

      const batch = writeBatch(db);
      let count = 0;
      let skippedDuplicates = 0;
      let skippedNotRegistered = 0;
      let skippedMismatched = 0;
      let skippedInvalid = 0;

      // Get latest list of voters to avoid batch duplicates
      const votersSnapshot = await getDocs(collection(db, 'voters'));
      const existingCnics = votersSnapshot.docs.map(doc => doc.data().cnic);

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(',').map(c => c.trim());
        if (cols.length < 5) continue;

        const formattedCnic = handleCnicFormatter(cols[cnicIdx]);
        const name = cols[nameIdx];
        const email = cols[emailIdx].toLowerCase();
        const naName = cols[naIdx].toUpperCase();
        const paName = cols[paIdx].toUpperCase();

        if (formattedCnic.length < 15 || !name || !email) {
          skippedInvalid++;
          continue;
        }
        if (existingCnics.includes(formattedCnic)) {
          skippedDuplicates++;
          continue; // skip duplicates
        }

        // Find constituency IDs from names
        const naConstituency = constituencies.find(c => c.name === naName && c.type === 'national');
        const paConstituency = constituencies.find(c => c.name === paName && c.type === 'provincial');

        if (!naConstituency || !paConstituency) {
          console.warn(`Row ${i + 1} skipped: Halkas ${naName}/${paName} not registered yet.`);
          skippedNotRegistered++;
          continue;
        }

        if (!areConstituenciesAssociated(naConstituency, paConstituency)) {
          console.warn(`Row ${i + 1} skipped: Halkas ${naName} and ${paName} are not associated (different district/province).`);
          skippedMismatched++;
          continue;
        }

        const voterRef = doc(collection(db, 'voters'));
        batch.set(voterRef, {
          cnic: formattedCnic,
          name,
          email,
          password: formattedCnic, // default password is CNIC
          naConstituencyId: naConstituency.id,
          paConstituencyId: paConstituency.id,
          hasVotedMNA: false,
          hasVotedMPA: false,
          role: 'voter',
          createdAt: new Date().toISOString()
        });

        triggerEmailNotification(
          'ECP Voter Portal Registration - Credentials',
          email,
          `ECP Portal: Registered as a voter in ${naName} and ${paName}.`,
          'default',
          {
            recipient_name: name,
            title: 'ECP Voter Database',
            message_body: `You have been officially registered as a voter via bulk import in the ECP database. Use your CNIC as password to log in and cast your ballot.`,
            detail_label_1: 'CNIC Username/Password',
            detail_value_1: formattedCnic,
            detail_label_2: 'National Assembly',
            detail_value_2: naName,
            detail_label_3: 'Provincial Assembly',
            detail_value_3: paName
          }
        );

        count++;
        existingCnics.push(formattedCnic);
      }

      if (count > 0) {
        await batch.commit();
        toast.success(`Turnout populated: successfully imported ${count} voters!`);
        
        if (skippedDuplicates > 0 || skippedNotRegistered > 0 || skippedMismatched > 0 || skippedInvalid > 0) {
          toast.warning(
            `Some rows were skipped: ` +
            `${skippedDuplicates > 0 ? `[${skippedDuplicates} duplicates] ` : ''}` +
            `${skippedNotRegistered > 0 ? `[${skippedNotRegistered} unregistered] ` : ''}` +
            `${skippedMismatched > 0 ? `[${skippedMismatched} mismatched NA/PA] ` : ''}` +
            `${skippedInvalid > 0 ? `[${skippedInvalid} invalid] ` : ''}`
          );
        }
        loadData();
      } else {
        if (skippedDuplicates > 0 || skippedNotRegistered > 0 || skippedMismatched > 0 || skippedInvalid > 0) {
          toast.warning(
            `No new voters imported. Skipped: ` +
            `${skippedDuplicates > 0 ? `[${skippedDuplicates} duplicates] ` : ''}` +
            `${skippedNotRegistered > 0 ? `[${skippedNotRegistered} unregistered] ` : ''}` +
            `${skippedMismatched > 0 ? `[${skippedMismatched} mismatched NA/PA] ` : ''}` +
            `${skippedInvalid > 0 ? `[${skippedInvalid} invalid] ` : ''}`
          );
        } else {
          toast.warning('No new unique voters were found to import.');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('CSV Parsing error: ' + err.message);
    } finally {
      setUploadingCsv(false);
    }
  };

  const handleHalkaVoterManualSubmit = async (e) => {
    e.preventDefault();
    const cleanCnic = halkaVoterForm.cnic.trim();
    if (cleanCnic.length < 15) {
      toast.error('Please enter a valid 13-digit CNIC (XXXXX-XXXXXXX-X)');
      return;
    }
    const naId = addVoterHalka.type === 'national' ? addVoterHalka.id : halkaVoterForm.naConstituencyId;
    const paId = addVoterHalka.type === 'provincial' ? addVoterHalka.id : halkaVoterForm.paConstituencyId;

    const selectedNa = constituencies.find(c => c.id === naId);
    const selectedPa = constituencies.find(c => c.id === paId);
    if (!selectedNa || !selectedPa || !areConstituenciesAssociated(selectedNa, selectedPa)) {
      toast.error('The selected National Assembly and Provincial Assembly seats must be associated (same district or province).');
      return;
    }

    setIsSaving(true);
    try {
      const q = query(collection(db, 'voters'), where('cnic', '==', cleanCnic));
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast.error('Voter with this CNIC already exists!');
        setIsSaving(false);
        return;
      }

      const voterData = {
        cnic: cleanCnic,
        name: halkaVoterForm.name.trim(),
        email: halkaVoterForm.email.trim().toLowerCase(),
        password: cleanCnic,
        naConstituencyId: naId,
        paConstituencyId: paId,
        hasVotedMNA: false,
        hasVotedMPA: false,
        role: 'voter',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'voters'), voterData);

      // Send credentials email notification
      const naName = constituencies.find(c => c.id === voterData.naConstituencyId)?.name || 'N/A';
      const paName = constituencies.find(c => c.id === voterData.paConstituencyId)?.name || 'N/A';
      triggerEmailNotification(
        'ECP Voter Portal Registration - Credentials',
        voterData.email,
        `ECP Portal: Registered as a voter in ${naName} and ${paName}.`,
        'default',
        {
          recipient_name: voterData.name,
          title: 'ECP Voter Database',
          message_body: `You have been officially registered as a voter in the Election Commission of Pakistan database. Use your CNIC as password to log in and cast your ballot.`,
          detail_label_1: 'CNIC Username/Password',
          detail_value_1: voterData.cnic,
          detail_label_2: 'National Assembly',
          detail_value_2: naName,
          detail_label_3: 'Provincial Assembly',
          detail_value_3: paName
        }
      );

      toast.success(`Voter ${voterData.name} registered successfully!`);
      setAddVoterHalka(null);
      
      if (expandedConstituencyId === addVoterHalka.id) {
        await loadVotersForConstituency(addVoterHalka.id, addVoterHalka.type);
      }
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to register voter');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHalkaCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCsv(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      if (lines.length <= 1) {
        toast.error('CSV file is empty');
        setUploadingCsv(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const cnicIdx = headers.indexOf('cnic');
      const nameIdx = headers.indexOf('name');
      const emailIdx = headers.indexOf('email');
      const naIdx = headers.indexOf('naconstituency');
      const paIdx = headers.indexOf('paconstituency');

      if (cnicIdx === -1 || nameIdx === -1 || emailIdx === -1) {
        toast.error("CSV columns must contain: 'cnic', 'name', 'email'");
        setUploadingCsv(false);
        return;
      }

      if (addVoterHalka.type === 'national' && paIdx === -1) {
        toast.error("CSV must contain 'paConstituency' (the Provincial Assembly seat) column");
        setUploadingCsv(false);
        return;
      }

      if (addVoterHalka.type === 'provincial' && naIdx === -1) {
        toast.error("CSV must contain 'naConstituency' (the National Assembly seat) column");
        setUploadingCsv(false);
        return;
      }

      const batch = writeBatch(db);
      let count = 0;
      let skippedDuplicates = 0;
      let skippedNotRegistered = 0;
      let skippedMismatched = 0;
      let skippedInvalid = 0;

      const votersSnapshot = await getDocs(collection(db, 'voters'));
      const existingCnics = votersSnapshot.docs.map(doc => doc.data().cnic);

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(',').map(c => c.trim());
        if (cols.length < 3) continue;

        const formattedCnic = handleCnicFormatter(cols[cnicIdx]);
        const name = cols[nameIdx];
        const email = cols[emailIdx].toLowerCase();

        if (formattedCnic.length < 15 || !name || !email) {
          skippedInvalid++;
          continue;
        }
        if (existingCnics.includes(formattedCnic)) {
          skippedDuplicates++;
          continue;
        }

        let naId = '';
        let paId = '';

        if (addVoterHalka.type === 'national') {
          naId = addVoterHalka.id;
          const paName = cols[paIdx].toUpperCase();
          const paConstituency = constituencies.find(con => con.name === paName && con.type === 'provincial');
          if (!paConstituency) {
            console.warn(`Row ${i + 1} skipped: Provincial Halka ${paName} not registered.`);
            skippedNotRegistered++;
            continue;
          }
          if (!areConstituenciesAssociated(addVoterHalka, paConstituency)) {
            console.warn(`Row ${i + 1} skipped: Provincial Halka ${paName} is not associated with ${addVoterHalka.name}.`);
            skippedMismatched++;
            continue;
          }
          paId = paConstituency.id;
        } else {
          paId = addVoterHalka.id;
          const naName = cols[naIdx].toUpperCase();
          const naConstituency = constituencies.find(con => con.name === naName && con.type === 'national');
          if (!naConstituency) {
            console.warn(`Row ${i + 1} skipped: National Halka ${naName} not registered.`);
            skippedNotRegistered++;
            continue;
          }
          if (!areConstituenciesAssociated(naConstituency, addVoterHalka)) {
            console.warn(`Row ${i + 1} skipped: National Halka ${naName} is not associated with ${addVoterHalka.name}.`);
            skippedMismatched++;
            continue;
          }
          naId = naConstituency.id;
        }

        const voterRef = doc(collection(db, 'voters'));
        batch.set(voterRef, {
          cnic: formattedCnic,
          name,
          email,
          password: formattedCnic,
          naConstituencyId: naId,
          paConstituencyId: paId,
          hasVotedMNA: false,
          hasVotedMPA: false,
          role: 'voter',
          createdAt: new Date().toISOString()
        });

        const cNaName = constituencies.find(con => con.id === naId)?.name || 'N/A';
        const cPaName = constituencies.find(con => con.id === paId)?.name || 'N/A';
        triggerEmailNotification(
          'ECP Voter Portal Registration - Credentials',
          email,
          `ECP Portal: Registered as a voter in ${cNaName} and ${cPaName}.`,
          'default',
          {
            recipient_name: name,
            title: 'ECP Voter Database',
            message_body: `You have been officially registered as a voter via bulk import in the ECP database. Use your CNIC as password to log in and cast your ballot.`,
            detail_label_1: 'CNIC Username/Password',
            detail_value_1: formattedCnic,
            detail_label_2: 'National Assembly',
            detail_value_2: cNaName,
            detail_label_3: 'Provincial Assembly',
            detail_value_3: cPaName
          }
        );

        count++;
        existingCnics.push(formattedCnic);
      }

      if (count > 0) {
        await batch.commit();
        toast.success(`Successfully imported ${count} voters!`);
        
        if (skippedDuplicates > 0 || skippedNotRegistered > 0 || skippedMismatched > 0 || skippedInvalid > 0) {
          toast.warning(
            `Some rows were skipped: ` +
            `${skippedDuplicates > 0 ? `[${skippedDuplicates} duplicates] ` : ''}` +
            `${skippedNotRegistered > 0 ? `[${skippedNotRegistered} unregistered] ` : ''}` +
            `${skippedMismatched > 0 ? `[${skippedMismatched} mismatched NA/PA] ` : ''}` +
            `${skippedInvalid > 0 ? `[${skippedInvalid} invalid] ` : ''}`
          );
        }

        setAddVoterHalka(null);
        if (expandedConstituencyId === addVoterHalka.id) {
          await loadVotersForConstituency(addVoterHalka.id, addVoterHalka.type);
        }
        loadData();
      } else {
        if (skippedDuplicates > 0 || skippedNotRegistered > 0 || skippedMismatched > 0 || skippedInvalid > 0) {
          toast.warning(
            `No new voters imported. Skipped: ` +
            `${skippedDuplicates > 0 ? `[${skippedDuplicates} duplicates] ` : ''}` +
            `${skippedNotRegistered > 0 ? `[${skippedNotRegistered} unregistered] ` : ''}` +
            `${skippedMismatched > 0 ? `[${skippedMismatched} mismatched NA/PA] ` : ''}` +
            `${skippedInvalid > 0 ? `[${skippedInvalid} invalid] ` : ''}`
          );
        } else {
          toast.warning('No new unique voters were found to import.');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('CSV Parsing error: ' + err.message);
    } finally {
      setUploadingCsv(false);
    }
  };

  const getConstituencyNumber = (name) => {
    const match = name.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const normalizeProvince = (prov) => {
    if (!prov) return '';
    const p = prov.toLowerCase().trim();
    if (p === 'kpk' || p === 'khyber pakhtunkhwa' || p === 'khyber paktunkhwa') return 'kpk';
    if (p === 'federal' || p === 'islamabad') return 'federal';
    return p;
  };

  const areConstituenciesAssociated = (c1, c2) => {
    if (!c1 || !c2) return false;

    const na = c1.type === 'national' ? c1 : (c2.type === 'national' ? c2 : null);
    const pa = c1.type === 'provincial' ? c1 : (c2.type === 'provincial' ? c2 : null);

    if (!na || !pa) return false;

    // 1. Check District level mapping
    if (na.district && pa.district && na.district.trim() && pa.district.trim()) {
      if (na.district.toLowerCase().trim() !== pa.district.toLowerCase().trim()) {
        return false;
      }

      // Filter by sequential mapping within the same district
      const districtNas = constituencies
        .filter(c => c.type === 'national' && c.district && c.district.toLowerCase().trim() === na.district.toLowerCase().trim())
        .sort((a, b) => getConstituencyNumber(a.name) - getConstituencyNumber(b.name));

      const districtPas = constituencies
        .filter(c => c.type === 'provincial' && c.district && c.district.toLowerCase().trim() === pa.district.toLowerCase().trim())
        .sort((a, b) => getConstituencyNumber(a.name) - getConstituencyNumber(b.name));

      if (districtNas.length > 0 && districtPas.length > 0) {
        const naIndex = districtNas.findIndex(c => c.id === na.id);
        const paIndex = districtPas.findIndex(c => c.id === pa.id);

        if (naIndex !== -1 && paIndex !== -1) {
          const ratio = districtPas.length / districtNas.length;
          const mappedNaIndex = Math.min(Math.floor(paIndex / ratio), districtNas.length - 1);
          return mappedNaIndex === naIndex;
        }
      }
    }

    // 2. Fallback to Province level mapping
    return normalizeProvince(na.province) === normalizeProvince(pa.province);
  };

  const nationalHalkas = constituencies.filter(c => c.type === 'national');
  const provincialHalkas = constituencies.filter(c => c.type === 'provincial');

  const selectedNaForGlobal = constituencies.find(c => c.id === voterForm.naConstituencyId);
  const selectedPaForGlobal = constituencies.find(c => c.id === voterForm.paConstituencyId);

  const filteredNationalHalkasForGlobal = nationalHalkas.filter(c => {
    if (selectedPaForGlobal) {
      return areConstituenciesAssociated(c, selectedPaForGlobal);
    }
    return true;
  });

  const filteredProvincialHalkasForGlobal = provincialHalkas.filter(c => {
    if (selectedNaForGlobal) {
      return areConstituenciesAssociated(selectedNaForGlobal, c);
    }
    return true;
  });


  // Filtering calculations
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

  const filteredVoters = voters.filter(v => {
    if (voterSearchQuery.trim() === '') return true;
    const q = voterSearchQuery.toLowerCase();
    const matchName = v.name.toLowerCase().includes(q);
    const matchCnic = v.cnic.includes(q);
    return matchName || matchCnic;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Active destruct verification
  const isDestructActive = 
    understandRisk &&
    destructTimer === 0 &&
    inputCode === resetVerificationCode &&
    inputPhrase === "DELETE ALL HALKAS" &&
    parseInt(inputMath) === (mathX + mathY);

  return (
    <div className="min-h-screen bg-emerald-950 py-8 px-4 sm:px-6 lg:px-8 text-white relative">
      
      {/* ─── Security Reset Modal ─── */}
      {showResetModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-emerald-950 border border-red-500/30 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3 border-b border-red-500/10 pb-3">
              <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
              <div>
                <h3 className="text-lg font-black text-white">Electoral System Destruct Desk</h3>
                <p className="text-xxs text-red-400 font-bold uppercase tracking-wider">High Security Verification Panel</p>
              </div>
            </div>
            
            <div className="space-y-4 text-xs text-slate-200">
              {/* Hurdle 1: Verification Code */}
              <div className="space-y-1.5">
                <label className="block text-xxs font-black uppercase text-red-300 tracking-wider">
                  1. Security Verification Code (Case-Sensitive)
                </label>
                <div className="flex justify-between items-center bg-red-950/20 border border-red-500/20 rounded-lg p-2.5">
                  <span className="font-mono font-bold text-sm text-red-400 select-all tracking-widest">{resetVerificationCode}</span>
                  <span className="text-[10px] text-red-400/50">Type this code below</span>
                </div>
                <input
                  type="text"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value)}
                  className="block w-full px-3 py-2 bg-emerald-950 border border-emerald-500/20 rounded-lg text-white font-mono focus:outline-none focus:border-red-500 text-xs"
                  placeholder="Enter verification code"
                />
              </div>

              {/* Hurdle 2: Challenge Phrase */}
              <div className="space-y-1.5">
                <label className="block text-xxs font-black uppercase text-red-300 tracking-wider">
                  2. Destruct Confirmation Phrase
                </label>
                <p className="text-[10px] text-slate-400">Type exactly: <strong className="text-white font-bold">DELETE ALL HALKAS</strong></p>
                <input
                  type="text"
                  value={inputPhrase}
                  onChange={e => setInputPhrase(e.target.value)}
                  className="block w-full px-3 py-2 bg-emerald-950 border border-emerald-500/20 rounded-lg text-white focus:outline-none focus:border-red-500 text-xs"
                  placeholder="Type DELETE ALL HALKAS"
                />
              </div>

              {/* Hurdle 3: Math Challenge */}
              <div className="space-y-1.5">
                <label className="block text-xxs font-black uppercase text-red-300 tracking-wider">
                  3. Math Challenge (Spam Protection)
                </label>
                <p className="text-[10px] text-slate-400">What is the sum of <strong className="text-white font-bold">{mathX} + {mathY}</strong>?</p>
                <input
                  type="number"
                  value={inputMath}
                  onChange={e => setInputMath(e.target.value)}
                  className="block w-full px-3 py-2 bg-emerald-950 border border-emerald-500/20 rounded-lg text-white focus:outline-none focus:border-red-500 text-xs font-mono"
                  placeholder="Enter answer"
                />
              </div>

              {/* Hurdle 4: Risk Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer bg-red-950/10 border border-red-500/10 p-2.5 rounded-lg">
                <input
                  type="checkbox"
                  checked={understandRisk}
                  onChange={e => setUnderstandRisk(e.target.checked)}
                  className="mt-0.5 rounded border-red-500/30 text-red-600 focus:ring-red-500"
                />
                <span className="text-[10px] leading-relaxed text-red-300">
                  I understand that this action is **irreversible**. Wiping the database deletes all Constituencies, Voters, Candidate Nominations, and Active Elections permanently.
                </span>
              </label>
            </div>

            <div className="flex gap-2.5 border-t border-red-500/10 pt-4">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 px-4 py-2.5 bg-emerald-900/60 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isDestructActive || isResetting}
                onClick={handleExecuteSystemReset}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-950/30 disabled:text-red-500/40 text-white rounded-lg text-xs font-black transition-colors flex justify-center items-center gap-1.5"
              >
                {isResetting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    {destructTimer > 0 ? `Destruct (${destructTimer}s)` : 'DESTRUCT ALL'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-emerald-500/20 pb-5 gap-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/admin')}
              className="p-2 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Landmark className="h-6 w-6 mr-2 text-yellow-400" />
                Constituency & Voter Registry
              </h1>
              <p className="text-xs text-emerald-400">Create Halkas, manually add voters or batch upload CNICs</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTriggerReset}
              className="px-4 py-2.5 bg-red-950/40 hover:bg-red-900 border border-red-500/30 hover:border-transparent text-red-400 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <AlertTriangle className="h-4 w-4" /> Reset Directory
            </button>
            <button
              onClick={handleSeedConstituencies}
              disabled={isSeeding}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              {isSeeding ? <LoadingSpinner size="sm" /> : <>🚀 Seed Pakistan Halkas (840)</>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create Halka Form */}
          <div className="bg-emerald-900/40 border border-emerald-500/20 rounded-2xl p-6 h-fit space-y-5">
            <h2 className="text-lg font-bold border-b border-emerald-500/10 pb-2 text-yellow-400">
              Create New Halka
            </h2>
            <form onSubmit={handleHalkaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-300 uppercase mb-1">Assembly Category</label>
                <select
                  value={halkaForm.type}
                  onChange={e => setHalkaForm({ ...halkaForm, type: e.target.value })}
                  className="block w-full px-3 py-2 bg-emerald-950/70 border border-emerald-500/30 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500"
                >
                  <option value="national">National Assembly (MNA Seat)</option>
                  <option value="provincial">Provincial Assembly (MPA Seat)</option>
                </select>
              </div>

              {halkaForm.type === 'provincial' && (
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 uppercase mb-1">Province</label>
                  <select
                    value={halkaForm.province}
                    onChange={e => setHalkaForm({ ...halkaForm, province: e.target.value })}
                    className="block w-full px-3 py-2 bg-emerald-950/70 border border-emerald-500/30 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  >
                    <option value="Punjab">Punjab (PP)</option>
                    <option value="Sindh">Sindh (PS)</option>
                    <option value="KPK">Khyber Pakhtunkhwa (PK)</option>
                    <option value="Balochistan">Balochistan (PB)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-emerald-300 uppercase mb-1">
                  Halka Number / Name
                </label>
                <input
                  type="text"
                  required
                  value={halkaForm.name}
                  onChange={e => setHalkaForm({ ...halkaForm, name: e.target.value })}
                  placeholder={halkaForm.type === 'national' ? 'e.g. 120 (adds NA-120)' : 'e.g. 150 (adds PP-150)'}
                  className="block w-full px-3 py-2.5 bg-emerald-950/70 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-800 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-emerald-950 font-bold rounded-lg text-xs transition-colors flex justify-center items-center"
              >
                {isSaving ? <LoadingSpinner size="sm" /> : <><Plus className="h-4 w-4 mr-1" /> Create Halka</>}
              </button>
            </form>
          </div>

          {/* Redesigned Halka Browser Panel */}
          <div className="bg-emerald-900/40 border border-emerald-500/20 rounded-2xl p-6 lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-500/10 pb-3">
              <h2 className="text-lg font-bold text-yellow-400">
                Constituencies Directory ({filteredConstituencies.length} of {constituencies.length})
              </h2>
              {/* Type Switcher */}
              <div className="flex gap-1.5 p-0.5 bg-emerald-950/80 border border-emerald-500/10 rounded-lg text-xs">
                {['All', 'national', 'provincial'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setSelectedType(t); setExpandedConstituencyId(''); }}
                    className={`px-3 py-1 rounded-md font-bold uppercase text-[10px] tracking-wider transition-colors ${selectedType === t ? 'bg-yellow-500 text-emerald-950' : 'text-emerald-350 hover:text-white'}`}
                  >
                    {t === 'national' ? 'NA' : t === 'provincial' ? 'PA' : 'All'}
                  </button>
                ))}
              </div>
            </div>

            {/* Province Tabs */}
            <div className="overflow-x-auto pb-1.5 flex gap-1 text-[11px] scrollbar-thin">
              {['All', 'Punjab', 'Sindh', 'KPK', 'Balochistan', 'Federal'].map(prov => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => { setSelectedProvince(prov); setExpandedConstituencyId(''); }}
                  className={`px-3 py-1.5 rounded-lg border font-bold whitespace-nowrap transition-all duration-200 ${selectedProvince === prov ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-emerald-950/20 border-emerald-500/10 text-emerald-500 hover:text-emerald-300'}`}
                >
                  {prov}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-emerald-500/50" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setExpandedConstituencyId(''); }}
                className="block w-full pl-9 pr-3 py-2 bg-emerald-950/50 border border-emerald-500/25 rounded-xl placeholder-emerald-700 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-xs"
                placeholder="Search constituency name, number or district (e.g. NA-120, Rawalpindi)..."
              />
            </div>

            {filteredConstituencies.length === 0 ? (
              <div className="py-12 text-center text-emerald-500">
                <Landmark className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">No constituencies match your filters.</p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto space-y-2.5 pr-1">
                {filteredConstituencies.map((c) => {
                  const isExpanded = expandedConstituencyId === c.id;
                  return (
                    <div 
                      key={c.id} 
                      className={`bg-emerald-950/50 border rounded-xl overflow-hidden transition-all ${isExpanded ? 'border-yellow-500/50 bg-emerald-950/90' : 'border-emerald-500/10 hover:border-emerald-500/30'}`}
                    >
                      {/* Top Header Card */}
                      <div className="flex justify-between items-center p-3.5 cursor-pointer" onClick={() => handleToggleExpand(c)}>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-2">
                            <span>{c.name}</span>
                            {c.constituencyName && <span className="text-xs font-normal text-slate-300">— {c.constituencyName}</span>}
                          </div>
                          <div className="text-xxs text-emerald-400 uppercase mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold">{c.type === 'national' ? 'National Assembly' : `${c.province} Assembly`}</span>
                            {c.district && (
                              <>
                                <span>•</span>
                                <span>District: {c.district}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleExpand(c)}
                            className={`px-3 py-1.5 rounded-lg text-xxs font-black tracking-wider uppercase transition-colors ${isExpanded ? 'bg-yellow-500 text-emerald-950' : 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800'}`}
                          >
                            {isExpanded ? 'Hide Voters' : 'Voters'}
                          </button>
                          <button 
                            onClick={() => handleDeleteHalka(c.id, c.name)}
                            className="p-1.5 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900 hover:text-white transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expansion: Voters list inside Constituency */}
                      {isExpanded && (
                        <div className="border-t border-emerald-500/10 bg-emerald-950/90 p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-500/5 pb-2.5">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h4 className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                                Registered Voters ({voters.length})
                              </h4>
                              <button
                                onClick={() => setAddVoterHalka(c)}
                                className="px-2 py-1 bg-yellow-450 hover:bg-yellow-400 text-emerald-950 text-[10px] font-black uppercase tracking-wider rounded transition-all flex items-center gap-1 shadow"
                              >
                                <Plus className="h-3 w-3" /> Add Voter
                              </button>
                            </div>
                            {/* Voters Search */}
                            <div className="relative w-full sm:max-w-xs">
                              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                <Search className="h-3 w-3 text-emerald-500/40" />
                              </span>
                              <input
                                type="text"
                                value={voterSearchQuery}
                                onChange={e => setVoterSearchQuery(e.target.value)}
                                className="block w-full pl-8 pr-2.5 py-1.5 bg-emerald-900/20 border border-emerald-500/15 rounded-lg placeholder-emerald-700 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 text-[10px]"
                                placeholder="Search by name or CNIC..."
                              />
                            </div>
                          </div>

                          {isLoadingVoters ? (
                            <div className="py-8 flex justify-center">
                              <LoadingSpinner size="sm" />
                            </div>
                          ) : voters.length === 0 ? (
                            <p className="text-xxs text-emerald-500/70 italic text-center py-4">No voters registered in this constituency.</p>
                          ) : filteredVoters.length === 0 ? (
                            <p className="text-xxs text-emerald-500/70 italic text-center py-4">No voters match search query.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                              {filteredVoters.map((v) => (
                                <div key={v.id} className="flex justify-between items-center bg-emerald-900/10 border border-emerald-500/5 rounded-lg p-2.5 text-xs">
                                  <div>
                                    <p className="font-bold text-slate-100">{v.name}</p>
                                    <p className="text-[10px] text-emerald-400 font-mono mt-0.5">CNIC: {v.cnic} · {v.email}</p>
                                    <div className="flex gap-2.5 mt-1 text-[9px] font-bold">
                                      <span className={v.hasVotedMNA ? 'text-emerald-400' : 'text-yellow-400'}>
                                        MNA: {v.hasVotedMNA ? '✓ Voted' : '⏳ Pending'}
                                      </span>
                                      <span className={v.hasVotedMPA ? 'text-emerald-400' : 'text-yellow-400'}>
                                        MPA: {v.hasVotedMPA ? '✓ Voted' : '⏳ Pending'}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteVoter(v.id, v.name)}
                                    className="p-1 rounded-md bg-red-950/30 text-red-400 hover:bg-red-900 hover:text-white transition-colors"
                                    title="Delete Voter"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Voter Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 border-t border-emerald-500/20 pt-8">
          
          {/* Manually Register Voter */}
          <div className="bg-emerald-900/40 border border-emerald-500/20 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold border-b border-emerald-500/10 pb-2 text-yellow-400 flex justify-between items-center">
              <span>Manual Voter Signup</span>
              {(voterForm.naConstituencyId || voterForm.paConstituencyId) && (
                <button
                  type="button"
                  onClick={() => setVoterForm(prev => ({ ...prev, naConstituencyId: '', paConstituencyId: '' }))}
                  className="text-[10px] text-yellow-500 hover:text-yellow-400 font-semibold hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </h2>
            <form onSubmit={handleVoterSubmit} className="space-y-4">
              <div>
                <label className="block text-xxs font-bold text-emerald-300 uppercase mb-1">CNIC (Verification ID)</label>
                <input
                  type="text"
                  required
                  value={voterForm.cnic}
                  onChange={e => setVoterForm({ ...voterForm, cnic: handleCnicFormatter(e.target.value) })}
                  placeholder="35201-1234567-1"
                  className="block w-full px-3 py-2 bg-emerald-950/70 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-800 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-xxs font-bold text-emerald-300 uppercase mb-1">Voter Name</label>
                <input
                  type="text"
                  required
                  value={voterForm.name}
                  onChange={e => setVoterForm({ ...voterForm, name: e.target.value })}
                  placeholder="Full Name"
                  className="block w-full px-3 py-2 bg-emerald-950/70 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-800 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-xxs font-bold text-emerald-300 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={voterForm.email}
                  onChange={e => setVoterForm({ ...voterForm, email: e.target.value })}
                  placeholder="email@example.com"
                  className="block w-full px-3 py-2 bg-emerald-950/70 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-800 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-xxs font-bold text-emerald-300 uppercase mb-1">National Constituency (NA)</label>
                <select
                  value={voterForm.naConstituencyId}
                  onChange={e => setVoterForm({ ...voterForm, naConstituencyId: e.target.value })}
                  required
                  className="block w-full px-3 py-2 bg-emerald-950/70 border border-emerald-500/30 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500"
                >
                  <option value="">Select NA Halka</option>
                  {filteredNationalHalkasForGlobal.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xxs font-bold text-emerald-300 uppercase mb-1">Provincial Constituency</label>
                <select
                  value={voterForm.paConstituencyId}
                  onChange={e => setVoterForm({ ...voterForm, paConstituencyId: e.target.value })}
                  required
                  className="block w-full px-3 py-2 bg-emerald-950/70 border border-emerald-500/30 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500"
                >
                  <option value="">Select Provincial Halka</option>
                  {filteredProvincialHalkasForGlobal.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>


              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-emerald-950 font-bold rounded-lg text-xs transition-colors flex justify-center items-center"
              >
                {isSaving ? <LoadingSpinner size="sm" /> : <><Users className="h-4 w-4 mr-1" /> Add Voter</>}
              </button>
            </form>
          </div>

          {/* CSV Upload Section */}
          <div className="bg-emerald-900/40 border border-emerald-500/20 rounded-2xl p-6 lg:col-span-2 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-lg font-bold border-b border-emerald-500/10 pb-2 text-yellow-400 flex items-center">
                <Upload className="h-5 w-5 mr-2" /> Batch Voter CNIC Upload (CSV)
              </h2>
              <p className="text-xs text-emerald-300 leading-relaxed">
                Add multiple voters at once by uploading a standard comma-separated CSV list. 
                Make sure the CSV contains exactly the following headers in lowercase or matches:
              </p>
              
              <div className="bg-emerald-950/80 p-3 rounded-lg border border-emerald-500/15 text-xxs font-mono space-y-1 text-emerald-400">
                <div>cnic,name,email,naConstituency,paConstituency</div>
                <div className="text-emerald-600">35201-1234567-1,Zahid Khan,zahid@gmail.com,NA-120,PP-150</div>
                <div className="text-emerald-600">33102-7654321-2,Ayesha Bibi,ayesha@yahoo.com,NA-120,PP-150</div>
              </div>

              <div className="bg-yellow-950/20 border border-yellow-500/25 p-3 rounded-lg flex items-start space-x-2 text-xxs text-yellow-350">
                <HelpCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-400" />
                <span>
                  <strong>Important:</strong> Constituencies (e.g. NA-120 and PP-150) must be created in the top panel before uploading the CSV, or voters belonging to them will be skipped.
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-emerald-500/10 flex items-center justify-between">
              <label className="flex-1 max-w-md bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-xl cursor-pointer text-center font-bold text-sm transition-all shadow-md flex items-center justify-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>{uploadingCsv ? 'Processing Batch...' : 'Select CSV and Import'}</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                  disabled={uploadingCsv}
                />
              </label>
              {uploadingCsv && <LoadingSpinner size="md" className="ml-4" />}
            </div>
          </div>

        </div>

      {/* ─── Add Halka-Specific Voter Modal ─── */}
      {addVoterHalka && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-emerald-950 border border-emerald-500/30 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative text-white font-sans">
            
            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-emerald-500/10 pb-3">
              <Plus className="h-6 w-6 text-yellow-400" />
              <div>
                <h3 className="text-sm font-black text-white">Add Voter for {addVoterHalka.name}</h3>
                <p className="text-[9px] text-emerald-450 uppercase tracking-wider font-extrabold">
                  Onboard voter into {addVoterHalka.type === 'national' ? 'National' : 'Provincial'} Assembly
                </p>
              </div>
              <button 
                onClick={() => setAddVoterHalka(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-emerald-950 border border-emerald-500/15 text-emerald-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="grid grid-cols-2 gap-1 bg-emerald-950/80 p-1 rounded-lg border border-emerald-500/10">
              <button
                type="button"
                onClick={() => setHalkaModalTab('manual')}
                className={`py-1.5 rounded text-center font-bold text-[10px] uppercase tracking-wider transition-all ${
                  halkaModalTab === 'manual' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-400 hover:text-white'
                }`}
              >
                Manual Input
              </button>
              <button
                type="button"
                onClick={() => setHalkaModalTab('csv')}
                className={`py-1.5 rounded text-center font-bold text-[10px] uppercase tracking-wider transition-all ${
                  halkaModalTab === 'csv' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-400 hover:text-white'
                }`}
              >
                Batch CSV Upload
              </button>
            </div>

            {halkaModalTab === 'manual' ? (
              <form onSubmit={handleHalkaVoterManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                    CNIC Number
                  </label>
                  <input
                    type="text"
                    required
                    value={halkaVoterForm.cnic}
                    onChange={e => setHalkaVoterForm({ ...halkaVoterForm, cnic: handleCnicFormatter(e.target.value) })}
                    placeholder="35201-1234567-1"
                    className="block w-full px-3 py-2 bg-emerald-950/70 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-800 text-xs focus:outline-none focus:border-yellow-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={halkaVoterForm.name}
                    onChange={e => setHalkaVoterForm({ ...halkaVoterForm, name: e.target.value })}
                    placeholder="Voter Name"
                    className="block w-full px-3 py-2 bg-emerald-950/70 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-800 text-xs focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={halkaVoterForm.email}
                    onChange={e => setHalkaVoterForm({ ...halkaVoterForm, email: e.target.value })}
                    placeholder="email@example.com"
                    className="block w-full px-3 py-2 bg-emerald-950/70 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-800 text-xs focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                    {addVoterHalka.type === 'national' ? 'National Assembly Seat (NA)' : 'Provincial Assembly Seat (PA)'}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${addVoterHalka.name} (${addVoterHalka.province})`}
                    className="block w-full px-3 py-2 bg-emerald-900/10 border border-emerald-500/15 rounded-lg text-emerald-400 text-xs font-bold focus:outline-none cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                    {addVoterHalka.type === 'national' ? 'Provincial Assembly (PA)' : 'National Assembly (NA)'}
                  </label>
                  <select
                    required
                    value={addVoterHalka.type === 'national' ? halkaVoterForm.paConstituencyId : halkaVoterForm.naConstituencyId}
                    onChange={e => {
                      if (addVoterHalka.type === 'national') {
                        setHalkaVoterForm({ ...halkaVoterForm, paConstituencyId: e.target.value });
                      } else {
                        setHalkaVoterForm({ ...halkaVoterForm, naConstituencyId: e.target.value });
                      }
                    }}
                    className="block w-full px-3 py-2 bg-emerald-950/70 border border-emerald-500/30 rounded-lg text-white text-xs focus:outline-none focus:border-yellow-500"
                  >
                    <option value="">-- Select Halka --</option>
                    {constituencies
                      .filter(con => {
                        if (addVoterHalka.type === 'national') {
                          return con.type === 'provincial' && areConstituenciesAssociated(addVoterHalka, con);
                        } else {
                          return con.type === 'national' && areConstituenciesAssociated(con, addVoterHalka);
                        }
                      })
                      .map(con => (
                        <option key={con.id} value={con.id}>
                          {con.name} {con.constituencyName ? `— ${con.constituencyName}` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-emerald-500/10">
                  <button
                    type="button"
                    onClick={() => setAddVoterHalka(null)}
                    className="flex-1 px-4 py-2 bg-emerald-900/60 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-yellow-400 hover:bg-yellow-550 disabled:bg-yellow-950/20 disabled:text-yellow-600/40 text-emerald-950 rounded-lg text-xs font-black transition-all flex justify-center items-center gap-1.5"
                  >
                    {isSaving ? <LoadingSpinner size="sm" /> : <><Plus className="h-4 w-4" /> Add Voter</>}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-950/40 border border-emerald-500/15 p-4 rounded-xl space-y-2 text-[10px] leading-relaxed text-emerald-300">
                  <strong className="text-yellow-400 text-xs block mb-1">CSV Batch Upload Directions:</strong>
                  <p>1. CSV must contain column headers: <strong className="text-white">cnic</strong>, <strong className="text-white">name</strong>, and <strong className="text-white">email</strong>.</p>
                  <p>2. Since you are uploading for <strong className="text-yellow-400">{addVoterHalka.name}</strong>, it is pre-selected. You must provide the other seat column:</p>
                  {addVoterHalka.type === 'national' ? (
                    <p>&bull; Include column <strong className="text-white">paConstituency</strong> (Provincial Assembly name e.g., <strong className="text-white">PP-150</strong>) inside the CSV.</p>
                  ) : (
                    <p>&bull; Include column <strong className="text-white">naConstituency</strong> (National Assembly name e.g., <strong className="text-white">NA-120</strong>) inside the CSV.</p>
                  )}
                  <p>3. Format: <strong className="text-white">cnic, name, email, {addVoterHalka.type === 'national' ? 'paConstituency' : 'naConstituency'}</strong></p>
                </div>

                <div className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-500/30 hover:border-yellow-500/30 rounded-xl p-6 bg-emerald-900/10 cursor-pointer relative group transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleHalkaCsvUpload}
                    disabled={uploadingCsv}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="h-8 w-8 text-yellow-400 mb-2 group-hover:scale-105 transition-transform" />
                  <p className="text-xs text-white font-bold">Select CSV File</p>
                  <p className="text-[10px] text-emerald-450 mt-1">click to browse and upload voter dataset</p>
                </div>

                {uploadingCsv && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-xs text-emerald-400">Processing batch inserts into registry...</span>
                  </div>
                )}

                <div className="flex justify-end pt-3 border-t border-emerald-500/10">
                  <button
                    type="button"
                    onClick={() => setAddVoterHalka(null)}
                    className="px-5 py-2 bg-emerald-900/60 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default AdminConstituencies;
