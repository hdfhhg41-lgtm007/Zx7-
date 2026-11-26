import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, MonitorUp, FlipHorizontal } from 'lucide-react';
import { getZaraPortraitById, getAllZaraPortraits } from '../data/zaraPortraits';
import { Zara4DExpression, VisionMode } from '../types';
import { zaraVision } from '../services/visionAndControlService';

interface ZaraPortrait4DProps {
  portraitId?: string;
  onChangePortrait?: (nextId: string) => void;
  isSpeaking?: boolean;
  isListening?: boolean;
  loveMode?: boolean;
  expression?: Zara4DExpression;
  micVolume?: number;
  onTapZara?: () => void;
  showQuickCycle?: boolean;
  visionMode?: VisionMode;
  onFlipCamera?: () => void;
}

export const ZaraPortrait4D: React.FC<ZaraPortrait4DProps> = ({
  portraitId,
  onChangePortrait,
  isSpeaking = false,
  isListening = false,
  loveMode = true,
  expression = 'smile',
  micVolume = 0,
  onTapZara,
  showQuickCycle = true,
  visionMode = 'off',
  onFlipCamera,
}) => {
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const portrait = getZaraPortraitById(portraitId);
  const [staticScreenPreview, setStaticScreenPreview] = useState<string | null>(null);

  useEffect(() => {
    return zaraVision.subscribe((_mode, stream, staticImg) => {
      setStaticScreenPreview(staticImg);
      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = stream || null;
        if (stream) {
          pipVideoRef.current.play().catch(() => {});
        }
      }
    });
  }, []);

  const handleCyclePortrait = (dir: -1 | 1, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onChangePortrait) return;
    const all = getAllZaraPortraits();
    const idx = all.findIndex((item) => item.id === portrait.id);
    const nextIdx = (idx + dir + all.length) % all.length;
    onChangePortrait(all[nextIdx].id);
  };

  const speakPulseScale = isSpeaking ? 1.028 : isListening ? 1 + Math.min(0.022, micVolume / 4000) : 1;
  const isWarmExpression = expression === 'blush' || expression === 'love';

  return (
    <div
      onClick={onTapZara}
      className="relative w-full h-full select-none overflow-hidden cursor-pointer bg-[#0e0426]"
    >
      {/* Clean 2D Semi-Realistic Portrait (Zero 3D distortion or synthetic face overlays) */}
      <img
        src={portrait.src}
        alt={portrait.name}
        referrerPolicy="no-referrer"
        style={{
          objectPosition: portrait.objectPosition || '50% 18%',
          transform: `scale(${((portrait.cropZoom || 1) * speakPulseScale).toFixed(4)})`,
          filter: isWarmExpression
            ? 'saturate(1.08) brightness(1.03)'
            : portrait.colorFilter || undefined,
        }}
        className="w-full h-full object-cover transition-transform duration-300 ease-out"
      />

      {/* Subtle Aura When Speaking / Listening / Love Mood */}
      {(isSpeaking || isListening || (loveMode && isWarmExpression)) && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
            isListening
              ? 'ring-2 ring-inset ring-emerald-400/50 bg-emerald-400/5'
              : isSpeaking
              ? 'ring-2 ring-inset ring-fuchsia-300/45 bg-fuchsia-400/5'
              : 'bg-pink-400/10'
          }`}
        />
      )}

      {/* Subtle Top & Bottom Royal-Violet Vignette Blend */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0e0426]/85 via-[#0e0426]/25 to-transparent"
      />

      {/* Quick Left / Right Portrait Switcher Buttons */}
      {showQuickCycle && onChangePortrait && (
        <>
          <button
            type="button"
            onClick={(e) => handleCyclePortrait(-1, e)}
            aria-label="Previous Zara Photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#120632]/85 border border-purple-300/45 text-purple-100 hover:text-white hover:border-pink-400 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => handleCyclePortrait(1, e)}
            aria-label="Next Zara Photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#120632]/85 border border-purple-300/45 text-purple-100 hover:text-white hover:border-pink-400 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Live Camera / Screen Share PIP Preview */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-2.5 right-2.5 z-20 rounded-2xl overflow-hidden border-2 border-cyan-400/80 bg-[#050210] shadow-[0_0_20px_rgba(34,211,238,0.45)] transition-all ${
          visionMode !== 'off'
            ? 'w-24 h-32 opacity-100'
            : 'w-0 h-0 opacity-0 pointer-events-none border-0'
        }`}
      >
        {staticScreenPreview ? (
          <img
            src={staticScreenPreview}
            alt="Shared Screen"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            ref={pipVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${
              visionMode === 'camera' && zaraVision.getFacingMode() === 'user' ? '-scale-x-100' : ''
            }`}
          />
        )}

        <div className="absolute top-1 left-1 right-1 flex items-center justify-between px-1.5 py-0.5 rounded-md bg-black/75 text-[9px] font-bold text-cyan-300">
          <span className="flex items-center gap-1 truncate">
            {visionMode === 'screen' ? (
              <>
                <MonitorUp className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <span>Screen</span>
              </>
            ) : (
              <>
                <Eye className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                <span>Seeing You</span>
              </>
            )}
          </span>

          {visionMode === 'camera' && onFlipCamera && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFlipCamera();
              }}
              title="Flip Front/Back Camera"
              className="p-0.5 text-white hover:text-pink-300 cursor-pointer"
            >
              <FlipHorizontal className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Subtle Portrait Look Name Tag (hidden when quick cycle off on home stage) */}
      {showQuickCycle && (
        <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none text-[10px] font-medium text-purple-100/95 bg-[#120632]/85 px-2.5 py-0.5 rounded-lg border border-purple-300/30">
          {portrait.name}
        </div>
      )}
    </div>
  );
};
