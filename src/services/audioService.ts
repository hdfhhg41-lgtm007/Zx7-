// Mobile-Unlocked Neural Voice Engine, Continuous Lock-Screen / Background Audio Channel & Zero-GC Lip-Sync Analyzer for Zara

import { fetchWithContainerWakeup } from './chatVaultPersistence';
import { getOwnerAuthHeaders, getOwnerAuthSnapshot } from './ownerAuthService';
import { getVoiceGenderFromName, TtsEngineId, ZaraEmotionMode } from '../types';

type SpeakingListener = (isSpeaking: boolean) => void;

export interface VoiceNoticeEvent {
  available: boolean;
  message: string;
  lang?: string;
}
type VoiceNoticeListener = (event: VoiceNoticeEvent) => void;

// Build a 2.5-second sub-audible RIFF WAV carrier so Android/iOS never revokes Lock-Screen & Background AudioFocus
function buildSilentKeepAliveWavUri(): string {
  const sampleRate = 8000;
  const numSamples = 20000; // 2.5s loop
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const val = Math.round(Math.sin((i / sampleRate) * Math.PI * 2 * 24) * 2);
    view.setInt16(44 + i * 2, val, true);
  }

  const bytes = new Uint8Array(buffer);
  const parts: string[] = [];
  const step = 0x2000;
  for (let i = 0; i < bytes.length; i += step) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + step)));
  }
  return `data:audio/wav;base64,${window.btoa(parts.join(''))}`;
}

class AudioManager {
  private audioCtx: AudioContext | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private timeDomainData = new Uint8Array(256);
  private freqDomainData = new Uint8Array(128);

  private currentSource: AudioBufferSourceNode | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  // Persistent Lock-Screen & Background HTMLAudioElement that holds continuous OS AudioFocus
  private bgSafeAudio: HTMLAudioElement | null = null;
  private bgSafeBlobUrl: string | null = null;
  private keepAliveWavUri: string | null = null;
  private keepAliveHoldEnabled = false;
  private isPlayingReplyOnBgChannel = false;

  private liveSources = new Set<AudioBufferSourceNode>();
  private livePendingChunks: Float32Array[] = [];
  private livePendingSamples = 0;
  private liveFlushTimer: number | null = null;
  private liveStreamStarted = false;
  private nextLiveStartTime = 0;

  private safetyTimer: number | null = null;
  private isSpeaking = false;
  private speakStartTime = 0;
  private lastSpeakEndTime = 0;
  private isUnlocked = false;
  private activePlaybackId = 0;
  private preferredTtsEngine: TtsEngineId = 'hunter_tts_ultra_premium';
  private ttsMemoryCache = new Map<string, string>();
  private listeners = new Set<SpeakingListener>();

  setPreferredTtsEngine(engine: TtsEngineId) {
    this.preferredTtsEngine = engine;
  }

  getPreferredTtsEngine(): TtsEngineId {
    return this.preferredTtsEngine;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockEvents = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'];
      const handleUserGesture = () => {
        this.unlock();
      };
      unlockEvents.forEach((evt) => {
        window.addEventListener(evt, handleUserGesture, { passive: true });
      });

      const handleAutoWake = () => {
        if (!this.isUnlocked) {
          this.tryAutoUnlockForInstalledPWA();
        } else {
          this.pokeBackgroundKeepAlive();
        }
      };
      window.addEventListener('focus', handleAutoWake);
      window.addEventListener('pageshow', handleAutoWake);

      // Attempt immediate auto-unlock on launch (succeeds automatically in installed Android PWAs / WebAPKs!)
      window.setTimeout(() => {
        this.tryAutoUnlockForInstalledPWA();
      }, 250);
    }
  }

  subscribeSpeaking(fn: SpeakingListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private voiceNoticeListeners = new Set<VoiceNoticeListener>();

  subscribeVoiceNotice(fn: VoiceNoticeListener): () => void {
    this.voiceNoticeListeners.add(fn);
    return () => {
      this.voiceNoticeListeners.delete(fn);
    };
  }

  notifyVoiceNotice(event: VoiceNoticeEvent) {
    this.voiceNoticeListeners.forEach((fn) => {
      try {
        fn(event);
      } catch {}
    });
  }

  public ensureSpeakerAudioRoute() {
    this.ensureNativeSpeakerRoute();
    try {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch {}
  }

  private ensureNativeSpeakerRoute() {
    try {
      (window as any)?.ZaraAndroidBridge?.ensureSpeakerAudioRoute?.();
    } catch {}
  }

  private setSpeakingState(val: boolean) {
    if (this.isSpeaking !== val) {
      if (!this.isSpeaking && val) {
        this.speakStartTime = Date.now();
      } else if (this.isSpeaking && !val) {
        this.lastSpeakEndTime = Date.now();
        this.speakStartTime = 0;
      }
      this.isSpeaking = val;
      this.listeners.forEach((fn) => {
        try {
          fn(val);
        } catch {}
      });
    }
  }

  // Autonomous Audio Self-Heal: clears stuck speaking state (>180s), resumes suspended AudioContext, and restores Lock-Screen AudioFocus
  selfHealAudioPipeline(): boolean {
    let repaired = false;
    if (this.isSpeaking && this.speakStartTime > 0 && Date.now() - this.speakStartTime > 180000) {
      this.stopAudio();
      repaired = true;
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
      repaired = true;
    }
    if (this.keepAliveHoldEnabled && !this.isPlayingReplyOnBgChannel) {
      const el = this.ensureBgSafeAudioElement();
      if (el && el.paused) {
        this.restoreSilentKeepAliveLoop();
        repaired = true;
      }
    }
    return repaired;
  }

  getLastSpeakEndTime(): number {
    return this.isSpeaking ? Date.now() : this.lastSpeakEndTime;
  }

  getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.masterAnalyser = null;
      this.masterLimiter = null;
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private getAnalyser(): AnalyserNode {
    const ctx = this.getAudioContext();
    if (!this.masterAnalyser) {
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 20;
      limiter.ratio.value = 2.2;
      limiter.attack.value = 0.008;
      limiter.release.value = 0.25;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.55;

      limiter.connect(analyser);
      analyser.connect(ctx.destination);
      this.masterLimiter = limiter;
      this.masterAnalyser = analyser;
      this.timeDomainData = new Uint8Array(analyser.fftSize);
      this.freqDomainData = new Uint8Array(analyser.frequencyBinCount);
    }
    return this.masterAnalyser;
  }

  private getMasterInputNode(): AudioNode {
    this.getAnalyser();
    return this.masterLimiter || this.masterAnalyser!;
  }

  private applySmoothEdgeRamps(buffer: AudioBuffer, fadeSec = 0.005): void {
    const fadeSamples = Math.min(
      Math.floor(buffer.sampleRate * fadeSec),
      Math.floor(buffer.length / 4)
    );
    if (fadeSamples <= 1) return;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < fadeSamples; i++) {
        const ramp = 0.5 - 0.5 * Math.cos((Math.PI * i) / fadeSamples);
        data[i] *= ramp;
        const tailIdx = data.length - 1 - i;
        data[tailIdx] *= ramp;
      }
    }
  }

  private getKeepAliveUri(): string {
    if (!this.keepAliveWavUri && typeof window !== 'undefined') {
      this.keepAliveWavUri = buildSilentKeepAliveWavUri();
    }
    return (
      this.keepAliveWavUri ||
      'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
    );
  }

  private ensureBgSafeAudioElement(): HTMLAudioElement | null {
    if (typeof document === 'undefined') return null;
    if (!this.bgSafeAudio) {
      const el = document.createElement('audio');
      el.preload = 'auto';
      el.setAttribute('playsinline', 'true');
      el.setAttribute('webkit-playsinline', 'true');
      this.bgSafeAudio = el;
    }
    return this.bgSafeAudio;
  }

  // Keep OS MediaSession & AudioFocus alive continuously when Voice Commander is ON
  enableBackgroundAudioFocus(enable: boolean) {
    this.keepAliveHoldEnabled = enable;
    const el = this.ensureBgSafeAudioElement();
    if (!el) return;

    if (enable) {
      if (!this.isPlayingReplyOnBgChannel) {
        this.restoreSilentKeepAliveLoop();
      }
    } else if (!this.isPlayingReplyOnBgChannel) {
      try {
        el.pause();
      } catch {}
    }
  }

  pokeBackgroundKeepAlive() {
    if (!this.keepAliveHoldEnabled || this.isPlayingReplyOnBgChannel) return;
    const el = this.ensureBgSafeAudioElement();
    if (el && el.paused) {
      this.restoreSilentKeepAliveLoop();
    }
  }

  private restoreSilentKeepAliveLoop() {
    const el = this.ensureBgSafeAudioElement();
    if (!el || this.isPlayingReplyOnBgChannel) return;
    if (!this.keepAliveHoldEnabled) {
      try {
        el.pause();
      } catch {}
      return;
    }
    try {
      el.onended = null;
      el.onerror = null;
      el.loop = true;
      el.playbackRate = 1.0;
      el.volume = 0.015;
      const uri = this.getKeepAliveUri();
      if (el.src !== uri) {
        el.src = uri;
      }
      el.play().catch(() => {});
      this.updateLockScreenMetadata('Zara Voice Commander Active', 'Listening on Side / Lock Screen / Background');
    } catch {}
  }

  updateLockScreenMetadata(title: string, subtitle?: string) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      const ms = navigator.mediaSession;
      if (typeof MediaMetadata !== 'undefined') {
        ms.metadata = new MediaMetadata({
          title: title.slice(0, 90),
          artist: subtitle ? subtitle.slice(0, 90) : 'Zara AI · Background Voice',
          album: 'Zara Voice Companion',
          artwork: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        });
      }
      ms.playbackState = 'playing';
    } catch {}
  }

  private tryAutoUnlockForInstalledPWA() {
    try {
      const el = this.ensureBgSafeAudioElement();
      if (el && !this.isPlayingReplyOnBgChannel) {
        el.loop = true;
        el.volume = 0.015;
        el.src = this.getKeepAliveUri();
        el.play()
          .then(() => {
            this.isUnlocked = true;
            if (!this.keepAliveHoldEnabled) {
              el.pause();
              el.volume = 1.0;
            }
          })
          .catch(() => {});
      }
    } catch {}
  }

  // Zero-GC 60fps lip-sync output level (0..1) and vowel roundness (0..1)
  getLipSyncMetrics(out: { open: number; round: number }) {
    if (!this.isSpeaking) {
      out.open = 0;
      out.round = 0;
      return;
    }

    if (!this.masterAnalyser || this.isPlayingReplyOnBgChannel) {
      const t = performance.now() * 0.014;
      out.open = 0.38 + Math.sin(t) * 0.26;
      out.round = 0.52;
      return;
    }

    this.masterAnalyser.getByteTimeDomainData(this.timeDomainData);
    let sumSq = 0;
    const len = this.timeDomainData.length;
    for (let i = 0; i < len; i++) {
      const v = (this.timeDomainData[i] - 128) / 128;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / len);

    this.masterAnalyser.getByteFrequencyData(this.freqDomainData);
    let lowEnergy = 0;
    let midHighEnergy = 0;
    for (let i = 2; i < 12; i++) lowEnergy += this.freqDomainData[i];
    for (let i = 12; i < 40; i++) midHighEnergy += this.freqDomainData[i];

    const open = Math.min(1, Math.max(0, (rms - 0.012) * 5.2));
    const total = lowEnergy + midHighEnergy + 1;
    const round = Math.min(1, Math.max(0, (lowEnergy / total) * 1.45));

    out.open = open;
    out.round = round;
  }

  getOutputLevel(): number {
    if (!this.isSpeaking) return 0;
    if (!this.masterAnalyser || this.isPlayingReplyOnBgChannel) {
      return 0.45 + Math.sin(performance.now() * 0.016) * 0.25;
    }
    this.masterAnalyser.getByteTimeDomainData(this.timeDomainData);
    let sumSq = 0;
    const len = this.timeDomainData.length;
    for (let i = 0; i < len; i++) {
      const v = (this.timeDomainData[i] - 128) / 128;
      sumSq += v * v;
    }
    const measured = Math.min(1, Math.sqrt(sumSq / len) * 4.8);
    if (measured > 0.02) return measured;
    return 0.38 + Math.sin(performance.now() * 0.015) * 0.22;
  }

  // Unlock Web Audio AND persistent Lock-Screen HTMLAudioElement inside user gesture handlers
  unlock() {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (!this.isUnlocked) {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);

        const el = this.ensureBgSafeAudioElement();
        if (el && !this.isPlayingReplyOnBgChannel) {
          if (this.keepAliveHoldEnabled) {
            this.restoreSilentKeepAliveLoop();
          } else {
            el.loop = false;
            el.src = this.getKeepAliveUri();
            el.volume = 0.01;
            el.play()
              .then(() => {
                if (!this.keepAliveHoldEnabled && !this.isPlayingReplyOnBgChannel) {
                  el.pause();
                }
                el.volume = 1.0;
              })
              .catch(() => {
                el.volume = 1.0;
              });
          }
        }

        this.isUnlocked = true;
      } else if (this.keepAliveHoldEnabled && !this.isPlayingReplyOnBgChannel) {
        this.pokeBackgroundKeepAlive();
      }
    } catch {
      // ignore if AudioContext unavailable
    }
  }

  playChime(
    type: 'activate' | 'heart' | 'blush' | 'tap' | 'message' | 'call_connect' | 'call_end'
  ) {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'activate') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'call_connect') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.12);
        osc.frequency.setValueAtTime(783.99, now + 0.24);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'call_end') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'heart') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(130, now + 0.18);
        osc2.frequency.exponentialRampToValueAtTime(50, now + 0.35);
        gain2.gain.setValueAtTime(0.18, now + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
        osc2.start(now + 0.18);
        osc2.stop(now + 0.38);
      } else if (type === 'blush') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(784, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.2);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'tap') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'message') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      }
    } catch {
      // ignore
    }
  }

  clearLiveQueue() {
    if (this.liveFlushTimer !== null) {
      window.clearTimeout(this.liveFlushTimer);
      this.liveFlushTimer = null;
    }
    this.livePendingChunks = [];
    this.livePendingSamples = 0;
    this.liveStreamStarted = false;

    this.liveSources.forEach((src) => {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {}
    });
    this.liveSources.clear();
    this.nextLiveStartTime = 0;
    if (!this.currentSource && !this.currentAudio) {
      this.setSpeakingState(false);
    }
  }

  private flushLivePcmBuffer() {
    if (this.liveFlushTimer !== null) {
      window.clearTimeout(this.liveFlushTimer);
      this.liveFlushTimer = null;
    }
    if (this.livePendingChunks.length === 0 || this.livePendingSamples <= 0) return;

    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const masterIn = this.getMasterInputNode();

      const totalSamples = this.livePendingSamples;
      const merged = new Float32Array(totalSamples);
      let offset = 0;
      for (const chunk of this.livePendingChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      this.livePendingChunks = [];
      this.livePendingSamples = 0;

      const isUnderrun = !this.liveStreamStarted || this.nextLiveStartTime <= ctx.currentTime + 0.012;
      // Only soften the very opening edge of a burst (never dip interior continuous chunks to 0!)
      if (isUnderrun && totalSamples > 48) {
        const rampIn = Math.min(64, Math.floor(totalSamples / 4));
        for (let i = 0; i < rampIn; i++) {
          merged[i] *= i / rampIn;
        }
      }

      const audioBuffer = ctx.createBuffer(1, totalSamples, 24000);
      audioBuffer.getChannelData(0).set(merged);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gain = ctx.createGain();
      gain.gain.value = 0.94;
      source.connect(gain);
      gain.connect(masterIn);

      // Lead slightly on initial burst / underrun (95ms) then append strictly sample-contiguously
      const startAt = isUnderrun ? ctx.currentTime + 0.095 : this.nextLiveStartTime;
      this.liveStreamStarted = true;
      this.nextLiveStartTime = startAt + audioBuffer.duration;

      this.liveSources.add(source);
      this.setSpeakingState(true);

      source.onended = () => {
        this.liveSources.delete(source);
        if (
          this.liveSources.size === 0 &&
          this.livePendingChunks.length === 0 &&
          !this.currentSource &&
          !this.currentAudio
        ) {
          this.nextLiveStartTime = 0;
          this.liveStreamStarted = false;
          this.setSpeakingState(false);
          if (this.keepAliveHoldEnabled) {
            this.restoreSilentKeepAliveLoop();
          }
        }
      };

      source.start(startAt);
    } catch (err) {
      console.warn('Live PCM flush warning:', err);
    }
  }

  enqueueLivePcm24k(base64Pcm: string) {
    if (!base64Pcm) return;
    try {
      this.ensureNativeSpeakerRoute();
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Pause silent keep-alive element while streaming live speech so Android audio mixer does not glitch
      if (this.bgSafeAudio && !this.isPlayingReplyOnBgChannel && !this.bgSafeAudio.paused) {
        try {
          this.bgSafeAudio.pause();
        } catch {}
      }

      const binary = window.atob(base64Pcm);
      const byteLength = binary.length - (binary.length % 2);
      if (byteLength <= 0) return;

      const bytes = new Uint8Array(byteLength);
      for (let i = 0; i < byteLength; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const view = new DataView(bytes.buffer);
      const numSamples = byteLength / 2;
      const float32 = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        float32[i] = view.getInt16(i * 2, true) / 32768;
      }

      this.livePendingChunks.push(float32);
      this.livePendingSamples += numSamples;
      this.setSpeakingState(true);

      const isStreamIdle = !this.liveStreamStarted || this.nextLiveStartTime <= ctx.currentTime + 0.015;
      // Pre-buffer at least ~120ms (2880 samples @ 24kHz) on stream start/underrun, or 80ms (1920 samples) mid-stream
      const targetBatchSamples = isStreamIdle ? 2880 : 1920;

      if (this.livePendingSamples >= targetBatchSamples) {
        this.flushLivePcmBuffer();
      } else if (this.liveFlushTimer === null) {
        this.liveFlushTimer = window.setTimeout(() => {
          this.liveFlushTimer = null;
          this.flushLivePcmBuffer();
        }, 65);
      }
    } catch (err) {
      console.warn('Live PCM playback warning:', err);
    }
  }

  stopAudio(clearEchoTail = false) {
    this.activePlaybackId += 1;
    this.clearLiveQueue();

    if (this.safetyTimer !== null) {
      window.clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }

    if (this.currentSource) {
      try {
        this.currentSource.onended = null;
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {}
      this.currentSource = null;
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.isPlayingReplyOnBgChannel = false;
        if (this.keepAliveHoldEnabled && this.currentAudio === this.bgSafeAudio) {
          this.restoreSilentKeepAliveLoop();
        } else {
          this.currentAudio.pause();
        }
      } catch {}
      this.currentAudio = null;
    }

    if (this.bgSafeBlobUrl) {
      try {
        URL.revokeObjectURL(this.bgSafeBlobUrl);
      } catch {}
      this.bgSafeBlobUrl = null;
    }

    try {
      (window as any)?.ZaraAndroidBridge?.stopNativeTts?.();
    } catch {}

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    this.setSpeakingState(false);
    if (clearEchoTail) {
      this.lastSpeakEndTime = 0;
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Play reply directly on the continuously-active Lock-Screen/Background <audio> channel so OS never blocks speech!
  private async playViaHtmlAudioElement(
    rawBuffer: ArrayBuffer,
    rate: number,
    spokenLabel?: string,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<boolean> {
    try {
      const blob = new Blob([rawBuffer], { type: 'audio/wav' });
      const blobUrl = URL.createObjectURL(blob);
      this.bgSafeBlobUrl = blobUrl;

      const audio = this.ensureBgSafeAudioElement() || new Audio();
      this.isPlayingReplyOnBgChannel = true;
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
      audio.loop = false;
      audio.src = blobUrl;
      audio.volume = 1.0;
      audio.playbackRate = rate;
      if ('preservesPitch' in audio) {
        (audio as any).preservesPitch = true;
      }
      this.currentAudio = audio;
      this.setSpeakingState(true);
      if (spokenLabel) {
        this.updateLockScreenMetadata('Zara Replying', spokenLabel);
      }
      onStart?.();

      return await new Promise<boolean>((resolve) => {
        let done = false;
        const complete = (ok: boolean) => {
          if (done) return;
          done = true;
          this.isPlayingReplyOnBgChannel = false;
          if (this.bgSafeBlobUrl === blobUrl) {
            URL.revokeObjectURL(blobUrl);
            this.bgSafeBlobUrl = null;
          }
          if (this.safetyTimer !== null) {
            window.clearTimeout(this.safetyTimer);
            this.safetyTimer = null;
          }
          if (this.currentAudio === audio) {
            this.currentAudio = null;
            this.setSpeakingState(false);
          }
          // Immediately hand the element back to the sub-audible keep-alive loop so Lock-Screen AudioFocus never drops!
          if (this.keepAliveHoldEnabled) {
            this.restoreSilentKeepAliveLoop();
          }
          onEnd?.();
          resolve(ok);
        };

        audio.onended = () => complete(true);
        audio.onerror = () => complete(false);
        // 24kHz 16-bit mono WAV = 48,000 bytes/sec; compute generous timeout so long replies never cut off!
        const estDurationMs = Math.ceil((Math.max(0, rawBuffer.byteLength - 44) / 48000 / rate) * 1000);
        const safeTimeoutMs = Math.min(240000, Math.max(30000, estDurationMs + 8000));
        this.safetyTimer = window.setTimeout(() => complete(true), safeTimeoutMs);
        audio.play().catch(() => complete(false));
      });
    } catch {
      this.isPlayingReplyOnBgChannel = false;
      if (this.keepAliveHoldEnabled) {
        this.restoreSilentKeepAliveLoop();
      }
      this.setSpeakingState(false);
      onEnd?.();
      return false;
    }
  }

  // Play Gemini Neural WAV base64 — uses clean WebAudio with limiter/de-clicking when foregrounded, or Lock-Screen Media Channel when hidden
  async playAudioBase64(
    base64Wav: string,
    playbackRate = 1.0,
    onStart?: () => void,
    onEnd?: () => void,
    spokenLabel?: string
  ): Promise<boolean> {
    if (!base64Wav) return false;
    this.stopAudio();
    this.ensureNativeSpeakerRoute();
    const playbackId = this.activePlaybackId;
    const rate = Math.max(0.85, Math.min(1.18, playbackRate || 1.0));
    const isScreenHidden =
      typeof document !== 'undefined' &&
      (document.visibilityState === 'hidden' || !document.hasFocus?.());

    if (isScreenHidden) {
      const rawBuffer = this.base64ToArrayBuffer(base64Wav);
      return this.playViaHtmlAudioElement(rawBuffer, rate, spokenLabel, onStart, onEnd);
    }

    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        await Promise.race([
          ctx.resume(),
          new Promise((_, rej) => window.setTimeout(() => rej(new Error('ctx_suspended')), 1100)),
        ]);
      }

      if (playbackId !== this.activePlaybackId) {
        onEnd?.();
        return true;
      }

      if (ctx.state === 'running') {
        // Pause silent keep-alive WAV element during active WebAudio TTS playback so Android audio mixer never crackles/chops
        if (this.bgSafeAudio && !this.isPlayingReplyOnBgChannel && !this.bgSafeAudio.paused) {
          try {
            this.bgSafeAudio.pause();
          } catch {}
          await new Promise((resolve) => window.setTimeout(resolve, 35));
        }

        const masterIn = this.getMasterInputNode();
        const rawBuffer = this.base64ToArrayBuffer(base64Wav);
        const audioBuffer = await ctx.decodeAudioData(rawBuffer.slice(0));

        if (playbackId !== this.activePlaybackId) {
          if (this.keepAliveHoldEnabled) this.restoreSilentKeepAliveLoop();
          onEnd?.();
          return true;
        }

        this.applySmoothEdgeRamps(audioBuffer, 0.004);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = rate;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.95;
        source.connect(gainNode);
        gainNode.connect(masterIn);

        this.currentSource = source;
        this.setSpeakingState(true);
        onStart?.();

        return await new Promise<boolean>((resolve) => {
          let finished = false;
          let progressGuardId: number | null = null;
          const finishOnce = () => {
            if (finished) return;
            finished = true;
            if (progressGuardId !== null) {
              window.clearInterval(progressGuardId);
              progressGuardId = null;
            }
            if (this.safetyTimer !== null) {
              window.clearTimeout(this.safetyTimer);
              this.safetyTimer = null;
            }
            if (this.currentSource === source) {
              try {
                source.onended = null;
                source.disconnect();
                gainNode.disconnect();
              } catch {}
              this.currentSource = null;
              this.setSpeakingState(false);
            }
            if (this.keepAliveHoldEnabled && playbackId === this.activePlaybackId) {
              this.restoreSilentKeepAliveLoop();
            }
            onEnd?.();
            resolve(true);
          };

          source.onended = finishOnce;
          const actualDurSec = audioBuffer.duration / rate;
          const startCtxTime = ctx.currentTime + 0.025;
          // Generous fallback timeout + AudioContext clock verification so Bluetooth/hardware latency never truncates speech
          const durationMs = Math.ceil(actualDurSec * 1000) + 7500;
          this.safetyTimer = window.setTimeout(finishOnce, durationMs);
          progressGuardId = window.setInterval(() => {
            if (ctx.state === 'running' && ctx.currentTime - startCtxTime > actualDurSec + 3.8) {
              finishOnce();
            }
          }, 500);

          source.start(startCtxTime);
        });
      }
    } catch (webAudioErr) {
      console.warn('WebAudio decode fallback to HTMLAudio:', webAudioErr);
    }

    if (playbackId !== this.activePlaybackId) {
      onEnd?.();
      return true;
    }
    const rawBuffer = this.base64ToArrayBuffer(base64Wav);
    return this.playViaHtmlAudioElement(rawBuffer, rate, spokenLabel, onStart, onEnd);
  }

  private maybeShowBackgroundReplyNotification(text: string) {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    if (document.visibilityState !== 'hidden') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const clean = text.replace(/[*_~`#]/g, '').trim();
      if (!clean) return;
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => {
            reg.showNotification('Zara Replied', {
              body: clean.slice(0, 140),
              icon: '/pwa-192x192.png',
              tag: 'zara-voice-reply',
              silent: true,
            });
          })
          .catch(() => {});
      }
    } catch {}
  }

  // Convert any text message to a playable & downloadable Neural WAV Blob URL (supports Female & Male Pakistani voices)
  async synthesizeVoiceAudio(
    text: string,
    options?: {
      language?: string;
      voiceName?: string;
      loveMode?: boolean;
      romanceIntensity?: string;
      emotionMode?: ZaraEmotionMode;
      ttsEngine?: TtsEngineId;
    }
  ): Promise<{ blobUrl: string; base64Wav: string; filename: string } | null> {
    const clean = text.trim();
    if (!clean) return null;
    try {
      const ownerSnap = getOwnerAuthSnapshot();
      const verifiedOwner = ownerSnap.isOwnerVerified;
      const authHeaders = await getOwnerAuthHeaders();
      const voiceName = options?.voiceName || 'Zephyr';

      const res = await fetchWithContainerWakeup(
        '/api/tts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            text: clean,
            voiceName,
            language: options?.language || 'auto',
            loveMode: verifiedOwner ? (options?.loveMode ?? true) : false,
            romanceIntensity: verifiedOwner ? (options?.romanceIntensity || 'bold') : 'calm',
            emotionMode: verifiedOwner ? (options?.emotionMode || 'apnapan') : 'calm',
            ttsEngine: options?.ttsEngine || this.preferredTtsEngine,
          }),
        },
        { maxWakeRetries: 2 }
      );

      if (!res.ok) return null;
      const data = await res.json();
      if (!data.audio || data.fallback) return null;

      const rawBuffer = this.base64ToArrayBuffer(data.audio);
      const blob = new Blob([rawBuffer], { type: 'audio/wav' });
      const blobUrl = URL.createObjectURL(blob);
      const gender = getVoiceGenderFromName(voiceName);
      const filename = `zara-${gender}-${voiceName.toLowerCase()}-${Date.now()}.wav`;
      return { blobUrl, base64Wav: data.audio, filename };
    } catch {
      return null;
    }
  }

  async speakText(
    text: string,
    options?: {
      language?: string;
      pitch?: number;
      rate?: number;
      voiceName?: string;
      loveMode?: boolean;
      romanceIntensity?: string;
      emotionMode?: ZaraEmotionMode;
      ttsEngine?: TtsEngineId;
      base64Audio?: string | null;
      onStart?: () => void;
      onEnd?: () => void;
    }
  ): Promise<void> {
    const cleanCheck = (text || '').trim();
    if (!cleanCheck && !options?.base64Audio) {
      options?.onEnd?.();
      return;
    }
    this.stopAudio();
    this.ensureNativeSpeakerRoute();
    const myPlaybackId = this.activePlaybackId;
    const rate = options?.rate ?? 1.0;
    const voiceName = options?.voiceName || 'Zephyr';

    this.maybeShowBackgroundReplyNotification(text);

    if (options?.base64Audio) {
      const played = await this.playAudioBase64(
        options.base64Audio,
        rate,
        options.onStart,
        options.onEnd,
        text
      );
      if (played || myPlaybackId !== this.activePlaybackId) return;
    }

    const cacheKey = `${voiceName}:${options?.language || 'auto'}:${options?.emotionMode || 'calm'}:${options?.loveMode ? '1' : '0'}:${text.trim()}`;
    if (text.length <= 220 && this.ttsMemoryCache.has(cacheKey)) {
      const cachedAudio = this.ttsMemoryCache.get(cacheKey)!;
      const played = await this.playAudioBase64(
        cachedAudio,
        rate,
        options?.onStart,
        options?.onEnd,
        text
      );
      if (played || myPlaybackId !== this.activePlaybackId) return;
    }

    try {
      const ownerSnap = getOwnerAuthSnapshot();
      const verifiedOwner = ownerSnap.isOwnerVerified;
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup(
        '/api/tts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            text,
            voiceName,
            language: options?.language || 'auto',
            loveMode: verifiedOwner ? (options?.loveMode ?? true) : false,
            romanceIntensity: verifiedOwner ? (options?.romanceIntensity || 'bold') : 'calm',
            emotionMode: verifiedOwner ? (options?.emotionMode || 'apnapan') : 'calm',
            ttsEngine: options?.ttsEngine || this.preferredTtsEngine,
          }),
        },
        { maxWakeRetries: 2 }
      );

      if (myPlaybackId !== this.activePlaybackId) {
        options?.onEnd?.();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.audio && !data.fallback) {
          if (text.length <= 220) {
            if (this.ttsMemoryCache.size >= 24) {
              const firstKey = this.ttsMemoryCache.keys().next().value;
              if (firstKey) this.ttsMemoryCache.delete(firstKey);
            }
            this.ttsMemoryCache.set(cacheKey, data.audio);
          }
          const played = await this.playAudioBase64(
            data.audio,
            rate,
            options?.onStart,
            options?.onEnd,
            text
          );
          if (played || myPlaybackId !== this.activePlaybackId) return;
        }
      }
    } catch {
      // Offline fallback below
    }

    if (myPlaybackId !== this.activePlaybackId) {
      options?.onEnd?.();
      return;
    }

    await this.speakWithOfflineFallback(text, options);
  }

  private speakWithOfflineFallback(
    text: string,
    options?: {
      language?: string;
      pitch?: number;
      rate?: number;
      voiceName?: string;
      onStart?: () => void;
      onEnd?: () => void;
    }
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const cleanText = text.replace(/[*_~`#]/g, '').trim();
      if (!cleanText) {
        this.setSpeakingState(false);
        options?.onEnd?.();
        resolve();
        return;
      }

      const lang = options?.language || 'urdu';
      const isGurmukhi = /[\u0A00-\u0A7F]/.test(cleanText);
      const isDevanagari = /[\u0900-\u097F]/.test(cleanText);
      const isArabicScript = /[\u0600-\u06FF]/.test(cleanText) && lang === 'arabic';
      const fallbackLangCode =
        lang === 'punjabi' || isGurmukhi
          ? 'pa-IN'
          : lang === 'hindi' || isDevanagari
          ? 'hi-IN'
          : lang === 'uzbek'
          ? 'uz-UZ'
          : lang === 'malay'
          ? 'ms-MY'
          : lang === 'arabic' || isArabicScript
          ? 'ar-SA'
          : lang === 'urdu' || lang === 'roman_urdu'
          ? 'ur-PK'
          : 'en-US';

      // Prefer Native Android TextToSpeech first inside APK WebView (speechSynthesis.getVoices() is often empty on Android WebView)
      const myPlaybackId = this.activePlaybackId;
      const nativeBridge = typeof window !== 'undefined' ? (window as any).ZaraAndroidBridge : null;
      if (nativeBridge?.speakNativeTts) {
        try {
          this.ensureNativeSpeakerRoute();
          const spokenOk = Boolean(nativeBridge.speakNativeTts(cleanText, fallbackLangCode));
          if (spokenOk) {
            this.setSpeakingState(true);
            options?.onStart?.();
            const estMs = Math.min(45000, Math.max(1800, cleanText.length * 72));
            this.safetyTimer = window.setTimeout(() => {
              if (myPlaybackId === this.activePlaybackId) {
                this.setSpeakingState(false);
                options?.onEnd?.();
              }
              resolve();
            }, estMs);
            return;
          }
        } catch {}
      }

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        this.notifyVoiceNotice({
          available: false,
          message: 'Speech synthesis is not supported on this browser or platform.',
          lang: options?.language || 'urdu',
        });
        this.setSpeakingState(false);
        options?.onEnd?.();
        resolve();
        return;
      }

      // Split long replies at sentence boundaries so browser SpeechSynthesis never cuts off after ~15s
      const rawSentences = cleanText.match(/[^.!?।\n۔]+[.!?।\n۔]*/g) || [cleanText];
      const chunks: string[] = [];
      let current = '';
      for (const s of rawSentences) {
        const piece = s.trim();
        if (!piece) continue;
        if (current && current.length + piece.length + 1 > 165) {
          chunks.push(current);
          current = piece;
        } else {
          current = current ? `${current} ${piece}` : piece;
        }
      }
      if (current) chunks.push(current);
      if (chunks.length === 0) chunks.push(cleanText);

      const voices = window.speechSynthesis.getVoices();
      const targetGender = getVoiceGenderFromName(options?.voiceName);

      const matchesGender = (v: SpeechSynthesisVoice) => {
        const nameLower = v.name.toLowerCase();
        if (targetGender === 'male') {
          return /(male|man|asad|uzair|madhur|prabhat|ravi|hemant|david|mark|daniel|guy|ryan)/i.test(
            nameLower
          );
        }
        return /(female|woman|uzma|gul|swara|lekha|kalpana|zira|aria|jenny|sonia|natasha)/i.test(
          nameLower
        );
      };

      const findForLang = (prefix: string) =>
        voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith(prefix) &&
            (v.name.includes('Natural') || v.name.includes('Google')) &&
            matchesGender(v)
        ) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(prefix) && matchesGender(v)) ||
        voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith(prefix) &&
            (v.name.includes('Natural') || v.name.includes('Google'))
        ) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(prefix));

      const chosenVoice =
        (lang === 'punjabi' || isGurmukhi
          ? findForLang('pa') || findForLang('ur') || findForLang('hi')
          : lang === 'hindi' || isDevanagari
          ? findForLang('hi') || findForLang('ur')
          : lang === 'uzbek'
          ? findForLang('uz') || findForLang('tr') || findForLang('ru')
          : lang === 'malay'
          ? findForLang('ms') || findForLang('id') || findForLang('en')
          : lang === 'arabic' || isArabicScript
          ? findForLang('ar') || findForLang('ur')
          : lang === 'english'
          ? findForLang('en-pk') || findForLang('en-in') || findForLang('en')
          : findForLang('ur-pk') || findForLang('ur') || findForLang('hi')) || null;

      let completed = false;
      let pollId: number | null = null;
      const finish = () => {
        if (completed) return;
        completed = true;
        if (pollId !== null) {
          window.clearInterval(pollId);
          pollId = null;
        }
        if (this.safetyTimer !== null) {
          window.clearTimeout(this.safetyTimer);
          this.safetyTimer = null;
        }
        this.setSpeakingState(false);
        options?.onEnd?.();
        resolve();
      };

      const estMs = Math.min(90000, Math.max(4500, cleanText.length * 95));
      this.safetyTimer = window.setTimeout(finish, estMs);

      const startedAt = Date.now();
      let sawSpeaking = false;
      pollId = window.setInterval(() => {
        try {
          const synth = window.speechSynthesis;
          if (synth.speaking) {
            sawSpeaking = true;
          } else if (sawSpeaking && !synth.pending) {
            finish();
          } else if (!sawSpeaking && !synth.pending && Date.now() - startedAt > 2500) {
            this.notifyVoiceNotice({
              available: false,
              message: 'Voice audio output was blocked by browser — tap the screen once to enable sound.',
              lang: options?.language || 'auto',
            });
            finish();
          }
        } catch {
          finish();
        }
      }, 450);

      try {
        this.setSpeakingState(true);
        options?.onStart?.();
        chunks.forEach((chunkStr, idx) => {
          const utt = new SpeechSynthesisUtterance(chunkStr);
          if (chosenVoice) {
            utt.voice = chosenVoice;
            utt.lang = chosenVoice.lang;
          } else {
            utt.lang = fallbackLangCode;
          }
          utt.pitch = options?.pitch ?? (targetGender === 'male' ? 0.88 : 1.08);
          utt.rate = options?.rate ?? 0.96;
          if (idx === chunks.length - 1) {
            utt.onend = finish;
            utt.onerror = finish;
          } else {
            utt.onerror = finish;
          }
          window.speechSynthesis.speak(utt);
        });
      } catch {
        finish();
      }
    });
  }

  async testZaraVoice(
    language = 'auto',
    voiceName = 'Zephyr'
  ): Promise<{ ok: boolean; channel: 'neural_tts' | 'native_android_tts' | 'browser_tts' | 'failed'; detail: string }> {
    this.unlock();
    this.ensureNativeSpeakerRoute();
    const sample =
      language === 'english'
        ? 'Hello! Zara voice output is loud and clear.'
        : 'Assalam o Alaikum! Main Zara hoon, meri aawaz bilkul saaf aa rahi hai.';
    try {
      const synth = await this.synthesizeVoiceAudio(sample, {
        language,
        voiceName,
      });
      if (synth?.base64Wav) {
        const played = await this.playAudioBase64(synth.base64Wav, 1.0, undefined, undefined, sample);
        if (played) {
          return {
            ok: true,
            channel: 'neural_tts',
            detail: 'Neural Gemini TTS audio played cleanly on speaker.',
          };
        }
      }
    } catch {}

    const nativeBridge = typeof window !== 'undefined' ? (window as any).ZaraAndroidBridge : null;
    if (nativeBridge?.speakNativeTts) {
      const ok = Boolean(nativeBridge.speakNativeTts(sample, language === 'english' ? 'en-US' : 'ur-PK'));
      if (ok) {
        return {
          ok: true,
          channel: 'native_android_tts',
          detail: 'Native Android TextToSpeech fallback played on speaker.',
        };
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      await this.speakWithOfflineFallback(sample, { language, voiceName });
      return {
        ok: true,
        channel: 'browser_tts',
        detail: 'Browser SpeechSynthesis fallback completed.',
      };
    }

    return {
      ok: false,
      channel: 'failed',
      detail: 'No audio output channel could be unlocked.',
    };
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const audioService = new AudioManager();
