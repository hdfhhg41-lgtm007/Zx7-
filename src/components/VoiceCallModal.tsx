import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  PhoneOff,
  Mic,
  MicOff,
  Send,
  PhoneCall,
  Camera,
  MonitorUp,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { HoloParticleFace3D } from './hud3d/HoloParticleFace3D';
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
  AiAssistantId,
  ChatMessage,
  Language,
  PersonalityConfig,
  VisionMode,
  ZaraVoiceName,
  ZARA_AI_ASSISTANTS,
  ZARA_VOICE_PROFILES,
} from '../types';

interface VoiceCallModalProps {
  isOpen: boolean;
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

const LEVEL_HEIGHT_CLASSES = ['h-1.5', 'h-2.5', 'h-3.5', 'h-5', 'h-6', 'h-7'];

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
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
  const [micVolume, setMicVolume] = useState(0);
  const [userCaption, setUserCaption] = useState('');
  const [zaraCaption, setZaraCaption] = useState('Connecting live voice call with Zara...');
  const [quickText, setQuickText] = useState('');
  const [callError, setCallError] = useState<string | null>(null);
  const [copiedLiveCaption, setCopiedLiveCaption] = useState(false);
  const [launchedAppBanner, setLaunchedAppBanner] = useState<{
    mode: 'open' | 'close';
    app: MobileAppDefinition | null;
    href: string;
    label: string;
  } | null>(null);

  const controllerRef = useRef<LivePhoneCallController | null>(null);
  const screenInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsub = audioService.subscribeSpeaking((speaking) => {
      setIsZaraSpeaking(speaking);
    });
    return unsub;
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
    setZaraCaption(
      audioOnly
        ? 'Connecting HD Audio Call with Zara...'
        : 'Zara connecting live video call...'
    );
    setIsMuted(false);
    setMicVolume(0);

    // Only activate camera in explicit video call mode (never in Audio Call mode)
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
                ? 'Audio Call Connected! Speak freely anytime — Zara is listening.'
                : 'Call connected! Speak freely — WhatsApp message, Back, Close, or open any app!'
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
  }, [isOpen, config.activeAssistantId]);

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

  const activeWaveEnergy = isZaraSpeaking ? 68 : micVolume;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 bg-[#04010c] select-none">
      <div className="relative w-full max-w-md h-full sm:h-[94vh] sm:max-h-[880px] bg-gradient-to-b from-[#130a2e] via-[#09051d] to-[#04020e] sm:border-2 sm:border-blue-500/50 sm:rounded-[36px] px-4 py-3 shadow-[0_0_60px_rgba(59,130,246,0.35)] flex flex-col justify-between overflow-hidden">
        <input
          ref={screenInputRef}
          type="file"
          accept="image/*"
          onChange={handleScreenSnapshotPicked}
          className="hidden"
        />

        {/* Top Phone Call Header */}
        <div className="relative z-10 flex items-center justify-between pb-2 border-b border-purple-900/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEndCall}
              className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 flex items-center justify-center cursor-pointer"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-black text-white tracking-wider">
                  {audioOnly ? 'ZARA AUDIO CALL' : 'ZARA LIVE VIDEO CALL'}
                </span>
              </div>
              <div className="text-[10px] font-mono text-emerald-300 flex items-center gap-1.5">
                <span>
                  {callStatus === 'connecting' ? 'Dialing...' : formatDuration(callSeconds)}
                </span>
                <span>·</span>
                <span>
                  {audioOnly
                    ? callStatus === 'fallback_connected'
                      ? 'STEADY VOICE HD'
                      : 'HD AUDIO CALL'
                    : visionMode !== 'off'
                    ? `VIDEO: ${visionMode.toUpperCase()}`
                    : 'HD AUDIO + STUDIO'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!audioOnly && (
              <>
                <button
                  type="button"
                  onClick={handleToggleCameraInCall}
                  className={`min-h-[40px] min-w-[40px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                    visionMode === 'camera'
                      ? 'bg-cyan-600 border-cyan-300 text-white'
                      : 'bg-slate-900 border-cyan-500/40 text-cyan-300'
                  }`}
                  title="Camera"
                >
                  <Camera className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleScreenInCall}
                  className={`min-h-[40px] min-w-[40px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                    visionMode === 'screen'
                      ? 'bg-blue-600 border-blue-300 text-white'
                      : 'bg-slate-900 border-blue-500/40 text-blue-300'
                  }`}
                  title="Screen Share"
                >
                  <MonitorUp className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleSwitchVoice}
              className="min-h-[40px] px-2.5 rounded-xl bg-slate-900 border border-pink-500/40 text-[10px] font-bold text-pink-200 hover:border-pink-400 transition-colors cursor-pointer"
              title="Switch Voice (Female / Male)"
            >
              {ZARA_VOICE_PROFILES.find((v) => v.id === config.voiceName)?.label || config.voiceName || 'Zephyr'}
            </button>
          </div>
        </div>

        {/* AI-to-AI Call Persona Switcher + Simulated AI Disclosure */}
        <div className="relative z-10 pt-1.5 space-y-1">
          <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ZARA_AI_ASSISTANTS.map((a) => {
              const active = (config.activeAssistantId || 'zara') === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    audioService.playChime('call_connect');
                    onUpdateConfig({ activeAssistantId: a.id as AiAssistantId, voiceName: a.defaultVoice });
                    setZaraCaption(`Connecting call with ${a.name} (${a.disclosureText})...`);
                  }}
                  className={`min-h-[28px] px-2.5 py-0.5 rounded-lg text-[10px] font-bold border whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-cyan-500 border-cyan-300 text-slate-950'
                      : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-cyan-400/50'
                  }`}
                >
                  {a.shortLabel}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-slate-950/90 border border-cyan-500/25 text-[10px]">
            <span className="text-cyan-200 truncate">
              {ZARA_AI_ASSISTANTS.find((a) => a.id === (config.activeAssistantId || 'zara'))?.disclosureText}
            </span>
            {(config.activeAssistantId || 'zara') !== 'zara' && (
              <button
                type="button"
                onClick={() => {
                  audioService.playChime('tap');
                  onUpdateConfig({ activeAssistantId: 'zara', voiceName: 'Zephyr' });
                }}
                className="px-2 py-0.5 rounded bg-rose-600/80 hover:bg-rose-500 text-white font-bold shrink-0 cursor-pointer"
              >
                Back to Zara
              </button>
            )}
          </div>
        </div>

        {/* 3D Cybernetic Robot Audio Call Visualizer Stage (Zero girl portraits) */}
        <div className="relative z-10 flex-1 min-h-[210px] my-2 rounded-2xl bg-[#02050e] border border-sky-500/25 overflow-hidden flex flex-col items-center justify-end pb-3">
          <div className="absolute inset-0">
            <HoloParticleFace3D
              isSpeaking={isZaraSpeaking}
              isListening={!isMuted && (isUserSpeaking || callStatus !== 'error')}
              micVolume={isMuted ? 0 : micVolume}
              emotionMode={isOwnerVerified ? config.emotionMode || 'apnapan' : 'calm'}
              onTapOrb={handleTapCircle}
              className="w-full h-full"
            />
          </div>
          <div className="relative z-10 flex items-end gap-1 h-7 px-3 py-1 rounded-xl bg-slate-950/85 border border-white/15 pointer-events-none">
            {[0.4, 0.75, 1.0, 1.25, 1.0, 0.75, 0.4].map((mult, idx) => {
              const scaled = Math.min(5, Math.max(0, Math.floor((activeWaveEnergy * mult) / 14)));
              const hClass = LEVEL_HEIGHT_CLASSES[scaled] || 'h-1.5';
              return (
                <div
                  key={idx}
                  className={`w-1.5 rounded-full transition-all duration-75 ${hClass} ${
                    isUserSpeaking
                      ? 'bg-emerald-400'
                      : isZaraSpeaking
                      ? 'bg-sky-400'
                      : 'bg-sky-300/60'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Captions & Voice App Launch Confirmation */}
        <div className="relative z-10 space-y-1.5">
          {launchedAppBanner && (
            <div
              className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
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
                <div className="flex items-center gap-1.5 shrink-0">
                  {launchedAppBanner.href.startsWith('#') ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenMobileSettings?.(launchedAppBanner.app!.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open</span>
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
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black font-bold text-[11px] flex items-center gap-1 no-underline"
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
                    className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLaunchedAppBanner(null)}
                  className="text-xs px-1.5 text-rose-200 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {callError && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-950 border border-rose-500 text-xs text-rose-200 text-center">
              {callError}
            </div>
          )}

          {userCaption && (
            <div className="px-3 py-1.5 rounded-2xl bg-purple-950/70 border border-purple-500/40 text-xs text-cyan-200 text-center truncate">
              <span className="text-[10px] text-purple-300 mr-1.5">You:</span>
              {userCaption}
            </div>
          )}

          <div className="px-3.5 py-2 rounded-2xl bg-slate-900/95 border border-blue-500/40 flex items-center justify-between gap-2">
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed line-clamp-3 flex-1">
              {zaraCaption}
            </p>
            <button
              type="button"
              onClick={async () => {
                const res = await copySelectedOrFullText(zaraCaption);
                if (res.ok) {
                  setCopiedLiveCaption(true);
                  window.setTimeout(() => setCopiedLiveCaption(false), 2200);
                }
              }}
              className={`min-h-[36px] px-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition-colors ${
                copiedLiveCaption
                  ? 'bg-emerald-600 border-emerald-300 text-white'
                  : 'bg-slate-800/90 border-white/15 text-slate-200 hover:text-white'
              }`}
              title="Copy AI reply"
              aria-label="Copy AI reply"
            >
              {copiedLiveCaption ? (
                <>
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Quick One-Tap Commands (WhatsApp Message + Back + Close) */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            {[
              'Zara WhatsApp open karke message karo Assalam o Alaikum',
              'Zara WhatsApp band kar do',
              'Zara back karo',
              'Zara open YouTube',
            ].map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => controllerRef.current?.sendTextInCall(promptText)}
                className="min-h-[36px] px-2.5 py-1 rounded-xl bg-slate-900 border border-blue-500/35 hover:border-cyan-400 text-[11px] text-blue-100 whitespace-nowrap shrink-0 active:scale-95 transition-all cursor-pointer"
              >
                {promptText}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Call Controls */}
        <div className="relative z-10 pt-2 mt-1.5 border-t border-purple-900/50 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type or speak WhatsApp message, Back, Close..."
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendTextInCall();
              }}
              className="flex-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-purple-500/30 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={handleSendTextInCall}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-white active:scale-95 transition-all cursor-pointer"
              aria-label="Send message in call"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-around py-1">
            <button
              type="button"
              onClick={handleToggleMute}
              className={`min-h-[50px] px-5 rounded-2xl border font-bold text-xs flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap cursor-pointer ${
                isMuted
                  ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                  : 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.3)]'
              }`}
            >
              {isMuted ? (
                <>
                  <MicOff className="w-5 h-5 text-amber-400" />
                  <span>Unmute Mic</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 text-emerald-400" />
                  <span>Mic Active</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleEndCall}
              className="min-h-[50px] px-7 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-[0_0_24px_rgba(225,29,72,0.7)] active:scale-95 transition-all whitespace-nowrap cursor-pointer"
            >
              <PhoneOff className="w-5 h-5" />
              <span>End Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
