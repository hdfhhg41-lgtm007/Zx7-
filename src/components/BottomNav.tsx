import React from 'react';
import { Home, CircleDot, PhoneCall, Mic, Settings } from 'lucide-react';
import { audioService } from '../services/audioService';

interface BottomNavProps {
  isCompactCircle?: boolean;
  isPiPFloating?: boolean;
  isMicActive?: boolean;
  onHomeTap: () => void;
  onToggleFloatingCircle: () => void;
  onOpenVoiceCall: () => void;
  onToggleDirectMic: () => void;
  onOpenSettings: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  isCompactCircle = false,
  isPiPFloating = false,
  isMicActive = false,
  onHomeTap,
  onToggleFloatingCircle,
  onOpenVoiceCall,
  onToggleDirectMic,
  onOpenSettings,
}) => {
  return (
    <div className="relative w-full z-40 px-3 pb-3 pt-1">
      <div className="w-full bg-[#0a0618]/95 border border-purple-900/50 rounded-3xl px-2 py-1.5 grid grid-cols-5 items-center shadow-[0_-5px_25px_rgba(59,130,246,0.18)]">
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => {
            audioService.playChime('tap');
            onHomeTap();
          }}
          className={`min-h-[46px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
            !isCompactCircle ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Home</span>
        </button>

        {/* 2. Floating Screen Circle ("گول دائرہ") — replaces old Photos tab! */}
        <button
          type="button"
          onClick={() => {
            audioService.unlock();
            audioService.playChime('tap');
            onToggleFloatingCircle();
          }}
          className={`min-h-[46px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
            isCompactCircle || isPiPFloating
              ? 'text-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CircleDot className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Circle</span>
        </button>

        {/* 3. Center Dedicated Live Voice Call Button */}
        <div className="relative -top-4 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={() => {
              audioService.unlock();
              audioService.playChime('call_connect');
              onOpenVoiceCall();
            }}
            aria-label="Call Zara Live"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-[0_0_24px_rgba(16,185,129,0.75)] hover:shadow-[0_0_32px_rgba(16,185,129,0.95)] active:scale-95 transition-all flex items-center justify-center group cursor-pointer"
          >
            <div className="w-full h-full rounded-full bg-[#071f18] flex flex-col items-center justify-center border border-emerald-300/60">
              <PhoneCall className="w-5 h-5 text-emerald-300 group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-black text-emerald-200 tracking-wider mt-0.5">
                CALL
              </span>
            </div>
          </button>
        </div>

        {/* 4. Steady Direct Mic Button */}
        <button
          type="button"
          onClick={() => {
            audioService.unlock();
            onToggleDirectMic();
          }}
          className={`min-h-[46px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
            isMicActive ? 'text-emerald-400' : 'text-pink-300 hover:text-pink-200'
          }`}
        >
          <Mic className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">
            {isMicActive ? 'Send' : 'Mic'}
          </span>
        </button>

        {/* 5. Settings */}
        <button
          type="button"
          onClick={() => {
            audioService.playChime('tap');
            onOpenSettings();
          }}
          className="min-h-[46px] flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Settings</span>
        </button>
      </div>
    </div>
  );
};
