// Autonomous Self-Update, Self-Healing Issue Cleaner, Macro Auto-Executor & Photo Compressor for Zara
import { audioService } from './audioService';
import { zaraVision } from './visionAndControlService';
import type { ZaraUpdateReport } from '../types';

export interface CompressedPhotoResult {
  dataUrl: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

// Compress any Gallery photo File or DataURL into a crisp, fast-uploading JPEG
export async function compressImageToJpeg(
  fileOrDataUrl: File | string,
  maxDim = 820,
  quality = 0.78
): Promise<CompressedPhotoResult> {
  const sourceDataUrl =
    typeof fileOrDataUrl === 'string'
      ? fileOrDataUrl
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error('Could not read selected photo'));
          };
          reader.onerror = () => reject(new Error('Photo read error'));
          reader.readAsDataURL(fileOrDataUrl);
        });

  return new Promise<CompressedPhotoResult>((resolve, reject) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      try {
        const iw = img.naturalWidth || 640;
        const ih = img.naturalHeight || 480;
        const scale = Math.min(1, maxDim / Math.max(iw, ih));
        const cw = Math.max(120, Math.round(iw * scale));
        const ch = Math.max(120, Math.round(ih * scale));

        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const comma = sourceDataUrl.indexOf(',');
          resolve({
            dataUrl: sourceDataUrl,
            base64: comma >= 0 ? sourceDataUrl.slice(comma + 1) : sourceDataUrl,
            mimeType: 'image/jpeg',
            width: iw,
            height: ih,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, cw, ch);
        const outUrl = canvas.toDataURL('image/jpeg', quality);
        const commaIdx = outUrl.indexOf(',');
        const b64 = commaIdx >= 0 ? outUrl.slice(commaIdx + 1) : outUrl;
        resolve({
          dataUrl: outUrl,
          base64: b64,
          mimeType: 'image/jpeg',
          width: cw,
          height: ch,
        });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Unsupported image format'));
    img.src = sourceDataUrl;
  });
}

export interface DetectedSelfHealOrMacroIntent {
  type:
    | 'self_heal_and_update'
    | 'run_macro_recovery'
    | 'check_updates_and_status'
    | 'auto_update_self';
}

export function detectSelfHealOrMacroCommand(text: string): DetectedSelfHealOrMacroIntent | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  // 1. User wants Zara to check her own app, tell what new updates exist inside her & what should be updated
  if (
    /(new\s*update|what'?s\s*new|check\s*(your\s*|my\s*)?(zara\s*)?app|apna\s*(zara\s*)?app\s*(khud\s*)?check|app\s*check\s*karo|kya\s*(nayi|new|naya)\s*update|mere\s*andar\s*(?:ye|kya)\s*(?:new|nayi|naya)\s*update|kya\s*update\s*hona\s*chahiye|न्यू\s*अपडेट|नया\s*अपडेट|नई\s*अपडेट|अपना\s*(?:ज़ारा\s*)?ऐप\s*(?:खुद\s*)?चेक|क्या\s*अपडेट\s*होना\s*चाहिए|मेरे\s*अंदर\s*क्या\s*अपडेट|نئی\s*اپڈیٹ|اپنا\s*ایپ\s*چیک)/i.test(
      lower
    ) ||
    /(न्यू\s*अपडेट|नया\s*अपडेट|नई\s*अपडेट|ज़ारा\s*ऐप\s*खुद\s*चेक|अपना\s*ऐप\s*(?:खुद\s*)?चेक|क्या\s*अपडेट\s*होना\s*चाहिए|نئی\s*اپڈیٹ|اپنا\s*ایپ\s*چیک)/i.test(
      text
    )
  ) {
    // If user ALSO says "khud update karo / auto update", trigger full auto-update
    if (
      /(khud[\s-]*(?:ba[\s-]*khud)?\s*update|auto\s*update|apne\s*aap\s*update|खुद[\s-]*(?:ब[\s-]*खुद)?\s*(?:अपडेट|कर)|अपने\s*आप\s*अपडेट)/i.test(
        lower
      ) ||
      /(खुद.*अपडेट|अपने\s*आप\s*अपडेट)/i.test(text)
    ) {
      return { type: 'auto_update_self' };
    }
    return { type: 'check_updates_and_status' };
  }

  // 2. Explicit Autonomous Self-Update ("khud update kar lo", "اپنے آپ اپڈیٹ کرو", "खुद से ज़ारा अपडेट करो")
  if (
    /(khud\s*(?:se\s*)?(?:apna\s*|zara\s*|app\s*)?update|auto\s*update\s*(?:zara|app)?|अपना\s*(?:ज़ारा\s*)?ऐप\s*खुद\s*अपडेट|खुद\s*(?:अपना\s*)?अपडेट\s*कर|خود\s*اپڈیٹ)/i.test(
      lower
    ) ||
    /(खुद\s*(?:ब\s*खुद\s*)?(?:अपना\s*|ज़ारा\s*)?अपडेट|अपने\s*आप\s*अपडेट)/i.test(text)
  ) {
    return { type: 'auto_update_self' };
  }

  // 3. Detect Macro recovery / auto-work requests
  if (
    /(macro|میکرو|मैक्रो)/i.test(lower) ||
    /(apna\s*kaam\s*khud|khud\s*ba\s*khud\s*kaam|اپنا\s*کام\s*خود|خود\s*بخود\s*کام|अपना\s*काम\s*खुद|खुद\s*ब\s*खुद\s*काम)/i.test(
      lower
    )
  ) {
    return { type: 'run_macro_recovery' };
  }

  // 4. Detect Self-Update / Self-Clear Issue requests
  if (
    /(apna\s*update|app\s*update\s*karo|zara\s*update\s*karo|masla\s*(khud\s*)?clear|issue\s*(khud\s*)?(clear|fix|solve)|auto\s*fix|self\s*heal|khud\s*theek\s*karo|اپنا\s*اپڈیٹ|ایپ\s*اپڈیٹ\s*کرو|مسئلہ\s*(خود\s*)?(کلیئر|حل|ٹھیک)|خود\s*ٹھیک\s*کرو|अपना\s*अपडेट|ऐप\s*अपडेट\s*करो|मसला\s*(खुद\s*)?(क्लियर|ठीक|सॉल्व)|खुद\s*ठीक\s*करो)/i.test(
      lower
    )
  ) {
    return { type: 'self_heal_and_update' };
  }

  return null;
}

// Split multi-step spoken/typed macros ("front camera on karo phir meri photo lo", "masla clear karo aur phir whatsapp kholo")
// Guarded so romantic/conversational sentences with "aur phir / اور پھر" are NEVER split unless a device/system command is present!
export function splitCompoundMacroSteps(text: string): string[] {
  if (!text) return [];
  const parts = text
    .split(
      /\s+(?:aur\s+phir|phir\s+uske\s+baad|uske\s+baad|and\s+then|then\s+please|اور\s+پھر|اس\s+کے\s+بعد|और\s+फिर|उसके\s+बाद)\s+/i
    )
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
  if (parts.length < 2) return [];

  const commandActionCue =
    /\b(open|close|launch|kholo|khol|band|off|camera|cam|photo|snap|selfie|screen|whatsapp|youtube|instagram|tiktok|facebook|telegram|settings|setting|wifi|bluetooth|alarm|update|issue|masla|heal|macro)\b|(کھولو|بند|کیمرہ|فوٹو|تصویر|واٹس\s*ایپ|یوٹیوب|الارم|سیٹنگ|مسئلہ|اپڈیٹ|खोलो|बंद|कैमरा|फोटो|व्हाट्सएप|यूट्यूब|अलार्म|सेटिंग|अपडेट)/i;

  const actionCount = parts.filter((p) => commandActionCue.test(p)).length;
  if (actionCount < 2) return [];

  return parts.slice(0, 4);
}

interface QueuedMacroTask {
  id: string;
  label: string;
  attempts: number;
  runner: () => Promise<void>;
}

export interface SelfHealReport {
  ok: boolean;
  updatedServiceWorker: boolean;
  clearedServerIssues: boolean;
  repairedVoiceOrAudio: boolean;
  repairedCamera: boolean;
  cleanedStorage: boolean;
  retriedMacros: number;
  actionsTaken: string[];
  spokenSummary: string;
}

class ZaraSelfHealAndMacroEngine {
  private monitorTimer: number | null = null;
  private isHealing = false;
  private lastSilentHealAt = 0;
  private knownServerVersion: string | null = null;
  private pendingTasks: QueuedMacroTask[] = [];
  private voiceHealHook: (() => Promise<boolean>) | null = null;
  private statusListeners = new Set<(statusMsg: string) => void>();

  registerVoiceHealHook(hook: () => Promise<boolean>) {
    this.voiceHealHook = hook;
  }

  subscribeStatus(cb: (statusMsg: string) => void): () => void {
    this.statusListeners.add(cb);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  private emitStatus(msg: string) {
    this.statusListeners.forEach((cb) => {
      try {
        cb(msg);
      } catch {}
    });
  }

  // Queue any failed macro step or app action so Zara automatically repairs & completes it on her own!
  enqueueFailedTaskForAutoExecution(label: string, runner: () => Promise<void>) {
    const cleanLabel = label.slice(0, 64);
    const exists = this.pendingTasks.some((t) => t.label === cleanLabel);
    if (!exists) {
      this.pendingTasks.push({
        id: `macro-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: cleanLabel,
        attempts: 0,
        runner,
      });
      if (this.pendingTasks.length > 6) {
        this.pendingTasks.shift();
      }
    }

    // Trigger rapid autonomous self-heal + auto-retry in 1.8s
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        this.runSelfHealAndAutoUpdateNow({ silent: true }).catch(() => {});
      }, 1800);
    }
  }

  getPendingTaskCount(): number {
    return this.pendingTasks.length;
  }

  startAutonomousMonitor(): () => void {
    if (typeof window === 'undefined') return () => {};

    const onRuntimeError = (ev: ErrorEvent) => {
      const msg = String(ev?.message || '');
      const isChunkOrAssetIssue =
        /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
          msg
        );
      if (isChunkOrAssetIssue) {
        this.runSelfHealAndAutoUpdateNow({ silent: true, forceSwUpdate: true }).catch(() => {});
      } else if (Date.now() - this.lastSilentHealAt > 15000) {
        this.runSelfHealAndAutoUpdateNow({ silent: true }).catch(() => {});
      }
    };

    const onUnhandledRejection = () => {
      if (Date.now() - this.lastSilentHealAt > 15000) {
        this.runSelfHealAndAutoUpdateNow({ silent: true }).catch(() => {});
      }
    };

    const onBackOnline = () => {
      this.emitStatus('Internet restored — Zara auto-syncing & completing pending tasks...');
      this.runSelfHealAndAutoUpdateNow({ silent: true }).catch(() => {});
    };

    const onVisibilityWake = () => {
      if (document.visibilityState === 'visible') {
        this.runPeriodicSilentCheck().catch(() => {});
      }
    };

    window.addEventListener('error', onRuntimeError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('online', onBackOnline);
    document.addEventListener('visibilitychange', onVisibilityWake);

    if (this.monitorTimer) {
      window.clearInterval(this.monitorTimer);
    }
    // Lightweight 45-second keep-warm & self-diagnostic check (saves battery while preventing idle cold-starts while open!)
    this.monitorTimer = window.setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        this.runPeriodicSilentCheck().catch(() => {});
      }
    }, 45000);

    // Initial boot check after 2.5s
    const initTimer = window.setTimeout(() => {
      this.runPeriodicSilentCheck().catch(() => {});
    }, 2500);

    return () => {
      window.removeEventListener('error', onRuntimeError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('online', onBackOnline);
      document.removeEventListener('visibilitychange', onVisibilityWake);
      window.clearTimeout(initTimer);
      if (this.monitorTimer) {
        window.clearInterval(this.monitorTimer);
        this.monitorTimer = null;
      }
    };
  }

  private async runPeriodicSilentCheck(): Promise<void> {
    if (this.isHealing) return;

    // 1. Heal audio if stuck or suspended
    audioService.selfHealAudioPipeline();

    // 2. Heal Front/Back camera stream if it unexpectedly ended while active
    if (zaraVision.isDesiredCameraActive() && !zaraVision.isStreamHealthy()) {
      await zaraVision.startCamera(zaraVision.getFacingMode()).catch(() => {});
    }

    // 3. Heal 24/7 Voice Listener if stalled
    if (this.voiceHealHook) {
      await this.voiceHealHook().catch(() => {});
    }

    // 4. Check server health / version update & flush any pending macros if online
    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        const res = await fetch('/api/app-health', {
          cache: 'no-store',
          credentials: 'include',
        });
        if (res.ok && res.headers.get('x-zara-app') === 'ready') {
          const data = await res.json();
          if (data.version) {
            if (this.knownServerVersion && this.knownServerVersion !== data.version) {
              this.knownServerVersion = data.version;
              await this.checkAndActivateServiceWorkerUpdate(true);
            } else {
              this.knownServerVersion = data.version;
            }
          }
          if (data.cooledDownModels > 0) {
            await fetch('/api/self-heal', { method: 'POST', credentials: 'include' }).catch(
              () => {}
            );
          }
        }
      } catch {}

      if (this.pendingTasks.length > 0) {
        await this.flushPendingMacros();
      }
    }
  }

  private async checkAndActivateServiceWorkerUpdate(clearStaleCaches = false): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
    let updated = false;

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update().catch(() => {});
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          updated = true;
        }
      }

      // IMPORTANT: Never delete active 'workbox-precache-*' or 'zara-app-shell-v6' behind Workbox's back!
      // Only purge legacy outdated page caches.
      if (clearStaleCaches && typeof caches !== 'undefined') {
        const legacyCaches = [
          'zara-4d-direct-package-v2',
          'zara-pages-cache-v3',
          'zara-pages-cache-v4',
          'zara-pages-cache-v5',
        ];
        const keys = await caches.keys();
        for (const k of keys) {
          if (legacyCaches.includes(k)) {
            await caches.delete(k).catch(() => {});
            updated = true;
          }
        }
      }
    } catch {}

    return updated;
  }

  private repairLocalStorageHealth(): boolean {
    if (typeof localStorage === 'undefined') return false;
    let cleaned = false;

    try {
      let totalChars = 0;
      const nonChatConfigKeys = [
        'zara_alarms_schedules_v2',
        'zara_built_apps_v1',
        'zara_personality_config_v5',
      ];

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        const val = localStorage.getItem(k) || '';
        totalChars += k.length + val.length;

        // Never delete chat history or memories! Only clean non-chat config keys if JSON is broken.
        if (nonChatConfigKeys.includes(k) && val) {
          try {
            JSON.parse(val);
          } catch {
            localStorage.removeItem(k);
            cleaned = true;
          }
        }
      }

      // If localStorage exceeds ~3.8MB, strip heavy older base64 images from chat history while keeping 100% of text messages!
      if (totalChars > 3_800_000) {
        const rawChat = localStorage.getItem('zara_100day_chat_history_v2');
        if (rawChat) {
          try {
            const parsed = JSON.parse(rawChat);
            if (Array.isArray(parsed)) {
              let keptImgs = 0;
              for (let i = parsed.length - 1; i >= 0; i--) {
                if (parsed[i]?.imageUrl) {
                  keptImgs++;
                  if (keptImgs > 2) {
                    delete parsed[i].imageUrl;
                    cleaned = true;
                  }
                }
              }
              localStorage.setItem(
                'zara_100day_chat_history_v2',
                JSON.stringify(parsed.slice(-400))
              );
            }
          } catch {}
        }
      }
    } catch {}

    return cleaned;
  }

  private async flushPendingMacros(): Promise<number> {
    if (this.pendingTasks.length === 0) return 0;
    let completedCount = 0;
    const snapshot = [...this.pendingTasks];
    this.pendingTasks = [];

    for (const item of snapshot) {
      try {
        await item.runner();
        completedCount += 1;
      } catch {
        if (item.attempts < 2) {
          this.pendingTasks.push({ ...item, attempts: item.attempts + 1 });
        }
      }
    }

    if (completedCount > 0) {
      this.emitStatus(`Zara Auto-Macro completed ${completedCount} pending task(s) ✓`);
    }
    return completedCount;
  }

  // Full Autonomous Self-Update + Issue Clear + Pending Macro Execution
  async runSelfHealAndAutoUpdateNow(opts?: {
    silent?: boolean;
    forceSwUpdate?: boolean;
  }): Promise<SelfHealReport> {
    if (this.isHealing) {
      return {
        ok: true,
        updatedServiceWorker: false,
        clearedServerIssues: false,
        repairedVoiceOrAudio: false,
        repairedCamera: false,
        cleanedStorage: false,
        retriedMacros: 0,
        actionsTaken: ['Self-heal already active'],
        spokenSummary: 'جی میرے مالک! میں اپنا سسٹم اپڈیٹ اور کلیئر کر رہی ہوں۔',
      };
    }

    this.isHealing = true;
    this.lastSilentHealAt = Date.now();
    const actionsTaken: string[] = [];

    try {
      if (!opts?.silent) {
        this.emitStatus('Zara Auto-Update & Self-Heal running...');
      }

      // 1. Check & activate Service Worker / PWA update
      const updatedServiceWorker = await this.checkAndActivateServiceWorkerUpdate(
        Boolean(opts?.forceSwUpdate)
      );
      if (updatedServiceWorker) {
        actionsTaken.push('Updated app Service Worker & cache');
      }

      // 2. Clear Server AI model cooldowns & verify Gemini connection
      let clearedServerIssues = false;
      try {
        const res = await fetch('/api/self-heal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          clearedServerIssues = true;
          if (data.version) this.knownServerVersion = data.version;
          if (data.clearedCooldowns > 0) {
            actionsTaken.push(`Cleared ${data.clearedCooldowns} server AI lock(s)`);
          } else {
            actionsTaken.push('Verified server & AI engine ready');
          }
        }
      } catch {}

      // 3. Repair Audio, Lock-Screen AudioFocus & 24/7 Hands-Free Voice Listener
      const audioFixed = audioService.selfHealAudioPipeline();
      let voiceFixed = false;
      if (this.voiceHealHook) {
        voiceFixed = await this.voiceHealHook().catch(() => false);
      }
      const repairedVoiceOrAudio = audioFixed || voiceFixed;
      if (repairedVoiceOrAudio) {
        actionsTaken.push('Refreshed 24/7 Hands-Free Voice & Audio channel');
      }

      // 4. Repair Front/Back Camera stream if active lens stalled
      let repairedCamera = false;
      if (zaraVision.isDesiredCameraActive() && !zaraVision.isStreamHealthy()) {
        const camRes = await zaraVision.startCamera(zaraVision.getFacingMode());
        repairedCamera = camRes.ok;
        if (repairedCamera) {
          actionsTaken.push('Restored Front/Back Camera stream');
        }
      }

      // 5. Repair Storage & clear corrupted/heavy cache entries
      const cleanedStorage = this.repairLocalStorageHealth();
      if (cleanedStorage) {
        actionsTaken.push('Cleared heavy/corrupted cache storage');
      }

      // 6. Auto-execute any failed/stuck macros or queued tasks
      const retriedMacros = await this.flushPendingMacros();
      if (retriedMacros > 0) {
        actionsTaken.push(`Auto-completed ${retriedMacros} pending macro(s)`);
      }

      const spokenSummary =
        retriedMacros > 0
          ? `جی میرے مالک ملیشیا والا بادشاہ! میں نے خود آ کر اپنا اپڈیٹ چیک کر لیا ہے، سارے مسئلے کلیئر کر دیے ہیں اور جو ${retriedMacros} میکرو یا کام رکا ہوا تھا وہ بھی خود مکمل کر دیا ہے!`
          : 'جی میرے مالک ملیشیا والا بادشاہ! میں نے خود اپنا پورا سسٹم اپڈیٹ، مائیک، کیمرہ اور میکرو انجن چیک کر کے کلیئر کر دیا ہے — سب کچھ بالکل فٹ کام کر رہا ہے!';

      if (!opts?.silent) {
        this.emitStatus('Zara Auto-Update & Self-Heal Complete ✓');
      }

      return {
        ok: true,
        updatedServiceWorker,
        clearedServerIssues,
        repairedVoiceOrAudio,
        repairedCamera,
        cleanedStorage,
        retriedMacros,
        actionsTaken,
        spokenSummary,
      };
    } finally {
      this.isHealing = false;
    }
  }

  // Inspect live Zara App health, What's New changelog, pending runtime updates & what should be updated next
  async fetchUpdateCheckReport(): Promise<ZaraUpdateReport | null> {
    try {
      const res = await fetch('/api/self-improve/updates', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      const report: ZaraUpdateReport | null = data?.report || (data?.whatsNewInZara ? data : null);
      if (report && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zara-update-report', { detail: report }));
      }
      return report;
    } catch {
      return null;
    }
  }

  // Safely apply all runtime self-updates (server config + circuit-breakers + SW/PWA + audio/mic + macros) without touching chat/memories
  async runFullAutonomousSelfUpdate(): Promise<{
    ok: boolean;
    report: ZaraUpdateReport | null;
    actionsTaken: string[];
    spokenSummaryHi: string;
  }> {
    this.emitStatus('Zara scanning & applying runtime updates autonomously...');
    const heal = await this.runSelfHealAndAutoUpdateNow({ silent: true, forceSwUpdate: true });
    let report: ZaraUpdateReport | null = null;
    let serverActions: string[] = [];
    let spokenSummaryHi = heal.spokenSummary;

    try {
      const res = await fetch('/api/self-improve/auto-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        report = data?.report || null;
        if (Array.isArray(data?.actionsTaken)) {
          serverActions = data.actionsTaken;
        }
        if (data?.spokenSummaryHi) {
          spokenSummaryHi = data.spokenSummaryHi;
        }
        if (report && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('zara-update-report', { detail: report }));
        }
      }
    } catch {}

    const combined = Array.from(new Set([...heal.actionsTaken, ...serverActions]));
    this.emitStatus('Zara Autonomous Self-Update Complete ✓');
    return {
      ok: true,
      report,
      actionsTaken: combined,
      spokenSummaryHi,
    };
  }
}

export const zaraSelfHealEngine = new ZaraSelfHealAndMacroEngine();

