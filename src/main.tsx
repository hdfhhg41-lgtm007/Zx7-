import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

declare global {
  interface Window {
    __zaraMainLoaded?: boolean;
    __zaraBooted?: boolean;
    __zaraRecoveryActive?: boolean;
    __zaraForceFreshOpen?: (manualClick?: boolean, reason?: string) => void;
  }
}

// Signal immediately that JavaScript entry executed so slow-network downloads are never interrupted
window.__zaraMainLoaded = true;

function safeSessionGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, val: string): void {
  try {
    window.sessionStorage.setItem(key, val);
  } catch {}
}

function safeSessionRemove(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
}

// Recover automatically via smart recovery if Vite encounters a dynamic import / chunk hash mismatch
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  if (!safeSessionGet('zara_preload_recovered')) {
    safeSessionSet('zara_preload_recovered', '1');
    if (window.__zaraForceFreshOpen) {
      window.__zaraForceFreshOpen(false, 'script_error');
    } else {
      window.location.reload();
    }
  }
});

interface BootErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class BootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  BootErrorBoundaryState
> {
  state: BootErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(err: unknown): BootErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: err instanceof Error ? err.message : 'Unexpected startup error',
    };
  }

  componentDidCatch() {
    if (!safeSessionGet('zara_error_boundary_auto_healed')) {
      safeSessionSet('zara_error_boundary_auto_healed', '1');
      window.setTimeout(() => {
        if (window.__zaraForceFreshOpen) {
          window.__zaraForceFreshOpen(false, 'script_error');
        }
      }, 400);
    }
  }

  private handleSafeRepairAndReload = () => {
    // CRITICAL: NEVER delete user chat history, memories, contacts, or schedules!
    // Only validate JSON integrity on non-chat UI config keys if corrupted.
    try {
      ['zara_personality_config_v5', 'zara_security_control_v1'].forEach((k) => {
        const raw = window.localStorage.getItem(k);
        if (raw) {
          try {
            JSON.parse(raw);
          } catch {
            window.localStorage.removeItem(k);
          }
        }
      });
    } catch {}

    if (window.__zaraForceFreshOpen) {
      window.__zaraForceFreshOpen(true, 'manual_repair');
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-[#070512] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-xs w-full rounded-2xl bg-slate-900/95 border border-rose-500/50 p-6 space-y-4">
            <div className="text-lg font-extrabold text-rose-300">Zara Safe Auto-Recovery</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              آپ کی تمام چیٹ ہسٹری اور یادیں 100% محفوظ ہیں — نیچے بٹن دبا کر زارا اوپن کریں۔
            </p>
            <button
              type="button"
              onClick={this.handleSafeRepairAndReload}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
            >
              Open Zara Now (Chat Safe)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

let swStarted = false;
function startDeferredSW(): void {
  if (swStarted) return;
  swStarted = true;

  if (!import.meta.env.PROD) {
    // Never run Vite PWA dev-sw in dev mode — clean up any old dev-sw registrations instead
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => {
            regs.forEach((r) => {
              const url =
                r.active?.scriptURL || r.waiting?.scriptURL || r.installing?.scriptURL || '';
              if (url.includes('dev-sw.js')) {
                r.unregister().catch(() => {});
              }
            });
          })
          .catch(() => {});
      }
    } catch {}
    return;
  }

  window.setTimeout(() => {
    try {
      const updateSW = registerSW({
        immediate: false,
        onRegisteredSW(_swUrl, registration) {
          if (!registration) return;
          window.setInterval(() => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
              registration.update().catch(() => {});
            }
          }, 30 * 60 * 1000);
        },
        onNeedRefresh() {
          updateSW(true).catch(() => {});
        },
        onRegisterError() {
          // Ignore SW errors in restricted embedded WebViews
        },
      });
    } catch {
      // Ignore SW errors in restricted embedded WebViews
    }
  }, 1800);
}

function ZaraBootstrapRoot() {
  useEffect(() => {
    window.__zaraBooted = true;
    window.__zaraRecoveryActive = false;
    safeSessionRemove('zara_preload_recovered');
    safeSessionRemove('zara_error_boundary_auto_healed');
    startDeferredSW();
  }, []);

  return <App />;
}

// Clean temporary wakeup query parameters (_zdirect / _zwake / fresh) cleanly without reloading
try {
  const cleanUrl = new URL(window.location.href);
  if (
    cleanUrl.searchParams.has('_zdirect') ||
    cleanUrl.searchParams.has('_zwake') ||
    cleanUrl.searchParams.has('fresh')
  ) {
    cleanUrl.searchParams.delete('_zdirect');
    cleanUrl.searchParams.delete('_zwake');
    cleanUrl.searchParams.delete('fresh');
    const nextHref = `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}` || '/';
    window.history.replaceState({}, '', nextHref);
  }
} catch {}

const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(
  <BootErrorBoundary>
    <ZaraBootstrapRoot />
  </BootErrorBoundary>
);
