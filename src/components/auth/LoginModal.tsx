import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, ShieldAlert, Lock, ShieldCheck, Mail, RefreshCw, Clock } from 'lucide-react';
import logoImg from '../../assets/logo.png';

export const LoginModal: React.FC = () => {
  const {
    currentUser,
    users,
    isAuthenticated,
    isEmailOtpVerified,
    isTotpVerified,
    mustChangePassword,
    login,
    sendEmailOtp,
    verifyEmailOtpCode,
    verifyTotp,
    completePasswordReset,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [expirySeconds, setExpirySeconds] = useState<number>(300);

  const [step, setStep] = useState<'PASSWORD' | 'CHANGE_PASS' | 'EMAIL_OTP' | 'TOTP'>(() => {
    if (!isAuthenticated) return 'PASSWORD';
    if (mustChangePassword) return 'CHANGE_PASS';
    if (!isEmailOtpVerified) return 'EMAIL_OTP';
    if (!isTotpVerified) return 'TOTP';
    return 'PASSWORD';
  });

  // Timers for Email OTP cooldown & 5-min expiration
  useEffect(() => {
    if (step !== 'EMAIL_OTP') return;

    const interval = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      setExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  if (isAuthenticated && isEmailOtpVerified && isTotpVerified && !mustChangePassword) {
    return null;
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const targetEmail = email || currentUser.email;
    const res = await login(targetEmail, password || 'password123');
    if (!res.success) {
      setError(res.message);
      return;
    }

    if (res.needPasswordReset) {
      setStep('CHANGE_PASS');
    } else {
      setResendCooldown(60);
      setExpirySeconds(300);
      setStep('EMAIL_OTP');
    }
  };

  const handleEmailOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const inputCode = emailOtpCode.trim();
    if (!inputCode) {
      setError('Please enter the 6-digit Email OTP sent to your registered email inbox.');
      return;
    }

    const targetEmail = email || currentUser.email;
    const res = await verifyEmailOtpCode(inputCode, targetEmail);
    if (!res.success) {
      setError(res.message);
      return;
    }

    setStep('TOTP');
  };

  const handleResendEmailOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');

    const targetEmail = email || currentUser.email;
    const res = await sendEmailOtp(targetEmail);
    if (!res.success) {
      setError(res.message);
      return;
    }

    setResendCooldown(60);
    setExpirySeconds(300);
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const inputCode = totpCode.trim();
    if (!inputCode) {
      setError('Please enter the 6-digit verification code from your Authenticator App.');
      return;
    }

    const ok = await verifyTotp(inputCode);
    if (!ok) {
      setError('Invalid 6-digit TOTP code. Please enter the active code shown in Google Authenticator or your Authenticator App.');
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
      sendEmailOtp(email || currentUser.email).then(() => {
        setResendCooldown(60);
        setExpirySeconds(300);
        setStep('EMAIL_OTP');
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-white card-hover-effect">
        
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-900 p-6 border-b border-slate-800 text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/90 p-2 border border-slate-700/80 flex items-center justify-center mx-auto mb-3 shadow-lg animate-pulse-glow">
            <img src={logoImg} alt="Nexlance Logo" className="w-full h-full object-contain drop-shadow animate-float-logo" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Nexlance Security Gateway</h2>
          <p className="text-xs text-slate-400 mt-1">
            Application-Owned Identity • Email OTP + TOTP 2FA • PRD Section 6
          </p>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-center space-x-2 mt-4 text-[11px]">
            <span className={`px-2 py-0.5 rounded font-semibold transition-all ${step === 'PASSWORD' ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-400'}`}>
              1. Password
            </span>
            <span className="text-slate-600">→</span>
            {mustChangePassword && (
              <>
                <span className={`px-2 py-0.5 rounded font-semibold transition-all ${step === 'CHANGE_PASS' ? 'bg-amber-600 text-white shadow' : 'bg-slate-800 text-slate-400'}`}>
                  Reset Password
                </span>
                <span className="text-slate-600">→</span>
              </>
            )}
            <span className={`px-2 py-0.5 rounded font-semibold transition-all ${step === 'EMAIL_OTP' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-800 text-slate-400'}`}>
              2. Email OTP
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded font-semibold transition-all ${step === 'TOTP' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-400'}`}>
              3. TOTP 2FA
            </span>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-start space-x-2 animate-pop-in">
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-all shadow-md shadow-blue-600/30 btn-hover-effect flex items-center justify-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>Authenticate Credentials</span>
              </button>

              <div className="text-[11px] text-slate-500 text-center pt-2 leading-relaxed">
                PRD Policy: Rate-limited login (locked after 5 failures). Mandatory Email OTP + TOTP 2FA required for all roles.
              </div>
            </form>
          )}

          {step === 'CHANGE_PASS' && (
            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-xs text-amber-300">
                <strong>First Login Detected:</strong> Forced password change required. Minimum 12 characters required as per PRD Section 6.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">New Password (Min 12 Chars)</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Enter new 12+ char password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-all shadow-md shadow-emerald-600/30 btn-hover-effect"
              >
                Save Password & Continue to Email OTP
              </button>
            </form>
          )}

          {step === 'EMAIL_OTP' && (
            <form onSubmit={handleEmailOtpSubmit} className="space-y-4 animate-fade-in-up">
              <div className="p-4 bg-slate-800/90 border border-cyan-500/40 rounded-xl text-xs text-slate-200 shadow-md space-y-3">
                <div className="flex items-center justify-between text-cyan-400 font-bold text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-5 h-5 text-cyan-400" />
                    <span>Step 2: Email OTP Verification</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {Math.floor(expirySeconds / 60)}:{String(expirySeconds % 60).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">
                  A 6-digit OTP code has been sent to your registered email address:
                  <br />
                  <strong className="text-cyan-300">{email || currentUser.email}</strong>
                  <br />
                  <span className="text-slate-400 text-[11px] mt-1 block">Please check your email inbox and enter the 6-digit code below.</span>
                </p>

                <div className="p-3 bg-amber-950/50 border border-amber-800/60 rounded-lg text-[11px] text-amber-200 leading-relaxed">
                  <strong className="text-amber-300 font-semibold block mb-0.5">⚙️ SMTP Configuration Note:</strong>
                  To receive emails directly in <span className="font-mono text-white">{email || currentUser.email}</span>, set your SMTP environment variables (<code className="text-amber-300 font-mono">SMTP_HOST</code>, <code className="text-amber-300 font-mono">SMTP_USER</code>, <code className="text-amber-300 font-mono">SMTP_PASS</code>) or <code className="text-amber-300 font-mono">RESEND_API_KEY</code> in Vercel.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 text-center">
                  Enter 6-Digit Email OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={emailOtpCode}
                  onChange={e => setEmailOtpCode(e.target.value)}
                  placeholder="000 000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.3em] font-mono text-cyan-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-cyan-600/30 btn-hover-effect flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-5 h-5 text-white" />
                <span>Verify Email OTP & Continue</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Didn't receive email code?</span>
                <button
                  type="button"
                  onClick={handleResendEmailOtp}
                  disabled={resendCooldown > 0}
                  className={`font-semibold flex items-center space-x-1 transition-all ${
                    resendCooldown > 0 ? 'text-slate-600 cursor-not-allowed' : 'text-cyan-400 hover:text-cyan-300 underline'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? '' : 'animate-spin'}`} />
                  <span>{resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}</span>
                </button>
              </div>
            </form>
          )}

          {step === 'TOTP' && (
            <form onSubmit={handleTotpSubmit} className="space-y-4 animate-fade-in-up">
              <div className="p-4 bg-slate-800/90 border border-emerald-500/40 rounded-xl text-xs text-slate-200 shadow-md space-y-3 text-center">
                <div className="flex items-center justify-center space-x-2 text-emerald-400 font-bold text-sm">
                  <KeyRound className="w-5 h-5 text-emerald-400" />
                  <span>Step 3: Mandatory TOTP Authenticator 2FA</span>
                </div>
                
                <p className="text-slate-300 text-xs">
                  Scan QR code with your Authenticator App (Google Authenticator / Authy / Microsoft Authenticator):
                </p>

                <div className="bg-white p-2 rounded-xl w-36 h-36 mx-auto flex items-center justify-center border-2 border-emerald-500/60 shadow-md overflow-hidden">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `otpauth://totp/Nexlance:${email || currentUser?.email || 'user@nexlance.in'}?secret=NEXLANCEAUTHKEY2&issuer=Nexlance`
                    )}`}
                    alt="TOTP 2FA QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-300 text-center">
                  Secret Key: <span className="font-bold tracking-wider text-amber-300 select-all">NEXLANCEAUTHKEY2</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 text-center">
                  Enter 6-Digit Authenticator Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value)}
                  placeholder="000 000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.3em] font-mono text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/30 btn-hover-effect flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-5 h-5 text-white" />
                <span>Verify TOTP & Access System</span>
              </button>

              <div className="text-[11px] text-slate-400 text-center pt-1 leading-relaxed">
                Open Google Authenticator, Authy, or Microsoft Authenticator on your mobile device to view your 6-digit code.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
