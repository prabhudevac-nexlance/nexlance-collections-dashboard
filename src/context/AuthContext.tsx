import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuditLogEntry } from '../types';
import { INITIAL_USERS } from '../mock/initialData';

interface AuthContextType {
  currentUser: User;
  users: User[];
  isAuthenticated: boolean;
  isTotpVerified: boolean;
  mustChangePassword: boolean;
  login: (email: string, pass: string) => { success: boolean; message: string; needPasswordReset?: boolean; needTotp?: boolean };
  verifyTotp: (code: string) => boolean;
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
    try {
      const saved = localStorage.getItem('nexlance_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure Karthik is founder in loaded data if exists
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved users:', e);
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const savedId = localStorage.getItem('nexlance_current_user_id');
      const found = users?.find(u => u?.agent_id === savedId);
      if (found) return found;
    } catch (e) {
      console.error('Failed to parse current user:', e);
    }
    return users?.[0] || INITIAL_USERS[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isTotpVerified, setIsTotpVerified] = useState<boolean>(true);
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

  // Idle session timeout (30 mins simulated)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsAuthenticated(false);
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
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [currentUser]);

  const addAuditLog = (entry: Omit<AuditLogEntry, 'log_id' | 'timestamp' | 'ip_address'>) => {
    const newLog: AuditLogEntry = {
      ...entry,
      log_id: `LOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ip_address: '192.168.1.100',
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const login = (email: string, pass: string) => {
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
    setIsTotpVerified(false);
    
    addAuditLog({
      user_id: user.agent_id,
      action_type: 'LOGIN',
      entity: 'auth',
      entity_id: user.agent_id,
      new_value: `Successful password login (${user.role})`,
    });

    return { success: true, message: 'Password accepted. Mandatory TOTP required.', needTotp: true };
  };

  const verifyTotp = (code: string) => {
    if (code.length === 6 && /^\d+$/.test(code)) {
      setIsTotpVerified(true);
      addAuditLog({
        user_id: currentUser.agent_id,
        action_type: 'LOGIN',
        entity: 'totp',
        entity_id: currentUser.agent_id,
        new_value: 'TOTP 2FA verified successfully',
      });
      return true;
    }
    return false;
  };

  const completePasswordReset = (newPass: string) => {
    if (newPass.length < 12) return false;
    setUsers(prev => prev.map(u => u.agent_id === currentUser.agent_id ? { ...u, first_login: false } : u));
    setCurrentUser(prev => ({ ...prev, first_login: false }));
    setMustChangePassword(false);
    return true;
  };

  const logout = () => {
    addAuditLog({
      user_id: currentUser.agent_id,
      action_type: 'LOGOUT',
      entity: 'session',
      entity_id: currentUser.agent_id,
      old_value: 'Active',
      new_value: 'Explicit User Logout',
    });
    setIsAuthenticated(false);
    setIsTotpVerified(false);
  };

  const switchUser = (userId: string) => {
    const target = users.find(u => u.agent_id === userId);
    if (target) {
      setCurrentUser(target);
      setIsAuthenticated(true);
      setIsTotpVerified(true);
      setMustChangePassword(false);
      addAuditLog({
        user_id: target.agent_id,
        action_type: 'LOGIN',
        entity: 'role_switch',
        entity_id: target.agent_id,
        new_value: `Switched demo view to user ${target.name} (${target.role})`,
      });
    }
  };

  const disableUser = (userId: string, adminId: string) => {
    setUsers(prev => prev.map(u => u.agent_id === userId ? { ...u, active_flag: false } : u));
    addAuditLog({
      user_id: adminId,
      action_type: 'DISABLE_USER',
      entity: 'users',
      entity_id: userId,
      old_value: 'active_flag: true',
      new_value: 'active_flag: false (Session Terminated Immediately)',
    });
    if (currentUser.agent_id === userId) {
      logout();
    }
  };

  const unlockUser = (userId: string, adminId: string) => {
    setUsers(prev => prev.map(u => u.agent_id === userId ? { ...u, is_locked: false, failed_logins: 0 } : u));
    addAuditLog({
      user_id: adminId,
      action_type: 'UNLOCK_USER',
      entity: 'users',
      entity_id: userId,
      old_value: 'is_locked: true',
      new_value: 'is_locked: false',
    });
  };

  const createUser = (newUser: Omit<User, 'agent_id'>, adminId: string) => {
    const created: User = {
      ...newUser,
      agent_id: `USR_${Date.now()}`,
      first_login: true,
      totp_enabled: true,
      active_flag: true,
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
        isTotpVerified,
        mustChangePassword,
        login,
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
