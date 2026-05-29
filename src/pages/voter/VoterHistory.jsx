import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, CheckCircle, Calendar, FileText, Landmark, Shield } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const VoterHistory = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const voterId = user?.voterId || '';

  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async (vid) => {
    try {
      setIsLoading(true);
      const eventsSnap = await getDocs(collection(db, 'events'));
      const list = [];
      eventsSnap.docs.forEach(docSnap => {
        const eventData = docSnap.data();
        const votes = eventData.votes || [];
        const myVotes = votes.filter(v => v.voterId === vid);
        myVotes.forEach(vote => {
          list.push({
            electionTitle: eventData.title || 'General Election',
            constituencyName: vote.constituencyName || 'Assigned Halka',
            candidateName: vote.candidateName || 'Nominated Candidate',
            partyAcronym: vote.partyAcronym || 'Independent',
            type: vote.type || 'MNA',
            voteId: vote.voteId || 'ECP-XXXXXXXX',
            timestamp: vote.timestamp || new Date().toISOString()
          });
        });
      });
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setHistory(list);
    } catch (error) {
      console.error('History load error:', error);
      toast.error('Failed to load voting receipt history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !voterId) { navigate('/login'); toast.error('Voter session required'); return; }
    loadHistory(voterId);
  }, [isAuthenticated, voterId]);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#020c07' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const mnaCount = history.filter(h => h.type === 'MNA').length;
  const mpaCount = history.filter(h => h.type === 'MPA').length;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 text-white font-sans" style={{ background: '#020c07' }}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ─── Page Header ─── */}
        <div className="animate-slide-up section-header">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/voter')}
              className="p-2 rounded-xl transition-all duration-200"
              style={{ background: 'rgba(4,20,13,0.7)', border: '1px solid rgba(16,185,129,0.15)' }}
            >
              <ArrowLeft className="h-4 w-4 text-emerald-300" />
            </button>
            <div>
              <h1 className="page-title flex items-center gap-2">
                <History className="h-6 w-6 text-yellow-400" /> ECP Ballot Receipts
              </h1>
              <p className="page-subtitle">Verifiable transaction logs of your cast votes</p>
            </div>
          </div>
        </div>

        {/* ─── Stats Bar ─── */}
        {history.length > 0 && (
          <div className="grid grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '50ms' }}>
            {[
              { label: 'Total Ballots', value: history.length, icon: FileText },
              { label: 'MNA Votes', value: mnaCount, icon: Landmark },
              { label: 'MPA Votes', value: mpaCount, icon: Shield },
            ].map((s, i) => (
              <div key={s.label} className="stat-card" style={{ animationDelay: `${i * 40}ms` }}>
                <s.icon className="h-5 w-5 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-black shimmer-text">{s.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(52,211,153,0.55)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ─── Empty State ─── */}
        {history.length === 0 ? (
          <div className="glass animate-slide-up rounded-3xl p-14 text-center" style={{ animationDelay: '50ms' }}>
            <div
              className="mx-auto h-20 w-20 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(4,30,20,0.8)', border: '1px solid rgba(16,185,129,0.12)' }}
            >
              <History className="h-10 w-10" style={{ color: 'rgba(16,185,129,0.35)' }} />
            </div>
            <h3 className="text-xl font-black text-white">No Ballots Recorded</h3>
            <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: 'rgba(52,211,153,0.5)' }}>
              You haven't cast any votes yet. Your ECP receipts will appear here after you vote.
            </p>
          </div>
        ) : (
          <>
            {/* Security Notice */}
            <div
              className="animate-slide-up rounded-xl p-4 flex items-start gap-3"
              style={{
                background: 'rgba(251,191,36,0.06)',
                border: '1px solid rgba(251,191,36,0.15)',
                animationDelay: '80ms',
              }}
            >
              <Shield className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs" style={{ color: 'rgba(251,191,36,0.7)' }}>
                <strong className="text-yellow-400">Security Protocol:</strong> Your ballot stamping decisions are encrypted and securely recorded.
                Transaction reference keys (Receipt ID) are unique identifiers verifying your votes have been counted by ECP servers.
              </p>
            </div>

            {/* Receipts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {history.map((vote, idx) => {
                const isMNA = vote.type === 'MNA';
                return (
                  <div
                    key={idx}
                    className="animate-slide-up glass rounded-2xl overflow-hidden"
                    style={{ animationDelay: `${100 + idx * 40}ms` }}
                  >
                    {/* Color accent top bar */}
                    <div
                      className="h-0.5"
                      style={{
                        background: isMNA
                          ? 'linear-gradient(90deg, #059669, #10b981)'
                          : 'linear-gradient(90deg, #6b7280, #d1d5db)',
                      }}
                    />

                    <div className="p-5 space-y-4">
                      {/* Type + Status */}
                      <div className="flex justify-between items-center">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase"
                          style={isMNA
                            ? { background: 'rgba(5,150,105,0.2)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }
                            : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e5e7eb' }
                          }
                        >
                          {vote.type} Ballot
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <CheckCircle className="h-3.5 w-3.5" /> Counted
                        </span>
                      </div>

                      {/* Election Info */}
                      <div>
                        <h4 className="text-sm font-black text-white truncate">{vote.electionTitle}</h4>
                        <p className="text-[11px] mt-0.5 font-medium" style={{ color: 'rgba(52,211,153,0.55)' }}>
                          {vote.constituencyName}
                        </p>
                      </div>

                      {/* Vote Details Box */}
                      <div
                        className="rounded-xl p-3.5 space-y-2"
                        style={{ background: 'rgba(2,10,6,0.6)', border: '1px solid rgba(16,185,129,0.08)' }}
                      >
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'rgba(52,211,153,0.5)' }}>Voted For</span>
                          <span className="font-bold text-white">{vote.candidateName}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'rgba(52,211,153,0.5)' }}>Party</span>
                          <span className="font-bold text-yellow-400">{vote.partyAcronym}</span>
                        </div>
                        <div className="sep" />
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'rgba(52,211,153,0.5)' }}>Receipt ID</span>
                          <span className="font-mono font-bold text-white tracking-wider">{vote.voteId}</span>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(52,211,153,0.4)' }}>
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(vote.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default VoterHistory;
