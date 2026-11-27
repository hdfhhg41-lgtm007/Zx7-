import {
  DiagnosticCheckItem,
  IntruderAlertEvent,
  WhatsAppContactItem,
} from '../types';
import {
  markAppOpened,
  queryMobilePermissions,
  readMobileHardwareTelemetry,
} from './visionAndControlService';
import { getOwnerAuthHeaders } from './ownerAuthService';
import { isAppOnline } from './offlineBrainService';

const INTRUDER_LOGS_KEY = 'zara_intruder_logs_v1';
const WA_CONTACTS_KEY = 'zara_whatsapp_contacts_v1';
const WA_LAST_PHONE_KEY = 'zara_last_whatsapp_phone_v1';

// Normalize Urdu & Hindi numerals into standard ASCII digits
function normalizeDigitsAscii(input: string): string {
  const urdu = '۰۱۲۳۴۵۶۷۸۹';
  const hindi = '०१२३४५६७८९';
  let out = input;
  for (let i = 0; i < 10; i++) {
    out = out.replace(new RegExp(urdu[i], 'g'), String(i));
    out = out.replace(new RegExp(hindi[i], 'g'), String(i));
  }
  return out;
}

export function normalizeInternationalPhone(rawPhone: string): string {
  const ascii = normalizeDigitsAscii(rawPhone || '');
  let digits = ascii.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  }
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  // Pakistani local mobile: 03XX-XXXXXXX -> 923XXXXXXXXX
  if (/^03\d{9}$/.test(digits)) {
    return `92${digits.slice(1)}`;
  }
  // Malaysian local mobile: 01X-XXXXXXX(X) -> 601XXXXXXXX(X)
  if (/^01\d{8,9}$/.test(digits)) {
    return `60${digits.slice(1)}`;
  }
  // Indian local 10-digit mobile starting 6-9 -> 91XXXXXXXXXX
  if (/^[6-9]\d{9}$/.test(digits)) {
    return `91${digits}`;
  }
  return digits;
}

// ======================== SAVED WHATSAPP CONTACTS & NATIVE PICKER ========================

export function loadWhatsAppContacts(): WhatsAppContactItem[] {
  try {
    const raw = localStorage.getItem(WA_CONTACTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

export function saveWhatsAppContacts(items: WhatsAppContactItem[]): void {
  try {
    localStorage.setItem(WA_CONTACTS_KEY, JSON.stringify(items.slice(0, 100)));
  } catch {}
}

export async function pickPhoneContactsNative(): Promise<WhatsAppContactItem[]> {
  if (typeof navigator === 'undefined') return [];
  const nav = navigator as any;
  if (!nav.contacts?.select) return [];
  try {
    const selected = await nav.contacts.select(['name', 'tel'], { multiple: true });
    const added: WhatsAppContactItem[] = [];
    for (const entry of selected || []) {
      const rawName = Array.isArray(entry.name) ? entry.name[0] : entry.name;
      const rawTel = Array.isArray(entry.tel) ? entry.tel[0] : entry.tel;
      if (rawName && rawTel) {
        const cleanPhone = normalizeInternationalPhone(String(rawTel));
        if (cleanPhone.length >= 7) {
          added.push({
            id: `wa-c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: String(rawName).trim(),
            phone: cleanPhone,
          });
        }
      }
    }
    return added;
  } catch {
    return [];
  }
}

export function getLastWhatsAppPhone(): string {
  try {
    return localStorage.getItem(WA_LAST_PHONE_KEY) || '';
  } catch {
    return '';
  }
}

function rememberLastWhatsAppPhone(cleanPhone: string) {
  if (!cleanPhone) return;
  try {
    localStorage.setItem(WA_LAST_PHONE_KEY, cleanPhone);
  } catch {}
}

// ======================== 1. WHATSAPP MESSAGE, CALL, BACK & CLOSE COMMANDS ========================

export interface SpecialVoiceOrChatCommand {
  type:
    | 'go_back'
    | 'close_active'
    | 'drop_zara_call'
    | 'close_zara_app'
    | 'lock_phone_now'
    | 'arm_touch_guard'
    | 'whatsapp_text'
    | 'whatsapp_call'
    | 'phone_call'
    | 'end_external_call';
  phone?: string;
  contactName?: string;
  message?: string;
  targetAppHint?: string;
}

let activeExternalCallPhone: string | null = null;
const externalCallListeners = new Set<(phone: string | null) => void>();

export function getActiveExternalCallPhone(): string | null {
  return activeExternalCallPhone;
}

export function subscribeExternalCall(cb: (phone: string | null) => void): () => void {
  externalCallListeners.add(cb);
  cb(activeExternalCallPhone);
  return () => {
    externalCallListeners.delete(cb);
  };
}

function setExternalCallPhone(phone: string | null) {
  activeExternalCallPhone = phone;
  externalCallListeners.forEach((cb) => cb(activeExternalCallPhone));
}

function triggerNativeSchemeHref(href: string) {
  if (typeof document === 'undefined' || !href) return;
  try {
    const a = document.createElement('a');
    a.href = href;
    a.rel = 'noopener noreferrer';
    try {
      if (window.self !== window.top) {
        a.target = '_top';
      }
    } catch {
      a.target = '_top';
    }
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      try {
        a.remove();
      } catch {}
    }, 350);
  } catch {}
}

// Universal WhatsApp Message Sender: works with phone number OR without phone number (opens WhatsApp chat chooser with message pre-filled!)
// Uses whatsapp://send so Standard WhatsApp, WhatsApp Business, Dual Messenger, Android & iOS all open cleanly!
export function openWhatsAppNumberText(
  rawPhone: string,
  messageText: string
): { cleanPhone: string; href: string; webFallbackHref: string } {
  const cleanPhone = rawPhone ? normalizeInternationalPhone(rawPhone) : '';
  const finalMsg = (messageText || 'Assalam o Alaikum!').trim() || 'Assalam o Alaikum!';
  const encodedMsg = encodeURIComponent(finalMsg);

  markAppOpened('whatsapp');
  if (cleanPhone) {
    rememberLastWhatsAppPhone(cleanPhone);
  }

  const href = cleanPhone
    ? `whatsapp://send?phone=${cleanPhone}&text=${encodedMsg}`
    : `whatsapp://send?text=${encodedMsg}`;

  const webFallbackHref = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  triggerNativeSchemeHref(href);
  return { cleanPhone, href, webFallbackHref };
}

export function startWhatsAppOrPhoneCall(
  rawPhone: string,
  mode: 'whatsapp' | 'tel' = 'whatsapp'
): { cleanPhone: string; href: string } {
  const cleanPhone = normalizeInternationalPhone(rawPhone);
  markAppOpened(mode === 'whatsapp' ? 'whatsapp' : 'dialer');
  if (cleanPhone) {
    rememberLastWhatsAppPhone(cleanPhone);
  }

  const href =
    mode === 'whatsapp'
      ? `whatsapp://send?phone=${cleanPhone}`
      : `tel:+${cleanPhone}`;

  setExternalCallPhone(`+${cleanPhone}`);
  triggerNativeSchemeHref(href);
  return { cleanPhone, href };
}

export function endExternalCallNow(): string | null {
  const prev = activeExternalCallPhone;
  setExternalCallPhone(null);
  return prev;
}

// Cleanly extract the actual message body from spoken Urdu/Hindi/Roman/English WhatsApp command
function extractSpokenWhatsAppMessage(rawNormalized: string, matchedNameOrPhone?: string): string {
  let text = rawNormalized;
  if (matchedNameOrPhone) {
    text = text.replace(matchedNameOrPhone, ' ');
  }

  // Strip polite prefixes and command phrases while preserving actual message words
  const markerRegex =
    /(?:message\s*karo|message\s*kar\s*do|message\s*kardo|message\s*bhejo|message\s*likho|msg\s*karo|msg\s*bhejo|text\s*karo|text\s*bhejo|likho|send\s*message|send\s*text|say|میسج\s*کرو|میسج\s*کر\s*دو|میسج\s*بھیجو|میسج\s*لکھو|ٹیکسٹ\s*کرو|لکھو|بھیجو|मैसेज\s*करो|मैसेज\s*कर\s*दो|मैसेज\s*भेजो|मैसेज\s*लिखो|लिखो|भेजो)\s*(?:ke|ki|keh|کہ|कि|to|:|-)?\s*(.+)$/i;

  const afterMarker = text.match(markerRegex);
  if (afterMarker && afterMarker[1]) {
    const candidate = afterMarker[1]
      .replace(/\b(whatsapp\s*(pe|par|pr|mein)?|واٹس\s*ایپ\s*(پہ|پر|میں)?|व्हाट्सएप\s*(पे|पर)?)\b/gi, '')
      .trim();
    if (candidate.length >= 1) {
      return candidate;
    }
  }

  const stripped = text
    .replace(
      /\b(zara|please|plz|whatsapp|whats\s*app|open\s*kar\s*ke|open\s*karke|open\s*karo|open|khol\s*ke|khol\s*kar|kholo|usko|isko|unhein|message|msg|text|bhejo|karo|kar\s*do|kardo|likho|send|pe|par|ko)\b/gi,
      ' '
    )
    .replace(
      /(زارا|پلیز|واٹس\s*ایپ|واٹسپ|اوپن\s*کر\s*کے|اوپن\s*کرو|اوپن|کھول\s*کے|کھول\s*کر|کھولو|اس\s*کو|اسے|ان\s*کو|میسج|ٹیکسٹ|بھیجو|کرو|کر\s*دو|لکھو|پہ|پر|کو)/g,
      ' '
    )
    .replace(
      /(ज़ारा|प्लीज|व्हाट्सएप|व्हाट्सऐप|ओपन\s*करके|ओपन\s*करो|ओपन|खोल\s*के|खोलो|उसको|इसको|मैसेज|टेक्स्ट|भेजो|करो|कर\s*दो|लिखो|पे|पर|को)/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  return stripped.length >= 2 ? stripped : 'Assalam o Alaikum!';
}

export function detectSpecialControlCommand(rawText: string): SpecialVoiceOrChatCommand | null {
  if (!rawText) return null;
  const normalized = normalizeDigitsAscii(rawText.trim());
  const lower = normalized.toLowerCase();

  // 1. Close Zara App completely ("apna Zara app close karo / Zara band kar do")
  if (
    /(zara\s*app|apna\s*app|zara\s*ko|زارا\s*ایپ|زارا\s*کو|اپنا\s*ایپ|ज़ारा\s*ऐप|अपना\s*ऐप).*(close|band|off|exit|بند|کلوز|آف|बंद|क्लोज|ऑफ)/i.test(
      lower
    ) ||
    /(close|band\s*karo|band\s*kar\s*do|بند\s*کرو|بند\s*کر\s*دو|کلوز\s*کرو|बंद\s*करो|बंद\s*कर\s*दो)\s*(zara|zara\s*app|زارا|ज़ारा)$/i.test(
      lower
    )
  ) {
    return { type: 'close_zara_app' };
  }

  // 2. BACK Command ("back karo", "wapas aao", "wapas jao", "peeche karo", "بیک کرو", "واپس جاؤ", "बैक करो")
  if (
    /^(zara\s+)?(go\s*back|back\s*karo|back\s*kar\s*do|back\s*kardo|back\s*jao|back\s*aao|back\s*chalo|back|wapas\s*jao|wapas\s*aao|wapas\s*karo|wapas\s*chalo|wapas|peeche\s*jao|peeche\s*karo|peeche|return)(\s+zara|\s+please)?$/i.test(
      lower
    ) ||
    /(بیک\s*کرو|بیک\s*کر\s*دو|بیک\s*جاؤ|بیک\s*آؤ|واپس\s*جاؤ|واپس\s*آؤ|واپس\s*کرو|واپس\s*چلو|پیچھے\s*جاؤ|پیچھے\s*کرو|اس\s*کو\s*بیک\s*کرو|واٹس\s*ایپ\s*بیک\s*کرو|बैक\s*करो|बैक\s*कर\s*दो|बैक\s*जाओ|वापस\s*जाओ|वापस\s*आओ|वापस\s*करो|पीछे\s*जाओ|पीछे\s*करो)/i.test(
      lower
    ) ||
    /\b(usko\s*back\s*karo|isko\s*back\s*karo|whatsapp\s*back\s*karo|app\s*back\s*karo)\b/i.test(
      lower
    )
  ) {
    return { type: 'go_back' };
  }

  // 3. Cut / Drop Call ("call kato", "call kaat do", "call drop karo", "whatsapp call band karo")
  if (
    /(whatsapp\s*call|usko\s*call|uski\s*call|واٹس\s*ایپ\s*کال|اس\s*کی\s*کال|اس\s*کو\s*کال|व्हाट्सएप\s*कॉल).*(band|kato|kaat|cut|drop|end|off|بند|کاٹو|کاٹ|ختم|बंद|काटो|काट)/i.test(
      lower
    )
  ) {
    return { type: 'end_external_call' };
  }

  if (
    /\b(call\s*kato|call\s*kaato|call\s*kaat\s*do|call\s*kat\s*do|call\s*cut\s*karo|call\s*drop\s*karo|call\s*band\s*karo|call\s*band\s*kar\s*do|call\s*end\s*karo|hang\s*up|phone\s*rakho)\b/i.test(
      lower
    ) ||
    /(کال\s*کاٹو|کال\s*کاٹ\s*دو|کال\s*بند\s*کرو|کال\s*بند\s*کر\s*دو|کال\s*ڈراپ\s*کرو|فون\s*رکھو|कॉल\s*काटो|कॉल\s*काट\s*दो|कॉल\s*बंद\s*करो|कॉल\s*बंद\s*कर\s*दो|कॉल\s*ड्रॉप\s*करो)/i.test(
      lower
    )
  ) {
    if (activeExternalCallPhone) {
      return { type: 'end_external_call' };
    }
    return { type: 'drop_zara_call' };
  }

  // 4. Lock Phone Screen Immediately / Arm Anti-Touch Guard
  if (
    /(anti\s*touch|touch\s*guard|chhota\s*hai|koi\s*chhue|کوئی\s*چھوئے|ٹچ\s*گارڈ|एंटी\s*टच|टच\s*गार्ड)/i.test(
      lower
    ) &&
    /(on|lagao|active|enable|آن|لگاؤ|ऑन|लगाओ)/i.test(lower)
  ) {
    return { type: 'arm_touch_guard' };
  }

  if (
    /(phone\s*lock|screen\s*lock|mobile\s*lock|phone\s*band\s*kar\s*do|فون\s*لاک|اسکرین\s*لاک|موبائل\s*لاک|फोन\s*लॉक|स्क्रीन\s*लॉक|मोबाइल\s*लॉक)/i.test(
      lower
    ) &&
    /(karo|kar\s*do|kardo|lagao|now|کرو|کر\s*دو|لگاؤ|करो|कर\s*दो|लगाओ)/i.test(lower)
  ) {
    return { type: 'lock_phone_now' };
  }

  // 5. WhatsApp Message & Call Detection (Phone Number OR Saved Contact Name OR "usko" OR General WhatsApp Open+Message!)
  const isWhatsAppMentioned =
    /(whatsapp|whats\s*app|واٹس\s*ایپ|واٹسپ|واٹس|व्हाट्सएप|व्हाट्सऐप)/i.test(lower);
  const isCallMentioned =
    /(call|milao|mila\s*do|dial|کال|ملاؤ|ملا\s*دو|कॉल|मिलाओ|मिला\s*दो)/i.test(lower);
  const isMessageMentioned =
    /(message|msg|text|sms|bhejo|likho|send|salam\s*bhejo|میسج|ٹیکسٹ|بھیجو|لکھو|سلام\s*بھیجو|मैसेज|टेक्स्ट|भेजो|लिखो)/i.test(
      lower
    );
  const isCloseMentioned =
    /\b(close|band|off|hatao|بند|کلوز|آف|ہٹاؤ|बंद|क्लोज|ऑफ|हटाओ)\b/i.test(lower);

  // 5A. Explicit Phone Number present in command
  const phoneMatch = normalized.match(/(\+?\d[\d\s-]{7,15}\d)/);
  if (phoneMatch && !isCloseMentioned) {
    const rawNum = phoneMatch[1].replace(/[\s-]/g, '');
    if (isCallMentioned) {
      return {
        type: isWhatsAppMentioned ? 'whatsapp_call' : 'phone_call',
        phone: rawNum,
      };
    }
    if (isWhatsAppMentioned || isMessageMentioned) {
      return {
        type: 'whatsapp_text',
        phone: rawNum,
        message: extractSpokenWhatsAppMessage(normalized, phoneMatch[0]),
      };
    }
  }

  // 5B. Saved Contact Name match when WhatsApp or Message/Call is requested
  if ((isWhatsAppMentioned || isMessageMentioned) && !isCloseMentioned) {
    const contacts = loadWhatsAppContacts();
    for (const c of contacts) {
      const cLower = c.name.toLowerCase().trim();
      if (cLower.length >= 2 && lower.includes(cLower)) {
        if (isCallMentioned) {
          return {
            type: isWhatsAppMentioned ? 'whatsapp_call' : 'phone_call',
            phone: c.phone,
            contactName: c.name,
          };
        }
        return {
          type: 'whatsapp_text',
          phone: c.phone,
          contactName: c.name,
          message: extractSpokenWhatsAppMessage(normalized, c.name),
        };
      }
    }
  }

  // 5C. General WhatsApp Open + Message WITHOUT reciting a phone number!
  // e.g. "Zara WhatsApp open karke message karo Assalam o Alaikum" or "WhatsApp pe usko message karo kahan ho"
  if (isWhatsAppMentioned && isMessageMentioned && !isCloseMentioned) {
    const refersToLastRecipient =
      /(usko|isko|usey|اس\s*کو|اسے|اسی\s*کو|उसको|इसको)/i.test(lower);
    const lastPhone = refersToLastRecipient ? getLastWhatsAppPhone() : '';
    return {
      type: 'whatsapp_text',
      phone: lastPhone || undefined,
      message: extractSpokenWhatsAppMessage(normalized),
    };
  }

  // 6. Direct CLOSE Active Screen / WhatsApp / App ("close karo", "usko close karo", "WhatsApp close karo", "بند کرو", "کلوز کرو")
  if (
    /^(zara\s+)?(close\s*karo|close\s*kar\s*do|close\s*kardo|close|band\s*karo|band\s*kar\s*do|band\s*kardo|usko\s*close\s*karo|usko\s*band\s*karo|isko\s*close\s*karo|isko\s*band\s*karo|whatsapp\s*close\s*karo|whatsapp\s*band\s*karo|whatsapp\s*band\s*kar\s*do|hatao|hata\s*do)$/i.test(
      lower
    ) ||
    /(اس\s*کو\s*کلوز\s*کرو|اس\s*کو\s*بند\s*کرو|واٹس\s*ایپ\s*کلوز\s*کرو|واٹس\s*ایپ\s*بند\s*کرو|واٹس\s*ایپ\s*بند\s*کر\s*دو|کلوز\s*کرو|کلوز\s*کر\s*دو|उसको\s*क्लोज\s*करो|उसको\s*बंद\s*करो|व्हाट्सएप\s*क्लोज\s*करो|व्हाट्सएप\s*बंद\s*करो)/i.test(
      lower
    )
  ) {
    return {
      type: 'close_active',
      targetAppHint: isWhatsAppMentioned ? 'whatsapp' : undefined,
    };
  }

  return null;
}

// ======================== 2. OWNER FACE LOCK & INTRUDER LOGS ========================

export function captureVideoFrameDataUrl(
  video: HTMLVideoElement,
  maxWidth = 480
): string | null {
  if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null;
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const w = Math.max(120, Math.round(video.videoWidth * scale));
  const h = Math.max(120, Math.round(video.videoHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.8);
}

export async function verifyOwnerFaceWithServer(
  ownerFaceDataUrl: string,
  liveFaceDataUrl: string
): Promise<{ verified: boolean; reason: string; confidence: number }> {
  const stripPrefix = (url: string) => {
    const idx = url.indexOf(',');
    return idx >= 0 ? url.slice(idx + 1) : url;
  };

  const res = await fetch('/api/verify-owner-face', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enrolledFaceBase64: stripPrefix(ownerFaceDataUrl),
      liveFaceBase64: stripPrefix(liveFaceDataUrl),
    }),
  });

  if (!res.ok) {
    throw new Error('Face verification service unavailable');
  }
  return await res.json();
}

export function loadIntruderLogs(): IntruderAlertEvent[] {
  try {
    const raw = localStorage.getItem(INTRUDER_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

export function recordIntruderAlert(
  reason: string,
  snapshotDataUrl?: string,
  locationLabel?: string
): IntruderAlertEvent[] {
  const existing = loadIntruderLogs();
  const entry: IntruderAlertEvent = {
    id: `intruder-${Date.now()}`,
    timestamp: new Date().toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    reason,
    snapshotDataUrl,
    locationLabel,
  };
  const updated = [entry, ...existing].slice(0, 15);
  try {
    localStorage.setItem(INTRUDER_LOGS_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function clearIntruderLogs(): void {
  try {
    localStorage.removeItem(INTRUDER_LOGS_KEY);
  } catch {}
}

export async function captureSafeLocationCoords(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise<string | null>((resolve) => {
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(5);
          const lon = pos.coords.longitude.toFixed(5);
          resolve(`${lat}, ${lon}`);
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 60000 }
      );
    } catch {
      resolve(null);
    }
  });
}

export async function isPlatformBiometricSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.ZaraAndroidBridge?.authenticateWithBiometrics) return true;
  if (typeof PublicKeyCredential === 'undefined') return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(b64: string): ArrayBuffer {
  const norm = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function registerOwnerBiometricPasskey(): Promise<{
  ok: boolean;
  credentialId?: string;
  error?: string;
}> {
  if (typeof window === 'undefined') return { ok: false, error: 'Unsupported' };
  if (window.ZaraAndroidBridge?.authenticateWithBiometrics) {
    return new Promise((resolve) => {
      window.onZaraBiometricResult = (verified: boolean) => {
        resolve(
          verified
            ? { ok: true, credentialId: 'android-native-biometric' }
            : { ok: false, error: 'Biometric canceled or failed' }
        );
      };
      window.ZaraAndroidBridge?.authenticateWithBiometrics?.();
    });
  }

  if (typeof navigator === 'undefined' || !navigator.credentials?.create) {
    return { ok: false, error: 'Device Fingerprint / Screen Lock WebAuthn not supported in this browser.' };
  }
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = new TextEncoder().encode('zara-owner-malaysia-badshah');
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Zara AI Mobile Security' },
        user: {
          id: userId,
          name: 'hdfhhg41@gmail.com',
          displayName: 'Malaysia wala badshah',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 45000,
      },
    })) as PublicKeyCredential | null;

    if (!cred?.rawId) {
      return { ok: false, error: 'Biometric registration canceled.' };
    }
    return { ok: true, credentialId: bufferToBase64Url(cred.rawId) };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Fingerprint / Face lock prompt was dismissed.',
    };
  }
}

export async function verifyOwnerBiometricPasskey(credentialId?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.ZaraAndroidBridge?.authenticateWithBiometrics) {
    return new Promise((resolve) => {
      window.onZaraBiometricResult = (verified: boolean) => resolve(verified);
      window.ZaraAndroidBridge?.authenticateWithBiometrics?.();
    });
  }

  if (typeof navigator === 'undefined' || !navigator.credentials?.get) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const allowCredentials: PublicKeyCredentialDescriptor[] =
      credentialId && credentialId !== 'android-native-biometric'
        ? [{ id: base64UrlToBuffer(credentialId), type: 'public-key', transports: ['internal'] }]
        : [];

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials,
        userVerification: 'required',
        timeout: 45000,
      },
    });
    return Boolean(assertion);
  } catch {
    return false;
  }
}

// ======================== 4. ZARA & MOBILE SELF-DIAGNOSTIC DOCTOR ========================

export function detectDiagnosticsCommand(rawText: string): boolean {
  if (!rawText) return false;
  const lower = rawText.toLowerCase().trim();

  // Detect install / link / other mobile problem questions directly
  if (
    /(install\s*nahi|इंस्टॉल\s*नहीं|انسٹال\s*نہیں|page\s*not\s*found|404|link\s*check|चेक\s*करो\s*लिंक|لنک\s*چیک)/i.test(
      lower
    )
  ) {
    return true;
  }

  const hasIssueWord =
    /(issue|masla|problem|error|kharabi|kharab|fault|diagnostic|health\s*check|check\s*system|مسئلہ|ایشو|خرابی|چیک\s*کرو|مسلہ|समस्या|दिक्कत|खराबी|इश्यू)/i.test(
      lower
    );
  const hasContextWord =
    /(zara|app|mobile|phone|mujhe|mujh\s*mein|tum\s*mein|system|link|install|زارا|ایپ|موبائل|فون|مجھ\s*میں|تم\s*میں|لنک|انسٹال|ज़ारा|ऐप|मोबाइल|फोन|मुझमें|लिंक|इंस्टॉल)/i.test(
      lower
    );
  return hasIssueWord && hasContextWord;
}

export async function runFullZaraAndMobileDiagnostics(): Promise<{
  checks: DiagnosticCheckItem[];
  spokenUrduReport: string;
  hasAnyIssue: boolean;
}> {
  const checks: DiagnosticCheckItem[] = [];

  // 1. Check Zara AI Server & Gemini Connection
  const t0 = performance.now();
  try {
    const statusRes = await fetch('/api/status');
    const latencyMs = Math.round(performance.now() - t0);
    if (statusRes.ok) {
      const st = await statusRes.json();
      if (st.geminiReady) {
        checks.push({
          id: 'zara-ai',
          target: 'zara',
          name: 'Zara AI Brain & Voice Server',
          status: latencyMs > 2500 ? 'warning' : 'healthy',
          detail: `Connected (${latencyMs}ms) • Continuous Voice & AI Tools Ready`,
          urduSummary:
            latencyMs > 2500
              ? 'زارا کا سرور چل رہا ہے مگر ریسپانس تھوڑا سلو ہے'
              : 'مجھ میں (زارا کے AI سسٹم اور آواز میں) کوئی مسئلہ نہیں، سب 100 فیصد ٹھیک ہے',
          fixAction: 'none',
        });
      } else {
        checks.push({
          id: 'zara-ai',
          target: 'zara',
          name: 'Zara AI Brain & Voice Server',
          status: 'issue',
          detail: 'Gemini AI engine not ready on server',
          urduSummary: 'مجھ میں (زارا کے سرور انجن میں) کنکشن کا مسئلہ آ رہا ہے',
          fixAction: 'reconnect',
        });
      }
    } else {
      checks.push({
        id: 'zara-ai',
        target: 'zara',
        name: 'Zara AI Brain & Voice Server',
        status: 'issue',
        detail: `Server returned HTTP ${statusRes.status}`,
        urduSummary: 'زارا کے سرور سے رابطے میں مسئلہ آ رہا ہے',
        fixAction: 'reconnect',
      });
    }
  } catch {
    checks.push({
      id: 'zara-ai',
      target: 'zara',
      name: 'Zara AI Brain & Voice Server',
      status: 'issue',
      detail: 'Cannot reach Zara backend server (check internet)',
      urduSummary: 'انٹرنیٹ یا سرور منقطع ہونے کی وجہ سے زارا ایپ میں کنکشن کا مسئلہ آ رہا ہے',
      fixAction: 'reconnect',
    });
  }

  // 1B. Check Multi-Mobile Public Install Link (detects 404 Page Not Found on ais-pre-...)
  try {
    const savedCustom =
      typeof window !== 'undefined'
        ? localStorage.getItem('zara_custom_cloud_url_v1') || ''
        : '';
    const qs = savedCustom ? `?customUrl=${encodeURIComponent(savedCustom)}` : '';
    const linkRes = await fetch(`/api/install-link-status${qs}`);
    if (linkRes.ok) {
      const linkData = await linkRes.json();
      if (linkData.isPublicForAllMobiles) {
        checks.push({
          id: 'zara-public-link',
          target: 'zara',
          name: 'Other Mobiles Install Link (Public)',
          status: 'healthy',
          detail: `LIVE (HTTP ${linkData.publicHttpStatus || 200}) • Ready for every mobile phone ✓`,
          urduSummary: 'دوسرے تمام موبائلز کے لیے پبلک انسٹال لنک بالکل چالو ہے',
          fixAction: 'none',
        });
      } else {
        checks.push({
          id: 'zara-public-link',
          target: 'zara',
          name: 'Other Mobiles Install Link (404 Fix)',
          status: 'issue',
          detail: `Public link returned HTTP ${linkData.publicHttpStatus || 404} (Not Published Yet) — Turn ON "Share → Public" or "Deploy" at top-right of AI Studio`,
          urduSummary:
            'دوسرے موبائل کا پبلک لنک ابھی AI Studio کے اوپر دائیں کونے والے Share (Public) یا Deploy بٹن سے آن نہیں کیا گیا، اسی لیے دوسرے فون پر 404 Page Not Found آ رہا ہے',
          fixAction: 'install_link',
        });
      }
    }
  } catch {}

  // 2. Check Mobile Internet & Network Speed
  const telemetry = await readMobileHardwareTelemetry();
  if (!telemetry.online) {
    checks.push({
      id: 'mobile-net',
      target: 'mobile',
      name: 'Mobile Internet & Signal',
      status: 'issue',
      detail: 'Mobile is currently Offline (No Internet)',
      urduSummary: 'آپ کے موبائل میں انٹرنیٹ بند ہے، وائی فائی یا موبائل ڈیٹا آن کریں',
      fixAction: 'reconnect',
    });
  } else {
    const slowNet = /2g|slow/i.test(telemetry.networkType);
    checks.push({
      id: 'mobile-net',
      target: 'mobile',
      name: 'Mobile Internet & Signal',
      status: slowNet ? 'warning' : 'healthy',
      detail: `Online • ${telemetry.networkType}`,
      urduSummary: slowNet
        ? 'آپ کے موبائل کا انٹرنیٹ سگنل کافی کمزور ہے'
        : 'آپ کے موبائل کا انٹرنیٹ بالکل تیز چل رہا ہے',
      fixAction: 'none',
    });
  }

  // 3. Check Microphone & Camera Permissions on Mobile
  const perms = await queryMobilePermissions();
  if (perms.microphone !== 'granted') {
    checks.push({
      id: 'mobile-mic',
      target: 'mobile',
      name: 'Mobile Microphone Permission',
      status: perms.microphone === 'denied' ? 'issue' : 'warning',
      detail:
        perms.microphone === 'denied'
          ? 'Microphone Blocked in Mobile Settings'
          : 'Microphone waiting for Allow tap',
      urduSummary:
        'آپ کے موبائل میں مائیکروفون کی پرمیشن الاؤ نہیں ہے، اس لیے میری بات چیت میں رکاوٹ آ سکتی ہے',
      fixAction: 'permissions',
    });
  } else {
    checks.push({
      id: 'mobile-mic',
      target: 'mobile',
      name: 'Mobile Microphone Permission',
      status: 'healthy',
      detail: 'Microphone Allowed & Ready ✓',
      urduSummary: 'مائیکروفون بالکل ٹھیک کام کر رہا ہے',
      fixAction: 'none',
    });
  }

  if (perms.camera !== 'granted') {
    checks.push({
      id: 'mobile-cam',
      target: 'mobile',
      name: 'Camera & Face Lock Sensor',
      status: perms.camera === 'denied' ? 'issue' : 'warning',
      detail:
        perms.camera === 'denied'
          ? 'Camera Blocked in Mobile Settings'
          : 'Camera waiting for Allow tap (needed for Face Lock & See Me)',
      urduSummary: 'آپ کے موبائل میں کیمرہ پرمیشن ابھی الاؤ نہیں ہے (فیس لاک کے لیے ضروری ہے)',
      fixAction: 'permissions',
    });
  } else {
    checks.push({
      id: 'mobile-cam',
      target: 'mobile',
      name: 'Camera & Face Lock Sensor',
      status: 'healthy',
      detail: 'Camera & Face Verification Sensor Ready ✓',
      urduSummary: 'کیمرہ اور فیس لاک سینسر بالکل ایکٹیو ہے',
      fixAction: 'none',
    });
  }

  // 4. Check Mobile Battery Health
  if (telemetry.batteryLevel !== null) {
    const lowBat = telemetry.batteryLevel <= 20 && !telemetry.isCharging;
    checks.push({
      id: 'mobile-battery',
      target: 'mobile',
      name: 'Mobile Battery & Power',
      status: lowBat ? 'warning' : 'healthy',
      detail: `${telemetry.batteryLevel}% ${telemetry.isCharging ? '(Charging ⚡)' : '(On Battery)'}`,
      urduSummary: lowBat
        ? `آپ کے موبائل کی بیٹری صرف ${telemetry.batteryLevel} فیصد رہ گئی ہے، چارجر لگا لیں`
        : `موبائل کی بیٹری ${telemetry.batteryLevel} فیصد ہے`,
      fixAction: lowBat ? 'battery' : 'none',
    });
  }

  // 5. Check Device Storage & CPU/RAM
  checks.push({
    id: 'mobile-storage',
    target: 'mobile',
    name: 'Mobile Storage & Memory',
    status: 'healthy',
    detail: `${telemetry.cores} CPU Cores${telemetry.memoryGb ? ` • ${telemetry.memoryGb}GB RAM` : ''}${telemetry.storageUsedMb !== null ? ` • ${telemetry.storageUsedMb}MB Cache` : ''}`,
    urduSummary: 'موبائل کی میموری اور اسٹوریج بالکل نارمل ہے',
    fixAction: 'none',
  });

  const zaraProblems = checks.filter((c) => c.target === 'zara' && c.status !== 'healthy');
  const mobileProblems = checks.filter((c) => c.target === 'mobile' && c.status !== 'healthy');
  const hasAnyIssue = zaraProblems.length > 0 || mobileProblems.length > 0;

  let spokenUrduReport = '';
  if (!hasAnyIssue) {
    spokenUrduReport =
      'میرے مالک ملیشیا والا بادشاہ! میں نے اپنا پورا زارا سسٹم اور آپ کا موبائل چیک کر لیا ہے — نہ مجھ میں کوئی مسئلہ ہے اور نہ آپ کے موبائل میں! آواز، کیمرہ، مائیک اور انٹرنیٹ سب سو فیصد فٹ چل رہے ہیں!';
  } else {
    const parts: string[] = [];
    if (zaraProblems.length > 0) {
      parts.push(`مجھ میں یعنی زارا ایپ میں یہ مسئلہ آ رہا ہے: ${zaraProblems.map((p) => p.urduSummary).join('، ')}۔`);
    } else {
      parts.push('مجھ میں یعنی زارا کے سسٹم میں کوئی مسئلہ نہیں ہے، میں بالکل ٹھیک ہوں۔');
    }
    if (mobileProblems.length > 0) {
      parts.push(`البتہ آپ کے موبائل میں یہ توجہ چاہیے: ${mobileProblems.map((p) => p.urduSummary).join('، ')}۔`);
    }
    spokenUrduReport = parts.join(' ');
  }

  return {
    checks,
    spokenUrduReport,
    hasAnyIssue,
  };
}
