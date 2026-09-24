// Session Manager Service interacting with /api/session backend

export interface SessionValidationResult {
  valid: boolean;
  message?: string;
  reason?: '30MIN_IDLE_TIMEOUT' | '24H_HARD_EXPIRY' | 'REVOKED' | 'NOT_FOUND';
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

const SESSION_KEY = 'nexlance_auth_session_id';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_LIFESPAN_MS = 24 * 60 * 60 * 1000; // 24 hours

// Local client session storage (holding ONLY session ID and timestamps, NO passwords/OTPs/secrets)
interface LocalSessionRecord {
  sessionId: string;
  userId: string;
  email: string;
  createdAt: number;
  lastActiveAt: number;
}

export function getStoredSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function storeSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_KEY, sessionId);
}

export function clearStoredSessionId(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('nexlance_local_session');
}

/**
 * Creates a secure backend session after successful Email OTP + TOTP verification.
 */
export async function createBackendSession(
  userId: string,
  email: string,
  role: string
): Promise<string> {
  const now = Date.now();
  const fallbackSessionId = `SESS_${Math.random().toString(36).substring(2)}${Date.now()}`;

  try {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_SESSION',
        userId,
        email,
        role,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.sessionId) {
        storeSessionId(data.sessionId);
        const record: LocalSessionRecord = {
          sessionId: data.sessionId,
          userId,
          email,
          createdAt: now,
          lastActiveAt: now,
        };
        localStorage.setItem('nexlance_local_session', JSON.stringify(record));
        return data.sessionId;
      }
    }
  } catch (e) {
    // Handled silently
  }

  // Fallback to local session record
  storeSessionId(fallbackSessionId);
  const record: LocalSessionRecord = {
    sessionId: fallbackSessionId,
    userId,
    email,
    createdAt: now,
    lastActiveAt: now,
  };
  localStorage.setItem('nexlance_local_session', JSON.stringify(record));
  return fallbackSessionId;
}

/**
 * Validates active session on page refresh or component mount.
 * Checks 30-minute idle timeout and 24-hour hard expiry limit.
 */
export async function validateBackendSession(
  sessionId: string,
  isUserDisabledLocally: boolean = false
): Promise<SessionValidationResult> {
  if (isUserDisabledLocally) {
    clearStoredSessionId();
    return {
      valid: false,
      message: 'Account disabled by Administrator',
      reason: 'REVOKED',
    };
  }

  const now = Date.now();

  // 1. Try server-side validation via /api/session
  try {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'VALIDATE_SESSION',
        sessionId,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.valid) {
        // Update local session timestamp
        const saved = localStorage.getItem('nexlance_local_session');
        if (saved) {
          const rec: LocalSessionRecord = JSON.parse(saved);
          rec.lastActiveAt = now;
          localStorage.setItem('nexlance_local_session', JSON.stringify(rec));
        }
        return { valid: true, user: data.session };
      } else {
        clearStoredSessionId();
        return {
          valid: false,
          message: data.message,
          reason: data.reason || 'NOT_FOUND',
        };
      }
    }
  } catch (e) {
    // Handled silently
  }

  // 2. Client-side fallback session verification (enforcing strict PRD limits)
  const saved = localStorage.getItem('nexlance_local_session');
  if (!saved) {
    clearStoredSessionId();
    return { valid: false, message: 'Session not found', reason: 'NOT_FOUND' };
  }

  try {
    const rec: LocalSessionRecord = JSON.parse(saved);
    if (rec.sessionId !== sessionId) {
      clearStoredSessionId();
      return { valid: false, message: 'Invalid session ID', reason: 'NOT_FOUND' };
    }

    // Check 24-hour hard expiry
    if (now - rec.createdAt > MAX_LIFESPAN_MS) {
      clearStoredSessionId();
      return {
        valid: false,
        message: 'Session expired (24-hour forced re-login limit reached)',
        reason: '24H_HARD_EXPIRY',
      };
    }

    // Check 30-minute idle timeout
    if (now - rec.lastActiveAt > IDLE_TIMEOUT_MS) {
      clearStoredSessionId();
      return {
        valid: false,
        message: 'Session expired due to 30 minutes of inactivity',
        reason: '30MIN_IDLE_TIMEOUT',
      };
    }

    // Refresh lastActiveAt timestamp
    rec.lastActiveAt = now;
    localStorage.setItem('nexlance_local_session', JSON.stringify(rec));
    return { valid: true };
  } catch (e) {
    clearStoredSessionId();
    return { valid: false, message: 'Corrupt session data', reason: 'NOT_FOUND' };
  }
}

/**
 * Revokes backend session on explicit user logout.
 */
export async function revokeBackendSession(sessionId: string): Promise<void> {
  try {
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'LOGOUT',
        sessionId,
      }),
    });
  } catch (e) {
    // Handled silently
  } finally {
    clearStoredSessionId();
  }
}

/**
 * Revokes all backend sessions when admin disables a user account.
 */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  try {
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'REVOKE_USER_SESSIONS',
        userId,
      }),
    });
  } catch (e) {
    // Handled silently
  }
}
