import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export type VisualHubConcept = 'starship' | 'blackhole' | 'fusion' | 'mars';

interface IsometricVisualHub3DProps {
  concept?: VisualHubConcept;
  onSelectConcept?: (c: VisualHubConcept) => void;
  className?: string;
}

export const IsometricVisualHub3D: React.FC<IsometricVisualHub3DProps> = ({
  concept = 'starship',
  onSelectConcept,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const activeConceptRef = useRef<VisualHubConcept>(concept);

  useEffect(() => {
    activeConceptRef.current = concept;
  }, [concept]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 360;
    let height = container.clientHeight || 240;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const scene = new THREE.Scene();

    // Isometric Orthographic Camera for true isometric blueprint perspective
    const aspect = width / height;
    const d = 2.6;
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 100);
    // Classic isometric angle: 45° azimuth, ~35.264° elevation
    camera.position.set(4, 4, 4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const hubGroup = new THREE.Group();
    scene.add(hubGroup);

    // 1. Stacked 3 Isometric Blueprint Glass Planes
    const planeGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });

    const layers: THREE.Group[] = [];
    const heights = [-0.9, 0, 0.9];

    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      g.position.y = heights[i];
      g.rotation.x = -Math.PI / 2;

      const pMesh = new THREE.Mesh(planeGeo, planeMat);
      const wMesh = new THREE.Mesh(planeGeo, wireMat);
      g.add(pMesh);
      g.add(wMesh);

      hubGroup.add(g);
      layers.push(g);
    }

    // 2. Top Layer Content: Isometric Bar Graphs
    const topLayerGroup = new THREE.Group();
    hubGroup.add(topLayerGroup);
    topLayerGroup.position.y = 0.9;

    const barGeo = new THREE.BoxGeometry(0.18, 0.8, 0.18);
    const barMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    const bars: THREE.Mesh[] = [];

    const barCoords = [
      [-0.45, -0.45],
      [-0.15, -0.2],
      [0.15, 0.05],
      [0.45, 0.35],
    ];

    barCoords.forEach(([x, z], i) => {
      const b = new THREE.Mesh(barGeo, barMat);
      b.position.set(x, 0.4, z);
      b.scale.y = 0.5 + i * 0.25;
      topLayerGroup.add(b);
      bars.push(b);
    });

    // 3. Middle Layer Content: Frequency Wave Grid
    const midLayerGroup = new THREE.Group();
    hubGroup.add(midLayerGroup);
    midLayerGroup.position.y = 0;

    const wavePoints: THREE.Vector3[] = [];
    for (let x = -1; x <= 1; x += 0.08) {
      wavePoints.push(new THREE.Vector3(x, 0, Math.sin(x * 6) * 0.35));
    }
    const waveGeo = new THREE.BufferGeometry().setFromPoints(wavePoints);
    const waveMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.9,
    });
    const waveLine = new THREE.Line(waveGeo, waveMat);
    midLayerGroup.add(waveLine);

    // 4. Bottom Layer Content: Concentric Radar Rings
    const botLayerGroup = new THREE.Group();
    hubGroup.add(botLayerGroup);
    botLayerGroup.position.y = -0.9;

    const radarGeo1 = new THREE.RingGeometry(0.3, 0.33, 32);
    const radarGeo2 = new THREE.RingGeometry(0.75, 0.78, 48);
    const radarMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const radar1 = new THREE.Mesh(radarGeo1, radarMat);
    const radar2 = new THREE.Mesh(radarGeo2, radarMat);
    radar1.rotation.x = -Math.PI / 2;
    radar2.rotation.x = -Math.PI / 2;
    botLayerGroup.add(radar1);
    botLayerGroup.add(radar2);

    // Interactive Drag / Rotation
    let isDragging = false;
    let prevMouseX = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const delta = (e.clientX - prevMouseX) * 0.01;
      hubGroup.rotation.y += delta;
      prevMouseX = e.clientX;
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Resize
    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || 360;
      height = container.clientHeight || 240;
      const asp = width / height;
      camera.left = -d * asp;
      camera.right = d * asp;
      camera.top = d;
      camera.bottom = -d;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    let animId = 0;
    let t = 0;

    const tick = () => {
      t += 0.015;

      if (!isDragging) {
        hubGroup.rotation.y += 0.004;
      }

      // Animate bar columns
      bars.forEach((b, idx) => {
        const osc = 0.6 + Math.sin(t * 3 + idx) * 0.35;
        b.scale.y = osc;
        b.position.y = (osc * 0.8) / 2;
      });

      // Animate wave points
      const pos = waveGeo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < wavePoints.length; i++) {
        const x = wavePoints[i].x;
        arr[i * 3 + 1] = Math.sin(t * 4 + x * 6) * 0.18;
      }
      pos.needsUpdate = true;

      // Animate radar ring rotation
      radar1.rotation.z += 0.01;
      radar2.rotation.z -= 0.007;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      planeGeo.dispose();
      planeMat.dispose();
      wireMat.dispose();
      barGeo.dispose();
      barMat.dispose();
      waveGeo.dispose();
      waveMat.dispose();
      radarGeo1.dispose();
      radarGeo2.dispose();
      radarMat.dispose();
      renderer.dispose();
    };
  }, []);

  const PROMPTS: Array<{ id: VisualHubConcept; label: string }> = [
    { id: 'starship', label: 'Draw a SpaceX Starship blueprint' },
    { id: 'blackhole', label: 'Show how a black hole bends light' },
    { id: 'fusion', label: 'Look inside a fusion reactor' },
    { id: 'mars', label: 'Plan a crewed mission to Mars' },
  ];

  return (
    <div className={`relative w-full rounded-2xl bg-slate-950/90 border border-cyan-500/30 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-500/20 bg-slate-900/60">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-[11px] font-extrabold tracking-widest text-cyan-300 font-mono">
            VISUAL HUB
          </span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-200 font-mono ml-1">
            READY
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400">
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
            3D Mesh
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Gesture</span>
        </div>
      </div>

      {/* 2-Column Responsive Body */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 items-center">
        {/* Left: 3D Isometric Viewport */}
        <div
          ref={mountRef}
          className="w-full h-44 sm:h-52 relative flex items-center justify-center cursor-grab active:cursor-grabbing"
          title="Drag to rotate 3D Isometric Blueprint"
        />

        {/* Right: Interactive Concept Prompts ("What do you want to see?") */}
        <div className="space-y-2 px-2">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>What do you want to see?</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Ask out loud, Zara draws it here in real-time 3D as it explains.
          </p>

          <div className="space-y-1.5 pt-1">
            {PROMPTS.map((p) => {
              const active = concept === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectConcept?.(p.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                      : 'bg-slate-900/70 border-white/10 text-slate-300 hover:border-cyan-500/40 hover:text-white'
                  }`}
                >
                  <span className="text-cyan-400 text-xs">⬡</span>
                  <span className="truncate">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sub-tabs Footer */}
      <div className="px-3 py-1.5 border-t border-cyan-500/15 bg-slate-950/80 flex items-center gap-2 overflow-x-auto text-[9px] font-mono text-slate-400">
        <span className="text-cyan-300 font-bold">LIBRARY</span>
        <span>·</span>
        <span className="hover:text-white cursor-pointer">Realistic Studio</span>
        <span>·</span>
        <span className="hover:text-white cursor-pointer">Act 01 Concept</span>
        <span>·</span>
        <span className="hover:text-white cursor-pointer">Moonlit Serenade</span>
        <span>·</span>
        <span className="hover:text-white cursor-pointer">3D Anatomy</span>
      </div>
    </div>
  );
};
