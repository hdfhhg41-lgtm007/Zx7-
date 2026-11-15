// Steady Single-Stream Microphone Capture (16kHz PCM), Live Camera/Screen Frame Bridge & Real-Time Live Phone Call Client
// Resilient getUserMedia fallback for Android installed PWAs (WebAPKs) & mobile browsers

import { audioService } from './audioService';
import { zaraVision, detectMobileCommandFromText } from './visionAndControlService';
import { detectSpecialControlCommand } from './ownerSecurityAndBuilderService';
import { detectCallOrMessageWithConfirmation } from './androidAssistantBridgeService';
import { fetchWithContainerWakeup } from './chatVaultPersistence';
import {
  getOwnerAuthHeaders,
  getOwnerAuthSnapshot,
  getOwnerIdTokenOrNull,
} from './ownerAuthService';
import { isAppOnline, runOfflineZaraBrain } from './offlineBrainService';
import { getTierRequestHeaders } from './proTierService';
import { ChatMessage, Language, PersonalityConfig } from '../types';

const WORKLET_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(2048);
    this._offset = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];
    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._offset++] = channel[i];
      if (this._offset >= this._buffer.length) {
        this.port.postMessage(this._buffer.slice(0));
        this._offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('zara-pcm-capture', PcmCaptureProcessor);
`;

// Safe Microphone Stream Acquisition with Android WebAPK fallback (no rigid sampleRate constraint!)
export async function acquireMicrophoneStreamSafe(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

export function downsampleTo16kInt16(float32: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === 16000) {
    const out = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  const ratio = inputSampleRate / 16000;
  const newLength = Math.max(1, Math.round(float32.length / ratio));
  const result = new Int16Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(float32.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += float32[j];
      count++;
    }
    const sample = count > 0 ? sum / count : float32[Math.min(start, float32.length - 1)] || 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    result[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return result;
}

export function normalizeQuietPcm16(chunks: Int16Array[]): Int16Array[] {
  let maxAbs = 0;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      const a = Math.abs(chunk[i]);
      if (a > maxAbs) maxAbs = a;
    }
  }
  if (maxAbs < 120 || maxAbs >= 22000) return chunks;
  const gain = Math.min(7.5, 24000 / maxAbs);
  return chunks.map((chunk) => {
    const out = new Int16Array(chunk.length);
    for (let i = 0; i < chunk.length; i++) {
      const v = Math.round(chunk[i] * gain);
      out[i] = v > 32767 ? 32767 : v < -32768 ? -32768 : v;
    }
    return out;
  });
}

function int16ToBase64(pcm16: Int16Array): string {
  const bytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return window.btoa(binary);
}

export function encodePcm16ChunksToWavBase64(chunks: Int16Array[], sampleRate = 16000): string {
  let totalSamples = 0;
  for (const c of chunks) totalSamples += c.length;

  const dataByteLen = totalSamples * 2;
  const buffer = new ArrayBuffer(44 + dataByteLen);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLen, true);
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
  view.setUint32(40, dataByteLen, true);

  let byteOffset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      view.setInt16(byteOffset, chunk[i], true);
      byteOffset += 2;
    }
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, i + step);
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return window.btoa(binary);
}

async function attachSteadyPcmCapture(
  stream: MediaStream,
  onChunk: (pcm16: Int16Array, rms0to100: number) => void
): Promise<() => void> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }

  const source = ctx.createMediaStreamSource(stream);
  const sampleRate = ctx.sampleRate || 48000;
  let workletNode: AudioWorkletNode | null = null;
  let scriptNode: ScriptProcessorNode | null = null;
  let blobUrl: string | null = null;

  const handleFloatSamples = (floatSamples: Float32Array) => {
    let sumSq = 0;
    for (let i = 0; i < floatSamples.length; i++) {
      sumSq += floatSamples[i] * floatSamples[i];
    }
    const rms = Math.min(100, Math.round(Math.sqrt(sumSq / floatSamples.length) * 380));
    const pcm16 = downsampleTo16kInt16(floatSamples, sampleRate);
    onChunk(pcm16, rms);
  };

  if (ctx.audioWorklet && typeof Blob !== 'undefined') {
    try {
      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      blobUrl = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(blobUrl);
      workletNode = new AudioWorkletNode(ctx, 'zara-pcm-capture');
      workletNode.port.onmessage = (evt) => {
        if (evt.data instanceof Float32Array) {
          handleFloatSamples(evt.data);
        }
      };
      source.connect(workletNode);
    } catch {
      workletNode = null;
    }
  }

  if (!workletNode) {
    scriptNode = ctx.createScriptProcessor(2048, 1, 1);
    const muteGain = ctx.createGain();
    muteGain.gain.value = 0;
    scriptNode.onaudioprocess = (evt) => {
      const ch = evt.inputBuffer.getChannelData(0);
      handleFloatSamples(new Float32Array(ch));
    };
    source.connect(scriptNode);
    scriptNode.connect(muteGain);
    muteGain.connect(ctx.destination);
  }

  return () => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
    try {
      workletNode?.disconnect();
      scriptNode?.disconnect();
      source.disconnect();
    } catch {}
    if (ctx.state !== 'closed') {
      ctx.close().catch(() => {});
    }
  };
}

// 1. Direct Single-Turn Voice Mic (Home Screen & Chat Drawer)
export class DirectMicSession {
  private stream: MediaStream | null = null;
  private detachAudio: (() => void) | null = null;
  private chunks: Int16Array[] = [];
  private active = false;
  private hasSpoken = false;
  private speechStart = 0;
  private lastVoiceAt = 0;
  private startedAt = 0;

  async start(callbacks: {
    onVolume: (vol: number) => void;
    onAutoFinish: (wavBase64: string) => void;
    onError: (msg: string) => void;
  }): Promise<boolean> {
    this.stopAndDiscard();
    try {
      const stream = await acquireMicrophoneStreamSafe();

      this.stream = stream;
      this.chunks = [];
      this.active = true;
      this.hasSpoken = false;
      this.startedAt = Date.now();
      this.lastVoiceAt = Date.now();

      this.detachAudio = await attachSteadyPcmCapture(stream, (pcm16, rms) => {
        if (!this.active) return;
        callbacks.onVolume(rms);
        this.chunks.push(pcm16);

        const now = Date.now();
        const activeRmsThreshold = this.hasSpoken ? 1.8 : 2.8;
        if (rms >= activeRmsThreshold) {
          if (!this.hasSpoken) {
            this.hasSpoken = true;
            this.speechStart = now;
          }
          this.lastVoiceAt = now;
        } else if (this.hasSpoken) {
          if (now - this.lastVoiceAt >= 1350 || now - this.speechStart >= 30000) {
            const wav = this.finishAndGetWav();
            if (wav) callbacks.onAutoFinish(wav);
          }
        } else if (now - this.startedAt >= 14000) {
          const wav = this.finishAndGetWav();
          if (wav) callbacks.onAutoFinish(wav);
        }
      });

      return true;
    } catch {
      callbacks.onError('Please allow Microphone permission (tap Phone Control -> Allow All).');
      this.stopAndDiscard();
      return false;
    }
  }

  finishAndGetWav(): string | null {
    if (!this.active) return null;
    this.active = false;
    const recorded = this.chunks.slice();
    this.cleanupHardware();
    if (recorded.length < 3) return null;
    const normalized = normalizeQuietPcm16(recorded);
    return encodePcm16ChunksToWavBase64(normalized, 16000);
  }

  stopAndDiscard() {
    this.active = false;
    this.chunks = [];
    this.cleanupHardware();
  }

  private cleanupHardware() {
    if (this.detachAudio) {
      this.detachAudio();
      this.detachAudio = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }
}

// 2. Full-Duplex Continuous Live Phone Call + Real-Time Camera/Screen Streaming + Voice App Launcher
export interface LiveCallCallbacks {
  onStatusChange: (status: 'connecting' | 'connected' | 'fallback_connected' | 'error') => void;
  onMicVolume: (vol: number) => void;
  onUserSpeakingChange: (speaking: boolean) => void;
  onUserTranscript: (text: string) => void;
  onZaraTranscript: (text: string, isFinalTurn?: boolean) => void;
  onTurnPairComplete: (userText: string, zaraText: string) => void;
  onDeviceAction?: (
    action: 'open' | 'close' | 'back' | 'drop_call' | 'close_zara',
    appId: string,
    query?: string
  ) => void;
  onRequestCallOrMessageConfirmation?: (transcript: string) => void;
  onError: (msg: string) => void;
}

export class LivePhoneCallController {
  private ws: WebSocket | null = null;
  private stream: MediaStream | null = null;
  private detachAudio: (() => void) | null = null;
  private visionTimer: number | null = null;
  private isRunning = false;
  private isMuted = false;
  private audioOnly = false;
  private liveSetupReady = false;
  private useFallbackMode = false;
  private isFallbackBusy = false;
  private lastDispatchedTurnCmd = '';
  private fallbackNoiseFloor = 2.6;

  private liveUserTurnText = '';
  private liveZaraTurnText = '';

  private preRollChunks: Int16Array[] = [];
  private activeUtteranceChunks: Int16Array[] = [];
  private vadHasSpoken = false;
  private vadSpeechFrames = 0;
  private vadLastVoiceTime = 0;
  private vadSpeechStart = 0;

  private config: PersonalityConfig;
  private language: Language;
  private history: ChatMessage[];
  private memoryDigest: string;
  private cb: LiveCallCallbacks;

  constructor(
    config: PersonalityConfig,
    language: Language,
    history: ChatMessage[],
    callbacks: LiveCallCallbacks,
    memoryDigest = '',
    audioOnly = false
  ) {
    this.config = config;
    this.language = language;
    this.history = history;
    this.memoryDigest = memoryDigest;
    this.cb = callbacks;
    this.audioOnly = audioOnly;
  }

  updateContext(
    config: PersonalityConfig,
    language: Language,
    history: ChatMessage[],
    memoryDigest = ''
  ) {
    this.config = config;
    this.language = language;
    this.history = history;
    this.memoryDigest = memoryDigest;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.vadHasSpoken = false;
      this.activeUtteranceChunks = [];
      this.cb.onUserSpeakingChange(false);
      this.cb.onMicVolume(0);
    }
  }

  async start() {
    this.isRunning = true;
    this.liveSetupReady = false;
    this.useFallbackMode = false;
    this.cb.onStatusChange('connecting');
    audioService.unlock();

    try {
      const stream = await acquireMicrophoneStreamSafe();

      if (!this.isRunning) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      this.stream = stream;

      this.detachAudio = await attachSteadyPcmCapture(stream, (pcm16, rms) => {
        if (!this.isRunning) return;

        if (this.isMuted) {
          this.cb.onMicVolume(0);
          return;
        }

        this.cb.onMicVolume(rms);

        if (!this.useFallbackMode && this.liveSetupReady && this.ws && this.ws.readyState === WebSocket.OPEN) {
          const speakingNow = rms >= 4.5 && !audioService.getIsSpeaking();
          this.cb.onUserSpeakingChange(speakingNow);
          const b64 = int16ToBase64(pcm16);
          try {
            this.ws.send(JSON.stringify({ type: 'audio', data: b64 }));
          } catch {}
          return;
        }

        if (this.useFallbackMode && !this.isFallbackBusy && !audioService.getIsSpeaking()) {
          this.handleFallbackPcmFrame(pcm16, rms);
        }
      });
    } catch {
      this.cb.onStatusChange('error');
      this.cb.onError('Please allow Microphone permission to start the audio call.');
      return;
    }

    // Stream live Camera/Screen frames only during video call mode (never during audio-only call)
    if (!this.audioOnly) {
      this.visionTimer = window.setInterval(() => {
        if (!this.isRunning || this.useFallbackMode || !this.liveSetupReady) return;
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const frame = zaraVision.captureFrameBase64();
        if (frame && frame.base64) {
          try {
            this.ws.send(JSON.stringify({ type: 'video', data: frame.base64 }));
          } catch {}
        }
      }, 1800);
    }

    this.connectLiveWebSocket();
  }

  private checkAndFireVoiceCommand(transcript: string) {
    if (!transcript || transcript === this.lastDispatchedTurnCmd) return;

    // Mandatory authorization check: NEVER dial or send messages without confirmation
    const confirmCandidate = detectCallOrMessageWithConfirmation(transcript);
    if (confirmCandidate) {
      this.lastDispatchedTurnCmd = transcript;
      this.cb.onRequestCallOrMessageConfirmation?.(transcript);
      return;
    }

    const special = detectSpecialControlCommand(transcript);
    if (special && this.cb.onDeviceAction) {
      if (special.type === 'drop_zara_call') {
        this.lastDispatchedTurnCmd = transcript;
        this.cb.onDeviceAction('drop_call', 'zara_call');
        return;
      }
      if (special.type === 'close_zara_app') {
        this.lastDispatchedTurnCmd = transcript;
        this.cb.onDeviceAction('close_zara', 'zara_app');
        return;
      }
      if (special.type === 'go_back') {
        this.lastDispatchedTurnCmd = transcript;
        this.cb.onDeviceAction('back', 'back');
        return;
      }
      if (special.type === 'close_active') {
        this.lastDispatchedTurnCmd = transcript;
        this.cb.onDeviceAction('close', special.targetAppHint || 'last_active');
        return;
      }
      if (
        special.type === 'whatsapp_text' ||
        special.type === 'whatsapp_call' ||
        special.type === 'phone_call'
      ) {
        this.lastDispatchedTurnCmd = transcript;
        this.cb.onRequestCallOrMessageConfirmation?.(transcript);
        return;
      }
    }
    const match = detectMobileCommandFromText(transcript);
    if (match && this.cb.onDeviceAction) {
      this.lastDispatchedTurnCmd = transcript;
      if (match.action === 'back') {
        this.cb.onDeviceAction('back', 'back');
        return;
      }
      const targetId = match.closeAll ? 'all' : match.app?.id || 'last_active';
      this.cb.onDeviceAction(match.action, targetId, match.query);
    }
  }

  private connectLiveWebSocket() {
    if (!this.isRunning) return;

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/api/live-call`;

    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      const connectTimeout = window.setTimeout(() => {
        if (this.isRunning && !this.useFallbackMode && !this.liveSetupReady) {
          this.switchToSteadyFallback(true);
        }
      }, 4200);

      ws.onopen = async () => {
        if (!this.isRunning) {
          ws.close();
          return;
        }
        const snap = getOwnerAuthSnapshot();
        const isOwnerVerified = snap.isOwnerVerified;
        const idToken = isOwnerVerified ? await getOwnerIdTokenOrNull() : null;
        if (!this.isRunning || ws.readyState !== WebSocket.OPEN) return;

        ws.send(
          JSON.stringify({
            type: 'init',
            audioOnly: this.audioOnly,
            assistantId: this.config.activeAssistantId || 'zara',
            preferredReplyLanguage: this.config.preferredReplyLanguage || '',
            idToken: idToken || '',
            guestLock: !isOwnerVerified,
            language: this.language,
            loveMode: isOwnerVerified ? this.config.loveMode : false,
            affectionLevel: this.config.affectionLevel,
            obedienceLevel: this.config.obedienceLevel,
            romanceIntensity: isOwnerVerified ? this.config.romanceIntensity : 'calm',
            unfilteredBoldTalk: isOwnerVerified ? (this.config.unfilteredBoldTalk ?? true) : false,
            userNickname: isOwnerVerified ? this.config.userNickname : 'Friend',
            voiceName: this.config.voiceName || 'Zephyr',
            emotionMode: isOwnerVerified ? (this.config.emotionMode || 'apnapan') : 'calm',
            memoryDigest: isOwnerVerified ? this.memoryDigest : '',
          })
        );
      };

      ws.onmessage = (event) => {
        if (!this.isRunning) return;
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'ready') {
            window.clearTimeout(connectTimeout);
            this.liveSetupReady = true;
            audioService.playChime('call_connect');
            this.cb.onStatusChange('connected');
            return;
          }

          if (data.type === 'device_action' && data.appId) {
            const act =
              data.action === 'drop_call'
                ? 'drop_call'
                : data.action === 'close_zara'
                ? 'close_zara'
                : data.action === 'back'
                ? 'back'
                : data.action === 'close'
                ? 'close'
                : 'open';
            this.cb.onDeviceAction?.(act, data.appId);
            return;
          }

          if (data.type === 'audio' && data.data) {
            this.cb.onUserSpeakingChange(false);
            audioService.enqueueLivePcm24k(data.data);
            return;
          }

          if (data.type === 'interrupted') {
            audioService.clearLiveQueue();
            return;
          }

          if (data.type === 'user_transcript' && data.text) {
            this.liveUserTurnText = (this.liveUserTurnText + ' ' + data.text).replace(/\s+/g, ' ').trim();
            this.cb.onUserTranscript(this.liveUserTurnText);
            this.checkAndFireVoiceCommand(this.liveUserTurnText);
            return;
          }

          if (data.type === 'zara_transcript' && data.text) {
            this.liveZaraTurnText = (this.liveZaraTurnText + data.text).replace(/\s+/g, ' ');
            this.cb.onZaraTranscript(this.liveZaraTurnText.trim(), false);
            return;
          }

          if (data.type === 'turn_complete') {
            const u = this.liveUserTurnText.trim();
            const z = this.liveZaraTurnText.trim();
            if (u) this.checkAndFireVoiceCommand(u);
            if (z) {
              this.cb.onZaraTranscript(z, true);
            }
            if (u && z) {
              this.cb.onTurnPairComplete(u, z);
            }
            this.liveUserTurnText = '';
            this.liveZaraTurnText = '';
            this.lastDispatchedTurnCmd = '';
            return;
          }

          if (data.type === 'live_unavailable' || data.type === 'live_closed' || data.type === 'error') {
            window.clearTimeout(connectTimeout);
            this.switchToSteadyFallback(true);
          }
        } catch {}
      };

      ws.onerror = () => {
        window.clearTimeout(connectTimeout);
        this.switchToSteadyFallback(true);
      };

      ws.onclose = () => {
        window.clearTimeout(connectTimeout);
        if (this.isRunning && !this.useFallbackMode) {
          this.switchToSteadyFallback(true);
        }
      };
    } catch {
      this.switchToSteadyFallback(true);
    }
  }

  private switchToSteadyFallback(playGreeting = false) {
    if (!this.isRunning || this.useFallbackMode) return;
    this.useFallbackMode = true;
    this.liveSetupReady = false;
    try {
      this.ws?.close();
    } catch {}
    this.ws = null;
    this.cb.onStatusChange('fallback_connected');
    audioService.playChime('call_connect');
    if (playGreeting && !this.liveZaraTurnText) {
      const greetingText =
        this.language === 'english'
          ? 'Audio call connected. Speak anytime, I am listening.'
          : 'السلام علیکم! آڈیو کال کنیکٹ ہو گئی ہے، اب آپ بات کریں میں سن رہی ہوں۔';
      this.cb.onZaraTranscript(greetingText, true);
      const snap = getOwnerAuthSnapshot();
      audioService.speakText(greetingText, {
        language: this.language,
        rate: this.config.voiceSpeed,
        voiceName: this.config.voiceName || 'Zephyr',
        loveMode: snap.isOwnerVerified ? this.config.loveMode : false,
        emotionMode: snap.isOwnerVerified ? (this.config.emotionMode || 'apnapan') : 'calm',
      }).catch(() => {});
    }
  }

  private handleFallbackPcmFrame(pcm16: Int16Array, rms: number) {
    const now = Date.now();
    if (!this.vadHasSpoken && rms < this.fallbackNoiseFloor + 3) {
      this.fallbackNoiseFloor = Math.max(
        1.5,
        Math.min(6.0, this.fallbackNoiseFloor * 0.94 + rms * 0.06)
      );
    }
    const triggerRms = Math.max(3.6, Math.round(this.fallbackNoiseFloor * 1.42));
    const sustainRms = Math.max(2.1, Math.round(this.fallbackNoiseFloor * 1.1));
    const activeRms = this.vadHasSpoken ? sustainRms : triggerRms;

    if (!this.vadHasSpoken) {
      this.preRollChunks.push(pcm16);
      if (this.preRollChunks.length > 14) {
        this.preRollChunks.shift();
      }
    } else {
      this.activeUtteranceChunks.push(pcm16);
    }

    if (rms >= activeRms) {
      this.vadSpeechFrames += 1;
      this.vadLastVoiceTime = now;
      if (!this.vadHasSpoken && this.vadSpeechFrames >= 2) {
        this.vadHasSpoken = true;
        this.vadSpeechStart = now;
        this.activeUtteranceChunks = [...this.preRollChunks, pcm16];
        this.preRollChunks = [];
        this.cb.onUserSpeakingChange(true);
      }
    } else {
      this.vadSpeechFrames = Math.max(0, this.vadSpeechFrames - 1);
      if (this.vadHasSpoken) {
        if (now - this.vadLastVoiceTime >= 1650 || now - this.vadSpeechStart >= 28000) {
          const utterance = this.activeUtteranceChunks.slice();
          this.activeUtteranceChunks = [];
          this.vadHasSpoken = false;
          this.vadSpeechFrames = 0;
          this.cb.onUserSpeakingChange(false);

          if (utterance.length >= 3) {
            const boosted = normalizeQuietPcm16(utterance);
            const wavB64 = encodePcm16ChunksToWavBase64(boosted, 16000);
            this.sendFallbackTurn({ audioBase64: wavB64, mimeType: 'audio/wav' });
          }
        }
      }
    }
  }

  async sendTextInCall(text: string) {
    const clean = text.trim();
    if (!clean || !this.isRunning) return;

    audioService.stopAudio();
    this.liveUserTurnText = clean;
    this.cb.onUserTranscript(clean);
    this.checkAndFireVoiceCommand(clean);

    // Send latest camera/screen frame right before text if vision is active
    const frame = zaraVision.captureFrameBase64();

    if (!this.useFallbackMode && this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (frame?.base64) {
        this.ws.send(JSON.stringify({ type: 'video', data: frame.base64 }));
      }
      this.liveZaraTurnText = '';
      this.ws.send(JSON.stringify({ type: 'text', text: clean }));
      return;
    }

    await this.sendFallbackTurn({ spokenText: clean });
  }

  private async sendFallbackTurn(payload: { audioBase64?: string; mimeType?: string; spokenText?: string }) {
    if (!this.isRunning || this.isFallbackBusy) return;
    this.isFallbackBusy = true;

    const snap = getOwnerAuthSnapshot();
    const isOwnerVerified = snap.isOwnerVerified;

    try {
      if (!isAppOnline()) {
        throw new Error('offline_local_mode');
      }

      const historyPayload = this.history.slice(-22).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const frame = this.audioOnly ? null : zaraVision.captureFrameBase64();
      const authHeaders = await getOwnerAuthHeaders();

      const res = await fetchWithContainerWakeup(
        '/api/voice-chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...getTierRequestHeaders(),
          },
          body: JSON.stringify({
            ...payload,
            assistantId: this.config.activeAssistantId || 'zara',
            preferredReplyLanguage: this.config.preferredReplyLanguage || '',
            imageBase64: frame?.base64,
            visionSource: frame?.source,
            history: isOwnerVerified ? historyPayload : [],
            language: this.language,
            loveMode: isOwnerVerified ? this.config.loveMode : false,
            affectionLevel: this.config.affectionLevel,
            obedienceLevel: this.config.obedienceLevel,
            romanceIntensity: isOwnerVerified ? this.config.romanceIntensity : 'calm',
            emotionMode: isOwnerVerified ? (this.config.emotionMode || 'apnapan') : 'calm',
            unfilteredBoldTalk: isOwnerVerified ? (this.config.unfilteredBoldTalk ?? true) : false,
            userNickname: isOwnerVerified ? this.config.userNickname : 'Friend',
            voiceName: this.config.voiceName || 'Zephyr',
            memoryDigest: isOwnerVerified ? this.memoryDigest : '',
            brainMode: this.config.brainMode || 'auto',
            ttsEngine: this.config.ttsEngine || 'hunter_tts_ultra_premium',
            enabledAiEngines: this.config.enabledAiEngines,
          }),
        },
        { maxWakeRetries: 2 }
      );

      if (!this.isRunning) return;

      if (res.ok) {
        const data = await res.json();
        if (!data.silence && data.zaraReply) {
          if (data.userTranscription) {
            this.cb.onUserTranscript(data.userTranscription);
            this.checkAndFireVoiceCommand(data.userTranscription);
          }
          if (data.deviceAction?.appId) {
            const act =
              data.deviceAction.action === 'drop_call'
                ? 'drop_call'
                : data.deviceAction.action === 'close_zara'
                ? 'close_zara'
                : data.deviceAction.action === 'back'
                ? 'back'
                : data.deviceAction.action === 'close'
                ? 'close'
                : 'open';
            this.cb.onDeviceAction?.(act, data.deviceAction.appId);
          }
          this.cb.onZaraTranscript(data.zaraReply, true);
          if (data.userTranscription) {
            this.cb.onTurnPairComplete(data.userTranscription, data.zaraReply);
          }
          await audioService.speakText(data.zaraReply, {
            language: this.language,
            rate: this.config.voiceSpeed,
            voiceName: this.config.voiceName || 'Zephyr',
            loveMode: isOwnerVerified ? this.config.loveMode : false,
            romanceIntensity: isOwnerVerified ? this.config.romanceIntensity : 'calm',
            emotionMode: isOwnerVerified ? (this.config.emotionMode || 'apnapan') : 'calm',
            base64Audio: data.audio,
          });
        }
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (_err) {
      if (!this.isRunning) return;
      const fallbackUserText = payload.spokenText || 'Zara offline voice command';
      const offlineRes = await runOfflineZaraBrain({
        userText: fallbackUserText,
        language: this.language,
        isOwnerVerified,
        userNickname: isOwnerVerified ? this.config.userNickname : 'Friend',
        loveMode: isOwnerVerified ? this.config.loveMode : false,
        schedules: [],
        workTasks: [],
        memories: [],
      });
      this.cb.onZaraTranscript(offlineRes.replyText, true);
      if (payload.spokenText) {
        this.cb.onTurnPairComplete(payload.spokenText, offlineRes.replyText);
      }
      await audioService.speakText(offlineRes.replyText, {
        language: this.language,
        rate: this.config.voiceSpeed,
        voiceName: this.config.voiceName || 'Zephyr',
        loveMode: isOwnerVerified ? this.config.loveMode : false,
        romanceIntensity: isOwnerVerified ? this.config.romanceIntensity : 'calm',
        emotionMode: isOwnerVerified ? (this.config.emotionMode || 'apnapan') : 'calm',
      });
    } finally {
      this.isFallbackBusy = false;
    }
  }

  stop() {
    this.isRunning = false;
    audioService.stopAudio();

    if (this.visionTimer) {
      window.clearInterval(this.visionTimer);
      this.visionTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    if (this.detachAudio) {
      this.detachAudio();
      this.detachAudio = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }
}
