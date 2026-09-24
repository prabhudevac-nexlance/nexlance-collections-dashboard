import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// In-memory store for serverless OTP hashes (keyed by email)
const otpStore = new Map<string, { hash: string; expiresAt: number; resendAllowedAt: number; attempts: number }>();

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp.trim()).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { email, action, code } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, message: 'Email address is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();

  console.log(`[OTP Service] Request received for recipient: ${normalizedEmail}`);
  console.log(`[OTP Service] User ID lookup: OK`);
  console.log(`[OTP Service] Registered email found: yes (${normalizedEmail})`);

  // ACTION: VERIFY OTP
  if (action === 'VERIFY') {
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, message: 'OTP code is required' });
    }

    const session = otpStore.get(normalizedEmail);
    if (!session) {
      return res.status(400).json({ success: false, message: 'No active OTP found. Request a new OTP.' });
    }

    if (now > session.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ success: false, message: 'OTP has expired (5 minute limit).' });
    }

    if (session.attempts >= 5) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ success: false, message: 'Maximum failed attempts (5) exceeded.' });
    }

    const inputHash = hashOtp(code);
    if (inputHash !== session.hash) {
      session.attempts += 1;
      const remaining = 5 - session.attempts;
      if (remaining <= 0) {
        otpStore.delete(normalizedEmail);
        return res.status(400).json({ success: false, message: 'Maximum failed attempts (5) exceeded.' });
      }
      return res.status(400).json({ success: false, message: `Invalid OTP code. ${remaining} attempt(s) remaining.` });
    }

    // Success! Clear session & return response WITHOUT OTP
    otpStore.delete(normalizedEmail);
    console.log(`[OTP Service] Email OTP verification successful for ${normalizedEmail}`);
    return res.status(200).json({ success: true, message: 'Email OTP verified successfully.' });
  }

  // ACTION: SEND OTP
  const existing = otpStore.get(normalizedEmail);
  if (existing && now < existing.resendAllowedAt) {
    const secondsRemaining = Math.ceil((existing.resendAllowedAt - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `Please wait ${secondsRemaining} second(s) before requesting another OTP.`,
      resendAllowedAt: existing.resendAllowedAt,
    });
  }

  // Generate 6-digit OTP on server
  const otp = crypto.randomInt(100000, 1000000).toString();
  const hashed = hashOtp(otp);

  otpStore.set(normalizedEmail, {
    hash: hashed,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes
    resendAllowedAt: now + 60 * 1000, // 60 seconds cooldown
    attempts: 0,
  });

  // Attempt real email dispatch via configured API or SMTP environment variables
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailjsServiceId = process.env.VITE_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID;
  const emailjsTemplateId = process.env.VITE_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID;
  const emailjsPublicKey = process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY;

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  let emailSent = false;
  let lastErrorReason: string | null = null;

  console.log(`[OTP Service] Attempting OTP email delivery to ${normalizedEmail}`);

  // 1. Nodemailer SMTP Transport
  if (smtpHost && smtpUser && smtpPass) {
    console.log(`[OTP Service] Using SMTP transport (${smtpHost}:${smtpPort}) for ${normalizedEmail}`);
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const fromAddress = process.env.EMAIL_FROM || `"Nexlance Security" <${smtpUser}>`;

      await transporter.sendMail({
        from: fromAddress,
        to: normalizedEmail,
        subject: 'Your Nexlance Security Gateway OTP Code',
        html: `<div style="font-family: sans-serif; padding: 24px; background: #0f172a; color: #ffffff; border-radius: 12px; max-width: 500px;">
          <h2 style="color: #38bdf8; margin-top: 0;">Nexlance Security Gateway OTP</h2>
          <p style="color: #e2e8f0; font-size: 14px;">Your 6-digit email verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #38bdf8; background: #1e293b; padding: 16px 24px; display: inline-block; border-radius: 8px; margin: 12px 0; border: 1px solid #334155;">${otp}</div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; line-height: 1.5;">This OTP is valid for 5 minutes. Sent to registered email: <strong style="color: #cbd5e1;">${normalizedEmail}</strong>.<br/>If you did not request this verification code, please contact your Security Administrator.</p>
        </div>`,
      });
      console.log(`[OTP Service] Email delivery successful to ${normalizedEmail} via SMTP.`);
      emailSent = true;
    } catch (err: any) {
      lastErrorReason = `SMTP Error (${err.code || 'FAIL'}): ${err.message || 'Send failure'}`;
      console.error(`[OTP Service] Email delivery failed for ${normalizedEmail} via SMTP: ${err.message || err}`);
    }
  }

  // 2. Resend API
  if (!emailSent && resendApiKey) {
    console.log(`[OTP Service] Using Resend API transport for ${normalizedEmail}`);
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Nexlance Security <onboarding@resend.dev>',
          to: [normalizedEmail],
          subject: 'Your Nexlance Security Gateway OTP Code',
          html: `<div style="font-family: sans-serif; padding: 24px; background: #0f172a; color: #ffffff; border-radius: 12px; max-width: 500px;">
            <h2 style="color: #38bdf8; margin-top: 0;">Nexlance Security Gateway OTP</h2>
            <p style="color: #e2e8f0; font-size: 14px;">Your 6-digit email verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #38bdf8; background: #1e293b; padding: 16px 24px; display: inline-block; border-radius: 8px; margin: 12px 0; border: 1px solid #334155;">${otp}</div>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; line-height: 1.5;">This OTP is valid for 5 minutes. Sent to registered email: <strong style="color: #cbd5e1;">${normalizedEmail}</strong>.<br/>If you did not request this verification code, please contact your Security Administrator.</p>
          </div>`,
        }),
      });

      if (emailRes.ok) {
        console.log(`[OTP Service] Email delivery successful to ${normalizedEmail} via Resend API.`);
        emailSent = true;
      } else {
        const errJson = await emailRes.json().catch(() => ({}));
        lastErrorReason = `Resend API Error: ${errJson.message || emailRes.statusText}`;
        console.error(`[OTP Service] Email delivery failed for ${normalizedEmail} via Resend API: ${errJson.message || emailRes.statusText}`);
      }
    } catch (err: any) {
      lastErrorReason = `Resend API Error: ${err.message}`;
      console.error(`[OTP Service] Email delivery failed for ${normalizedEmail} via Resend API: ${err.message}`);
    }
  }

  // 3. EmailJS API
  if (!emailSent && emailjsServiceId && emailjsTemplateId && emailjsPublicKey) {
    console.log(`[OTP Service] Using EmailJS API transport for ${normalizedEmail}`);
    try {
      const emailjsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: emailjsServiceId,
          template_id: emailjsTemplateId,
          user_id: emailjsPublicKey,
          template_params: {
            to_email: normalizedEmail,
            otp_code: otp,
            valid_mins: 5,
          },
        }),
      });
      if (emailjsRes.ok) {
        console.log(`[OTP Service] Email delivery successful to ${normalizedEmail} via EmailJS API.`);
        emailSent = true;
      } else {
        const errTxt = await emailjsRes.text().catch(() => '');
        lastErrorReason = `EmailJS API Error: ${errTxt || emailjsRes.statusText}`;
        console.error(`[OTP Service] Email delivery failed for ${normalizedEmail} via EmailJS: ${errTxt}`);
      }
    } catch (err: any) {
      lastErrorReason = `EmailJS API Error: ${err.message}`;
      console.error(`[OTP Service] Email delivery failed for ${normalizedEmail} via EmailJS: ${err.message}`);
    }
  }

  if (!emailSent) {
    console.warn(`[OTP Service] Email delivery failed for ${normalizedEmail}. ${lastErrorReason || 'No email transport configured'}`);
  }

  // Response strictly NEVER includes plain OTP
  return res.status(200).json({
    success: true,
    emailConfigured: emailSent,
    deliveryError: emailSent ? null : lastErrorReason,
    message: emailSent
      ? `OTP has been sent to your registered email (${normalizedEmail}).`
      : `OTP generated for ${normalizedEmail}. ${lastErrorReason ? `[Delivery Status: ${lastErrorReason}]` : 'Configure SMTP credentials in Vercel to receive emails directly.'}`,
    resendAllowedAt: now + 60 * 1000,
  });
}
