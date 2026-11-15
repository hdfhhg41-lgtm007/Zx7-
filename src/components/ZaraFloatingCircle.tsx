import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CircleDot,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Power,
  PictureInPicture2,
  RefreshCw,
  Volume2,
  X,
} from 'lucide-react';
import { VisionMode } from '../types';
import { zaraVision } from '../services/visionAndControlService';
import { audioService } from '../services/audioService';

interface ZaraFloatingCircleProps {
  isSpeaking: boolean;
  isListening: boolean;
  alwaysOnActive: boolean;
  isThinking?: boolean;
  micVolume: number;
  interimTranscript?: string;
  subtitleText: string;
  visionMode: VisionMode;
  isPiPFloating: boolean;
  compactMode: boolean;
  onToggleCompactMode: () => void;
  onTogglePiPFloat: () => void;
  onToggleAlwaysOnMic: () => void;
  onTapCircle: () => void;
  onTriggerBack: () => void;
  onTriggerClose: () => void;
  onOpenVoiceCall?: () => void;
  onOpenFullSettings?: () => void;
}

export const ZaraFloatingCircle: React.FC<ZaraFloatingCircleProps> = ({
  isSpeaking,
  isListening,
  alwaysOnActive,
  isThinking = false,
  micVolume,
  interimTranscript = '',
  subtitleText,
  visionMode,
  isPiPFloating,
  compactMode,
  onToggleCompactMode,
  onTogglePiPFloat,
  onToggleAlwaysOnMic,
  onTapCircle,
  onTriggerBack,
  onTriggerClose,
}) => {
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const [staticSnap, setStaticSnap] = useState<string | null>(null);

  // Draggable position for Compact Floating Circle Mode on phone screen
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    return zaraVision.subscribe((_mode, stream, staticImg) => {
      setStaticSnap(staticImg);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        if (stream) {
          videoPreviewRef.current.play().catch(() => {});
        }
      }
    });
  }, []);

  const dynamicScale = isSpeaking
    ? 1.08
    : isListening && micVolume > 8
    ? Math.min(1.12, 1 + micVolume / 650)
    : 1;

  // ==================== COMPACT DRAGGABLE SMALL ROUND CIRCLE MODE ====================
  if (compactMode) {
    const posStyle: React.CSSProperties = dragPos
      ? { left: `${dragPos.x}px`, top: `${dragPos.y}px` }
      : { right: '16px', bottom: '96px' };

    return (
      <div
        style={posStyle}
        className="fixed z-50 flex flex-col items-end gap-2 touch-none select-none"
      >
        {/* Live Voice Caption Bubble next to Small Circle */}
        {(interimTranscript || isSpeaking || isThinking) && (
          <div className="max-w-[230px] px-3 py-2 rounded-2xl bg-[#090418]/95 border border-cyan-500/45 text-xs text-cyan-100 shadow-xl">
            {interimTranscript ? (
              <span className="text-emerald-300 font-semibold">{interimTranscript}</span>
            ) : isThinking ? (
              <span className="text-cyan-200">Zara سن کر جواب دے رہی ہے...</span>
            ) : (
              <span className="line-clamp-2">{subtitleText}</span>
            )}
          </div>
        )}

        {/* Draggable Small Round Circle ("چھوٹا سا گول دائرہ") */}
        <div className="relative flex items-center gap-2">
          {/* Quick Mini Action Strip: Back, Close, Call, Expand */}
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-[#090418]/95 border border-slate-700/80 shadow-lg">
            <button
              type="button"
              onClick={() => {
                audioService.unlock();
                onTriggerBack();
              }}
              className="min-h-[38px] min-w-[38px] rounded-full bg-slate-900 hover:bg-slate-800 text-cyan-300 flex items-center justify-center cursor-pointer"
              title="Back (واپس)"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                audioService.unlock();
                onTriggerClose();
              }}
              className="min-h-[38px] min-w-[38px] rounded-full bg-slate-900 hover:bg-rose-950 text-rose-300 flex items-center justify-center cursor-pointer"
              title="Close Active App (کلوز)"
              aria-label="Close Active"
            >
              <X className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                audioService.unlock();
                onTogglePiPFloat();
              }}
              className={`min-h-[38px] min-w-[38px] rounded-full flex items-center justify-center cursor-pointer ${
                isPiPFloating
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-emerald-300'
              }`}
              title="Float Over Phone Screen (PiP)"
              aria-label="Float Over Phone Screen"
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                audioService.playChime('tap');
                onToggleCompactMode();
              }}
              className="min-h-[38px] min-w-[38px] rounded-full bg-slate-900 hover:bg-slate-800 text-slate-200 flex items-center justify-center cursor-pointer"
              title="Open Panel"
              aria-label="Expand Zara Panel"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Core Fixed Small Round Circle */}
          <button
            type="button"
            onPointerDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const startLeft = dragPos ? dragPos.x : rect.left;
              const startTop = dragPos ? dragPos.y : rect.top;
              dragStartRef.current = {
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                origX: startLeft,
                origY: startTop,
                moved: false,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const st = dragStartRef.current;
              if (!st || st.pointerId !== e.pointerId) return;
              const dx = e.clientX - st.startX;
              const dy = e.clientY - st.startY;
              if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                st.moved = true;
                const maxX = Math.max(12, window.innerWidth - 96);
                const maxY = Math.max(12, window.innerHeight - 96);
                setDragPos({
                  x: Math.max(8, Math.min(maxX, st.origX + dx)),
                  y: Math.max(8, Math.min(maxY, st.origY + dy)),
                });
              }
            }}
            onPointerUp={(e) => {
              const st = dragStartRef.current;
              dragStartRef.current = null;
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {}
              if (!st?.moved) {
                onTapCircle();
              }
            }}
            style={{ transform: `scale(${dynamicScale})` }}
            className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center transition-transform duration-150 cursor-pointer border-2 ${
              isSpeaking
                ? 'bg-gradient-to-br from-rose-600 via-pink-600 to-purple-800 border-pink-300 shadow-[0_0_32px_rgba(244,63,94,0.85)]'
                : alwaysOnActive || isListening
                ? 'bg-gradient-to-br from-cyan-600 via-teal-700 to-[#0c0624] border-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.8)]'
                : 'bg-gradient-to-br from-slate-800 to-[#0b061c] border-slate-500 shadow-lg'
            }`}
            aria-label="Zara Floating Circle"
          >
            <span className="text-xs font-black tracking-wider text-white">ZARA</span>
            <span className="text-[9px] font-bold text-emerald-200 mt-0.5">
              {isSpeaking ? 'بول رہی ہے' : alwaysOnActive || isListening ? 'سن رہی ہے' : 'آن کریں'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ==================== CENTERED FIXED SMALL ROUND CIRCLE STAGE (NO PHOTOS) ====================
  return (
    <div className="relative w-full py-3 px-3 rounded-3xl bg-[#09051a] border border-cyan-500/35 flex flex-col items-center justify-between gap-3 overflow-hidden">
      {/* Top Row: Always-On 24/7 Voice Status + Float Over Screen Controls */}
      <div className="w-full flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            audioService.unlock();
            onToggleAlwaysOnMic();
          }}
          className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
            alwaysOnActive
              ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}
        >
          {alwaysOnActive ? (
            <Mic className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <MicOff className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <span>{alwaysOnActive ? '24/7 Voice ON (Screen ON/OFF)' : 'Turn ON 24/7 Voice'}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              audioService.unlock();
              onTogglePiPFloat();
            }}
            className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPiPFloating
                ? 'bg-cyan-600 border-cyan-300 text-white'
                : 'bg-slate-900 border-cyan-500/45 text-cyan-200 hover:border-cyan-300'
            }`}
            title="Float Small Circle Over Phone Screen"
          >
            <PictureInPicture2 className="w-4 h-4 shrink-0" />
            <span>{isPiPFloating ? 'Floating ✓' : 'Float on Screen'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioService.playChime('tap');
              onToggleCompactMode();
            }}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 border border-purple-500/40 text-purple-200 hover:text-white flex items-center justify-center cursor-pointer"
            title="Shrink to Small Circle Only"
            aria-label="Shrink to Small Circle Only"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Fixed Small Round Circle ("چھوٹا سا ایک گول دائرہ") */}
      <div className="relative my-2 flex flex-col items-center justify-center">
        {/* Subtle Live Voice Aura Ring (only animates on real speech/mic telemetry) */}
        <div
          style={{ transform: `scale(${dynamicScale})` }}
          className={`w-36 h-36 rounded-full flex items-center justify-center transition-transform duration-150 ${
            isSpeaking
              ? 'bg-rose-500/20 shadow-[0_0_45px_rgba(244,63,94,0.55)]'
              : alwaysOnActive || isListening
              ? 'bg-cyan-500/15 shadow-[0_0_40px_rgba(34,211,238,0.45)]'
              : 'bg-slate-800/30'
          }`}
        >
          <button
            type="button"
            onClick={onTapCircle}
            className={`w-28 h-28 rounded-full border-[3px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              isSpeaking
                ? 'bg-gradient-to-b from-rose-600 via-pink-700 to-[#120626] border-pink-300'
                : alwaysOnActive || isListening
                ? 'bg-gradient-to-b from-cyan-600 via-teal-800 to-[#09051d] border-cyan-300'
                : 'bg-gradient-to-b from-slate-800 to-[#09051d] border-slate-600'
            }`}
            aria-label="Zara Round Circle"
          >
            {isSpeaking ? (
              <Volume2 className="w-6 h-6 text-pink-100" />
            ) : (
              <CircleDot className="w-6 h-6 text-cyan-200" />
            )}
            <span className="text-base font-black tracking-widest text-white">ZARA</span>
            <span className="text-[10px] font-bold text-emerald-200">
              {isSpeaking
                ? 'Speaking...'
                : isThinking
                ? 'Thinking...'
                : alwaysOnActive || isListening
                ? 'Listening 24/7'
                : 'Tap to Wake'}
            </span>
          </button>
        </div>

        {/* Live Spoken Words Preview */}
        {interimTranscript && (
          <div className="mt-2 px-3 py-1 rounded-xl bg-emerald-950/90 border border-emerald-400/50 text-xs text-emerald-200 font-semibold text-center max-w-xs">
            &ldquo;{interimTranscript}&rdquo;
          </div>
        )}

        {/* Optional Camera / Screen Vision Mini Preview (only when user turns on Camera/Screen) */}
        {visionMode !== 'off' && (
          <div className="mt-2 flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/90 border border-cyan-500/40">
            {staticSnap ? (
              <img
                src={staticSnap}
                alt="Screen Snapshot"
                className="w-16 h-12 rounded-xl object-cover"
              />
            ) : (
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                className="w-16 h-12 rounded-xl object-cover bg-black"
              />
            )}
            <span className="text-[11px] font-semibold text-cyan-200 pr-1">
              {visionMode === 'camera' ? 'Live Camera On' : 'Screen Vision On'}
            </span>
            {visionMode === 'camera' && (
              <button
                type="button"
                onClick={() => zaraVision.flipCamera()}
                className="min-h-[36px] min-w-[36px] rounded-xl bg-slate-900 text-cyan-300 flex items-center justify-center cursor-pointer"
                title="Flip Camera"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Mobile Navigation & Call Strip: Back, Close, Call */}
      <div className="w-full grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => {
            audioService.unlock();
            onTriggerBack();
          }}
          className="min-h-[44px] py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/35 text-cyan-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Back (واپس)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            audioService.unlock();
            onTriggerClose();
          }}
          className="min-h-[44px] py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <X className="w-4 h-4 shrink-0" />
          <span>Close (بند)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            audioService.unlock();
            audioService.playChime('tap');
            onToggleAlwaysOnMic();
          }}
          className={`min-h-[44px] py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
            alwaysOnActive || isListening
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/15'
          }`}
        >
          <Power className="w-4 h-4 shrink-0" />
          <span>{alwaysOnActive || isListening ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  );
};
