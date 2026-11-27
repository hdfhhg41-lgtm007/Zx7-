import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Request } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
}

function loadFirebaseAppletConfig(): FirebaseAppletConfig {
  try {
    const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (parsed?.projectId && parsed?.apiKey) {
        return {
          projectId: String(parsed.projectId).trim(),
          apiKey: String(parsed.apiKey).trim(),
        };
      }
    }
  } catch {}
  return {
    projectId: 'project-c181e0ff-5ecf-425d-b4e',
    apiKey: '',
  };
}

const FIREBASE_CFG = loadFirebaseAppletConfig();
export const FIREBASE_PROJECT_ID = FIREBASE_CFG.projectId;
export const AUTHORIZED_OWNER_EMAIL = (
  process.env.ZARA_OWNER_EMAIL || 'hdfhhg41@gmail.com'
)
  .trim()
  .toLowerCase();

const GOOGLE_SECURETOKEN_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts: Record<string, string> | null = null;
let cachedCertsExpiresAtMs = 0;

export interface OwnerVerificationResult {
  verified: boolean;
  uid: string | null;
  email: string | null;
  reason: string;
}

function decodeBase64UrlJson(segment: string): any | null {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLen);
    const jsonStr = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function decodeBase64UrlBuffer(segment: string): Buffer | null {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLen);
    return Buffer.from(padded, 'base64');
  } catch {
    return null;
  }
}

export function verifyFirebaseIdTokenWithCerts(
  idToken: string,
  certsByKid: Record<string, string>,
  expectedProjectId = FIREBASE_PROJECT_ID,
  authorizedOwnerEmail = AUTHORIZED_OWNER_EMAIL,
  nowSec = Math.floor(Date.now() / 1000)
): OwnerVerificationResult {
  if (!idToken || typeof idToken !== 'string') {
    return { verified: false, uid: null, email: null, reason: 'missing_token' };
  }

  const trimmed = idToken.trim();
  if (trimmed.length < 64 || trimmed.length > 16384) {
    return { verified: false, uid: null, email: null, reason: 'invalid_token_length' };
  }

  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    return { verified: false, uid: null, email: null, reason: 'malformed_jwt' };
  }

  const [headerSeg, payloadSeg, sigSeg] = parts;
  const header = decodeBase64UrlJson(headerSeg);
  const payload = decodeBase64UrlJson(payloadSeg);
  const signature = decodeBase64UrlBuffer(sigSeg);

  if (!header || !payload || !signature || signature.length === 0) {
    return { verified: false, uid: null, email: null, reason: 'invalid_jwt_encoding' };
  }

  // Strictly enforce RS256 (blocks alg:none & HMAC key-confusion attacks)
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
    return { verified: false, uid: null, email: null, reason: 'unsupported_jwt_alg_or_kid' };
  }

  const publicKeyPem = certsByKid[header.kid];
  if (!publicKeyPem || typeof publicKeyPem !== 'string') {
    return { verified: false, uid: null, email: null, reason: 'unknown_kid' };
  }

  // Verify RS256 cryptographic signature first
  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerSeg}.${payloadSeg}`);
    verifier.end();
    const sigValid = verifier.verify(publicKeyPem, signature);
    if (!sigValid) {
      return { verified: false, uid: null, email: null, reason: 'invalid_signature' };
    }
  } catch {
    return { verified: false, uid: null, email: null, reason: 'signature_verification_error' };
  }

  // Verify Firebase SecureToken claims
  const expectedIssuer = `https://securetoken.google.com/${expectedProjectId}`;
  if (payload.aud !== expectedProjectId) {
    return { verified: false, uid: null, email: null, reason: 'invalid_audience' };
  }
  if (payload.iss !== expectedIssuer) {
    return { verified: false, uid: null, email: null, reason: 'invalid_issuer' };
  }
  if (typeof payload.sub !== 'string' || payload.sub.length < 4 || payload.sub.length > 128) {
    return { verified: false, uid: null, email: null, reason: 'invalid_subject' };
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec - 15) {
    return { verified: false, uid: null, email: null, reason: 'token_expired' };
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 120) {
    return { verified: false, uid: null, email: null, reason: 'invalid_iat' };
  }

  // Strictly enforce verified Owner Google account email
  if (payload.email_verified !== true) {
    return { verified: false, uid: null, email: null, reason: 'email_not_verified' };
  }

  const normalizedEmail =
    typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!normalizedEmail || normalizedEmail !== authorizedOwnerEmail) {
    return { verified: false, uid: null, email: null, reason: 'non_owner_account' };
  }

  return {
    verified: true,
    uid: payload.sub,
    email: normalizedEmail,
    reason: 'owner_verified',
  };
}

async function fetchGoogleSecureTokenCerts(forceRefresh = false): Promise<Record<string, string> | null> {
  const now = Date.now();
  if (!forceRefresh && cachedCerts && now < cachedCertsExpiresAtMs) {
    return cachedCerts;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const resp = await fetch(GOOGLE_SECURETOKEN_CERTS_URL, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!resp.ok) return cachedCerts;

    const certs = (await resp.json()) as Record<string, string>;
    if (!certs || typeof certs !== 'object') return cachedCerts;

    const cacheControl = resp.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
    const maxAgeSec = maxAgeMatch ? Math.max(300, parseInt(maxAgeMatch[1], 10)) : 3600;

    cachedCerts = certs;
    cachedCertsExpiresAtMs = now + maxAgeSec * 1000;
    return cachedCerts;
  } catch {
    return cachedCerts;
  } finally {
    clearTimeout(timeout);
  }
}

async function fallbackLookupViaIdentityToolkit(idToken: string): Promise<OwnerVerificationResult> {
  if (!FIREBASE_CFG.apiKey) {
    return { verified: false, uid: null, email: null, reason: 'certs_unavailable' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
        FIREBASE_CFG.apiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: controller.signal,
      }
    );
    if (!resp.ok) {
      return { verified: false, uid: null, email: null, reason: 'lookup_rejected' };
    }
    const data: any = await resp.json();
    const user = Array.isArray(data?.users) ? data.users[0] : null;
    if (!user || !user.localId) {
      return { verified: false, uid: null, email: null, reason: 'lookup_no_user' };
    }
    const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
    if (user.emailVerified !== true || email !== AUTHORIZED_OWNER_EMAIL) {
      return { verified: false, uid: null, email: null, reason: 'non_owner_account' };
    }
    return {
      verified: true,
      uid: String(user.localId),
      email,
      reason: 'owner_verified_lookup',
    };
  } catch {
    return { verified: false, uid: null, email: null, reason: 'lookup_failed' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyOwnerTokenString(
  rawIdToken: unknown,
  guestLockFlag?: unknown
): Promise<OwnerVerificationResult> {
  // Explicit Guest-Safe Lock overrides everything ("Lock for Others")
  if (
    guestLockFlag === '1' ||
    guestLockFlag === 'true' ||
    guestLockFlag === true ||
    guestLockFlag === 1
  ) {
    return { verified: false, uid: null, email: null, reason: 'guest_safe_lock_active' };
  }

  if (typeof rawIdToken !== 'string' || !rawIdToken.trim()) {
    return { verified: false, uid: null, email: null, reason: 'no_auth_token' };
  }

  const token = rawIdToken.trim();
  // Quick structural & claim pre-check before network cert lookup
  const segments = token.split('.');
  if (segments.length !== 3) {
    return { verified: false, uid: null, email: null, reason: 'malformed_jwt' };
  }
  const header = decodeBase64UrlJson(segments[0]);
  const payload = decodeBase64UrlJson(segments[1]);
  if (!header || !payload || header.alg !== 'RS256' || !header.kid) {
    return { verified: false, uid: null, email: null, reason: 'invalid_jwt_header' };
  }
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    return { verified: false, uid: null, email: null, reason: 'invalid_audience' };
  }

  let certs = await fetchGoogleSecureTokenCerts(false);
  if (certs && !certs[header.kid]) {
    certs = await fetchGoogleSecureTokenCerts(true);
  }

  if (certs) {
    return verifyFirebaseIdTokenWithCerts(token, certs);
  }

  return fallbackLookupViaIdentityToolkit(token);
}

export async function verifyOwnerRequest(req: Request): Promise<OwnerVerificationResult> {
  const guestLockHeader = req.headers['x-zara-guest-lock'];
  const authHeader = String(req.headers.authorization || '').trim();
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const idToken = bearerMatch ? bearerMatch[1].trim() : '';

  return verifyOwnerTokenString(idToken, guestLockHeader);
}

// Patterns that indicate explicit, sexually suggestive, or owner-impersonation injection in guest history
const GUEST_UNSAFE_HISTORY_REGEX =
  /(\b(?:girlfriend|lover|kiss|kisses|sexy|seductive|sultry|naughty|gandi\s*baat|hot\s*talk|bed\s*talk|bedroom|discharge|boobs|mamme|pussy|dick|cock|fuck|nude|naked|malaysia\s*wala\s*badshah|mera\s*malik|mere\s*malik)\b|بوسہ|سیکسی|شرارتی|گندی\s*بات|مالک|بادشاہ|सेक्सी|शरारती|गंदी\s*बात|मालिक|बादशाह)/i;

/**
 * Strips any explicit, flirtatious, or owner-spoofing turns from chat history when the
 * caller is NOT the cryptographically verified owner, preventing few-shot history bypasses.
 */
export function sanitizeGuestHistory(
  rawHistory: unknown
): Array<{ role: string; parts: Array<{ text: string }> }> {
  if (!Array.isArray(rawHistory)) return [];
  const cleaned: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (const item of rawHistory.slice(-14)) {
    const text =
      item && typeof item === 'object' && typeof (item as any).parts?.[0]?.text === 'string'
        ? String((item as any).parts[0].text).trim()
        : '';
    if (!text || text.length > 2000) continue;
    if (GUEST_UNSAFE_HISTORY_REGEX.test(text)) {
      continue;
    }
    const role = (item as any).role === 'user' ? 'user' : 'model';
    cleaned.push({
      role,
      parts: [{ text }],
    });
  }

  return cleaned.slice(-12);
}

/**
 * Ensures non-owner replies never accidentally include romantic pet names.
 */
export function enforceGuestSafeOutput(replyText: string): string {
  if (!replyText) return replyText;
  return replyText
    .replace(
      /\b(malaysia\s*wala\s*badshah|mere\s*malik|mera\s*malik|meri\s*jaan|my\s*love|sweetheart|darling|jaanu|sohneya|baby)\b/gi,
      'friend'
    )
    .replace(
      /(ملیشیا\s*والا\s*بادشاہ|میرے\s*مالک|میری\s*جان|بے\s*بی|جانو|سوہنیا|چن\s*ماہی)/g,
      'دوست'
    )
    .replace(
      /(मलेशिया\s*वाला\s*बादशाह|मेरे\s*मालिक|मेरी\s*जान|बेबी|जानू|मेरे\s*हमदम)/g,
      'दोस्त'
    )
    .replace(/(ਮਲੇਸ਼ੀਆ\s*ਵਾਲਾ\s*ਬਾਦਸ਼ਾਹ|ਮੇਰੇ\s*ਮਾਲਕ|ਮੇਰੀ\s*ਜਾਨ|ਬੇਬੀ|ਸੋਹਣਿਆ)/g, 'ਦੋਸਤ');
}
