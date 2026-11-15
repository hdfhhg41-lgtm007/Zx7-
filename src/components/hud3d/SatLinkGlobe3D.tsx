import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface SatLinkGlobe3DProps {
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const SatLinkGlobe3D: React.FC<SatLinkGlobe3DProps> = ({
  className = '',
  isExpanded = false,
  onToggleExpand,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [telemetry, setTelemetry] = useState({
    lat: '31.5204° N',
    lon: '74.3587° E',
    alt: '542.8 km',
    sats: '14 Active',
    ping: '24 ms',
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 240;
    let height = container.clientHeight || 220;

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
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.3);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // 1. Earth Wireframe & Dot Matrix Sphere
    const sphereGeo = new THREE.SphereGeometry(1.35, 28, 28);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x0369a1,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    });
    const globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
    earthGroup.add(globeMesh);

    // Inner Dark Core
    const coreGeo = new THREE.SphereGeometry(1.33, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x050c18,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    earthGroup.add(coreMesh);

    // 2. Continents Dots Points
    const DOT_COUNT = 900;
    const dotPositions = new Float32Array(DOT_COUNT * 3);
    const dotColors = new Float32Array(DOT_COUNT * 3);

    for (let i = 0; i < DOT_COUNT; i++) {
      const phi = Math.acos(-1 + (2 * i) / DOT_COUNT);
      const theta = Math.sqrt(DOT_COUNT * Math.PI) * phi;
      const r = 1.36;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      dotPositions[i * 3] = x;
      dotPositions[i * 3 + 1] = y;
      dotPositions[i * 3 + 2] = z;

      // Random cluster brightness mimicking cities/landmasses
      const isHotspot = Math.random() > 0.72;
      dotColors[i * 3] = isHotspot ? 0.98 : 0.12;
      dotColors[i * 3 + 1] = isHotspot ? 0.65 : 0.45;
      dotColors[i * 3 + 2] = isHotspot ? 0.2 : 0.85;
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
    dotGeo.setAttribute('color', new THREE.BufferAttribute(dotColors, 3));
    const dotMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const dotsMesh = new THREE.Points(dotGeo, dotMat);
    earthGroup.add(dotsMesh);

    // 3. Orbital Rings with Satellites
    const ring1Geo = new THREE.RingGeometry(1.65, 1.67, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const orbit1 = new THREE.Mesh(ring1Geo, ring1Mat);
    orbit1.rotation.x = Math.PI / 3;
    orbit1.rotation.y = Math.PI / 6;
    scene.add(orbit1);

    const ring2Geo = new THREE.RingGeometry(1.85, 1.87, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    const orbit2 = new THREE.Mesh(ring2Geo, ring2Mat);
    orbit2.rotation.x = -Math.PI / 4;
    orbit2.rotation.z = Math.PI / 5;
    scene.add(orbit2);

    // 4. Moving Satellites (Orange & Cyan Nodes)
    const satGroup = new THREE.Group();
    scene.add(satGroup);

    const sat1Geo = new THREE.SphereGeometry(0.065, 8, 8);
    const sat1Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const sat1 = new THREE.Mesh(sat1Geo, sat1Mat);
    satGroup.add(sat1);

    const sat2Geo = new THREE.SphereGeometry(0.07, 8, 8);
    const sat2Mat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const sat2 = new THREE.Mesh(sat2Geo, sat2Mat);
    satGroup.add(sat2);

    // Resize
    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || 240;
      height = container.clientHeight || 220;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    // Telemetry periodic update
    const telemetryTimer = window.setInterval(() => {
      const latNum = (20 + Math.random() * 25).toFixed(4);
      const lonNum = (60 + Math.random() * 35).toFixed(4);
      const altNum = (520 + Math.random() * 40).toFixed(1);
      setTelemetry((prev) => ({
        ...prev,
        lat: `${latNum}° N`,
        lon: `${lonNum}° E`,
        alt: `${altNum} km`,
      }));
    }, 2800);

    let animId = 0;
    let t = 0;

    const tick = () => {
      t += 0.012;
      earthGroup.rotation.y += 0.003;
      orbit1.rotation.z += 0.002;
      orbit2.rotation.z -= 0.0025;

      // Animate satellites on orbital paths
      const a1 = t * 1.4;
      sat1.position.set(Math.cos(a1) * 1.66, Math.sin(a1) * 1.66 * 0.8, Math.sin(a1) * 0.7);

      const a2 = -t * 1.1;
      sat2.position.set(Math.cos(a2) * 1.86 * 0.85, Math.sin(a2) * 1.86, Math.cos(a2) * 0.9);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.clearInterval(telemetryTimer);
      window.removeEventListener('resize', onResize);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      sphereGeo.dispose();
      sphereMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      sat1Geo.dispose();
      sat1Mat.dispose();
      sat2Geo.dispose();
      sat2Mat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`relative w-full rounded-2xl bg-slate-950/90 border border-cyan-500/30 overflow-hidden ${className}`}>
      {/* HUD Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-500/20 bg-slate-900/60">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-extrabold tracking-widest text-cyan-300 font-mono">
            SAT-LINK FEED
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 font-mono">
            STREAM
          </span>
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono cursor-pointer"
            >
              {isExpanded ? 'MINIMIZE' : 'EXPAND'}
            </button>
          )}
        </div>
      </div>

      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-44 sm:h-52 relative flex items-center justify-center" />

      {/* Live Telemetry Overlay */}
      <div className="px-3 py-2 border-t border-cyan-500/20 bg-slate-950/90 font-mono text-[10px] text-slate-300 grid grid-cols-2 gap-1.5">
        <div>
          <span className="text-cyan-400">LAT:</span> {telemetry.lat}
        </div>
        <div>
          <span className="text-cyan-400">LON:</span> {telemetry.lon}
        </div>
        <div>
          <span className="text-amber-400">ALT:</span> {telemetry.alt}
        </div>
        <div>
          <span className="text-emerald-400">SATS:</span> {telemetry.sats}
        </div>
      </div>
    </div>
  );
};
