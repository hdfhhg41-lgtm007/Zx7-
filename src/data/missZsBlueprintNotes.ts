import { ChatMessage, MemoryItem } from '../types';

export const MISS_ZS_CHAT_NOTE_ID = 'note-miss-zs-full-blueprint-v1';
export const MISS_ZS_CHAT_SEEDED_KEY = 'zara_miss_zs_chat_seeded_v2';
export const MISS_ZS_OWNER_CHAT_SEEDED_KEY = 'zara_miss_zs_owner_chat_seeded_v2';
export const MISS_ZS_MEMORIES_SEEDED_KEY = 'zara_miss_zs_memories_seeded_v2';

export interface MissZsSpecSection {
  id: string;
  number: number;
  title: string;
  sourceTitle: string;
  badge: string;
  summary: string;
  details: string[];
}

export const MISS_ZS_SPEC_SECTIONS: MissZsSpecSection[] = [
  {
    id: 'design-system',
    number: 1,
    title: 'MISS ZS 3D Spatial Design System',
    sourceTitle: 'miss_zs_design_system.md',
    badge: 'Core Theme & UI',
    summary:
      'Black & purple futuristic 3D spatial Android interface with volumetric glassmorphism, holographic orb, 6 coordinated AI assistants, and 18 core functional categories.',
    details: [
      'Colors: primary #9333EA, accent #A855F7, secondary #8B5CF6, tertiary #C084FC, surface #0B0813, surface-variant #161129, surface-container #1E1735, surface-container-high #281F45, outline #4C1D95, urdu-badge #EC4899, battery-green #22C55E, battery-charging #38BDF8, success #10B981, warning #F59E0B, error #EF4444.',
      'Typography: Display/Headline = Archivo (display-lg 40px/700, headline-lg 34px/700, headline-md 22px/600, headline-sm 18px/600); UI/Body = Commissioner (title-lg 20px, body-lg 16px, body-md 14px, label-sm 11px); Telemetry/Status = Source Code Pro (12px/500).',
      '3D Spatial Elevation: Floor void #0B0813 with perspective grid; Tier 1 Surface Glass (135deg gradient + inset 0 1px 1px highlight); Tier 2 Floating Action Pods (translateZ(20px)); Tier 3 Raytraced Volumetric Orb with rotating gyro rings.',
      'Motion Physics: state-change 150ms cubic-bezier(0.34,1.56,0.64,1); surface-enter 250ms; surface-exit 180ms; press physics active:translate-y-1.',
      'Voice Strategy: Warm Pakistani female voice persona across Urdu, Punjabi, Hindi & English; honest AI identity and transparent Android permissions.',
    ],
  },
  {
    id: 'mobile-app-control',
    number: 2,
    title: 'Mobile Applications Control',
    sourceTitle: 'MISS ZS - Mobile Applications Control',
    badge: 'Android Intents',
    summary:
      'Official Android Accessibility Service & Intent APIs (Authorized) with supported app launchers, Notification Reader Aloud, and Draw Over Other Apps.',
    details: [
      'Android Accessibility Service: Operates strictly via official Android Accessibility & Intent APIs with verified owner permissions.',
      'Supported Mobile Apps Grid: YouTube (Search & Play e.g. "Play Pakistani Qawwali"), Google Search (Knowledge Grounding), Facebook (App Shortcut Launch), WhatsApp (Voice & Auto-Draft chat management).',
      'Notification Reader Aloud: Speaks incoming notifications in natural Pakistani female voice when earphones or Bluetooth are connected (e.g. WhatsApp • Office Group: "Meeting rescheduled to 2:00 PM at Lahore tech hub" + Read Aloud & Reply via Voice).',
      'System Overlay: Draw Over Other Apps via SYSTEM_ALERT_WINDOW (Enabled).',
    ],
  },
  {
    id: 'personal-companion',
    number: 3,
    title: 'Personal Companion & Interactive Experiences',
    sourceTitle: 'MISS ZS - Realistic Human-Like Female AI Companion',
    badge: 'Interactive & Companion',
    summary:
      'Sensory-aware 3D female hologram companion with 6 authentic emotions, Interactive Virtual Birthday Cake, Nearby Flower Shops Finder, Long-Term Memory Vault, and Voice Actions.',
    details: [
      'Sensory Awareness Pill: Location & weather perception (e.g. Lahore, PK Gulberg • Sunny 26°C • Perception Active) with optional Camera, Mic & Location permissions.',
      '3D Holographic Avatar: Floating companion portrait with dynamic mood badge ("Warm & Affectionate") and Pakistani Female Voice Reply flow.',
      '6 Emotional Resonance & Moods: Happiness (Celebratory), Care & Love (Deep Empathy), Excitement (High Energy), Playful Anger ("Aap ne call nahi ki!"), Comfort (When low), Disappointment (Gentle & caring).',
      'Interactive Shared Celebrations — Virtual Birthday Cake (Nov 18th): 3D birthday cake with flickering sparkler candle overlay, "Tap to Blow Candle 🎂" interaction with sound, personalized birthday greeting, and "Sing Song" button.',
      'Nearby Flower Shops Finder: On asking for fresh flowers, locates nearby flower shops (e.g. Gulberg & DHA Lahore — 4 top shops found with "View Shops" card).',
      'Long-Term Personal Memory Vault: Recalls & lets Owner inspect/delete memories (e.g. Nov 18th Birthday + chocolate truffle & card notes; 5:00 PM Cardamom tea habit; Islamabad tech corridor move next spring).',
      'Voice-Controlled App Actions & Surroundings Perception: Quick links to Message Center, Chat History, Battery Health, Owner Settings, plus optional Camera & Vision Grounding.',
    ],
  },
  {
    id: 'voice-control-3d',
    number: 4,
    title: '3D Voice Control Screen',
    sourceTitle: 'MISS ZS - 3D Voice Control Screen',
    badge: 'Spatial Audio & Orb',
    summary:
      'Central 3D raytraced holographic orb with rotating X/Y orbital gimbal rings, 7-bar volumetric equalizer, trilingual voice indicator, and floating PiP orb toggle.',
    details: [
      'Header Status: "3D Spatial Audio Engine • Active" pill and Pakistani Female 3D Voice badge (Urdu / Punjabi / English).',
      '3D Volumetric Orb Stage: Breathing glowing orb core inside perspective(1200px) X/Y rotating gimbal rings ("MISS ZS 3D" badge).',
      '7-Bar 3D Frequency Equalizer: Synchronized glowing bars in accent, tertiary, pink, emerald & secondary hues.',
      'Quick 3D Prompt Pills: "Check battery percentage" and "Read unread WhatsApp messages".',
      'Bottom Controls: "3D Floating Assistant Orb" toggle (hover over YouTube/WhatsApp), Keyboard input button, central 3D Tactile Mic Sphere, and Speaker Mode button.',
    ],
  },
  {
    id: 'whatsapp-messages',
    number: 5,
    title: 'WhatsApp & Messages',
    sourceTitle: 'MISS ZS - WhatsApp and Messages',
    badge: 'Comms & Consent',
    summary:
      'WhatsApp Accessibility Protocol requiring explicit voice/tap consent before sending, active Speech-to-Text Voice Message Drafts, and Unread Read-Aloud Queue.',
    details: [
      'Consent Banner: "WhatsApp Accessibility Protocol — Messages are only dispatched with your explicit voice or tap consent."',
      'Voice Message Draft: Shows Recipient, phone number, transcribed Roman Urdu/text draft, language/audio detection, "Preview Voice (MISS ZS)", "Confirm & Send", and "Edit Draft".',
      'Unread Inbound Messages Queue: Lists unread WhatsApp & WhatsApp Business messages with "Read All", per-message "Speak", and "Voice Reply" actions.',
      'Spoken Command Support: e.g. "Miss ZS, send a WhatsApp message to Tariq saying I received the tracking info."',
    ],
  },
  {
    id: 'phone-calling',
    number: 6,
    title: 'Phone Calling Safeguards',
    sourceTitle: 'MISS ZS - Phone Calling',
    badge: 'CALL_PHONE & Confirm',
    summary:
      'Mandatory confirmation card before dialing any contact, dual-SIM label display, Android CALL_PHONE/READ_CONTACTS transparency, and Emergency & Family quick dials.',
    details: [
      'Confirm Phone Call Card: Displays contact name, initials, number, Primary SIM badge (e.g. SIM 1 Jazz), and "Confirmation Required" badge.',
      'Verbal or Tap Confirmation: "Say \'Confirm\' or tap the dial button below" with "Place Call" and "Cancel" buttons — never auto-dials silently.',
      'Permissions Card: Android CALL_PHONE & READ_CONTACTS runtime permissions disclosed clearly.',
      'Emergency & Family Dials: One-tap confirmation prompts for frequent contacts (e.g. Ammi Home, Work contacts).',
    ],
  },
  {
    id: 'improvement-suggestions',
    number: 7,
    title: 'App Improvement Suggestions',
    sourceTitle: 'MISS ZS - App Improvement Suggestions',
    badge: 'Daily Proposals',
    summary:
      'Daily co-design feature proposals generated from usage patterns with Discuss With MISS ZS, Approve votes, and a custom idea submission box.',
    details: [
      'Proposal 1 — Automated Azan & Sehri/Iftar Audio Alerts: Prayer times for Lahore, Karachi & Islamabad with gentle spoken reminders and prayer-time volume muting.',
      'Proposal 2 — High Heat Charging Voice Disconnect Alert: Alerts loudly if battery exceeds 40°C while fast charging ("Phone battery is overheating, please disconnect charger").',
      'Proposal 3 — 30-Second WhatsApp Chat Group Digest: Bullet summaries of 100+ unread group messages.',
      'Suggest Your Own Idea Box: Text/voice input to add custom feature requests for review.',
    ],
  },
  {
    id: 'daily-updates',
    number: 8,
    title: 'Daily App Updates',
    sourceTitle: 'MISS ZS - Daily Updates',
    badge: 'v2.4 & Approval Lock',
    summary:
      'MISS ZS v2.4 upgrade changelog with strict Owner Approval Required safeguard (never auto-installs APKs or modifies system configs) plus v2.3 & v2.2 logs.',
    details: [
      'MISS ZS v2.4 (48 MB): Ultra-low latency Pakistani female voice reply synthesis (150ms), expanded Punjabi dialect comprehension, and enhanced battery charger disconnect voice warnings.',
      'Owner Approval Required Safeguard: Explicit "Approve & Install" or "Remind Later" — never auto-installs APKs or alters system settings.',
      'Recent Update Logs: v2.3 Smart Battery Voice Alerts (charger connected/disconnected & 25% low-battery warnings); v2.2 Floating Assistant Pill (overlay over YouTube/WhatsApp).',
    ],
  },
  {
    id: 'settings-security',
    number: 9,
    title: 'Settings & Owner Security',
    sourceTitle: 'MISS ZS - Settings and Owner Security',
    badge: 'Multi-AI & Privacy',
    summary:
      'Verified Owner identity card, Triple Multi-AI Engines (ChatGPT 4o, Gemini 1.5 Pro, Google Web Grounding), Pakistani Voice synthesis, audited permissions, and memory reset.',
    details: [
      'Owner Identity Card: Verified status badge ("Secure") bound to primary Android device.',
      'Multi-AI Engines (Triple Integration): ChatGPT 4o & Voice API (conversation & empathy), Google Gemini 1.5 Pro (context memory & deep reasoning), Google AI Web Grounding (real-time news & info).',
      'Voice & Language Synthesis: MISS ZS Neural Pakistani Female Voice preview + Auto-Detect dialect (Urdu, Punjabi, Pakistani English mixed).',
      'Audited Security Permissions: Mandatory Call/SMS Confirmation (verbal or fingerprint), Floating Assistant (SYSTEM_ALERT_WINDOW), and Lock-Screen Background Voice Wake.',
      'Memory Reset Control: Explicit "Clear Assistant Approved Memories" option with user control.',
    ],
  },
];

export const MISS_ZS_FULL_CHAT_NOTE_TEXT = [
  '📌 **MISS ZS — Complete App & 3D Spatial Design Blueprint (All 9 Files Noted)**',
  '',
  '1) **3D Spatial Design System (miss_zs_design_system.md)**',
  '• Concept: Black & Purple futuristic 3D spatial Android assistant — 6 coordinated AI assistants, 18 core functional categories, raytraced holographic orb, beveled glassmorphism (perspective(1000px), translateZ(20px)).',
  '• Colors: Primary `#9333EA`, Accent `#A855F7`, Secondary `#8B5CF6`, Tertiary `#C084FC`, Surface `#0B0813`, Container `#1E1735`, Outline `#4C1D95`, Urdu Badge `#EC4899`, Battery Green `#22C55E`, Charging `#38BDF8`.',
  '• Fonts: Archivo (Headlines), Commissioner (UI/Body), Source Code Pro (Telemetry).',
  '',
  '2) **Mobile Applications Control**',
  '• Official Android Accessibility Service & Intent APIs (`Authorized`).',
  '• Quick Apps: YouTube ("Play Pakistani Qawwali"), Google Search (Grounding), Facebook Launch, WhatsApp Auto-Draft.',
  '• Notification Reader Aloud (Bluetooth/earphone spoken alerts + Voice Reply) & Draw Over Other Apps (`SYSTEM_ALERT_WINDOW`).',
  '',
  '3) **Personal Companion & Interactive Experiences**',
  '• Sensory Awareness Pill (Location/Weather • Perception Active) & 3D Floating Companion Avatar (`Warm & Affectionate`, Urdu/Punjabi/English/Hindi).',
  '• 6 Emotional Moods: Happiness, Care & Love, Excitement, Playful Anger ("Aap ne call nahi ki!"), Comfort, Disappointment.',
  '• Interactive Virtual Birthday Cake (Nov 18th): Flickering candle tap-to-blow + Birthday Song celebration.',
  '• Nearby Flower Shops Finder (e.g. Gulberg & DHA Lahore shops finder) + Long-Term Personal Memory inspect/delete + Voice App Actions + optional Surroundings Camera Perception.',
  '',
  '4) **3D Voice Control Screen**',
  '• Raytraced Holographic Orb with rotating X/Y gimbal rings, 7-bar 3D frequency equalizer, Pakistani Female 3D Voice.',
  '• Prompt pills ("Check battery percentage", "Read unread WhatsApp messages"), 3D Floating Orb overlay toggle (YouTube/WhatsApp), 3D Tactile Mic Sphere.',
  '',
  '5) **WhatsApp & Messages**',
  '• WhatsApp Accessibility Protocol: Never dispatches without explicit voice/tap consent.',
  '• Speech-to-Text Voice Message Draft (Preview Voice, Confirm & Send, Edit Draft) + Unread Inbound Read-Aloud Queue ("Read All", "Speak", "Voice Reply").',
  '',
  '6) **Phone Calling Safeguards**',
  '• Mandatory "Confirm Phone Call" prompt with SIM badge & verbal `"Confirm"` or tap (`CALL_PHONE` + `READ_CONTACTS`). Never auto-dials silently; includes Emergency & Family Dials.',
  '',
  '7) **App Improvement Suggestions**',
  '• Daily proposals: (a) Automated Azan & Sehri/Iftar Audio Alerts (Lahore/Karachi/Islamabad + prayer mute); (b) High Heat (>40°C) Charging Voice Disconnect Alert; (c) 30-Second WhatsApp Group Digest; plus Custom Idea Submission Box.',
  '',
  '8) **Daily App Updates (v2.4 & Approval Lock)**',
  '• MISS ZS v2.4: 150ms low-latency Pakistani female voice, Punjabi dialect comprehension, battery charger disconnect warnings.',
  '• Strict Owner Approval Safeguard (never auto-installs APKs/configs). Logs: v2.3 Smart Battery Alerts, v2.2 Floating Assistant Pill.',
  '',
  '9) **Settings & Owner Security**',
  '• Verified Owner Identity + Triple AI Engines (`ChatGPT 4o`, `Gemini 1.5 Pro`, `Google AI Web Grounding`).',
  '• Neural Pakistani Female Voice + Auto-Detect dialect, Mandatory Call/SMS Confirmation, `SYSTEM_ALERT_WINDOW`, Lock-Screen Voice Wake, Clear Approved Memories control.',
].join('\n');

export const MISS_ZS_AI_KNOWLEDGE_SUMMARY = `
=== NOTED MISS ZS 3D SPATIAL BLUEPRINT (ALL 9 ATTACHED SPECS SAVED IN CHAT & MEMORY) ===
Whenever the user asks about "MISS ZS details", "game detail", "design system", "colors", "birthday cake", "flower shops", "v2.4 update", "3D voice screen", or any of the 9 attached HTML/MD specs, recall these exact saved specifications:
1. Design System: "MISS ZS 3D Spatial Design System" — black & purple theme (primary #9333EA, accent #A855F7, surface #0B0813, surface-container #1E1735, urdu-badge #EC4899, battery-green #22C55E, battery-charging #38BDF8), fonts Archivo + Commissioner + Source Code Pro, 3D glassmorphism (perspective(1000px), translateZ(20px)), volumetric holographic orb, 6 coordinated AI assistants, 18 core functional categories.
2. Mobile App Control: Official Android Accessibility & Intent APIs (YouTube, Google Search, Facebook, WhatsApp), Notification Reader Aloud on earphones/Bluetooth, Draw Over Other Apps (SYSTEM_ALERT_WINDOW).
3. Personal Companion: Sensory awareness pill (location/weather + perception active), 3D floating companion avatar, 6 Emotional Moods (Happiness, Care & Love, Excitement, Playful Anger, Comfort, Disappointment), Interactive Virtual Birthday Cake (tap-to-blow flickering candle + Sing Song, Nov 18th), Nearby Flower Shops Finder, Long-Term Personal Memory inspect/delete, Voice-controlled navigation, optional Surroundings Camera Perception.
4. 3D Voice Control: Raytraced holographic orb with X/Y gimbal rings, 7-bar 3D frequency equalizer, Pakistani Female 3D Voice (Urdu/Punjabi/English), 3D Floating Assistant Orb overlay toggle, Tactile Mic Sphere.
5. WhatsApp & Messages: Strict WhatsApp Accessibility Protocol (explicit voice/tap consent before sending), Speech-to-Text Voice Draft with Preview/Confirm/Edit, Unread Inbound Read-Aloud Queue.
6. Phone Calling: Mandatory Confirm Phone Call card with SIM indicator, verbal "Confirm" or tap CTA, CALL_PHONE & READ_CONTACTS disclosure, Emergency & Family Dials.
7. Improvement Suggestions: (1) Automated Azan & Sehri/Iftar Audio Alerts + prayer volume mute; (2) High Heat (>40°C) Charging Voice Disconnect Alert; (3) 30-Second WhatsApp Group Digest; (4) Custom user idea input.
8. Daily App Updates: MISS ZS v2.4 (150ms Pakistani female voice, Punjabi dialect, charger disconnect alerts) with Owner Approval Required safeguard (never auto-installs APK), plus v2.3 Smart Battery Alerts and v2.2 Floating Assistant Pill.
9. Settings & Owner Security: Verified Owner identity, Triple Multi-AI (ChatGPT 4o, Gemini 1.5 Pro, Google AI Web Grounding), Neural Pakistani Female Voice + Auto-Detect dialect, Mandatory Call/SMS Confirmation, SYSTEM_ALERT_WINDOW, Lock-Screen Background Voice Wake, Clear Approved Memories control.
`;

export function createMissZsChatNoteMessage(): ChatMessage {
  return {
    id: MISS_ZS_CHAT_NOTE_ID,
    sender: 'zara',
    text: MISS_ZS_FULL_CHAT_NOTE_TEXT,
    timestamp: 'Pinned Note',
    createdAtMs: Date.now(),
    language: 'hindi',
    assistantId: 'zara',
    assistantLabel: 'Zara · MISS ZS Blueprint Note',
    isFavorite: true,
  };
}

export function ensureMissZsNoteInMessages(messages: ChatMessage[]): {
  next: ChatMessage[];
  changed: boolean;
} {
  if (messages.some((m) => m.id === MISS_ZS_CHAT_NOTE_ID)) {
    return { next: messages, changed: false };
  }
  return {
    next: [...messages, createMissZsChatNoteMessage()],
    changed: true,
  };
}

export function getMissZsSeedMemories(): MemoryItem[] {
  const now = Date.now();
  return [
    {
      id: 'mem-miss-zs-design-system',
      title: 'MISS ZS 3D Spatial Design System & 8 Screens',
      date: 'Blueprint Saved',
      details:
        'Black & purple 3D spatial UI (#9333EA primary, #0B0813 surface, #A855F7 accent, Archivo/Commissioner/Source Code Pro), 6 AI assistants, 18 categories, Mobile App Control, 3D Voice Control orb & gimbal rings, WhatsApp/Call consent safeguards, Improvement Proposals (Azan alerts, >40°C heat warning, 30s group digest), Daily Updates v2.4, and Multi-AI Owner Security.',
      category: 'memory',
      createdAtMs: now - 3000,
    },
    {
      id: 'mem-miss-zs-interactive-companion',
      title: 'MISS ZS Companion: Birthday Cake, Flowers & 6 Moods',
      date: 'Blueprint Saved',
      details:
        'Interactive 3D Virtual Birthday Cake (tap-to-blow candle + Sing Song on Nov 18th), Nearby Flower Shops Finder (Gulberg & DHA), 6 emotional moods (Happiness, Care & Love, Excitement, Playful Anger, Comfort, Disappointment), and Surroundings Perception.',
      category: 'preference',
      createdAtMs: now - 2000,
    },
  ];
}
