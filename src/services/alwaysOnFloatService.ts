// Far-Field (Side-of-Room), Lock-Screen & Background Minimized Voice Commander for Zara
// - Boosts & normalizes distant voices when phone is lying on the side (1–4 meters away)
// - Runs real-time AudioWorklet + MediaStreamDestination audio bridge so mobile OS keeps mic active on Lock Screen & Background
// - Zero self-triggering loops via 1750ms Acoustic Echo Shield + Single-Flight Mutex

import { audioService } from './audioService';
import {
  acquireMicrophoneStreamSafe,
  downsampleTo16kInt16,
  encodePcm16ChunksToWavBase64,
  normalizeQuietPcm16,
} from './voiceCaptureService';
import { Language } from '../types';
import { syncForegroundVoiceNotification } from './androidAssistantBridgeService';
import { matchWakeWordAndExtractCommand, webWakeWordGate } from './wakeWordService';

const FAR_FIELD_WORKLET_CODE = `
class ZaraFarFieldVadProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = new Float32Array(2048);
    this._idx = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const ch = input[0];
    for (let i = 0; i < ch.length; i++) {
      this._buf[this._idx++] = ch[i];
      if (this._idx >= this._buf.length) {
        this.port.postMessage(this._buf.slice(0));
        this._idx = 0;
      }
    }
    return true;
  }
}
registerProcessor('zara-farfield-vad', ZaraFarFieldVadProcessor);
`;

class ScreenOnOffKeepAliveManager {
  private wakeLock: any = null;
  private keepAliveTimer: number | null = null;
  private active = false;
  private onLockScreenAction: (() => void) | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.active) return;
        if (document.visibilityState === 'visible') {
          this.acquireWakeLock();
        }
        audioService.pokeBackgroundKeepAlive();
      });
    }
  }

  async enable(onTriggerFromLockScreen?: () => void): Promise<void> {
    this.active = true;
    if (onTriggerFromLockScreen) {
      this.onLockScreenAction = onTriggerFromLockScreen;
    }

    audioService.enableBackgroundAudioFocus(true);
    await this.acquireWakeLock();

    if (!this.keepAliveTimer && typeof window !== 'undefined') {
      this.keepAliveTimer = window.setInterval(() => {
        if (!this.active) return;
        audioService.pokeBackgroundKeepAlive();
        const ctx = audioService.getAudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }, 3200);
    }

    this.setupMediaSessionHandlers();
  }

  disable(): void {
    this.active = false;
    audioService.enableBackgroundAudioFocus(false);
    if (this.keepAliveTimer) {
      window.clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {}
      this.wakeLock = null;
    }
  }

  isEnabled(): boolean {
    return this.active;
  }

  private async acquireWakeLock(): Promise<void> {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as any;
    if (!nav.wakeLock?.request) return;
    try {
      this.wakeLock = await nav.wakeLock.request('screen');
    } catch {}
  }

  private setupMediaSessionHandlers(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      const ms = navigator.mediaSession;
      audioService.updateLockScreenMetadata(
        'Zara Voice Commander Active',
        'Listening on Side / Lock Screen / Background'
      );

      const resumeAll = () => {
        audioService.pokeBackgroundKeepAlive();
        this.onLockScreenAction?.();
      };

      const actions: MediaSessionAction[] = ['play', 'pause', 'previoustrack', 'nexttrack'];
      for (const act of actions) {
        try {
          ms.setActionHandler(act, resumeAll);
        } catch {}
      }
    } catch {}
  }
}

export const screenKeepAlive = new ScreenOnOffKeepAliveManager();

// ======================== FAR-FIELD, LOCK-SCREEN & BACKGROUND VOICE COMMANDER ========================

export interface AlwaysOnVoiceCallbacks {
  onStateChange: (active: boolean) => void;
  onInterimText: (text: string) => void;
  onCommandTranscript: (finalText: string) => Promise<void> | void;
  onAudioWavFallback: (audioBase64: string, mimeType?: string) => Promise<void>;
  onVolume?: (vol: number) => void;
  onPermissionError?: (msg: string) => void;
  onWakeWordTriggered?: (phrase: string) => void;
}

const NOISE_FILLER_REGEX =
  /^(hmm+|uh+|um+|ah+|oh+|mm+|huh|\.+|,|-|\?|!)+$/i;

export class AlwaysOnVoiceListener {
  private running = false;
  private paused = false;
  private startPromise: Promise<boolean> | null = null;
  private commandInFlight = false;
  private commandInFlightSince = 0;
  private language: Language = 'auto';
  private wakeWordOnlyMode = false;
  private customWakeWord = 'hey zara';

  private recognition: any = null;
  private speechRecActive = false;
  private lastSpeechRecActivityAt = 0;
  private restartTimer: number | null = null;
  private settleTimer: number | null = null;
  private healthTimer: number | null = null;
  private zeroTouchTimer: number | null = null;
  private zeroTouchRecorder: MediaRecorder | null = null;
  private pendingInterim = '';
  private accumulatedFinal = '';
  private lastFiredText = '';
  private lastFiredAt = 0;
  private unsubSpeaking: (() => void) | null = null;

  // Persistent Far-Field MediaStream + AudioWorklet + MediaStreamDestination Bridge (stays alive on Lock Screen & Minimized!)
  private vadStream: MediaStream | null = null;
  private vadCtx: AudioContext | null = null;
  private vadWorklet: AudioWorkletNode | null = null;
  private vadProcessor: ScriptProcessorNode | null = null;
  private vadBridgeAudio: HTMLAudioElement | null = null;
  private vadWorkletBlobUrl: string | null = null;

  private vadBusy = false;
  private noiseFloor = 1.4;
  private vadPreRoll: Int16Array[] = [];
  private vadChunks: Int16Array[] = [];
  private vadSpeaking = false;
  private vadFrames = 0;
  private vadPeakRms = 0;
  private vadLastVoice = 0;
  private vadStartAt = 0;
  private lastWorkletChunkAt = 0;
  private lastVolEmitAt = 0;

  private cb: AlwaysOnVoiceCallbacks;

  constructor(callbacks: AlwaysOnVoiceCallbacks, language: Language = 'auto') {
    this.cb = callbacks;
    this.language = language;

    // Immediately clear buffered audio whenever Zara starts or stops speaking (prevents acoustic echo loop!)
    this.unsubSpeaking = audioService.subscribeSpeaking(() => {
      this.pendingInterim = '';
      this.accumulatedFinal = '';
      this.vadChunks = [];
      this.vadSpeaking = false;
      this.vadFrames = 0;
      this.vadPeakRms = 0;
      if (this.settleTimer) {
        window.clearTimeout(this.settleTimer);
        this.settleTimer = null;
      }
      this.cb.onInterimText('');
    });

    if (typeof document !== 'undefined') {
      const wakeHandler = () => {
        if (!this.running || this.paused) return;
        this.resumeAudioPipelineIfSuspended();
      };

      document.addEventListener('visibilitychange', () => {
        if (!this.running || this.paused) return;

        if (document.visibilityState === 'hidden') {
          // Screen Locked or App Minimized -> pause Web SpeechRecognition (which Chrome kills in background)
          // while our AudioWorklet + Zero-Touch MediaRecorder + MediaStreamDestination continues listening seamlessly!
          this.stopRecognitionInstance();
          this.resumeAudioPipelineIfSuspended();
          this.ensureZeroTouchRecorderIfNeeded();
        } else {
          this.resumeAudioPipelineIfSuspended();
          if (!this.recognition) {
            this.scheduleRecognitionRestart(300);
          }
        }
      });

      if (typeof window !== 'undefined') {
        window.addEventListener('focus', wakeHandler);
        window.addEventListener('pageshow', wakeHandler);
        window.addEventListener('online', () => {
          if (!this.running || this.paused) return;
          this.resumeAudioPipelineIfSuspended();
          if (!this.speechRecActive) {
            this.scheduleRecognitionRestart(400);
          }
        });
      }
    }
  }

  private needsZeroTouchMediaRecorder(): boolean {
    const isHidden =
      typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (isHidden) {
      // On Lock Screen / Screen OFF: AudioContext callbacks can pause; record slices whenever worklet pauses
      return Date.now() - this.lastWorkletChunkAt > 650;
    }
    const workletFlowing =
      this.vadCtx?.state === 'running' && Date.now() - this.lastWorkletChunkAt <= 950;
    if (workletFlowing) return false;
    // Only let SpeechRecognition suppress ZeroTouch fallback if it recently produced live speech text
    const speechRecProducing =
      this.speechRecActive && Date.now() - this.lastSpeechRecActivityAt < 7000;
    return !speechRecProducing;
  }

  private async hasAudibleSpeechInBlob(blob: Blob): Promise<boolean> {
    if (typeof window === 'undefined') return true;
    try {
      const arrBuf = await blob.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return true;
      const decodeCtx: AudioContext = this.vadCtx || new AudioCtx();
      const audioBuf = await decodeCtx.decodeAudioData(arrBuf.slice(0));
      if (!this.vadCtx) {
        decodeCtx.close().catch(() => {});
      }
      const ch = audioBuf.getChannelData(0);
      let peak = 0;
      let activeSamples = 0;
      const stride = Math.max(1, Math.floor(ch.length / 4000));
      for (let i = 0; i < ch.length; i += stride) {
        const a = Math.abs(ch[i]);
        if (a > peak) peak = a;
        if (a >= 0.007) activeSamples++;
      }
      return peak >= 0.008 && activeSamples >= 6;
    } catch {
      // If mobile codec cannot be decoded locally, only forward slices larger than typical silence bitrate
      return blob.size >= 4500;
    }
  }

  private resumeAudioPipelineIfSuspended() {
    if (this.vadCtx && this.vadCtx.state === 'suspended') {
      this.vadCtx
        .resume()
        .then(() => {
          if (!this.needsZeroTouchMediaRecorder()) {
            this.stopZeroTouchRecorder();
          }
        })
        .catch(() => {});
    }
    if (this.vadBridgeAudio && this.vadBridgeAudio.paused) {
      this.vadBridgeAudio.play().catch(() => {});
    }
    audioService.pokeBackgroundKeepAlive();
  }

  // Zero-Touch & Lock-Screen Voice Capture: captures live microphone slices on Lock Screen / Screen OFF
  // or when AudioWorklet callbacks are throttled by mobile OS!
  private ensureZeroTouchRecorderIfNeeded() {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return;
    if (!this.running || this.paused || !this.vadStream) return;

    if (!this.needsZeroTouchMediaRecorder()) {
      this.stopZeroTouchRecorder();
      return;
    }

    if (this.zeroTouchTimer) return;

    const preferredMimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    const supportedMime =
      preferredMimes.find((m) => {
        try {
          return MediaRecorder.isTypeSupported(m);
        } catch {
          return false;
        }
      }) || '';

    const recordOneZeroTouchSlice = () => {
      if (!this.running || this.paused || !this.vadStream) {
        this.stopZeroTouchRecorder();
        return;
      }
      if (!this.needsZeroTouchMediaRecorder()) {
        this.stopZeroTouchRecorder();
        return;
      }
      if (this.commandInFlight || this.vadBusy || this.isInEchoShieldWindow()) {
        return;
      }
      const hasLiveTrack = this.vadStream
        .getAudioTracks()
        .some((t) => t.readyState === 'live' && t.enabled);
      if (!hasLiveTrack) return;

      try {
        const chunks: BlobPart[] = [];
        const rec = supportedMime
          ? new MediaRecorder(this.vadStream, { mimeType: supportedMime })
          : new MediaRecorder(this.vadStream);
        this.zeroTouchRecorder = rec;

        rec.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) chunks.push(ev.data);
        };

        rec.onstop = async () => {
          if (this.zeroTouchRecorder === rec) {
            this.zeroTouchRecorder = null;
          }
          if (!this.running || this.paused || this.commandInFlight || this.vadBusy) return;
          if (this.isInEchoShieldWindow()) return;

          const mime = rec.mimeType || supportedMime || 'audio/webm';
          const blob = new Blob(chunks, { type: mime });
          if (blob.size < 3200) return;

          const hasSpeech = await this.hasAudibleSpeechInBlob(blob);
          if (!hasSpeech) return;
          if (!this.running || this.paused || this.commandInFlight || this.vadBusy) return;
          if (this.isInEchoShieldWindow()) return;

          const reader = new FileReader();
          reader.onloadend = () => {
            const resStr = typeof reader.result === 'string' ? reader.result : '';
            const comma = resStr.indexOf(',');
            const b64 = comma >= 0 ? resStr.slice(comma + 1) : resStr;
            if (!b64 || this.commandInFlight || this.vadBusy || this.isInEchoShieldWindow()) return;

            this.vadBusy = true;
            this.commandInFlight = true;
            this.commandInFlightSince = Date.now();
            this.cb
              .onAudioWavFallback(b64, mime.split(';')[0] || 'audio/webm')
              .catch(() => {})
              .finally(() => {
                this.vadBusy = false;
                this.commandInFlight = false;
                this.commandInFlightSince = 0;
              });
          };
          reader.readAsDataURL(blob);
        };

        rec.start();
        window.setTimeout(() => {
          try {
            if (rec.state === 'recording') rec.stop();
          } catch {}
        }, 5000);
      } catch {}
    };

    recordOneZeroTouchSlice();
    this.zeroTouchTimer = window.setInterval(recordOneZeroTouchSlice, 5400);
  }

  private stopZeroTouchRecorder() {
    if (this.zeroTouchTimer) {
      window.clearInterval(this.zeroTouchTimer);
      this.zeroTouchTimer = null;
    }
    if (this.zeroTouchRecorder) {
      try {
        this.zeroTouchRecorder.ondataavailable = null;
        this.zeroTouchRecorder.onstop = null;
        if (this.zeroTouchRecorder.state === 'recording') {
          this.zeroTouchRecorder.stop();
        }
      } catch {}
      this.zeroTouchRecorder = null;
    }
  }

  private isInEchoShieldWindow(): boolean {
    if (audioService.getIsSpeaking()) return true;
    const elapsedSinceSpeak = Date.now() - audioService.getLastSpeakEndTime();
    return elapsedSinceSpeak < 700;
  }

  // Supports short Urdu/Hindi/Punjabi wake words ("زارا", "سنو", "جان", "ہاں", "بات", "جی", "suno", "zara") while filtering hums!
  private isMeaningfulHumanSpeech(raw: string): boolean {
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (!cleaned) return false;
    if (NOISE_FILLER_REGEX.test(cleaned)) return false;
    // Allow 2+ chars in Urdu/Arabic/Devanagari script or 2+ chars in Latin words
    const stripped = cleaned.replace(/[.,!?'"،؟\-]/g, '').trim();
    return stripped.length >= 2;
  }

  setLanguage(lang: Language) {
    if (this.language === lang) return;
    this.language = lang;
    if (this.running) {
      if (lang === 'auto' && typeof navigator !== 'undefined' && navigator.onLine !== false) {
        // In Universal Auto Multilingual mode online, let Hunter STT WAV capture handle Uzbek/Urdu/Hindi/Punjabi/Malay/Arabic seamlessly without Chrome single-locale distortion
        this.stopRecognitionInstance();
      } else if (this.recognition) {
        try {
          this.recognition.lang = this.resolveSpeechLocale(lang);
          this.recognition.stop();
        } catch {}
      } else {
        this.scheduleRecognitionRestart(250);
      }
    }
  }

  setWakeWordConfig(wakeWordOnlyMode: boolean, customWakeWord: string) {
    this.wakeWordOnlyMode = Boolean(wakeWordOnlyMode);
    this.customWakeWord = (customWakeWord || 'hey zara').trim().toLowerCase() || 'hey zara';
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) {
      this.pendingInterim = '';
      this.accumulatedFinal = '';
      this.vadChunks = [];
      this.vadSpeaking = false;
      this.stopRecognitionInstance();
      this.stopZeroTouchRecorder();
    } else if (this.running) {
      this.resumeAudioPipelineIfSuspended();
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        this.scheduleRecognitionRestart(300);
      } else {
        this.ensureZeroTouchRecorderIfNeeded();
      }
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  isPipelineHealthy(): boolean {
    if (!this.running || this.paused) return true;
    if (
      this.commandInFlight &&
      this.commandInFlightSince > 0 &&
      !audioService.getIsSpeaking() &&
      Date.now() - this.commandInFlightSince > 45000
    ) {
      return false;
    }
    const tracks = this.vadStream?.getAudioTracks() || [];
    const hasLiveTrack = tracks.some((t) => t.readyState === 'live' && t.enabled);
    return hasLiveTrack || this.speechRecActive;
  }

  async forceSelfHeal(): Promise<boolean> {
    if (!this.running || this.paused) return false;
    if (
      this.commandInFlight &&
      this.commandInFlightSince > 0 &&
      !audioService.getIsSpeaking() &&
      Date.now() - this.commandInFlightSince > 45000
    ) {
      this.commandInFlight = false;
      this.commandInFlightSince = 0;
      this.vadBusy = false;
    }
    this.resumeAudioPipelineIfSuspended();
    const ok = await this.startInternal();
    this.cb.onStateChange(ok);
    return ok;
  }

  private resolveSpeechLocale(lang: Language): string {
    if (lang === 'english') return 'en-US';
    if (lang === 'hindi') return 'hi-IN';
    if (lang === 'punjabi') return 'pa-IN';
    if (lang === 'uzbek') return 'uz-UZ';
    if (lang === 'malay') return 'ms-MY';
    if (lang === 'arabic') return 'ar-SA';
    return 'ur-PK';
  }

  async start(): Promise<boolean> {
    if (this.startPromise) {
      return this.startPromise;
    }

    const run = async (): Promise<boolean> => {
      if (this.running) {
        this.paused = false;
        this.resumeAudioPipelineIfSuspended();
        if (this.isPipelineHealthy()) {
          this.cb.onStateChange(true);
          return true;
        }
        const healed = await this.startInternal();
        if (!healed) {
          this.stop();
          return false;
        }
        this.startHealthWatchdog();
        syncForegroundVoiceNotification(true).catch(() => {});
        this.cb.onStateChange(true);
        return true;
      }

      this.running = true;
      this.paused = false;

      await screenKeepAlive.enable(() => {
        this.resumeAudioPipelineIfSuspended();
        if (
          this.running &&
          !this.paused &&
          !this.recognition &&
          typeof document !== 'undefined' &&
          document.visibilityState === 'visible'
        ) {
          this.scheduleRecognitionRestart(300);
        }
      });

      const ok = await this.startInternal();
      if (!ok) {
        this.running = false;
        this.paused = false;
        this.stopRecognitionInstance();
        this.stopVadHardware();
        screenKeepAlive.disable();
        syncForegroundVoiceNotification(false).catch(() => {});
        this.cb.onStateChange(false);
        return false;
      }

      this.startHealthWatchdog();
      syncForegroundVoiceNotification(true).catch(() => {});
      this.cb.onStateChange(true);
      return true;
    };

    this.startPromise = run().finally(() => {
      this.startPromise = null;
    });
    return this.startPromise;
  }

  private startHealthWatchdog() {
    if (this.healthTimer || typeof window === 'undefined') return;
    this.healthTimer = window.setInterval(() => {
      if (!this.running || this.paused) return;

      // Auto-clear stuck command mutex ONLY if Zara is NOT speaking and network hung > 28s
      if (
        this.commandInFlight &&
        this.commandInFlightSince > 0 &&
        !audioService.getIsSpeaking() &&
        Date.now() - this.commandInFlightSince > 28000
      ) {
        this.commandInFlight = false;
        this.commandInFlightSince = 0;
        this.vadBusy = false;
      }

      this.resumeAudioPipelineIfSuspended();

      // Re-acquire microphone automatically if OS briefly interrupted the track (e.g. incoming GSM ring)
      const tracks = this.vadStream?.getAudioTracks() || [];
      const hasLiveTrack = tracks.some((t) => t.readyState === 'live' && t.enabled);
      if (!hasLiveTrack && !this.vadBusy) {
        this.ensureWarmVadStream().then((ready) => {
          if (ready) {
            this.cb.onStateChange(true);
            this.ensureZeroTouchRecorderIfNeeded();
          }
        });
      } else {
        this.ensureZeroTouchRecorderIfNeeded();
      }
    }, 3500);
  }

  private shouldUseBrowserSpeechRec(): boolean {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return false;
    // When online, rely on our AudioWorklet 16kHz WAV capture -> server Whisper/Gemini STT so Android Chrome's webkitSpeechRecognition never steals or blocks the hardware mic stream!
    if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
      return false;
    }
    return true;
  }

  private async startInternal(): Promise<boolean> {
    if (!this.running || this.paused) return false;

    // 1. Always open Far-Field Boosted AudioWorklet VAD stream (powers Universal Multilingual STT, Side-of-Room, Lock Screen, AND Minimized Background!)
    const vadReady = await this.ensureWarmVadStream();
    if (vadReady && this.vadCtx && this.vadCtx.state === 'suspended') {
      await this.vadCtx.resume().catch(() => {});
    }

    // 2. Run fast Web SpeechRecognition when offline as local fallback
    const SpeechRec =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    let recStarted = false;
    if (SpeechRec && this.shouldUseBrowserSpeechRec()) {
      recStarted = this.startSpeechRecognitionEngine(SpeechRec);
    }

    // 3. If vadCtx is suspended on background/lock screen, enable Zero-Touch MediaRecorder fallback
    if (vadReady) {
      this.ensureZeroTouchRecorderIfNeeded();
    }

    return vadReady || recStarted;
  }

  private dispatchCommandLocked(raw: string) {
    let cleaned = (raw || '').replace(/\s+/g, ' ').trim();
    if (!this.isMeaningfulHumanSpeech(cleaned)) return;
    if (this.commandInFlight || this.isInEchoShieldWindow()) return;

    // Wake-Word Gate filtering when user turned ON "Wake-Word Activated" mode
    const wakeCheck = matchWakeWordAndExtractCommand(cleaned, this.customWakeWord);
    if (wakeCheck.matched) {
      webWakeWordGate.markAwake(22_000);
      this.cb.onWakeWordTriggered?.(wakeCheck.wakePhraseMatched);
      if (wakeCheck.remainingCommand) {
        cleaned = wakeCheck.remainingCommand;
      } else if (this.wakeWordOnlyMode) {
        // User spoke only wake word (e.g. "Hey Zara") -> wake window active, wait for their next sentence cleanly!
        this.cb.onInterimText(`Awake (${wakeCheck.wakePhraseMatched}) — Speak now...`);
        return;
      }
    } else if (this.wakeWordOnlyMode && !webWakeWordGate.isAwakeWindowActive()) {
      // Ignore background chatter in wake-word-only mode until wake phrase is spoken
      return;
    } else if (this.wakeWordOnlyMode) {
      webWakeWordGate.markAwake(22_000);
    }

    const now = Date.now();
    if (
      cleaned.toLowerCase() === this.lastFiredText.toLowerCase() &&
      now - this.lastFiredAt < 3200
    ) {
      return;
    }

    this.lastFiredText = cleaned;
    this.lastFiredAt = now;
    this.lastSpeechRecActivityAt = now;
    this.pendingInterim = '';
    this.accumulatedFinal = '';
    this.vadChunks = [];
    this.vadSpeaking = false;
    this.vadFrames = 0;
    this.cb.onInterimText('');

    this.commandInFlight = true;
    this.commandInFlightSince = now;
    Promise.resolve(this.cb.onCommandTranscript(cleaned))
      .catch(() => {})
      .finally(() => {
        this.commandInFlight = false;
        this.commandInFlightSince = 0;
      });
  }

  private startSpeechRecognitionEngine(SpeechRecCtor: any): boolean {
    this.stopRecognitionInstance();

    try {
      const rec = new SpeechRecCtor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = this.resolveSpeechLocale(this.language);

      rec.onstart = () => {
        this.speechRecActive = true;
      };

      rec.onresult = (event: any) => {
        if (!this.running || this.paused || this.commandInFlight || this.isInEchoShieldWindow()) {
          this.pendingInterim = '';
          this.accumulatedFinal = '';
          return;
        }

        this.lastSpeechRecActivityAt = Date.now();
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const txt = res?.[0]?.transcript || '';
          if (res.isFinal) {
            finalChunk += ` ${txt}`;
          } else {
            interimChunk += ` ${txt}`;
          }
        }

        if (this.settleTimer) {
          window.clearTimeout(this.settleTimer);
          this.settleTimer = null;
        }

        if (finalChunk.trim()) {
          this.accumulatedFinal = `${this.accumulatedFinal} ${finalChunk}`
            .replace(/\s+/g, ' ')
            .trim();
        }

        const cleanInterim = interimChunk.replace(/\s+/g, ' ').trim();
        this.pendingInterim = cleanInterim;

        const liveCombined = `${this.accumulatedFinal} ${cleanInterim}`
          .replace(/\s+/g, ' ')
          .trim();

        if (liveCombined && liveCombined.length >= 2) {
          this.cb.onInterimText(liveCombined);

          this.settleTimer = window.setTimeout(() => {
            if (!this.running || this.paused || this.commandInFlight || this.isInEchoShieldWindow()) {
              return;
            }
            const toFire = `${this.accumulatedFinal} ${this.pendingInterim}`
              .replace(/\s+/g, ' ')
              .trim();
            this.accumulatedFinal = '';
            this.pendingInterim = '';
            if (toFire) {
              this.dispatchCommandLocked(toFire);
            }
          }, 1750);
        }
      };

      rec.onerror = (evt: any) => {
        const errCode = String(evt?.error || '');
        this.speechRecActive = false;
        if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
          this.stopRecognitionInstance();
          if (!this.vadStream) {
            this.running = false;
            this.cb.onStateChange(false);
            this.cb.onPermissionError?.(
              'Allow Microphone permission once so Zara hears you on Side, Lock Screen & Background!'
            );
          }
          return;
        }
        if (errCode === 'network' || errCode === 'no-speech' || errCode === 'audio-capture' || errCode === 'aborted') {
          this.stopRecognitionInstance();
          this.ensureZeroTouchRecorderIfNeeded();
          this.scheduleRecognitionRestart(errCode === 'network' ? 2500 : 750);
        }
      };

      rec.onend = () => {
        this.speechRecActive = false;
        if (this.settleTimer) {
          window.clearTimeout(this.settleTimer);
          this.settleTimer = null;
        }
        const leftover = `${this.accumulatedFinal} ${this.pendingInterim}`
          .replace(/\s+/g, ' ')
          .trim();
        this.accumulatedFinal = '';
        this.pendingInterim = '';
        if (
          leftover &&
          this.running &&
          !this.paused &&
          !this.commandInFlight &&
          !this.isInEchoShieldWindow() &&
          this.isMeaningfulHumanSpeech(leftover)
        ) {
          this.dispatchCommandLocked(leftover);
        }
        if (
          this.running &&
          !this.paused &&
          typeof document !== 'undefined' &&
          document.visibilityState === 'visible'
        ) {
          this.scheduleRecognitionRestart(350);
        } else if (this.running && !this.paused) {
          this.ensureZeroTouchRecorderIfNeeded();
        }
      };

      this.recognition = rec;
      rec.start();
      return true;
    } catch {
      this.speechRecActive = false;
      return false;
    }
  }

  private scheduleRecognitionRestart(delayMs: number) {
    if (this.restartTimer) {
      window.clearTimeout(this.restartTimer);
    }
    this.restartTimer = window.setTimeout(() => {
      if (!this.running || this.paused) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const SpeechRec =
        typeof window !== 'undefined'
          ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
          : null;
      if (SpeechRec) {
        this.startSpeechRecognitionEngine(SpeechRec);
      }
    }, delayMs);
  }

  // Far-Field Pre-Amp + Real-Time AudioWorklet + MediaStreamDestination Lock-Screen/Background Bridge
  private async ensureWarmVadStream(): Promise<boolean> {
    const existingLive =
      this.vadStream &&
      this.vadStream.getAudioTracks().some((t) => t.readyState === 'live') &&
      this.vadCtx &&
      this.vadCtx.state !== 'closed';

    if (existingLive) {
      this.resumeAudioPipelineIfSuspended();
      return true;
    }

    this.stopVadHardware();
    try {
      const stream = await acquireMicrophoneStreamSafe();
      if (!this.running) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      this.vadStream = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
      this.vadCtx = ctx;

      const source = ctx.createMediaStreamSource(stream);

      // 1. Cut low-frequency fan/table rumble (< 85Hz)
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 85;

      // 2. Gentle vocal presence clarity boost (2.1kHz) without over-amplifying room hiss
      const presenceBoost = ctx.createBiquadFilter();
      presenceBoost.type = 'peaking';
      presenceBoost.frequency.value = 2100;
      presenceBoost.Q.value = 1.0;
      presenceBoost.gain.value = 3.0;

      // 3. Balanced pre-amp + gentle limiter so distant & soft voices capture cleanly without inflating noiseFloor
      const preAmp = ctx.createGain();
      preAmp.gain.value = 1.65;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 16;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.16;

      source.connect(highpass);
      highpass.connect(presenceBoost);
      presenceBoost.connect(preAmp);
      preAmp.connect(compressor);

      const inRate = ctx.sampleRate || 48000;

      const processFloatChunk = (ch: Float32Array) => {
        const chunkNow = Date.now();
        this.lastWorkletChunkAt = chunkNow;

        let sumSq = 0;
        for (let i = 0; i < ch.length; i++) sumSq += ch[i] * ch[i];
        const rms = Math.min(100, Math.round(Math.sqrt(sumSq / ch.length) * 380));

        if (chunkNow - this.lastVolEmitAt >= 120) {
          this.lastVolEmitAt = chunkNow;
          this.cb.onVolume?.(rms);
        }

        if (
          !this.running ||
          this.paused ||
          this.vadBusy ||
          this.commandInFlight ||
          this.isInEchoShieldWindow()
        ) {
          this.vadChunks = [];
          this.vadSpeaking = false;
          this.vadFrames = 0;
          this.vadPeakRms = 0;
          return;
        }

        // Smoothly track quiet room noise floor (strictly clamped 0.7..2.8 so soft & normal human speech always triggers!)
        if (!this.vadSpeaking && rms < this.noiseFloor + 2) {
          this.noiseFloor = Math.max(0.7, Math.min(2.8, this.noiseFloor * 0.94 + rms * 0.06));
        }

        // Box-averaged 16kHz Int16 downsampling (prevents aliasing & preserves phonetic clarity for Urdu/Hindi/English STT)
        const pcm16 = downsampleTo16kInt16(ch, inRate);

        const now = Date.now();
        const startThreshold = Math.max(2.0, Number((this.noiseFloor * 1.4).toFixed(1)));
        const sustainThreshold = Math.max(1.3, Number((this.noiseFloor * 1.05).toFixed(1)));
        const activeThreshold = this.vadSpeaking ? sustainThreshold : startThreshold;
        const isScreenHidden =
          typeof document !== 'undefined' &&
          (document.visibilityState === 'hidden' || !document.hasFocus?.());

        if (!this.vadSpeaking) {
          this.vadPreRoll.push(pcm16);
          if (this.vadPreRoll.length > 20) this.vadPreRoll.shift();
        } else {
          this.vadChunks.push(pcm16);
        }

        if (rms >= activeThreshold) {
          this.vadFrames++;
          this.vadLastVoice = now;
          if (rms > this.vadPeakRms) this.vadPeakRms = rms;

          // Instant onset on strong voice or 2 frames for gentle voice
          if (!this.vadSpeaking && (this.vadFrames >= 2 || rms >= startThreshold + 2.5)) {
            this.vadSpeaking = true;
            this.vadStartAt = now;
            this.vadChunks = [...this.vadPreRoll, pcm16];
            this.vadPreRoll = [];
            if (!isScreenHidden && !this.pendingInterim && !this.accumulatedFinal) {
              this.cb.onInterimText('🎤 Listening — speak naturally...');
            }
          }
        } else {
          this.vadFrames = Math.max(0, this.vadFrames - 1);
          if (
            this.vadSpeaking &&
            (now - this.vadLastVoice >= 1250 || now - this.vadStartAt >= 28000)
          ) {
            const recorded = this.vadChunks.slice();
            const durationMs = now - this.vadStartAt;
            const peak = this.vadPeakRms;

            this.vadChunks = [];
            this.vadSpeaking = false;
            this.vadFrames = 0;
            this.vadPeakRms = 0;

            if (recorded.length >= 4 && durationMs >= 260 && peak >= 3) {
              const dispatchWavIfNeeded = () => {
                if (!this.running || this.paused || this.vadBusy || this.commandInFlight) return;
                if (this.isInEchoShieldWindow()) return;
                if (Date.now() - this.lastFiredAt < 1700) return;

                if (!isScreenHidden) {
                  this.cb.onInterimText('📡 Sending voice to Zara...');
                }
                const normalized = normalizeQuietPcm16(recorded);
                const wav = encodePcm16ChunksToWavBase64(normalized, 16000);
                this.vadBusy = true;
                this.commandInFlight = true;
                this.commandInFlightSince = Date.now();
                this.cb
                  .onAudioWavFallback(wav, 'audio/wav')
                  .catch(() => {})
                  .finally(() => {
                    this.vadBusy = false;
                    this.commandInFlight = false;
                    this.commandInFlightSince = 0;
                    if (!this.pendingInterim && !this.accumulatedFinal) {
                      this.cb.onInterimText('');
                    }
                  });
              };

              if (
                isScreenHidden ||
                !this.speechRecActive ||
                Date.now() - this.lastSpeechRecActivityAt > 2500
              ) {
                dispatchWavIfNeeded();
              } else {
                window.setTimeout(dispatchWavIfNeeded, 380);
              }
            } else if (!this.pendingInterim && !this.accumulatedFinal) {
              this.cb.onInterimText('');
            }
          }
        }
      };

      const silentSink = ctx.createGain();
      silentSink.gain.value = 0;

      // Prefer real-time AudioWorkletNode (never throttled when app is minimized or screen is locked!)
      let workletAttached = false;
      if (ctx.audioWorklet && typeof Blob !== 'undefined') {
        try {
          const blob = new Blob([FAR_FIELD_WORKLET_CODE], { type: 'application/javascript' });
          this.vadWorkletBlobUrl = URL.createObjectURL(blob);
          await ctx.audioWorklet.addModule(this.vadWorkletBlobUrl);
          const wn = new AudioWorkletNode(ctx, 'zara-farfield-vad');
          wn.port.onmessage = (evt) => {
            if (evt.data instanceof Float32Array) {
              processFloatChunk(evt.data);
            }
          };
          compressor.connect(wn);
          wn.connect(silentSink);
          this.vadWorklet = wn;
          workletAttached = true;
        } catch {
          workletAttached = false;
        }
      }

      if (!workletAttached) {
        const proc = ctx.createScriptProcessor(2048, 1, 1);
        proc.onaudioprocess = (e) => {
          const ch = e.inputBuffer.getChannelData(0);
          processFloatChunk(new Float32Array(ch));
        };
        compressor.connect(proc);
        proc.connect(silentSink);
        this.vadProcessor = proc;
      }

      silentSink.connect(ctx.destination);

      // Anchor vadCtx to a live MediaStreamDestination <audio> element so Android/iOS keeps vadCtx awake on Lock Screen & Home Screen!
      if (typeof document !== 'undefined' && typeof ctx.createMediaStreamDestination === 'function') {
        try {
          const streamDest = ctx.createMediaStreamDestination();
          const subOsc = ctx.createOscillator();
          const subGain = ctx.createGain();
          subOsc.type = 'sine';
          subOsc.frequency.value = 24;
          subGain.gain.value = 0.001;
          subOsc.connect(subGain);
          subGain.connect(streamDest);
          silentSink.connect(streamDest);
          subOsc.start();

          const bridgeEl = document.createElement('audio');
          bridgeEl.setAttribute('playsinline', 'true');
          bridgeEl.setAttribute('webkit-playsinline', 'true');
          bridgeEl.srcObject = streamDest.stream;
          bridgeEl.volume = 0.02;
          bridgeEl.play().catch(() => {});
          this.vadBridgeAudio = bridgeEl;
        } catch {}
      }

      return true;
    } catch {
      this.cb.onPermissionError?.('Please tap Allow Microphone once so Zara hears you anytime.');
      return false;
    }
  }

  private stopRecognitionInstance() {
    this.speechRecActive = false;
    if (this.restartTimer) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.settleTimer) {
      window.clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.onresult = null;
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
  }

  private stopVadHardware() {
    this.stopZeroTouchRecorder();
    if (this.vadWorkletBlobUrl) {
      try {
        URL.revokeObjectURL(this.vadWorkletBlobUrl);
      } catch {}
      this.vadWorkletBlobUrl = null;
    }
    if (this.vadWorklet) {
      try {
        this.vadWorklet.port.onmessage = null;
        this.vadWorklet.disconnect();
      } catch {}
      this.vadWorklet = null;
    }
    if (this.vadProcessor) {
      try {
        this.vadProcessor.disconnect();
      } catch {}
      this.vadProcessor = null;
    }
    if (this.vadBridgeAudio) {
      try {
        this.vadBridgeAudio.pause();
        this.vadBridgeAudio.srcObject = null;
      } catch {}
      this.vadBridgeAudio = null;
    }
    if (this.vadCtx && this.vadCtx.state !== 'closed') {
      this.vadCtx.close().catch(() => {});
      this.vadCtx = null;
    }
    if (this.vadStream) {
      this.vadStream.getTracks().forEach((t) => t.stop());
      this.vadStream = null;
    }
  }

  stop() {
    this.running = false;
    this.paused = false;
    this.commandInFlight = false;
    this.pendingInterim = '';
    this.accumulatedFinal = '';
    if (this.healthTimer) {
      window.clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    this.stopRecognitionInstance();
    this.stopVadHardware();
    screenKeepAlive.disable();
    syncForegroundVoiceNotification(false).catch(() => {});
    this.cb.onInterimText('');
    this.cb.onVolume?.(0);
    this.cb.onStateChange(false);
  }

  dispose() {
    this.stop();
    this.unsubSpeaking?.();
    this.unsubSpeaking = null;
  }
}

// ======================== PICTURE-IN-PICTURE FLOATING OVERLAY MANAGER (WHEN SWITCHING APPS) ========================

class FloatingCirclePiPManager {
  private canvas: HTMLCanvasElement | null = null;
  private video: HTMLVideoElement | null = null;
  private animId: number | null = null;
  private isFloating = false;
  private state = {
    isListening: true,
    isSpeaking: false,
    micVol: 0,
    subtitle: 'Zara Active',
  };
  private listeners = new Set<(floating: boolean) => void>();

  subscribe(cb: (floating: boolean) => void): () => void {
    this.listeners.add(cb);
    cb(this.isFloating);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.isFloating));
  }

  updateVisualState(next: Partial<typeof this.state>) {
    this.state = { ...this.state, ...next };
  }

  isPiPActive(): boolean {
    return this.isFloating;
  }

  private ensureElements() {
    if (typeof document === 'undefined') return;
    if (!this.canvas) {
      const c = document.createElement('canvas');
      c.width = 240;
      c.height = 240;
      this.canvas = c;
    }
    if (!this.video && this.canvas) {
      const v = document.createElement('video');
      v.muted = true;
      v.autoplay = true;
      v.playsInline = true;
      v.setAttribute('playsinline', 'true');
      v.style.position = 'fixed';
      v.style.width = '1px';
      v.style.height = '1px';
      v.style.opacity = '0.01';
      v.style.pointerEvents = 'none';
      v.style.bottom = '0';
      v.style.right = '0';
      document.body.appendChild(v);

      const stream = (this.canvas as any).captureStream
        ? (this.canvas as any).captureStream(24)
        : null;
      if (stream) {
        v.srcObject = stream;
      }

      v.addEventListener('leavepictureinpicture', () => {
        this.isFloating = false;
        this.stopCanvasLoop();
        this.notify();
      });

      this.video = v;
    }
  }

  private startCanvasLoop() {
    if (this.animId) return;
    let phase = 0;

    const render = () => {
      if (!this.canvas) return;
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        phase += 0.06;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2 - 8;

        ctx.fillStyle = '#070415';
        ctx.fillRect(0, 0, w, h);

        const energy = this.state.isSpeaking ? 16 + Math.sin(phase * 2.4) * 10 : 6;

        const grad = ctx.createRadialGradient(cx, cy, 18, cx, cy, 70 + energy * 0.5);
        if (this.state.isSpeaking) {
          grad.addColorStop(0, 'rgba(244, 63, 94, 0.9)');
          grad.addColorStop(1, 'rgba(236, 72, 153, 0)');
        } else {
          grad.addColorStop(0, 'rgba(34, 211, 238, 0.85)');
          grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 70 + energy * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.state.isSpeaking ? '#f472b6' : '#22d3ee';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 46, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#0c0620';
        ctx.beginPath();
        ctx.arc(cx, cy, 42, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '800 19px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ZARA', cx, cy - 5);

        ctx.fillStyle = this.state.isSpeaking ? '#fbcfe8' : '#6ee7b7';
        ctx.font = '700 10px system-ui, sans-serif';
        ctx.fillText(
          this.state.isSpeaking ? 'SPEAKING' : this.state.isListening ? '24/7 VOICE ON' : 'PAUSED',
          cx,
          cy + 14
        );

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillText((this.state.subtitle || 'Zara Ready').slice(0, 26), cx, h - 18);
      }

      this.animId = window.requestAnimationFrame(render);
    };

    render();
  }

  private stopCanvasLoop() {
    if (this.animId) {
      window.cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  async toggleFloatingCircle(): Promise<{ ok: boolean; active: boolean; message?: string }> {
    if (typeof document === 'undefined') {
      return { ok: false, active: false };
    }

    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch {}
      this.isFloating = false;
      this.stopCanvasLoop();
      this.notify();
      return { ok: true, active: false };
    }

    this.ensureElements();
    this.startCanvasLoop();

    if (this.video) {
      try {
        await this.video.play().catch(() => {});
        if ((this.video as any).requestPictureInPicture) {
          await (this.video as any).requestPictureInPicture();
          this.isFloating = true;
          this.notify();
          return { ok: true, active: true };
        }
      } catch {}
    }

    this.stopCanvasLoop();
    return {
      ok: false,
      active: false,
      message: 'Open Zara directly in Chrome on mobile to float PiP over other apps.',
    };
  }
}

export const floatingCirclePiP = new FloatingCirclePiPManager();
