import {
  AlarmScheduleItem,
  AzanCityId,
  AzanRamadanConfig,
  ChatMessage,
  Language,
  MemoryCategory,
  MemoryItem,
  SurroundingsSnapshot,
} from '../types';
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
      'Zara keeps every promise, moment, preference, and daily routine safe in her 365-day heart vault.',
    category: 'promise',
    createdAtMs: Date.now() - 105 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'mem-first-4d',
    title: 'Voice, Phone & Media Control',
    date: 'Saved Forever',
    details:
      'Always ready to control phone apps, play songs on YouTube, prepare WhatsApp messages with your confirmation, and remind you on schedule.',
    category: 'memory',
    createdAtMs: Date.now() - 14 * 24 * 60 * 60 * 1000,
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
    /mera\s*naam|میرا\s*نام|मेरा\s*नाम|my\s*name|main\s+\w+\s+hoon|मैं\s+.*\s+हूँ|rehta\s*hoon|pasand|پسند|पसंद|favorite|favourite|i\s*(?:really\s+)?(?:like|prefer|enjoy|love\s+eating|love\s+drinking|dislike|hate|drink|live\s+in|work\s+at|usually)|mujhe\s+.*\s*(?:achha|accha|pasand)|mainu\s+.*\s*pasand|shauq|birthday|janamdin|hobby/i.test(
      lower
    ) ||
    /(मेरा\s*नाम|मुझे\s*.*\s*पसंद|मैं\s*.*\s*रहता|میرا\s*نام|مجھے\s*.*\s*پسند|ਮੈਨੂੰ\s*.*\s*ਪਸੰਦ)/i.test(
      clean
    )
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
    /sad|stressed|worried|anxious|depressed|tired|happy|excited|celebrated|today\s*i|yesterday\s*i|tomorrow\s*i|aaj\s*maine|kal\s*mujhe|udaas|pareshan|tension|thak|اداس|پریشان|ٹینشن|उदास|परेशान|टेंशन|hospital|exam|interview|family|anniversary|trip|emotional|इमोशनल/i.test(
      lower
    )
  ) {
    category = 'memory';
    title = 'Personal Event & Experience';
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

export function buildEnvironmentContextSummary(
  snapshot: SurroundingsSnapshot | null,
  cameraActive: boolean
): string {
  const now = new Date();
  let timezone = 'Local';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  } catch {}
  const localTimeStr =
    snapshot?.localTimeStr ||
    now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const localDateStr =
    snapshot?.localDateStr ||
    now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  const parts: string[] = [
    `LIVE LOCAL DATE & TIME: ${localDateStr}, ${localTimeStr} (${snapshot?.timezone || timezone})`,
  ];

  if (snapshot) {
    const weatherBit =
      snapshot.tempC != null
        ? `${snapshot.tempC}°C, ${snapshot.weatherCondition}${snapshot.humidity != null ? `, Humidity ${snapshot.humidity}%` : ''}`
        : 'Weather unavailable (location/network not fetched yet)';
    parts.push(`LOCATION & LIVE WEATHER: ${snapshot.locationLabel} — ${weatherBit}`);
    if (snapshot.batteryPct != null) {
      parts.push(
        `DEVICE SENSORS: Battery ${snapshot.batteryPct}% (${snapshot.isCharging ? 'Charging' : 'On Battery'})${
          snapshot.batteryTempC != null ? `, Temp ${snapshot.batteryTempC}°C` : ''
        }, Network ${snapshot.online ? snapshot.networkType || 'Online' : 'Offline'}`
      );
    }
    if (snapshot.cameraSummary) {
      parts.push(`LAST CAMERA OBSERVATION: ${snapshot.cameraSummary}`);
    }
  }

  parts.push(
    cameraActive
      ? 'CAMERA PERMISSION & STREAM: ACTIVE (Live camera frame attached if supported — describe real visible people, objects, surroundings, lighting, and activities honestly.)'
      : 'CAMERA PERMISSION & STREAM: OFF (You CANNOT see the room or people right now. Never pretend or guess what the user looks like or what is around them unless they turn Camera ON or attach a photo.)'
  );

  return parts.join('\n');
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
    'Warm, intelligent, and helpful everyday AI assistant for everyone, with an encrypted ZX private romantic companion & sultry voice mode exclusively for the authenticated app owner.',
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

// ======================== 4. AUTOMATED AZAN & SEHRI/IFTAR SOLAR ENGINE ========================

const AZAN_CONFIG_STORAGE_KEY = 'zara_azan_ramadan_config_v1';

export const AZAN_CITY_PRESETS: Record<
  Exclude<AzanCityId, 'auto_gps'>,
  { name: string; lat: number; lon: number; tzHours: number }
> = {
  lahore: { name: 'Lahore', lat: 31.5204, lon: 74.3587, tzHours: 5 },
  karachi: { name: 'Karachi', lat: 24.8607, lon: 67.0011, tzHours: 5 },
  islamabad: { name: 'Islamabad', lat: 33.6844, lon: 73.0479, tzHours: 5 },
};

export const DEFAULT_AZAN_RAMADAN_CONFIG: AzanRamadanConfig = {
  enabled: true,
  city: 'lahore',
  latitude: AZAN_CITY_PRESETS.lahore.lat,
  longitude: AZAN_CITY_PRESETS.lahore.lon,
  cityName: AZAN_CITY_PRESETS.lahore.name,
  azanAudioAlert: true,
  sehriAlert: true,
  sehriMinutesBefore: 30,
  iftarAlert: true,
  prayerTimeMute: false,
  lastTriggeredKeys: {},
};

export function loadAzanRamadanConfig(): AzanRamadanConfig {
  try {
    const raw = localStorage.getItem(AZAN_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_AZAN_RAMADAN_CONFIG,
        ...parsed,
        lastTriggeredKeys:
          parsed?.lastTriggeredKeys && typeof parsed.lastTriggeredKeys === 'object'
            ? parsed.lastTriggeredKeys
            : {},
      };
    }
  } catch {}
  return { ...DEFAULT_AZAN_RAMADAN_CONFIG };
}

export function saveAzanRamadanConfig(cfg: AzanRamadanConfig): void {
  try {
    localStorage.setItem(AZAN_CONFIG_STORAGE_KEY, JSON.stringify(cfg));
  } catch {}
}

export interface DailyPrayerTimes {
  dateKey: string;
  sehriEnds: string; // HH:MM (Fajr - 10 min ihtiyat)
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghribIftar: string;
  isha: string;
}

function formatHoursToHHMM(hoursRaw: number): string {
  const hNorm = ((hoursRaw % 24) + 24) % 24;
  const totalMin = Math.round(hNorm * 60) % 1440;
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Pure astronomical solar position algorithm (Karachi / Univ. of Islamic Sciences Fajr 18deg, Isha 18deg, Hanafi/Shafi Asr).
 */
export function computeDailyPrayerTimes(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): DailyPrayerTimes {
  const d2r = Math.PI / 180;
  const r2d = 180 / Math.PI;
  const tzOffsetHours = -date.getTimezoneOffset() / 60;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Julian date calculation
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
  const d = jd - 2451545.0;

  const g = (357.529 + 0.98560028 * d) % 360;
  const q = (280.459 + 0.98564736 * d) % 360;
  const L = (q + 1.915 * Math.sin(g * d2r) + 0.02 * Math.sin(2 * g * d2r)) % 360;
  const e = 23.439 - 0.00000036 * d;

  const ra = Math.atan2(Math.cos(e * d2r) * Math.sin(L * d2r), Math.cos(L * d2r)) * r2d / 15;
  const eqT = q / 15 - (((ra % 24) + 24) % 24);
  const eqTClean = eqT > 12 ? eqT - 24 : eqT < -12 ? eqT + 24 : eqT;

  const decl = Math.asin(Math.sin(e * d2r) * Math.sin(L * d2r)) * r2d;
  const noon = 12 + tzOffsetHours - longitude / 15 - eqTClean;

  const hourAngleForSunAlt = (altDeg: number): number => {
    const num =
      Math.sin(altDeg * d2r) - Math.sin(latitude * d2r) * Math.sin(decl * d2r);
    const den = Math.cos(latitude * d2r) * Math.cos(decl * d2r);
    const ratio = Math.max(-0.999, Math.min(0.999, num / (den || 1e-6)));
    return Math.acos(ratio) * r2d / 15;
  };

  const fajrH = noon - hourAngleForSunAlt(-18);
  const sunriseH = noon - hourAngleForSunAlt(-0.833);
  const dhuhrH = noon + 2 / 60;
  const asrShadowFactor = 1; // Standard
  const asrAlt = Math.atan(1 / (asrShadowFactor + Math.tan(Math.abs(latitude - decl) * d2r))) * r2d;
  const asrH = noon + hourAngleForSunAlt(asrAlt);
  const maghribH = noon + hourAngleForSunAlt(-0.833) + 1 / 60;
  const ishaH = noon + hourAngleForSunAlt(-18);
  const sehriH = fajrH - 10 / 60;

  return {
    dateKey,
    sehriEnds: formatHoursToHHMM(sehriH),
    fajr: formatHoursToHHMM(fajrH),
    sunrise: formatHoursToHHMM(sunriseH),
    dhuhr: formatHoursToHHMM(dhuhrH),
    asr: formatHoursToHHMM(asrH),
    maghribIftar: formatHoursToHHMM(maghribH),
    isha: formatHoursToHHMM(ishaH),
  };
}

export type AzanAlertEventKey =
  | 'sehri_pre'
  | 'sehri_end'
  | 'fajr'
  | 'dhuhr'
  | 'asr'
  | 'maghrib_iftar'
  | 'isha';

export function buildAzanVoicePrompt(
  eventKey: AzanAlertEventKey,
  time24: string,
  cityName: string,
  language: Language = 'auto'
): string {
  const lang =
    language === 'english' ||
    language === 'hindi' ||
    language === 'punjabi' ||
    language === 'urdu' ||
    language === 'roman_urdu'
      ? language
      : 'urdu';

  if (eventKey === 'sehri_pre') {
    if (lang === 'english') {
      return `Assalam o Alaikum. Sehri pre-alert for ${cityName}: about 30 minutes remain before Sehri ends at ${time24}.`;
    }
    if (lang === 'hindi') {
      return `अस्सलामु अलैकुम। ${cityName} में सहरी ख़त्म होने में लगभग 30 मिनट बाकी हैं (${time24})।`;
    }
    if (lang === 'punjabi') {
      return `السلام علیکم۔ ${cityName} وچ سحری ختم ہون چ تقریباً 30 منٹ باقی نیں (${time24})۔`;
    }
    if (lang === 'roman_urdu') {
      return `Assalam o Alaikum. ${cityName} mein Sehri khatam hone mein taqreeban 30 minute baqi hain (${time24}).`;
    }
    return `السلام علیکم۔ ${cityName} میں سحری ختم ہونے میں تقریباً 30 منٹ باقی ہیں (${time24})۔`;
  }

  if (eventKey === 'sehri_end') {
    if (lang === 'english') {
      return `Sehri time has ended in ${cityName} (${time24}). May Allah accept your fast.`;
    }
    if (lang === 'hindi') {
      return `${cityName} में सहरी का समय समाप्त हो गया है (${time24})। अल्लाह आपका रोज़ा कुबूल फरमाए।`;
    }
    if (lang === 'punjabi') {
      return `${cityName} وچ سحری دا وقت ختم ہو گیا اے (${time24})۔ اللہ تہاڈا روزہ قبول فرمائے۔`;
    }
    if (lang === 'roman_urdu') {
      return `${cityName} mein Sehri ka waqt khatam ho gaya hai (${time24}). Allah aapka roza qubool farmaye.`;
    }
    return `${cityName} میں سحری کا وقت ختم ہو گیا ہے (${time24})۔ اللہ آپ کا روزہ قبول فرمائے۔`;
  }

  if (eventKey === 'maghrib_iftar') {
    if (lang === 'english') {
      return `Allahu Akbar. Maghrib Azan & Iftar time in ${cityName} (${time24}). Please break your fast.`;
    }
    if (lang === 'hindi') {
      return `अल्लाहु अकबर। ${cityName} में मगरिब की अज़ान और इफ़्तार का समय हो गया है (${time24})। रोज़ा इफ़्तार कर लीजिए।`;
    }
    if (lang === 'punjabi') {
      return `اللہ اکبر۔ ${cityName} وچ مغرب دی اذان تے افطار دا وقت ہو گیا اے (${time24})۔ روزہ افطار کر لو۔`;
    }
    if (lang === 'roman_urdu') {
      return `Allahu Akbar. ${cityName} mein Maghrib ki Azan aur Iftar ka waqt ho gaya hai (${time24}). Roza Iftar kar lijiye.`;
    }
    return `اللہ اکبر۔ ${cityName} میں مغرب کی اذان اور افطار کا وقت ہو گیا ہے (${time24})۔ روزہ افطار کر لیجیے۔`;
  }

  const labels: Record<'fajr' | 'dhuhr' | 'asr' | 'isha', { en: string; ur: string; hi: string; pa: string }> = {
    fajr: { en: 'Fajr', ur: 'فجر', hi: 'फ़ज्र', pa: 'فجر' },
    dhuhr: { en: 'Dhuhr', ur: 'ظہر', hi: 'ज़ुहर', pa: 'ظہر' },
    asr: { en: 'Asr', ur: 'عصر', hi: 'असर', pa: 'عصر' },
    isha: { en: 'Isha', ur: 'عشاء', hi: 'इशा', pa: 'عشاء' },
  };
  const label = labels[eventKey];
  if (lang === 'english') {
    return `Allahu Akbar. It is time for ${label.en} Azan in ${cityName} (${time24}).`;
  }
  if (lang === 'hindi') {
    return `अल्लाहु अकबर। ${cityName} में ${label.hi} की अज़ान का समय हो गया है (${time24})।`;
  }
  if (lang === 'punjabi') {
    return `اللہ اکبر۔ ${cityName} وچ ${label.pa} دی اذان دا وقت ہو گیا اے (${time24})۔`;
  }
  if (lang === 'roman_urdu') {
    return `Allahu Akbar. ${cityName} mein ${label.en} ki Azan ka waqt ho gaya hai (${time24}).`;
  }
  return `اللہ اکبر۔ ${cityName} میں ${label.ur} کی اذان کا وقت ہو گیا ہے (${time24})۔`;
}

