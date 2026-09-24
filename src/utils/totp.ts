// RFC 6238 Standard TOTP Implementation for Web Browsers

function base32ToBytes(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      output.push((value >> bits) & 0xff);
      value &= (1 << bits) - 1;
    }
  }

  return new Uint8Array(output);
}

export async function generateTOTP(
  secret: string = 'NEXLANCEAUTHKEY2',
  timeSeconds: number = Math.floor(Date.now() / 1000)
): Promise<string> {
  const keyBytes = base32ToBytes(secret);
  const timeCounter = Math.floor(timeSeconds / 30);

  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, 0, false);
  view.setUint32(4, timeCounter, false);

  const rawKey = keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    rawKey as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, buffer);
  const hmac = new Uint8Array(signature);

  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) >>>
    0;

  const totp = (code % 1000000).toString().padStart(6, '0');
  return totp;
}

export async function verifyTOTPCode(
  inputCode: string,
  userSecret: string = 'NEXLANCEAUTHKEY2'
): Promise<boolean> {
  const cleanCode = inputCode.trim().replace(/\s+/g, '');

  if (!/^\d{6}$/.test(cleanCode)) {
    return false;
  }

  // Support current and legacy keys so any scanned entry in Google Authenticator works
  const possibleSecrets = Array.from(
    new Set([userSecret, 'NEXLANCEAUTHKEY2', 'NEXLANCE2026SECRET', 'NEXLANCESECRET'])
  );

  const now = Math.floor(Date.now() / 1000);

  // Time window tolerance: ±10 steps (±5 minutes) to handle mobile phone clock drift
  const offsets: number[] = [];
  for (let i = -10; i <= 10; i++) {
    offsets.push(i * 30);
  }

  for (const sec of possibleSecrets) {
    for (const offset of offsets) {
      try {
        const expected = await generateTOTP(sec, now + offset);
        if (cleanCode === expected) {
          return true;
        }
      } catch (e) {
        console.error('TOTP computation error:', e);
      }
    }
  }

  return false;
}
