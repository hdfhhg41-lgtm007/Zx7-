import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, MonitorUp, FlipHorizontal } from 'lucide-react';
import { getZaraPortraitById, getAllZaraPortraits, EyeAnchor } from '../data/zaraPortraits';
import { Zara4DExpression, VisionMode } from '../types';
import { zaraVision } from '../services/visionAndControlService';

interface ZaraPortrait4DProps {
  portraitId?: string;
  onChangePortrait?: (nextId: string) => void;
  isSpeaking?: boolean;
  isListening?: boolean;
  loveMode?: boolean;
  expression?: Zara4DExpression;
  micVolume?: number;
  onTapZara?: () => void;
  showQuickCycle?: boolean;
  visionMode?: VisionMode;
  onFlipCamera?: () => void;
}

interface ButterflyParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  wingPhase: number;
  wingSpeed: number;
  depth: number;
  alpha: number;
}

export const ZaraPortrait4D: React.FC<ZaraPortrait4DProps> = ({
  portraitId,
  onChangePortrait,
  isSpeaking = false,
  isListening = false,
  loveMode = true,
  expression = 'smile',
  micVolume = 0,
  onTapZara,
  showQuickCycle = true,
  visionMode = 'off',
  onFlipCamera,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  const portrait = getZaraPortraitById(portraitId);
  const [staticScreenPreview, setStaticScreenPreview] = useState<string | null>(null);

  // Refs for 60fps animation loop without React re-renders
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imgLoadedRef = useRef(false);
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const currentLookRef = useRef({ x: 0, y: 0 });
  const speakingRef = useRef(isSpeaking);
  const listeningRef = useRef(isListening);
  const loveModeRef = useRef(loveMode);
  const expressionRef = useRef<Zara4DExpression>(expression);
  const micVolRef = useRef(micVolume);
  const portraitRef = useRef(portrait);

  useEffect(() => {
    speakingRef.current = isSpeaking;
  }, [isSpeaking]);
  useEffect(() => {
    listeningRef.current = isListening;
  }, [isListening]);
  useEffect(() => {
    loveModeRef.current = loveMode;
  }, [loveMode]);
  useEffect(() => {
    expressionRef.current = expression;
  }, [expression]);
  useEffect(() => {
    micVolRef.current = micVolume;
  }, [micVolume]);
  useEffect(() => {
    portraitRef.current = portrait;
  }, [portrait]);

  // Attach live camera / screen share preview stream to PIP video element
  useEffect(() => {
    return zaraVision.subscribe((_mode, stream, staticImg) => {
      setStaticScreenPreview(staticImg);
      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = stream || null;
        if (stream) {
          pipVideoRef.current.play().catch(() => {});
        }
      }
    });
  }, []);

  // Load selected high-resolution portrait image
  useEffect(() => {
    imgLoadedRef.current = false;
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      imgRef.current = img;
      imgLoadedRef.current = true;
    };
    img.src = portrait.src;
  }, [portrait.src]);

  // Device gyroscope tilt for realistic 4D parallax on mobile phones
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      const gx = Math.max(-1, Math.min(1, e.gamma / 25));
      const gy = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
      pointerTargetRef.current = { x: gx, y: gy };
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  // Main 60FPS 4D Living Portrait Canvas Loop (Eye Blinking + Gaze Tracking + Breathing + Butterflies + Lip Sync)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = 360;
    let height = 420;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(200, rect.width);
      height = Math.max(200, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);

    // Blink scheduler state
    let nextBlinkAt = performance.now() + 1400;
    let blinkStartAt = 0;
    let blinkDuration = 185;
    let pendingDoubleBlink = false;

    // Initialize 4D glowing butterflies & stardust
    const butterflies: ButterflyParticle[] = Array.from({ length: 8 }, (_, idx) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: -0.22 - Math.random() * 0.35,
      size: 6 + (idx % 3) * 3.5,
      wingPhase: Math.random() * Math.PI * 2,
      wingSpeed: 0.14 + Math.random() * 0.08,
      depth: idx < 3 ? 0.6 : 1.15,
      alpha: 0.55 + Math.random() * 0.38,
    }));

    const drawEyeOverlay = (
      eye: EyeAnchor,
      drawX: number,
      drawY: number,
      drawW: number,
      drawH: number,
      blinkAmt: number,
      gazeX: number,
      gazeY: number,
      skinTone: string,
      lashColor: string,
      irisGlow: string,
      isWinkEye: boolean
    ) => {
      const cx = drawX + eye.x * drawW;
      const cy = drawY + eye.y * drawH;
      const rx = eye.rx * drawW;
      const ry = eye.ry * drawH;

      const effectiveBlink = isWinkEye ? Math.max(blinkAmt, 0.96) : blinkAmt;

      // 1. Living Eye Contact Sparkle & Pupil Gaze Shift when eyes are open ("वो लड़की हमें देख रही है")
      if (effectiveBlink < 0.65) {
        const openFactor = 1 - effectiveBlink;
        const shiftX = gazeX * rx * 0.22;
        const shiftY = gazeY * ry * 0.2;

        ctx.save();
        // Subtle iris luminescence so her eyes feel wet, alive, and focused on you
        const irisGrad = ctx.createRadialGradient(
          cx + shiftX,
          cy + shiftY,
          0,
          cx + shiftX,
          cy + shiftY,
          rx * 0.55
        );
        irisGrad.addColorStop(0, `rgba(255, 255, 255, ${0.22 * openFactor})`);
        irisGrad.addColorStop(0.45, `${irisGlow}33`);
        irisGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.ellipse(cx + shiftX, cy + shiftY, rx * 0.55, ry * 0.78, 0, 0, Math.PI * 2);
        ctx.fill();

        // Living catchlight star dot that tracks user position
        ctx.fillStyle = `rgba(255, 255, 255, ${0.88 * openFactor})`;
        ctx.beginPath();
        ctx.arc(cx - rx * 0.16 + shiftX * 1.25, cy - ry * 0.24 + shiftY * 1.15, Math.max(1.4, rx * 0.1), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * openFactor})`;
        ctx.beginPath();
        ctx.arc(cx + rx * 0.18 + shiftX * 0.9, cy + ry * 0.2 + shiftY * 0.9, Math.max(0.9, rx * 0.06), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. Smooth Natural Upper Eyelid Blink ("इसकी आंखें झपकनी चाहिए")
      if (effectiveBlink > 0.03) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 1.16, ry * 1.32, 0, 0, Math.PI * 2);
        ctx.clip();

        const lidBottomY = cy - ry * 1.2 + effectiveBlink * (ry * 2.42);
        const lidGrad = ctx.createLinearGradient(cx, cy - ry * 1.3, cx, lidBottomY);
        lidGrad.addColorStop(0, skinTone);
        lidGrad.addColorStop(0.78, skinTone);
        lidGrad.addColorStop(1, '#c89b9e');

        ctx.fillStyle = lidGrad;
        ctx.beginPath();
        ctx.moveTo(cx - rx * 1.25, cy - ry * 1.4);
        ctx.lineTo(cx + rx * 1.25, cy - ry * 1.4);
        ctx.lineTo(cx + rx * 1.25, lidBottomY - ry * 0.15);
        ctx.quadraticCurveTo(cx, lidBottomY + ry * 0.32 * effectiveBlink, cx - rx * 1.25, lidBottomY - ry * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Delicate curved upper eyelash sweeping downward with the blink
        ctx.save();
        ctx.strokeStyle = lashColor;
        ctx.lineWidth = Math.max(1.6, ry * 0.22);
        ctx.lineCap = 'round';
        const lashCurveY = cy - ry * 0.92 + effectiveBlink * (ry * 2.05);
        ctx.beginPath();
        ctx.moveTo(cx - rx * 1.02, cy + ry * 0.06);
        ctx.quadraticCurveTo(cx, lashCurveY, cx + rx * 1.04, cy + ry * 0.08);
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawButterfly = (b: ButterflyParticle, color: string, timeSec: number) => {
      const flap = Math.abs(Math.cos(b.wingPhase + timeSec * 5.2));
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx) * 0.22);
      ctx.globalAlpha = b.alpha;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color;

      // Left upper & lower wing
      ctx.beginPath();
      ctx.ellipse(-b.size * 0.45 * flap, -b.size * 0.2, b.size * 0.55 * flap + 0.8, b.size * 0.36, -0.35, 0, Math.PI * 2);
      ctx.fill();

      // Right upper & lower wing
      ctx.beginPath();
      ctx.ellipse(b.size * 0.45 * flap, -b.size * 0.2, b.size * 0.55 * flap + 0.8, b.size * 0.36, 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Glowing core body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1.1, b.size * 0.14), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const renderFrame = (now: number) => {
      const timeSec = now * 0.001;
      const p = portraitRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Background cosmic night base
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.35,
        20,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.8
      );
      bgGrad.addColorStop(0, '#121a3d');
      bgGrad.addColorStop(0.6, '#08071c');
      bgGrad.addColorStop(1, '#04020c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Combine camera face-tracking target (when camera vision is active) + touch/tilt + natural gentle eye contact wander
      const visionGaze = zaraVision.getMode() === 'camera' ? zaraVision.getUserGazeTarget() : { x: 0, y: 0 };
      const idleMicroX = Math.sin(timeSec * 0.85) * 0.14;
      const idleMicroY = Math.cos(timeSec * 0.65) * 0.1;
      const targetX = Math.max(-1, Math.min(1, pointerTargetRef.current.x * 0.7 + visionGaze.x * 0.9 + idleMicroX));
      const targetY = Math.max(-1, Math.min(1, pointerTargetRef.current.y * 0.7 + visionGaze.y * 0.8 + idleMicroY));

      currentLookRef.current.x += (targetX - currentLookRef.current.x) * 0.075;
      currentLookRef.current.y += (targetY - currentLookRef.current.y) * 0.075;

      const lx = currentLookRef.current.x;
      const ly = currentLookRef.current.y;

      // Natural Blink State Machine
      let blinkAmt = 0;
      if (now >= nextBlinkAt && blinkStartAt === 0) {
        blinkStartAt = now;
        blinkDuration = pendingDoubleBlink ? 155 : 180;
      }
      if (blinkStartAt > 0) {
        const elapsed = now - blinkStartAt;
        if (elapsed >= blinkDuration) {
          blinkStartAt = 0;
          if (pendingDoubleBlink) {
            pendingDoubleBlink = false;
            nextBlinkAt = now + 2600 + Math.random() * 2200;
          } else if (Math.random() < 0.26) {
            pendingDoubleBlink = true;
            nextBlinkAt = now + 130;
          } else {
            nextBlinkAt = now + 2400 + Math.random() * 2100;
          }
        } else {
          const phase = elapsed / blinkDuration;
          blinkAmt = Math.sin(phase * Math.PI);
        }
      }

      if (imgLoadedRef.current && imgRef.current) {
        const img = imgRef.current;
        const iw = img.naturalWidth || 768;
        const ih = img.naturalHeight || 1024;

        // Cover viewport + extra 4D parallax margin + gentle breathing zoom
        const breathWave = Math.sin(timeSec * 2.15);
        const speakPulse = speakingRef.current
          ? (Math.sin(timeSec * 16.5) * 0.5 + 0.5) * (Math.cos(timeSec * 9.3) * 0.35 + 0.65)
          : 0;

        const baseZoom = (p.cropZoom || 1.0) * (1.06 + breathWave * 0.009 + speakPulse * 0.008);
        const scale = Math.max(width / iw, height / ih) * baseZoom;
        const drawW = iw * scale;
        const drawH = ih * scale;

        // Center upper-head nicely in mobile frame + 4D parallax translation
        const parallaxX = lx * 11;
        const parallaxY = ly * 7 + breathWave * 2.2;
        const panOffsetY = (p.cropPanY || 0) * drawH;
        const drawX = (width - drawW) * 0.5 + parallaxX;
        const drawY = (height - drawH) * 0.22 + parallaxY + panOffsetY;

        ctx.save();
        if (p.colorFilter) {
          ctx.filter = p.colorFilter;
        }

        // Draw main 4D portrait with subtle 3D perspective tilt via horizontal depth strips
        const strips = 14;
        const srcStripH = ih / strips;
        const dstStripH = drawH / strips;
        for (let s = 0; s < strips; s++) {
          const normY = s / strips;
          // Head & shoulders shift slightly more than far edges for living 4D depth!
          const depthCurve = Math.sin(normY * Math.PI);
          const stripShiftX = lx * depthCurve * 5.5;
          const chestBreathY = normY > 0.52 ? breathWave * (normY - 0.52) * 6.5 : 0;

          ctx.drawImage(
            img,
            0,
            s * srcStripH,
            iw,
            srcStripH + 1.2,
            drawX + stripShiftX,
            drawY + s * dstStripH + chestBreathY,
            drawW,
            dstStripH + 1.2
          );
        }

        // Subtle Live Lip / Lower-Jaw Articulation when Zara is speaking
        if (speakingRef.current && speakPulse > 0.08) {
          const mx = p.mouth.x;
          const my = p.mouth.y;
          const mw = p.mouth.w;
          const mh = p.mouth.h;

          const headShiftX = lx * Math.sin(my * Math.PI) * 5.5;
          const mouthCenterX = drawX + headShiftX + mx * drawW;
          const mouthCenterY = drawY + my * drawH;
          const patchW = mw * drawW * 1.25;
          const patchH = mh * drawH * 1.7;
          const jawOpenPx = speakPulse * Math.max(2.2, mh * drawH * 0.28);

          ctx.save();
          ctx.beginPath();
          ctx.ellipse(mouthCenterX, mouthCenterY + patchH * 0.15, patchW * 0.52, patchH * 0.55, 0, 0, Math.PI * 2);
          ctx.clip();

          // Redraw lower lip/chin slightly shifted down for organic speaking movement
          ctx.drawImage(
            img,
            (mx - mw * 0.65) * iw,
            my * ih,
            mw * 1.3 * iw,
            mh * 1.4 * ih,
            mouthCenterX - patchW * 0.5,
            mouthCenterY + jawOpenPx,
            patchW,
            patchH * 0.85
          );

          // Soft warm inner-lip shadow line during syllable peaks
          ctx.fillStyle = `rgba(92, 24, 48, ${0.34 * speakPulse})`;
          ctx.beginPath();
          ctx.ellipse(
            mouthCenterX,
            mouthCenterY + mh * drawH * 0.04,
            mw * drawW * 0.26,
            Math.max(1.2, jawOpenPx * 0.58),
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.restore();
        }

        ctx.restore();

        // Eye Blinking + Living Gaze Overlays (aligned with exact strip shift at eye Y)
        const eyeStripShift = lx * Math.sin(p.leftEye.y * Math.PI) * 5.5;
        drawEyeOverlay(
          p.leftEye,
          drawX + eyeStripShift,
          drawY,
          drawW,
          drawH,
          blinkAmt,
          lx,
          ly,
          p.skinTone,
          p.lashColor,
          p.irisHighlight,
          false
        );

        if (p.rightEye) {
          drawEyeOverlay(
            p.rightEye,
            drawX + eyeStripShift,
            drawY,
            drawW,
            drawH,
            blinkAmt,
            lx,
            ly,
            p.skinTone,
            p.lashColor,
            p.irisHighlight,
            expressionRef.current === 'wink'
          );
        }

        // Romantic Cheek Blush Glow when Love Mode or Blush/Love expression is active
        if (loveModeRef.current || expressionRef.current === 'blush' || expressionRef.current === 'love') {
          const blushAlpha =
            expressionRef.current === 'blush' || expressionRef.current === 'love' ? 0.24 : 0.11;
          const drawCheek = (cxNorm: number, cyNorm: number) => {
            const cx = drawX + eyeStripShift + cxNorm * drawW;
            const cy = drawY + cyNorm * drawH;
            const r = drawW * 0.065;
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            g.addColorStop(0, `rgba(244, 114, 182, ${blushAlpha})`);
            g.addColorStop(1, 'rgba(244, 114, 182, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
          };
          drawCheek(p.leftEye.x - 0.03, p.leftEye.y + 0.055);
          if (p.rightEye) {
            drawCheek(p.rightEye.x + 0.03, p.rightEye.y + 0.055);
          }
        }
      }

      // 4D Floating Bioluminescent Butterflies & Voice-Reactive Stardust
      const energyBoost = speakingRef.current ? 1.8 : listeningRef.current ? 1 + micVolRef.current / 70 : 1;
      for (const b of butterflies) {
        b.x += b.vx * energyBoost + lx * 0.35 * b.depth;
        b.y += b.vy * energyBoost + Math.sin(timeSec * 2 + b.wingPhase) * 0.2;
        b.wingPhase += b.wingSpeed * energyBoost;

        if (b.y < -20) {
          b.y = height + 15;
          b.x = Math.random() * width;
        }
        if (b.x < -20) b.x = width + 15;
        if (b.x > width + 20) b.x = -15;

        drawButterfly(b, p.butterflyColor, timeSec);
      }

      // Subtle cinematic bottom vignette + speaking/listening aura rim
      const rimGrad = ctx.createLinearGradient(0, height * 0.72, 0, height);
      rimGrad.addColorStop(0, 'rgba(7, 3, 19, 0)');
      rimGrad.addColorStop(1, 'rgba(7, 3, 19, 0.82)');
      ctx.fillStyle = rimGrad;
      ctx.fillRect(0, height * 0.72, width, height * 0.28);

      if (speakingRef.current || listeningRef.current) {
        const pulseAlpha = speakingRef.current
          ? 0.28 + Math.sin(timeSec * 10) * 0.12
          : 0.18 + Math.min(0.25, micVolRef.current / 220);
        ctx.strokeStyle = listeningRef.current
          ? `rgba(52, 211, 153, ${pulseAlpha})`
          : `${p.accentHex}${Math.round(pulseAlpha * 255)
              .toString(16)
              .padStart(2, '0')}`;
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, width - 3, height - 3);
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
    pointerTargetRef.current = {
      x: Math.max(-1, Math.min(1, nx)),
      y: Math.max(-1, Math.min(1, ny)),
    };
  };

  const handlePointerLeave = () => {
    pointerTargetRef.current = { x: 0, y: 0 };
  };

  const handleCyclePortrait = (dir: -1 | 1, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onChangePortrait) return;
    const all = getAllZaraPortraits();
    const idx = all.findIndex((item) => item.id === portrait.id);
    const nextIdx = (idx + dir + all.length) % all.length;
    onChangePortrait(all[nextIdx].id);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onTapZara}
      className="relative w-full h-full select-none overflow-hidden cursor-pointer bg-[#060314]"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Quick Left / Right 4D Portrait Switcher Buttons */}
      {showQuickCycle && onChangePortrait && (
        <>
          <button
            type="button"
            onClick={(e) => handleCyclePortrait(-1, e)}
            aria-label="Previous Zara Photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#09041a]/80 border border-blue-400/40 text-blue-200 hover:text-white hover:border-pink-400 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => handleCyclePortrait(1, e)}
            aria-label="Next Zara Photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#09041a]/80 border border-blue-400/40 text-blue-200 hover:text-white hover:border-pink-400 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Live Camera / Screen Share PIP Preview (Shows what Zara is currently seeing!) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-2.5 right-2.5 z-20 rounded-2xl overflow-hidden border-2 border-cyan-400/80 bg-[#050210] shadow-[0_0_20px_rgba(34,211,238,0.45)] transition-all ${
          visionMode !== 'off' ? 'w-24 h-32 opacity-100' : 'w-0 h-0 opacity-0 pointer-events-none border-0'
        }`}
      >
        {staticScreenPreview ? (
          <img
            src={staticScreenPreview}
            alt="Shared Screen"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            ref={pipVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${
              visionMode === 'camera' && zaraVision.getFacingMode() === 'user' ? '-scale-x-100' : ''
            }`}
          />
        )}

        <div className="absolute top-1 left-1 right-1 flex items-center justify-between px-1.5 py-0.5 rounded-md bg-black/75 text-[9px] font-bold text-cyan-300">
          <span className="flex items-center gap-1 truncate">
            {visionMode === 'screen' ? (
              <>
                <MonitorUp className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <span>Screen</span>
              </>
            ) : (
              <>
                <Eye className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                <span>Seeing You</span>
              </>
            )}
          </span>

          {visionMode === 'camera' && onFlipCamera && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFlipCamera();
              }}
              title="Flip Front/Back Camera"
              className="p-0.5 text-white hover:text-pink-300 cursor-pointer"
            >
              <FlipHorizontal className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Subtle Current Look Name Tag at Bottom Left */}
      <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none text-[10px] font-medium text-blue-100/90 bg-[#070318]/80 px-2.5 py-0.5 rounded-lg border border-blue-400/25">
        4D • {portrait.name}
      </div>
    </div>
  );
};
