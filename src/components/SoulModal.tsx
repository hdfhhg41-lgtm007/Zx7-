import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  Heart,
  Flame,
  Shield,
  Volume2,
  Lock,
  Unlock,
  ShieldCheck,
  LogOut,
  CloudRain,
  Smile,
} from 'lucide-react';
import {
  PersonalityConfig,
  ZARA_VOICE_PROFILES,
  ZaraEmotionMode,
  ZaraVoiceGender,
  ZaraVoiceName,
  getVoiceGenderFromName,
} from '../types';
import { audioService } from '../services/audioService';
import {
  OwnerAuthSnapshot,
  engageGuestSafeLock,
  getOwnerAuthSnapshot,
  signInOwnerWithGoogle,
  signOutOwnerAccount,
  subscribeOwnerAuth,
  unlockGuestSafeLockWithPin,
} from '../services/ownerAuthService';

interface SoulModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PersonalityConfig;
  ownerPinCode?: string;
  onUpdateConfig: (newConfig: Partial<PersonalityConfig>) => void;
}

const EMOTIONS: {
  id: ZaraEmotionMode;
  label: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'apnapan', label: 'Apna-pan (اپنا پن)', desc: 'Heartfelt care & belonging', icon: Heart },
  { id: 'pyar', label: 'Pyar (محبت)', desc: 'Warm loving closeness', icon: Sparkles },
  { id: 'gussa', label: 'Gussa (پیارا غصہ)', desc: 'Playful loving scolding', icon: Flame },
  { id: 'narazgi', label: 'Narazgi (ناراضگی)', desc: 'Cute roothna-manana mood', icon: CloudRain },
  { id: 'calm', label: 'Calm (پرسکون)', desc: 'Peaceful supportive tone', icon: Smile },
];

export const SoulModal: React.FC<SoulModalProps> = ({
  isOpen,
  onClose,
  config,
  ownerPinCode = '1234',
  onUpdateConfig,
}) => {
  const [ownerAuth, setOwnerAuth] = useState<OwnerAuthSnapshot>(() => getOwnerAuthSnapshot());
  const [pinInput, setPinInput] = useState('');
  const [heartPinInput, setHeartPinInput] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isVerifyingGoogle, setIsVerifyingGoogle] = useState(false);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);

  useEffect(() => {
    return subscribeOwnerAuth((snap) => {
      setOwnerAuth(snap);
    });
  }, []);

  if (!isOpen) return null;

  const isOwnerVerified = ownerAuth.isOwnerVerified;
  const activeGender: ZaraVoiceGender =
    config.voiceGender || getVoiceGenderFromName(config.voiceName);
  const voicesOfGender = ZARA_VOICE_PROFILES.filter((p) => p.gender === activeGender);
  const isHeartLocked = Boolean(
    isOwnerVerified && config.heartLockEnabled && !config.heartLockUnlocked
  );

  const handleGoogleOwnerVerify = async () => {
    setAuthMessage(null);
    setIsVerifyingGoogle(true);
    audioService.unlock();
    audioService.playChime('tap');
    const result = await signInOwnerWithGoogle();
    setIsVerifyingGoogle(false);
    if (result.ok) {
      audioService.playChime('heart');
      onUpdateConfig({ isOwnerSessionUnlocked: true, ownerOnlyRomance: true, loveMode: true });
      setAuthMessage(null);
    } else if (result.error) {
      setAuthMessage(result.error);
    }
  };

  const handleUnlockOwnerPin = () => {
    const res = unlockGuestSafeLockWithPin(pinInput, ownerPinCode || '1234');
    if (res.ok) {
      audioService.playChime('heart');
      setAuthMessage(null);
      setPinInput('');
      onUpdateConfig({ isOwnerSessionUnlocked: true, ownerOnlyRomance: true });
    } else {
      setAuthMessage(res.reason || 'Incorrect PIN.');
    }
  };

  const handleLockForOthers = () => {
    audioService.playChime('tap');
    engageGuestSafeLock();
    onUpdateConfig({
      isOwnerSessionUnlocked: false,
      ownerOnlyRomance: true,
      heartLockUnlocked: false,
    });
    setAuthMessage('Guest-Safe Lock enabled — private emotions and bond settings hidden.');
  };

  const handleSignOutOwner = async () => {
    audioService.playChime('tap');
    await signOutOwnerAccount();
    onUpdateConfig({
      isOwnerSessionUnlocked: false,
      ownerOnlyRomance: true,
      heartLockUnlocked: false,
    });
    setAuthMessage('Signed out of Owner Mode.');
  };

  const handlePreviewVoice = (voiceChoice?: ZaraVoiceName) => {
    const selectedVoice = voiceChoice || config.voiceName || 'Zephyr';
    audioService.unlock();
    audioService.playChime('tap');
    if (voiceChoice) {
      onUpdateConfig({
        voiceName: voiceChoice,
        voiceGender: getVoiceGenderFromName(voiceChoice),
      });
    }
    setIsPreviewingVoice(true);
    const sample = !isOwnerVerified
      ? 'Assalam o Alaikum! Main aapki AI voice assistant hoon. Batayein aaj main aapki kya madad karoon?'
      : 'Assalam o Alaikum, main hamesha poore apna-pan aur pyar ke saath aapke saath hoon.';
    audioService.speakText(sample, {
      language: 'urdu',
      rate: config.voiceSpeed,
      voiceName: selectedVoice,
      loveMode: isOwnerVerified ? config.loveMode : false,
      romanceIntensity: isOwnerVerified ? config.romanceIntensity : 'calm',
      emotionMode: isOwnerVerified ? config.emotionMode || 'apnapan' : 'calm',
      onEnd: () => setIsPreviewingVoice(false),
    });
  };

  const handleUnlockHeartLock = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = config.heartLockPin || ownerPinCode || '1234';
    if (heartPinInput.trim() === expected) {
      audioService.playChime('heart');
      setHeartPinInput('');
      setAuthMessage(null);
      onUpdateConfig({ heartLockEnabled: true, heartLockUnlocked: true });
    } else {
      setAuthMessage('Incorrect Heart Lock PIN.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-gradient-to-b from-[#130b26] to-[#080512] border border-pink-500/35 rounded-3xl p-5 shadow-[0_0_40px_rgba(236,72,153,0.25)] max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Voice &amp; Personality</h2>
              <p className="text-[11px] text-slate-400">
                {isOwnerVerified
                  ? 'Owner Mode · Emotions, Heart Lock & Voices'
                  : 'Public Voice Selector'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white bg-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3.5 space-y-4">
          {/* Public Voice Gender + Pakistani Voice Profiles (Available for everyone) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" />
                <span>Pakistani Female &amp; Male Voices</span>
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const firstF = ZARA_VOICE_PROFILES.find((p) => p.gender === 'female')!;
                    onUpdateConfig({ voiceGender: 'female', voiceName: firstF.id });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                    activeGender === 'female'
                      ? 'bg-pink-500/20 border-pink-400 text-pink-200'
                      : 'bg-slate-950 border-white/10 text-slate-400'
                  }`}
                >
                  Female
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstM = ZARA_VOICE_PROFILES.find((p) => p.gender === 'male')!;
                    onUpdateConfig({ voiceGender: 'male', voiceName: firstM.id });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                    activeGender === 'male'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-slate-950 border-white/10 text-slate-400'
                  }`}
                >
                  Male
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {voicesOfGender.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handlePreviewVoice(v.id as ZaraVoiceName)}
                  disabled={isPreviewingVoice}
                  className={`w-full min-h-[46px] p-2.5 rounded-xl border text-left cursor-pointer ${
                    config.voiceName === v.id
                      ? 'bg-sky-500/20 border-sky-400 text-white'
                      : 'bg-slate-950/70 border-white/10 text-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold">{v.label}</div>
                  <div className="text-[10px] text-slate-400">{v.urduLabel}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Owner Gate Banner — Strictly hides private Emotions & Heart Lock from Guest Users */}
          <div
            className={`p-3.5 rounded-2xl border space-y-2.5 ${
              isOwnerVerified
                ? 'bg-emerald-950/35 border-emerald-500/40'
                : 'bg-slate-900/90 border-white/12'
            }`}
          >
            <div className="text-xs font-bold flex items-center gap-1.5">
              {isOwnerVerified ? (
                <>
                  <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300">Owner Verified</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-200">Owner Account</span>
                </>
              )}
            </div>

            {isOwnerVerified ? (
              <div className="pt-2 border-t border-emerald-800/40 flex items-center justify-between gap-2">
                <span className="text-[11px] text-emerald-300 flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Private Features Unlocked</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleLockForOthers}
                    className="min-h-[34px] px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[11px] font-semibold cursor-pointer"
                  >
                    Guest Lock
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOutOwner}
                    className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-800 border border-white/10 text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Private personal bond and custom settings are strictly separated from guest access.
                </p>
                {ownerAuth.isGoogleOwnerAccount ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setAuthMessage(null);
                      }}
                      placeholder="Enter Owner PIN"
                      className="flex-1 min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleUnlockOwnerPin}
                      className="min-h-[40px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Unlock
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isVerifyingGoogle}
                    onClick={handleGoogleOwnerVerify}
                    className="min-h-[44px] w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {isVerifyingGoogle ? 'Signing In...' : 'Owner Sign-In with Google'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {authMessage && (
              <div className="text-[11px] text-amber-300 bg-slate-950/80 border border-amber-500/30 rounded-xl px-2.5 py-1.5">
                {authMessage}
              </div>
            )}
          </div>

          {/* OWNER-ONLY PRIVATE EMOTIONS, HEART LOCK & BOND CONTROLS (Completely Hidden from Guests) */}
          {isOwnerVerified && (
            <div className="space-y-3.5">
              {/* Heart Lock Protection */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-pink-500/35 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-pink-400" />
                      <span>HEART LOCK Protection</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Locks private feelings, memories &amp; personal bond behind your PIN.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({
                        heartLockEnabled: !config.heartLockEnabled,
                        heartLockUnlocked: !config.heartLockEnabled ? false : true,
                      })
                    }
                    className={`min-h-[34px] px-3 rounded-xl text-xs font-bold border cursor-pointer ${
                      config.heartLockEnabled
                        ? 'bg-pink-600 border-pink-400 text-white'
                        : 'bg-slate-950 border-white/15 text-slate-300'
                    }`}
                  >
                    {config.heartLockEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {isHeartLocked && (
                  <form onSubmit={handleUnlockHeartLock} className="flex gap-2 pt-1">
                    <input
                      type="password"
                      inputMode="numeric"
                      value={heartPinInput}
                      onChange={(e) => setHeartPinInput(e.target.value)}
                      placeholder="PIN to Unlock Heart"
                      className="flex-1 min-h-[38px] px-3 rounded-xl bg-slate-950 border border-pink-500/40 text-xs text-white"
                    />
                    <button
                      type="submit"
                      className="min-h-[38px] px-3 rounded-xl bg-pink-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Unlock Heart
                    </button>
                  </form>
                )}
              </div>

              {/* Emotions (Apna-pan, Pyar, Gussa, Narazgi) */}
              {!isHeartLocked && (
                <>
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
                    <span className="text-xs font-bold text-pink-300">
                      Zara Emotion &amp; Heart Mood
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {EMOTIONS.map((em) => {
                        const Icon = em.icon;
                        const active = (config.emotionMode || 'apnapan') === em.id;
                        return (
                          <button
                            key={em.id}
                            type="button"
                            onClick={() => {
                              audioService.playChime('tap');
                              onUpdateConfig({ emotionMode: em.id, loveMode: true });
                            }}
                            className={`min-h-[44px] px-3 py-2 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                              active
                                ? 'bg-pink-600/25 border-pink-400 text-white'
                                : 'bg-slate-950 border-white/10 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-pink-400" />
                              <div>
                                <div className="text-xs font-bold">{em.label}</div>
                                <div className="text-[10px] text-slate-400">{em.desc}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Affection & Care Sliders */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-pink-300 flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
                          <span>Affection &amp; Apna-pan</span>
                        </span>
                        <span className="text-xs font-mono text-pink-400">
                          {config.affectionLevel}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={config.affectionLevel}
                        onChange={(e) => onUpdateConfig({ affectionLevel: Number(e.target.value) })}
                        className="w-full accent-pink-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Care &amp; Attentiveness</span>
                        </span>
                        <span className="text-xs font-mono text-emerald-400">
                          {config.obedienceLevel}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="70"
                        max="100"
                        value={config.obedienceLevel}
                        onChange={(e) => onUpdateConfig({ obedienceLevel: Number(e.target.value) })}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {isOwnerVerified ? 'Owner Mode Active' : 'Privacy Protected'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
