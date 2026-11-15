import React from 'react';
import { Power, Mic, MicOff } from 'lucide-react';
import { audioService } from '../services/audioService';

interface ZaraFunctionBarProps {
  micOpen: boolean;
  micVolume?: number;
  isSpeaking: boolean;
  isThinking: boolean;
  interimTranscript?: string;
  subtitleText: string;
  onToggleMicOpenOff: () => void;
  onOpenChat: () => void;
}

export const ZaraFunctionBar: React.FC<ZaraFunctionBarProps> = ({
  micOpen,
  micVolume = 0,
  isSpeaking,
  isThinking,
  interimTranscript = '',
  subtitleText,
  onToggleMicOpenOff,
  onOpenChat,
}) => {
  const voiceActive = micOpen && micVolume >= 11;

  return (
    <div className="relative z-30 w-full px-4 pb-5 pt-1 flex flex-col items-center gap-3 select-none">
      {/* Live Conversation Readout (Tap to read or type text) */}
      <button
        type="button"
        onClick={() => {
          audioService.unlock();
          audioService.playChime('tap');
          onOpenChat();
        }}
        className="w-full max-w-xl px-4 py-2.5 rounded-2xl bg-slate-950/75 backdrop-blur-md border border-white/12 text-center cursor-pointer hover:border-sky-400/35 transition-colors"
        title="Tap to view conversation or type a question"
      >
        {interimTranscript ? (
          <p className="text-xs sm:text-sm font-semibold text-emerald-300 truncate">
            &ldquo;{interimTranscript}&rdquo;
          </p>
        ) : isThinking ? (
          <p className="text-xs sm:text-sm font-medium text-sky-200 truncate">
            Zara is preparing your response...
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-slate-100 leading-snug line-clamp-2">
            {subtitleText}
          </p>
        )}
      </button>

      {/* Single Master ON / OFF Assistant Switch */}
      <button
        type="button"
        onClick={() => {
          audioService.unlock();
          audioService.playChime('tap');
          onToggleMicOpenOff();
        }}
        className={`min-h-[56px] min-w-[220px] px-7 py-3 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2.5 whitespace-nowrap cursor-pointer transition-all active:scale-[0.98] ${
          micOpen
            ? voiceActive
              ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-[0_10px_28px_rgba(16,185,129,0.45)]'
              : 'bg-sky-500 text-slate-950 border-sky-300 shadow-[0_10px_28px_rgba(14,165,233,0.4)]'
            : 'bg-slate-900 hover:bg-slate-800 border-white/20 text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.45)]'
        }`}
        aria-label={micOpen ? 'Turn AI Assistant OFF' : 'Turn AI Assistant ON'}
      >
        <Power className="w-4 h-4 shrink-0" />
        {micOpen ? (
          <Mic className={`w-4 h-4 shrink-0 ${isSpeaking || voiceActive ? 'animate-pulse' : ''}`} />
        ) : (
          <MicOff className="w-4 h-4 shrink-0 text-slate-400" />
        )}
        <span>{micOpen ? 'ON · Listening & Talking' : 'OFF · Tap to Turn ON'}</span>
      </button>
    </div>
  );
};
