import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Vote, ShieldCheck, Activity, Users, ChevronRight, Landmark,
  Lock, Globe, Zap, BarChart2, CheckCircle, Star, ArrowRight,
  FileText, MapPin, Bell, Clock, Award, TrendingUp, Shield,
  Eye, Fingerprint, Server, Wifi, ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';

// ─── Scroll-animated section wrapper ───────────────────────────────────────
const Section = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.7, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

const SectionLabel = ({ children }) => (
  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-xs font-black uppercase tracking-widest mb-5">
    {children}
  </div>
);

// ─── STATS DATA ─────────────────────────────────────────────────────────────
const STATS = [
  { value: '130M+', label: 'Registered Voters', icon: Users, color: 'text-emerald-400' },
  { value: '272',   label: 'NA Constituencies', icon: Landmark, color: 'text-yellow-400' },
  { value: '99.9%', label: 'System Uptime',     icon: Server, color: 'text-blue-400' },
  { value: '256-bit', label: 'AES Encryption',  icon: Lock, color: 'text-purple-400' },
];

// ─── HOW IT WORKS STEPS ─────────────────────────────────────────────────────
const STEPS = [
  { step: '01', title: 'Register & Verify', desc: 'ECP verifies your CNIC in the national voter registry. Instant digital confirmation.', icon: Fingerprint },
  { step: '02', title: 'Receive Your Ballot', desc: 'On election day, your personal digital ballot (Green & White) is unlocked for your constituency.', icon: FileText },
  { step: '03', title: 'Cast Your Vote', desc: 'Select your candidate on the secure portal. Your vote is encrypted and anonymized immediately.', icon: Vote },
  { step: '04', title: 'Get Your Receipt', desc: 'Download a cryptographic voting receipt as proof — your identity stays fully protected.', icon: CheckCircle },
];

// ─── FEATURES ────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: ShieldCheck, title: 'End-to-End Encryption', desc: 'Every ballot is encrypted with AES-256 before it ever leaves your device.', color: 'emerald' },
  { icon: Eye,         title: 'Full Transparency',     desc: 'Real-time public tallies and audit trails — ECP certified and openly verifiable.', color: 'blue' },
  { icon: Wifi,        title: 'Real-Time Results',     desc: 'Live constituency scoreboards updated per vote. No delay, no suppression.', color: 'yellow' },
  { icon: Globe,       title: 'Vote from Anywhere',    desc: 'Cast your ballot from home, office, or abroad — 24/7 during polling hours.', color: 'purple' },
  { icon: Bell,        title: 'Smart Notifications',   desc: 'Automated ECP notifications for registration status, approval, and results.', color: 'pink' },
  { icon: Zap,         title: 'Instant Processing',    desc: 'Sub-second vote confirmation with military-grade system infrastructure.', color: 'orange' },
];

// ─── ACTOR PORTALS ───────────────────────────────────────────────────────────
const PORTALS = [
  {
    role: 'Voter',
    icon: Users,
    color: 'from-emerald-600 to-emerald-400',
    glow: 'rgba(16,185,129,0.3)',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    desc: 'Cast your MNA & MPA ballots, track live results, and download verified voting receipts.',
    features: ['CNIC-based secure login', 'Green & White ballot system', 'Live constituency results', 'Official voting receipt'],
  },
  {
    role: 'Party Manager',
    icon: Landmark,
    color: 'from-yellow-600 to-yellow-400',
    glow: 'rgba(251,191,36,0.3)',
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/10',
    desc: 'Register your party, nominate candidates across constituencies, and monitor live electoral performance.',
    features: ['ECP party registration', 'Candidate nomination filing', 'Live vote performance tracker', 'ECP notification mailbox'],
  },
  {
    role: 'ECP Administration',
    icon: Shield,
    color: 'from-blue-600 to-blue-400',
    glow: 'rgba(59,130,246,0.3)',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    desc: 'Manage constituencies, approve registrations, control election events, and oversee the entire process.',
    features: ['Constituency & voter registry', 'Party & candidate approvals', 'Election event control', 'Real-time system oversight'],
  },
];

// ─── TIMELINE ────────────────────────────────────────────────────────────────
const TIMELINE = [
  { date: 'Jan 2026', event: 'Voter Registration Opens', status: 'done' },
  { date: 'Mar 2026', event: 'Party Registration Deadline', status: 'done' },
  { date: 'Apr 2026', event: 'Candidate Nomination Filing', status: 'active' },
  { date: 'May 2026', event: 'ECP Scrutiny & Approvals', status: 'upcoming' },
  { date: 'Jul 2026', event: 'General Election Day', status: 'upcoming' },
  { date: 'Jul 2026', event: 'Official Results Declaration', status: 'upcoming' },
];

// ═══════════════════════════════════════════════════════════════════════════
const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const confirm = useConfirm();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    const proceed = await confirm("Are you sure you want to log out of ECP Digital Portal?", {
      title: "Exit ECP Portal",
      confirmText: "Logout",
      cancelText: "Cancel",
      type: "danger"
    });
    if (proceed) {
      logout();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-emerald-950 text-slate-50 font-sans selection:bg-emerald-500/30 overflow-x-hidden">

      {/* ───────────── BACKGROUND ATMOSPHERE ───────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-800/20 rounded-full blur-[140px]" />
        <motion.div animate={{ opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 10, delay: 2, repeat: Infinity }}
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-yellow-600/10 rounded-full blur-[160px]" />
        <motion.div animate={{ opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 12, delay: 4, repeat: Infinity }}
          className="absolute top-[40%] left-[40%] w-[40%] h-[40%] bg-blue-700/10 rounded-full blur-[120px]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(16,185,129,1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* ───────────── NAVBAR ───────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-emerald-950/80 border-b border-emerald-500/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <div className="bg-emerald-900/60 p-2.5 rounded-xl border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
              <Landmark className="h-6 w-6 text-yellow-400 filter drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
            </div>
            <div>
              <span className="text-lg font-black tracking-widest uppercase text-white glow-text-gold">ECP</span>
              <span className="text-xs text-emerald-400 font-bold ml-2 uppercase tracking-wider">Digital Portal</span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <a href="#how-it-works" className="hidden md:block text-sm font-semibold text-emerald-300/80 hover:text-white transition-colors px-3 py-1">How It Works</a>
            <a href="#portals" className="hidden md:block text-sm font-semibold text-emerald-300/80 hover:text-white transition-colors px-3 py-1">Portals</a>
            <a href="#security" className="hidden md:block text-sm font-semibold text-emerald-300/80 hover:text-white transition-colors px-3 py-1">Security</a>
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline-block text-xxs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/25 px-3 py-2 rounded-xl truncate max-w-[150px]">
                  👤 {user?.name || user?.email}
                </span>
                <button onClick={() => navigate('/login')}
                  className="btn-primary text-xs px-4 py-2 font-black uppercase tracking-wider">
                  Dashboard →
                </button>
                <button onClick={handleLogout}
                  className="px-3 py-2 bg-red-950/40 hover:bg-red-900 border border-red-500/20 hover:border-red-500/50 text-red-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all">
                  Exit
                </button>
              </div>
            ) : (
              <button onClick={() => navigate('/login')}
                className="btn-primary text-sm px-5 py-2.5">
                Sign In →
              </button>
            )}
          </motion.div>
        </div>
      </nav>

      {/* ───────────── HERO ───────────── */}
      <section className="relative z-10 min-h-[92vh] flex flex-col items-center justify-center pt-12 pb-20 px-6 text-center">
        {/* Floating 3D icons */}
        <motion.div animate={{ y: [0, -25, 0], rotate: [0, 8, 0] }} transition={{ duration: 9, repeat: Infinity }}
          className="absolute top-[18%] right-[8%] text-emerald-700/30 hidden lg:block pointer-events-none">
          <Vote size={130} />
        </motion.div>
        <motion.div animate={{ y: [0, 30, 0], rotate: [0, -12, 0] }} transition={{ duration: 11, delay: 2, repeat: Infinity }}
          className="absolute bottom-[20%] left-[6%] text-yellow-600/15 hidden lg:block pointer-events-none">
          <ShieldCheck size={160} />
        </motion.div>
        <motion.div animate={{ y: [0, -18, 0] }} transition={{ duration: 7, delay: 1, repeat: Infinity }}
          className="absolute top-[30%] left-[12%] text-blue-700/20 hidden lg:block pointer-events-none">
          <Landmark size={80} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-emerald-900/60 border border-emerald-500/25 text-emerald-300 text-xs font-black mb-8 backdrop-blur-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500" />
          </span>
          GENERAL ELECTIONS 2026 — PORTAL LIVE
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight leading-[1.05]">
          Pakistan's Official<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500">
            Digital Election
          </span><br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-emerald-500">
            Commission
          </span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
          className="text-lg md:text-xl text-emerald-200/75 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
          Secure, transparent, and real-time digital voting powered by the Election Commission of Pakistan.
          Your voice. Your ballot. Your Pakistan.
        </motion.p>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 mb-16">
          {isAuthenticated ? (
            <button onClick={() => navigate('/login')}
              className="group relative px-9 py-4 bg-gradient-to-r from-yellow-500 to-yellow-400 text-emerald-950 font-black rounded-2xl shadow-[0_0_25px_rgba(251,191,36,0.45)] hover:shadow-[0_0_40px_rgba(251,191,36,0.65)] transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden text-base">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative">Go to Dashboard</span>
              <ChevronRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button onClick={() => navigate('/login')}
              className="group relative px-9 py-4 bg-gradient-to-r from-yellow-500 to-yellow-400 text-emerald-950 font-black rounded-2xl shadow-[0_0_25px_rgba(251,191,36,0.4)] hover:shadow-[0_0_40px_rgba(251,191,36,0.65)] transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden text-base">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative">Cast Your Vote</span>
              <ChevronRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" />
            </button>
          )}
          <a href="#how-it-works"
            className="px-9 py-4 bg-emerald-900/50 text-emerald-50 font-bold rounded-2xl border border-emerald-500/30 hover:bg-emerald-800/60 transition-all active:scale-95 flex items-center justify-center gap-3 backdrop-blur-md text-base">
            <Activity className="w-5 h-5 text-emerald-400" />
            How It Works
          </a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-1 text-emerald-400/50 cursor-pointer" onClick={() => document.getElementById('stats')?.scrollIntoView({ behavior: 'smooth' })}>
          <span className="text-[10px] font-bold uppercase tracking-widest">Scroll</span>
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </section>

      {/* ───────────── STATS STRIP ───────────── */}
      <section id="stats" className="relative z-10 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass-panel rounded-3xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <Section key={s.label} delay={i * 0.1} className="text-center">
                <div className={`text-4xl md:text-5xl font-black mb-2 ${s.color}`}>{s.value}</div>
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-200/60 uppercase tracking-widest">
                  <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                  {s.label}
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── HOW IT WORKS ───────────── */}
      <section id="how-it-works" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Section className="text-center mb-16">
            <SectionLabel>Process</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">How ECP Digital Voting Works</h2>
            <p className="text-emerald-200/65 text-lg max-w-xl mx-auto">Four simple steps to exercise your democratic right — securely and transparently.</p>
          </Section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <Section key={s.step} delay={i * 0.12} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(100%_-_12px)] w-6 z-10">
                    <ArrowRight className="h-5 w-5 text-emerald-500/40" />
                  </div>
                )}
                <div className="glass-card p-6 h-full hover:border-emerald-500/30 group">
                  <div className="text-5xl font-black text-emerald-500/20 mb-3 group-hover:text-emerald-500/35 transition-colors">{s.step}</div>
                  <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <s.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-black text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-emerald-200/65 leading-relaxed">{s.desc}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── PORTAL CARDS ───────────── */}
      <section id="portals" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Section className="text-center mb-16">
            <SectionLabel>Who Uses ECP Portal</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Dedicated Portals for Every Role</h2>
            <p className="text-emerald-200/65 text-lg max-w-xl mx-auto">Three distinct secure portals, each tailored for a specific electoral role.</p>
          </Section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {PORTALS.map((p, i) => (
              <Section key={p.role} delay={i * 0.13}>
                <motion.div whileHover={{ y: -8, scale: 1.02 }}
                  className={`glass-panel rounded-3xl overflow-hidden group cursor-pointer border ${p.border} h-full flex flex-col`}
                  onClick={() => navigate('/login')}
                  style={{ boxShadow: `0 0 0 0 ${p.glow}`, transition: 'box-shadow 0.4s ease' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 35px ${p.glow}`}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 0 0 transparent'}
                >
                  <div className={`p-6 pb-0`}>
                    <div className={`h-14 w-14 rounded-2xl ${p.bg} border ${p.border} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                      <p.icon className="h-7 w-7 text-white" />
                    </div>
                    <div className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 bg-gradient-to-r ${p.color} text-emerald-950`}>
                      {p.role}
                    </div>
                    <h3 className="text-xl font-black text-white mb-3 group-hover:text-yellow-300 transition-colors">{p.role} Portal</h3>
                    <p className="text-sm text-emerald-200/65 leading-relaxed mb-5">{p.desc}</p>
                  </div>
                  <div className="px-6 pb-6 mt-auto">
                    <ul className="space-y-2 mb-5">
                      {p.features.map(f => (
                        <li key={f} className="flex items-center gap-2.5 text-xs text-emerald-200/75 font-semibold">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full py-2.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2">
                      Access Portal <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── FEATURES GRID ───────────── */}
      <section id="security" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Section className="text-center mb-16">
            <SectionLabel>Why ECP Portal</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Built for Security & Scale</h2>
            <p className="text-emerald-200/65 text-lg max-w-xl mx-auto">Every feature engineered to serve 130 million voters with zero compromise.</p>
          </Section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const colorMap = {
                emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
                purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                pink: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
                orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
              }[f.color];
              return (
                <Section key={f.title} delay={i * 0.08}>
                  <motion.div whileHover={{ y: -5 }} className="glass-card p-6 group h-full">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 border ${colorMap} group-hover:scale-110 transition-transform`}>
                      <f.icon className={`h-6 w-6 ${colorMap.split(' ')[0]}`} />
                    </div>
                    <h3 className="text-base font-black text-white mb-2">{f.title}</h3>
                    <p className="text-sm text-emerald-200/65 leading-relaxed">{f.desc}</p>
                  </motion.div>
                </Section>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────── ELECTION TIMELINE ───────────── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <Section className="text-center mb-16">
            <SectionLabel>Schedule</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">General Election 2026 Timeline</h2>
            <p className="text-emerald-200/65 text-lg">Key milestones and deadlines in Pakistan's democratic process.</p>
          </Section>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/50 via-yellow-500/30 to-transparent" />
            <div className="space-y-8">
              {TIMELINE.map((t, i) => (
                <Section key={i} delay={i * 0.1} className={`relative flex gap-6 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center`}>
                  {/* Dot */}
                  <div className={`absolute left-6 md:left-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 z-10 ${t.status === 'done' ? 'bg-emerald-400 border-emerald-300' : t.status === 'active' ? 'bg-yellow-400 border-yellow-300 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.7)]' : 'bg-emerald-950 border-emerald-700'}`} />
                  <div className="pl-14 md:pl-0 md:w-[calc(50%-2rem)]">
                    <div className="glass-card p-5">
                      <div className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${t.status === 'done' ? 'text-emerald-400' : t.status === 'active' ? 'text-yellow-400' : 'text-emerald-600'}`}>
                        {t.status === 'done' ? '✓ Completed' : t.status === 'active' ? '⚡ In Progress' : '⏳ Upcoming'} — {t.date}
                      </div>
                      <h4 className="text-base font-black text-white">{t.event}</h4>
                    </div>
                  </div>
                  <div className="hidden md:block md:w-[calc(50%-2rem)]" />
                </Section>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── CTA STRIP ───────────── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <Section>
            <div className="glass-panel rounded-3xl p-10 md:p-16 text-center relative overflow-hidden border border-yellow-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute top-6 right-6 opacity-10">
                <Award className="h-20 w-20 text-yellow-400" />
              </motion.div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-xs font-black uppercase tracking-widest mb-6">
                  <Star className="h-3.5 w-3.5" /> Your Vote Matters
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                  Ready to Shape<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Pakistan's Future?</span>
                </h2>
                <p className="text-emerald-200/70 text-lg mb-10 max-w-xl mx-auto">
                  Log in with your CNIC and cast your ballot securely. The future of Pakistan is in your hands.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {isAuthenticated ? (
                    <button onClick={() => navigate('/login')}
                      className="group relative px-10 py-4 bg-gradient-to-r from-yellow-500 to-yellow-400 text-emerald-950 font-black rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.45)] hover:shadow-[0_0_50px_rgba(251,191,36,0.7)] transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden text-base">
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                      <span className="relative">Go to Dashboard</span>
                      <ChevronRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <button onClick={() => navigate('/login')}
                      className="group relative px-10 py-4 bg-gradient-to-r from-yellow-500 to-yellow-400 text-emerald-950 font-black rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.45)] hover:shadow-[0_0_50px_rgba(251,191,36,0.7)] transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden text-base">
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                      <span className="relative">Access ECP Portal</span>
                      <ChevronRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ───────────── FOOTER ───────────── */}
      <footer className="relative z-10 border-t border-emerald-500/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-900/60 p-2 rounded-lg border border-emerald-500/20">
              <Landmark className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="font-black text-white text-sm uppercase tracking-wider">Election Commission of Pakistan</p>
              <p className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-widest">Niazamuddin Road, Islamabad</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-emerald-400/60 font-semibold uppercase tracking-wider">
            <span>© 2026 ECP Digital Portal</span>
            <span className="hidden md:block">•</span>
            <span className="hidden md:block">All elections governed by the Elections Act 2017</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <div className="dot-active" />
            <span className="text-emerald-400">Systems Operational</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
