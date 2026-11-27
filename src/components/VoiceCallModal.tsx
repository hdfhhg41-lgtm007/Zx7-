import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Send,
  Camera,
  MonitorUp,
  ExternalLink,
  Copy,
  Check,
  Minimize2,
  Maximize2,
  SkipForward,
  MoreVertical,
  Volume2,
  VolumeX,
  Grid3X3,
  Heart,
  X,
} from 'lucide-react';
import {
  DEFAULT_ZARA_CALL_PORTRAIT_ID,
  getZaraPortraitById,
  isBuiltin2DPortraitId,
} from '../data/zaraPortraits';
import {
  ZaraCrownWordmark,
  ZaraPurpleBackdropDecor,
  ZaraVerifiedCheckBadge,
} from './ZaraRoyalDecor';
import { audioService } from '../services/audioService';
import { LivePhoneCallController } from '../services/voiceCaptureService';
import { copySelectedOrFullText } from '../services/androidAssistantBridgeService';
import {
  closeMobileAppNow,
  launchMobileAppNow,
  MobileAppDefinition,
  zaraVision,
} from '../services/visionAndControlService';
import {
  ChatMessage,
  Language,
  PersonalityConfig,
  VisionMode,
  ZaraVoiceName,
  ZARA_VOICE_PROFILES,
} from '../types';

interface VoiceCallModalProps {
  isOpen: boolean;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  audioOnly?: boolean;
  onClose: () => void;
  onCloseZaraApp?: () => void;
  config: PersonalityConfig;
  onUpdateConfig: (updates: Partial<PersonalityConfig>) => void;
  language: Language;
  messages: ChatMessage[];
  visionMode: VisionMode;
  autoAppLaunch: boolean;
  memoryDigest?: string;
  isOwnerVerified?: boolean;
  onVoiceTurnComplete: (userText: string, zaraText: string) => void;
  onOpenMobileSettings?: (settingId: string) => void;
  onRequestCallOrMessageConfirmation?: (transcript: string) => void;
}

const CALL_WAVE_MULTIPLIERS = [0.45, 0.85, 1.15, 0.7, 1.0, 0.55];

const RING_HEARTS: { className: string; size: string; delay: string }[] = [
  { className: '-top-1 left-2', size: 'w-6 h-6', delay: '0s' },
  { className: 'top-10 -left-5', size: 'w-4 h-4', delay: '0.6s' },
  { className: 'bottom-9 -left-6', size: 'w-6 h-6', delay: '1.1s' },
  { className: '-bottom-2 left-8', size: 'w-4 h-4', delay: '1.7s' },
  { className: '-top-1 right-2', size: 'w-5 h-5', delay: '0.3s' },
  { className: 'top-14 -right-5', size: 'w-4 h-4', delay: '0.9s' },
  { className: 'bottom-6 -right-3', size: 'w-5 h-5', delay: '1.4s' },
];

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  isMinimized = false,
  onToggleMinimize,
  audioOnly = true,
  onClose,
  onCloseZaraApp,
  config,
  onUpdateConfig,
  language,
  messages,
  visionMode,
  autoAppLaunch,
  memoryDigest = '',
  isOwnerVerified = false,
  onVoiceTurnComplete,
  onOpenMobileSettings,
  onRequestCallOrMessageConfirmation,
}) => {
  const [callStatus, setCallStatus] = useState<
    'connecting' | 'connected' | 'fallback_connected' | 'error'
  >('connecting');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isZaraSpeaking, setIsZaraSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [micVolume, setMicVolume] = useState(0);
  const [userCaption, setUserCaption] = useState('');
  const [zaraCaption, setZaraCaption] = useState('Calling...');
  const [quickText, setQuickText] = useState('');
  const [callError, setCallError] = useState<string | null>(null);
  const [copiedLiveCaption, setCopiedLiveCaption] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [activeSubPanel, setActiveSubPanel] = useState<'none' | 'keypad' | 'voice'>('none');
  const [voiceTestStatus, setVoiceTestStatus] = useState<string | null>(null);
  const [launchedAppBanner, setLaunchedAppBanner] = useState<{
    mode: 'open' | 'close';
    app: MobileAppDefinition | null;
    href: string;
    label: string;
  } | null>(null);

  const controllerRef = useRef<LivePhoneCallController | null>(null);
  const screenInputRef = useRef<HTMLInputElement | null>(null);
  const videoFeedRef = useRef<HTMLVideoElement | null>(null);

  const callPortraitId =
    !config.portraitId ||
    config.portraitId === 'royal_home' ||
    (!isBuiltin2DPortraitId(config.portraitId) && !config.portraitId.startsWith('custom_'))
      ? DEFAULT_ZARA_CALL_PORTRAIT_ID
      : config.portraitId;
  const activePortrait = getZaraPortraitById(callPortraitId);

  useEffect(() => {
    const unsub = audioService.subscribeSpeaking((speaking) => {
      setIsZaraSpeaking(speaking);
    });
    return unsub;
  }, []);

  useEffect(() => {
    return zaraVision.subscribe((_mode, stream) => {
      if (videoFeedRef.current) {
        videoFeedRef.current.srcObject = stream || null;
        if (stream) {
          videoFeedRef.current.play().catch(() => {});
        }
      }
    });
  }, []);

  useEffect(() => {
    controllerRef.current?.updateContext(config, language, messages, memoryDigest);
  }, [config, language, messages, memoryDigest]);

  useEffect(() => {
    if (!isOpen) {
      setCallSeconds(0);
      return;
    }
    const timer = window.setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      controllerRef.current?.stop();
      controllerRef.current = null;
      return;
    }

    setCallError(null);
    setLaunchedAppBanner(null);
    setUserCaption('');
    setShowMoreMenu(false);
    setActiveSubPanel('none');
    setIsSpeakerOn(true);
    setZaraCaption(
      audioOnly
        ? 'Calling...'
        : 'Zara connecting live video call...'
    );
    setIsMuted(false);
    setMicVolume(0);

    if (!audioOnly && isOwnerVerified && zaraVision.getMode() === 'off') {
      zaraVision.startCamera('user').catch(() => {});
    }

    const ctrl = new LivePhoneCallController(
      config,
      language,
      messages,
      {
        onStatusChange: (st) => {
          setCallStatus(st);
          if (st === 'connected' || st === 'fallback_connected') {
            setZaraCaption(
              audioOnly
                ? 'Live ON — Listening patiently, speak freely anytime.'
                : 'Live Video ON — Listening patiently, speak freely anytime.'
            );
          }
        },
        onMicVolume: (vol) => setMicVolume(vol),
        onUserSpeakingChange: (speaking) => setIsUserSpeaking(speaking),
        onUserTranscript: (txt) => setUserCaption(txt),
        onZaraTranscript: (txt) => {
          if (txt) setZaraCaption(txt);
        },
        onTurnPairComplete: (u, z) => {
          onVoiceTurnComplete(u, z);
        },
        onDeviceAction: (action, appId, query) => {
          if (action === 'drop_call' || action === 'back') {
            audioService.playChime('tap');
            controllerRef.current?.stop();
            controllerRef.current = null;
            onClose();
            return;
          }
          if (action === 'close_zara') {
            audioService.playChime('call_end');
            controllerRef.current?.stop();
            controllerRef.current = null;
            onClose();
            onCloseZaraApp?.();
            return;
          }
          if (!autoAppLaunch) return;
          if (action === 'close') {
            const closeRes = closeMobileAppNow(appId);
            setLaunchedAppBanner({
              mode: 'close',
              app: closeRes.app,
              href: '',
              label: closeRes.app
                ? `Closed & turned off ${closeRes.app.name} ✓`
                : 'Closed all active mobile apps ✓',
            });
            return;
          }

          const result = launchMobileAppNow(
            appId,
            query,
            () => {
              zaraVision.startCamera('user');
            },
            (settingId) => {
              onOpenMobileSettings?.(settingId);
            }
          );
          if (result.app) {
            setLaunchedAppBanner({
              mode: 'open',
              app: result.app,
              href: result.href,
              label: `${result.app.name} opened on mobile!`,
            });
          }
        },
        onRequestCallOrMessageConfirmation: (transcript) => {
          if (onRequestCallOrMessageConfirmation) {
            controllerRef.current?.stop();
            controllerRef.current = null;
            onClose();
            onRequestCallOrMessageConfirmation(transcript);
          }
        },
        onError: (msg) => setCallError(msg),
      },
      memoryDigest,
      audioOnly
    );

    controllerRef.current = ctrl;
    ctrl.start();

    return () => {
      ctrl.stop();
      controllerRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleToggleMute = () => {
    audioService.unlock();
    const next = !isMuted;
    setIsMuted(next);
    controllerRef.current?.setMuted(next);
    audioService.playChime(next ? 'tap' : 'activate');
  };

  const handleToggleSpeaker = () => {
    audioService.unlock();
    const next = !isSpeakerOn;
    setIsSpeakerOn(next);
    if (!next) {
      audioService.stopAudio();
      audioService.playChime('tap');
    } else {
      audioService.playChime('activate');
      if (zaraCaption && callStatus !== 'connecting') {
        audioService.speakText(zaraCaption, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
          loveMode: config.loveMode,
          emotionMode: config.emotionMode || 'apnapan',
        });
      }
    }
  };

  const handleEndCall = () => {
    audioService.playChime('call_end');
    controllerRef.current?.stop();
    controllerRef.current = null;
    onClose();
  };

  const handleSwitchVoice = () => {
    audioService.playChime('tap');
    const idx = ZARA_VOICE_PROFILES.findIndex((v) => v.id === config.voiceName);
    const next = ZARA_VOICE_PROFILES[(idx + 1) % ZARA_VOICE_PROFILES.length];
    onUpdateConfig({ voiceName: next.id as ZaraVoiceName, voiceGender: next.gender });
  };

  const handleToggleCameraInCall = async () => {
    audioService.unlock();
    audioService.playChime('activate');
    if (visionMode === 'camera') {
      zaraVision.stop();
    } else {
      const res = await zaraVision.startCamera('user');
      if (res.ok) {
        window.setTimeout(() => {
          controllerRef.current?.sendTextInCall(
            'Zara camera is on, look at me and tell me how I look!'
          );
        }, 700);
      } else if (res.error) {
        setCallError(res.error);
      }
    }
  };

  const handleToggleScreenInCall = async () => {
    audioService.unlock();
    audioService.playChime('activate');
    if (visionMode === 'screen') {
      zaraVision.stop();
    } else {
      const res = await zaraVision.startScreenShare();
      if (res.ok) {
        window.setTimeout(() => {
          controllerRef.current?.sendTextInCall(
            'Zara look at my mobile screen and tell me what you see!'
          );
        }, 900);
      } else if (res.fallbackNeeded) {
        screenInputRef.current?.click();
      }
    }
  };

  const handleScreenSnapshotPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        zaraVision.setUploadedScreenSnapshot(reader.result);
        window.setTimeout(() => {
          controllerRef.current?.sendTextInCall(
            'Zara look at my mobile screen and tell me what is on it!'
          );
        }, 300);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTapCircle = () => {
    audioService.unlock();
    if (isZaraSpeaking) {
      audioService.stopAudio();
      return;
    }
    audioService.playChime('blush');
  };

  const handleSendTextInCall = () => {
    const clean = quickText.trim();
    if (!clean) return;
    setQuickText('');
    controllerRef.current?.sendTextInCall(clean);
  };

  const activeWaveEnergy = isZaraSpeaking ? 72 : isUserSpeaking ? Math.max(40, micVolume) : Math.max(18, micVolume);

  // Minimized floating call pill (matching royal-violet theme)
  if (isMinimized) {
    return (
      <div
        role="region"
        aria-label="Active Zara Audio Call"
        className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[68] w-[calc(100%-1.5rem)] max-w-md rounded-2xl bg-[#160736]/95 backdrop-blur-xl border border-purple-400/45 shadow-[0_12px_36px_rgba(147,51,234,0.45)] px-3 py-2 flex items-center justify-between gap-2 select-none"
      >
        <button
          type="button"
          onClick={() => {
            audioService.unlock();
            onToggleMinimize?.();
          }}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
          title="Tap to open live Audio Call"
        >
          <div
            className={`relative w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 ${
              isZaraSpeaking
                ? 'border-fuchsia-400 shadow-[0_0_14px_rgba(232,121,249,0.7)]'
                : isUserSpeaking
                ? 'border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.6)]'
                : 'border-purple-300/70'
            }`}
          >
            <img
              src={activePortrait.src}
              alt="Zara Audio Call Active"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs font-extrabold text-white truncate">
                Zara Audio Call
              </span>
              <span className="text-[11px] font-mono text-emerald-300 tabular-nums shrink-0">
                {callStatus === 'connecting' ? 'Calling...' : formatDuration(callSeconds)}
              </span>
            </div>
            <p className="text-[11px] text-purple-200 truncate">
              {isZaraSpeaking
                ? zaraCaption
                : isMuted
                ? 'Mic muted · Tap mic to speak'
                : isUserSpeaking
                ? 'Listening...'
                : 'Call active in background — tap to return'}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleMute}
            className={`min-h-[38px] min-w-[38px] rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
              isMuted
                ? 'bg-amber-950 border-amber-400 text-amber-300'
                : 'bg-emerald-950 border-emerald-400 text-emerald-300'
            }`}
            aria-label={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => onToggleMinimize?.()}
            className="min-h-[38px] min-w-[38px] rounded-xl bg-purple-900/70 hover:bg-purple-800/80 border border-purple-300/25 text-purple-100 flex items-center justify-center cursor-pointer"
            aria-label="Expand Audio Call"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleEndCall}
            className="min-h-[38px] min-w-[38px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center cursor-pointer"
            aria-label="End Audio Call"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-[#070216] select-none">
      <div className="relative w-full max-w-md h-full sm:h-[94vh] sm:max-h-[880px] bg-gradient-to-b from-[#1d0848] via-[#11042c] to-[#080218] sm:border sm:border-purple-400/35 sm:rounded-[38px] px-5 pt-4 pb-6 shadow-[0_0_70px_rgba(147,51,234,0.45)] flex flex-col justify-between overflow-hidden">
        {/* Royal-Violet Bokeh, Silk Waves & Bottom Purple Rose Corners */}
        <ZaraPurpleBackdropDecor showSilkWave={true} waveTopPercent="72%" />

        <input
          ref={screenInputRef}
          type="file"
          accept="image/*"
          onChange={handleScreenSnapshotPicked}
          className="hidden"
        />

        {/* 1. TOP CALL HEADER: BACK ARROW + CROWN ZARA AUDIO CALL + 3-DOT MENU */}
        <header className="relative z-20 flex items-start justify-between pt-1">
          <button
            type="button"
            onClick={handleEndCall}
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-purple-200/30 text-white flex items-center justify-center cursor-pointer transition-transform active:scale-95 shrink-0"
            aria-label="End & Go Back"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <ZaraCrownWordmark
            subtitle={audioOnly ? 'Live Audio' : 'Live Video Call'}
            compact={false}
          />

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu((prev) => !prev)}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-purple-200/30 text-white flex items-center justify-center cursor-pointer transition-transform active:scale-95 shrink-0"
              aria-label="Call Options"
              title="Call Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#19083c]/95 backdrop-blur-xl border border-purple-300/35 shadow-2xl p-1.5 space-y-1 z-40">
                {onToggleMinimize && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      audioService.playChime('tap');
                      onToggleMinimize();
                    }}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl hover:bg-purple-500/20 text-left text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
                  >
                    <Minimize2 className="w-4 h-4 text-purple-300 shrink-0" />
                    <span>Keep Call in Background</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleSwitchVoice();
                  }}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl hover:bg-purple-500/20 text-left text-xs font-semibold text-white flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span>Voice Profile</span>
                  <span className="text-[10px] text-fuchsia-300 font-bold">
                    {config.voiceName || 'Zephyr'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    audioService.unlock();
                    controllerRef.current?.skipCurrentReply();
                    setIsZaraSpeaking(false);
                    setZaraCaption('Listening continuously — speak anytime.');
                  }}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl hover:bg-purple-500/20 text-left text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
                >
                  <SkipForward className="w-4 h-4 text-purple-300 shrink-0" />
                  <span>Skip Current Speech</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setShowMoreMenu(false);
                    const res = await copySelectedOrFullText(zaraCaption);
                    if (res.ok) {
                      setCopiedLiveCaption(true);
                      window.setTimeout(() => setCopiedLiveCaption(false), 2000);
                    }
                  }}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl hover:bg-purple-500/20 text-left text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
                >
                  {copiedLiveCaption ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-4 h-4 text-purple-300 shrink-0" />
                  )}
                  <span>{copiedLiveCaption ? 'Caption Copied ✓' : 'Copy Reply Caption'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleToggleCameraInCall();
                  }}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl hover:bg-purple-500/20 text-left text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-purple-300 shrink-0" />
                  <span>{visionMode === 'camera' ? 'Turn Camera OFF' : 'Turn Camera ON'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleToggleScreenInCall();
                  }}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl hover:bg-purple-500/20 text-left text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
                >
                  <MonitorUp className="w-4 h-4 text-purple-300 shrink-0" />
                  <span>{visionMode === 'screen' ? 'Stop Screen Share' : 'Share Screen'}</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* 2. CENTER HALO PORTRAIT + ORBITING GLOWING HEARTS + CALLER IDENTITY */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-1 min-h-0">
          {/* Halo Ring Stage */}
          <div className="relative flex items-center justify-center">
            {/* Orbiting Floating Hearts around Ring */}
            {RING_HEARTS.map((h, i) => (
              <Heart
                key={i}
                style={{ animationDelay: h.delay }}
                className={`absolute ${h.className} ${h.size} text-fuchsia-300 fill-fuchsia-400/55 drop-shadow-[0_0_12px_rgba(232,121,249,0.9)] animate-zara-heart pointer-events-none z-20`}
              />
            ))}

            {/* Soft Royal-Violet Outer Halo Glow */}
            <div
              className={`absolute w-[212px] h-[212px] sm:w-[232px] sm:h-[232px] rounded-full blur-md transition-all duration-300 pointer-events-none ${
                isZaraSpeaking
                  ? 'bg-fuchsia-400/45 scale-105'
                  : isUserSpeaking
                  ? 'bg-emerald-400/40 scale-105'
                  : 'bg-purple-400/30 animate-zara-halo'
              }`}
            />

            {/* Main Circular Portrait Frame */}
            <button
              type="button"
              onClick={handleTapCircle}
              aria-label="Zara Call Portrait"
              className={`relative z-10 w-[188px] h-[188px] sm:w-[206px] sm:h-[206px] rounded-full overflow-hidden border-[3.5px] transition-all duration-200 cursor-pointer ${
                isZaraSpeaking
                  ? 'border-fuchsia-300 shadow-[0_0_42px_rgba(232,121,249,0.85)] scale-[1.03]'
                  : isUserSpeaking
                  ? 'border-emerald-300 shadow-[0_0_38px_rgba(52,211,153,0.7)] scale-[1.02]'
                  : 'border-purple-200/85 shadow-[0_0_35px_rgba(192,132,252,0.75)]'
              }`}
            >
              {!audioOnly && visionMode === 'camera' ? (
                <video
                  ref={videoFeedRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${
                    zaraVision.getFacingMode() === 'user' ? '-scale-x-100' : ''
                  }`}
                />
              ) : (
                <img
                  src={activePortrait.src}
                  alt="Zara"
                  referrerPolicy="no-referrer"
                  style={{ objectPosition: activePortrait.objectPosition || '50% 22%' }}
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          </div>

          {/* Caller Identity: Zara + Blue Verified Checkmark */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <h2 className="text-[28px] sm:text-[32px] font-bold text-white tracking-tight leading-none">
              Zara
            </h2>
            <ZaraVerifiedCheckBadge className="w-6 h-6 shrink-0" />
          </div>

          {/* Purple Waveform + Calling... / Live Duration */}
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="flex items-center gap-[3px] h-5">
              {CALL_WAVE_MULTIPLIERS.map((mult, idx) => {
                const pct = Math.min(100, Math.max(25, Math.round(activeWaveEnergy * mult)));
                return (
                  <span
                    key={idx}
                    style={{ height: `${Math.max(5, Math.round((pct / 100) * 18))}px` }}
                    className={`w-[3px] rounded-full transition-all duration-100 ${
                      isUserSpeaking
                        ? 'bg-emerald-400'
                        : isZaraSpeaking
                        ? 'bg-fuchsia-400'
                        : 'bg-purple-400'
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-sm font-medium text-purple-100/90 tabular-nums">
              {callStatus === 'connecting'
                ? 'Calling...'
                : `${formatDuration(callSeconds)} · ${
                    isZaraSpeaking
                      ? 'Speaking...'
                      : isMuted
                      ? 'Muted'
                      : isUserSpeaking
                      ? 'Listening...'
                      : 'Live · Listening'
                  }`}
            </span>
          </div>

          {/* Dynamic Notification / Launched App / Live Reply Caption Pill */}
          <div className="mt-2.5 w-full max-w-[340px] space-y-1.5">
            {launchedAppBanner && (
              <div
                className={`px-3 py-1.5 rounded-2xl border flex items-center justify-between gap-2 text-xs ${
                  launchedAppBanner.mode === 'close'
                    ? 'bg-rose-950/90 border-rose-400 text-rose-100'
                    : 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                }`}
              >
                <span className="truncate">
                  {launchedAppBanner.app?.iconEmoji || '📲'}{' '}
                  <strong>{launchedAppBanner.label}</strong>
                </span>
                {launchedAppBanner.mode === 'open' && launchedAppBanner.app ? (
                  <div className="flex items-center gap-1 shrink-0">
                    {launchedAppBanner.href.startsWith('#') ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenMobileSettings?.(launchedAppBanner.app!.id);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-emerald-500 text-black font-bold text-[11px] cursor-pointer"
                      >
                        Open
                      </button>
                    ) : (
                      <a
                        href={launchedAppBanner.href}
                        target={(() => {
                          try {
                            return window.self !== window.top ? '_top' : '_self';
                          } catch {
                            return '_top';
                          }
                        })()}
                        className="px-2 py-0.5 rounded-lg bg-emerald-500 text-black font-bold text-[11px] flex items-center gap-1 no-underline"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const closed = closeMobileAppNow(launchedAppBanner.app!);
                        setLaunchedAppBanner({
                          mode: 'close',
                          app: closed.app,
                          href: '',
                          label: `Closed ${launchedAppBanner.app!.name} ✓`,
                        });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-bold text-[11px] cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setLaunchedAppBanner(null)}
                    className="text-xs px-1 text-rose-200 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {callError && (
              <div className="px-3 py-1.5 rounded-2xl bg-rose-950/90 border border-rose-400/70 text-[11px] text-rose-200 text-center">
                {callError}
              </div>
            )}

            {(userCaption || (zaraCaption && zaraCaption !== 'Calling...')) && (
              <div className="px-3.5 py-2 rounded-2xl bg-[#1e0b46]/70 backdrop-blur-md border border-purple-300/25 text-center space-y-0.5">
                {userCaption && (
                  <p className="text-[11px] text-purple-300 truncate">You: {userCaption}</p>
                )}
                <p className="text-xs text-purple-50 line-clamp-2 leading-snug">{zaraCaption}</p>
              </div>
            )}
          </div>
        </div>

        {/* Optional In-Call Sub-Panels (Keypad / Add Call Conference) */}
        {activeSubPanel === 'keypad' && (
          <div className="relative z-30 mb-3 p-3 rounded-3xl bg-[#1a093c]/95 backdrop-blur-xl border border-purple-300/35 shadow-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-100">
                In-Call Keypad &amp; Quick Commands
              </span>
              <button
                type="button"
                onClick={() => setActiveSubPanel('none')}
                className="w-7 h-7 rounded-full bg-white/10 text-purple-200 flex items-center justify-center cursor-pointer"
                aria-label="Close keypad"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                'Zara WhatsApp open karke message karo Assalam o Alaikum',
                'Zara YouTube pe song play karo',
                'Zara back karo',
              ].map((promptText, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    controllerRef.current?.sendTextInCall(promptText);
                    setActiveSubPanel('none');
                  }}
                  className="min-h-[34px] px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-300/30 text-[11px] text-purple-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {promptText}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type message or command in call..."
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendTextInCall();
                }}
                className="flex-1 min-h-[42px] px-3 rounded-xl bg-[#11042b] border border-purple-300/35 text-white text-xs placeholder:text-purple-300/50 focus:outline-none focus:border-fuchsia-400"
              />
              <button
                type="button"
                onClick={handleSendTextInCall}
                className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl bg-gradient-to-b from-fuchsia-500 to-purple-600 text-white cursor-pointer"
                aria-label="Send message in call"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeSubPanel === 'voice' && (
          <div className="relative z-30 mb-3 p-3 rounded-3xl bg-[#1a093c]/95 backdrop-blur-xl border border-purple-300/35 shadow-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-100">
                Zara Voice &amp; Speaker Test
              </span>
              <button
                type="button"
                onClick={() => setActiveSubPanel('none')}
                className="w-7 h-7 rounded-full bg-white/10 text-purple-200 flex items-center justify-center cursor-pointer"
                aria-label="Close voice panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {ZARA_VOICE_PROFILES.map((v) => {
                const active = (config.voiceName || 'Zephyr') === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      audioService.unlock();
                      audioService.playChime('tap');
                      onUpdateConfig({
                        voiceName: v.id as ZaraVoiceName,
                        voiceGender: v.gender,
                      });
                    }}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold border text-left cursor-pointer ${
                      active
                        ? 'bg-fuchsia-600 border-fuchsia-300 text-white'
                        : 'bg-[#11042b] border-purple-300/25 text-purple-100 hover:border-purple-300/60'
                    }`}
                  >
                    <div className="truncate">{v.label}</div>
                    <div className="text-[10px] font-normal opacity-75 truncate">{v.style}</div>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={async () => {
                audioService.unlock();
                setVoiceTestStatus('Testing speaker output...');
                const res = await audioService.testZaraVoice(
                  language,
                  (config.voiceName as ZaraVoiceName) || 'Zephyr'
                );
                setVoiceTestStatus(res.detail);
              }}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Test Zara Speaker Output</span>
            </button>
            {voiceTestStatus && (
              <p className="text-[11px] text-emerald-200 text-center">{voiceTestStatus}</p>
            )}
          </div>
        )}

        {/* 3. BOTTOM GLASS 4-ACTION CONTROL BAR + RED END CALL BUTTON */}
        <div className="relative z-20 flex flex-col items-center gap-5 pt-2">
          <div className="w-full rounded-[28px] bg-[#24104e]/55 backdrop-blur-xl border border-purple-200/25 shadow-[0_12px_36px_rgba(0,0,0,0.45)] px-3 py-3.5 grid grid-cols-4 gap-2">
            {/* Speaker */}
            <button
              type="button"
              onClick={handleToggleSpeaker}
              className="flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
              aria-label={isSpeakerOn ? 'Turn Speaker Off' : 'Turn Speaker On'}
            >
              <span
                className={`w-13 h-13 rounded-full border flex items-center justify-center transition-all group-active:scale-95 ${
                  isSpeakerOn
                    ? 'bg-purple-500/30 border-purple-200/60 text-white shadow-[0_0_16px_rgba(192,132,252,0.45)]'
                    : 'bg-white/5 border-purple-300/25 text-purple-300/75'
                }`}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </span>
              <span className="text-[11px] font-medium text-purple-100">Speaker</span>
            </button>

            {/* Mute */}
            <button
              type="button"
              onClick={handleToggleMute}
              className="flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
              aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              <span
                className={`w-13 h-13 rounded-full border flex items-center justify-center transition-all group-active:scale-95 ${
                  isMuted
                    ? 'bg-amber-500/35 border-amber-300 text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.45)]'
                    : 'bg-white/10 border-purple-200/35 text-white hover:bg-white/15'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </span>
              <span className="text-[11px] font-medium text-purple-100">
                {isMuted ? 'Unmute' : 'Mute'}
              </span>
            </button>

            {/* Keypad */}
            <button
              type="button"
              onClick={() => {
                audioService.playChime('tap');
                setActiveSubPanel((prev) => (prev === 'keypad' ? 'none' : 'keypad'));
              }}
              className="flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
              aria-label="Open Call Keypad"
            >
              <span
                className={`w-13 h-13 rounded-full border flex items-center justify-center transition-all group-active:scale-95 ${
                  activeSubPanel === 'keypad'
                    ? 'bg-purple-500/35 border-purple-200/70 text-white'
                    : 'bg-white/10 border-purple-200/35 text-white hover:bg-white/15'
                }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-medium text-purple-100">Keypad</span>
            </button>

            {/* Voice & Speaker Test */}
            <button
              type="button"
              onClick={() => {
                audioService.playChime('tap');
                setActiveSubPanel((prev) => (prev === 'voice' ? 'none' : 'voice'));
              }}
              className="flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
              aria-label="Zara Voice & Speaker Options"
            >
              <span
                className={`w-13 h-13 rounded-full border flex items-center justify-center transition-all group-active:scale-95 ${
                  activeSubPanel === 'voice'
                    ? 'bg-purple-500/35 border-purple-200/70 text-white'
                    : 'bg-white/10 border-purple-200/35 text-white hover:bg-white/15'
                }`}
              >
                <Volume2 className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-medium text-purple-100">Voice</span>
            </button>
          </div>

          {/* Red End Call Circle + Label */}
          <div className="flex flex-col items-center gap-2 pb-1">
            <button
              type="button"
              onClick={handleEndCall}
              aria-label="End Call"
              className="w-[68px] h-[68px] rounded-full bg-gradient-to-b from-[#ff4b4b] to-[#dc2626] hover:from-[#ff6464] hover:to-[#ef4444] text-white flex items-center justify-center shadow-[0_0_32px_rgba(239,68,68,0.85)] border border-rose-300/45 active:scale-95 transition-transform cursor-pointer"
            >
              <Phone className="w-7 h-7 rotate-[135deg] fill-white" />
            </button>
            <span className="text-sm font-semibold text-white tracking-wide">End Call</span>
          </div>
        </div>
      </div>
    </div>
  );
};
