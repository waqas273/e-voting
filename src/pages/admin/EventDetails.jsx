import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square, Landmark, Users, Award, Percent } from 'lucide-react';
import { doc, getDoc, updateDoc, onSnapshot, getDocs, collection } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  
  // ECP collection states
  const [voters, setVoters] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [constituencies, setConstituencies] = useState([]);

  useEffect(() => {
    if (!id) {
      toast.error('Invalid event ID');
      navigate('/admin');
      return;
    }

    const eventRef = doc(db, 'events', id);
    const unsubscribe = onSnapshot(eventRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEvent({ id: docSnap.id, ...data });

        // Load collection details
        const consts = await getDocs(collection(db, 'constituencies'));
        setConstituencies(consts.docs.map(d => ({ id: d.id, ...d.data() })));

        const vts = await getDocs(collection(db, 'voters'));
        setVoters(vts.docs.map(d => ({ id: d.id, ...d.data() })));

        const cands = await getDocs(collection(db, 'candidates'));
        setCandidates(cands.docs.map(d => ({ id: d.id, ...d.data() })));
        
        setIsLoading(false);
      } else {
        toast.error('Event not found');
        navigate('/admin');
      }
    }, (err) => {
      console.error(err);
      toast.error('Failed to sync election details');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [id, navigate]);

  const handleStatusChange = async (status) => {
    if (!id) return;
    try {
      const eventRef = doc(db, 'events', id);
      await updateDoc(eventRef, { status });
      toast.success(`Election event is now: ${status.toUpperCase()}`);
    } catch (err) {
      toast.error('Failed to update election status');
    }
  };

  const getConstituencyName = (cid) => {
    const found = constituencies.find(c => c.id === cid);
    return found ? found.name : 'Unknown Halka';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Turnout stats
  const totalRegisteredVoters = voters.length;
  const castMnaVotes = event?.totalMNAVotes || 0;
  const castMpaVotes = event?.totalMPAVotes || 0;
  const mnaTurnoutPct = totalRegisteredVoters > 0 ? ((castMnaVotes / totalRegisteredVoters) * 100).toFixed(1) : '0.0';
  const mpaTurnoutPct = totalRegisteredVoters > 0 ? ((castMpaVotes / totalRegisteredVoters) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-emerald-950 py-8 px-4 sm:px-6 lg:px-8 text-white font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <div>
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center text-emerald-400 hover:text-white transition-colors text-sm font-semibold mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
          
          <h1 className="text-3xl font-extrabold flex items-center tracking-wide">
            <Landmark className="h-8 w-8 mr-3 text-yellow-400" />
            {event.title}
          </h1>
          <p className="text-emerald-400 text-xs mt-1">{event.description || 'No description available'}</p>
        </div>

        {/* Tab switcher */}
        <div className="flex space-x-2 border-b border-emerald-500/20 pb-2 overflow-x-auto whitespace-nowrap scrollbar-none">
          {['overview', 'voters', 'candidates', 'results'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${
                activeTab === tab 
                  ? 'bg-yellow-400 text-emerald-950 shadow-md' 
                  : 'bg-emerald-900/40 text-emerald-350 hover:bg-emerald-900/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-emerald-900/40 border border-emerald-500/20 p-6 rounded-2xl">
                <Users className="h-5 w-5 text-yellow-400 mb-2" />
                <p className="text-xxs text-emerald-400 uppercase font-bold tracking-wider">Registered Voters</p>
                <p className="text-2xl font-bold mt-1 text-white">{totalRegisteredVoters}</p>
              </div>
              <div className="bg-emerald-900/40 border border-emerald-500/20 p-6 rounded-2xl">
                <Landmark className="h-5 w-5 text-yellow-400 mb-2" />
                <p className="text-xxs text-emerald-400 uppercase font-bold tracking-wider">MNA Ballots (Green)</p>
                <p className="text-2xl font-bold mt-1 text-white">{castMnaVotes}</p>
                <span className="text-xxs text-emerald-450 mt-1 block">Turnout: {mnaTurnoutPct}%</span>
              </div>
              <div className="bg-emerald-900/40 border border-emerald-500/20 p-6 rounded-2xl">
                <Landmark className="h-5 w-5 text-yellow-400 mb-2" />
                <p className="text-xxs text-emerald-400 uppercase font-bold tracking-wider">MPA Ballots (White)</p>
                <p className="text-2xl font-bold mt-1 text-white">{castMpaVotes}</p>
                <span className="text-xxs text-emerald-450 mt-1 block">Turnout: {mpaTurnoutPct}%</span>
              </div>
            </div>

            <div className="bg-emerald-900/40 border border-emerald-500/20 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-sm">Election Polling Control</h3>
                <p className="text-xxs text-emerald-400 mt-1">Set the polling status. Voters can only cast ballots while active.</p>
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                {event.status === 'inactive' && (
                  <button
                    onClick={() => handleStatusChange('active')}
                    className="w-full sm:w-auto px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center"
                  >
                    <Play className="h-4.5 w-4.5 mr-1.5" /> Start Polling
                  </button>
                )}
                {event.status === 'active' && (
                  <button
                    onClick={() => handleStatusChange('closed')}
                    className="w-full sm:w-auto px-6 py-2.5 bg-red-650 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center"
                  >
                    <Square className="h-4.5 w-4.5 mr-1.5" /> Close Polling
                  </button>
                )}
                {event.status === 'closed' && (
                  <span className="text-xs font-bold text-red-400 bg-red-900/20 border border-red-500/10 px-4 py-2 rounded-xl">
                    Polling Ended
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Voters Tab */}
        {activeTab === 'voters' && (
          <div className="bg-emerald-900/40 border border-emerald-500/20 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold border-b border-emerald-500/10 pb-2 text-yellow-400">
              Registered Voters List ({voters.length})
            </h2>
            {voters.length === 0 ? (
              <p className="text-xs text-emerald-500 py-6 text-center">No voters registered in the system database yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-emerald-500/15 text-xs text-left">
                  <thead>
                    <tr className="text-emerald-300 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">CNIC</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">NA Seat</th>
                      <th className="py-2.5 px-3">Provincial Seat</th>
                      <th className="py-2.5 px-3 text-right">Voted MNA/MPA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-500/10">
                    {voters.map(v => (
                      <tr key={v.id} className="hover:bg-emerald-950/20">
                        <td className="py-3 px-3 font-mono font-bold text-white">{v.cnic}</td>
                        <td className="py-3 px-3 font-semibold text-white">{v.name}</td>
                        <td className="py-3 px-3 text-emerald-350">{v.email}</td>
                        <td className="py-3 px-3">{getConstituencyName(v.naConstituencyId)}</td>
                        <td className="py-3 px-3">{getConstituencyName(v.paConstituencyId)}</td>
                        <td className="py-3 px-3 text-right font-bold whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] mr-1 ${v.hasVotedMNA ? 'bg-green-600/30 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
                            MNA
                          </span>
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] ${v.hasVotedMPA ? 'bg-green-600/30 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
                            MPA
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Candidates Tab */}
        {activeTab === 'candidates' && (
          <div className="bg-emerald-900/40 border border-emerald-500/20 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold border-b border-emerald-500/10 pb-2 text-yellow-400">
              ECP Approved running Candidates ({candidates.filter(c => c.status === 'approved').length})
            </h2>
            {candidates.filter(c => c.status === 'approved').length === 0 ? (
              <p className="text-xs text-emerald-500 py-6 text-center">No approved candidates currently running.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {candidates.filter(c => c.status === 'approved').map(c => (
                  <div key={c.id} className="bg-emerald-950/60 border border-emerald-500/15 rounded-2xl p-5 hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-3">
                    <div className="flex items-center space-x-3">
                      <img src={c.symbolUrl} alt="" className="h-10 w-10 object-contain bg-white rounded-full p-0.5 border" />
                      <div>
                        <h4 className="font-bold text-sm text-white leading-tight">{c.name}</h4>
                        <span className="text-[10px] text-yellow-400 font-extrabold uppercase">{c.partyAcronym}</span>
                      </div>
                    </div>
                    <div className="pt-2.5 border-t border-emerald-500/10 flex justify-between items-center text-xxs text-emerald-400">
                      <span>{getConstituencyName(c.constituencyId)}</span>
                      <span className="font-bold uppercase text-white bg-emerald-900 px-2 py-0.5 rounded">{c.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="bg-emerald-900/40 border border-emerald-500/20 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-emerald-500/10 pb-2">
              <h2 className="text-lg font-bold text-yellow-400">Election Halka Vote counts</h2>
              <button
                onClick={() => navigate('/voter/results')}
                className="px-4 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-emerald-950 font-bold rounded-lg text-xxs transition-all shadow-md"
              >
                Open Transmission Feed
              </button>
            </div>
            
            <div className="space-y-6">
              {constituencies.map(constituency => {
                const constCands = candidates
                  .filter(c => c.constituencyId === constituency.id && c.status === 'approved')
                  .sort((a, b) => b.voteCount - a.voteCount);
                if (constCands.length === 0) return null;

                return (
                  <div key={constituency.id} className="bg-emerald-950/40 border border-emerald-500/10 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-sm text-white uppercase border-b border-emerald-500/5 pb-1">
                      {constituency.name} ({constituency.type === 'national' ? 'MNA' : 'MPA'})
                    </h3>
                    <div className="space-y-3">
                      {constCands.map((cand, idx) => (
                        <div key={cand.id} className="flex justify-between items-center bg-emerald-900/10 p-3 rounded-xl border border-emerald-500/5">
                          <div className="flex items-center space-x-3">
                            <img src={cand.symbolUrl} alt="" className="h-8 w-8 object-contain bg-white rounded-full p-0.5" />
                            <div>
                              <h4 className="text-xs font-bold text-white leading-tight">{cand.name}</h4>
                              <span className="text-[10px] text-yellow-400 font-extrabold uppercase">{cand.partyAcronym}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-white bg-emerald-950 px-2.5 py-1 rounded border border-emerald-500/10">
                              {cand.voteCount || 0} Votes
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EventDetails;
