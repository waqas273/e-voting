import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../services/firebase.js';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

/**
 * ChangePasswordModal
 * Props:
 *   onClose - function to close the modal
 *   role    - 'voter' | 'party' | 'independent' | 'admin'
 */
const ChangePasswordModal = ({ onClose, role, isFirstTime = false }) => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [isSaving, setIsSaving]               = useState(false);

  const strength = (() => {
    if (!newPassword) return 0;
    let s = 0;
    if (newPassword.length >= 8) s++;
    if (/[A-Z]/.test(newPassword)) s++;
    if (/[0-9]/.test(newPassword)) s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    return s;
  })();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-emerald-500'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('❌ New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('❌ Password must be at least 6 characters');
      return;
    }

    setIsSaving(true);
    try {
      if (role === 'admin') {
        // Admin uses Firebase Auth — re-authenticate then update
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
        toast.success('✅ Admin password updated via Firebase Auth!');

      } else if (role === 'voter') {
        const voterRef = doc(db, 'voters', user.id);
        if (!isFirstTime) {
          // Verify current password against Firestore
          const { getDoc } = await import('firebase/firestore');
          const snap = await getDoc(voterRef);
          const data = snap.data();
          const expected = data.password || data.cnic; // default is CNIC
          if (currentPassword !== expected) {
            toast.error('❌ Current password is incorrect');
            setIsSaving(false);
            return;
          }
        }
        await updateDoc(voterRef, { password: newPassword });
        toast.success('✅ Password updated successfully!');

      } else if (role === 'party') {
        // Verify current password in parties collection
        const q = query(collection(db, 'parties'), where('managerEmail', '==', user.email));
        const snap = await getDocs(q);
        if (snap.empty) throw new Error('Party record not found');
        const partyDoc = snap.docs[0];
        if (currentPassword !== partyDoc.data().password) {
          toast.error('❌ Current password is incorrect');
          setIsSaving(false);
          return;
        }
        await updateDoc(doc(db, 'parties', partyDoc.id), { password: newPassword });
        toast.success('✅ Party manager password updated!');

      } else if (role === 'independent') {
        // Verify current password in candidates collection
        const candRef = doc(db, 'candidates', user.id);
        const { getDoc } = await import('firebase/firestore');
        const snap = await getDoc(candRef);
        if (currentPassword !== snap.data()?.password) {
          toast.error('❌ Current password is incorrect');
          setIsSaving(false);
          return;
        }
        await updateDoc(candRef, { password: newPassword });
        toast.success('✅ Candidate password updated!');
      }

      // Reset fields and close
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      console.error('Password change error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error('❌ Current password is incorrect');
      } else {
        toast.error('❌ Failed to update password: ' + err.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={isFirstTime ? undefined : onClose}
      />

      {/* Modal Panel */}
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: 'rgba(2,10,6,0.97)',
          border: '1px solid rgba(16,185,129,0.2)',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9), 0 0 0 1px rgba(16,185,129,0.05)',
        }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-emerald-500" />

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(16,185,129,0.1)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <Lock className="h-4.5 w-4.5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">{isFirstTime ? 'Set Your Password' : 'Change Password'}</h2>
              <p className="text-[10px]" style={{ color: 'rgba(52,211,153,0.5)' }}>
                {isFirstTime ? 'First-time setup: secure your account' : 'Update your ECP portal credentials'}
              </p>
            </div>
          </div>
          {!isFirstTime && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(4,20,13,0.6)', border: '1px solid rgba(16,185,129,0.1)', color: 'rgba(52,211,153,0.6)' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Security notice */}
          <div
            className="flex items-start gap-2.5 p-3 rounded-xl text-xs"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}
          >
            <Shield className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p style={{ color: 'rgba(251,191,36,0.8)' }}>
              {isFirstTime
                ? 'Please choose a secure, memorable password. Next time, you must log in using this password instead of your CNIC.'
                : role === 'voter'
                ? 'Default password is your CNIC. Please set a strong password after first login.'
                : role === 'independent'
                ? 'Your current password is the ECP-issued temporary password from your approval email.'
                : 'Enter your current password to verify your identity before making changes.'}
            </p>
          </div>

          {/* Current Password */}
          {!isFirstTime && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(52,211,153,0.7)' }}>
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'rgba(52,211,153,0.4)' }} />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="w-full pl-10 pr-10 py-3 text-sm text-white rounded-xl outline-none transition-all"
                  style={{
                    background: 'rgba(4,20,13,0.7)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    caretColor: '#34d399',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(16,185,129,0.2)'}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(52,211,153,0.4)' }}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(52,211,153,0.7)' }}>
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'rgba(52,211,153,0.4)' }} />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                placeholder="Enter new password (min 6 chars)"
                className="w-full pl-10 pr-10 py-3 text-sm text-white rounded-xl outline-none transition-all"
                style={{
                  background: 'rgba(4,20,13,0.7)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  caretColor: '#34d399',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(16,185,129,0.2)'}
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(52,211,153,0.4)' }}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Strength meter */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-emerald-900/60'}`}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-bold" style={{ color: 'rgba(52,211,153,0.6)' }}>
                  Strength: <span className="text-white">{strengthLabel}</span>
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(52,211,153,0.7)' }}>
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'rgba(52,211,153,0.4)' }} />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat new password"
                className="w-full pl-10 pr-10 py-3 text-sm text-white rounded-xl outline-none transition-all"
                style={{
                  background: 'rgba(4,20,13,0.7)',
                  border: confirmPassword
                    ? confirmPassword === newPassword
                      ? '1px solid rgba(52,211,153,0.5)'
                      : '1px solid rgba(239,68,68,0.5)'
                    : '1px solid rgba(16,185,129,0.2)',
                  caretColor: '#34d399',
                }}
                onFocus={e => {
                  if (!confirmPassword) e.target.style.borderColor = 'rgba(52,211,153,0.5)';
                }}
                onBlur={e => {
                  if (!confirmPassword) e.target.style.borderColor = 'rgba(16,185,129,0.2)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(52,211,153,0.4)' }}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && (
              <p className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${confirmPassword === newPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                {confirmPassword === newPassword
                  ? <><CheckCircle className="h-3 w-3" /> Passwords match</>
                  : <><AlertCircle className="h-3 w-3" /> Passwords do not match</>
                }
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {!isFirstTime && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: 'rgba(4,20,13,0.6)',
                  border: '1px solid rgba(16,185,129,0.15)',
                  color: 'rgba(52,211,153,0.7)',
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className={`${isFirstTime ? 'w-full' : 'flex-1'} py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2`}
              style={{
                background: isSaving ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(5,150,105,0.9))',
                border: '1px solid rgba(16,185,129,0.4)',
                color: 'white',
                boxShadow: isSaving ? 'none' : '0 4px 15px -5px rgba(16,185,129,0.4)',
              }}
            >
              {isSaving ? (
                <><LoadingSpinner size="sm" /> {isFirstTime ? 'Setting Password...' : 'Updating...'}</>
              ) : (
                <><Lock className="h-4 w-4" /> {isFirstTime ? 'Set Password & Continue' : 'Update Password'}</>
              )}
            </button>
          </div>
        </form>

        {/* Footer note */}
        <div
          className="px-6 py-3 text-center text-[10px]"
          style={{ borderTop: '1px solid rgba(16,185,129,0.07)', color: 'rgba(52,211,153,0.3)' }}
        >
          <Shield className="h-3 w-3 inline mr-1" />
          ECP Security Protocol • Password encrypted in transit
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
