import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  Smartphone,
  Check,
  ShieldCheck,
  Settings,
  Apple,
  RefreshCw,
  Share2,
  Copy,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { audioService } from '../services/audioService';
import {
  ALL_MOBILE_BRANDS,
  MobileBrandProfile,
  getSelectedMobileBrand,
  launchMobileAppNow,
  requestAllPermissionsMaster,
  setSelectedMobileBrand,
} from '../services/visionAndControlService';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoStartDownload?: boolean;
  onOpenMobileSettings?: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  autoStartDownload = false,
  onOpenMobileSettings,
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    isInAppWebView,
    playStoreLaunchUrl,
    linkStatus,
    isCheckingLink,
    customCloudUrl,
    recheckLinkStatus,
    saveCustomCloudUrl,
    openInAndroidChrome,
    shareInstallLinkToOtherMobile,
    prepareAndInstall,
  } = usePWAInstall();

  const [selectedBrand, setSelectedBrand] = useState<MobileBrandProfile>(() =>
    getSelectedMobileBrand()
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [downloadLabel, setDownloadLabel] = useState('');
  const [showStepHint, setShowStepHint] = useState(false);
  const [permsReady, setPermsReady] = useState(false);
  const [copiedWhich, setCopiedWhich] = useState<'public' | 'owner' | null>(null);
  const [showCustomUrlBox, setShowCustomUrlBox] = useState(false);
  const [customUrlDraft, setCustomUrlDraft] = useState(customCloudUrl || '');

  useEffect(() => {
    if (isOpen) {
      setSelectedBrand(getSelectedMobileBrand());
      setShowStepHint(false);
      setCustomUrlDraft(customCloudUrl || '');
      recheckLinkStatus();
      if (autoStartDownload && !isInstalled && !isInIframe) {
        setDownloadPercent(100);
        setDownloadLabel('Package verified — tap Install below to add Zara 4D to your phone!');
      } else {
        setDownloadPercent(0);
        setDownloadLabel('');
      }
    }
  }, [isOpen, autoStartDownload, isInstalled, isInIframe]);

  if (!isOpen) return null;

  const handleDirectPlayDownload = async () => {
    audioService.unlock();
    audioService.playChime('activate');
    setIsDownloading(true);
    setShowStepHint(false);
    setDownloadPercent(12);
    setDownloadLabel(`Preparing package for ${selectedBrand.name}...`);

    const outcome = await prepareAndInstall((pct, label) => {
      setDownloadPercent(pct);
      setDownloadLabel(label);
    });

    setIsDownloading(false);

    if (outcome === 'installed') {
      setDownloadLabel('Zara AI is installed on your home screen!');
      return;
    }

    setShowStepHint(true);
  };

  const handleSelectBrand = (brandId: string) => {
    audioService.playChime('tap');
    const updated = setSelectedMobileBrand(brandId);
    setSelectedBrand(updated);
  };

  const handleOpenPlayStoreNative = () => {
    audioService.unlock();
    audioService.playChime('activate');
    launchMobileAppNow('playstore');
  };

  const handleEnableAllMobileOptions = async () => {
    audioService.unlock();
    audioService.playChime('activate');
    const res = await requestAllPermissionsMaster();
    if (res.micGranted || res.cameraGranted) {
      setPermsReady(true);
    }
    if (onOpenMobileSettings) {
      onClose();
      onOpenMobileSettings();
    }
  };

  const handleCopyUrl = async (url: string, tag: 'public' | 'owner') => {
    audioService.playChime('tap');
    try {
      await navigator.clipboard.writeText(url);
      setCopiedWhich(tag);
      window.setTimeout(() => setCopiedWhich(null), 2400);
    } catch {}
  };

  const handleSaveCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    audioService.playChime('activate');
    await saveCustomCloudUrl(customUrlDraft);
    setShowCustomUrlBox(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#0b0f19] border border-emerald-500/40 rounded-3xl p-5 shadow-[0_0_50px_rgba(16,185,129,0.22)] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Google Play Store Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path fill="#34A853" d="M3.6 2.4c-.3.3-.5.8-.5 1.4v16.4c0 .6.2 1.1.5 1.4l.1.1L13 12.4v-.2L3.7 2.3l-.1.1z" />
                <path fill="#FBBC04" d="M16.1 15.5l-3.1-3.1v-.2l3.1-3.1.1.1 3.7 2.1c1.1.6 1.1 1.6 0 2.2l-3.8 2z" />
                <path fill="#EA4335" d="M16.2 15.4L13 12.2 3.6 21.6c.4.4 1 .4 1.7 0l10.9-6.2z" />
                <path fill="#4285F4" d="M16.2 8.6L5.3 2.4c-.7-.4-1.3-.4-1.7 0L13 11.8l3.2-3.2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight">
                Google Play Direct Install
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Verified • All Mobiles Edition</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-full text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Storefront Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-0.5">
          {/* App Identity Row */}
          <div className="flex items-start gap-3.5">
            <img
              src="/pwa-192x192.png"
              alt="Zara 4D App"
              className="w-16 h-16 rounded-2xl object-cover border border-slate-700/80 shadow-md shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-white leading-snug">
                Zara 4D: Mobile AI &amp; Voice Control
              </h2>
              <div className="text-xs text-emerald-400 font-medium mt-0.5">
                Zara AI Mobile • All Android &amp; iOS Phones
              </div>
              <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-slate-400 mt-1.5">
                <span className="text-slate-200 font-semibold">4.9 ★</span>
                <span aria-hidden="true">·</span>
                <span>14.2 MB</span>
                <span aria-hidden="true">·</span>
                <span>Offline Ready</span>
                <span aria-hidden="true">·</span>
                <span>{selectedBrand.badgeText}</span>
              </div>
            </div>
          </div>

          {/* WhatsApp / Instagram In-App Browser Escape Helper on Android */}
          {isInAppWebView && isAndroid && !isInstalled && (
            <div className="p-3.5 rounded-2xl bg-amber-950/70 border border-amber-400/60 space-y-2">
              <div className="text-xs font-bold text-amber-200">
                Opened inside WhatsApp / Social Browser!
              </div>
              <p className="text-[11px] text-amber-100 leading-relaxed">
                Tap below to open Zara directly in <strong>Google Chrome</strong> so Android installs
                the full app with Microphone &amp; Camera permissions:
              </p>
              <button
                type="button"
                onClick={() => openInAndroidChrome()}
                className="min-h-[42px] w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span>Open in Google Chrome to Install</span>
              </button>
            </div>
          )}

          {/* Live Download Progress Bar */}
          {(isDownloading || downloadPercent > 0) && !isInstalled && (
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/35 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-medium truncate pr-2">
                  {downloadLabel || 'Downloading Zara 4D Package...'}
                </span>
                <span className="text-white font-mono tabular-nums font-bold">
                  {downloadPercent}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.max(8, downloadPercent)}%` }}
                />
              </div>
            </div>
          )}

          {/* Primary Play Store Install Action */}
          {isInstalled ? (
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 flex items-center gap-2.5 text-xs text-emerald-200">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  Installed on your mobile phone! Open Zara 4D anytime directly from your Home Screen.
                </span>
              </div>
              {onOpenMobileSettings && (
                <button
                  type="button"
                  onClick={handleEnableAllMobileOptions}
                  className="min-h-[46px] w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>Open Mobile Settings &amp; All Apps</span>
                </button>
              )}
            </div>
          ) : isInIframe && !isInstallable ? (
            <div className="space-y-2.5">
              <a
                href={playStoreLaunchUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => audioService.playChime('activate')}
                className="min-h-[48px] w-full py-3 px-4 rounded-xl bg-[#01875f] hover:bg-[#019a6c] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all whitespace-nowrap no-underline"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Install on This Mobile (Direct Open)</span>
              </a>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleOpenPlayStoreNative}
                  className="min-h-[42px] py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500/50 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Open Play Store</span>
                </button>

                <button
                  type="button"
                  onClick={handleEnableAllMobileOptions}
                  className="min-h-[42px] py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-cyan-200 font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>All Mobile Options</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={isDownloading}
                onClick={handleDirectPlayDownload}
                className="min-h-[48px] w-full py-3 px-4 rounded-xl bg-[#01875f] hover:bg-[#019a6c] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all whitespace-nowrap cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>
                  {isDownloading
                    ? 'Downloading...'
                    : isInstallable
                    ? 'Install App Now'
                    : 'Download & Install on Mobile'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleOpenPlayStoreNative}
                  className="min-h-[42px] py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500/50 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Open Play Store</span>
                </button>

                <button
                  type="button"
                  onClick={handleEnableAllMobileOptions}
                  className="min-h-[42px] py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-cyan-200 font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{permsReady ? 'Mobile Ready ✓' : 'All Mobile Options'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Direct 1-Step OS Prompt Guide when browser requires menu tap */}
          {showStepHint && !isInstalled && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-100 leading-relaxed">
              {isIOS || selectedBrand.id === 'iphone' ? (
                <div className="flex items-start gap-2">
                  <Apple className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                  <span>
                    Package ready! Tap the <strong>Share</strong> icon at the bottom of Safari and tap{' '}
                    <strong>Add to Home Screen</strong> to finish installing on your iPhone.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                  <span>
                    Package downloaded! Tap the <strong>top-right menu (⋮)</strong> in Chrome on your{' '}
                    <strong>{selectedBrand.name}</strong> and select <strong>Install app</strong> (or{' '}
                    <strong>Add to Home screen</strong>).
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ================= LIVE MULTI-MOBILE LINK CHECKER & 404 PAGE NOT FOUND FIX ================= */}
          <div
            className={`p-3.5 rounded-2xl border space-y-2.5 ${
              linkStatus.isPublicForAllMobiles
                ? 'bg-emerald-950/40 border-emerald-500/50'
                : 'bg-amber-950/45 border-amber-500/55'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {linkStatus.isPublicForAllMobiles ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="text-xs font-extrabold text-white truncate">
                  {linkStatus.isPublicForAllMobiles
                    ? 'All Other Mobiles Link: LIVE ✓'
                    : 'दूसरे मोबाइल में 404 Page Not Found क्यों आया?'}
                </span>
              </div>

              <button
                type="button"
                disabled={isCheckingLink}
                onClick={() => recheckLinkStatus()}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-[10px] font-bold text-cyan-200 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingLink ? 'animate-spin' : ''}`} />
                <span>{isCheckingLink ? 'Checking...' : 'Check Link'}</span>
              </button>
            </div>

            {linkStatus.isPublicForAllMobiles ? (
              <p className="text-[11px] text-emerald-200 leading-relaxed">
                पब्लिक लिंक चालू है! अब आप नीचे से यह लिंक WhatsApp पर भेजें या कॉपी करें — यह किसी भी
                दूसरे मोबाइल (Samsung, Vivo, Oppo, Redmi, iPhone) में सीधा खुलेगा और इंस्टॉल होगा।
              </p>
            ) : (
              <div className="text-[11px] text-amber-100 leading-relaxed space-y-1.5">
                <p>
                  अभी पब्लिक सर्वर (<span className="font-mono text-amber-300">ais-pre-...</span>) पर{' '}
                  <strong>HTTP {linkStatus.publicHttpStatus || 404} (Page not found)</strong> आ रहा
                  है क्योंकि AI Studio में ऐप अभी Private है।
                </p>
                <div className="p-2.5 rounded-xl bg-black/45 border border-amber-500/35 space-y-1 text-white">
                  <div className="font-bold text-amber-300">
                    हर दूसरे मोबाइल के लिए चालू करने का तरीका (सिर्फ 5 सेकंड):
                  </div>
                  <div>
                    1. AI Studio में सबसे ऊपर दाईं तरफ (Top-Right) <strong>Share</strong> आइकन दबाकर{' '}
                    <strong>Public / Share App</strong> ऑन करें — या <strong>Deploy (Cloud Run)</strong>{' '}
                    दबाएं।
                  </div>
                  <div>
                    2. ऑन करते ही ऊपर <strong>Check Link</strong> दबाएं — यह हरा (LIVE ✓) हो जाएगा!
                  </div>
                </div>
              </div>
            )}

            {/* Public All-Mobiles Link Copy & WhatsApp Share */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-300">
                {linkStatus.isPublicForAllMobiles
                  ? 'Universal Install Link (All Mobiles):'
                  : '1) Public Link (Works on ALL Mobiles after Share/Public ON):'}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyUrl(linkStatus.publicInstallUrl, 'public')}
                  className="min-h-[38px] py-1.5 px-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedWhich === 'public' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  )}
                  <span>{copiedWhich === 'public' ? 'Copied!' : 'Copy Public Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => shareInstallLinkToOtherMobile(linkStatus.publicInstallUrl)}
                  className="min-h-[38px] py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Send on WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Owner Same-Gmail Link (Works RIGHT NOW without Share!) */}
            {!linkStatus.isPublicForAllMobiles && linkStatus.isDevContainer && (
              <div className="pt-1.5 border-t border-amber-500/25 space-y-1.5">
                <div className="text-[10px] text-emerald-300 font-semibold">
                  2) Owner Gmail Link (LIVE NOW ✓ — आपके Gmail वाले मोबाइल में अभी तुरंत खुलेगा):
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyUrl(linkStatus.ownerInstallUrl, 'owner')}
                  className="min-h-[36px] w-full py-1.5 px-3 rounded-xl bg-slate-950 border border-emerald-500/40 hover:border-emerald-400 text-emerald-200 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedWhich === 'owner' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  <span>
                    {copiedWhich === 'owner'
                      ? 'Owner Link Copied ✓'
                      : 'Copy Working Owner Mobile Link'}
                  </span>
                </button>
              </div>
            )}

            {/* Optional Custom Cloud Run Deployed URL Saver */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowCustomUrlBox((v) => !v)}
                className="text-[10px] text-cyan-300 hover:underline cursor-pointer"
              >
                {showCustomUrlBox
                  ? 'Hide Cloud Run URL box'
                  : customCloudUrl
                  ? 'Edit Deployed Cloud Run URL'
                  : 'Deployed to Cloud Run? Paste permanent URL here'}
              </button>

              {showCustomUrlBox && (
                <form onSubmit={handleSaveCustomUrl} className="mt-2 flex gap-1.5">
                  <input
                    type="url"
                    value={customUrlDraft}
                    onChange={(e) => setCustomUrlDraft(e.target.value)}
                    placeholder="https://zara-...run.app"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-[11px] font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Save
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* All Mobile Phones Selector */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white">
                Select Your Mobile Phone (All Mobiles Supported)
              </div>
              <span className="text-[11px] text-emerald-400">{selectedBrand.osName}</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-0.5">
              {ALL_MOBILE_BRANDS.map((brand) => {
                const isActive = selectedBrand.id === brand.id;
                return (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => handleSelectBrand(brand.id)}
                    className={`min-h-[38px] px-2.5 py-2 rounded-xl border text-left text-xs transition-colors flex items-center justify-between gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-950/80 border-emerald-400 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="truncate">{brand.name}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              Native Apps (WhatsApp, YouTube, Instagram, TikTok, Play Store) + 16 Mobile Settings pre-configured for{' '}
              <strong className="text-slate-200">{selectedBrand.name}</strong>.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>All Mobile Apps &amp; OS Settings Included</span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
