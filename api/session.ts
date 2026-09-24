import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export interface ServerSession {
  sessionId: string;
  userId: string;
  email: string;
  role: string;
  createdAt: number; // ms timestamp (24-hour hard expiry limit)
  lastActiveAt: number; // ms timestamp (30-minute idle timeout limit)
  isEmailOtpVerified: boolean;
  isTotpVerified: boolean;
  isRevoked: boolean;
}

// In-memory backend session store & revoked users list
const activeSessions = new Map<string, ServerSession>();
const disabledUserIds = new Set<string>();

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SESSION_LIFESPAN_MS = 24 * 60 * 60 * 1000; // 24 hours

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { action, sessionId, userId, email, role } = req.body || {};
  const now = Date.now();

  // ACTION 1: CREATE A NEW SECURE AUTHENTICATED SESSION
  if (action === 'CREATE_SESSION') {
    if (!userId || !email) {
      return res.status(400).json({ success: false, message: 'User details required to create session' });
    }

    if (disabledUserIds.has(userId)) {
      return res.status(403).json({ success: false, message: 'Account is disabled. Cannot create session.' });
    }

    const newSessionId = `SESS_${crypto.randomBytes(24).toString('hex')}`;
    const session: ServerSession = {
      sessionId: newSessionId,
      userId,
      email: email.toLowerCase().trim(),
      role: role || 'AGENT',
      createdAt: now,
      lastActiveAt: now,
      isEmailOtpVerified: true,
      isTotpVerified: true,
      isRevoked: false,
    };

    activeSessions.set(newSessionId, session);

    // Set secure cookie header if possible
    res.setHeader(
      'Set-Cookie',
      `nexlance_session=${newSessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`
    );

    return res.status(200).json({
      success: true,
      sessionId: newSessionId,
      expiresAt: now + MAX_SESSION_LIFESPAN_MS,
      idleExpiresAt: now + IDLE_TIMEOUT_MS,
    });
  }

  // ACTION 2: VALIDATE EXISTING SESSION (Browser refresh / page check)
  if (action === 'VALIDATE_SESSION') {
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(401).json({ success: false, message: 'No session ID provided', valid: false });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Session not found or invalid', valid: false });
    }

    // Check if account has been disabled by admin
    if (session.isRevoked || disabledUserIds.has(session.userId)) {
      activeSessions.delete(sessionId);
      return res.status(403).json({
        success: false,
        message: 'Account disabled or session revoked by Administrator',
        valid: false,
        reason: 'REVOKED',
      });
    }

    // Check 24-hour absolute session lifespan
    if (now - session.createdAt > MAX_SESSION_LIFESPAN_MS) {
      activeSessions.delete(sessionId);
      return res.status(401).json({
        success: false,
        message: 'Session expired (24-hour maximum lifespan reached). Please log in again.',
        valid: false,
        reason: '24H_HARD_EXPIRY',
      });
    }

    // Check 30-minute idle timeout
    if (now - session.lastActiveAt > IDLE_TIMEOUT_MS) {
      activeSessions.delete(sessionId);
      return res.status(401).json({
        success: false,
        message: 'Session expired due to 30 minutes of inactivity. Please log in again.',
        valid: false,
        reason: '30MIN_IDLE_TIMEOUT',
      });
    }

    // Session is valid! Refresh lastActiveAt timestamp
    session.lastActiveAt = now;

    return res.status(200).json({
      success: true,
      valid: true,
      session: {
        userId: session.userId,
        email: session.email,
        role: session.role,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
      },
    });
  }

  // ACTION 3: LOGOUT / REVOKE SINGLE SESSION
  if (action === 'LOGOUT') {
    if (sessionId && activeSessions.has(sessionId)) {
      activeSessions.delete(sessionId);
    }
    return res.status(200).json({ success: true, message: 'Session invalidated successfully' });
  }

  // ACTION 4: REVOKE ALL SESSIONS FOR DISABLED USER
  if (action === 'REVOKE_USER_SESSIONS') {
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    disabledUserIds.add(userId);

    // Delete all sessions matching this userId
    for (const [sId, sess] of activeSessions.entries()) {
      if (sess.userId === userId) {
        activeSessions.delete(sId);
      }
    }

    return res.status(200).json({
      success: true,
      message: `All active sessions revoked for user ${userId}`,
    });
  }

  // ACTION 5: RE-ENABLE USER (Admin Unlock)
  if (action === 'ENABLE_USER') {
    if (userId) {
      disabledUserIds.delete(userId);
    }
    return res.status(200).json({ success: true, message: `User ${userId} re-enabled` });
  }

  return res.status(400).json({ success: false, message: 'Invalid action parameter' });
}
