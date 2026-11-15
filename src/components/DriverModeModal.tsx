import React, { useEffect } from 'react';
import {
  Car,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bell,
  RotateCcw,
  X,
  MessageSquare,
} from 'lucide-react';
import {
  IncomingNotificationItem,
  Language,
  PersonalityConfig,
  SpokenNotificationConfig,
} from '../types';
import { audioService } from '../services/audioService';
import { buildSpokenNotificationAnnouncement } from '../services/androidAssistantBridgeService';

interface DriverModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  isThinking?: boolean;
  interimTranscript: string;
  latestZaraMessage: string;
  latestNotification?: IncomingNotificationItem | null;
  spokenConfig: SpokenNotificationConfig;
  onUpdateSpokenConfig: (updates: Partial<SpokenNotificationConfig>) => void;
  onToggleMic: () => void;
  onSendVoicePrompt?: (prompt: string) => Promise<void>;
  language: Language;
  config: PersonalityConfig;
  isOwnerVerified: boolean;
}

export const DriverModeModal: React.FC<DriverModeModalProps> = ({
  isOpen,
  onClose,
  isListening,
  isSpeaking,
  isThinking = false,
  interimTranscript,
  latestZaraMessage,
  latestNotification = null,
  spokenConfig,
  onUpdateSpokenConfig,
  onToggleMic,
  onSendVoicePrompt,
  language,
  config,
  isOwnerVerified,
}) => {
  // Ensure incoming messages are read aloud automatically while in Driver Mode
  useEffect(() => {
    if (!isOpen) return;
    if (!spokenConfig.enabled || !spokenConfig.announceMessages) {
      onUpdateSpokenConfig({ enabled: true, announceMessages: true, announceCalls: true });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const speakSafe = (text: string) => {
    if (!text.trim()) return;
    audioService.unlock();
    audioService.selfHealAudioPipeline();
    audioService.speakText(text, {
      language,
      rate: config.voiceSpeed,
      voiceName: config.voiceName || 'Zephyr',
      loveMode: isOwnerVerified ? config.loveMode : false,
      romanceIntensity: isOwnerVerified ? config.romanceIntensity : 'calm',
      emotionMode: isOwnerVerified ? config.emotionMode || 'calm' : 'calm',
    });
  };

  const handleReadLatestMessageOrAlert = () => {
    if (latestNotification) {
      const msg = buildSpokenNotificationAnnouncement(
        latestNotification,
        spokenConfig,
        language
      );
      speakSafe(msg);
      return;
    }
    speakSafe(latestZaraMessage || 'There are no new messages yet. Drive safely.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#020612] text-white flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
      {/* Top Safe-Driving Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/15">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border-2 border-sky-400 flex items-center justify-center shrink-0">
            <Car className="w-6 h-6 text-sky-300" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight truncate">
              Zara Driver Mode
            </h2>
            <p className="text-xs sm:text-sm text-emerald-300 font-semibold truncate">
              {isListening
                ? 'Microphone ACTIVE · Hands-Free Listening'
                : 'Hands-Free Paused · Tap Speak below'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            audioService.stopAudio();
            onClose();
          }}
          className="min-h-[56px] px-4 sm:px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 border-2 border-white/25 text-white font-bold text-sm flex items-center gap-2 shrink-0 cursor-pointer"
          aria-label="Exit Driver Mode"
        >
          <X className="w-5 h-5" />
          <span>Exit</span>
        </button>
      </div>

      {/* High-Contrast Spoken Readout Card */}
      <div className="my-4 flex-1 flex flex-col justify-center gap-4 max-w-2xl w-full mx-auto">
        {interimTranscript && (
          <div className="p-4 rounded-2xl bg-emerald-950/70 border-2 border-emerald-400/70">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
              Hearing You Now
            </div>
            <p className="text-lg sm:text-xl font-semibold text-white leading-snug">
              &ldquo;{interimTranscript}&rdquo;
            </p>
          </div>
        )}

        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/95 border-2 border-sky-400/50 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-sky-300">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              <span>Zara Spoken Assistant</span>
            </span>
            <span>{isSpeaking ? 'Speaking...' : isThinking ? 'Thinking...' : 'Ready'}</span>
          </div>
          <p className="text-lg sm:text-2xl font-semibold text-white leading-relaxed">
            {latestZaraMessage || 'Driver Mode is ready. Speak naturally to check messages, set reminders, or talk safely.'}
          </p>
        </div>

        {latestNotification && (
          <div className="p-4 rounded-2xl bg-indigo-950/70 border-2 border-indigo-400/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Bell className="w-6 h-6 text-indigo-300 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {latestNotification.appName} · {latestNotification.sender}
                </div>
                <div className="text-sm text-indigo-200 truncate">
                  {latestNotification.body || 'Incoming alert'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReadLatestMessageOrAlert}
              className="min-h-[52px] px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-extrabold text-sm shrink-0 cursor-pointer"
            >
              Read
            </button>
          </div>
        )}
      </div>

      {/* Oversized Safe-Touch Action Controls (>= 64px height) */}
      <div className="max-w-2xl w-full mx-auto space-y-3">
        <button
          type="button"
          onClick={() => {
            audioService.unlock();
            onToggleMic();
          }}
          className={`min-h-[76px] w-full rounded-3xl font-extrabold text-lg sm:text-xl flex items-center justify-center gap-3 cursor-pointer transition-transform active:scale-[0.99] ${
            isListening
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-2 border-emerald-200'
              : 'bg-sky-500 hover:bg-sky-400 text-slate-950 border-2 border-sky-200'
          }`}
        >
          {isListening ? (
            <>
              <Mic className="w-7 h-7" />
              <span>Mic ON · Listening Hands-Free (Tap to Pause)</span>
            </>
          ) : (
            <>
              <MicOff className="w-7 h-7" />
              <span>Tap to Start Hands-Free Voice</span>
            </>
          )}
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleReadLatestMessageOrAlert}
            className="min-h-[64px] px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border-2 border-white/20 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <Volume2 className="w-5 h-5 text-sky-400 shrink-0" />
            <span>Read Last Message</span>
          </button>

          <button
            type="button"
            onClick={() => speakSafe(latestZaraMessage)}
            className="min-h-[64px] px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border-2 border-white/20 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Replay Reply</span>
          </button>

          {isSpeaking ? (
            <button
              type="button"
              onClick={() => audioService.stopAudio()}
              className="min-h-[64px] px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 border-2 border-rose-300 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              <VolumeX className="w-5 h-5 shrink-0" />
              <span>Mute Speech</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onSendVoicePrompt) {
                  onSendVoicePrompt('Check my schedule and remind me of anything urgent');
                }
              }}
              className="min-h-[64px] px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border-2 border-white/20 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              <Bell className="w-5 h-5 text-amber-400 shrink-0" />
              <span>Check Reminders</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
