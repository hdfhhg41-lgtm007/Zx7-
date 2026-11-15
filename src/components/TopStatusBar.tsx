import React, { useState, useEffect, useRef } from 'react';
import { Settings, ShieldCheck, Languages, Check, Sparkles } from 'lucide-react';
import { audioService } from '../services/audioService';
import { getMobileClockSnapshot } from '../services/scheduleAndMemoryService';
import {
  OwnerAuthSnapshot,
  getOwnerAuthSnapshot,
  signInOwnerWithGoogle,
  subscribeOwnerAuth,
} from '../services/ownerAuthService';
import { isAppOnline, subscribeNetworkStatus } from '../services/offlineBrainService';
import { Language } from '../types';

interface TopStatusBarProps {
  userNickname: string;
  screenOffListeningActive?: boolean;
  language?: Language;
  onSelectLanguage?: (lang: Language) => void;
  onToggleHud3D?: () => void;
  onOpenSettings: () => void;
  onOpenSecuritySettings?: () => void;
}

const LANGUAGE_OPTIONS: Array<{ id: Language; label: string; short: string }> = [
  { id: 'auto', label: 'Auto (Match Me)', short: 'Auto' },
  { id: 'urdu', label: 'Urdu (اردو)', short: 'اردو' },
  { id: 'punjabi', label: 'Punjabi (ਪੰਜਾਬੀ / پنجابی)', short: 'ਪੰਜਾਬੀ' },
  { id: 'hindi', label: 'Hindi (हिंदी)', short: 'हिंदी' },
  { id: 'english', label: 'English', short: 'EN' },
];

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  userNickname,
  screenOffListeningActive = true,
  language = 'auto',
  onSelectLanguage,
  onToggleHud3D,
  onOpenSettings,
  onOpenSecuritySettings,
}) => {
  const [clock, setClock] = useState(() => getMobileClockSnapshot());
  const [ownerAuth, setOwnerAuth] = useState<OwnerAuthSnapshot>(() => getOwnerAuthSnapshot());
  const [online, setOnline] = useState<boolean>(() => isAppOnline());
  const [signingIn, setSigningIn] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tick = () => setClock(getMobileClockSnapshot());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return subscribeOwnerAuth(setOwnerAuth);
  }, []);

  useEffect(() => {
    return subscribeNetworkStatus(setOnline);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    if (showLangMenu) {
      document.addEventListener('pointerdown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [showLangMenu]);

  const displayNickname = ownerAuth.isOwnerVerified
    ? !userNickname ||
      userNickname === 'جان' ||
      userNickname === 'जान' ||
      userNickname === 'My Love'
      ? 'Malaysia wala badshah'
      : userNickname
    : 'Guest-Safe Mode';

  const currentLangObj =
    LANGUAGE_OPTIONS.find((l) => l.id === language) || LANGUAGE_OPTIONS[0];

  const handleQuickOwnerSignIn = async () => {
    audioService.unlock();
    audioService.playChime('tap');
    setSigningIn(true);
    try {
      const res = await signInOwnerWithGoogle();
      if (!res.ok && onOpenSecuritySettings) {
        onOpenSecuritySettings();
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleChooseLanguage = (langId: Language) => {
    audioService.unlock();
    audioService.playChime('tap');
    setShowLangMenu(false);
    onSelectLanguage?.(langId);
  };

  return (
    <header className="relative z-30 w-full px-3 pt-2.5 pb-1 select-none">
      <div className="w-full px-3.5 py-2 rounded-2xl bg-slate-950/65 backdrop-blur-md border border-white/12 flex items-center justify-between gap-2.5">
        {/* Clean Unboxed Broadcast Metadata (Zero-Pill Discipline) */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0">
              Zara Live Studio
            </span>
            <span className="text-white/35" aria-hidden="true">
              ·
            </span>
            <span
              className={`text-xs font-medium truncate ${
                ownerAuth.isOwnerVerified ? 'text-emerald-300' : 'text-amber-200'
              }`}
            >
              {displayNickname}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 mt-0.5 truncate">
            <span className="font-mono font-semibold text-white tabular-nums">
              {clock.shortTime12}
            </span>
            <span aria-hidden="true">·</span>
            <span className={online ? 'text-sky-300' : 'text-amber-300'}>
              {online ? 'Online' : 'Offline Ready'}
            </span>
            <span aria-hidden="true">·</span>
            <span className={screenOffListeningActive ? 'text-emerald-300' : 'text-slate-400'}>
              {screenOffListeningActive ? 'Screen-Off Mic ON' : 'Mic OFF'}
            </span>
          </div>
        </div>

        {/* Right Header Controls: Language Selector + 1-Tap Owner Verify + Settings */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick 4-Language Selector (Urdu, Hindi, Punjabi, English) */}
          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              onClick={() => {
                audioService.unlock();
                audioService.playChime('tap');
                setShowLangMenu((v) => !v);
              }}
              className="min-h-[44px] px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-pink-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              title="Select Language (Urdu, Hindi, Punjabi, English, Auto)"
              aria-label="Select Language"
            >
              <Languages className="w-4 h-4 text-pink-300 shrink-0" />
              <span className="font-bold">{currentLangObj.short}</span>
            </button>

            {/* Language Dropdown Menu */}
            {showLangMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 py-1.5 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-pink-500/30 shadow-[0_16px_36px_rgba(0,0,0,0.65)] z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-extrabold text-pink-300 border-b border-white/10">
                  Select Language (زبان / भाषा)
                </div>
                {LANGUAGE_OPTIONS.map((opt) => {
                  const isSelected = language === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleChooseLanguage(opt.id)}
                      className={`min-h-[40px] px-3 py-2 text-left text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-pink-500/20 text-pink-200 font-bold'
                          : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-pink-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {!ownerAuth.isOwnerVerified && (
            <button
              type="button"
              disabled={signingIn}
              onClick={handleQuickOwnerSignIn}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60"
              title="Verify App Owner with Google Sign-In"
              aria-label="Verify App Owner with Google Sign-In"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              <span className="hidden xs:inline sm:inline">
                {signingIn ? 'Verifying...' : 'Owner Login'}
              </span>
              <span className="inline sm:hidden">{signingIn ? '...' : 'Owner'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              audioService.unlock();
              audioService.playChime('tap');
              onOpenSettings();
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sky-100 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            title="Open Settings & All Controls"
            aria-label="Open Settings and All Controls"
          >
            <Settings className="w-4 h-4 text-sky-300 shrink-0" />
            <span>Settings</span>
          </button>

          {onToggleHud3D && (
            <button
              type="button"
              onClick={() => {
                audioService.unlock();
                audioService.playChime('tap');
                onToggleHud3D();
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600/90 to-sky-600/90 hover:from-cyan-500 hover:to-sky-500 border border-cyan-300 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-[0_0_14px_rgba(6,182,212,0.45)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              title="Open 3D Sci-Fi Quantum Hologram HUD"
            >
              <Sparkles className="w-4 h-4 text-cyan-200 shrink-0" />
              <span>3D HUD</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
