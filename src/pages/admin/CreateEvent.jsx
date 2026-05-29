import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Clock, Landmark } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const CreateEvent = () => {
  const getDefaultDates = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    return {
      start: tomorrow.toISOString().slice(0, 16),
      end: dayAfter.toISOString().slice(0, 16)
    };
  };

  const defaultDates = getDefaultDates();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: defaultDates.start,
    endDate: defaultDates.end,
    electionType: 'General',
    scope: 'All',
    minVoterAge: 18,
    year: new Date().getFullYear()
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast.error('Invalid date format');
      return;
    }

    if (start >= end) {
      toast.error('Start date must be before end date');
      return;
    }

    setIsLoading(true);

    try {
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        status: 'inactive',
        electionType: formData.electionType,
        scope: formData.scope,
        minVoterAge: parseInt(formData.minVoterAge) || 18,
        year: parseInt(formData.year) || new Date().getFullYear(),
        totalMNAVotes: 0,
        totalMPAVotes: 0,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'events'), eventData);
      toast.success('Election event initialized successfully!');
      navigate('/admin');
    } catch (error) {
      toast.error('An error occurred while creating the election');
      console.error('Event creation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-950 py-8 px-4 sm:px-6 lg:px-8 text-white font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-emerald-450 hover:text-white mb-4 transition-colors text-sm font-semibold"
            aria-label="Return to admin dashboard"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Command Dashboard
          </button>
          
          <h1 className="text-3xl font-extrabold flex items-center tracking-wide">
            <Landmark className="h-8 w-8 mr-3 text-yellow-400" />
            Initialize General Election
          </h1>
          <p className="text-emerald-400 text-xs mt-1">Set up a new nationwide or provincial voting window</p>
        </div>

        {/* Form Container */}
        <div className="bg-emerald-900/40 border border-emerald-500/20 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Event Title */}
            <div>
              <label htmlFor="title" className="block text-xs font-semibold text-emerald-300 uppercase mb-2">
                Election Title
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-5 w-5 text-emerald-555" />
                </div>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg placeholder-emerald-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm transition-all"
                  placeholder="e.g. Pakistan General Elections 2026"
                />
              </div>
            </div>

            {/* Event Description */}
            <div>
              <label htmlFor="description" className="block text-xs font-semibold text-emerald-300 uppercase mb-2">
                Election Summary & Guidelines
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                className="block w-full px-4 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg placeholder-emerald-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm transition-all resize-none"
                placeholder="Provide directions, instructions, or descriptions..."
              />
            </div>

            {/* Election Configurations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-emerald-950/30 border border-emerald-500/10 p-5 rounded-xl">
              <div>
                <label htmlFor="electionType" className="block text-xs font-semibold text-emerald-300 uppercase mb-2">
                  Election Type
                </label>
                <select
                  id="electionType"
                  name="electionType"
                  value={formData.electionType}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm transition-all"
                >
                  <option value="General">General Election</option>
                  <option value="By-Election">By-Election</option>
                </select>
              </div>

              <div>
                <label htmlFor="year" className="block text-xs font-semibold text-emerald-300 uppercase mb-2">
                  Election Year
                </label>
                <input
                  type="number"
                  id="year"
                  name="year"
                  required
                  min={2020}
                  max={2100}
                  value={formData.year}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm transition-all"
                />
              </div>

              <div>
                <label htmlFor="scope" className="block text-xs font-semibold text-emerald-300 uppercase mb-2">
                  Election Scope
                </label>
                <select
                  id="scope"
                  name="scope"
                  value={formData.scope}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm transition-all"
                >
                  <option value="All">All Assemblies (MNA & MPA)</option>
                  <option value="National">National Assembly Only (MNA)</option>
                  <option value="Provincial">Provincial Assemblies Only (MPA)</option>
                  <option value="Punjab">Punjab Assembly Only</option>
                  <option value="Sindh">Sindh Assembly Only</option>
                  <option value="KPK">Khyber Pakhtunkhwa (KPK) Assembly Only</option>
                  <option value="Balochistan">Balochistan Assembly Only</option>
                </select>
              </div>

              <div>
                <label htmlFor="minVoterAge" className="block text-xs font-semibold text-emerald-300 uppercase mb-2">
                  Minimum Voter Age Limit
                </label>
                <input
                  type="number"
                  id="minVoterAge"
                  name="minVoterAge"
                  required
                  min={18}
                  max={120}
                  value={formData.minVoterAge}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            {/* Date Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startDate" className="block text-xs font-semibold text-emerald-300 uppercase mb-2">
                  Polling Commencement (Start)
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    id="startDate"
                    name="startDate"
                    required
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="endDate" className="block text-xs font-semibold text-emerald-300 uppercase mb-2">
                  Polling Conclusion (End)
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    id="endDate"
                    name="endDate"
                    required
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Information Box */}
            <div className="bg-emerald-950/40 border border-emerald-500/15 rounded-xl p-4 space-y-2">
              <h4 className="text-sm font-bold text-yellow-400">Post-Initialization Workflow</h4>
              <ul className="text-xs text-emerald-350 space-y-1.5 list-disc list-inside">
                <li>Voters will log in using their CNIC once imported.</li>
                <li>Constituencies must be configured to assign candidates.</li>
                <li>Party managers can nominate candidate sheets once the election is setup.</li>
                <li>Results updates are displayed live to all actors.</li>
              </ul>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-emerald-500/10">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-8 py-3.5 bg-yellow-400 hover:bg-yellow-500 text-emerald-950 font-bold rounded-lg transition-colors flex items-center justify-center shadow-md active:scale-98"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Registering Election...</span>
                  </>
                ) : (
                  'Launch Election Event'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
