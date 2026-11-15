// Real-Time Mood & Hand/Head Gesture Recognition + Advanced Work Studio & Task Queue Service
import {
  AdvancedWorkMode,
  AdvancedWorkTaskItem,
  DetectedHandGesture,
  DetectedUserMood,
} from '../types';
import { getOwnerAuthHeaders, getOwnerAuthSnapshot } from './ownerAuthService';

const WORK_TASKS_STORAGE_KEY = 'zara_advanced_work_tasks_v1';

export interface MoodAndGestureScanResult {
  mood: DetectedUserMood;
  moodLabel: string;
  gesture: DetectedHandGesture;
  gestureLabel: string;
  confidence: number;
  spokenReply: string;
  audio: string | null;
}

export const MOOD_DISPLAY_META: Record<
  DetectedUserMood,
  { label: string; labelHi: string; toneColor: string }
> = {
  happy: { label: 'Happy & Smiling', labelHi: 'खुश / مسکراتے ہوئے', toneColor: 'text-emerald-300' },
  romantic: { label: 'Romantic & Loving', labelHi: 'रोमांटिक / پیار بھرا', toneColor: 'text-pink-300' },
  stressed: { label: 'Tired / Stressed', labelHi: 'थकान / پریشان', toneColor: 'text-amber-300' },
  sad: { label: 'Quiet / Low Mood', labelHi: 'उदास / اداس', toneColor: 'text-sky-300' },
  focused: { label: 'Work Focus', labelHi: 'काम में फोकस / فوکس', toneColor: 'text-cyan-300' },
  angry: { label: 'Upset / Frustrated', labelHi: 'नाराज़ / غصہ', toneColor: 'text-rose-300' },
  calm: { label: 'Calm & Relaxed', labelHi: 'शांत / پرسکون', toneColor: 'text-slate-200' },
};

export const GESTURE_ACTION_META: Record<
  DetectedHandGesture,
  { label: string; actionSummary: string }
> = {
  wave_hello: {
    label: 'Wave Hand (ہاتھ ہلانا)',
    actionSummary: 'Zara smiles & greets you out loud',
  },
  open_palm_stop: {
    label: 'Open Palm Stop (ہتھیلی دکھانا)',
    actionSummary: 'Instantly pauses Zara speaking',
  },
  thumbs_up: {
    label: 'Thumbs Up (انگوٹھا دکھانا)',
    actionSummary: 'Approves active task & cheers you on',
  },
  peace_victory: {
    label: 'Peace / V-Sign (دو انگلیاں)',
    actionSummary: 'Auto-snaps camera photo to Chat',
  },
  heart_sign: {
    label: 'Heart Gesture (دل کا اشارہ)',
    actionSummary: 'Activates sweet romantic reply',
  },
  nod_yes: {
    label: 'Head Nod / Smile',
    actionSummary: 'Acknowledges & continues conversation',
  },
  none: {
    label: 'No Hand Gesture',
    actionSummary: 'Monitoring mood & expression',
  },
};

// Fast real-time text & voice transcript mood detector (Urdu, Hindi, Hinglish, English)
export function detectMoodFromText(text: string): DetectedUserMood | null {
  if (!text || text.trim().length < 2) return null;
  const lower = text.toLowerCase();

  if (
    /(tension|stressed|thak\s*gaya|thaka\s*hua|pareshan|bohat\s*kaam|sir\s*dard|headache|tired|exhausted|پریشان|تھک\s*گیا|سر\s*درد|ٹینشن|थक\s*गया|परेशान|टेंशन|सिर\s*दर्द)/i.test(
      lower
    )
  ) {
    return 'stressed';
  }

  if (
    /(udas|udaas|sad|akela|alone|rona|dukhi|dil\s*udaas|miss\s*kar|اداس|اکیلا|دکھی|उदास|अकेला|दुखी)/i.test(
      lower
    )
  ) {
    return 'sad';
  }

  if (
    /(gussa|naraz|angry|irritated|dimag\s*kharab|غصہ|ناراض|गुस्सा|नाराज़|दिमाग\s*खराब)/i.test(
      lower
    )
  ) {
    return 'angry';
  }

  if (
    /(jaan|janu|pyar|love\s*you|kiss|hug|romantic|ishq|mohabbat|dil\s*kar\s*raha|جان|پیار|محبت|عشق|प्यार|मोहब्बत|जान)/i.test(
      lower
    )
  ) {
    return 'romantic';
  }

  if (
    /(office|meeting|client|business|project|invoice|email|kaam\s*karna|work\s*mode|focus|آفس|میٹنگ|کلائنٹ|بزنس|ऑफिस|मीटिंग|क्लाइंट|बिजनेस|प्रोजेक्ट)/i.test(
      lower
    )
  ) {
    return 'focused';
  }

  if (
    /(khush|happy|maza\s*aa|zabardast|shukriya|awesome|great|haha|smile|خوش|مزہ|زبردست|खुश|मज़ा|ज़बरदस्त)/i.test(
      lower
    )
  ) {
    return 'happy';
  }

  return null;
}

export interface DetectedMoodOrWorkIntent {
  type:
    | 'scan_mood_gesture'
    | 'open_mood_gesture_hub'
    | 'open_advanced_work'
    | 'add_work_task'
    | 'run_work_ai';
  taskTitle?: string;
  workPrompt?: string;
  workMode?: AdvancedWorkMode;
}

export function detectMoodGestureOrWorkCommand(text: string): DetectedMoodOrWorkIntent | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  // Detect live camera Mood / Gesture scan command
  if (
    /(mera\s*mood|mood\s*(check|dekho|batao|scan)|gesture\s*(check|dekho|on|scan|chalu)|ishara\s*dekho|میرا\s*موڈ|موڈ\s*(چیک|دیکھو|بتاؤ)|جیسچر|اشارہ\s*دیکھو|मेरा\s*मूड|मूड\s*(चेक|देखो|बताओ)|जेस्चर)/i.test(
      lower
    )
  ) {
    return { type: 'scan_mood_gesture' };
  }

  // Detect adding a priority work task by voice/text
  const addTaskMatch = text.match(
    /(?:work\s*task\s*(?:add|likho|save)\s*(?:karo)?|kaam\s*(?:add|likho|note)\s*(?:karo)?|کام\s*(?:نوٹ|ایڈ|لکھو)\s*(?:کرو)?|काम\s*(?:नोट|ऐड|लिखो)\s*(?:करो)?)[\s:—-]+(.+)/i
  );
  if (addTaskMatch && addTaskMatch[1]?.trim()) {
    return {
      type: 'add_work_task',
      taskTitle: addTaskMatch[1].trim(),
    };
  }

  // Detect AI Work drafting requests (Email, Proposal, Business WhatsApp, Work Plan)
  if (
    /(advanced\s*work|work\s*studio|work\s*hub|kaam\s*wala\s*system|ایڈوانس\s*ورک|کام\s*کا\s*سسٹم|एडवांस्ड\s*वर्क|काम\s*का\s*सिस्टम)/i.test(
      lower
    )
  ) {
    return { type: 'open_advanced_work' };
  }

  if (
    /(email\s*(likho|banao|draft)|proposal\s*(likho|banao)|business\s*message\s*likho|kaam\s*ka\s*plan\s*banao|work\s*plan\s*banao|ای\s*میل\s*لکھو|پروپوزل\s*بناؤ|کام\s*کا\s*پلان|ईमेल\s*लिखो|प्रपोजल\s*बनाओ|काम\s*का\s*प्लान)/i.test(
      lower
    )
  ) {
    const mode: AdvancedWorkMode = /email|ای\s*میل|ईमेल|proposal|پروپوزل|प्रपोजल/i.test(lower)
      ? 'email_proposal'
      : /business\s*message/i.test(lower)
      ? 'whatsapp_business'
      : 'action_plan';
    return {
      type: 'run_work_ai',
      workMode: mode,
      workPrompt: text.trim(),
    };
  }

  return null;
}

// Call server Gemini Vision /api/mood-gesture to recognize facial mood + hand/head gesture
export async function analyzeCameraMoodAndGesture(params: {
  imageBase64?: string;
  textContext?: string;
  userNickname?: string;
  voiceName?: string;
}): Promise<MoodAndGestureScanResult> {
  const isOwnerVerified = getOwnerAuthSnapshot().isOwnerVerified;
  const authHeaders = await getOwnerAuthHeaders();
  const res = await fetch('/api/mood-gesture', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      ...params,
      userNickname: isOwnerVerified ? params.userNickname : 'Friend',
    }),
  });

  if (!res.ok) {
    throw new Error(`Mood & gesture scan error (${res.status})`);
  }

  const data = await res.json();
  const validMoods: DetectedUserMood[] = [
    'happy',
    'romantic',
    'stressed',
    'sad',
    'focused',
    'angry',
    'calm',
  ];
  const validGestures: DetectedHandGesture[] = [
    'thumbs_up',
    'open_palm_stop',
    'wave_hello',
    'peace_victory',
    'heart_sign',
    'nod_yes',
    'none',
  ];

  const mood: DetectedUserMood = validMoods.includes(data.mood) ? data.mood : 'calm';
  const gesture: DetectedHandGesture = validGestures.includes(data.gesture)
    ? data.gesture
    : 'none';

  return {
    mood,
    moodLabel: data.moodLabel || MOOD_DISPLAY_META[mood].labelHi,
    gesture,
    gestureLabel: data.gestureLabel || GESTURE_ACTION_META[gesture].label,
    confidence: Number(data.confidence) || 92,
    spokenReply:
      data.spokenReply ||
      (isOwnerVerified
        ? 'جی میرے مالک! میں نے آپ کا موڈ اور اشارہ دیکھ لیا ہے!'
        : 'جی دوست! میں نے آپ کا موڈ اور اشارہ دیکھ لیا ہے!'),
    audio: data.audio || null,
  };
}

// Call server /api/advanced-work for executive drafting, translation, plans & calculations
export async function runAdvancedWorkStudio(params: {
  workMode: AdvancedWorkMode;
  prompt: string;
  targetLanguage?: string;
  userNickname?: string;
  voiceName?: string;
}): Promise<{ title: string; output: string; spokenSummary: string; audio: string | null }> {
  const isOwnerVerified = getOwnerAuthSnapshot().isOwnerVerified;
  const authHeaders = await getOwnerAuthHeaders();
  const res = await fetch('/api/advanced-work', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      ...params,
      userNickname: isOwnerVerified ? params.userNickname : 'Friend',
    }),
  });

  if (!res.ok) {
    throw new Error(`Advanced work error (${res.status})`);
  }

  const data = await res.json();
  return {
    title: data.title || 'Zara Smart Work Output',
    output: data.output || '',
    spokenSummary:
      data.spokenSummary ||
      (isOwnerVerified
        ? 'جی میرے مالک! میں نے آپ کا ایڈوانس ورک ڈرافٹ اور پلان تیار کر دیا ہے!'
        : 'جی دوست! میں نے آپ کا ورک ڈرافٹ اور پلان تیار کر دیا ہے!'),
    audio: data.audio || null,
  };
}

export function loadWorkTasks(): AdvancedWorkTaskItem[] {
  try {
    const raw = localStorage.getItem(WORK_TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [
    {
      id: 'work-default-1',
      title: 'Check daily business messages & priority client updates',
      priority: 'today',
      completed: false,
      createdAtMs: Date.now(),
    },
  ];
}

export function saveWorkTasks(items: AdvancedWorkTaskItem[]): void {
  try {
    localStorage.setItem(WORK_TASKS_STORAGE_KEY, JSON.stringify(items.slice(0, 100)));
  } catch {}
}
