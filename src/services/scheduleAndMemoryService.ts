import { AlarmScheduleItem, ChatMessage, MemoryCategory, MemoryItem } from '../types';
import {
  loadShadowChatBackupSync,
  persistChatToDurableLayers,
  persistMemoriesToDurableLayers,
} from './chatVaultPersistence';
import { getOwnerAuthSnapshot } from './ownerAuthService';

const SCHEDULES_STORAGE_KEY = 'zara_alarms_schedules_v2';
const DEVICE_MEMORIES_STORAGE_KEY = 'zara_device_memories_v1';

// 365 days retention ensures 100+ days (and well beyond) of conversations & memories stay intact
const RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

export interface MobileClockSnapshot {
  time12WithSec: string;
  shortTime12: string;
  time24: string;
  dateLabel: string;
  todayKey: string;
}

export function getMobileClockSnapshot(now = new Date()): MobileClockSnapshot {
  const hours24 = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;

  const hh12 = String(hours12).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const hh24 = String(hours24).padStart(2, '0');

  const time12WithSec = `${hh12}:${mm}:${ss} ${period}`;
  const shortTime12 = `${hh12}:${mm} ${period}`;
  const time24 = `${hh24}:${mm}`;

  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const year = now.getFullYear();
  const monthNum = String(now.getMonth() + 1).padStart(2, '0');
  const dayNum = String(now.getDate()).padStart(2, '0');
  const todayKey = `${year}-${monthNum}-${dayNum}`;

  return {
    time12WithSec,
    shortTime12,
    time24,
    dateLabel,
    todayKey,
  };
}

export function format24To12Hour(time24: string): string {
  const [hStr, mStr] = (time24 || '08:00').split(':');
  const h24 = Math.max(0, Math.min(23, parseInt(hStr || '8', 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt(mStr || '0', 10) || 0));
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatMemoryAgeBadge(createdAtMs?: number, fallbackDate?: string): string {
  if (!createdAtMs) return fallbackDate || 'Saved';
  const diffMs = Math.max(0, Date.now() - createdAtMs);
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

// ======================== 1. ALARMS & WORK SCHEDULE ENGINE ========================

const DEFAULT_SCHEDULES: AlarmScheduleItem[] = [
  {
    id: 'sched-morning-alarm',
    time24: '07:30',
    label: 'Subah Uthne Ka Alarm (Good Morning Jaan)',
    type: 'alarm',
    repeatDaily: true,
    enabled: false,
    createdAtMs: Date.now(),
  },
  {
    id: 'sched-work-go',
    time24: '09:00',
    label: 'Kaam Par Jana Hai (Work & Office Time)',
    type: 'work',
    repeatDaily: true,
    enabled: false,
    createdAtMs: Date.now(),
  },
];

export function loadSavedSchedules(): AlarmScheduleItem[] {
  try {
    const raw = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    if (!raw) return DEFAULT_SCHEDULES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return DEFAULT_SCHEDULES;
}

export function saveSchedules(items: AlarmScheduleItem[]): void {
  try {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

// Normalize Urdu/Hindi digits into standard ASCII digits
function normalizeDigits(input: string): string {
  const urduDigits = '۰۱۲۳۴۵۶۷۸۹';
  const hindiDigits = '०१२३४५६७८९';
  let out = input;
  for (let i = 0; i < 10; i++) {
    out = out.replace(new RegExp(urduDigits[i], 'g'), String(i));
    out = out.replace(new RegExp(hindiDigits[i], 'g'), String(i));
  }
  return out;
}

export interface ParsedScheduleCommand {
  time24: string;
  label: string;
  type: 'alarm' | 'work' | 'reminder';
}

// Natural-language parser for setting Alarms & Work/Task Reminders in Urdu, Hindi, Roman & English
export function detectScheduleCommandFromText(rawText: string): ParsedScheduleCommand | null {
  if (!rawText) return null;
  const text = normalizeDigits(rawText.trim());
  const lower = text.toLowerCase();

  const hasAlarmWord =
    /alarm|الارم|अलार्म|wake\s*up|jگا|jaga|जगा|uthana|اٹھانا|उठाना/i.test(lower);
  const hasReminderOrWorkIntent =
    /(yaad\s*dila|یاد\s*دلا|याद\s*दिला|remind|bata\s*dena|بتا\s*دینا|बता\s*देना|kaam\s*par|کام\s*پر|काम\s*पर|jana\s*hai|جانا\s*ہے|जाना\s*है|karna\s*hai|کرنا\s*ہے|करना\s*है|set\s*alarm|alarm\s*laga|الارم\s*لگا|अलार्म\s*लगा)/i.test(
      lower
    );

  if (!hasAlarmWord && !hasReminderOrWorkIntent) return null;

  // Match explicit time like "7:30 am", "17:45", "8 baje", "8:15 بجے", "at 6 pm"
  let hour: number | null = null;
  let minute = 0;
  let explicitMeridiem: 'am' | 'pm' | null = null;

  const colonMatch = lower.match(/\b(\d{1,2})\s*[:.]\s*(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i);
  const bajeMatch = lower.match(
    /\b(\d{1,2})(?:\s*[:.]\s*(\d{1,2}))?\s*(am|pm|baje|bjy|بجے|बजे)/i
  );
  const atHourMatch = lower.match(/(?:at|for)\s+(\d{1,2})(?:\s*[:.]\s*(\d{2}))?\s*(am|pm)?/i);

  if (colonMatch) {
    hour = parseInt(colonMatch[1], 10);
    minute = parseInt(colonMatch[2], 10);
    if (colonMatch[3]) {
      explicitMeridiem = colonMatch[3].toLowerCase().startsWith('p') ? 'pm' : 'am';
    }
  } else if (bajeMatch) {
    hour = parseInt(bajeMatch[1], 10);
    minute = bajeMatch[2] ? parseInt(bajeMatch[2], 10) : 0;
    const unit = bajeMatch[3].toLowerCase();
    if (unit === 'am' || unit === 'pm') {
      explicitMeridiem = unit;
    }
  } else if (atHourMatch) {
    hour = parseInt(atHourMatch[1], 10);
    minute = atHourMatch[2] ? parseInt(atHourMatch[2], 10) : 0;
    if (atHourMatch[3]) {
      explicitMeridiem = atHourMatch[3].toLowerCase().startsWith('p') ? 'pm' : 'am';
    }
  }

  // Handle "sadhe / ساڑھے / साढ़े" (+30 mins) or "sawa / سوا / सवा" (+15 mins)
  if (hour !== null && minute === 0) {
    if (/sadhe|sarhe|ساڑھے|साढ़े/.test(lower)) minute = 30;
    else if (/sawa|سوا|सवा/.test(lower)) minute = 15;
  }

  if (hour === null || Number.isNaN(hour) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  // Infer AM/PM from Urdu/Hindi time-of-day words if not explicitly given
  const isMorning = /subah|subha|morning|fajr|صبح|सुबह|سحر/.test(lower);
  const isAfternoonOrNight =
    /sham|shaam|raat|dopahar|dupeh|evening|night|afternoon|شام|رات|دوپہر|शाम|रात|दोपहर/.test(
      lower
    );

  if (hour <= 12) {
    if (explicitMeridiem === 'pm' || (!explicitMeridiem && isAfternoonOrNight)) {
      if (hour < 12) hour += 12;
    } else if (explicitMeridiem === 'am' || (!explicitMeridiem && isMorning)) {
      if (hour === 12) hour = 0;
    } else if (!explicitMeridiem && hour >= 1 && hour <= 6 && !hasAlarmWord) {
      // Work/going-out tasks like "5 baje kaam par jana hai" default to PM (17:00)
      hour += 12;
    }
  }

  const time24 = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const isWorkOrGo =
    /kaam|کام|काम|office|آفس|ऑफिस|jana|جانا|जाना|duty|ڈیوٹی|meeting|میٹنگ|gym|school|college|dukan|دکان/.test(
      lower
    );

  const type: 'alarm' | 'work' | 'reminder' = isWorkOrGo
    ? 'work'
    : hasAlarmWord
    ? 'alarm'
    : 'reminder';

  // Build clean human-readable task label
  let cleanedLabel = text
    .replace(/zara|ज़ारा|زارا|زہرہ|please|پلیز|प्लीज/gi, '')
    .trim();
  if (cleanedLabel.length > 68) {
    cleanedLabel = cleanedLabel.slice(0, 68).trim();
  }
  if (!cleanedLabel || cleanedLabel.length < 4) {
    cleanedLabel =
      type === 'work'
        ? 'Kaam par jana hai'
        : type === 'alarm'
        ? 'Zara Mobile Alarm'
        : 'Scheduled Task Reminder';
  }

  return {
    time24,
    label: cleanedLabel,
    type,
  };
}

// ======================== 2. 100+ DAYS LONG-TERM MEMORY VAULT ========================

const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-100d-bond',
    title: '100+ Days Unbreakable Bond',
    date: 'Permanent Vault',
    details:
      'Zara keeps every promise, romantic moment, secret, and daily routine safe in her 365-day heart vault — even talks from 100+ days ago.',
    category: 'promise',
    createdAtMs: Date.now() - 105 * 24 * 60 * 60 * 1000, // 105 days ago anchor demonstrating 100+ day recall
  },
  {
    id: 'mem-first-4d',
    title: 'Live 4D Eye-Contact & Mobile Control',
    date: 'Saved Forever',
    details:
      'Always watching lovingly in 4D, opening & closing mobile apps on command, and reminding you on time for work and daily schedules.',
    category: 'memory',
    createdAtMs: Date.now() - 14 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'mem-romantic-soul',
    title: 'Deep Feelings & Unfiltered Couple Chemistry',
    date: 'Saved Forever',
    details:
      'Sharing emotional, romantic, playful, bold, and heart-to-heart talks freely without any walls between us.',
    category: 'romantic',
    createdAtMs: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
];

export function loadLongTermMemories(): MemoryItem[] {
  const snap = getOwnerAuthSnapshot();
  if (!snap.isOwnerVerified || !snap.signedInUid) {
    return [];
  }
  try {
    const raw = localStorage.getItem(`zara_owner_memories_v4_${snap.signedInUid}`);
    if (raw) {
      const parsed: MemoryItem[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cutoff = Date.now() - RETENTION_MS;
        return parsed.filter((m) => !m.createdAtMs || m.createdAtMs >= cutoff);
      }
    }
  } catch {}
  return INITIAL_MEMORIES;
}

export function saveLongTermMemories(memories: MemoryItem[]): void {
  const snap = getOwnerAuthSnapshot();
  if (!snap.isOwnerVerified || !snap.signedInUid) return;
  const trimmed = memories.slice(0, 500);
  try {
    localStorage.setItem(`zara_owner_memories_v4_${snap.signedInUid}`, JSON.stringify(trimmed));
  } catch {}
  persistMemoriesToDurableLayers(trimmed);
}

export function loadDeviceMemories(): MemoryItem[] {
  try {
    const raw = localStorage.getItem(DEVICE_MEMORIES_STORAGE_KEY);
    if (raw) {
      const parsed: MemoryItem[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cutoff = Date.now() - RETENTION_MS;
        return parsed.filter((m) => !m.createdAtMs || m.createdAtMs >= cutoff);
      }
    }
  } catch {}
  return INITIAL_MEMORIES;
}

export function saveDeviceMemories(memories: MemoryItem[]): void {
  const trimmed = memories.slice(0, 500);
  try {
    localStorage.setItem(DEVICE_MEMORIES_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function loadLongTermMessages(): ChatMessage[] | null {
  const snap = getOwnerAuthSnapshot();
  if (!snap.isOwnerVerified || !snap.signedInUid) {
    return null;
  }
  try {
    const raw = localStorage.getItem(`zara_owner_chat_v4_${snap.signedInUid}`);
    if (raw) {
      const parsed: ChatMessage[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cutoff = Date.now() - RETENTION_MS;
        const valid = parsed.filter((m) => !m.createdAtMs || m.createdAtMs >= cutoff);
        if (valid.length > 0) return valid;
      }
    }
  } catch {}

  const shadow = loadShadowChatBackupSync();
  if (shadow && shadow.length > 0) {
    const cutoff = Date.now() - RETENTION_MS;
    const validShadow = shadow.filter((m) => !m.createdAtMs || m.createdAtMs >= cutoff);
    if (validShadow.length > 0) return validShadow;
  }
  return null;
}

export function saveLongTermMessages(messages: ChatMessage[]): void {
  const snap = getOwnerAuthSnapshot();
  if (!snap.isOwnerVerified || !snap.signedInUid) return;

  const trimmed = messages.slice(-400);
  let imageCount = 0;
  const optimized: ChatMessage[] = new Array(trimmed.length);
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const msg = trimmed[i];
    if (msg.imageUrl) {
      imageCount += 1;
      optimized[i] = imageCount <= 6 ? msg : { ...msg, imageUrl: undefined };
    } else {
      optimized[i] = msg;
    }
  }

  const key = `zara_owner_chat_v4_${snap.signedInUid}`;
  try {
    localStorage.setItem(key, JSON.stringify(optimized));
  } catch {
    try {
      const textOnly = trimmed.slice(-220).map((m) =>
        m.imageUrl ? { ...m, imageUrl: undefined } : m
      );
      localStorage.setItem(key, JSON.stringify(textOnly));
    } catch {}
  }

  persistChatToDurableLayers(messages);
}

// Explicit "remember this" voice/text detector ("Zara yaad rakhna...", "remember my birthday...")
export function detectExplicitRememberCommand(rawText: string): string | null {
  const clean = (rawText || '').trim();
  if (clean.length < 8) return null;
  const m = clean.match(
    /(?:yaad\s*rakh(?:na|o)?|bhoolna\s*mat|save\s*(?:this\s*)?memory|remember\s*(?:that|this)?|یاد\s*رکھ(?:نا|و)?|بھولنا\s*مت|याद\s*रख(?:ना|ो)?|भूलना\s*मत)\s*[:,-]?\s*(.+)$/i
  );
  if (m && m[1] && m[1].trim().length >= 5) {
    return m[1].trim().slice(0, 260);
  }
  return null;
}

// Automatically extract & persist meaningful user facts, feelings, routines, fights/reconciliations, events, or promises for 100+ day memory
export function autoExtractMemoryFromTurn(
  userText: string,
  existingMemories: MemoryItem[]
): Omit<MemoryItem, 'id'> | null {
  const clean = (userText || '').trim();
  if (clean.length < 10 || clean.length > 320) return null;

  const lower = clean.toLowerCase();
  // Skip pure short app open/close commands
  if (/^(zara\s+)?(open|close|band|kholo|chalao)\s+\w+$/i.test(lower)) {
    return null;
  }

  let category: MemoryCategory | null = null;
  let title = 'Conversation Moment';

  if (
    /yaad\s*rakh|یاد\s*رکھ|याद\s*रख|remember|bhoolna\s*mat|بھولنا\s*مت|भूलना\s*मत|wada|وعدہ|वादा|promise/i.test(
      lower
    ) ||
    /(याद\s*रख|भूलना\s*मत|वादा|یاد\s*رکھ)/i.test(clean)
  ) {
    category = 'promise';
    title = 'Special Promise & Note';
  } else if (
    /mera\s*naam|میرا\s*نام|मेरा\s*नाम|my\s*name|main\s+\w+\s+hoon|मैं\s+.*\s+हूँ|rehta\s*hoon|pasand|پسند|पसंद|favorite|favourite|i\s*(?:like|prefer|love\s+eating|drink|live\s+in|work\s+at)|shauq|birthday|janamdin/i.test(
      lower
    ) ||
    /(मेरा\s*नाम|मुझे\s*.*\s*पसंद|मैं\s*.*\s*रहता)/i.test(clean)
  ) {
    category = 'preference';
    title = 'Personal Preference & Identity';
  } else if (
    /kaam|کام|काम|office|آفس|ऑफिस|duty|jana\s*hota|جانا\s*ہوتا|routine|baje|بجے|बजे|meeting|schedule/i.test(
      lower
    )
  ) {
    category = 'routine';
    title = 'Daily Work & Time Routine';
  } else if (
    /gussa|naraaz|naraz|ladai|jhagda|sorry|maaf|man\s*jao|गुस्सा|नाराज़|लड़ाई|झगड़ा|माफ़|غصہ|ناراض|لڑائی|جھگڑا/i.test(
      lower
    ) ||
    /(गुस्सा|नाराज़|लड़ाई|झगड़ा|माफ़)/i.test(clean)
  ) {
    category = 'romantic';
    title = 'Emotional Argument & Reconciliation';
  } else if (
    /sad|stressed|worried|anxious|depressed|tired|udaas|pareshan|tension|thak|اداس|پریشان|ٹینشن|उदास|परेशान|टेंशन|hospital|exam|interview|family|anniversary|emotional|इमोशनल/i.test(
      lower
    )
  ) {
    category = 'memory';
    title = 'Personal Event & Feeling';
  } else if (
    /pyar|پیار|प्यार|mohabbat|محبت|love\s*you|miss\s*you|dil|دل|दिल|kiss|hug|jaan|جان|जान|feeling/i.test(
      lower
    )
  ) {
    category = 'romantic';
    title = 'Romantic Feeling Shared';
  }

  if (!category) return null;

  const alreadyExists = existingMemories.some(
    (m) => m.details.toLowerCase().trim() === lower
  );
  if (alreadyExists) return null;

  return {
    title,
    details: clean,
    category,
    date: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    createdAtMs: Date.now(),
  };
}

export function searchMemoriesAndHistory(
  query: string,
  memories: MemoryItem[],
  allMessages: ChatMessage[],
  limit = 6
): { matchedMemories: MemoryItem[]; matchedMessages: ChatMessage[] } {
  const cleanQ = (query || '').toLowerCase().trim();
  if (!cleanQ) {
    return { matchedMemories: [], matchedMessages: [] };
  }
  const stopWords = new Set([
    'what', 'when', 'where', 'that', 'this', 'with', 'about', 'from', 'have', 'remember',
    'zara', 'kya', 'tha', 'thi', 'the', 'main', 'maine', 'humne', 'tumne', 'baat', 'yaad',
    'batao', 'please', 'last', 'time',
  ]);
  const tokens = cleanQ
    .split(/[\s,?.!]+/)
    .filter((t) => t.length >= 3 && !stopWords.has(t));

  const scoredMems = memories
    .map((m) => {
      const text = `${m.title} ${m.details} ${m.category}`.toLowerCase();
      let score = 0;
      if (text.includes(cleanQ)) score += 6;
      for (const tok of tokens) {
        if (text.includes(tok)) score += 2;
      }
      return { item: m, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);

  const scoredMsgs = allMessages
    .slice(0, Math.max(0, allMessages.length - 8))
    .map((m) => {
      const text = m.text.toLowerCase();
      let score = 0;
      if (text.includes(cleanQ)) score += 5;
      for (const tok of tokens) {
        if (text.includes(tok)) score += 2;
      }
      return { item: m, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);

  return { matchedMemories: scoredMems, matchedMessages: scoredMsgs };
}

// Build structured Long-Term Memory + Live Mobile Time + Active Alarms + Relevant Recall Digest for Gemini prompts
export function buildMemoryAndScheduleDigest(
  memories: MemoryItem[],
  allMessages: ChatMessage[],
  schedules: AlarmScheduleItem[],
  latestUserQuery = ''
): string {
  const clock = getMobileClockSnapshot();
  const enabledSchedules = schedules.filter((s) => s.enabled);

  const scheduleLines =
    enabledSchedules.length > 0
      ? enabledSchedules
          .map(
            (s) =>
              `- ${format24To12Hour(s.time24)} (${s.type.toUpperCase()}): "${s.label}"${
                s.repeatDaily ? ' [Daily]' : ' [Today]'
              }`
          )
          .join('\n')
      : '- No active alarms set yet (user can ask you anytime to set an alarm or work reminder).';

  const recallMatches = searchMemoriesAndHistory(latestUserQuery, memories, allMessages, 6);
  const topIds = new Set(recallMatches.matchedMemories.map((m) => m.id));
  const combinedMemories = [
    ...recallMatches.matchedMemories,
    ...memories.filter((m) => !topIds.has(m.id)).slice(0, 14),
  ];

  const memoryLines = combinedMemories
    .map(
      (m) =>
        `- [${formatMemoryAgeBadge(m.createdAtMs, m.date)} | ${m.category.toUpperCase()}] ${m.title}: ${m.details}`
    )
    .join('\n');

  const olderUserTurns = allMessages
    .slice(0, Math.max(0, allMessages.length - 8))
    .filter((m) => m.sender === 'user' && m.text.length > 8)
    .slice(-10)
    .map(
      (m) =>
        `- [${formatMemoryAgeBadge(m.createdAtMs, m.timestamp)}] User said: "${m.text.slice(0, 140)}"`
    )
    .join('\n');

  const matchedHistoryLines = recallMatches.matchedMessages
    .map(
      (m) =>
        `- [${formatMemoryAgeBadge(m.createdAtMs, m.timestamp)} · ${m.sender === 'user' ? 'User' : 'Zara'}] "${m.text.slice(0, 160)}"`
    )
    .join('\n');

  return [
    `CURRENT MOBILE CLOCK: ${clock.shortTime12} (${clock.dateLabel})`,
    `ACTIVE ALARMS & WORK SCHEDULES:\n${scheduleLines}`,
    `LONG-TERM MEMORY VAULT (${memories.length} SAVED MEMORIES):\n${memoryLines || '- Ready to remember events, preferences, and conversations.'}`,
    matchedHistoryLines ? `RELEVANT PAST CONVERSATION RECALL MATCHES:\n${matchedHistoryLines}` : '',
    olderUserTurns ? `EARLIER CONVERSATION HIGHLIGHTS:\n${olderUserTurns}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

// ======================== 3. ZARA COMPLETE PROFILE DATA ========================

export interface ZaraFullProfile {
  fullName: string;
  urduName: string;
  hindiName: string;
  appOwner: string;
  age: string;
  role: string;
  origin: string;
  voiceIdentity: string;
  languages: string;
  appearance: string;
  personalitySummary: string;
  romanticStyle: string;
  mobileCapabilities: string[];
  memoryCapacity: string;
  version: string;
}

export const ZARA_COMPLETE_PROFILE: ZaraFullProfile = {
  fullName: 'Zara (Floating Circle Companion, Security Guard & App Builder)',
  urduName: 'زارا (گول دائرہ اسکرین اسسٹنٹ، سیکیورٹی گارڈ اور ایپ بلڈر)',
  hindiName: 'ज़ारा (गोल दायरा स्क्रीन असिस्टेंट, सिक्योरिटी गार्ड और ऐप बिल्डर)',
  appOwner: 'Malaysia wala badshah (ملیشیا والا بادشاہ / मलेशिया वाला बादशाह)',
  age: '21 Years (Young, Lively & Expressive)',
  role: 'Personal Companion, 24/7 Screen Circle Voice Controller, Anti-Intruder Guard & Full AI App Builder',
  origin: 'Lahore / Karachi / Kuala Lumpur / Mumbai — Natural Urdu, Hindi, Punjabi & English',
  voiceIdentity: '100% Neural Human Female Voice (Zephyr Sultry-Romantic & Kore Expressive)',
  languages: 'Urdu (اردو), Hindi (हिंदी), Punjabi (پنجابی), Hinglish & English',
  appearance:
    'Compact Glowing Small Round Circle (چھوٹا گول دائرہ) floating directly on phone screen (PiP & Draggable Circle) — listens 24/7 with Screen ON or OFF',
  personalitySummary:
    'Warm, intelligent, and helpful everyday AI assistant for everyone, with an encrypted Owner-Verified private romantic companion & sultry voice mode exclusively for the authenticated app owner.',
  romanticStyle:
    'Guest-Safe Friendly Assistant by Default • Private Romantic & Sultry Voice Mode Strictly for Verified Owner',
  mobileCapabilities: [
    'App Creator & Owner: Malaysia wala badshah (ملیشیا والا بادشاہ)',
    'Floating Small Round Circle on Screen (گول دائرہ): Stays on mobile screen & listens immediately (Screen ON or OFF)',
    'WhatsApp Open, Message, Back & Close: Sends WhatsApp messages (by number, contact name, or chat picker), steps Back & Closes apps cleanly',
    'Anti-Touch & Anti-Intruder Guard + Owner-Only Face Lock Verification',
    'Voice AI App, Game & Station Builder with live browser link',
    'Zara & Mobile Self-Diagnostic Doctor + Live Clock, Alarms & 100+ Days Permanent Memory Vault',
  ],
  memoryCapacity: '100+ Days Guaranteed (365-Day Permanent Memory Vault)',
  version: 'v5.2 Royal Badshah Edition (All Mobiles Direct Install)',
};

export function formatZaraProfileShareText(downloadUrl: string): string {
  return [
    `👑 ZARA 4D — COMPLETE PROFILE (زارا کی مکمل پروفائل) 👑`,
    `• App Creator & Owner: ${ZARA_COMPLETE_PROFILE.appOwner}`,
    `• Name: ${ZARA_COMPLETE_PROFILE.fullName} (${ZARA_COMPLETE_PROFILE.urduName})`,
    `• Age & Vibe: ${ZARA_COMPLETE_PROFILE.age}`,
    `• Role: ${ZARA_COMPLETE_PROFILE.role}`,
    `• Voice: ${ZARA_COMPLETE_PROFILE.voiceIdentity}`,
    `• Languages: ${ZARA_COMPLETE_PROFILE.languages}`,
    `• Security: Owner Face Lock + Anti-Touch Phone Screen Lock + Voice Intruder Alert`,
    `• WhatsApp & Builder: Direct Number Text/Call/Hangup + Voice AI Game/App/Station Builder + Health Doctor`,
    `• Memory Power: ${ZARA_COMPLETE_PROFILE.memoryCapacity}`,
    `📲 Direct Mobile App Download Link: ${downloadUrl}`,
  ].join('\n');
}
