import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Vote, CheckCircle, AlertTriangle, Landmark, Award, ShieldCheck, Users } from 'lucide-react';
import { doc, getDoc, runTransaction, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/* ─── Confirmation Modal ─── */
const ConfirmModal = ({ isOpen, candidateName, onConfirm, onCancel, ballotType, isSubmitting }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="animate-scale-in rounded-3xl p-6 w-full max-w-sm"
        style={{
          background: 'rgba(4,20,13,0.95)',
          border: '1px solid rgba(251,191,36,0.25)',
          boxShadow: '0 24px 64px -12px rgba(0,0,0,0.8), 0 0 40px -10px rgba(251,191,36,0.15)',
        }}
      >
        <div className="text-center mb-5">
          <div
            className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 animate-glow-gold"
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}
          >
            <AlertTriangle className="h-8 w-8 text-yellow-400" />
          </div>
          <h3 className="text-lg font-black text-white">Confirm Ballot Cast</h3>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'rgba(52,211,153,0.6)' }}>
            {ballotType} ballot for{' '}
            <strong className="text-white">{candidateName}</strong>.
            Once submitted, this is <strong className="text-yellow-400">irreversible</strong>.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'rgba(4,20,13,0.8)', border: '1px solid rgba(16,185,129,0.15)', color: 'rgba(52,211,153,0.7)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: '#020c07',
              boxShadow: '0 4px 15px -3px rgba(251,191,36,0.4)',
            }}
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : <><Vote className="h-4 w-4" /> Confirm & Vote</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Vote Success Screen ─── */
const VoteSuccess = ({ ballotType, constituency, voteId, candidateName, navigate }) => (
  <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ background: '#020c07' }}>
    <div className="w-full max-w-sm animate-scale-in">
      <div
        className="glass rounded-3xl overflow-hidden text-center"
        style={{ boxShadow: '0 24px 80px -15px rgba(0,0,0,0.8), 0 0 40px -10px rgba(16,185,129,0.2)' }}
      >
        {/* Green top stripe */}
        <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #059669, #fbbf24, #059669)' }} />
        <div className="p-8">
          <div
            className="mx-auto h-20 w-20 rounded-2xl flex items-center justify-center mb-5 animate-glow-green"
            style={{ background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <CheckCircle className="h-10 w-10 text-emerald-400 animate-stamp" />
          </div>
          <h2 className="text-2xl font-black text-white">{ballotType} Vote Cast!</h2>
          <p className="text-sm mt-2 mb-6" style={{ color: 'rgba(52,211,153,0.55)' }}>
            Your ballot has been securely stamped and counted in{' '}
            <strong className="text-white">{constituency?.name}</strong>.
          </p>

          {/* Receipt Box */}
          <div
            className="rounded-2xl p-4 text-left space-y-2.5 mb-6"
            style={{ background: 'rgba(2,10,6,0.7)', border: '1px solid rgba(16,185,129,0.1)' }}
          >
            {[
              { label: 'Ballot Category', value: ballotType, valueClass: 'text-white font-bold' },
              { label: 'Voted For', value: candidateName, valueClass: 'text-white font-bold' },
              { label: 'Receipt ID', value: voteId, valueClass: 'font-mono text-yellow-400 font-bold tracking-wider' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center text-xs">
                <span style={{ color: 'rgba(52,211,153,0.5)' }}>{row.label}</span>
                <span className={row.valueClass}>{row.value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/voter')}
              className="btn-primary w-full justify-center text-sm"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate('/voter/history')}
              className="btn-secondary w-full justify-center text-sm"
            >
              View Receipts
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Main Component ─── */
const VotingPage = () => {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const ballotType = searchParams.get('type') || 'MNA';
  const navigate = useNavigate();
  const { user, isAuthenticated, triggerEmailNotification } = useAuth();
  const voterId = user?.voterId || '';

  const [event, setEvent] = useState(null);
  const [constituency, setConstituency] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [voteId, setVoteId] = useState('');

  const loadVotingData = async () => {
    try {
      setIsLoading(true);
      if (!eventId) throw new Error('Election ID is missing');

      const eventSnap = await getDoc(doc(db, 'events', eventId));
      if (!eventSnap.exists()) throw new Error('Election event not found');
      const eventData = eventSnap.data();
      if (eventData.status !== 'active') throw new Error('Polling is closed or inactive');
      setEvent({ id: eventSnap.id, ...eventData });

      const voterRef = doc(db, 'voters', user.id);
      const voterSnap = await getDoc(voterRef);
      if (!voterSnap.exists()) throw new Error('Voter profile not found');
      const voterData = voterSnap.data();

      if (ballotType === 'MNA' && voterData.hasVotedMNA) { toast.warning('MNA ballot already cast'); navigate('/voter'); return; }
      if (ballotType === 'MPA' && voterData.hasVotedMPA) { toast.warning('MPA ballot already cast'); navigate('/voter'); return; }

      const constId = ballotType === 'MNA' ? voterData.naConstituencyId : voterData.paConstituencyId;
      if (!constId) throw new Error(`No constituency assigned for ${ballotType}`);

      const constSnap = await getDoc(doc(db, 'constituencies', constId));
      if (!constSnap.exists()) throw new Error('Assigned Halka details not found');
      setConstituency({ id: constSnap.id, ...constSnap.data() });

      const qCands = query(
        collection(db, 'candidates'),
        where('constituencyId', '==', constId),
        where('type', '==', ballotType),
        where('status', '==', 'approved')
      );
      const candSnap = await getDocs(qCands);
      setCandidates(candSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Voting data load error:', error);
      toast.error(error.message || 'Failed to load polling booth');
      navigate('/voter');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !voterId) { navigate('/login'); toast.error('Voter authorization required'); return; }
    loadVotingData();
  }, [eventId, voterId, isAuthenticated, ballotType]);

  const confirmVote = async () => {
    try {
      setIsSubmitting(true);
      const generatedVoteId = 'ECP-' + Math.random().toString(36).substring(2, 11).toUpperCase();
      const voterRef = doc(db, 'voters', user.id);
      const candidateRef = doc(db, 'candidates', selectedCandidate);
      const eventRef = doc(db, 'events', eventId);

      await runTransaction(db, async (transaction) => {
        const voterDoc = await transaction.get(voterRef);
        const candidateDoc = await transaction.get(candidateRef);
        const eventDoc = await transaction.get(eventRef);
        if (!voterDoc.exists()) throw new Error('Voter profile missing');
        if (!candidateDoc.exists()) throw new Error('Candidate details missing');
        if (!eventDoc.exists()) throw new Error('Election details missing');

        const voterData = voterDoc.data();
        const candData = candidateDoc.data();
        const eventData = eventDoc.data();

        if (ballotType === 'MNA' && voterData.hasVotedMNA) throw new Error('MNA vote already cast');
        if (ballotType === 'MPA' && voterData.hasVotedMPA) throw new Error('MPA vote already cast');

        const voterUpdates = {};
        if (ballotType === 'MNA') { voterUpdates.hasVotedMNA = true; voterUpdates.votedMNAId = selectedCandidate; }
        else { voterUpdates.hasVotedMPA = true; voterUpdates.votedMPAId = selectedCandidate; }
        transaction.update(voterRef, voterUpdates);
        transaction.update(candidateRef, { voteCount: (candData.voteCount || 0) + 1 });

        const eventUpdates = {};
        if (ballotType === 'MNA') eventUpdates.totalMNAVotes = (eventData.totalMNAVotes || 0) + 1;
        else eventUpdates.totalMPAVotes = (eventData.totalMPAVotes || 0) + 1;

        const votesList = eventData.votes || [];
        votesList.push({
          voterId, candidateId: selectedCandidate, candidateName: candData.name,
          partyAcronym: candData.partyAcronym, type: ballotType,
          constituencyId: constituency.id, constituencyName: constituency.name,
          voteId: generatedVoteId, timestamp: new Date().toISOString()
        });
        transaction.update(eventRef, { ...eventUpdates, votes: votesList });
      });

      setVoteId(generatedVoteId);
      setVoteSubmitted(true);
      toast.success(`${ballotType} Ballot stamped and dropped into ECP box!`);

      const cand = candidates.find(c => c.id === selectedCandidate);
      triggerEmailNotification(
        `Official Polling Ballot Cast Receipt (${ballotType}) - ECP`,
        user.email || 'voter@ecp.gov.pk',
        `<h3>Election Commission of Pakistan (ECP)</h3>
         <p>Dear ${user.name},</p>
         <p>Your ${ballotType} ballot has been officially recorded.</p>
         <p><strong>Receipt ID:</strong> ${generatedVoteId}</p>
         <p><strong>Candidate:</strong> ${cand?.name} (${cand?.partyAcronym})</p>
         <p><strong>Constituency:</strong> ${constituency.name}</p>`,
        'ballot'
      );
    } catch (error) {
      console.error('Vote transaction failed:', error);
      toast.error(error.message || 'Transaction failed. Please try again.');
    } finally {
      setIsSubmitting(false);
      setShowAlert(false);
    }
  };

  const getSelectedCandidateName = () => {
    const cand = candidates.find(c => c.id === selectedCandidate);
    return cand ? `${cand.name} (${cand.partyAcronym})` : '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#020c07' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (voteSubmitted) {
    return (
      <VoteSuccess
        ballotType={ballotType}
        constituency={constituency}
        voteId={voteId}
        candidateName={getSelectedCandidateName()}
        navigate={navigate}
      />
    );
  }

  const isMNA = ballotType === 'MNA';

  return (
    <div className="min-h-screen py-8 text-white font-sans" style={{ background: '#020c07' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ─── Nav Back ─── */}
        <button
          onClick={() => navigate('/voter')}
          className="flex items-center gap-2 text-sm font-bold transition-all"
          style={{ color: 'rgba(52,211,153,0.7)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'white'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(52,211,153,0.7)'}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        {/* ─── Ballot Header ─── */}
        <div
          className="animate-slide-up glass rounded-3xl overflow-hidden text-center"
          style={{ animationDelay: '0ms' }}
        >
          <div
            className="h-1.5"
            style={{ background: isMNA ? 'linear-gradient(90deg, #059669, #10b981)' : 'linear-gradient(90deg, #6b7280, #d1d5db, #6b7280)' }}
          />
          <div className="px-6 py-8">
            <div
              className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
              style={isMNA
                ? { background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(16,185,129,0.25)' }
                : { background: 'rgba(200,200,200,0.08)', border: '1px solid rgba(200,200,200,0.15)' }
              }
            >
              <Landmark className="h-8 w-8 text-yellow-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white">
              {isMNA ? 'National Assembly Ballot' : 'Provincial Assembly Ballot'}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span
                className="badge"
                style={isMNA
                  ? { background: 'rgba(5,150,105,0.2)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }
                  : { background: 'rgba(200,200,200,0.1)', border: '1px solid rgba(200,200,200,0.2)', color: '#e5e7eb' }
                }
              >
                {constituency?.name}
              </span>
              <span className="badge" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                {ballotType} Seat
              </span>
            </div>
            <p className="text-xs mt-3" style={{ color: 'rgba(52,211,153,0.5)' }}>
              Stamp your selected candidate. Double-check before pressing submit.
            </p>
          </div>
        </div>

        {/* ─── Candidate List ─── */}
        <div className="animate-slide-up" style={{ animationDelay: '50ms' }}>
          <h2 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2"
            style={{ color: 'rgba(52,211,153,0.55)' }}>
            <ShieldCheck className="h-4 w-4 text-yellow-400" />
            ECP Approved Candidates — {candidates.length} Registered
          </h2>

          {candidates.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <Award className="h-10 w-10 mx-auto mb-3" style={{ color: 'rgba(16,185,129,0.25)' }} />
              <p className="text-sm font-bold text-white">No Approved Candidates</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(52,211,153,0.4)' }}>
                No approved candidates in {constituency?.name} for {ballotType}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((c, idx) => {
                const isSelected = selectedCandidate === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCandidate(c.id)}
                    className={`ballot-card animate-slide-up ${isSelected ? 'selected' : ''}`}
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Candidate Photo with Symbol Overlay */}
                      <div
                        className="flex-shrink-0 h-16 w-16 rounded-xl flex items-center justify-center overflow-hidden relative shadow"
                        style={{ background: 'rgba(4,20,13,0.95)', border: '2px solid rgba(16,185,129,0.25)' }}
                      >
                        {c.profilePictureUrl ? (
                          <img src={c.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Users className="h-7 w-7 text-emerald-400/50" />
                        )}
                        {/* Overlay Symbol badge */}
                        {c.symbolUrl && (
                          <div className="absolute bottom-0 right-0 h-6 w-6 bg-white/95 rounded-tl border-t border-l border-emerald-500/10 p-0.5 flex items-center justify-center">
                            <img src={c.symbolUrl} alt="" className="h-full w-full object-contain" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-white truncate">{c.name}</h3>
                        <p className="text-[11px] font-black text-yellow-400 uppercase mt-0.5">
                          {c.partyAcronym} &bull; <span className="font-mono text-[9.5px] lowercase tracking-normal text-slate-350">{c.candidateId || 'no id'}</span>
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(52,211,153,0.5)' }}>
                          Symbol: {c.symbolName || c.partyAcronym || 'Independent'}
                        </p>
                      </div>

                      {/* Radio indicator */}
                      <div
                        className="h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0"
                        style={isSelected
                          ? { borderColor: '#fbbf24', background: '#fbbf24' }
                          : { borderColor: 'rgba(16,185,129,0.25)', background: 'transparent' }
                        }
                      >
                        {isSelected && <div className="h-2 w-2 rounded-full" style={{ background: '#020c07' }} />}
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        className="mt-4 pt-3 flex items-center gap-2 text-[11px] font-bold text-yellow-400"
                        style={{ borderTop: '1px solid rgba(251,191,36,0.15)' }}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Selected — Ready to stamp ballot
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Submit Bar ─── */}
        {selectedCandidate && (
          <div
            className="animate-slide-up glass rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4"
            style={{
              border: '1px solid rgba(251,191,36,0.2)',
              boxShadow: '0 0 30px -10px rgba(251,191,36,0.15)',
            }}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(52,211,153,0.5)' }}>
                Stamped Nominee
              </p>
              <h3 className="text-base font-black text-white mt-1">{getSelectedCandidateName()}</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowAlert(true)}
                className="btn-primary flex items-center gap-2 text-sm w-full sm:w-auto"
              >
                <Vote className="h-4 w-4" /> Submit Ballot
              </button>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="btn-secondary text-sm w-full sm:w-auto justify-center"
              >
                Reset Stamp
              </button>
            </div>
          </div>
        )}

        {/* ─── Confirm Modal ─── */}
        <ConfirmModal
          isOpen={showAlert}
          candidateName={getSelectedCandidateName()}
          onConfirm={confirmVote}
          onCancel={() => setShowAlert(false)}
          ballotType={isMNA ? 'National Assembly (MNA)' : 'Provincial Assembly (MPA)'}
          isSubmitting={isSubmitting}
        />

      </div>
    </div>
  );
};

export default VotingPage;
