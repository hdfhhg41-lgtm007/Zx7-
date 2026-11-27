import {
  AlarmScheduleItem,
  Language,
  MemoryItem,
  SettingsTabId,
} from '../types';
import { format24To12Hour, getMobileClockSnapshot } from './scheduleAndMemoryService';

// ======================== NETWORK ONLINE / OFFLINE MONITOR ========================

const networkListeners = new Set<(online: boolean) => void>();
let networkHookInitialized = false;

function ensureNetworkHooks() {
  if (networkHookInitialized || typeof window === 'undefined') return;
  networkHookInitialized = true;
  const emit = () => {
    const online = isAppOnline();
    networkListeners.forEach((cb) => {
      try {
        cb(online);
      } catch {}
    });
  };
  window.addEventListener('online', emit);
  window.addEventListener('offline', emit);
}

export function isAppOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export function subscribeNetworkStatus(cb: (online: boolean) => void): () => void {
  ensureNetworkHooks();
  networkListeners.add(cb);
  cb(isAppOnline());
  return () => {
    networkListeners.delete(cb);
  };
}

// ======================== MOBILE HARDWARE LED FLASHLIGHT / TORCH ========================

let torchStream: MediaStream | null = null;
let torchTrack: MediaStreamTrack | null = null;
let flashlightActive = false;
const torchListeners = new Set<(active: boolean) => void>();

function notifyTorchListeners() {
  torchListeners.forEach((cb) => {
    try {
      cb(flashlightActive);
    } catch {}
  });
}

export function getFlashlightState(): boolean {
  return flashlightActive;
}

export function subscribeFlashlightState(cb: (active: boolean) => void): () => void {
  torchListeners.add(cb);
  cb(flashlightActive);
  return () => {
    torchListeners.delete(cb);
  };
}

export function detectFlashlightCommand(
  text: string
): { action: 'on' | 'off' | 'toggle' } | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  const mentionsTorch =
    /\b(flashlight|flash\s*light|torch|led\s*light)\b/i.test(lower) ||
    /(ٹارچ|فلیش\s*لائٹ|موبائل\s*لائٹ|टॉर्च|फ्लैशलाइट|फ्लैश\s*लाइट|मोबाइल\s*लाइट)/i.test(lower);
  if (!mentionsTorch) return null;

  if (
    /\b(off|close|stop|band|bujha)\b/i.test(lower) ||
    /(بند|آف|بجھا|बंद|ऑफ|बुझा)/i.test(lower)
  ) {
    return { action: 'off' };
  }
  if (
    /\b(on|open|start|jala|chalu|chala)\b/i.test(lower) ||
    /(آن|کھول|چلا|جلا|ऑन|जला|चालू|चला)/i.test(lower)
  ) {
    return { action: 'on' };
  }
  return { action: 'toggle' };
}

export async function toggleMobileFlashlight(
  forceState?: boolean
): Promise<{ ok: boolean; active: boolean; message: string }> {
  const target = typeof forceState === 'boolean' ? forceState : !flashlightActive;

  // Native Android Companion Bridge fast-path if installed
  if (typeof window !== 'undefined' && (window as any).ZaraAndroidBridge?.setFlashlight) {
    try {
      const ok = Boolean((window as any).ZaraAndroidBridge.setFlashlight(target));
      if (ok) {
        flashlightActive = target;
        notifyTorchListeners();
        return {
          ok: true,
          active: target,
          message: target ? 'Mobile LED Flashlight ON ✓' : 'Mobile LED Flashlight OFF ✓',
        };
      }
    } catch {}
  }

  if (!target) {
    if (torchTrack) {
      try {
        await (torchTrack as any).applyConstraints({ advanced: [{ torch: false }] });
      } catch {}
      try {
        torchTrack.stop();
      } catch {}
      torchTrack = null;
    }
    if (torchStream) {
      torchStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      torchStream = null;
    }
    flashlightActive = false;
    notifyTorchListeners();
    return { ok: true, active: false, message: 'Mobile LED Flashlight OFF ✓' };
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      active: false,
      message: 'Camera/Torch hardware API unavailable in this browser.',
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    const track = stream.getVideoTracks()[0];
    if (!track) {
      stream.getTracks().forEach((t) => t.stop());
      return { ok: false, active: false, message: 'Rear camera LED track not found.' };
    }

    await (track as any).applyConstraints({ advanced: [{ torch: true }] });
    torchStream = stream;
    torchTrack = track;
    flashlightActive = true;
    notifyTorchListeners();
    return { ok: true, active: true, message: 'Mobile LED Flashlight ON ✓' };
  } catch {
    return {
      ok: false,
      active: false,
      message: 'Allow Camera permission on Android Chrome to control hardware LED Torch.',
    };
  }
}

// ======================== ZARA INTERNAL SETTINGS & UI AUTO-OPENER ========================

export interface ZaraInternalUiAction {
  kind: 'open_settings_tab' | 'open_chat' | 'open_mobile_hub';
  tabId?: SettingsTabId;
  label: string;
  spokenUrduHindi: string;
}

export function detectZaraInternalUiCommand(text: string): ZaraInternalUiAction | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  // Do NOT intercept if user is asking a question ("kaun si setting", "kya update aaya", "batao")
  if (
    /\b(kaun\s*sa|kaun\s*si|konsa|konsi|kya\s+hai|kya\s+update|what\s+update|tell\s+me|explain|batao|bataye|bata\s*do)\b/i.test(
      lower
    ) ||
    /(کون\s*سا|کون\s*سی|کیا\s*اپڈیٹ|بتاؤ|بتائیں|कौन\s*सा|कौन\s*सी|क्या\s*अपडेट|बताओ|बताइए)/i.test(
      lower
    )
  ) {
    return null;
  }

  // Do NOT intercept third-party app settings like "WhatsApp ki setting kholo" unless specifically Social Hub
  if (
    (/\b(whatsapp|youtube|instagram|facebook|tiktok|snapchat|telegram|chrome|gmail|maps|play\s*store|spotify|netflix)\b/i.test(
      lower
    ) ||
      /(واٹس\s*ایپ|یوٹیوب|انسٹاگرام|فیس\s*بک|ٹک\s*ٹاک|کروم|व्हाट्सएप|यूट्यूब|इंस्टाग्राम|फेसबुक|क्रोम)/i.test(
        lower
      )) &&
    !/\bsocial\s*hub\b/i.test(lower)
  ) {
    return null;
  }

  const hasOpenCue =
    /\b(open|kholo|khol|khol\s*do|dikhao|show|chalu|on\s*karo|lagao|laga\s*do|jao)\b/i.test(
      lower
    ) || /(کھولو|کھول\s*دو|دکھاؤ|اوپن|چلاؤ|لگاؤ|खोलो|खोल\s*दो|दिखाओ|ओपन|लगाओ|चलाओ)/i.test(lower);

  if (!hasOpenCue) return null;

  // 1. Chat Drawer
  if (
    /\b(chat\s*(box|panel|screen|history|window)?|zara\s*chat|apni\s*chat)\b/i.test(lower) ||
    /(چیٹ\s*(باکس|پینل|ہسٹری)?|زارا\s*چیٹ|चैट\s*(बॉक्स|पैनल|हिस्ट्री)?|ज़ारा\s*चैट)/i.test(lower)
  ) {
    return {
      kind: 'open_chat',
      label: 'Zara Chat Drawer',
      spokenUrduHindi: 'जी! मैंने ज़ारा का चैट पैनल खोल दिया है!',
    };
  }

  // 4. Specific Zara Settings Tabs
  if (
    /\b(romance\s*setting|love\s*setting|gf\s*setting|girlfriend\s*setting)\b/i.test(lower) ||
    /(رومانس\s*سیٹنگ|پیار\s*کی\s*سیٹنگ|रोमांस\s*सेटिंग|प्यार\s*की\s*सेटिंग)/i.test(lower)
  ) {
    return {
      kind: 'open_settings_tab',
      tabId: 'romance',
      label: 'Zara Settings → Romance Mode',
      spokenUrduHindi: 'जी! मैंने ज़ारा की रोमांस और मूड सेटिंग्स खुद-ब-खुद खोल दी हैं!',
    };
  }

  if (
    /\b(zara\s*security|owner\s*login|owner\s*verify|face\s*lock\s*setting|pin\s*setting)\b/i.test(
      lower
    ) ||
    /(اونر\s*لاگ\s*ان|اونر\s*ویریفائی|فیس\s*لاک|ओनर\s*लॉगिन|ओनर\s*वेरिफाई|फेस\s*लॉक)/i.test(lower)
  ) {
    return {
      kind: 'open_settings_tab',
      tabId: 'security',
      label: 'Zara Settings → Security & Owner Verify',
      spokenUrduHindi: 'जी! मैंने ज़ारा की सिक्योरिटी और ओनर वेरिफिकेशन सेटिंग खोल दी है!',
    };
  }

  if (
    /\b(alarm\s*setting|schedule\s*setting|zara\s*alarm)\b/i.test(lower) ||
    /(الارم\s*سیٹنگ|شیڈول\s*سیٹنگ|अलार्म\s*सेटिंग|शेड्यूल\s*सेटिंग)/i.test(lower)
  ) {
    return {
      kind: 'open_settings_tab',
      tabId: 'schedule',
      label: 'Zara Settings → Alarms & Schedule',
      spokenUrduHindi: 'जी! मैंने ज़ारा की अलार्म और डेली शेड्यूल सेटिंग खोल दी है!',
    };
  }

  if (
    /\b(memory\s*setting|memories|yaadein|zara\s*memory)\b/i.test(lower) ||
    /(یادیں|میموری\s*سیٹنگ|यादें|मेमोरी\s*सेटिंग)/i.test(lower)
  ) {
    return {
      kind: 'open_settings_tab',
      tabId: 'memory',
      label: 'Zara Settings → 100+ Days Memories',
      spokenUrduHindi: 'जी! मैंने ज़ारा की 100+ दिन की प्राइवेट मेमोरी सेटिंग खोल दी है!',
    };
  }

  if (
    /\b(profile\s*setting|voice\s*setting|avatar\s*setting|language\s*setting|zara\s*profile)\b/i.test(
      lower
    ) ||
    /(پروفائل\s*سیٹنگ|آواز\s*کی\s*سیٹنگ|زبان\s*کی\s*سیٹنگ|प्रोफाइल\s*सेटिंग|आवाज़\s*सेटिंग|भाषा\s*सेटिंग)/i.test(
      lower
    )
  ) {
    return {
      kind: 'open_settings_tab',
      tabId: 'profile',
      label: 'Zara Settings → Profile & Voice',
      spokenUrduHindi: 'जी! मैंने ज़ारा की प्रोफाइल, भाषा और वॉइस सेटिंग खोल दी है!',
    };
  }

  if (
    /\b(diagnostic\s*setting|health\s*setting|zara\s*checkup)\b/i.test(lower) ||
    /(ڈائگنوسٹک|ہیلتھ\s*چیک|डायग्नोस्टिक|हेल्थ\s*चेक)/i.test(lower)
  ) {
    return {
      kind: 'open_settings_tab',
      tabId: 'diagnostics',
      label: 'Zara Settings → System Diagnostics',
      spokenUrduHindi: 'जी! मैंने ज़ारा और मोबाइल का फुल सिस्टम चेकअप पैनल खोल दिया है!',
    };
  }

  if (
    /\b(mobile\s*control\s*hub|all\s*apps\s*panel|phone\s*control\s*panel)\b/i.test(lower) ||
    /(موبائل\s*کنٹرول\s*پینل|فون\s*کنٹرول\s*پینل|मोबाइल\s*कंट्रोल\s*पैनल|फोन\s*कंट्रोल\s*पैनल)/i.test(
      lower
    )
  ) {
    return {
      kind: 'open_mobile_hub',
      label: 'Mobile Apps & System Settings Hub',
      spokenUrduHindi: 'जी! मैंने पूरे मोबाइल कंट्रोल और ऐप्स सेटिंग्स का हब खुद-ब-खुद खोल दिया है!',
    };
  }

  // 5. General "Zara ki setting kholo" / "Apni setting kholo" / "App ki setting kholo"
  if (
    /\b(zara\s*(app\s*)?(ki\s*)?setting(s)?|apni\s*setting(s)?|all\s*controls\s*setting)\b/i.test(
      lower
    ) ||
    /(زارا\s*(ایپ\s*)?(کی\s*)?سیٹنگ|اپنی\s*سیٹنگ|ज़ारा\s*(ऐप\s*)?(की\s*)?सेटिंग|अपनी\s*सेटिंग)/i.test(
      lower
    )
  ) {
    return {
      kind: 'open_settings_tab',
      tabId: 'controls',
      label: 'Zara Settings → All Controls',
      spokenUrduHindi:
        'जी! मैंने ज़ारा ऐप की मुख्य सेटिंग्स (All Controls) खुद-ब-खुद खोल दी हैं — यहाँ सारे कंट्रोल, ऐप्स, सिक्योरिटी, अलार्म और अपडेट्स मौजूद हैं!',
    };
  }

  return null;
}

// ======================== ZARA SELF-KNOWLEDGE, UPDATES & PUBLIC LAUNCH ADVISOR ========================

export const ZARA_SELF_KNOWLEDGE_PROMPT_BLOCK = `
=== ZARA PERSONAL AI ASSISTANT ARCHITECTURE ===
You are Zara, a focused single Personal AI Assistant for Android & web.
Core capabilities:
1. Natural Audio Call & Voice Conversation: One clean Audio Call system with speaker voice output and "Hey Zara" background wake-word service (foreground notification with Turn OFF button).
2. Full Phone & Social Media Control: Open installed Android apps (WhatsApp, YouTube, Instagram, Facebook, TikTok, Telegram, Snapchat, X/Twitter, Spotify, Chrome, Maps, Settings) and Android system settings (Wi-Fi, Bluetooth, Hotspot, Display, Sound, Battery, Accessibility, Permissions), plus Flashlight.
3. YouTube Song Search & Play: Search and open any requested song directly on YouTube or YouTube Music and control playback/volume.
4. WhatsApp & Phone Calls with Confirmation: Identify contact, prepare message preview, ask for user confirmation first, and send only after confirmation.
5. Alarms, Reminders & Memories: Keep alarms/schedules and saved memories organized safely.
`;

export function detectZaraSelfUpdateOrSettingsQuestion(
  text: string
): { topic: string; replyText: string } | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  const mentionsUpdateOrFeature =
    /\b(kaun\s*sa\s*update|konsa\s*update|kya\s*update|new\s*update|latest\s*update|zara\s*(ki|mein)\s*setting\s*batao|apni\s*setting\s*batao)\b/i.test(
      lower
    ) ||
    /(کون\s*سا\s*اپڈیٹ|کیا\s*اپڈیٹ|اپنی\s*سیٹنگ\s*بتاؤ|कौन\s*सा\s*अपडेट|क्या\s*अपडेट|अपनी\s*सेटिंग\s*बताओ)/i.test(
      lower
    );

  if (!mentionsUpdateOrFeature) return null;

  return {
    topic: 'zara_personal_assistant_guide',
    replyText:
      `Main Zara hoon — aapki Personal AI Assistant:\n` +
      `• Ek saaf Audio Call button (sunne aur buland aawaz mein bolne ke liye)\n` +
      `• "Hey Zara" background wake-word service (notification aur Turn OFF control ke saath)\n` +
      `• YouTube par koi bhi song search aur play karna\n` +
      `• WhatsApp message contact check aur aapki confirmation ke baad send karna\n` +
      `• Instagram, Facebook, TikTok, Telegram, YouTube aur phone settings control karna.`,
  };
}

// ======================== OFFLINE LOCAL BRAIN (WORKS WITH ZERO INTERNET) ========================

export interface OfflineBrainInput {
  userText: string;
  language: Language;
  isOwnerVerified: boolean;
  userNickname: string;
  loveMode: boolean;
  schedules?: AlarmScheduleItem[];
  memories?: MemoryItem[];
}

export async function runOfflineZaraBrain(
  input: OfflineBrainInput
): Promise<{ replyText: string }> {
  const raw = (input.userText || '').trim();
  const lower = raw.toLowerCase();
  const clock = getMobileClockSnapshot();
  const nick =
    input.isOwnerVerified && input.userNickname && input.userNickname !== 'Friend'
      ? input.userNickname
      : 'Friend';

  const selfInfo = detectZaraSelfUpdateOrSettingsQuestion(raw);
  if (selfInfo) {
    return { replyText: selfInfo.replyText };
  }

  if (
    /\b(time|waqt|date|tarikh|tareekh|kitne\s*baje|kya\s*time)\b/i.test(lower) ||
    /(ٹائم|وقت|تاریخ|کتنے\s*بجے|टाइम|समय|तारीख|कितने\s*बजे)/i.test(lower)
  ) {
    return {
      replyText: `Abhi time ${clock.shortTime12} hai aur aaj ki date ${clock.dateLabel} hai.`,
    };
  }

  const mathMatch = raw.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/x×÷%])\s*(-?\d+(?:\.\d+)?)/);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let ans: number | null = null;
    if (op === '+') ans = a + b;
    else if (op === '-') ans = a - b;
    else if (op === '*' || op === 'x' || op === '×') ans = a * b;
    else if ((op === '/' || op === '÷') && b !== 0) ans = Number((a / b).toFixed(4));
    else if (op === '%') ans = (a * b) / 100;

    if (ans !== null && Number.isFinite(ans)) {
      return {
        replyText: `Hisab ka sahi jawab ${ans} hai.`,
      };
    }
  }

  if (
    /\b(alarm|schedule|reminder)\b/i.test(lower) ||
    /(الارم|شیڈول|अलार्म|शेड्यूल)/i.test(lower)
  ) {
    const activeScheds = (input.schedules || []).filter((s) => s.enabled);
    if (activeScheds.length > 0) {
      const summary = activeScheds
        .slice(0, 4)
        .map((s) => `${format24To12Hour(s.time24)} (${s.label})`)
        .join(', ');
      return {
        replyText: `Aapke active alarms set hain: ${summary}.`,
      };
    }
  }

  if (!input.isOwnerVerified) {
    const asksRomance =
      /\b(love|pyar|pyaar|kiss|hug|romance|romantic|girlfriend|gf|baby|jaan|sexy)\b/i.test(
        lower
      ) || /(پیار|محبت|رومانس|گرل\s*فرینڈ|بے\s*بی|प्यार|रोमांस|गर्लफ्रेंड|बेबी)/i.test(lower);
    if (asksRomance) {
      return {
        replyText:
          'Main aapki Personal AI Assistant hoon — phone apps, YouTube songs, WhatsApp messages aur daily kaam mein madad kar sakti hoon.',
      };
    }
  }

  return {
    replyText: `Ji ${nick}! Abhi internet offline hai, lekin main phone apps, YouTube, alarms aur local commands handle kar sakti hoon.`,
  };
}
