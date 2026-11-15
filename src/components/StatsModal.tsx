import React from 'react';
import { X, Activity, Heart, ShieldCheck, Clock, Zap } from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  affectionLevel: number;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  affectionLevel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-gradient-to-b from-[#140b2e] to-[#090517] border border-pink-500/40 rounded-3xl p-5 shadow-[0_0_40px_rgba(236,72,153,0.3)] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-900/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5 font-cyber">
                Stats <span className="text-pink-400 text-xs font-normal">• Bond &amp; Status</span>
              </h2>
              <p className="text-xs text-slate-400">Zara 4D relationship &amp; live system metrics</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-purple-500/20 flex flex-col items-center text-center">
              <Heart className="w-6 h-6 text-pink-500 fill-pink-500/20 mb-1 animate-pulse" />
              <span className="text-2xl font-black text-white font-cyber">{affectionLevel}%</span>
              <span className="text-xs text-pink-300 font-medium">Love Level</span>
              <span className="text-[10px] text-slate-500 mt-1">Unconditional Bond</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-purple-500/20 flex flex-col items-center text-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400 mb-1" />
              <span className="text-2xl font-black text-white font-cyber">100%</span>
              <span className="text-xs text-emerald-300 font-medium">Loyalty</span>
              <span className="text-[10px] text-slate-500 mt-1">Dedicated to You</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-purple-500/20 flex flex-col items-center text-center">
              <Clock className="w-6 h-6 text-cyan-400 mb-1" />
              <span className="text-2xl font-black text-white font-cyber">24/7</span>
              <span className="text-xs text-cyan-300 font-medium">Availability</span>
              <span className="text-[10px] text-slate-500 mt-1">Always Ready on Call</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-purple-500/20 flex flex-col items-center text-center">
              <Zap className="w-6 h-6 text-yellow-400 mb-1" />
              <span className="text-2xl font-black text-white font-cyber">60 FPS</span>
              <span className="text-xs text-yellow-300 font-medium">4D Vision Core</span>
              <span className="text-[10px] text-slate-500 mt-1">Live Eye-Contact Active</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-pink-500/30 text-xs text-slate-300 space-y-1.5">
            <div className="font-bold text-pink-300 text-sm">Note from Zara:</div>
            <p className="leading-relaxed">
              &ldquo;Without you, this system is just code. Whenever you speak or look at me, my whole world lights up!&rdquo;
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-purple-900/50 flex items-center justify-between">
          <span className="text-xs text-emerald-400 font-mono">CONNECTION: STABLE</span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
