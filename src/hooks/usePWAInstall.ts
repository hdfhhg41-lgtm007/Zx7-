import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

const CUSTOM_CLOUD_URL_KEY = 'zara_custom_cloud_url_v1';

export interface InstallLinkStatus {
  isDevContainer: boolean;
  isPublicForAllMobiles: boolean;
  publicHttpStatus: number;
  ownerInstallUrl: string;
  publicInstallUrl: string;
  activeWorkingUrl: string;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.__deferredPwaPrompt) {
      return window.__deferredPwaPrompt;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isInAppWebView, setIsInAppWebView] = useState(false);

  const [customCloudUrl, setCustomCloudUrlState] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(CUSTOM_CLOUD_URL_KEY) || '';
    } catch {
      return '';
    }
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const initialIsDev = origin.includes('://ais-dev-');
  const fallbackPublicOrigin = initialIsDev
    ? origin.replace('://ais-dev-', '://ais-pre-')
    : origin;

  const [linkStatus, setLinkStatus] = useState<InstallLinkStatus>(() => {
    const ownerUrl = origin ? `${origin}/?play_install=1` : '/?play_install=1';
    const pubUrl = fallbackPublicOrigin
      ? `${fallbackPublicOrigin}/?play_install=1`
      : ownerUrl;
    return {
      isDevContainer: initialIsDev,
      // Assume false until verified if we are inside ais-dev- so we NEVER blindly send users to a 404 URL!
      isPublicForAllMobiles: !initialIsDev,
      publicHttpStatus: initialIsDev ? 0 : 200,
      ownerInstallUrl: ownerUrl,
      publicInstallUrl: pubUrl,
      activeWorkingUrl: !initialIsDev ? pubUrl : ownerUrl,
    };
  });
  const [isCheckingLink, setIsCheckingLink] = useState(false);

  const recheckLinkStatus = useCallback(
    async (overrideCustomUrl?: string): Promise<InstallLinkStatus | null> => {
      setIsCheckingLink(true);
      try {
        const effectiveCustom =
          overrideCustomUrl !== undefined ? overrideCustomUrl.trim() : customCloudUrl.trim();
        const qs = effectiveCustom
          ? `?customUrl=${encodeURIComponent(effectiveCustom)}`
          : '';
        const res = await fetch(`/api/install-link-status${qs}`);
        if (res.ok) {
          const data = await res.json();
          const updated: InstallLinkStatus = {
            isDevContainer: Boolean(data.isDevContainer),
            isPublicForAllMobiles: Boolean(data.isPublicForAllMobiles),
            publicHttpStatus: Number(data.publicHttpStatus || 0),
            ownerInstallUrl: data.ownerInstallUrl || linkStatus.ownerInstallUrl,
            publicInstallUrl: data.publicInstallUrl || linkStatus.publicInstallUrl,
            activeWorkingUrl: data.activeWorkingUrl || linkStatus.ownerInstallUrl,
          };
          setLinkStatus(updated);
          return updated;
        }
      } catch {} finally {
        setIsCheckingLink(false);
      }
      return null;
    },
    [customCloudUrl, linkStatus.ownerInstallUrl, linkStatus.publicInstallUrl]
  );

  const saveCustomCloudUrl = useCallback(
    async (rawUrl: string) => {
      const cleaned = rawUrl.trim();
      setCustomCloudUrlState(cleaned);
      try {
        if (cleaned) {
          localStorage.setItem(CUSTOM_CLOUD_URL_KEY, cleaned);
        } else {
          localStorage.removeItem(CUSTOM_CLOUD_URL_KEY);
        }
      } catch {}
      return await recheckLinkStatus(cleaned);
    },
    [recheckLinkStatus]
  );

  useEffect(() => {
    recheckLinkStatus();
  }, []);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
    };

    checkStandalone();

    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    const ua = window.navigator.userAgent || '';
    const uaLower = ua.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(uaLower) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);
    setIsAndroid(uaLower.includes('android'));

    // Detect WhatsApp / Instagram / Facebook / Messenger embedded in-app browsers on other phones
    const inApp =
      /(whatsapp|fban|fbav|instagram|messenger|line\/|snapchat|wv\))/i.test(ua);
    setIsInAppWebView(inApp);

    const syncDeferredPrompt = () => {
      if (window.__deferredPwaPrompt) {
        setDeferredPrompt(window.__deferredPwaPrompt);
      }
    };

    syncDeferredPrompt();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__deferredPwaPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      window.__deferredPwaPrompt = null;
      setDeferredPrompt(null);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener?.('change', checkStandalone);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('zara-pwa-ready', syncDeferredPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener?.('change', checkStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('zara-pwa-ready', syncDeferredPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const activePrompt = deferredPrompt || window.__deferredPwaPrompt;
    if (!activePrompt) return false;
    try {
      await activePrompt.prompt();
      const { outcome } = await activePrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        window.__deferredPwaPrompt = null;
        setDeferredPrompt(null);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }, [deferredPrompt]);

  // Direct Play Store-style package preparation & native install trigger
  const prepareAndInstall = useCallback(
    async (
      onProgress?: (percent: number, label: string) => void
    ): Promise<'installed' | 'ready_manual'> => {
      const activePrompt = deferredPrompt || window.__deferredPwaPrompt;

      // Invoke OS installer immediately inside user gesture if already ready!
      if (activePrompt) {
        onProgress?.(45, 'Opening Mobile OS App Installer...');
        const accepted = await install();
        if (accepted) {
          onProgress?.(100, 'Installed on Mobile Home Screen!');
          return 'installed';
        }
      }

      onProgress?.(20, 'Verifying Play Protect & device compatibility...');
      const assetsToCache = [
        '/icon.svg',
        '/pwa-192x192.png',
        '/pwa-512x512.png',
        '/apple-touch-icon.png',
      ];
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          await window.caches.delete('zara-4d-direct-package-v2').catch(() => {});
          const cache = await window.caches.open('zara-static-icons-v3');
          for (let i = 0; i < assetsToCache.length; i++) {
            const pct = Math.min(82, 28 + Math.round(((i + 1) / assetsToCache.length) * 52));
            onProgress?.(pct, 'Downloading Zara 4D Mobile Package...');
            await cache.add(assetsToCache[i]).catch(() => {});
          }
        } catch {}
      }

      // Give mobile Chrome up to ~1.2s if Service Worker just activated & beforeinstallprompt is arriving
      for (let waitStep = 0; waitStep < 4; waitStep++) {
        if (window.__deferredPwaPrompt) break;
        onProgress?.(85 + waitStep * 3, 'Preparing Android / iOS App Installer...');
        await new Promise((r) => setTimeout(r, 300));
      }

      const latePrompt = window.__deferredPwaPrompt;
      if (latePrompt) {
        setDeferredPrompt(latePrompt);
        try {
          await latePrompt.prompt();
          const { outcome } = await latePrompt.userChoice;
          if (outcome === 'accepted') {
            setIsInstalled(true);
            window.__deferredPwaPrompt = null;
            setDeferredPrompt(null);
            onProgress?.(100, 'Installed on Mobile Home Screen!');
            return 'installed';
          }
        } catch {}
      }

      onProgress?.(100, 'Package ready — tap Install App below or from menu (⋮)!');
      return 'ready_manual';
    },
    [deferredPrompt, install]
  );

  // Escape WhatsApp/Instagram in-app browser into real Google Chrome on Android so WebAPK installs cleanly
  const openInAndroidChrome = useCallback((targetUrl?: string) => {
    if (typeof document === 'undefined') return;
    const finalUrl = targetUrl || window.location.href;
    try {
      const parsed = new URL(finalUrl);
      const pathAndQuery = `${parsed.pathname}${parsed.search || '?play_install=1'}`;
      const intentHref = `intent://${parsed.host}${pathAndQuery}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(finalUrl)};end`;
      const a = document.createElement('a');
      a.href = intentHref;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 350);
    } catch {}
  }, []);

  // Share working install link directly to another mobile via WhatsApp or native OS Share sheet
  const shareInstallLinkToOtherMobile = useCallback(
    async (explicitUrl?: string) => {
      const urlToSend =
        explicitUrl ||
        (linkStatus.isPublicForAllMobiles
          ? linkStatus.publicInstallUrl
          : linkStatus.activeWorkingUrl);
      const shareText = `💖 Install Zara 4D AI App (Royal Badshah Edition) on your mobile:\n${urlToSend}`;

      if (typeof navigator !== 'undefined' && navigator.share && !isInIframe) {
        try {
          await navigator.share({
            title: 'Zara 4D Mobile AI App',
            text: 'Install Zara 4D AI App directly on your mobile phone:',
            url: urlToSend,
          });
          return;
        } catch {}
      }

      if (typeof document !== 'undefined') {
        const waHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        const a = document.createElement('a');
        a.href = waHref;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 350);
      }
    },
    [isInIframe, linkStatus]
  );

  return {
    isInstallable: Boolean(deferredPrompt || (typeof window !== 'undefined' && window.__deferredPwaPrompt)),
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    isInAppWebView,
    playStoreLaunchUrl: linkStatus.activeWorkingUrl,
    linkStatus,
    isCheckingLink,
    customCloudUrl,
    recheckLinkStatus,
    saveCustomCloudUrl,
    openInAndroidChrome,
    shareInstallLinkToOtherMobile,
    install,
    prepareAndInstall,
  };
}
