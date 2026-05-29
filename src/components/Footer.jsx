import React, { useState } from "react";
import { Landmark, Shield, HelpCircle, X, FileText, ChevronRight, AlertCircle, Users, Vote, Lock, Eye, Server, Mail, Phone, CheckCircle } from "lucide-react";

/* ─── Modal Base ─── */
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in"
        style={{
          background: 'rgba(2, 10, 5, 0.98)',
          border: '1px solid rgba(16,185,129,0.18)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -20px 80px -10px rgba(0,0,0,0.9)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Desktop: rounded everywhere */}
        <style>{`@media (min-width: 640px) { .modal-inner { border-radius: 20px !important; } }`}</style>
        <div className="modal-inner" style={{ borderRadius: '20px 20px 0 0' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

/* ─── Section Block ─── */
const Section = ({ icon: Icon, title, children, color = '#fbbf24' }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 flex-shrink-0" style={{ color }} />
      <h3 className="text-sm font-black text-white">{title}</h3>
    </div>
    <div className="pl-6 text-xs leading-relaxed space-y-1.5" style={{ color: 'rgba(180,210,195,0.75)' }}>
      {children}
    </div>
  </div>
);

/* ─── Help Modal Content ─── */
const HelpModal = ({ onClose }) => (
  <>
    {/* Header */}
    <div
      className="sticky top-0 flex items-center justify-between px-5 py-4 z-10"
      style={{
        background: 'rgba(2,10,5,0.97)',
        borderBottom: '1px solid rgba(16,185,129,0.1)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <HelpCircle className="h-4.5 w-4.5 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-base font-black text-white">ECP Help Center</h2>
          <p className="text-[10px]" style={{ color: 'rgba(52,211,153,0.5)' }}>Election Commission of Pakistan — Digital Voting Guide</p>
        </div>
      </div>
      <button onClick={onClose} className="p-1.5 rounded-lg transition-all" style={{ background: 'rgba(4,20,13,0.6)', border: '1px solid rgba(16,185,129,0.12)', color: 'rgba(52,211,153,0.6)' }}>
        <X className="h-4 w-4" />
      </button>
    </div>

    {/* Body */}
    <div className="p-5 space-y-6">

      {/* Quick Steps */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
        <p className="text-xs font-black text-yellow-400 uppercase tracking-widest">Quick Start — How to Vote</p>
        {[
          { step: '01', label: 'Login with your CNIC number and assigned password' },
          { step: '02', label: 'View your assigned NA & PA constituencies on the Dashboard' },
          { step: '03', label: 'When polling is Live, click "Cast MNA Ballot" for National Assembly' },
          { step: '04', label: 'Select your preferred candidate from the approved ballot list' },
          { step: '05', label: 'Confirm your selection — your ballot is permanently recorded' },
          { step: '06', label: 'Repeat for your MPA (Provincial Assembly) ballot separately' },
          { step: '07', label: 'Check your receipts under "My Receipts" for both transactions' },
        ].map(s => (
          <div key={s.step} className="flex items-start gap-3">
            <span className="text-[10px] font-black rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>{s.step}</span>
            <p className="text-xs" style={{ color: 'rgba(180,210,195,0.8)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <Section icon={Users} title="Who Can Vote?">
        <p>Only citizens registered by the Election Commission of Pakistan (ECP) in the national voter registry (NADRA-verified) are eligible to cast ballots.</p>
        <p>Each registered voter is assigned to exactly one <strong className="text-white">National Assembly (NA)</strong> constituency and one <strong className="text-white">Provincial Assembly (PA)</strong> constituency based on their domicile address.</p>
        <p>You may cast a maximum of <strong className="text-white">2 ballots</strong> per general election — one MNA and one MPA.</p>
      </Section>

      <Section icon={Vote} title="Ballot Types — MNA vs MPA">
        <p><strong className="text-emerald-300">Green Ballot (MNA):</strong> Used to elect your Member of National Assembly. This seat represents you in the Federal Parliament (Majlis-e-Shoora) in Islamabad.</p>
        <p><strong className="text-white">White Ballot (MPA):</strong> Used to elect your Member of Provincial Assembly. This seat represents you in your province's legislative assembly (Punjab, Sindh, KPK, Balochistan).</p>
        <p>Both ballots are independent — you may vote for candidates from different parties on each ballot.</p>
      </Section>

      <Section icon={Landmark} title="Candidates & Parties">
        <p>Only <strong className="text-white">ECP-approved</strong> candidates appear on your ballot. Parties must first register with ECP, and each candidate nomination must pass an ECP verification review.</p>
        <p><strong className="text-white">Independent candidates</strong> who have passed ECP screening may also appear on the ballot without a party affiliation.</p>
        <p>You cannot vote for a candidate outside your assigned constituency — the ballot only shows candidates registered for your specific Halka (constituency).</p>
      </Section>

      <Section icon={CheckCircle} title="After Voting — Receipts">
        <p>After each ballot is cast, ECP generates a <strong className="text-white">unique Receipt ID</strong> (format: ECP-XXXXXXXXX) for your transaction. This is your proof of vote participation.</p>
        <p>You can view all your ballot receipts at any time from <strong className="text-white">My Receipts</strong> in the navigation bar. Receipts show the election, constituency, candidate you voted for, and timestamp.</p>
        <p>Note: Receipts confirm <em>participation</em>, not the direction of your vote — ballot secrecy is maintained in ECP's encrypted registry.</p>
      </Section>

      <Section icon={AlertCircle} title="Common Issues" color="#f87171">
        <p><strong className="text-white">Polling Booth shows "Closed":</strong> No active election at this time. ECP will notify you when polling opens via the mail notification system.</p>
        <p><strong className="text-white">"Already voted" warning:</strong> Each ballot can only be cast once per election. If you see this, your vote has already been counted — check Receipts to verify.</p>
        <p><strong className="text-white">No candidates showing:</strong> ECP may not have approved candidates for your constituency yet. Contact your party manager or ECP helpdesk.</p>
        <p><strong className="text-white">Cannot login:</strong> Ensure your CNIC format is correct (XXXXX-XXXXXXX-X with dashes). Contact ECP office if your voter profile is not found.</p>
      </Section>

      <Section icon={Phone} title="ECP Contact & Support">
        <p><strong className="text-white">ECP National Helpline:</strong> 051-9204462</p>
        <p><strong className="text-white">Email:</strong> info@ecp.gov.pk</p>
        <p><strong className="text-white">Address:</strong> Election Commission of Pakistan, Sector F-5/1, Islamabad — 44000</p>
        <p><strong className="text-white">Portal Support Email:</strong> evoting8080@gmail.com</p>
        <p>Office hours: Monday – Friday, 9:00 AM – 5:00 PM (PKT)</p>
      </Section>

    </div>

    {/* Footer */}
    <div className="px-5 py-3 text-center text-[10px]" style={{ borderTop: '1px solid rgba(16,185,129,0.08)', color: 'rgba(52,211,153,0.3)' }}>
      ECP Help Center v2026 • Election Commission of Pakistan
    </div>
  </>
);

/* ─── Privacy Policy Modal Content ─── */
const PrivacyModal = ({ onClose }) => (
  <>
    {/* Header */}
    <div
      className="sticky top-0 flex items-center justify-between px-5 py-4 z-10"
      style={{
        background: 'rgba(2,10,5,0.97)',
        borderBottom: '1px solid rgba(16,185,129,0.1)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <FileText className="h-4.5 w-4.5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-base font-black text-white">Privacy Policy</h2>
          <p className="text-[10px]" style={{ color: 'rgba(52,211,153,0.5)' }}>ECP Digital Voting Portal • Effective 2026</p>
        </div>
      </div>
      <button onClick={onClose} className="p-1.5 rounded-lg transition-all" style={{ background: 'rgba(4,20,13,0.6)', border: '1px solid rgba(16,185,129,0.12)', color: 'rgba(52,211,153,0.6)' }}>
        <X className="h-4 w-4" />
      </button>
    </div>

    {/* Body */}
    <div className="p-5 space-y-6">

      {/* Intro */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)' }}>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(180,210,195,0.75)' }}>
          The Election Commission of Pakistan (ECP) is committed to protecting the privacy, confidentiality, and security of all citizens using the ECP Digital Voting Portal. This Privacy Policy outlines what data we collect, how it is used, and the rights you have as a registered voter. By using this portal, you agree to the terms described herein.
        </p>
      </div>

      <Section icon={Eye} title="1. Information We Collect">
        <p><strong className="text-white">Identity Data:</strong> Your full legal name, CNIC number, date of birth, and domicile address as registered with NADRA. This data is pre-loaded from ECP's national voter registry — you do not submit it directly.</p>
        <p><strong className="text-white">Authentication Data:</strong> Encrypted login credentials (password hash). Passwords are never stored in plain text and are protected using industry-standard cryptographic hashing.</p>
        <p><strong className="text-white">Voting Activity Data:</strong> Timestamped records of ballot participation (whether you voted — not who you voted for), constituency assignments, and generated Receipt IDs.</p>
        <p><strong className="text-white">Session Data:</strong> Temporary session tokens used to authenticate your browser session. These expire upon logout.</p>
      </Section>

      <Section icon={Lock} title="2. Ballot Secrecy & Data Separation">
        <p>ECP maintains strict <strong className="text-white">ballot secrecy</strong> as guaranteed under the Elections Act 2017. The identity of a voter and their specific vote choice are stored in separate, cryptographically isolated records.</p>
        <p>Your <strong className="text-white">Receipt ID</strong> confirms that your ballot was recorded, but cannot be used to determine which candidate you voted for — even by ECP staff.</p>
        <p>Vote tallies are aggregated at the candidate level and are never linked back to individual voter identities in any report or data export.</p>
        <p>ECP employees and portal administrators are <strong className="text-white">prohibited by law</strong> from accessing individual vote choices under the Elections Act Section 93.</p>
      </Section>

      <Section icon={Server} title="3. How We Use Your Data">
        <p><strong className="text-white">Voter Verification:</strong> Your CNIC and name are used to confirm your identity and ensure only eligible citizens cast ballots.</p>
        <p><strong className="text-white">Constituency Assignment:</strong> Your domicile data is used to assign you to the correct NA and PA Halka (constituency) under the Delimitation Order.</p>
        <p><strong className="text-white">Duplicate Vote Prevention:</strong> Vote participation flags are used to prevent a single voter from casting more than one ballot per seat type per election.</p>
        <p><strong className="text-white">Receipt Generation:</strong> Your email address (if provided) is used to send official ballot receipts. This is strictly a one-way notification — ECP does not use it for marketing.</p>
        <p><strong className="text-white">Audit Trail:</strong> Transaction logs are maintained for legal compliance and may be reviewed by Election Tribunals in case of a contested result.</p>
      </Section>

      <Section icon={Shield} title="4. Data Security">
        <p>All data is stored on <strong className="text-white">Google Firebase Firestore</strong> — a SOC 2 Type II certified cloud platform with AES-256 encryption at rest and TLS 1.3 encryption in transit.</p>
        <p>Access to voter data is governed by <strong className="text-white">Firebase Security Rules</strong> — voters can only read their own profile data. Administrators have read-only access to aggregated statistics.</p>
        <p>Vote transactions are performed as <strong className="text-white">atomic Firestore transactions</strong>, ensuring that partial writes never corrupt the vote count.</p>
        <p>All Firebase project credentials are restricted to the ECP portal domain only and cannot be used from unauthorized third-party applications.</p>
      </Section>

      <Section icon={Users} title="5. Data Sharing & Third Parties">
        <p>ECP does <strong className="text-white">not sell, rent, or trade</strong> any voter data to third parties under any circumstances.</p>
        <p>Data may be shared with <strong className="text-white">Election Tribunals, the Supreme Court of Pakistan, or NADRA</strong> strictly when required by a lawful court order or statutory obligation.</p>
        <p>Firebase (Google Cloud) processes data as a <strong className="text-white">data processor</strong> on behalf of ECP under Google's Data Processing Addendum, which complies with international data protection standards.</p>
        <p>Party Managers can only view aggregate vote counts for their approved candidates — they cannot access individual voter identities or ballot choices.</p>
      </Section>

      <Section icon={FileText} title="6. Data Retention">
        <p>Voter registration records are retained for <strong className="text-white">10 years</strong> after the relevant election in compliance with the Elections Act 2017.</p>
        <p>Vote transaction logs are retained for <strong className="text-white">5 years</strong> to support potential Election Tribunal proceedings.</p>
        <p>Session tokens and temporary authentication data are <strong className="text-white">deleted immediately upon logout</strong> or session expiry (whichever occurs first).</p>
        <p>Upon written request to ECP, voters may request a copy of their personal data held in the registry, excluding any information that would compromise ballot secrecy.</p>
      </Section>

      <Section icon={AlertCircle} title="7. Your Rights" color="#34d399">
        <p><strong className="text-white">Right to Access:</strong> You may request a summary of your personal data held by ECP by contacting info@ecp.gov.pk with your CNIC number.</p>
        <p><strong className="text-white">Right to Correction:</strong> If your name or address is incorrect in our records, corrections must be made through NADRA and will be reflected in the next voter roll update.</p>
        <p><strong className="text-white">Right to Ballot Secrecy:</strong> Absolute — ECP is legally prohibited from disclosing your vote choice under any circumstances, including in response to court orders (per Elections Act S.93).</p>
        <p><strong className="text-white">Right to Complaint:</strong> If you believe your data has been mishandled, you may lodge a formal complaint with the Pakistan Telecommunication Authority (PTA) or ECP's internal oversight committee.</p>
      </Section>

      <Section icon={Mail} title="8. Contact & Policy Updates">
        <p>This Privacy Policy is reviewed and updated prior to each General Election. Any material changes will be communicated via the ECP official website (www.ecp.gov.pk) at least 30 days before taking effect.</p>
        <p><strong className="text-white">Privacy Officer:</strong> Director General (IT), Election Commission of Pakistan</p>
        <p><strong className="text-white">Address:</strong> Sector F-5/1, Islamabad — 44000, Pakistan</p>
        <p><strong className="text-white">Email:</strong> privacy@ecp.gov.pk</p>
        <p><strong className="text-white">Last Updated:</strong> January 2026</p>
      </Section>

    </div>

    {/* Footer */}
    <div className="px-5 py-3 text-center text-[10px]" style={{ borderTop: '1px solid rgba(16,185,129,0.08)', color: 'rgba(52,211,153,0.3)' }}>
      ECP Privacy Policy • Elections Act 2017 Compliant • Government of Pakistan
    </div>
  </>
);


/* ═══════════════════════════════════════════
   MAIN FOOTER COMPONENT
═══════════════════════════════════════════ */
const Footer = () => {
  const year = new Date().getFullYear();
  const [showHelp, setShowHelp] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <>
      <footer
        className="font-sans mt-auto"
        style={{
          background: 'rgba(1, 6, 3, 0.97)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(16, 185, 129, 0.10)',
        }}
      >
        {/* Gradient accent top line */}
        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.25), rgba(251,191,36,0.2), rgba(16,185,129,0.25), transparent)' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-5">

            {/* ─── Brand ─── */}
            <div className="flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)' }}
              >
                <Landmark className="h-4.5 w-4.5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-none">ECP Portal</p>
                <p className="text-[10px] mt-0.5 font-bold uppercase tracking-widest" style={{ color: 'rgba(52,211,153,0.45)' }}>
                  Govt. of Pakistan
                </p>
              </div>
            </div>

            {/* ─── Nav Links: Help + Privacy ─── */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200"
                style={{
                  background: 'rgba(251,191,36,0.07)',
                  border: '1px solid rgba(251,191,36,0.18)',
                  color: 'rgba(251,191,36,0.7)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.14)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.35)'; e.currentTarget.style.color = '#fbbf24'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.07)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.18)'; e.currentTarget.style.color = 'rgba(251,191,36,0.7)'; }}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Help Center
                <ChevronRight className="h-3 w-3 opacity-50" />
              </button>

              <button
                onClick={() => setShowPrivacy(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200"
                style={{
                  background: 'rgba(16,185,129,0.07)',
                  border: '1px solid rgba(16,185,129,0.18)',
                  color: 'rgba(52,211,153,0.7)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.14)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.35)'; e.currentTarget.style.color = '#34d399'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.07)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.18)'; e.currentTarget.style.color = 'rgba(52,211,153,0.7)'; }}
              >
                <FileText className="h-3.5 w-3.5" />
                Privacy Policy
                <ChevronRight className="h-3 w-3 opacity-50" />
              </button>
            </div>

            {/* ─── Developer Credit ─── */}
            <div className="text-center md:text-right">
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(52,211,153,0.35)' }}>
                Developed by
              </p>
              <p className="text-sm font-black text-white mt-0.5">Muhammad Waqas</p>
            </div>
          </div>

          {/* ─── Bottom Strip ─── */}
          <div
            className="mt-5 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2"
            style={{ borderTop: '1px solid rgba(16,185,129,0.07)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(52,211,153,0.3)' }}>
              © {year} Election Commission of Pakistan (ECP). All rights reserved.
            </p>
            <div className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(52,211,153,0.3)' }}>
              <Shield className="h-3 w-3" />
              <span>Secure Digital Voting Platform</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── Help Modal ─── */}
      <Modal isOpen={showHelp} onClose={() => setShowHelp(false)}>
        <HelpModal onClose={() => setShowHelp(false)} />
      </Modal>

      {/* ─── Privacy Policy Modal ─── */}
      <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)}>
        <PrivacyModal onClose={() => setShowPrivacy(false)} />
      </Modal>
    </>
  );
};

export default Footer;
