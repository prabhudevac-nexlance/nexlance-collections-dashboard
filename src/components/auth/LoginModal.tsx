import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const {
    currentUser,
    users,
    isAuthenticated,
    isTotpVerified,
    mustChangePassword,
    login,
    verifyTotp,
    completePasswordReset,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [step, setStep] = useState<'PASSWORD' | 'CHANGE_PASS' | 'TOTP'>(() => {
    if (!isAuthenticated) return 'PASSWORD';
    if (mustChangePassword) return 'CHANGE_PASS';
    if (!isTotpVerified) return 'TOTP';
    return 'PASSWORD';
  });

  if (isAuthenticated && isTotpVerified && !mustChangePassword) {
    return null;
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = login(email || currentUser.email, password || 'password123');
    if (!res.success) {
      setError(res.message);
      return;
    }

    if (res.needPasswordReset) {
      setStep('CHANGE_PASS');
    } else if (res.needTotp) {
      setStep('TOTP');
    }
  };

  const handleTotpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const ok = verifyTotp(totpCode || '123456');
    if (!ok) {
      setError('Invalid 6-digit TOTP code. Try demo code "123456"');
      return;
    }
  };

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPass.length < 12) {
      setError('Password must be at least 12 characters as mandated by PRD Security Policy Section 6.');
      return;
    }

    if (newPass !== confirmPass) {
      setError('Passwords do not match.');
      return;
    }

    const ok = completePasswordReset(newPass);
    if (ok) {
      setStep('TOTP');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-white">
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 p-6 border-b border-slate-800 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 p-2 border border-slate-700/80 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <img src="./logo.png" alt="Nexlance Logo" className="w-full h-full object-contain drop-shadow" />
          </div>
          <h2 className="text-xl font-bold text-white">Nexlance Security Gateway</h2>
          <p className="text-xs text-slate-400 mt-1">
            Application-Owned Identity • Mandatory TOTP 2FA • Section 6 Auth
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 'PASSWORD' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select / Enter User ID Email</label>
                <select
                  value={email || currentUser.email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {users.map(u => (
                    <option key={u.agent_id} value={u.email}>
                      {u.name} ({u.role}) - {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password (e.g. password123)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-all shadow-md shadow-blue-600/30 flex items-center justify-center space-x-2"
              >
                <span>Authenticate Credentials</span>
              </button>

              <div className="text-[11px] text-slate-500 text-center pt-2">
                Tip: Select any pre-configured user above to test credentials and 2FA.
              </div>
            </form>
          )}

          {step === 'CHANGE_PASS' && (
            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-xs text-amber-300">
                <strong>First Login Detected:</strong> Forced password change required. Minimum 12 characters required.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">New Password (Min 12 Chars)</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Enter new 12+ char password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-all shadow-md shadow-emerald-600/30"
              >
                Save New Password & Continue
              </button>
            </form>
          )}

          {step === 'TOTP' && (
            <form onSubmit={handleTotpSubmit} className="space-y-4">
              <div className="text-center space-y-2">
                <div className="p-3 bg-blue-950/50 border border-blue-800/80 rounded-lg text-xs text-blue-300">
                  <KeyRound className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <strong>TOTP 2FA Required:</strong> Enter the 6-digit verification code from your Authenticator App.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 text-center">
                  6-Digit Authenticator Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-center text-xl tracking-widest font-mono text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-all shadow-md shadow-blue-600/30 flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify TOTP & Enter System</span>
              </button>

              <div className="text-[11px] text-slate-500 text-center pt-2">
                Demo Code: Type <strong>123456</strong> or any 6 digits to verify TOTP 2FA.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
