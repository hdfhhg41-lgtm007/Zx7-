import React from 'react';

export const ZaraCrownWordmark: React.FC<{
  subtitle: string;
  compact?: boolean;
}> = ({ subtitle, compact = false }) => {
  return (
    <div className="flex flex-col items-center justify-center select-none pointer-events-none">
      <div className="relative inline-flex flex-col items-center">
        {/* Golden Crown Perched Above Zara */}
        <svg
          aria-hidden="true"
          viewBox="0 0 48 26"
          className={`${compact ? 'w-7 h-4 -mb-1' : 'w-8 h-4.5 -mb-1'} drop-shadow-[0_2px_8px_rgba(250,204,21,0.75)]`}
        >
          <defs>
            <linearGradient id="zaraCrownGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
          <path
            d="M6 21 L3 8 L14 14 L24 3 L34 14 L45 8 L42 21 Z"
            fill="url(#zaraCrownGold)"
            stroke="#fffbeb"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <rect x="6" y="21" width="36" height="3" rx="1.5" fill="#fde047" />
          <circle cx="3" cy="7" r="1.8" fill="#fef9c3" />
          <circle cx="24" cy="2.5" r="2.1" fill="#fef9c3" />
          <circle cx="45" cy="7" r="1.8" fill="#fef9c3" />
        </svg>
        <span
          className={`font-zara-display italic font-extrabold tracking-tight leading-none bg-gradient-to-b from-white via-[#f5e1ff] to-[#e879f9] bg-clip-text text-transparent drop-shadow-[0_3px_14px_rgba(216,180,254,0.65)] ${
            compact ? 'text-[28px]' : 'text-[32px] sm:text-[36px]'
          }`}
        >
          Zara
        </span>
      </div>
      <div className="flex items-center gap-1 text-[11px] sm:text-xs font-medium text-purple-100/90 mt-0.5 whitespace-nowrap">
        <span>{subtitle}</span>
        <span aria-hidden="true" className="text-pink-400 drop-shadow-[0_0_6px_rgba(244,114,182,0.85)]">
          💗
        </span>
      </div>
    </div>
  );
};

export const ZaraVerifiedCheckBadge: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    aria-label="Verified"
    viewBox="0 0 24 24"
    className={className}
  >
    <defs>
      <linearGradient id="zaraBlueCheck" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
    </defs>
    <path
      d="M12 1.8l2.5 1.8 3.1-.3 1.2 2.8 2.8 1.2-.3 3.1L23 12l-1.7 2.6.3 3.1-2.8 1.2-1.2 2.8-3.1-.3L12 23l-2.5-1.6-3.1.3-1.2-2.8-2.8-1.2.3-3.1L1 12l1.7-2.6-.3-3.1 2.8-1.2 1.2-2.8 3.1.3z"
      fill="url(#zaraBlueCheck)"
    />
    <path
      d="M8.6 12.2l2.3 2.3 4.8-5"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PurpleRoseCluster: React.FC<{ mirrored?: boolean }> = ({ mirrored = false }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 180 180"
    className={`w-36 h-36 sm:w-44 sm:h-44 opacity-80 ${mirrored ? '-scale-x-100' : ''}`}
  >
    <defs>
      <radialGradient id="roseOuter" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stopColor="#d946ef" stopOpacity="0.92" />
        <stop offset="55%" stopColor="#7e22ce" stopOpacity="0.88" />
        <stop offset="100%" stopColor="#2e1065" stopOpacity="0.95" />
      </radialGradient>
      <radialGradient id="roseInner" cx="45%" cy="40%" r="55%">
        <stop offset="0%" stopColor="#f5d0fe" stopOpacity="0.95" />
        <stop offset="55%" stopColor="#a855f7" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.95" />
      </radialGradient>
    </defs>
    {/* Deep Botanical Leaves */}
    <path d="M12 168 C22 126, 54 114, 72 132 C58 158, 34 170, 12 168 Z" fill="#1e1b4b" opacity="0.85" />
    <path d="M74 172 C88 134, 124 130, 134 156 C112 174, 92 176, 74 172 Z" fill="#312e81" opacity="0.72" />
    {/* Lower Rose Petals */}
    <circle cx="48" cy="134" r="34" fill="url(#roseOuter)" />
    <ellipse cx="26" cy="128" rx="18" ry="26" transform="rotate(-24 26 128)" fill="#9333ea" opacity="0.85" />
    <ellipse cx="70" cy="130" rx="19" ry="25" transform="rotate(28 70 130)" fill="#7e22ce" opacity="0.85" />
    <ellipse cx="48" cy="112" rx="26" ry="18" fill="#a855f7" opacity="0.9" />
    <ellipse cx="48" cy="148" rx="24" ry="17" fill="#6b21a8" opacity="0.92" />
    {/* Inner Swirl */}
    <circle cx="48" cy="130" r="17" fill="url(#roseInner)" />
    <path
      d="M40 129 C40 120, 56 120, 56 130 C56 138, 43 139, 43 131 C43 126, 51 126, 51 131"
      fill="none"
      stroke="#fae8ff"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {/* Secondary Small Bud */}
    <circle cx="98" cy="154" r="18" fill="url(#roseOuter)" opacity="0.88" />
    <circle cx="98" cy="152" r="9" fill="url(#roseInner)" opacity="0.9" />
  </svg>
);

export const ZaraPurpleBackdropDecor: React.FC<{
  showSilkWave?: boolean;
  waveTopPercent?: string;
}> = ({ showSilkWave = true, waveTopPercent = '46%' }) => {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base Royal-Violet Midnight Radial Atmospheric Glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 52% 24%, rgba(168,85,247,0.28) 0%, rgba(76,29,149,0.22) 38%, rgba(11,4,36,0.96) 80%)',
        }}
      />
      {/* Warm Gold Bokeh Left & Soft Pink Bokeh Right (Matches Reference Atmosphere) */}
      <div className="absolute top-16 -left-10 w-44 h-44 rounded-full bg-amber-300/15 blur-3xl" />
      <div className="absolute top-36 -left-6 w-20 h-20 rounded-full bg-amber-200/20 blur-xl" />
      <div className="absolute top-28 right-0 w-48 h-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="absolute top-52 right-6 w-16 h-16 rounded-full bg-pink-400/20 blur-xl" />

      {/* Luminous Silk Wave Ribbons Behind Talk Card / Hangup */}
      {showSilkWave && (
        <svg
          viewBox="0 0 430 220"
          preserveAspectRatio="none"
          style={{ top: waveTopPercent }}
          className="absolute inset-x-0 w-full h-48 opacity-75"
        >
          <defs>
            <linearGradient id="silkWaveA" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9333ea" stopOpacity="0.05" />
              <stop offset="30%" stopColor="#c084fc" stopOpacity="0.48" />
              <stop offset="55%" stopColor="#e879f9" stopOpacity="0.6" />
              <stop offset="85%" stopColor="#7e22ce" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6b21a8" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="silkWaveB" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7e22ce" stopOpacity="0.04" />
              <stop offset="45%" stopColor="#a855f7" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <path
            d="M-20 82 Q 80 18, 215 74 T 450 56 L 450 165 Q 310 198, 200 144 T -20 156 Z"
            fill="url(#silkWaveA)"
          />
          <path
            d="M-20 118 Q 110 168, 235 96 T 450 112"
            fill="none"
            stroke="url(#silkWaveB)"
            strokeWidth="2.5"
          />
          <path
            d="M-15 62 Q 110 24, 230 88 T 445 58"
            fill="none"
            stroke="#e9d5ff"
            strokeOpacity="0.36"
            strokeWidth="1.4"
          />
        </svg>
      )}

      {/* Bottom Corner Purple Roses */}
      <div className="absolute -bottom-6 -left-6">
        <PurpleRoseCluster />
      </div>
      <div className="absolute -bottom-6 -right-6">
        <PurpleRoseCluster mirrored />
      </div>
    </div>
  );
};
