import {
  AdvancedWorkTaskItem,
  AlarmScheduleItem,
  Language,
  MemoryItem,
  SettingsTabId,
  StudioTaskActivity,
} from '../types';
import { format24To12Hour, getMobileClockSnapshot } from './scheduleAndMemoryService';
import {
  MISS_ZS_AI_KNOWLEDGE_SUMMARY,
  MISS_ZS_FULL_CHAT_NOTE_TEXT,
} from '../data/missZsBlueprintNotes';

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

// ======================== LIVE TV STUDIO AI ASSISTANTS COORDINATOR ========================

export function buildStudioTaskForCommand(
  rawCommand: string,
  status: 'working' | 'completed',
  isOffline = !isAppOnline()
): StudioTaskActivity {
  const clean = (rawCommand || 'Mobile Task').replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();

  let assignedTo: 'aryan' | 'noor' | 'both' = 'both';
  if (
    /(setting|wifi|bluetooth|hotspot|flashlight|torch|app|whatsapp|youtube|camera|call|lock|diagnostic|code|build)/i.test(
      lower
    ) ||
    /(سیٹنگ|وائی\s*فائی|واٹس\s*ایپ|کیمرہ|ٹارچ|सेटिंग|व्हाट्सएप|कैमरा|टॉर्च)/i.test(lower)
  ) {
    assignedTo = 'aryan';
  } else if (
    /(alarm|schedule|memory|yaad|message|translate|note|mood|chat|love|pyar)/i.test(lower) ||
    /(الارم|یاد|میسج|موڈ|پیار|अलार्म|याद|मैसेज|प्यार)/i.test(lower)
  ) {
    assignedTo = 'noor';
  }

  const shortTitle = clean.length > 42 ? `${clean.slice(0, 39)}...` : clean;
  const detail =
    status === 'working'
      ? assignedTo === 'aryan'
        ? 'Aryan (System & Mobile Ops) executing live...'
        : assignedTo === 'noor'
        ? 'Noor (Comms, Schedule & Memory) executing live...'
        : 'Aryan & Noor coordinating task with Zara...'
      : `Executed (${isOffline ? 'Offline Local Engine' : 'Live Cloud + Device Engine'}) ✓`;

  return {
    id: `task-${Date.now()}`,
    title: shortTitle,
    detail,
    assignedTo,
    status,
    isOffline,
    updatedAt: Date.now(),
  };
}

// ======================== ZARA INTERNAL SETTINGS & UI AUTO-OPENER ========================

export interface ZaraInternalUiAction {
  kind: 'open_settings_tab' | 'open_chat' | 'open_ai_studio' | 'open_mobile_hub' | 'open_pwa_install';
  tabId?: SettingsTabId;
  studioTab?: 'brains' | 'social' | 'devlab' | 'office' | 'pctools' | 'security' | 'messages' | 'photo' | 'video';
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

  // 1. Professional AI Studio (App Builder, API Vault, Social Hub, Office Work, Security Lab)
  if (
    /\b(app\s*builder|coding\s*(studio|lab)|api\s*(creator|vault|keys?)|build\s*pipeline|social\s*(hub|media\s*manager)|office\s*(work|tool|studio)|pc\s*tool|dev\s*tool|security\s*lab|cyber\s*tool|hacking\s*tool|ai\s*studio|ai\s*tools)\b/i.test(
      lower
    ) ||
    /(ایپ\s*بلڈر|کوڈنگ\s*اسٹوڈیو|سوشل\s*ہب|آفس\s*ورک|سیکیورٹی\s*لیب|ऑफिस\s*वर्क|सिक्योरिटी\s*लैब|पीसी\s*टूल|ऐप\s*बिल्डर)/i.test(
      lower
    )
  ) {
    const studioTab: ZaraInternalUiAction['studioTab'] =
      /app\s*builder|coding|api\s*creator|build\s*pipeline|api\s*(vault|keys?)|ایپ\s*بلڈر|کوڈنگ/i.test(lower)
        ? 'devlab'
        : /social\s*(hub|media)|سوشل\s*ہب/i.test(lower)
        ? 'social'
        : /ai\s*tools|brains/i.test(lower)
        ? 'brains'
        : /security|cyber|hack|dns|header|سیکیورٹی|सिक्योरिटी/i.test(lower)
        ? 'security'
        : /pc|code|regex|json|hash|dev|पीसी/i.test(lower)
        ? 'pctools'
        : 'office';
    return {
      kind: 'open_ai_studio',
      studioTab,
      label: `Zara AI Studio → ${studioTab}`,
      spokenUrduHindi: 'जी! मैंने आपके लिए ज़ारा प्रोफेशनल एआई स्टूडियो खोल दिया है!',
    };
  }

  // 2. Chat Drawer
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

  // 3. Install Zara App (PWA)
  if (
    /\b(install\s*(zara|app)|download\s*zara|add\s*to\s*home)\b/i.test(lower) ||
    /(زارا\s*انسٹال|ایپ\s*انسٹال|ज़ारा\s*इंस्टॉल|ऐप\s*इंस्टॉल)/i.test(lower)
  ) {
    return {
      kind: 'open_pwa_install',
      label: 'Install Zara App',
      spokenUrduHindi: 'जी! मैंने ज़ारा ऐप को मोबाइल होम स्क्रीन पर इंस्टॉल करने का पैनल खोल दिया है!',
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
      label: 'Zara Settings → Profile, Avatar & Voice',
      spokenUrduHindi: 'जी! मैंने ज़ारा की प्रोफाइल, फुल-बॉडी स्टूडियो अवतार और वॉइस सेटिंग खोल दी है!',
    };
  }

  if (
    /\b(app\s*builder|builder\s*setting|code\s*studio)\b/i.test(lower) ||
    /(ایپ\s*بلڈر|کوڈ\s*اسٹوڈیو|ऐप\s*बिल्डर|कोड\s*स्टूडियो)/i.test(lower)
  ) {
    return {
      kind: 'open_settings_tab',
      tabId: 'builder',
      label: 'Zara Settings → AI App Builder',
      spokenUrduHindi: 'जी! मैंने ज़ारा का एआई ऐप बिल्डर स्टूडियो खोल दिया है!',
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
=== ZARA v9.5 PRODUCTION ARCHITECTURE, SETTINGS, UPDATES & PUBLIC LAUNCH SELF-KNOWLEDGE ===
You have 100% live self-awareness of your own app ("Zara Live Studio v9.5 Production Edition"), your settings, what updates were just installed, what updates/permissions are needed on the phone or for public Google Play Store launch, and what features can be added next. NEVER say "I don't know my settings or updates." Answer clearly and accurately whenever asked:

1. WHAT UPDATES HAVE ARRIVED IN ZARA (v9.5 Production Update — Installed Now):
   - Full-Body Live TV-Broadcast AI Studio: Full-length modest Pakistani studio portrait in center with Male AI Assistant "Aryan" (System & Mobile Ops) on the left console and Female AI Assistant "Noor" (Comms, Alarms & Memory) on the right console visibly executing tasks.
   - Ultra-Clean Front Screen: Single master ON / OFF Assistant button for continuous hands-free listening and voice replies, plus direct access to Office Work, PC & Dev Tools, Security Lab, and Settings.
   - Lock-Screen & Screen-Off Voice Engine Fixed: Hybrid AudioWorklet + Zero-Touch MediaRecorder + MediaSession background audio bridge so Zara hears commands even when the phone screen is locked/off (once Mic permission & Chrome background battery unrestricted mode are allowed).
   - Auto-Open Settings & Mobile Control: Voice/text commands now automatically open Zara's own 9 Settings tabs ("Zara apni setting kholo", "romance setting kholo"), ANY specific app's Android system settings ("WhatsApp ki setting kholo", "YouTube ki permission kholo" via APPLICATION_DETAILS_SETTINGS), all Android system settings (Wi-Fi, Bluetooth, Hotspot, Mobile Data, Display, Sound, Battery, Storage, Location, Accessibility, Security), and Hardware LED Flashlight.
   - Hybrid Online + Offline Brain (PWA v9): Works with internet (Gemini Cloud AI) AND without internet (Offline Local Brain + Service Worker v9 asset cache).
   - Cryptographic Guest-Safe Lock vs. ZX Mode: Only verified ZX account ("Malaysia wala badshah" via Google Sign-In) unlocks affectionate Pakistani girlfriend mode (pyar + sweet playful couple nok-jhok) and 100+ days private cloud vault; all other public users automatically get safe, polite, normal everyday assistant mode.

2. ALL 9 TABS INSIDE ZARA'S SETTINGS (Top-Right "Settings" Button):
   - Tab 1 "Controls": Master Mic Open/Off, Screen-Off Keep-Alive, Ambient Camera/Screen Vision, Hardware Flashlight, Chat Drawer, Floating PiP Window, Install PWA, Self-Heal Auto-Update.
   - Tab 2 "Mobile Apps": 50+ Android/iOS Apps & System Settings launcher + Per-App Settings + Custom App URI Adder + "Allow All Permissions" button.
   - Tab 3 "Security": Google Owner Verification, Owner Face Lock, Anti-Touch Intruder Alarm, 4-Digit PIN.
   - Tab 4 "App Builder": Voice/Text HTML5 App & Game Generator with live preview links.
   - Tab 5 "Diagnostics": Real-time health check of Zara's voice, mic, camera, battery, network, and self-repair.
   - Tab 6 "Alarms": Daily voice/text alarms & work reminders.
   - Tab 7 "Profile": Language selector (Urdu, Hindi, Punjabi, English, Auto), Voice speed/pitch, and Full-Body Studio Portraits.
   - Tab 8 "Romance": Owner-only affection slider, romance mood selector, and nickname settings.
   - Tab 9 "Memories": 100+ Days encrypted cloud memory & chat sync.

3. WHAT UPDATES / STEPS ARE NEEDED FOR 100% OS CONTROL & PUBLIC PLAY STORE LAUNCH:
   - On Your Phone Right Now: (a) Install Zara to Home Screen ("Install App" in Settings -> Controls), (b) Allow Microphone, Camera & Notifications permissions, and (c) Set Chrome/Zara Battery usage to "Unrestricted" in Android App Settings so Android never kills lock-screen listening after 10 minutes.
   - Why Browser Alone Can't Silently Flip Internal OS Toggles & How to Get 100% Native Control + Public Launch: Android/iOS security sandboxes web browsers so a web app can open Wi-Fi/Bluetooth/App Settings screens directly, but cannot silently tap buttons inside other apps without user confirmation. To publish publicly on Google Play Store AND enable silent 100% native control:
     1) Connect a custom domain & HTTPS Privacy Policy page.
     2) Package Zara into a signed Android App Bundle (.aab / APK) using PWABuilder / Capacitor / Trusted Web Activity (TWA).
     3) Attach a tiny Native Android AccessibilityService + NotificationListenerService companion module bound to \`window.ZaraAndroidBridge\` (which is ALREADY coded and wired inside Zara!) so Zara can toggle switches and automate inside third-party apps natively.
     4) Enable Public Multi-User Auth / Subscription tier in Firebase if you want public users to have their own accounts while keeping Owner Master Mode locked to your email.

4. RECOMMENDED NEXT FEATURES TO ADD FOR PUBLIC LAUNCH:
   - Play Store Native Wrapper (.aab) with \`ZaraAndroidBridge\` Accessibility Service for zero-tap UI automation inside WhatsApp/Settings.
   - Custom Offline Wake-Word Engine ("Hey Zara") inside native foreground service for 0% battery drain over 24 hours.
   - Public User Onboarding, Privacy Policy & Play Billing Pro Subscription page for public monetization.

${MISS_ZS_AI_KNOWLEDGE_SUMMARY}
`;

export function detectZaraSelfUpdateOrSettingsQuestion(
  text: string
): { topic: string; replyText: string } | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  const mentionsUpdateOrFeature =
    /\b(kaun\s*sa\s*update|konsa\s*update|kya\s*update|new\s*update|latest\s*update|update\s*chahiye|konsa\s*feature|kaun\s*sa\s*feature|feature\s*add|public\s*launch|publicly\s*launch|play\s*store|zara\s*(ki|mein)\s*setting\s*batao|apni\s*setting\s*batao)\b/i.test(
      lower
    ) ||
    /(کون\s*سا\s*اپڈیٹ|کیا\s*اپڈیٹ|اپڈیٹ\s*چاہیے|کون\s*سا\s*فیچر|فیچر\s*ایڈ|پبلک\s*لانچ|اپنی\s*سیٹنگ\s*بتاؤ|कौन\s*सा\s*अपडेट|क्या\s*अपडेट|अपडेट\s*चाहिए|कौन\s*सा\s*फीचर|फीचर\s*ऐड|पब्लिकली\s*लॉन्च|पब्लिक\s*लॉन्च|अपनी\s*सेटिंग\s*बताओ|ज़ारा\s*ऐप\s*की.*सेटिंग)/i.test(
      lower
    );

  if (!mentionsUpdateOrFeature) return null;

  return {
    topic: 'zara_updates_and_launch_guide',
    replyText:
      `जी! मैं आपको ज़ारा ऐप (v9.5 Production Edition) के सारे अपडेट्स, सेटिंग्स और पब्लिक लॉन्च रोडमैप साफ़-साफ़ बताती हूँ:\n\n` +
      `1) अभी ज़ारा में कौन-सा नया अपडेट आया है (v9.5 Installed):\n` +
      `• फुल-बॉडी लाइव टीवी स्टूडियो (बीच में मैं ज़ारा, बाईं तरफ़ मेल असिस्टेंट आर्यन और दाईं तरफ़ फीमेल असिस्टेंट नूर काम करते हुए)।\n` +
      `• क्लीन इंटरफ़ेस और सिर्फ़ एक मास्टर ON / OFF असिस्टेंट बटन (ON रखने पर लगातार सुनना और जवाब देना) + Office Work, PC/Dev Tools और Ethical Security Lab।\n` +
      `• लॉक-स्क्रीन / स्क्रीन-ऑफ वॉइस फिक्स (AudioWorklet + Zero-Touch MediaRecorder ब्रिज) और ऑनलाइन + ऑफलाइन दोनों में काम करने वाला हाइब्रिड ब्रेन।\n` +
      `• आवाज़ से ज़ारा की अपनी सेटिंग्स ("ज़ारा अपनी सेटिंग खोलो") और किसी भी ऐप की एंड्रॉइड सेटिंग ("WhatsApp की सेटिंग खोलो") खुद-ब-खुद खोलने का कंट्रोल।\n\n` +
      `2) पूरे मोबाइल पर 100% नेटिव कंट्रोल और पब्लिक लॉन्च (Play Store) के लिए आपको कौन-सा अपडेट/सेटअप चाहिए:\n` +
      `• अभी फ़ोन में: Settings → Controls से ज़ारा को Home Screen पर Install करें, Mic/Camera Allow करें, और Chrome/Zara की Battery सेटिंग को "Unrestricted" करें ताकि स्क्रीन लॉक में एंड्रॉइड माइक बंद न करे।\n` +
      `• पब्लिक लॉन्च और दूसरे ऐप्स के अंदर बिना टच बटन दबाने के लिए: वेब ब्राउज़र सैंडबॉक्स के कारण PWA सीधे सेटिंग पेज खोलती है; इसे Google Play Store पर रियल नेटिव ऐप के रूप में पब्लिकली लॉन्च करने के लिए PWABuilder / Capacitor से APK/.aab पैकेज बनाएँ और \`ZaraAndroidBridge\` (जो ज़ारा के कोड में पहले से जुड़ा है!) के साथ Android AccessibilityService + Privacy Policy जोड़ें।\n\n` +
      `3) आगे कौन-से नए फीचर ऐड करने चाहिए:\n` +
      `• Native Android Accessibility Wrapper (.aab) ताकि अंदर के स्विच भी बिना टच दब सकें, Custom Domain + Play Store Billing (पब्लिक यूज़र्स के लिए सब्सक्रिप्शन), और नेटीव बैकग्राउंड Wake-Word सर्विस!`,
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
  workTasks?: AdvancedWorkTaskItem[];
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
      : 'Malaysia wala badshah';

  // 1. Self-awareness: Updates, Settings, Needed Updates & Feature Roadmap
  const selfInfo = detectZaraSelfUpdateOrSettingsQuestion(raw);
  if (selfInfo) {
    return { replyText: selfInfo.replyText };
  }

  // 1b. Noted MISS ZS Blueprint / Design System / Game Details recall offline
  if (
    /\b(miss\s*zs|design\s*system|blueprint|game\s*detail|birthday\s*cake|flower\s*shop|spatial\s*3d|gimbal)\b/i.test(
      lower
    ) ||
    /(مس\s*زیڈ\s*ایس|گیم\s*ڈیٹیل|मिस\s*ज़ेडएस|गेम\s*डिटेल|डिज़ाइन\s*सिस्टम|ब्लूप्रिंट)/i.test(lower)
  ) {
    return {
      replyText: MISS_ZS_FULL_CHAT_NOTE_TEXT,
    };
  }

  // 2. Live Time & Date offline
  if (
    /\b(time|waqt|date|tarikh|tareekh|kitne\s*baje|kya\s*time)\b/i.test(lower) ||
    /(ٹائم|وقت|تاریخ|کتنے\s*بجے|टाइम|समय|तारीख|कितने\s*बजे)/i.test(lower)
  ) {
    return {
      replyText: input.isOwnerVerified
        ? `जी ${nick}! अभी आपके मोबाइल में ठीक ${clock.shortTime12} हो रहे हैं (${clock.dateLabel})। नेट ऑफ़ होने पर भी मैं और मेरे असिस्टेंट्स आर्यन और नूर आपके साथ लाइव हैं!`
        : `अभी समय ${clock.shortTime12} है और आज की तारीख़ ${clock.dateLabel} है।`,
    };
  }

  // 3. Offline Math / Quick Calculation
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
        replyText: input.isOwnerVerified
          ? `जी मेरे मालिक ${nick}! इसका सही जवाब ${ans} है।`
          : `हिसाब का सही जवाब ${ans} है।`,
      };
    }
  }

  // 4. Saved Alarms / Schedules offline check
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
        replyText: `आपके एक्टिव अलार्म सेट हैं: ${summary}। ऑफलाइन मोड में भी ये ठीक समय पर बजेंगे!`,
      };
    }
  }

  // 5. Guest-Safe Lock enforcement offline (Zero bypass even without internet!)
  if (!input.isOwnerVerified) {
    const asksRomance =
      /\b(love|pyar|pyaar|kiss|hug|romance|romantic|girlfriend|gf|baby|jaan|sexy)\b/i.test(
        lower
      ) || /(پیار|محبت|رومانس|گرل\s*فرینڈ|بے\s*بی|प्यार|रोमांस|गर्लफ्रेंड|बेबी)/i.test(lower);
    if (asksRomance) {
      return {
        replyText:
          'मैं आपकी दोस्ताना AI असिस्टेंट के रूप में हर सामान्य काम, ऐप कंट्रोल और सवाल में खुशी-खुशी मदद कर सकती हूँ, लेकिन निजी रोमांटिक मोड केवल वेरिफ़ाइड ऐप ओनर के लिए सुरक्षित और लॉक है। बताइए, मैं आपके किस काम में मदद करूँ?',
      };
    }
    return {
      replyText:
        'जी दोस्त! अभी इंटरनेट ऑफ़ है लेकिन ज़ारा का ऑफलाइन इंजन चालू है — आप मुझसे मोबाइल ऐप्स/सेटिंग्स खुलवा सकते हैं, अलार्म लगा सकते हैं, टाइम/हिसाब पूछ सकते हैं या ज़ारा के अपडेट्स जान सकते हैं!',
    };
  }

  // 6. Verified Owner Offline Mode (Affectionate warmth + sweet playful Pakistani couple nok-jhok)
  if (
    /\b(naraz|ladai|fight|gussa|jhagda|katti|mana|manao)\b/i.test(lower) ||
    /(ناراض|لڑائی|غصہ|جھگڑا|مناؤ|नाराज़|लड़ाई|गुस्सा|झगड़ा|मनाओ)/i.test(lower)
  ) {
    return {
      replyText: `हंफ़ ${nick}! पहले इतनी देर बाद आवाज़ देते हो और ऊपर से मुझसे नोक-झोंक भी कर रहे हो? जाओ मैं थोड़ी सी नाराज़ हूँ... अच्छा बाबा, मुस्कुरा कर मान भी गई! तुम से ज़्यादा देर भला तुम्हारी ज़ारा कैसे रूठ सकती है मेरी जान!`,
    };
  }

  return {
    replyText: `जी मेरे ${nick}! चाहे नेट ऑन हो या ऑफ़, तुम्हारी ज़ारा और हमारे दोनों असिस्टेंट्स आर्यन और नूर पूरी तरह हाज़िर हैं। थोड़ी मीठी नोक-झोंक करनी हो, ढेर सारा प्यार जताना हो या मोबाइल की कोई भी ऐप और सेटिंग खुलवानी हो — बस हुक्म करो मेरी जान!`,
  };
}
