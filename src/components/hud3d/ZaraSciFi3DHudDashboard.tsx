import React, { useState, useRef, useEffect } from 'react';
import {
  Power,
  Mic,
  MicOff,
  Send,
  Square,
  Volume2,
  Settings,
  ShieldCheck,
  PhoneCall,
  Camera,
  MonitorUp,
  Car,
  FolderOpen,
  Zap,
  Check,
  ExternalLink,
} from 'lucide-react';
import { HoloParticleFace3D } from './HoloParticleFace3D';
import { audioService } from '../../services/audioService';
import { DirectMicSession } from '../../services/voiceCaptureService';
import {
  ChatMessage,
  Language,
  PersonalityConfig,
  SecurityAndControlConfig,
  ZaraEmotionMode,
  ZaraUiThemeId,
} from '../../types';

interface ThemePalette {
  ambientTint: string;
  accentText: string;
  userBubble: string;
  heroIdle: string;
  allSystemsIdle: string;
  sendBtn: string;
  inputFocus: string;
  meterFill: string;
  speakBtn: string;
}

const UI_THEME_PALETTES: Record<ZaraUiThemeId, ThemePalette> = {
  cyber_cyan: {
    ambientTint: 'from-sky-950/30',
    accentText: 'text-sky-400',
    userBubble: 'bg-sky-600 text-white',
    heroIdle: 'bg-sky-500 hover:bg-sky-400 text-slate-950 border border-sky-300/40',
    allSystemsIdle:
      'bg-[#11192e] hover:bg-[#172340] border border-sky-400/35 text-sky-100',
    sendBtn: 'bg-sky-500 hover:bg-sky-400 text-slate-950',
    inputFocus: 'focus:border-sky-400',
    meterFill: 'bg-sky-400',
    speakBtn: 'text-sky-400 hover:text-sky-300',
  },
  royal_violet: {
    ambientTint: 'from-violet-950/35',
    accentText: 'text-violet-400',
    userBubble: 'bg-violet-600 text-white',
    heroIdle: 'bg-violet-500 hover:bg-violet-400 text-white border border-violet-300/40',
    allSystemsIdle:
      'bg-[#16132b] hover:bg-[#1f1a3b] border border-violet-400/35 text-violet-100',
    sendBtn: 'bg-violet-500 hover:bg-violet-400 text-white',
    inputFocus: 'focus:border-violet-400',
    meterFill: 'bg-violet-400',
    speakBtn: 'text-violet-400 hover:text-violet-300',
  },
  emerald_matrix: {
    ambientTint: 'from-emerald-950/30',
    accentText: 'text-emerald-400',
    userBubble: 'bg-emerald-600 text-white',
    heroIdle: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-300/40',
    allSystemsIdle:
      'bg-[#0c1d1a] hover:bg-[#122b26] border border-emerald-400/35 text-emerald-100',
    sendBtn: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
    inputFocus: 'focus:border-emerald-400',
    meterFill: 'bg-emerald-400',
    speakBtn: 'text-emerald-400 hover:text-emerald-300',
  },
  crimson_flare: {
    ambientTint: 'from-rose-950/35',
    accentText: 'text-rose-400',
    userBubble: 'bg-rose-600 text-white',
    heroIdle: 'bg-rose-500 hover:bg-rose-400 text-white border border-rose-300/40',
    allSystemsIdle:
      'bg-[#211119] hover:bg-[#2d1622] border border-rose-400/35 text-rose-100',
    sendBtn: 'bg-rose-500 hover:bg-rose-400 text-white',
    inputFocus: 'focus:border-rose-400',
    meterFill: 'bg-rose-400',
    speakBtn: 'text-rose-400 hover:text-rose-300',
  },
  golden_aura: {
    ambientTint: 'from-amber-950/30',
    accentText: 'text-amber-400',
    userBubble: 'bg-amber-600 text-slate-950 font-medium',
    heroIdle: 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-300/40',
    allSystemsIdle:
      'bg-[#1e180c] hover:bg-[#2a2210] border border-amber-400/35 text-amber-100',
    sendBtn: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
    inputFocus: 'focus:border-amber-400',
    meterFill: 'bg-amber-400',
    speakBtn: 'text-amber-400 hover:text-amber-300',
  },
};

const QUICK_STARTERS = [
  { label: 'السلام علیکم زارا، آج کا موسم کیسا ہے؟', caption: 'Urdu test' },
  { label: 'मेरा एक छोटा सा सवाल है, पूरा सुनकर जवाब दो', caption: 'Hindi test' },
  { label: 'Summarize how you can help me today', caption: 'English test' },
];

interface ZaraSciFi3DHudDashboardProps {
  isSpeaking: boolean;
  isListening: boolean;
  isThinking?: boolean;
  micVolume?: number;
  interimTranscript?: string;
  subtitleText: string;
  messages: ChatMessage[];
  config: PersonalityConfig;
  onUpdateConfig: (updates: Partial<PersonalityConfig>) => void;
  onSendMessage: (text: string) => Promise<string>;
  onSendAudioWav?: (wavBase64: string, mimeType?: string) => Promise<void>;
  onToggleMic: () => void;
  onEnableAllFunctions?: () => Promise<void>;
  allFunctionsActive?: boolean;
  onOpenAudioCall?: () => void;
  onOpenSettings: () => void;
  securityConfig?: SecurityAndControlConfig;
  isOwnerVerified?: boolean;
  language?: Language;
  onOpenSecurity?: () => void;
  onOpenPermissions?: () => void;
  onOpenChat?: () => void;
  onOpenAiStudio?: (tab?: any) => void;
  onLockPhoneNow?: () => void;
  onGrantAllPermissions?: () => Promise<void>;
  antiTouchArmed?: boolean;
  onOpenMemories?: () => void;
  onOpenSkills?: () => void;
  onOpenCharacter?: () => void;
  onSwitchToStudioMode?: () => void;
  onSelectLanguage?: (lang: Language) => void;
  userNickname?: string;
  visionMode?: 'off' | 'camera' | 'screen';
  cameraFacing?: 'user' | 'environment';
  onStartCamera?: () => void;
  onStopCamera?: () => void;
  onToggleScreenShare?: () => void;
  onOpenDriverMode?: () => void;
  onOpenFileManager?: () => void;
}

export const ZaraSciFi3DHudDashboard: React.FC<ZaraSciFi3DHudDashboardProps> = ({
  isSpeaking,
  isListening,
  isThinking = false,
  micVolume = 0,
  interimTranscript = '',
  subtitleText,
  messages,
  config,
  onSendMessage,
  onSendAudioWav,
  onToggleMic,
  onEnableAllFunctions,
  allFunctionsActive = false,
  onOpenAudioCall,
  onOpenSettings,
  isOwnerVerified = false,
  language = 'auto',
  visionMode = 'off',
  cameraFacing = 'user',
  onStartCamera,
  onStopCamera,
  onToggleScreenShare,
  onOpenDriverMode,
  onOpenFileManager,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEnablingAll, setIsEnablingAll] = useState(false);
  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const [clipVol, setClipVol] = useState(0);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const clipMicRef = useRef<DirectMicSession | null>(null);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript, isThinking]);

  useEffect(() => {
    return () => {
      clipMicRef.current?.stopAndDiscard();
    };
  }, []);

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;
    setInputText('');
    setIsSending(true);
    audioService.unlock();
    try {
      await onSendMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleEnableAllClick = async () => {
    if (!onEnableAllFunctions || isEnablingAll) return;
    audioService.unlock();
    setIsEnablingAll(true);
    try {
      await onEnableAllFunctions();
    } finally {
      setIsEnablingAll(false);
    }
  };

  const handleToggleVoiceMessageClip = async () => {
    audioService.unlock();
    if (isRecordingClip) {
      const wav = clipMicRef.current?.finishAndGetWav();
      setIsRecordingClip(false);
      setClipVol(0);
      if (wav && onSendAudioWav) {
        setIsSending(true);
        try {
          await onSendAudioWav(wav, 'audio/wav');
        } finally {
          setIsSending(false);
        }
      }
      return;
    }

    audioService.stopAudio();
    audioService.playChime('activate');
    const session = new DirectMicSession();
    clipMicRef.current = session;
    setIsRecordingClip(true);

    const ok = await session.start({
      onVolume: (v) => setClipVol(v),
      onAutoFinish: async (wav) => {
        setIsRecordingClip(false);
        setClipVol(0);
        if (onSendAudioWav) {
          setIsSending(true);
          try {
            await onSendAudioWav(wav, 'audio/wav');
          } finally {
            setIsSending(false);
          }
        }
      },
      onError: () => {
        setIsRecordingClip(false);
        setClipVol(0);
      },
    });
    if (!ok) {
      setIsRecordingClip(false);
      setClipVol(0);
    }
  };

  const activeUiTheme: ZaraUiThemeId = config.uiTheme || 'cyber_cyan';
  const theme = UI_THEME_PALETTES[activeUiTheme] || UI_THEME_PALETTES.cyber_cyan;
  const showQuickBar = config.showHudQuickBar !== false;

  const isHeartLocked = Boolean(config.heartLockEnabled && !config.heartLockUnlocked);
  const activeEmotion: ZaraEmotionMode = isHeartLocked
    ? 'calm'
    : config.emotionMode || 'apnapan';

  const activeMicLevel = isRecordingClip ? clipVol : micVolume;
  const statusCenterText = isSpeaking
    ? 'Speaking'
    : isThinking
    ? 'Thinking'
    : isListening
    ? 'Listening continuously'
    : 'Ready';

  const activeAssistantLabel =
    config.activeAssistantId && config.activeAssistantId !== 'zara'
      ? config.activeAssistantId.replace(/_/g, ' ')
      : 'Zara';

  return (
    <div className="relative w-full min-h-screen bg-[#060913] text-slate-100 flex flex-col overflow-x-hidden">
      <div
        className={`fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${theme.ambientTint} via-[#060913] to-[#04060d]`}
      />

      {/* 3-ZONE TOP HEADER BAR (<= 56px) */}
      <header className="relative z-30 h-14 w-full px-4 sm:px-6 border-b border-white/[0.08] bg-[#060913]/95 backdrop-blur-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold tracking-tight text-lg text-white whitespace-nowrap shrink-0">
            Zara AI
          </span>
          {isOwnerVerified && (
            <span className="hidden sm:inline text-xs font-medium text-emerald-400 whitespace-nowrap shrink-0">
              · Owner Verified
            </span>
          )}
        </div>

        <div className="min-w-0 text-center">
          <span
            className={`text-xs font-medium whitespace-nowrap ${
              isSpeaking
                ? theme.accentText
                : isListening
                ? 'text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            {statusCenterText}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="min-h-[44px] px-3.5 rounded-lg bg-[#0b1120] hover:bg-[#131d36] border border-white/[0.1] text-xs font-semibold text-slate-100 flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          aria-label="Open Settings"
        >
          {isOwnerVerified ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Settings className={`w-4 h-4 ${theme.accentText} shrink-0`} />
          )}
          <span>Settings</span>
        </button>
      </header>

      {/* COMMAND DECK: 3D STAGE + HERO CONTROLS (LEFT) | CONVERSATION & COMPOSER (RIGHT) */}
      <main className="relative z-20 flex-1 w-full max-w-7xl mx-auto p-3.5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        {/* LEFT COLUMN: 3D CORE STAGE + BIG HERO CONTINUOUS TALK + ALL SYSTEMS ON + HARDWARE DOCK */}
        <section className="lg:col-span-6 flex flex-col justify-between rounded-2xl bg-[#0b1120] border border-white/[0.08] p-4 sm:p-5 gap-3.5">
          {/* Active Hardware Privacy Controls (only rendered when Mic / Cam / Screen is actually live) */}
          {(isListening || isRecordingClip || visionMode !== 'off') && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              {(isListening || isRecordingClip) && (
                <button
                  type="button"
                  onClick={isListening ? onToggleMic : handleToggleVoiceMessageClip}
                  className="min-h-[36px] px-3 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 flex items-center gap-1.5 cursor-pointer"
                  title="Tap to stop microphone"
                >
                  <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Mic Live · Stop</span>
                </button>
              )}
              {visionMode === 'camera' && (
                <button
                  type="button"
                  onClick={onStopCamera}
                  className="min-h-[36px] px-3 rounded-lg bg-sky-500/15 border border-sky-400/40 text-sky-200 flex items-center gap-1.5 cursor-pointer"
                  title="Tap to turn Camera OFF"
                >
                  <Camera className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>
                    {cameraFacing === 'environment' ? 'Back Cam Live' : 'Front Cam Live'} · Stop
                  </span>
                </button>
              )}
              {visionMode === 'screen' && (
                <button
                  type="button"
                  onClick={onToggleScreenShare}
                  className="min-h-[36px] px-3 rounded-lg bg-indigo-500/15 border border-indigo-400/40 text-indigo-200 flex items-center gap-1.5 cursor-pointer"
                  title="Tap to stop Screen Share"
                >
                  <MonitorUp className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Screen Share Live · Stop</span>
                </button>
              )}
            </div>
          )}

          {/* Framed 3D Mecha Robot Core + Real-Time Mic Audio Meter & Transcript Dock */}
          <div className="relative flex-1 min-h-[250px] sm:min-h-[340px] rounded-xl bg-[#060913] border border-white/[0.07] overflow-hidden flex flex-col justify-between">
            <div className="flex-1 relative min-h-[200px]">
              <HoloParticleFace3D
                isSpeaking={isSpeaking}
                isListening={isListening || isRecordingClip}
                micVolume={activeMicLevel}
                emotionMode={activeEmotion}
                uiTheme={activeUiTheme}
                heartLockLocked={isHeartLocked}
                onTapOrb={() => {
                  if (isSpeaking) audioService.stopAudio();
                }}
                className="w-full h-full"
              />
            </div>

            {/* Real-time Audio Level Bar + Live Transcript / Latest Status Strip */}
            <div className="px-3.5 py-2.5 border-t border-white/[0.06] bg-[#080d1b]/95 space-y-1.5">
              <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    isListening || isRecordingClip ? 'bg-emerald-400' : theme.meterFill
                  }`}
                  style={{
                    width: `${
                      isSpeaking
                        ? 72
                        : isListening || isRecordingClip
                        ? Math.max(8, Math.min(100, activeMicLevel * 1.4))
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-300 truncate">
                {interimTranscript
                  ? `Hearing: "${interimTranscript}"`
                  : subtitleText || 'Tap the big button below to start continuous voice replies.'}
              </p>
            </div>
          </div>

          {/* ONE BIG HERO BUTTON: CONTINUOUS HANDS-FREE LISTEN & REPLY LOOP */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                audioService.unlock();
                onToggleMic();
              }}
              className={`min-h-[68px] w-full px-5 py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-between gap-3 cursor-pointer transition-transform active:scale-[0.99] ${
                isListening
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-300/60'
                  : theme.heroIdle
              }`}
              aria-label={isListening ? 'Stop Continuous Talk' : 'Start Continuous Talk with Zara'}
            >
              <span className="flex items-center gap-3 min-w-0 text-left">
                <span
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isListening ? 'bg-slate-950/15' : 'bg-black/15'
                  }`}
                >
                  {isListening ? (
                    <Mic className="w-5 h-5 shrink-0" />
                  ) : (
                    <MicOff className="w-5 h-5 shrink-0" />
                  )}
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="leading-tight">
                    {isListening
                      ? 'Continuous Talk ON · بات جاری ہے'
                      : 'Start Continuous Talk · مسلسل بات کریں'}
                  </span>
                  <span className="text-[11px] font-medium opacity-85 truncate">
                    {isListening
                      ? 'Full sentence listening & auto voice reply active (Tap to stop)'
                      : 'Tap once — Zara listens, understands full speech & replies automatically'}
                  </span>
                </span>
              </span>
              <Power className="w-5 h-5 shrink-0" />
            </button>

            {/* ONE-TAP ALL SYSTEMS ON + DIRECT AUDIO CALL */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {onEnableAllFunctions && (
                <button
                  type="button"
                  onClick={handleEnableAllClick}
                  disabled={isEnablingAll}
                  className={`sm:col-span-7 min-h-[52px] w-full px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.99] ${
                    allFunctionsActive
                      ? 'bg-emerald-500/15 hover:bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
                      : theme.allSystemsIdle
                  }`}
                  aria-label="Turn All Zara Systems ON"
                >
                  {allFunctionsActive ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Zap className={`w-4 h-4 ${theme.accentText} shrink-0`} />
                  )}
                  <span className="whitespace-nowrap">
                    {isEnablingAll
                      ? 'Turning All Systems ON...'
                      : allFunctionsActive
                      ? 'All Systems ON · سب آن ہیں'
                      : 'All Systems ON · سب سسٹمز آن کریں'}
                  </span>
                </button>
              )}

              {onOpenAudioCall && (
                <button
                  type="button"
                  onClick={() => {
                    audioService.unlock();
                    onOpenAudioCall();
                  }}
                  className={`${
                    onEnableAllFunctions ? 'sm:col-span-5' : 'sm:col-span-12'
                  } min-h-[52px] w-full px-4 py-2.5 rounded-xl bg-[#11192e] hover:bg-[#172340] border border-white/[0.12] text-slate-100 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.99]`}
                  aria-label="Start Live Audio Call with Zara"
                >
                  <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="whitespace-nowrap">Audio Call · آڈیو کال</span>
                </button>
              )}
            </div>

            {isSpeaking && (
              <button
                type="button"
                onClick={() => audioService.stopAudio()}
                className="min-h-[44px] w-full rounded-xl bg-rose-950/50 hover:bg-rose-950/80 border border-rose-400/40 text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Speaking</span>
              </button>
            )}

            {/* Compact Hardware & Utility Quick Dock */}
            {showQuickBar &&
              (onStartCamera || onToggleScreenShare || onOpenDriverMode || onOpenFileManager) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                  {onStartCamera && (
                    <button
                      type="button"
                      onClick={visionMode === 'camera' ? onStopCamera : onStartCamera}
                      className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        visionMode === 'camera'
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                          : 'bg-[#080d1b] hover:bg-[#11192e] border-white/[0.08] text-slate-300'
                      }`}
                    >
                      <Camera className="w-4 h-4 shrink-0" />
                      <span>{visionMode === 'camera' ? 'Cam OFF' : 'Camera'}</span>
                    </button>
                  )}
                  {onToggleScreenShare && (
                    <button
                      type="button"
                      onClick={onToggleScreenShare}
                      className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        visionMode === 'screen'
                          ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                          : 'bg-[#080d1b] hover:bg-[#11192e] border-white/[0.08] text-slate-300'
                      }`}
                    >
                      <MonitorUp className="w-4 h-4 shrink-0" />
                      <span>{visionMode === 'screen' ? 'Screen OFF' : 'Screen'}</span>
                    </button>
                  )}
                  {onOpenDriverMode && (
                    <button
                      type="button"
                      onClick={onOpenDriverMode}
                      className="min-h-[44px] px-3 rounded-xl bg-[#080d1b] hover:bg-[#11192e] border border-white/[0.08] text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Car className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Driver</span>
                    </button>
                  )}
                  {onOpenFileManager && (
                    <button
                      type="button"
                      onClick={onOpenFileManager}
                      className="min-h-[44px] px-3 rounded-xl bg-[#080d1b] hover:bg-[#11192e] border border-white/[0.08] text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Files</span>
                    </button>
                  )}
                </div>
              )}
          </div>
        </section>

        {/* RIGHT COLUMN: CONVERSATION HISTORY, VOICE REPLAY & TEXT/AUDIO COMPOSER */}
        <section className="lg:col-span-6 flex flex-col rounded-2xl bg-[#0b1120] border border-white/[0.08] overflow-hidden h-[500px] lg:h-auto lg:max-h-[calc(100vh-5.5rem)]">
          <div className="px-4 py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-white truncate">
                Messages &amp; Replies
              </span>
              <span className="text-xs text-slate-400 tabular-nums shrink-0">
                · {messages.length}
              </span>
            </div>
            <span className="text-xs text-slate-400 capitalize truncate">
              {activeAssistantLabel} · Text &amp; Voice
            </span>
          </div>

          {/* Scrollable Conversation Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 select-text">
            {messages.length <= 1 && (
              <div className="rounded-xl bg-[#080d1b] border border-white/[0.07] p-3 space-y-2">
                <p className="text-xs font-medium text-slate-300">
                  Quick test prompts (tap any to try):
                </p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_STARTERS.map((q) => (
                    <button
                      key={q.caption}
                      type="button"
                      onClick={() => {
                        audioService.unlock();
                        onSendMessage(q.label);
                      }}
                      className="min-h-[40px] w-full px-3 py-2 rounded-lg bg-[#0f172a] hover:bg-[#172340] border border-white/[0.07] text-left text-xs text-slate-200 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                    >
                      <span className="truncate">{q.label}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">{q.caption}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl ${
                      isUser
                        ? `${theme.userBubble} rounded-br-sm`
                        : 'bg-[#121a30] border border-white/[0.08] text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        alt="Message attachment"
                        referrerPolicy="no-referrer"
                        className="w-full max-h-48 object-cover rounded-xl mb-2"
                      />
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                      {m.text}
                    </p>
                    {Array.isArray(m.sources) && m.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/[0.08] flex flex-wrap gap-2">
                        {m.sources.slice(0, 3).map((src, idx) => (
                          <a
                            key={`${m.id}-src-${idx}`}
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-sky-300 hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[160px]">
                              {src.title || 'Source'}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 px-1 text-[11px] text-slate-400">
                    <span>{isUser ? 'You' : m.assistantLabel || 'Zara AI'}</span>
                    <span>·</span>
                    <span className="tabular-nums">{m.timestamp}</span>
                    {!isUser && (
                      <>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => {
                            audioService.unlock();
                            audioService.speakText(m.text, {
                              language,
                              voiceName: config.voiceName,
                              loveMode: config.loveMode,
                              emotionMode: activeEmotion,
                            });
                          }}
                          className={`${theme.speakBtn} min-h-[28px] px-1 flex items-center gap-1 cursor-pointer`}
                          title="Listen to reply"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Speak</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {isThinking && (
              <div className="flex items-start">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[#121a30] border border-white/[0.08] text-xs text-slate-300">
                  Zara is thinking &amp; preparing a clear answer...
                </div>
              </div>
            )}

            <div ref={chatScrollRef} />
          </div>

          {/* Bottom Composer Bar (Voice Clip + Text Input + Send) */}
          <form
            onSubmit={handleSendText}
            className="p-3 border-t border-white/[0.08] bg-[#080d1b] flex items-center gap-2"
          >
            {onSendAudioWav && (
              <button
                type="button"
                onClick={handleToggleVoiceMessageClip}
                disabled={isSending}
                className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                  isRecordingClip
                    ? 'bg-rose-600 border-rose-400 text-white'
                    : 'bg-[#0f172a] hover:bg-[#172340] border-white/[0.12] text-sky-400'
                }`}
                aria-label={isRecordingClip ? 'Stop & Send Voice Message' : 'Record Voice Message'}
                title={isRecordingClip ? 'Tap to Send Voice' : 'Send Voice Message'}
              >
                {isRecordingClip ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isRecordingClip
                  ? 'Recording full voice message... tap square to send'
                  : 'Write in Urdu, Hindi, or English...'
              }
              disabled={isRecordingClip}
              className={`flex-1 min-w-0 min-h-[44px] px-3.5 rounded-xl bg-[#0f172a] border border-white/[0.12] text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none ${theme.inputFocus} disabled:opacity-60`}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSending || isRecordingClip}
              className={`min-h-[44px] min-w-[44px] rounded-xl ${theme.sendBtn} disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer transition-colors`}
              aria-label="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};
