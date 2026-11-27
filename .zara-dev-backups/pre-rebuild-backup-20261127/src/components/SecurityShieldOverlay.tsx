import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Fingerprint,
  Lock,
  Mic,
  Power,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import {
  captureVideoFrameDataUrl,
  verifyOwnerBiometricPasskey,
  verifyOwnerFaceWithServer,
} from '../services/ownerSecurityAndBuilderService';
import { audioService } from '../services/audioService';

export type SecurityOverlayMode = 'owner_face_scan' | 'intruder_lockout' | 'zara_closed';

interface SecurityShieldOverlayProps {
  mode: SecurityOverlayMode;
  ownerName: string;
  ownerFaceDataUrl?: string;
  pinCode: string;
  biometricLockEnabled?: boolean;
  biometricCredentialId?: string;
  intruderReason?: string;
  backgroundVoiceActive?: boolean;
  onVerifiedOwner: () => void;
  onIntruderDetected: (reason: string, snapshotDataUrl?: string) => void;
  onRepeatIntruderVoice: () => void;
  onReopenZaraFromClosed: () => void;
}

export const SecurityShieldOverlay: React.FC<SecurityShieldOverlayProps> = ({
  mode,
  ownerName,
  ownerFaceDataUrl,
  pinCode,
  biometricLockEnabled = false,
  biometricCredentialId,
  intruderReason,
  backgroundVoiceActive = true,
  onVerifiedOwner,
  onIntruderDetected,
  onRepeatIntruderVoice,
  onReopenZaraFromClosed,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoScanTimerRef = useRef<number | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('Opening camera for Owner Face Verification...');
  const [showPinUnlock, setShowPinUnlock] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showFaceScannerOnLockout, setShowFaceScannerOnLockout] = useState(false);
  const [isVerifyingBio, setIsVerifyingBio] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  const shouldRunCamera =
    mode === 'owner_face_scan' || (mode === 'intruder_lockout' && showFaceScannerOnLockout);

  const stopCamera = () => {
    if (autoScanTimerRef.current) {
      window.clearTimeout(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  useEffect(() => {
    if (!shouldRunCamera) {
      stopCamera();
      return;
    }

    let cancelled = false;
    setScanMessage('Camera open — scanning Owner face...');

    // Safety watchdog: if mobile WebAPK camera hangs > 4.5s on open, immediately expose PIN unlock so app never stalls
    const cameraHangTimer = window.setTimeout(() => {
      if (!cancelled && !streamRef.current) {
        setShowPinUnlock(true);
        setScanMessage('Camera busy on mobile — enter Owner PIN below to open immediately.');
      }
    }, 4500);

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        window.clearTimeout(cameraHangTimer);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
        // Automatically scan owner face once camera stabilizes
        autoScanTimerRef.current = window.setTimeout(() => {
          if (!cancelled) {
            handlePerformFaceScan();
          }
        }, 1400);
      })
      .catch(() => {
        window.clearTimeout(cameraHangTimer);
        if (!cancelled) {
          setCameraReady(false);
          setScanMessage('Camera unavailable — unlock with Owner PIN below.');
          setShowPinUnlock(true);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(cameraHangTimer);
      stopCamera();
    };
  }, [shouldRunCamera]);

  const handlePerformFaceScan = async () => {
    if (isScanning || !videoRef.current || !ownerFaceDataUrl) return;
    const frame = captureVideoFrameDataUrl(videoRef.current);
    if (!frame) {
      setScanMessage('Align your face in front of the camera and tap Verify Face.');
      return;
    }

    setIsScanning(true);
    setScanMessage('Verifying Owner Face Identity...');
    audioService.unlock();

    try {
      const result = await verifyOwnerFaceWithServer(ownerFaceDataUrl, frame);
      if (result.verified) {
        stopCamera();
        onVerifiedOwner();
      } else {
        stopCamera();
        setShowFaceScannerOnLockout(false);
        onIntruderDetected(
          `Unauthorized person detected on Face Lock (${result.reason})`,
          frame
        );
      }
    } catch {
      setScanMessage('Could not reach verification server — retry or enter Owner PIN.');
      setShowPinUnlock(true);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePinChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setPinInput(clean);
    setPinError(false);

    if (clean.length === 4) {
      if (clean === (pinCode || '1234')) {
        audioService.unlock();
        stopCamera();
        setPinInput('');
        onVerifiedOwner();
      } else {
        setPinError(true);
        setPinInput('');
        const snap = videoRef.current ? captureVideoFrameDataUrl(videoRef.current) || undefined : undefined;
        onIntruderDetected('Wrong PIN login attempt on mobile!', snap);
      }
    }
  };

  const handleBiometricUnlock = async () => {
    if (isVerifyingBio) return;
    setBioError(null);
    setIsVerifyingBio(true);
    audioService.unlock();
    try {
      const verified = await verifyOwnerBiometricPasskey(biometricCredentialId);
      if (verified) {
        stopCamera();
        onVerifiedOwner();
      } else {
        setBioError('Fingerprint / Biometric prompt canceled — try again or use PIN.');
      }
    } finally {
      setIsVerifyingBio(false);
    }
  };

  // MODE C: Zara Closed / Background Standby Screen ("Zara app close karo / band kar do")
  if (mode === 'zara_closed') {
    return (
      <div
        onClick={() => audioService.unlock()}
        className="fixed inset-0 z-[90] bg-black flex flex-col items-center justify-center p-6 text-center select-none"
      >
        <div className="max-w-xs space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-900 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            {backgroundVoiceActive ? <Mic className="w-7 h-7" /> : <Power className="w-7 h-7 text-slate-400" />}
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-slate-100">
              Zara Background Standby
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {backgroundVoiceActive
                ? 'اسکرین بند ہے لیکن زارا وائس کمانڈر بیک گراؤنڈ میں سن رہی ہے — سائیڈ سے "زارا!" پکاریں تو وہ فوراً جواب دے گی!'
                : 'Zara screen is closed on your command.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              audioService.unlock();
              onReopenZaraFromClosed();
            }}
            className="min-h-[46px] w-full py-2.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-extrabold cursor-pointer transition-colors"
          >
            Wake &amp; Open Zara Screen
          </button>
        </div>
      </div>
    );
  }

  // MODE B: Full Phone Screen Lockout (Someone touched the phone or tried unauthorized login!)
  if (mode === 'intruder_lockout' && !showFaceScannerOnLockout) {
    return (
      <div
        onClick={() => audioService.unlock()}
        className="fixed inset-0 z-[95] bg-[#050003] flex flex-col items-center justify-center p-5 text-white select-none"
      >
        <div className="w-full max-w-sm rounded-3xl bg-[#14040a] border border-rose-500/60 p-6 space-y-4 text-center shadow-[0_0_60px_rgba(244,63,94,0.35)]">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-600/20 border border-rose-500 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-white">Phone Screen Locked</h1>
            <p className="text-xs text-rose-300 font-medium">
              {intruderReason || 'Unauthorized touch or login attempt detected!'}
            </p>
            <p className="text-[11px] text-slate-400 pt-1">
              Protected by Zara for Owner: <strong className="text-amber-300">{ownerName}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onRepeatIntruderVoice}
            className="min-h-[40px] w-full py-2 px-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Volume2 className="w-4 h-4 shrink-0" />
            <span>Play Zara Voice Security Alert</span>
          </button>

          <div className="pt-2 space-y-2.5 border-t border-rose-900/40">
            {biometricLockEnabled && (
              <button
                type="button"
                disabled={isVerifyingBio}
                onClick={handleBiometricUnlock}
                className="min-h-[44px] w-full py-2.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Fingerprint className="w-4 h-4 shrink-0" />
                <span>
                  {isVerifyingBio ? 'Verifying Fingerprint...' : 'Unlock with Fingerprint / Biometric'}
                </span>
              </button>
            )}
            {ownerFaceDataUrl && (
              <button
                type="button"
                onClick={() => setShowFaceScannerOnLockout(true)}
                className="min-h-[44px] w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <ScanFace className="w-4 h-4 shrink-0" />
                <span>Unlock with Owner Face Scan</span>
              </button>
            )}
            {bioError && <p className="text-[11px] text-amber-300 font-semibold">{bioError}</p>}

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 block">
                Or enter Owner 4-Digit Master PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => handlePinChange(e.target.value)}
                placeholder="••••"
                className="w-full py-2.5 rounded-xl bg-black border border-rose-500/40 text-center text-xl tracking-[0.55em] font-mono text-white focus:outline-none focus:border-emerald-400"
              />
              {pinError && (
                <p className="text-[11px] text-rose-400 font-semibold">
                  Wrong PIN! Intruder alert recorded.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MODE A: Owner-Only Face Verification Gate on Open (or when scanning from lockout)
  return (
    <div className="fixed inset-0 z-[95] bg-[#04020d] flex flex-col items-center justify-center p-4 text-white select-none">
      <div className="w-full max-w-sm rounded-3xl bg-[#0e0722] border border-cyan-500/45 p-5 space-y-4 text-center shadow-[0_0_50px_rgba(6,182,212,0.28)]">
        <div className="flex items-center justify-center gap-2 text-cyan-300">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm font-bold">Owner Face Verification</span>
        </div>

        <p className="text-xs text-slate-300">
          Scanning camera exclusively for Owner{' '}
          <strong className="text-amber-300">{ownerName}</strong>
        </p>

        {/* Live Front Camera Scanner Frame */}
        <div className="relative w-56 h-56 mx-auto rounded-full overflow-hidden border-2 border-cyan-400 bg-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.35)]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {!cameraReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Camera className="w-7 h-7" />
              <span className="text-[11px]">Starting Camera...</span>
            </div>
          )}
          <div className="absolute inset-2 rounded-full border border-dashed border-pink-400/60 pointer-events-none" />
        </div>

        <p className="text-xs text-cyan-200 min-h-[18px]">{scanMessage}</p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isScanning || !cameraReady}
            onClick={handlePerformFaceScan}
            className="min-h-[42px] py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ScanFace className="w-4 h-4 shrink-0" />
            <span>{isScanning ? 'Scanning...' : 'Verify Face'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPinUnlock((prev) => !prev)}
            className="min-h-[42px] py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Use PIN</span>
          </button>
        </div>

        {biometricLockEnabled && (
          <button
            type="button"
            disabled={isVerifyingBio}
            onClick={handleBiometricUnlock}
            className="min-h-[40px] w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Fingerprint className="w-4 h-4 shrink-0" />
            <span>
              {isVerifyingBio ? 'Waiting for Fingerprint...' : 'Unlock with Fingerprint / Biometrics'}
            </span>
          </button>
        )}
        {bioError && <p className="text-[11px] text-amber-300 font-semibold">{bioError}</p>}

        {showPinUnlock && (
          <div className="pt-2 space-y-1.5 border-t border-slate-800">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="Owner 4-Digit PIN"
              className="w-full py-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-center text-base tracking-[0.35em] font-mono text-white focus:outline-none focus:border-pink-500"
            />
            {pinError && (
              <p className="text-[11px] text-rose-400 font-semibold">
                Wrong PIN — Phone Lockout Triggered!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
