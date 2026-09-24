import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuditLogEntry } from '../types';
import { INITIAL_USERS } from '../mock/initialData';
import { verifyTOTPCode } from '../utils/totp';
import { issueEmailOtp, verifyEmailOtp } from '../services/emailOtpService';
import {
  createBackendSession,
  validateBackendSession,
  revokeBackendSession,
  revokeAllSessionsForUser,
  getStoredSessionId,
  clearStoredSessionId,
} from '../services/sessionService';

interface AuthContextType {
  currentUser: User;
  users: User[];
  isAuthenticated: boolean;
  isEmailOtpVerified: boolean;
  isTotpVerified: boolean;
  mustChangePassword: boolean;
  login: (email: string, pass: string) => Promise<{
    success: boolean;
    message: string;
    needPasswordReset?: boolean;
    needEmailOtp?: boolean;
  }>;
  sendEmailOtp: (email?: string) => Promise<{ success: boolean; message: string; resendAllowedAt?: number }>;
  verifyEmailOtpCode: (code: string, targetEmail?: string) => Promise<{ success: boolean; message: string }>;
  verifyTotp: (code: string) => Promise<boolean>;
  completePasswordReset: (newPass: string) => boolean;
  logout: () => void;
  switchUser: (userId: string) => void;
  disableUser: (userId: string, adminId: string) => void;
  unlockUser: (userId: string, adminId: string) => void;
  createUser: (user: Omit<User, 'agent_id'>, adminId: string) => void;
  addAuditLog: (entry: Omit<AuditLogEntry, 'log_id' | 'timestamp' | 'ip_address'>) => void;
  auditLogs: AuditLogEntry[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('nexlance_users');
    let list = INITIAL_USERS;
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        list = parsed.map(u => {
          if (u.agent_id === 'USR_FOUNDER') {
            return { ...u, role: 'FOUNDER', name: 'Prabhudeva C (Founder & CEO)', email: 'prabhudeva.c@nexlance.co.in' };
          }
          if (u.agent_id === 'USR_KARTHICK') {
            return { ...u, role: 'FOUNDER', name: 'Karthick (Founder)', email: 'karthick@nexlance.co.in' };
          }
          return u;
        });
      } catch (e) {
        list = INITIAL_USERS;
      }
    }
    // Allowed user emails
    const allowedEmails = new Set([
      'prabhudeva.c@nexlance.co.in',
      'karthick@nexlance.co.in',
      'b.praveen@nexlance.co.in',
      'chaithanya@nexlance.co.in',
      'geetha.m@nexlance.co.in',
      'kolatam.hemanth@nexlance.co.in',
      'v.premchand@nexlance.co.in',
      'k.prasad@nexlance.co.in',
    ]);

    // Filter list: Keep only allowed users
    list = list.filter(u => allowedEmails.has(u.email.toLowerCase()));

    // Merge any missing users from INITIAL_USERS
    INITIAL_USERS.forEach(initUser => {
      if (!list.some(u => u.email.toLowerCase() === initUser.email.toLowerCase())) {
        list.push(initUser);
      }
    });

    return list;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedId = localStorage.getItem('nexlance_current_user_id');
    const found = users.find(u => u.agent_id === savedId);
    return found || users[0]; // Default Founder
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isEmailOtpVerified, setIsEmailOtpVerified] = useState<boolean>(false);
  const [isTotpVerified, setIsTotpVerified] = useState<boolean>(false);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('nexlance_audit_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('nexlance_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('nexlance_current_user_id', currentUser.agent_id);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('nexlance_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Session validation on initial mount
  useEffect(() => {
    let isMounted = true;
    const sId = getStoredSessionId();
    if (!sId) {
      console.log('[Auth Context] No stored session ID found on mount -> login required');
      setIsAuthenticated(false);
      setIsEmailOtpVerified(false);
      setIsTotpVerified(false);
      return;
    }

    console.log('[Auth Context] Validating stored session on mount...');
    validateBackendSession(sId).then((res) => {
      if (!isMounted) return;
      if (res.valid) {
        const userId = res.user?.userId || (JSON.parse(localStorage.getItem('nexlance_local_session') || '{}')).userId;
        const found = users.find(u => u.agent_id === userId);
        if (found && found.active_flag) {
          console.log(`[Auth Context] Valid session restored for user: ${found.name} (${found.agent_id})`);
          setCurrentUser(found);
          setIsAuthenticated(true);
          setIsEmailOtpVerified(true);
          setIsTotpVerified(true);
        } else {
          console.log('[Auth Context] User not found or inactive -> clearing session');
          clearStoredSessionId();
          setIsAuthenticated(false);
          setIsEmailOtpVerified(false);
          setIsTotpVerified(false);
        }
      } else {
        console.log('[Auth Context] Session validation failed or expired -> clearing session');
        clearStoredSessionId();
        setIsAuthenticated(false);
        setIsEmailOtpVerified(false);
        setIsTotpVerified(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Idle session timeout (30 mins)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      if (isAuthenticated && isTotpVerified) {
        timer = setTimeout(async () => {
          const sId = getStoredSessionId();
          if (sId) await revokeBackendSession(sId);
          else clearStoredSessionId();
          setIsAuthenticated(false);
          setIsEmailOtpVerified(false);
          setIsTotpVerified(false);
          addAuditLog({
            user_id: currentUser.agent_id,
            action_type: 'LOGOUT',
            entity: 'session',
            entity_id: currentUser.agent_id,
            old_value: 'Active',
            new_value: 'Idle Timeout (30 min)',
          });
        }, 30 * 60 * 1000);
      }
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [currentUser, isAuthenticated, isTotpVerified]);

  const addAuditLog = (entry: Omit<AuditLogEntry, 'log_id' | 'timestamp' | 'ip_address'>) => {
    const newLog: AuditLogEntry = {
      ...entry,
      log_id: `LOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ip_address: '192.168.1.100',
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const sendEmailOtp = async (targetEmail?: string) => {
    const emailToUse = targetEmail || currentUser.email;
    return await issueEmailOtp(emailToUse);
  };

  const verifyEmailOtpCode = async (code: string, targetEmail?: string) => {
    const emailToUse = targetEmail || currentUser.email;
    const res = await verifyEmailOtp(emailToUse, code);
    if (res.success) {
      setIsEmailOtpVerified(true);
      addAuditLog({
        user_id: currentUser.agent_id,
        action_type: 'LOGIN',
        entity: 'email_otp',
        entity_id: currentUser.agent_id,
        new_value: `Email OTP verified successfully for ${emailToUse}`,
      });
    }
    return res;
  };

  const login = async (email: string, pass: string) => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, message: 'Invalid email or password.' };
    }

    if (!user.active_flag) {
      return { success: false, message: 'Account is disabled. Please contact Super Admin.' };
    }

    if (user.is_locked) {
      return { success: false, message: 'Account is locked due to 5 consecutive failed login attempts. Contact Super Admin to unlock.' };
    }

    if (pass.length < 6) {
      const failedCount = (user.failed_logins || 0) + 1;
      const isLockedNow = failedCount >= 5;
      setUsers(prev => prev.map(u => u.agent_id === user.agent_id ? { ...u, failed_logins: failedCount, is_locked: isLockedNow } : u));
      
      return { 
        success: false, 
        message: isLockedNow ? 'Account locked! 5 failed attempts exceeded.' : `Invalid password. Attempt ${failedCount} of 5.` 
      };
    }

    setUsers(prev => prev.map(u => u.agent_id === user.agent_id ? { ...u, failed_logins: 0 } : u));
    setCurrentUser(user);

    if (user.first_login) {
      setMustChangePassword(true);
      return { success: true, message: 'First login detected. Password change required.', needPasswordReset: true };
    }

    setIsAuthenticated(true);
    setIsEmailOtpVerified(false);
    setIsTotpVerified(false);

    await issueEmailOtp(user.email);

    addAuditLog({
      user_id: user.agent_id,
      action_type: 'LOGIN',
      entity: 'auth',
      entity_id: user.agent_id,
      new_value: `Successful password login (${user.role}). Mandatory Email OTP verification required.`,
    });

    return {
      success: true,
      message: 'Password accepted. Mandatory Email OTP verification required.',
      needEmailOtp: true,
    };
  };

  const verifyTotp = async (code: string): Promise<boolean> => {
    if (!isEmailOtpVerified) {
      console.log('[Auth Context] verifyTotp rejected: Email OTP not yet verified');
      return false;
    }
    const userSecret = currentUser.totp_secret || 'NEXLANCEAUTHKEY2';
    console.log(`[Auth Context] Verifying TOTP for user: ${currentUser.agent_id}`);
    const isValid = await verifyTOTPCode(code, userSecret);
    if (isValid) {
      console.log(`[Auth Context] TOTP valid. Creating session for user: ${currentUser.agent_id}`);
      await createBackendSession(currentUser.agent_id, currentUser.email, currentUser.role);
      setIsEmailOtpVerified(true);
      setIsTotpVerified(true);
      setIsAuthenticated(true);
      addAuditLog({
        user_id: currentUser.agent_id,
        action_type: 'LOGIN',
        entity: 'totp',
        entity_id: currentUser.agent_id,
        new_value: 'TOTP 2FA verified successfully',
      });
      console.log(`[Auth Context] Login complete. Dashboard unlocked for user: ${currentUser.agent_id}`);
      return true;
    }
    console.log('[Auth Context] TOTP verification failed: Invalid code');
    return false;
  };

  const completePasswordReset = (newPass: string) => {
    if (newPass.length < 12) return false;
    setUsers(prev => prev.map(u => u.agent_id === currentUser.agent_id ? { ...u, first_login: false } : u));
    setCurrentUser(prev => ({ ...prev, first_login: false }));
    setMustChangePassword(false);
    return true;
  };

  const logout = async () => {
    const sId = getStoredSessionId();
    if (sId) {
      await revokeBackendSession(sId);
    } else {
      clearStoredSessionId();
    }
    addAuditLog({
      user_id: currentUser.agent_id,
      action_type: 'LOGOUT',
      entity: 'session',
      entity_id: currentUser.agent_id,
      old_value: 'Active',
      new_value: 'Explicit User Logout',
    });
    setIsAuthenticated(false);
    setIsEmailOtpVerified(false);
    setIsTotpVerified(false);
  };

  const switchUser = (userId: string) => {
    const target = users.find(u => u.agent_id === userId);
    if (target) {
      if (!target.active_flag) {
        alert('Cannot switch: User account is disabled by Admin.');
        return;
      }
      setCurrentUser(target);
      setIsEmailOtpVerified(false);
      setIsTotpVerified(false);
      addAuditLog({
        user_id: target.agent_id,
        action_type: 'LOGIN',
        entity: 'session',
        entity_id: target.agent_id,
        new_value: `Switched session to ${target.name} (${target.role}) - Email OTP & TOTP 2FA required`,
      });
    }
  };

  const disableUser = async (userId: string, adminId: string) => {
    setUsers(prev => prev.map(u => u.agent_id === userId ? { ...u, active_flag: false } : u));
    await revokeAllSessionsForUser(userId);
    addAuditLog({
      user_id: adminId,
      action_type: 'DISABLE_USER',
      entity: 'users',
      entity_id: userId,
      new_value: 'Account disabled & active sessions terminated',
    });

    if (currentUser.agent_id === userId) {
      clearStoredSessionId();
      setIsAuthenticated(false);
      setIsEmailOtpVerified(false);
      setIsTotpVerified(false);
    }
  };

  const unlockUser = (userId: string, adminId: string) => {
    setUsers(prev => prev.map(u => u.agent_id === userId ? { ...u, failed_logins: 0, is_locked: false } : u));
    addAuditLog({
      user_id: adminId,
      action_type: 'UNLOCK_USER',
      entity: 'users',
      entity_id: userId,
      new_value: 'Unlocked account after 5 failed login lockouts',
    });
  };

  const createUser = (newUser: Omit<User, 'agent_id'>, adminId: string) => {
    const created: User = {
      ...newUser,
      agent_id: `AGT_${Date.now()}`,
      active_flag: true,
      first_login: true,
      failed_logins: 0,
      is_locked: false,
    };
    setUsers(prev => [...prev, created]);
    addAuditLog({
      user_id: adminId,
      action_type: 'CLIENT_CREATED',
      entity: 'users',
      entity_id: created.agent_id,
      new_value: `Created user ${created.name} (${created.role}) with forced password change`,
    });
  };

  return (
    <AuthContext.Provider
      value={{
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
        logout,
        switchUser,
        disableUser,
        unlockUser,
        createUser,
        addAuditLog,
        auditLogs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
