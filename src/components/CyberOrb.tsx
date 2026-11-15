import React, { useEffect, useRef } from 'react';

interface CyberOrbProps {
  isSpeaking: boolean;
  isListening: boolean;
  loveMode: boolean;
}

export const CyberOrb: React.FC<CyberOrbProps> = ({ isSpeaking, isListening, loveMode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angleX = 0;
    let angleY = 0;

    // Generate points on sphere
    const points: Array<{ x: number; y: number; z: number }> = [];
    const numPoints = 80;
    const radius = 68;

    for (let i = 0; i < numPoints; i++) {
      const phi = Math.acos(-1 + (2 * i) / numPoints);
      const theta = Math.sqrt(numPoints * Math.PI) * phi;
      points.push({
        x: radius * Math.cos(theta) * Math.sin(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(phi),
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Speed up if listening or speaking
      const speed = isSpeaking ? 0.04 : isListening ? 0.03 : 0.012;
      angleY += speed;
      angleX += speed * 0.4;

      // Pulse multiplier
      const pulse = isSpeaking
        ? 1 + Math.sin(Date.now() * 0.008) * 0.12
        : isListening
        ? 1 + Math.sin(Date.now() * 0.012) * 0.08
        : 1 + Math.sin(Date.now() * 0.003) * 0.04;

      // Colors
      const primaryColor = loveMode ? '#ec4899' : '#d946ef';
      const secondaryColor = loveMode ? '#f43f5e' : '#8b5cf6';
      const glowColor = loveMode ? 'rgba(236, 72, 153, 0.4)' : 'rgba(168, 85, 247, 0.35)';

      // Background radial glow
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius * 1.5);
      bgGrad.addColorStop(0, glowColor);
      bgGrad.addColorStop(0.5, loveMode ? 'rgba(244, 63, 94, 0.15)' : 'rgba(147, 51, 234, 0.12)');
      bgGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Transform & project 3D points
      const projected = points.map((p) => {
        // Rotate Y
        let x1 = p.x * Math.cos(angleY) + p.z * Math.sin(angleY);
        let z1 = -p.x * Math.sin(angleY) + p.z * Math.cos(angleY);

        // Rotate X
        let y2 = p.y * Math.cos(angleX) - z1 * Math.sin(angleX);
        let z2 = p.y * Math.sin(angleX) + z1 * Math.cos(angleX);

        // Scale
        const scale = 220 / (220 + z2);
        return {
          x: centerX + x1 * scale * pulse,
          y: centerY + y2 * scale * pulse,
          z: z2,
          scale,
        };
      });

      // Sort points by Z for depth
      projected.sort((a, b) => a.z - b.z);

      // Draw connections
      ctx.lineWidth = 0.75;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 26 * pulse) {
            const alpha = (1 - dist / (26 * pulse)) * 0.45;
            ctx.strokeStyle = `rgba(217, 70, 239, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw horizontal orbital glowing ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(1.2 * pulse, 0.28 * pulse);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.1, 0, Math.PI * 2);
      ctx.strokeStyle = primaryColor;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 15;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      // Draw second diagonal orbital ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.PI / 4 + angleY * 0.1);
      ctx.scale(1.05 * pulse, 0.22 * pulse);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
      ctx.strokeStyle = secondaryColor;
      ctx.shadowColor = secondaryColor;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();

      // Draw points
      for (const pt of projected) {
        const pointRadius = Math.max(1, (pt.scale * 2.2) * (pt.z > 0 ? 1.2 : 0.8));
        const alpha = Math.max(0.2, (pt.z + radius) / (2 * radius));
        ctx.fillStyle = loveMode ? `rgba(244, 114, 182, ${alpha})` : `rgba(192, 132, 252, ${alpha})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center bright core
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 24 * pulse);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.4, primaryColor);
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 24 * pulse, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSpeaking, isListening, loveMode]);

  return (
    <div className="relative w-full aspect-square flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#180a33]/60 via-[#0d0722]/80 to-[#070414] border border-purple-900/30">
      <canvas
        ref={canvasRef}
        width={220}
        height={220}
        className="w-full h-full object-contain pointer-events-none drop-shadow-[0_0_20px_rgba(217,70,239,0.5)]"
      />
      {/* Floating cyber ring around */}
      <div className="absolute inset-2 rounded-xl border border-pink-500/20 pointer-events-none" />
    </div>
  );
};
