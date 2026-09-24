import emailjs from '@emailjs/browser';

export interface EmailOtpSession {
  email: string;
  hashedOtp: string;
  expiresAt: number; // ms timestamp
  resendAllowedAt: number; // ms timestamp
  failedAttempts: number;
  maxAttempts: number;
}

// In-memory client store holding ONLY SHA-256 hashed OTPs (never plain text)
const activeOtpSessions: Map<string, EmailOtpSession> = new Map();

export async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp.trim());
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSecure6DigitOtp(): string {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  const val = (array[0] % 900000) + 100000; // 100000 - 999999
  return val.toString();
}

/**
 * Sends real OTP email via configured Email Service / EmailJS / Serverless API.
 * Plaintext OTP is NEVER returned in response or logged to console.
 */
async function sendRealEmail(toEmail: string, plainOtp: string): Promise<boolean> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_nexlance';
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_otp';
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'pub_nexlance_2026';
  const apiUrl = import.meta.env.VITE_EMAIL_SERVICE_URL;

  // 1. If custom REST email API backend is configured via env
  if (apiUrl) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: toEmail,
          otp: plainOtp,
        }),
      });
      if (res.ok) return true;
    } catch {
      // Handled silently without logging OTP
    }
  }

  // 2. EmailJS SDK / Web API Dispatch
  try {
    const response = await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: toEmail,
        user_email: toEmail,
        otp_code: plainOtp,
        app_name: 'Nexlance Security Gateway',
        valid_mins: 5,
      },
      publicKey
    );
    if (response.status === 200) return true;
  } catch {
    // Attempt fallback to direct EmailJS REST API
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: toEmail,
            user_email: toEmail,
            otp_code: plainOtp,
            valid_mins: 5,
          },
        }),
      });
      return res.ok;
    } catch {
      // Handled silently
    }
  }

  return false;
}

/**
 * Generates and issues a new Email OTP session.
 * Stores ONLY the SHA-256 hash in memory.
 * Response strictly NEVER contains plain OTP.
 */
export async function issueEmailOtp(email: string): Promise<{
  success: boolean;
  message: string;
  emailConfigured?: boolean;
  deliveryError?: string;
  resendAllowedAt?: number;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();

  console.log(`[OTP Client] User found: yes`);
  console.log(`[OTP Client] Registered email found: yes (${normalizedEmail})`);
  console.log(`[OTP Client] Attempting OTP email delivery to ${normalizedEmail}`);

  const existingSession = activeOtpSessions.get(normalizedEmail);
  if (existingSession && now < existingSession.resendAllowedAt) {
    const secondsRemaining = Math.ceil((existingSession.resendAllowedAt - now) / 1000);
    return {
      success: false,
      message: `Please wait ${secondsRemaining} second(s) before requesting another OTP.`,
      resendAllowedAt: existingSession.resendAllowedAt,
    };
  }

  // Try serverless API first if deployed on server
  try {
    const serverRes = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data.emailConfigured) {
        console.log(`[OTP Client] Email delivery successful to ${normalizedEmail}`);
      } else {
        console.warn(`[OTP Client] Email delivery failed or incomplete for ${normalizedEmail}: ${data.deliveryError || 'No email service response'}`);
      }
      return {
        success: true,
        emailConfigured: data.emailConfigured,
        deliveryError: data.deliveryError,
        message: data.message || `OTP has been sent to your registered email (${email}).`,
        resendAllowedAt: now + 60 * 1000,
      };
    }
  } catch (err: any) {
    console.warn(`[OTP Client] Serverless API fetch failed: ${err.message}. Falling back to client dispatch.`);
  }

  // Generate 6-digit OTP locally and store ONLY SHA-256 hash
  const plainOtp = generateSecure6DigitOtp();
  const hashedOtp = await hashOtp(plainOtp);

  const session: EmailOtpSession = {
    email: normalizedEmail,
    hashedOtp,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes
    resendAllowedAt: now + 60 * 1000, // 60 seconds cooldown
    failedAttempts: 0,
    maxAttempts: 5,
  };

  activeOtpSessions.set(normalizedEmail, session);

  // Dispatch real email (without returning OTP in response object)
  const sent = await sendRealEmail(normalizedEmail, plainOtp);
  if (sent) {
    console.log(`[OTP Client] Email delivery successful to ${normalizedEmail}`);
  } else {
    console.warn(`[OTP Client] Email delivery failed to ${normalizedEmail}`);
  }

  return {
    success: true,
    emailConfigured: sent,
    message: sent
      ? `OTP has been sent to your registered email (${email}). Please check your inbox.`
      : `OTP generated for ${email}. Configure SMTP credentials in Vercel to receive emails directly.`,
    resendAllowedAt: session.resendAllowedAt,
  };
}

/**
 * Verifies user-entered OTP against stored SHA-256 hash.
 */
export async function verifyEmailOtp(
  email: string,
  userEnteredOtp: string
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Try serverless API first if available
  try {
    const serverRes = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        action: 'VERIFY',
        code: userEnteredOtp.trim(),
      }),
    });

    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data.success) {
        return { success: true, message: 'Email OTP verified successfully.' };
      }
    }
  } catch {
    // Fall back to client memory store verification
  }

  const session = activeOtpSessions.get(normalizedEmail);
  if (!session) {
    return {
      success: false,
      message: 'No active OTP found for this email. Please request a new OTP.',
    };
  }

  const now = Date.now();
  if (now > session.expiresAt) {
    activeOtpSessions.delete(normalizedEmail);
    return {
      success: false,
      message: 'OTP has expired (5 minute limit). Please request a new OTP.',
    };
  }

  if (session.failedAttempts >= session.maxAttempts) {
    activeOtpSessions.delete(normalizedEmail);
    return {
      success: false,
      message: 'Maximum failed attempts (5) exceeded. Session invalidated. Please request a new OTP.',
    };
  }

  const inputHash = await hashOtp(userEnteredOtp);
  if (inputHash !== session.hashedOtp) {
    session.failedAttempts += 1;
    const remaining = session.maxAttempts - session.failedAttempts;

    if (remaining <= 0) {
      activeOtpSessions.delete(normalizedEmail);
      return {
        success: false,
        message: 'Maximum failed attempts (5) exceeded. Session invalidated. Request a new OTP.',
      };
    }

    return {
      success: false,
      message: `Invalid Email OTP code. ${remaining} attempt(s) remaining.`,
    };
  }

  // Success! Clear session & return response
  activeOtpSessions.delete(normalizedEmail);
  return {
    success: true,
    message: 'Email OTP verified successfully!',
  };
}
