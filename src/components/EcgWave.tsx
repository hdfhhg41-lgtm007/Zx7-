import React, { useEffect, useRef } from 'react';

interface EcgWaveProps {
  color?: string;
  speed?: number;
  height?: number;
}

export const EcgWave: React.FC<EcgWaveProps> = ({
  color = '#22c55e',
  speed = 1.5,
  height = 24,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offset = 0;
    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const mid = h / 2;

      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;

      for (let x = 0; x < w; x++) {
        const pos = (x + offset) % 60;
        let y = mid;

        if (pos > 20 && pos < 25) {
          y = mid - (pos - 20) * 2;
        } else if (pos >= 25 && pos < 30) {
          y = mid - 10 + (pos - 25) * 4;
        } else if (pos >= 30 && pos < 36) {
          y = mid + 10 - (pos - 30) * 3;
        } else if (pos >= 36 && pos < 40) {
          y = mid - 8 + (pos - 36) * 2;
        }

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      offset += speed;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [color, speed]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={height}
      className="w-full h-auto block opacity-90"
    />
  );
};
