import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, FlipHorizontal, MonitorUp, X } from 'lucide-react';
import aiTeamStudioImg from '../assets/images/zara_ai_team_studio_1793789896669.jpg';
import zaraFullBodySmilingImg from '../assets/images/zara_fullbody_smiling_1792834142233.jpg';
import zaraTerraceBackdropImg from '../assets/images/zara_terrace_backdrop_1792834143540.jpg';
import { EyeAnchor, getZaraPortraitById, ZaraPortraitItem } from '../data/zaraPortraits';
import { StudioTaskActivity, VisionMode } from '../types';
import { zaraVision } from '../services/visionAndControlService';
import { audioService } from '../services/audioService';

interface ZaraLivingBackgroundProps {
  portraitId?: string;
  isSpeaking: boolean;
  isListening: boolean;
  visionMode: VisionMode;
  ambientVisionSilent?: boolean;
  studioTask?: StudioTaskActivity | null;
  isOnline?: boolean;
  isOwnerVerified?: boolean;
  onTapZara?: () => void;
  onFlipCamera?: () => void;
  onSnapPhotoToChat?: () => void;
  onTurnOffVision?: () => void;
}

interface WarmBokehMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  warmRose: boolean;
}

export const ZaraLivingBackground: React.FC<ZaraLivingBackgroundProps> = ({
  portraitId,
  isSpeaking,
  isListening,
  visionMode,
  ambientVisionSilent = false,
  studioTask = null,
  isOnline = true,
  isOwnerVerified = false,
  onTapZara,
  onFlipCamera,
  onSnapPhotoToChat,
  onTurnOffVision,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  const activePortrait = useMemo(() => getZaraPortraitById(portraitId), [portraitId]);
  const activePortraitRef = useRef<ZaraPortraitItem>(activePortrait);
  const studioTaskRef = useRef<StudioTaskActivity | null>(studioTask);

  const [imgReady, setImgReady] = useState(false);
  const [staticScreenPreview, setStaticScreenPreview] = useState<string | null>(null);
  const [liveFacing, setLiveFacing] = useState<'user' | 'environment'>(() =>
    zaraVision.getFacingMode()
  );

  const portraitImgRef = useRef<HTMLImageElement | null>(null);
  const backdropImgRef = useRef<HTMLImageElement | null>(null);
  const speakingRef = useRef(isSpeaking);
  const listeningRef = useRef(isListening);
  const pointerRef = useRef({ x: 0, y: 0 });
  const smoothLookRef = useRef({ x: 0, y: 0 });
  const smileBoostUntilRef = useRef<number>(performance.now() + 3500);

  useEffect(() => {
    activePortraitRef.current = activePortrait;
  }, [activePortrait]);

  useEffect(() => {
    studioTaskRef.current = studioTask;
  }, [studioTask]);

  useEffect(() => {
    speakingRef.current = isSpeaking;
    if (isSpeaking) {
      smileBoostUntilRef.current = performance.now() + 2600;
    }
  }, [isSpeaking]);

  useEffect(() => {
    listeningRef.current = isListening;
  }, [isListening]);

  // Subscribe to camera/screen stream (supports both silent ambient vision and explicit video call PiP)
  useEffect(() => {
    return zaraVision.subscribe((_mode, stream, staticImg, facing) => {
      setStaticScreenPreview(staticImg);
      setLiveFacing(facing);
      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = stream || null;
        if (stream) {
          pipVideoRef.current.play().catch(() => {});
        }
      }
    });
  }, [ambientVisionSilent, visionMode]);

  // Preload twilight marble courtyard backdrop once for non-studio portraits
  useEffect(() => {
    const bgImg = new Image();
    bgImg.referrerPolicy = 'no-referrer';
    bgImg.onload = () => {
      backdropImgRef.current = bgImg;
    };
    bgImg.src = zaraTerraceBackdropImg;
  }, []);

  // Load selected HD Broadcast Studio or Portrait Image whenever portraitId changes
  useEffect(() => {
    let cancelled = false;
    const mainImg = new Image();
    mainImg.referrerPolicy = 'no-referrer';
    mainImg.onload = () => {
      if (cancelled) return;
      portraitImgRef.current = mainImg;
      setImgReady(true);
    };
    mainImg.onerror = () => {
      if (cancelled) return;
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        if (cancelled) return;
        portraitImgRef.current = fallbackImg;
        setImgReady(true);
      };
      fallbackImg.src = aiTeamStudioImg || zaraFullBodySmilingImg;
    };
    mainImg.src = activePortrait.src || aiTeamStudioImg || zaraFullBodySmilingImg;
    return () => {
      cancelled = true;
    };
  }, [activePortrait.src, activePortrait.id]);

  // Mobile gyroscope tilt so Zara gazes naturally toward you as you tilt the phone
  useEffect(() => {
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      pointerRef.current = {
        x: Math.max(-1, Math.min(1, e.gamma / 24)),
        y: Math.max(-1, Math.min(1, (e.beta - 45) / 24)),
      };
    };
    window.addEventListener('deviceorientation', onOrientation);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, []);

  // 60FPS Living TV-Broadcast Studio + Zara + Male/Female AI Assistants Working Live on Screen
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = 400;
    let height = 780;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(240, rect.width);
      height = Math.max(360, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);

    let nextBlinkAt = performance.now() + 1800;
    let blinkStartAt = 0;
    let blinkDuration = 175;
    let pendingDoubleBlink = false;

    const motes: WarmBokehMote[] = Array.from({ length: 14 }, (_, idx) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.14 - Math.random() * 0.22,
      radius: 1.8 + (idx % 4) * 1.4,
      alpha: 0.2 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      warmRose: idx % 3 === 0,
    }));

    const drawLivingEye = (
      eye: EyeAnchor,
      skinTone: string,
      lashColor: string,
      baseX: number,
      baseY: number,
      drawW: number,
      drawH: number,
      blinkAmt: number,
      gazeX: number,
      gazeY: number,
      smileFactor: number
    ) => {
      const cx = baseX + eye.x * drawW;
      const cy = baseY + eye.y * drawH;
      const rx = eye.rx * drawW;
      const ry = eye.ry * drawH;

      const eyeSmileSquint = smileFactor * 0.16;
      const effectiveBlink = Math.min(1, Math.max(blinkAmt, eyeSmileSquint * 0.45));

      if (effectiveBlink < 0.72) {
        const openAlpha = 1 - effectiveBlink;
        const shiftX = gazeX * rx * 0.26;
        const shiftY = gazeY * ry * 0.24;

        ctx.save();
        ctx.fillStyle = `rgba(255, 252, 245, ${0.9 * openAlpha})`;
        ctx.beginPath();
        ctx.arc(
          cx - rx * 0.14 + shiftX * 1.3,
          cy - ry * 0.22 + shiftY * 1.15,
          Math.max(1.1, rx * 0.13),
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = `rgba(224, 242, 254, ${0.5 * openAlpha})`;
        ctx.beginPath();
        ctx.arc(
          cx + rx * 0.16 + shiftX * 0.9,
          cy + ry * 0.18 + shiftY * 0.9,
          Math.max(0.8, rx * 0.08),
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }

      if (blinkAmt > 0.04) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 1.18, ry * 1.38, 0, 0, Math.PI * 2);
        ctx.clip();

        const lidBottomY = cy - ry * 1.2 + blinkAmt * (ry * 2.45);
        ctx.fillStyle = skinTone;
        ctx.beginPath();
        ctx.moveTo(cx - rx * 1.25, cy - ry * 1.45);
        ctx.lineTo(cx + rx * 1.25, cy - ry * 1.45);
        ctx.lineTo(cx + rx * 1.25, lidBottomY - ry * 0.12);
        ctx.quadraticCurveTo(
          cx,
          lidBottomY + ry * 0.3 * blinkAmt,
          cx - rx * 1.25,
          lidBottomY - ry * 0.12
        );
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = lashColor;
        ctx.lineWidth = Math.max(1.2, ry * 0.24);
        ctx.lineCap = 'round';
        const lashY = cy - ry * 0.9 + blinkAmt * (ry * 2.05);
        ctx.beginPath();
        ctx.moveTo(cx - rx * 1.0, cy + ry * 0.06);
        ctx.quadraticCurveTo(cx, lashY, cx + rx * 1.0, cy + ry * 0.06);
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawAssistantHoloConsole = (
      side: 'left' | 'right',
      t: number,
      activeBoost: number,
      dispatchActive: boolean
    ) => {
      const isLeft = side === 'left';
      const panelW = Math.min(138, Math.max(88, width * 0.24));
      const panelH = Math.min(92, Math.max(64, height * 0.115));
      const px = isLeft ? Math.max(12, width * 0.045) : width - panelW - Math.max(12, width * 0.045);
      const py = height * 0.45 + Math.sin(t * 1.9 + (isLeft ? 0 : 1.7)) * 3.5;

      const primaryRgba = isLeft
        ? `rgba(56, 189, 248, ${0.22 + activeBoost * 0.36})`
        : `rgba(52, 211, 153, ${0.22 + activeBoost * 0.36})`;
      const strokeRgba = isLeft
        ? `rgba(125, 211, 252, ${0.42 + activeBoost * 0.45})`
        : `rgba(110, 231, 183, ${0.42 + activeBoost * 0.45})`;

      ctx.save();

      // Ambient holographic light cast onto assistant's hands & desk
      const deskGlow = ctx.createRadialGradient(
        px + panelW * 0.5,
        py + panelH * 0.85,
        4,
        px + panelW * 0.5,
        py + panelH * 0.85,
        panelW * 0.95
      );
      deskGlow.addColorStop(
        0,
        isLeft
          ? `rgba(56, 189, 248, ${0.18 + activeBoost * 0.25})`
          : `rgba(16, 185, 129, ${0.18 + activeBoost * 0.25})`
      );
      deskGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = deskGlow;
      ctx.beginPath();
      ctx.arc(px + panelW * 0.5, py + panelH * 0.85, panelW * 0.95, 0, Math.PI * 2);
      ctx.fill();

      // Translucent TV-studio holographic workstation screen
      ctx.fillStyle = 'rgba(7, 12, 26, 0.56)';
      ctx.strokeStyle = strokeRgba;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.roundRect(px, py, panelW, panelH, 10);
      ctx.fill();
      ctx.stroke();

      // Animated scanning sweep line inside workstation
      const scanY = py + 8 + ((t * (28 + activeBoost * 36) + (isLeft ? 0 : 24)) % (panelH - 16));
      ctx.strokeStyle = primaryRgba;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(px + 8, scanY);
      ctx.lineTo(px + panelW - 8, scanY);
      ctx.stroke();

      if (isLeft) {
        // Aryan (Male Assistant) — Live Hardware, System Settings & Code Execution Bars
        const bars = 7;
        const gap = 4;
        const usableW = panelW - 20;
        const bw = (usableW - gap * (bars - 1)) / bars;
        for (let b = 0; b < bars; b++) {
          const wave =
            0.28 +
            0.68 *
              Math.abs(
                Math.sin(t * (3.1 + activeBoost * 3.4) + b * 0.85) *
                  Math.cos(t * 1.7 + b * 0.4)
              );
          const bh = Math.max(6, (panelH - 28) * wave);
          const bx = px + 10 + b * (bw + gap);
          const by = py + panelH - 10 - bh;
          ctx.fillStyle =
            b % 2 === 0
              ? `rgba(56, 189, 248, ${0.55 + activeBoost * 0.4})`
              : `rgba(125, 211, 252, ${0.42 + activeBoost * 0.4})`;
          ctx.fillRect(bx, by, bw, bh);
        }
      } else {
        // Noor (Female Assistant) — Live Voice, Vision & App Dispatch Waveform
        ctx.strokeStyle = `rgba(52, 211, 153, ${0.7 + activeBoost * 0.3})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        const points = 18;
        for (let i = 0; i <= points; i++) {
          const nx = px + 10 + ((panelW - 20) * i) / points;
          const amp = (panelH * 0.24) * (0.45 + activeBoost * 0.55);
          const ny =
            py +
            panelH * 0.56 +
            Math.sin(t * (4.2 + activeBoost * 3.8) + i * 0.65) *
              Math.sin((i / points) * Math.PI) *
              amp;
          if (i === 0) ctx.moveTo(nx, ny);
          else ctx.lineTo(nx, ny);
        }
        ctx.stroke();

        // Typing keystroke pulse dots at bottom of Noor's console
        for (let k = 0; k < 5; k++) {
          const lit = Math.sin(t * (6 + activeBoost * 5) + k * 1.3) > 0.15;
          ctx.fillStyle = lit
            ? 'rgba(110, 231, 183, 0.9)'
            : 'rgba(110, 231, 183, 0.22)';
          ctx.beginPath();
          ctx.arc(px + 14 + k * 11, py + panelH - 9, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Command Dispatch Beam from Zara (Center) -> Assistant Console when Zara assigns work
      if (dispatchActive) {
        const startX = width * 0.5;
        const startY = height * 0.36;
        const endX = px + panelW * 0.5;
        const endY = py + panelH * 0.35;
        const ctrlX = (startX + endX) * 0.5;
        const ctrlY = Math.min(startY, endY) - 34;

        ctx.strokeStyle = isLeft
          ? 'rgba(56, 189, 248, 0.55)'
          : 'rgba(52, 211, 153, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -t * 48;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Traveling command packet orb along the curve
        const prog = (t * 1.35 + (isLeft ? 0 : 0.45)) % 1;
        const inv = 1 - prog;
        const orbX = inv * inv * startX + 2 * inv * prog * ctrlX + prog * prog * endX;
        const orbY = inv * inv * startY + 2 * inv * prog * ctrlY + prog * prog * endY;
        ctx.fillStyle = isLeft ? '#bae6fd' : '#a7f3d0';
        ctx.beginPath();
        ctx.arc(orbX, orbY, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const renderFrame = (now: number) => {
      const t = now * 0.001;
      const portrait = activePortraitRef.current;
      const currentTask = studioTaskRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Rich TV-broadcast studio dark slate base
      const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
      baseGrad.addColorStop(0, '#091122');
      baseGrad.addColorStop(0.55, '#0b1329');
      baseGrad.addColorStop(1, '#050711');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, width, height);

      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      const isStudioPortrait = Boolean(portrait.hasLiveAssistants);
      const strollScale = isStudioPortrait ? 0.35 : 1;

      const strollWavePrimary = reducedMotion ? 0 : Math.sin(t * 0.48) * strollScale;
      const strollWaveSecondary = reducedMotion ? 0 : Math.sin(t * 0.23 + 1.1) * strollScale;
      const strollNormX = strollWavePrimary * 0.72 + strollWaveSecondary * 0.28;
      const strollSpeed = reducedMotion
        ? 0
        : Math.abs(Math.cos(t * 0.48) * 0.72 + Math.cos(t * 0.23 + 1.1) * 0.28) * strollScale;

      const stepPhase = t * 2.65;
      const stepBobY = reducedMotion
        ? 0
        : Math.sin(stepPhase * 2) * (isStudioPortrait ? 1.5 : 3.2) * (0.45 + strollSpeed * 0.55);
      const bodySwayX = reducedMotion ? 0 : Math.sin(stepPhase) * (isStudioPortrait ? 1.4 : 2.6);
      const walkDepth = reducedMotion ? 0.5 : (Math.sin(t * 0.31) + 1) * 0.5;

      const camGaze =
        zaraVision.getMode() === 'camera' ? zaraVision.getUserGazeTarget() : { x: 0, y: 0 };
      const counterStrollGazeX = -strollNormX * 0.45;
      const targetLookX = Math.max(
        -1,
        Math.min(1, pointerRef.current.x * 0.65 + camGaze.x * 0.85 + counterStrollGazeX)
      );
      const targetLookY = Math.max(
        -1,
        Math.min(1, pointerRef.current.y * 0.65 + camGaze.y * 0.8 + Math.cos(t * 0.55) * 0.08)
      );

      smoothLookRef.current.x += (targetLookX - smoothLookRef.current.x) * 0.08;
      smoothLookRef.current.y += (targetLookY - smoothLookRef.current.y) * 0.08;
      const lx = smoothLookRef.current.x;
      const ly = smoothLookRef.current.y;

      const naturalSmileCycle = Math.max(0, Math.sin(t * 0.75 + 0.4));
      const interactionSmileBoost = now < smileBoostUntilRef.current ? 1 : 0;
      const smileFactor = Math.min(
        1,
        0.35 +
          naturalSmileCycle * 0.45 +
          interactionSmileBoost * 0.45 +
          (listeningRef.current ? 0.2 : 0)
      );

      let blinkAmt = 0;
      if (now >= nextBlinkAt && blinkStartAt === 0) {
        blinkStartAt = now;
        blinkDuration = pendingDoubleBlink ? 150 : 175;
      }
      if (blinkStartAt > 0) {
        const elapsed = now - blinkStartAt;
        if (elapsed >= blinkDuration) {
          blinkStartAt = 0;
          if (pendingDoubleBlink) {
            pendingDoubleBlink = false;
            nextBlinkAt = now + 2600 + Math.random() * 2000;
          } else if (Math.random() < 0.24) {
            pendingDoubleBlink = true;
            nextBlinkAt = now + 135;
          } else {
            nextBlinkAt = now + 2400 + Math.random() * 2100;
          }
        } else {
          blinkAmt = Math.sin((elapsed / blinkDuration) * Math.PI);
        }
      }

      if (!isStudioPortrait && backdropImgRef.current) {
        const bg = backdropImgRef.current;
        const bw = bg.naturalWidth || 768;
        const bh = bg.naturalHeight || 1344;
        const bgScale = Math.max(width / bw, height / bh) * 1.12;
        const bgDrawW = bw * bgScale;
        const bgDrawH = bh * bgScale;
        const bgX = (width - bgDrawW) * 0.5 - strollNormX * 12;
        const bgY = (height - bgDrawH) * 0.5;
        ctx.globalAlpha = 0.55;
        ctx.drawImage(bg, bgX, bgY, bgDrawW, bgDrawH);
        ctx.globalAlpha = 1;
      }

      if (portraitImgRef.current) {
        const img = portraitImgRef.current;
        const iw = img.naturalWidth || 768;
        const ih = img.naturalHeight || 1344;

        const breathWave = Math.sin(t * 2.1);
        const audioOut = speakingRef.current ? audioService.getOutputLevel() : 0;

        const extraZoom = portrait.cropZoom || 1;
        const extraPanY = (portrait.cropPanY || 0) * height;
        const isWideViewport = width / Math.max(1, height) > (iw / Math.max(1, ih)) * 1.16;

        if (isStudioPortrait && isWideViewport) {
          ctx.save();
          ctx.filter = 'blur(26px) brightness(0.45) saturate(1.15)';
          const fillScale = Math.max(width / iw, height / ih) * 1.08;
          const fw = iw * fillScale;
          const fh = ih * fillScale;
          ctx.drawImage(img, (width - fw) * 0.5, (height - fh) * 0.5, fw, fh);
          ctx.restore();
        }

        const baseZoom = isStudioPortrait ? 1.015 + walkDepth * 0.015 : 1.09 + walkDepth * 0.075;
        const dynamicZoom = (baseZoom + breathWave * 0.004) * extraZoom;
        const coverScale =
          isStudioPortrait && isWideViewport
            ? Math.min(height / ih, width / iw) * dynamicZoom
            : Math.max(width / iw, height / ih) * dynamicZoom;
        const drawW = iw * coverScale;
        const drawH = ih * coverScale;

        const maxPanX = Math.max(6, Math.min(isStudioPortrait ? 12 : 34, Math.abs(drawW - width) * 0.35));
        const strollPxX = strollNormX * maxPanX + bodySwayX + lx * (isStudioPortrait ? 3.5 : 6);
        const strollPxY = stepBobY + breathWave * 1.4 + ly * 3 + extraPanY;

        const drawX = (width - drawW) * 0.5 + strollPxX;
        const drawY = (height - drawH) * (isStudioPortrait ? 0.48 : 0.42) + strollPxY;

        ctx.save();
        if (portrait.colorFilter) {
          ctx.filter = portrait.colorFilter;
        }

        const strips = 24;
        const srcStripH = ih / strips;
        const dstStripH = drawH / strips;

        for (let s = 0; s < strips; s++) {
          const normY = s / strips;
          const torsoDepth = Math.sin(normY * Math.PI);
          const dressFlowWave =
            !isStudioPortrait && normY > 0.46
              ? Math.sin(stepPhase * 1.35 - (normY - 0.46) * 5.2) * (normY - 0.46) * 9.5
              : 0;
          const stripShiftX = lx * torsoDepth * (isStudioPortrait ? 2.4 : 4.2) + dressFlowWave;
          const stripBreathY = normY > 0.28 && normY < 0.62 ? breathWave * 1.5 : 0;

          ctx.drawImage(
            img,
            0,
            s * srcStripH,
            iw,
            srcStripH + 1.4,
            drawX + stripShiftX,
            drawY + s * dstStripH + stripBreathY,
            drawW,
            dstStripH + 1.4
          );
        }

        if (!portrait.isCustom) {
          const parallaxMult = isStudioPortrait ? 2.4 : 4.2;
          const faceStripShiftX = lx * Math.sin(portrait.leftEye.y * Math.PI) * parallaxMult;
          const mouthStripShiftX = lx * Math.sin(portrait.mouth.y * Math.PI) * parallaxMult;

          const mx = portrait.mouth.x;
          const my = portrait.mouth.y;
          const mw = portrait.mouth.w;
          const mh = portrait.mouth.h;

          const mouthCx = drawX + mouthStripShiftX + mx * drawW;
          const mouthCy = drawY + my * drawH;

          if (speakingRef.current && audioOut > 0.06) {
            const patchW = mw * drawW * 1.35;
            const patchH = mh * drawH * 1.9;
            const jawOpenPx = audioOut * Math.max(1.8, mh * drawH * 0.34);

            ctx.save();
            ctx.beginPath();
            ctx.ellipse(
              mouthCx,
              mouthCy + patchH * 0.14,
              patchW * 0.55,
              patchH * 0.58,
              0,
              0,
              Math.PI * 2
            );
            ctx.clip();

            ctx.drawImage(
              img,
              (mx - mw * 0.68) * iw,
              my * ih,
              mw * 1.36 * iw,
              mh * 1.5 * ih,
              mouthCx - patchW * 0.5,
              mouthCy + jawOpenPx,
              patchW,
              patchH * 0.88
            );

            ctx.fillStyle = `rgba(88, 26, 38, ${0.3 * audioOut})`;
            ctx.beginPath();
            ctx.ellipse(
              mouthCx,
              mouthCy + mh * drawH * 0.03,
              mw * drawW * 0.28,
              Math.max(1.0, jawOpenPx * 0.52),
              0,
              0,
              Math.PI * 2
            );
            ctx.fill();
            ctx.restore();
          } else if (smileFactor > 0.25) {
            const drawSmileCheek = (cxNorm: number, cyNorm: number) => {
              const cx = drawX + faceStripShiftX + cxNorm * drawW;
              const cy = drawY + cyNorm * drawH - smileFactor * 1.1;
              const r = drawW * 0.018;
              const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
              g.addColorStop(0, `rgba(244, 114, 182, ${0.16 * smileFactor})`);
              g.addColorStop(1, 'rgba(244, 114, 182, 0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(cx, cy, r, 0, Math.PI * 2);
              ctx.fill();
            };
            drawSmileCheek(portrait.leftEye.x - 0.008, portrait.leftEye.y + 0.016);
            if (portrait.rightEye) {
              drawSmileCheek(portrait.rightEye.x + 0.008, portrait.rightEye.y + 0.016);
            }
          }

          drawLivingEye(
            portrait.leftEye,
            portrait.skinTone,
            portrait.lashColor,
            drawX + faceStripShiftX,
            drawY,
            drawW,
            drawH,
            blinkAmt,
            lx,
            ly,
            smileFactor
          );
          if (portrait.rightEye) {
            drawLivingEye(
              portrait.rightEye,
              portrait.skinTone,
              portrait.lashColor,
              drawX + faceStripShiftX,
              drawY,
              drawW,
              drawH,
              blinkAmt,
              lx,
              ly,
              smileFactor
            );
          }
        }

        ctx.restore();
      }

      // Live TV-Broadcast AI Assistant Holographic Workstations (Aryan Left + Noor Right)
      if (!reducedMotion && portrait.hasLiveAssistants) {
        const taskWorking = currentTask?.status === 'working';
        const aryanWorking =
          taskWorking &&
          (currentTask?.assignedTo === 'aryan' || currentTask?.assignedTo === 'both');
        const noorWorking =
          taskWorking &&
          (currentTask?.assignedTo === 'noor' || currentTask?.assignedTo === 'both');

        drawAssistantHoloConsole(
          'left',
          t,
          aryanWorking || speakingRef.current ? 1 : 0.35,
          Boolean(aryanWorking || speakingRef.current)
        );
        drawAssistantHoloConsole(
          'right',
          t,
          noorWorking || listeningRef.current || speakingRef.current ? 1 : 0.35,
          Boolean(noorWorking || speakingRef.current)
        );
      }

      // Subtle atmospheric studio bokeh motes
      for (const m of motes) {
        m.x += m.vx + Math.sin(t * 0.9 + m.phase) * 0.16;
        m.y += m.vy;
        if (m.y < -12) {
          m.y = height + 10;
          m.x = Math.random() * width;
        }
        if (m.x < -12) m.x = width + 10;
        if (m.x > width + 12) m.x = -10;

        const twinkle = 0.5 + Math.sin(t * 2.2 + m.phase) * 0.45;
        ctx.save();
        ctx.globalAlpha = m.alpha * twinkle;
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.radius * 3.0);
        if (m.warmRose) {
          g.addColorStop(0, 'rgba(186, 230, 253, 0.9)');
          g.addColorStop(1, 'rgba(56, 189, 248, 0)');
        } else {
          g.addColorStop(0, 'rgba(167, 243, 208, 0.85)');
          g.addColorStop(1, 'rgba(16, 185, 129, 0)');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius * 3.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Measured top & bottom contrast scrims for broadcast legibility
      const topScrim = ctx.createLinearGradient(0, 0, 0, Math.min(115, height * 0.16));
      topScrim.addColorStop(0, 'rgba(5, 7, 17, 0.74)');
      topScrim.addColorStop(1, 'rgba(5, 7, 17, 0)');
      ctx.fillStyle = topScrim;
      ctx.fillRect(0, 0, width, Math.min(115, height * 0.16));

      const bottomScrim = ctx.createLinearGradient(0, height * 0.64, 0, height);
      bottomScrim.addColorStop(0, 'rgba(5, 7, 17, 0)');
      bottomScrim.addColorStop(0.55, 'rgba(5, 7, 17, 0.68)');
      bottomScrim.addColorStop(1, 'rgba(5, 7, 17, 0.95)');
      ctx.fillStyle = bottomScrim;
      ctx.fillRect(0, height * 0.64, width, height * 0.36);

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
    pointerRef.current = {
      x: Math.max(-1, Math.min(1, nx)),
      y: Math.max(-1, Math.min(1, ny)),
    };
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        pointerRef.current = { x: 0, y: 0 };
      }}
      onClick={() => {
        smileBoostUntilRef.current = performance.now() + 4000;
        onTapZara?.();
      }}
      className="absolute inset-0 w-full h-full overflow-hidden select-none bg-[#050711]"
    >
      {!imgReady && (
        <img
          src={activePortrait.src || aiTeamStudioImg || zaraFullBodySmilingImg}
          alt={activePortrait.name || 'Zara Live AI Broadcast Studio'}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-contain sm:object-contain bg-[#050711] object-center"
        />
      )}

      <canvas ref={canvasRef} className="w-full h-full block cursor-pointer" />

      {/* Live TV-Broadcast AI Studio Desk Readout (Unboxed Clean Metadata — Zero Pills) */}
      {activePortrait.hasLiveAssistants && (
        <div className="pointer-events-none absolute inset-x-0 bottom-36 sm:bottom-40 z-10 px-4 flex flex-col items-center gap-1 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-[11px] font-medium text-slate-200/90 drop-shadow">
            <span className="text-sky-300 font-semibold">Aryan · Mobile &amp; System Ops</span>
            <span className="text-white/35" aria-hidden="true">
              ·
            </span>
            <span className="text-white font-bold">Zara · Lead AI Director</span>
            <span className="text-white/35" aria-hidden="true">
              ·
            </span>
            <span className="text-emerald-300 font-semibold">Noor · Voice &amp; Vision Ops</span>
          </div>

          {studioTask && (
            <p className="text-[11px] text-sky-200/95 max-w-md truncate drop-shadow">
              {studioTask.status === 'working' ? 'Working Live: ' : 'Completed: '}
              <span className="font-semibold text-white">{studioTask.title}</span>
              {' · '}
              <span>{studioTask.detail}</span>
              {!isOnline ? ' · Offline Engine' : ''}
            </p>
          )}
        </div>
      )}

      {/* Quiet Unobstructed Ambient Vision Indicator */}
      {visionMode === 'camera' && ambientVisionSilent && isOwnerVerified && (
        <div className="pointer-events-none absolute top-16 right-4 z-20 flex items-center gap-1.5 text-[11px] font-medium text-emerald-300/90 drop-shadow">
          <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Zara Sees You</span>
        </div>
      )}

      {/* Explicit Interactive Camera / Screen PiP Window */}
      {visionMode !== 'off' && !ambientVisionSilent && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-16 right-3 z-20 w-36 h-44 rounded-2xl overflow-hidden border border-emerald-400/80 bg-slate-950/95 shadow-2xl"
        >
          {staticScreenPreview ? (
            <img
              src={staticScreenPreview}
              alt="Active Shared Screen"
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
                visionMode === 'camera' && liveFacing === 'user' ? '-scale-x-100' : ''
              }`}
            />
          )}

          <div className="absolute top-1 left-1 right-1 flex items-center justify-between px-1.5 py-1 rounded-lg bg-black/85 text-[10px] font-semibold text-emerald-200">
            <span className="flex items-center gap-1 truncate">
              {visionMode === 'screen' ? (
                <>
                  <MonitorUp className="w-3 h-3 text-sky-300 shrink-0" />
                  <span>Screen Active</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3 text-emerald-300 shrink-0" />
                  <span>
                    {liveFacing === 'environment' ? 'Back Cam Active' : 'Front Cam Active'}
                  </span>
                </>
              )}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              {visionMode === 'camera' && onFlipCamera && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFlipCamera();
                  }}
                  title="Switch Front / Back Camera"
                  aria-label="Switch Front or Back Camera"
                  className="min-h-[26px] min-w-[26px] flex items-center justify-center rounded bg-white/10 text-white hover:text-amber-200 cursor-pointer"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTurnOffVision) {
                    onTurnOffVision();
                  } else {
                    zaraVision.stop();
                  }
                }}
                title="Turn Off Camera / Screen Access"
                aria-label="Turn Off Camera or Screen Access"
                className="min-h-[26px] min-w-[26px] flex items-center justify-center rounded bg-rose-600/80 text-white hover:bg-rose-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {visionMode === 'camera' && onSnapPhotoToChat && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSnapPhotoToChat();
              }}
              className="absolute bottom-1 left-1 right-1 min-h-[30px] py-1 rounded-lg bg-pink-600/95 hover:bg-pink-500 text-white text-[10px] font-bold text-center whitespace-nowrap cursor-pointer"
            >
              Analyze Frame
            </button>
          )}
        </div>
      )}
    </div>
  );
};
