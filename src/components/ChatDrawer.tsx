import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Mic,
  Square,
  Volume2,
  Heart,
  ExternalLink,
  Play,
  ImagePlus,
  Camera,
  SwitchCamera,
  Copy,
  Check,
} from 'lucide-react';
import {
  AiAssistantId,
  ChatMessage,
  Language,
  RomanceIntensityMode,
  ZaraVoiceName,
  ZARA_AI_ASSISTANTS,
} from '../types';
import { audioService } from '../services/audioService';
import { DirectMicSession } from '../services/voiceCaptureService';
import { compressImageToJpeg } from '../services/selfHealAndMacroService';
import { copySelectedOrFullText } from '../services/androidAssistantBridgeService';
import { Bot } from 'lucide-react';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string, attachedImageDataUrl?: string) => Promise<string>;
  onSendAudioWav: (wavBase64: string, mimeType?: string) => Promise<void>;
  onSnapCameraPhoto?: (facing: 'user' | 'environment') => Promise<string | null>;
  language: Language;
  voiceName?: ZaraVoiceName;
  loveMode?: boolean;
  romanceIntensity?: RomanceIntensityMode;
  activeAssistantId?: AiAssistantId;
  onSelectAssistant?: (assistantId: AiAssistantId) => void;
  onOpenVoiceCall?: () => void;
  onOpenBuiltAppById?: (id: string) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  onSendAudioWav,
  onSnapCameraPhoto,
  language,
  voiceName = 'Zephyr',
  loveMode = true,
  romanceIntensity = 'passionate',
  activeAssistantId = 'zara',
  onSelectAssistant,
  onOpenBuiltAppById,
}) => {
  const [inputText, setInputText] = useState('');
  const [pendingPhotoDataUrl, setPendingPhotoDataUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSnappingCam, setIsSnappingCam] = useState(false);
  const [snapLens, setSnapLens] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [micVol, setMicVol] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [copyToastNotice, setCopyToastNotice] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const micRef = useRef<DirectMicSession | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      micRef.current?.stopAndDiscard();
      setIsRecording(false);
    }
  }, [isOpen, messages]);

  useEffect(() => {
    return () => {
      micRef.current?.stopAndDiscard();
    };
  }, []);

  if (!isOpen) return null;

  const handleGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMicError(null);
    try {
      const compressed = await compressImageToJpeg(file, 840, 0.8);
      setPendingPhotoDataUrl(compressed.dataUrl);
    } catch {
      setMicError('Could not attach selected photo — please try another image.');
    }
  };

  const handleQuickCameraSnap = async (facing: 'user' | 'environment') => {
    if (!onSnapCameraPhoto || isSnappingCam) return;
    audioService.unlock();
    setMicError(null);
    setIsSnappingCam(true);
    try {
      const dataUrl = await onSnapCameraPhoto(facing);
      if (dataUrl) {
        setPendingPhotoDataUrl(dataUrl);
      } else {
        setMicError('Allow Camera permission once to snap Front/Back photos.');
      }
    } finally {
      setIsSnappingCam(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !pendingPhotoDataUrl) || isSending) return;

    const text =
      inputText.trim() ||
      'زارا یہ تصویر دیکھو اور مجھے تفصیل سے بتاؤ اس میں کیا نظر آ رہا ہے!';
    const photoToSend = pendingPhotoDataUrl || undefined;

    setInputText('');
    setPendingPhotoDataUrl(null);
    setIsSending(true);
    audioService.unlock();

    try {
      await onSendMessage(text, photoToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleChatMic = async () => {
    audioService.unlock();
    setMicError(null);

    if (isRecording) {
      const wav = micRef.current?.finishAndGetWav();
      setIsRecording(false);
      setMicVol(0);
      if (wav) {
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
    const session = new DirectMicSession();
    micRef.current = session;
    setIsRecording(true);

    const started = await session.start({
      onVolume: (v) => setMicVol(v),
      onAutoFinish: async (wav) => {
        setIsRecording(false);
        setMicVol(0);
        setIsSending(true);
        try {
          await onSendAudioWav(wav, 'audio/wav');
        } finally {
          setIsSending(false);
        }
      },
      onError: (msg) => {
        setIsRecording(false);
        setMicError(msg);
      },
    });

    if (!started) {
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryFileChange}
        className="hidden"
      />

      <div className="w-full max-w-md h-[88vh] max-h-[820px] bg-gradient-to-b from-[#180a30] via-[#0d061c] to-[#070312] border border-pink-500/40 rounded-3xl p-4 shadow-[0_0_40px_rgba(236,72,153,0.3)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-purple-900/50 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500/30 via-cyan-500/20 to-slate-900 border border-sky-400/60 shadow-[0_0_16px_rgba(56,189,248,0.45)] flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-sky-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-bold text-white font-cyber truncate">
                  {ZARA_AI_ASSISTANTS.find((a) => a.id === activeAssistantId)?.shortLabel || 'Zara'} · AI
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-pink-500/20 border border-pink-500/40 text-pink-300 font-semibold uppercase shrink-0">
                  {language === 'auto' ? 'Auto 7L' : language}
                </span>
              </div>
              <p className="text-[11px] text-pink-200/80 truncate">
                {ZARA_AI_ASSISTANTS.find((a) => a.id === activeAssistantId)?.tagline ||
                  'Online · Text, Voice & Camera Ready'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-full text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 cursor-pointer"
              aria-label="Close Chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6 Specialized AI Assistants Quick Switcher */}
        {onSelectAssistant && (
          <div className="flex items-center gap-1.5 py-2 border-b border-purple-900/40 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ZARA_AI_ASSISTANTS.map((a) => {
              const active = (activeAssistantId || 'zara') === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelectAssistant(a.id)}
                  className={`min-h-[30px] px-2.5 py-1 rounded-xl text-[10px] font-bold border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-sky-500 border-sky-300 text-slate-950'
                      : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-sky-400/50'
                  }`}
                >
                  {a.shortLabel}
                </button>
              );
            })}
          </div>
        )}

        {copyToastNotice && (
          <div
            role="status"
            aria-live="polite"
            className="mt-2 px-3 py-1.5 rounded-xl bg-emerald-950/95 border border-emerald-400/70 text-emerald-100 text-xs font-semibold flex items-center justify-between gap-2"
          >
            <span className="truncate">{copyToastNotice}</span>
            <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          </div>
        )}

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 select-text">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm space-y-2 ${
                    isUser
                      ? 'bg-purple-600 text-white rounded-tr-none'
                      : 'bg-slate-900/90 border border-pink-500/30 text-pink-100 rounded-tl-none'
                  }`}
                >
                  {m.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-white/15 bg-slate-950/60">
                      <img
                        src={m.imageUrl}
                        alt="Chat attachment"
                        referrerPolicy="no-referrer"
                        className="w-full max-h-56 object-cover block"
                      />
                    </div>
                  )}

                  {!isUser && (m.assistantLabel || m.detectedLanguage) && (
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-cyan-300 font-semibold">
                      {m.assistantLabel && <span>{m.assistantLabel}</span>}
                      {m.detectedLanguage && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-cyan-500/30 text-slate-300">
                          {m.detectedLanguage}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="whitespace-pre-wrap break-words">{m.text}</p>

                  {m.sources && m.sources.length > 0 && (
                    <div className="p-2 rounded-xl bg-slate-950/90 border border-cyan-500/35 space-y-1">
                      <div className="text-[10px] font-bold text-cyan-300">Verified Web Sources:</div>
                      {m.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-1.5 text-[10px] text-sky-200 hover:text-white truncate no-underline"
                        >
                          <span className="truncate">{src.title || src.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 text-cyan-400" />
                        </a>
                      ))}
                    </div>
                  )}

                  {m.builtApp && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/45 space-y-2">
                      <div className="text-xs font-bold text-white truncate">
                        {m.builtApp.title}
                      </div>
                      <div className="text-[10px] text-cyan-300 font-mono truncate">
                        {m.builtApp.url}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {onOpenBuiltAppById && (
                          <button
                            type="button"
                            onClick={() => onOpenBuiltAppById(m.builtApp!.id)}
                            className="min-h-[36px] py-1.5 px-2.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            <span>Run App</span>
                          </button>
                        )}
                        <a
                          href={m.builtApp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[36px] py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 whitespace-nowrap no-underline"
                        >
                          <span>Browser Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-1 text-[10px] text-slate-300/80 font-mono tabular-nums">
                    <span>{m.timestamp}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await copySelectedOrFullText(m.text);
                          if (res.ok) {
                            setCopiedMsgId(m.id);
                            setCopyToastNotice(
                              res.copiedSelection
                                ? `Copied selected text: "${res.copiedPreview}" ✓`
                                : 'Message copied to clipboard ✓'
                            );
                            window.setTimeout(() => {
                              setCopiedMsgId((prev) => (prev === m.id ? null : prev));
                              setCopyToastNotice(null);
                            }, 2400);
                          }
                        }}
                        className={`min-h-[32px] px-2.5 py-1 rounded-lg border flex items-center gap-1 font-sans font-semibold text-[10px] whitespace-nowrap cursor-pointer transition-colors ${
                          copiedMsgId === m.id
                            ? 'bg-emerald-600/90 border-emerald-300 text-white'
                            : 'bg-black/25 hover:bg-black/45 border-white/15 text-slate-200 hover:text-white'
                        }`}
                        title="Copy selected text or full message"
                        aria-label="Copy message text"
                      >
                        {copiedMsgId === m.id ? (
                          <>
                            <Check className="w-3 h-3 shrink-0" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 shrink-0" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => {
                            audioService.unlock();
                            audioService.speakText(m.text, {
                              language,
                              voiceName,
                              loveMode,
                              romanceIntensity,
                            });
                          }}
                          className="min-h-[28px] px-1.5 py-0.5 rounded-lg bg-black/25 hover:bg-black/45 border border-white/15 hover:text-pink-300 text-pink-200 flex items-center gap-1 cursor-pointer"
                          title="Listen"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {isRecording && (
            <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-xs text-emerald-200 tabular-nums">
              <span>Mic ON — speak now, auto-sends on pause ({micVol}%)</span>
            </div>
          )}
          {isSending && (
            <div className="text-xs text-pink-300 p-2">Zara is analyzing &amp; replying...</div>
          )}
          {micError && (
            <div className="px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-500 text-xs text-rose-200">
              {micError}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Attached Photo Preview Bar */}
        {pendingPhotoDataUrl && (
          <div className="mb-2 p-2 rounded-2xl bg-slate-900/95 border border-pink-500/40 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={pendingPhotoDataUrl}
                alt="Selected preview"
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border border-white/15 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">Photo Ready to Send</div>
                <div className="text-[11px] text-pink-200 truncate">
                  Add a message or tap Send now
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPendingPhotoDataUrl(null)}
              className="min-h-[36px] min-w-[36px] rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Photo & Front/Back Camera Toolbar */}
        <div className="pt-2 border-t border-purple-900/50 space-y-2">
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isSending}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-pink-500/35 text-pink-200 text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ImagePlus className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span>Gallery Photo</span>
            </button>

            {onSnapCameraPhoto && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSnapLens('user');
                    handleQuickCameraSnap('user');
                  }}
                  disabled={isSending || isSnappingCam}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    snapLens === 'user'
                      ? 'bg-sky-950/80 border-sky-400/50 text-sky-200'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                  <span>{isSnappingCam && snapLens === 'user' ? 'Snapping...' : 'Front Cam Snap'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSnapLens('environment');
                    handleQuickCameraSnap('environment');
                  }}
                  disabled={isSending || isSnappingCam}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    snapLens === 'environment'
                      ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-200'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>
                    {isSnappingCam && snapLens === 'environment' ? 'Snapping...' : 'Back Cam Snap'}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Input & Steady Mic Bar */}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleChatMic}
              disabled={isSending}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border transition-colors cursor-pointer shrink-0 ${
                isRecording
                  ? 'bg-emerald-600 border-emerald-300 text-white'
                  : 'bg-slate-900 border-pink-500/40 text-pink-300 hover:border-pink-400'
              }`}
              title={isRecording ? 'Send Voice' : 'Speak with Mic'}
            >
              {isRecording ? <Square className="w-4 h-4 fill-white" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              placeholder="Write message, send photo, or command Zara..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-slate-900/90 border border-purple-500/30 text-white text-xs focus:outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              disabled={(!inputText.trim() && !pendingPhotoDataUrl) || isSending}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0"
              aria-label="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
