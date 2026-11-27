import React, { useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  Camera,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Hand,
  MessageCircle,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Smile,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import {
  AdvancedWorkMode,
  AdvancedWorkTaskItem,
  DetectedHandGesture,
  DetectedUserMood,
  Language,
  ZaraVoiceName,
} from '../types';
import {
  GESTURE_ACTION_META,
  MOOD_DISPLAY_META,
  MoodAndGestureScanResult,
  analyzeCameraMoodAndGesture,
  runAdvancedWorkStudio,
} from '../services/moodAndGestureService';
import { zaraVision } from '../services/visionAndControlService';
import { audioService } from '../services/audioService';

interface MoodGestureWorkModalProps {
  isOpen: boolean;
  initialTab?: 'mood_gesture' | 'work';
  onClose: () => void;
  currentMood: DetectedUserMood;
  lastGesture: DetectedHandGesture;
  autoGestureWatch: boolean;
  onToggleAutoGestureWatch: () => void;
  onMoodGestureDetected: (res: MoodAndGestureScanResult) => void;
  workTasks: AdvancedWorkTaskItem[];
  onAddWorkTask: (title: string, priority: 'urgent' | 'today' | 'normal', aiNotes?: string) => void;
  onToggleWorkTask: (id: string) => void;
  onDeleteWorkTask: (id: string) => void;
  userNickname: string;
  voiceName: ZaraVoiceName;
  language: Language;
  voiceSpeed: number;
}

const WORK_MODES: Array<{ id: AdvancedWorkMode; label: string; placeholder: string }> = [
  {
    id: 'whatsapp_business',
    label: 'WhatsApp Business',
    placeholder: 'e.g. Client ko payment reminder aur order ready hone ka professional message likho...',
  },
  {
    id: 'email_proposal',
    label: 'Email / Proposal',
    placeholder: 'e.g. Malaysia project partnership ke liye professional email aur quotation likho...',
  },
  {
    id: 'action_plan',
    label: 'Work Action Plan',
    placeholder: 'e.g. Naya online store ya business kaam shuru karne ka step-by-step plan banao...',
  },
  {
    id: 'translate',
    label: 'Pro Translate',
    placeholder: 'e.g. Translate this into fluent English / Malay / Urdu / Hindi...',
  },
  {
    id: 'meeting_notes',
    label: 'Summary & Notes',
    placeholder: 'e.g. Aaj ki meeting ke key points aur agle hafte ke tasks summarize karo...',
  },
  {
    id: 'smart_calc',
    label: 'Invoice & Calc',
    placeholder: 'e.g. 45 items @ RM 125 each + 8% tax minus 10% discount ka poora hisab banao...',
  },
];

export const MoodGestureWorkModal: React.FC<MoodGestureWorkModalProps> = ({
  isOpen,
  initialTab = 'mood_gesture',
  onClose,
  currentMood,
  lastGesture,
  autoGestureWatch,
  onToggleAutoGestureWatch,
  onMoodGestureDetected,
  workTasks,
  onAddWorkTask,
  onToggleWorkTask,
  onDeleteWorkTask,
  userNickname,
  voiceName,
  language,
  voiceSpeed,
}) => {
  const [activeTab, setActiveTab] = useState<'mood_gesture' | 'work'>(initialTab);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [latestScan, setLatestScan] = useState<MoodAndGestureScanResult | null>(null);

  // Advanced Work Studio state
  const [workMode, setWorkMode] = useState<AdvancedWorkMode>('whatsapp_business');
  const [workPrompt, setWorkPrompt] = useState('');
  const [targetLang, setTargetLang] = useState('Urdu + English');
  const [isGeneratingWork, setIsGeneratingWork] = useState(false);
  const [workResult, setWorkResult] = useState<{
    title: string;
    output: string;
    spokenSummary: string;
  } | null>(null);
  const [copiedWork, setCopiedWork] = useState(false);

  // Task Queue input state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'urgent' | 'today' | 'normal'>('today');

  // Deep-Work Pomodoro Focus Timer (25:00 default)
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    return zaraVision.subscribe((_mode, stream) => {
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream || null;
        if (stream) {
          previewVideoRef.current.play().catch(() => {});
        }
      }
    });
  }, [isOpen]);

  // Focus timer countdown
  useEffect(() => {
    if (!focusRunning) return;
    const t = window.setInterval(() => {
      setFocusSecondsLeft((prev) => {
        if (prev <= 1) {
          setFocusRunning(false);
          const doneMsg =
            'جی میرے مالک ملیشیا والا بادشاہ! آپ کا فوکس ورک سیشن مکمل ہو گیا ہے، اب تھوڑا آرام کر لیں!';
          audioService.speakText(doneMsg, {
            language,
            rate: voiceSpeed,
            voiceName,
          });
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [focusRunning, language, voiceSpeed, voiceName]);

  if (!isOpen) return null;

  const handleScanMoodAndGestureNow = async () => {
    setScanError(null);
    setIsScanning(true);
    audioService.unlock();
    audioService.playChime('activate');

    try {
      let frameB64: string | undefined;
      if (zaraVision.getMode() === 'camera') {
        frameB64 = zaraVision.captureFrameBase64()?.base64;
      }
      if (!frameB64) {
        const snapped = await zaraVision.snapPhotoFromLens('user');
        frameB64 = snapped?.base64;
      }

      if (!frameB64) {
        setScanError('براہ کرم کیمرہ پرمیشن آن کریں تاکہ زارا آپ کا چہرہ اور اشارہ دیکھ سکے۔');
        return;
      }

      const result = await analyzeCameraMoodAndGesture({
        imageBase64: frameB64,
        userNickname,
        voiceName,
      });

      setLatestScan(result);
      onMoodGestureDetected(result);
    } catch {
      setScanError('سرور سے رابطہ ہو رہا ہے — دوبارہ ٹیپ کریں۔');
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerateWorkOutput = async () => {
    if (!workPrompt.trim() || isGeneratingWork) return;
    setIsGeneratingWork(true);
    audioService.unlock();
    audioService.playChime('activate');

    try {
      const res = await runAdvancedWorkStudio({
        workMode,
        prompt: workPrompt.trim(),
        targetLanguage: targetLang,
        userNickname,
        voiceName,
      });
      setWorkResult({
        title: res.title,
        output: res.output,
        spokenSummary: res.spokenSummary,
      });
      audioService.selfHealAudioPipeline();
      await audioService.speakText(res.spokenSummary, {
        language,
        rate: voiceSpeed,
        voiceName,
        base64Audio: res.audio,
      });
    } catch {
      setWorkResult({
        title: 'Quick Work Note',
        output: workPrompt.trim(),
        spokenSummary: 'جی میرے مالک! میں نے آپ کا نوٹ محفوظ کر لیا ہے۔',
      });
    } finally {
      setIsGeneratingWork(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const moodMeta = MOOD_DISPLAY_META[currentMood] || MOOD_DISPLAY_META.calm;
  const gestureMeta = GESTURE_ACTION_META[lastGesture] || GESTURE_ACTION_META.none;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-lg h-[92dvh] sm:h-[86vh] bg-[#0a0718] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between gap-2 bg-slate-950/80">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white truncate">
              Mood, Gesture &amp; Advanced Work
            </h2>
            <p className="text-xs text-slate-400 truncate">
              Live Emotion + Touchless Hand Gestures · Executive Work Studio
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Control Tabs */}
        <div className="px-4 pt-3 pb-2 bg-slate-950/50">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('mood_gesture')}
              className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'mood_gesture'
                  ? 'bg-pink-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Smile className="w-4 h-4 shrink-0" />
              <span>Mood &amp; Gesture</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('work')}
              className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'work'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4 shrink-0" />
              <span>Advanced Work</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {activeTab === 'mood_gesture' ? (
            <>
              {/* Current Mood & Gesture Readout */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-slate-400">Detected Owner Mood</div>
                    <div className={`text-sm font-bold mt-0.5 ${moodMeta.toneColor}`}>
                      {moodMeta.label} · {moodMeta.labelHi}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Last Gesture</div>
                    <div className="text-xs font-semibold text-slate-200 mt-0.5">
                      {gestureMeta.label}
                    </div>
                  </div>
                </div>

                {latestScan && (
                  <div className="pt-2.5 border-t border-white/10 text-xs text-slate-200 leading-relaxed" dir="auto">
                    {latestScan.spokenReply}
                  </div>
                )}

                {scanError && (
                  <div className="text-xs text-rose-300 font-medium" dir="auto">
                    {scanError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleScanMoodAndGestureNow}
                    disabled={isScanning}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isScanning ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <Camera className="w-4 h-4 shrink-0" />
                    )}
                    <span>{isScanning ? 'Scanning Face & Hand...' : 'Scan Mood & Gesture Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      audioService.unlock();
                      onToggleAutoGestureWatch();
                    }}
                    className={`min-h-[44px] px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      autoGestureWatch
                        ? 'bg-emerald-600 border-emerald-300 text-white'
                        : 'bg-slate-950 hover:bg-slate-800 border-white/15 text-slate-200'
                    }`}
                  >
                    <Hand className="w-4 h-4 shrink-0" />
                    <span>
                      {autoGestureWatch ? 'Live Gesture Watch: ON' : 'Auto Gesture Watch'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Live Camera Feed when active */}
              {zaraVision.getMode() === 'camera' && (
                <div className="rounded-2xl overflow-hidden border border-white/15 bg-black aspect-video relative">
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${
                      zaraVision.getFacingMode() === 'user' ? '-scale-x-100' : ''
                    }`}
                  />
                  <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-lg bg-black/70 text-[11px] text-slate-200 flex items-center justify-between">
                    <span>Camera Active — Show any hand gesture or expression</span>
                    <span className="text-emerald-300 font-semibold">LIVE</span>
                  </div>
                </div>
              )}

              {/* Touchless Gesture Guide */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-300">
                  Touchless Hand Gestures Supported by Zara
                </h3>
                <div className="divide-y divide-white/10 rounded-2xl bg-slate-900/70 border border-white/10">
                  {(
                    [
                      'open_palm_stop',
                      'peace_victory',
                      'thumbs_up',
                      'wave_hello',
                      'heart_sign',
                    ] as DetectedHandGesture[]
                  ).map((gKey) => (
                    <div
                      key={gKey}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="font-semibold text-white">
                        {GESTURE_ACTION_META[gKey].label}
                      </span>
                      <span className="text-slate-400 text-right">
                        {GESTURE_ACTION_META[gKey].actionSummary}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 1. AI Executive Work Studio */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">AI Smart Work Studio</h3>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/15 text-[11px] text-slate-200 focus:outline-none"
                  >
                    <option value="Urdu + English">Urdu + English</option>
                    <option value="English Professional">Professional English</option>
                    <option value="Hindi + English">Hindi + English</option>
                    <option value="Malay + English">Malay + English (Malaysia)</option>
                    <option value="Urdu">Pure Urdu</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {WORK_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setWorkMode(m.id)}
                      className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer ${
                        workMode === m.id
                          ? 'bg-cyan-600 border-cyan-300 text-white'
                          : 'bg-slate-950 hover:bg-slate-800 border-white/10 text-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={workPrompt}
                  onChange={(e) => setWorkPrompt(e.target.value)}
                  placeholder={
                    WORK_MODES.find((w) => w.id === workMode)?.placeholder ||
                    'Describe your work task...'
                  }
                  dir="auto"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />

                <button
                  type="button"
                  onClick={handleGenerateWorkOutput}
                  disabled={!workPrompt.trim() || isGeneratingWork}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-45 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isGeneratingWork ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>
                    {isGeneratingWork ? 'Zara Preparing Work Output...' : 'Generate Work Output'}
                  </span>
                </button>

                {workResult && (
                  <div className="pt-3 border-t border-white/10 space-y-2.5">
                    <div className="text-xs font-bold text-cyan-300">{workResult.title}</div>
                    <pre
                      dir="auto"
                      className="p-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed max-h-56 overflow-y-auto"
                    >
                      {workResult.output}
                    </pre>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(workResult.output).catch(() => {});
                          setCopiedWork(true);
                          window.setTimeout(() => setCopiedWork(false), 1800);
                        }}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedWork ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedWork ? 'Copied' : 'Copy'}</span>
                      </button>

                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(workResult.output)}`}
                        target="_top"
                        rel="noopener noreferrer"
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 no-underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Send on WhatsApp</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          audioService.speakText(workResult.output.slice(0, 360), {
                            language,
                            rate: voiceSpeed,
                            voiceName,
                          });
                        }}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-pink-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Read Aloud</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Deep-Work Focus Timer */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white">Deep-Work Focus Timer</div>
                  <div className="text-2xl font-extrabold text-cyan-300 tabular-nums mt-0.5">
                    {formatTimer(focusSecondsLeft)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFocusRunning((r) => !r)}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {focusRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{focusRunning ? 'Pause' : 'Start'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFocusRunning(false);
                      setFocusSecondsLeft(25 * 60);
                    }}
                    className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    aria-label="Reset Timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 3. Priority Work Task Checklist */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-300">Priority Work Checklist</h3>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTaskTitle.trim()) {
                        onAddWorkTask(newTaskTitle.trim(), newTaskPriority);
                        setNewTaskTitle('');
                      }
                    }}
                    placeholder="Add work task..."
                    dir="auto"
                    className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <select
                    value={newTaskPriority}
                    onChange={(e) =>
                      setNewTaskPriority(e.target.value as 'urgent' | 'today' | 'normal')
                    }
                    className="min-h-[40px] px-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-slate-200"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="today">Today</option>
                    <option value="normal">Normal</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newTaskTitle.trim()) return;
                      onAddWorkTask(newTaskTitle.trim(), newTaskPriority);
                      setNewTaskTitle('');
                    }}
                    className="min-h-[40px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="divide-y divide-white/10 rounded-2xl bg-slate-900/70 border border-white/10">
                  {workTasks.length === 0 ? (
                    <div className="p-4 text-xs text-slate-400 text-center">
                      No pending work tasks — add one above or tell Zara by voice.
                    </div>
                  ) : (
                    workTasks.map((t) => (
                      <div
                        key={t.id}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => onToggleWorkTask(t.id)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          {t.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div
                              className={`text-xs font-medium truncate ${
                                t.completed ? 'line-through text-slate-500' : 'text-slate-100'
                              }`}
                              dir="auto"
                            >
                              {t.title}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {t.priority === 'urgent'
                                ? 'Urgent Priority'
                                : t.priority === 'today'
                                ? 'Today'
                                : 'Scheduled'}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteWorkTask(t.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer shrink-0"
                          aria-label="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
