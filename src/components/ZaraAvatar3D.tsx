import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { audioService } from '../services/audioService';
import { ZaraOutfitId } from '../types';

export type Zara3DExpression = 'smile' | 'blush' | 'wink' | 'love';
export type Zara3DCameraMode = 'hero' | 'call' | 'studio';

interface ZaraAvatar3DProps {
  isSpeaking: boolean;
  isListening: boolean;
  loveMode?: boolean;
  outfit?: ZaraOutfitId;
  expression?: Zara3DExpression;
  cameraMode?: Zara3DCameraMode;
  micVolume?: number;
  onTapZara?: () => void;
  className?: string;
}

const OUTFIT_PALETTES: Record<
  ZaraOutfitId,
  {
    dressHex: number;
    dupattaHex: number;
    gemHex: number;
    rimHex: number;
    lipHex: number;
  }
> = {
  royal_crimson: {
    dressHex: 0x9f1239,
    dupattaHex: 0xf43f5e,
    gemHex: 0xfbbf24,
    rimHex: 0xf472b6,
    lipHex: 0xd83367,
  },
  cyber_rose: {
    dressHex: 0xbe185d,
    dupattaHex: 0xd946ef,
    gemHex: 0x22d3ee,
    rimHex: 0xe879f9,
    lipHex: 0xe11d74,
  },
  emerald_queen: {
    dressHex: 0x065f46,
    dupattaHex: 0x10b981,
    gemHex: 0xfcd34d,
    rimHex: 0x34d399,
    lipHex: 0xc83760,
  },
  midnight_silk: {
    dressHex: 0x312e81,
    dupattaHex: 0x818cf8,
    gemHex: 0xf472b6,
    rimHex: 0xa78bfa,
    lipHex: 0xd0386c,
  },
};

function createSoftParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(244, 114, 182, 0.85)');
    grad.addColorStop(0.75, 'rgba(192, 132, 252, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const ZaraAvatar3D: React.FC<ZaraAvatar3DProps> = ({
  isSpeaking,
  isListening,
  loveMode = true,
  outfit = 'cyber_rose',
  expression = 'smile',
  cameraMode = 'hero',
  micVolume = 0,
  onTapZara,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  // Live prop refs for zero-reinit 60fps animation loop
  const propsRef = useRef({
    isSpeaking,
    isListening,
    loveMode,
    outfit,
    expression,
    cameraMode,
    micVolume,
    onTapZara,
  });
  propsRef.current = {
    isSpeaking,
    isListening,
    loveMode,
    outfit,
    expression,
    cameraMode,
    micVolume,
    onTapZara,
  };

  // Material refs so outfit switches update colors instantaneously without rebuilding WebGL
  const dynamicMatsRef = useRef<{
    dress?: THREE.MeshPhysicalMaterial;
    dupatta?: THREE.MeshPhysicalMaterial;
    gem?: THREE.MeshPhysicalMaterial;
    lip?: THREE.MeshPhysicalMaterial;
    blush?: THREE.MeshBasicMaterial;
    halo1?: THREE.MeshBasicMaterial;
    halo2?: THREE.MeshBasicMaterial;
    rimLight?: THREE.PointLight;
  }>({});

  useEffect(() => {
    const pal = OUTFIT_PALETTES[outfit] || OUTFIT_PALETTES.cyber_rose;
    const mats = dynamicMatsRef.current;
    if (mats.dress) mats.dress.color.setHex(pal.dressHex);
    if (mats.dupatta) mats.dupatta.color.setHex(pal.dupattaHex);
    if (mats.gem) {
      mats.gem.color.setHex(pal.gemHex);
      mats.gem.emissive.setHex(pal.gemHex);
    }
    if (mats.lip) mats.lip.color.setHex(pal.lipHex);
    if (mats.rimLight) mats.rimLight.color.setHex(pal.rimHex);
  }, [outfit]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      // Probe software vs hardware WebGL
      const probeCanvas = document.createElement('canvas');
      const probeGl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!probeGl) {
        setWebglUnavailable(true);
        return;
      }
      const dbg = probeGl.getExtension('WEBGL_debug_renderer_info');
      const gpuName = dbg ? String(probeGl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
      const isSoftwareGl = /SwiftShader|llvmpipe|Software/i.test(gpuName);

      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      (renderer as any).__isSoftwareGl = isSoftwareGl;
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const isSoftwareGl = Boolean((renderer as any).__isSoftwareGl);
    const segScale = isSoftwareGl ? 0.65 : 1;
    const seg = (n: number) => Math.max(12, Math.round(n * segScale));

    const initW = Math.max(200, container.clientWidth || 320);
    const initH = Math.max(200, container.clientHeight || 320);
    renderer.setSize(initW, initH);
    renderer.domElement.className = 'w-full h-full block touch-none select-none cursor-grab active:cursor-grabbing';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Studio IBL Environment for realistic gold jewelry, hair sheen, and glossy eyes/lips
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(34, initW / initH, 0.1, 50);
    camera.position.set(0, 0.22, 4.1);
    camera.lookAt(0, 0.15, 0);

    // 3-Point Portrait Studio Lighting + Dynamic Voice Light
    const hemiLight = new THREE.HemisphereLight(0xffe4f0, 0x1e1038, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1e6, 1.9);
    keyLight.position.set(2.4, 2.8, 3.6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xc4b5fd, 0.85);
    fillLight.position.set(-2.6, 1.2, 2.5);
    scene.add(fillLight);

    const pal = OUTFIT_PALETTES[propsRef.current.outfit] || OUTFIT_PALETTES.cyber_rose;
    const rimLight = new THREE.PointLight(pal.rimHex, 3.2, 9, 1.8);
    rimLight.position.set(0, 1.8, -2.2);
    scene.add(rimLight);

    const voiceAuraLight = new THREE.PointLight(0xec4899, 1.4, 6, 2);
    voiceAuraLight.position.set(0, -0.6, 2.2);
    scene.add(voiceAuraLight);

    // Track disposable resources
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };

    // Core PBR Materials for 3D Zara
    const skinMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xfad2be,
        roughness: 0.46,
        metalness: 0.02,
        sheen: 0.45,
        sheenRoughness: 0.65,
        sheenColor: new THREE.Color(0xffb4a2),
        clearcoat: 0.08,
        clearcoatRoughness: 0.5,
      })
    );

    const hairMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x160d1c,
        roughness: 0.34,
        metalness: 0.08,
        sheen: 0.85,
        sheenRoughness: 0.35,
        sheenColor: new THREE.Color(0x6b21a8),
        clearcoat: 0.35,
        clearcoatRoughness: 0.28,
      })
    );

    const goldMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.2,
        metalness: 0.94,
      })
    );

    const pearlMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xfff8f6,
        roughness: 0.16,
        metalness: 0.05,
        clearcoat: 0.9,
        iridescence: 0.5,
      })
    );

    const gemMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: pal.gemHex,
        emissive: pal.gemHex,
        emissiveIntensity: 0.35,
        roughness: 0.1,
        metalness: 0.2,
        clearcoat: 1.0,
      })
    );

    const dressMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: pal.dressHex,
        roughness: 0.38,
        metalness: 0.15,
        sheen: 0.9,
        sheenRoughness: 0.35,
        sheenColor: new THREE.Color(0xfbcfe8),
        clearcoat: 0.25,
      })
    );

    const dupattaMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: pal.dupattaHex,
        roughness: 0.25,
        metalness: 0.1,
        sheen: 1.0,
        sheenColor: new THREE.Color(0xfef08a),
        transparent: true,
        opacity: 0.68,
        side: THREE.DoubleSide,
      })
    );

    const scleraMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.12,
        clearcoat: 1.0,
      })
    );

    const irisMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x6d3b1e,
        emissive: 0x291306,
        emissiveIntensity: 0.25,
        roughness: 0.15,
        clearcoat: 1.0,
      })
    );

    const pupilMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x07040a,
      })
    );

    const catchlightMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      })
    );

    const lashMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0f0814,
        roughness: 0.45,
      })
    );

    const lipMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: pal.lipHex,
        roughness: 0.22,
        metalness: 0.03,
        clearcoat: 0.92,
        clearcoatRoughness: 0.14,
      })
    );

    const mouthInnerMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x3b0819,
      })
    );

    const blushMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      })
    );

    const haloMat1 = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xf472b6,
        transparent: true,
        opacity: 0.42,
      })
    );

    const haloMat2 = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.3,
      })
    );

    dynamicMatsRef.current = {
      dress: dressMat,
      dupatta: dupattaMat,
      gem: gemMat,
      lip: lipMat,
      blush: blushMat,
      halo1: haloMat1,
      halo2: haloMat2,
      rimLight,
    };

    // ==================== BUILD COMPOSITE 3D ZARA RIG ====================
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, -0.05, 0);
    rootGroup.add(torsoGroup);

    // 1. Sculpted Shoulders & Pakistani Royal Bodice
    const bodiceGeo = trackGeo(new THREE.CylinderGeometry(0.46, 0.64, 0.95, seg(32), 1, false));
    bodiceGeo.scale(1.22, 1, 0.76);
    const bodiceMesh = new THREE.Mesh(bodiceGeo, dressMat);
    bodiceMesh.position.set(0, -1.02, -0.02);
    torsoGroup.add(bodiceMesh);

    const shoulderCapGeo = trackGeo(new THREE.SphereGeometry(0.58, seg(32), seg(20), 0, Math.PI * 2, 0, Math.PI * 0.52));
    shoulderCapGeo.scale(1.22, 0.56, 0.74);
    const shoulderCap = new THREE.Mesh(shoulderCapGeo, dressMat);
    shoulderCap.position.set(0, -0.62, -0.02);
    torsoGroup.add(shoulderCap);

    // Golden Zari neckline trim
    const necklineGeo = trackGeo(new THREE.TorusGeometry(0.32, 0.022, seg(14), seg(36), Math.PI * 1.15));
    const necklineTrim = new THREE.Mesh(necklineGeo, goldMat);
    necklineTrim.position.set(0, -0.57, 0.25);
    necklineTrim.rotation.set(Math.PI * 0.62, 0, -Math.PI * 0.075);
    torsoGroup.add(necklineTrim);

    // Sheer Flowing Pakistani Dupatta Veil around shoulders & back
    const dupattaGeo = trackGeo(new THREE.TorusGeometry(0.68, 0.16, seg(16), seg(44), Math.PI * 1.25));
    dupattaGeo.scale(1.06, 0.85, 0.65);
    const dupattaMesh = new THREE.Mesh(dupattaGeo, dupattaMat);
    dupattaMesh.position.set(0, -0.62, -0.05);
    dupattaMesh.rotation.set(Math.PI * 0.58, 0, -Math.PI * 0.12);
    torsoGroup.add(dupattaMesh);

    // 2. Graceful Neck & Jeweled Pakistani Choker Necklace
    const neckGeo = trackGeo(new THREE.CylinderGeometry(0.19, 0.23, 0.46, seg(24)));
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.set(0, -0.35, 0.02);
    torsoGroup.add(neckMesh);

    const chokerGeo = trackGeo(new THREE.TorusGeometry(0.215, 0.022, seg(14), seg(36)));
    const chokerMesh = new THREE.Mesh(chokerGeo, goldMat);
    chokerMesh.position.set(0, -0.42, 0.025);
    chokerMesh.rotation.x = Math.PI * 0.53;
    torsoGroup.add(chokerMesh);

    const pendantGeo = trackGeo(new THREE.OctahedronGeometry(0.052, 1));
    pendantGeo.scale(0.85, 1.2, 0.55);
    const pendantMesh = new THREE.Mesh(pendantGeo, gemMat);
    pendantMesh.position.set(0, -0.47, 0.245);
    torsoGroup.add(pendantMesh);

    // 3. Articulated Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.28, 0.04);
    torsoGroup.add(headGroup);

    // Sculpted Feminine Head Contour (softly tapered chin + smooth forehead)
    const headGeo = trackGeo(new THREE.SphereGeometry(0.56, seg(40), seg(36)));
    const posAttr = headGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      let x = posAttr.getX(i);
      let y = posAttr.getY(i);
      let z = posAttr.getZ(i);

      // Elongate vertical proportion slightly
      y *= 1.14;
      // Taper lower jaw & chin gracefully
      if (y < 0) {
        const t = Math.min(1, -y / 0.64);
        const jawTaper = 1 - t * 0.28;
        x *= jawTaper;
        z *= 1 - t * 0.12;
        // Subtle chin prominence forward
        if (z > 0 && Math.abs(x) < 0.22) {
          z += t * 0.045;
        }
      } else {
        // Gentle temple narrowing
        x *= 0.96;
      }
      // Subtle cheekbone contour
      if (y > -0.18 && y < 0.06 && z > 0.2) {
        x *= 1.03;
      }

      posAttr.setXYZ(i, x, y, z);
    }
    headGeo.computeVertexNormals();

    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(headMesh);

    // Ears
    const earGeo = trackGeo(new THREE.SphereGeometry(0.11, seg(16), seg(16)));
    earGeo.scale(0.45, 0.95, 0.65);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.52, -0.03, -0.02);
    leftEar.rotation.z = 0.15;
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(0.52, -0.03, -0.02);
    rightEar.rotation.z = -0.15;
    headGroup.add(rightEar);

    // 4. Articulated Golden Jhumka Earrings (Sway with head motion!)
    const buildJhumka = (side: -1 | 1) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.53, -0.11, 0.0);

      const stud = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.032, 12, 12)), goldMat);
      pivot.add(stud);

      const stem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 8)), goldMat);
      stem.position.y = -0.05;
      pivot.add(stem);

      const bellGeo = trackGeo(new THREE.SphereGeometry(0.075, seg(20), seg(14), 0, Math.PI * 2, 0, Math.PI * 0.58));
      const bell = new THREE.Mesh(bellGeo, goldMat);
      bell.position.y = -0.09;
      pivot.add(bell);

      // Hanging pearl droplets around jhumka rim
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2;
        const pearl = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.016, 10, 10)), pearlMat);
        pearl.position.set(Math.cos(ang) * 0.062, -0.145, Math.sin(ang) * 0.062);
        pivot.add(pearl);
      }

      headGroup.add(pivot);
      return pivot;
    };

    const leftJhumka = buildJhumka(-1);
    const rightJhumka = buildJhumka(1);

    // 5. Delicate Sculpted Nose + Sparkling Pakistani Nose Pin (Long / Nathli stud)
    const noseBridgeGeo = trackGeo(new THREE.ConeGeometry(0.058, 0.2, seg(16)));
    noseBridgeGeo.scale(0.85, 1, 0.95);
    const noseMesh = new THREE.Mesh(noseBridgeGeo, skinMat);
    noseMesh.position.set(0, -0.03, 0.545);
    noseMesh.rotation.x = 0.26;
    headGroup.add(noseMesh);

    const noseTip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.044, 14, 14)), skinMat);
    noseTip.position.set(0, -0.1, 0.585);
    headGroup.add(noseTip);

    // Sparkling Nose Pin on left nostril
    const nosePin = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.015, 10, 10)), gemMat);
    nosePin.position.set(-0.048, -0.095, 0.572);
    headGroup.add(nosePin);

    // Rosy Cheek Blush Pads
    const blushGeo = trackGeo(new THREE.CircleGeometry(0.11, 20));
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(-0.26, -0.09, 0.495);
    leftBlush.rotation.y = -0.38;
    headGroup.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(0.26, -0.09, 0.495);
    rightBlush.rotation.y = 0.38;
    headGroup.add(rightBlush);

    // 6. Expressive 3D Eyes, Irises, Specular Catchlights, Eyelids & Lashes
    const buildEye = (side: -1 | 1) => {
      const eyeHolder = new THREE.Group();
      eyeHolder.position.set(side * 0.195, 0.065, 0.468);
      eyeHolder.rotation.y = side * 0.18;

      const eyeball = new THREE.Group();
      const sclera = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.095, seg(22), seg(22))), scleraMat);
      sclera.scale.set(1.08, 0.94, 0.72);
      eyeball.add(sclera);

      const iris = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.056, 24)), irisMat);
      iris.position.z = 0.068;
      eyeball.add(iris);

      const pupil = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.028, 20)), pupilMat);
      pupil.position.z = 0.07;
      eyeball.add(pupil);

      const glint1 = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.013, 12)), catchlightMat);
      glint1.position.set(0.018, 0.02, 0.072);
      eyeball.add(glint1);

      const glint2 = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.007, 10)), catchlightMat);
      glint2.position.set(-0.018, -0.015, 0.072);
      eyeball.add(glint2);

      eyeHolder.add(eyeball);

      // Upper Eyelid for natural blinking & winking
      const lidGeo = trackGeo(
        new THREE.SphereGeometry(0.103, seg(20), seg(14), 0, Math.PI * 2, 0, Math.PI * 0.54)
      );
      lidGeo.scale(1.1, 0.96, 0.78);
      const eyelid = new THREE.Mesh(lidGeo, skinMat);
      eyelid.rotation.x = -Math.PI * 0.42; // Open resting angle
      eyeHolder.add(eyelid);

      // Curved Eyelash Line
      const lashGeo = trackGeo(new THREE.TorusGeometry(0.098, 0.011, 8, 22, Math.PI * 0.88));
      const lash = new THREE.Mesh(lashGeo, lashMat);
      lash.position.set(0, 0.018, 0.048);
      lash.rotation.set(-0.18, 0, Math.PI * 0.06);
      eyelid.add(lash);

      // Expressive Arched Eyebrow
      const browGeo = trackGeo(new THREE.TorusGeometry(0.125, 0.014, 8, 20, Math.PI * 0.68));
      const brow = new THREE.Mesh(browGeo, hairMat);
      brow.position.set(side * 0.01, 0.04, 0.045);
      brow.rotation.set(0, 0, side === -1 ? Math.PI * 0.14 : Math.PI * 0.18);
      eyeHolder.add(brow);

      headGroup.add(eyeHolder);
      return { eyeball, eyelid, brow };
    };

    const leftEye = buildEye(-1);
    const rightEye = buildEye(1);

    // 7. Real-Time Lip-Sync 3D Mouth & Glossy Lips Rig
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.235, 0.505);
    headGroup.add(mouthGroup);

    const mouthInner = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.078, 16, 14)), mouthInnerMat);
    mouthInner.scale.set(1.15, 0.15, 0.4);
    mouthInner.position.z = -0.01;
    mouthGroup.add(mouthInner);

    const teethMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.095, 0.022, 0.02)), pearlMat);
    teethMesh.position.set(0, 0.018, 0.01);
    mouthGroup.add(teethMesh);

    const upperLipGeo = trackGeo(new THREE.TorusGeometry(0.088, 0.022, 12, 26, Math.PI));
    const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
    upperLip.rotation.set(0.25, 0, 0);
    upperLip.scale.set(1.05, 0.42, 0.85);
    upperLip.position.set(0, 0.008, 0.022);
    mouthGroup.add(upperLip);

    const lowerLipGeo = trackGeo(new THREE.TorusGeometry(0.084, 0.026, 12, 26, Math.PI));
    const lowerLip = new THREE.Mesh(lowerLipGeo, lipMat);
    lowerLip.rotation.set(-0.22, 0, Math.PI);
    lowerLip.scale.set(1.02, 0.48, 0.9);
    lowerLip.position.set(0, -0.006, 0.024);
    mouthGroup.add(lowerLip);

    // 8. Voluminous 3D Silky Dark Hair + Swept Bangs + Flowing Locks + Golden Maang Tikka
    const hairCrownGeo = trackGeo(
      new THREE.SphereGeometry(0.605, seg(36), seg(28), 0, Math.PI * 2, 0, Math.PI * 0.64)
    );
    hairCrownGeo.scale(1.04, 1.12, 1.06);
    const hairCrown = new THREE.Mesh(hairCrownGeo, hairMat);
    hairCrown.position.set(0, 0.05, -0.03);
    hairCrown.rotation.x = -0.16;
    headGroup.add(hairCrown);

    // Lush Back Hair Volume draping behind neck & shoulders
    const backHairGeo = trackGeo(new THREE.SphereGeometry(0.62, seg(28), seg(24)));
    backHairGeo.scale(1.08, 1.48, 0.78);
    const backHair = new THREE.Mesh(backHairGeo, hairMat);
    backHair.position.set(0, -0.32, -0.22);
    headGroup.add(backHair);

    // Swept Side-Parted Front Bangs framing forehead softly
    const bangLeftGeo = trackGeo(new THREE.SphereGeometry(0.34, seg(22), seg(18)));
    bangLeftGeo.scale(1.18, 0.52, 0.55);
    const bangLeft = new THREE.Mesh(bangLeftGeo, hairMat);
    bangLeft.position.set(-0.21, 0.39, 0.36);
    bangLeft.rotation.set(0.28, -0.25, 0.36);
    headGroup.add(bangLeft);

    const bangRightGeo = trackGeo(new THREE.SphereGeometry(0.31, seg(22), seg(18)));
    bangRightGeo.scale(1.12, 0.48, 0.52);
    const bangRight = new THREE.Mesh(bangRightGeo, hairMat);
    bangRight.position.set(0.23, 0.4, 0.35);
    bangRight.rotation.set(0.28, 0.25, -0.34);
    headGroup.add(bangRight);

    // Flowing Side Locks draping past cheeks onto collarbones
    const buildHairLock = (side: -1 | 1) => {
      const lockGroup = new THREE.Group();
      const lockGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.055, 0.92, seg(18)));
      lockGeo.scale(0.85, 1, 0.68);
      const lockMesh = new THREE.Mesh(lockGeo, hairMat);
      lockMesh.position.set(side * 0.49, -0.32, 0.14);
      lockMesh.rotation.set(0.12, 0, side * -0.11);
      lockGroup.add(lockMesh);

      const curlTip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.065, 14, 14)), hairMat);
      curlTip.position.set(side * 0.44, -0.76, 0.2);
      lockGroup.add(curlTip);

      headGroup.add(lockGroup);
      return lockGroup;
    };

    const leftHairLock = buildHairLock(-1);
    const rightHairLock = buildHairLock(1);

    // Golden Pakistani Maang Tikka (Forehead Ornament)
    const tikkaChain = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.007, 0.007, 0.26, 8)), goldMat);
    tikkaChain.position.set(0, 0.53, 0.42);
    tikkaChain.rotation.x = 0.78;
    headGroup.add(tikkaChain);

    const tikkaDrop = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.036, 1)), gemMat);
    tikkaDrop.scale.set(0.9, 1.15, 0.5);
    tikkaDrop.position.set(0, 0.36, 0.515);
    headGroup.add(tikkaDrop);

    // 9. Holographic 3D Orbital Rings & Floating Sparkle Aura
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, 0.05, -0.25);
    rootGroup.add(haloGroup);

    const ring1 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.18, 0.011, 10, seg(72))), haloMat1);
    ring1.rotation.set(Math.PI * 0.42, 0.25, 0);
    haloGroup.add(ring1);

    const ring2 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.32, 0.008, 10, seg(72))), haloMat2);
    ring2.rotation.set(-Math.PI * 0.36, -0.3, 0.2);
    haloGroup.add(ring2);

    // Soft glowing floating dust particles
    const particleCount = isSoftwareGl ? 28 : 56;
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const ang = (i / particleCount) * Math.PI * 2;
      const rad = 0.95 + (i % 5) * 0.16;
      pPositions[i * 3] = Math.cos(ang) * rad;
      pPositions[i * 3 + 1] = ((i % 9) - 4) * 0.24;
      pPositions[i * 3 + 2] = Math.sin(ang) * rad * 0.55 - 0.15;
    }
    const particleGeo = trackGeo(new THREE.BufferGeometry());
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const particleTex = createSoftParticleTexture();
    const particleMat = trackMat(
      new THREE.PointsMaterial({
        size: 0.095,
        map: particleTex,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const auraParticles = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(auraParticles);

    // ==================== POINTER / TOUCH INTERACTION ====================
    let pointerNormX = 0;
    let pointerNormY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragMoved = 0;
    let userYawOffset = 0;
    let userPitchOffset = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragMoved = 0;
      try {
        renderer.domElement.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        pointerNormX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNormY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      }

      if (isDragging) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        dragMoved += Math.abs(dx) + Math.abs(dy);
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        userYawOffset = THREE.MathUtils.clamp(userYawOffset + dx * 0.008, -0.72, 0.72);
        userPitchOffset = THREE.MathUtils.clamp(userPitchOffset + dy * 0.005, -0.28, 0.28);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isDragging && dragMoved < 8) {
        propsRef.current.onTapZara?.();
      }
      isDragging = false;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {}
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('pointercancel', onPointerUp);

    // Context Loss Resilience
    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    domEl.addEventListener('webglcontextlost', handleContextLost);

    // Responsive ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // ==================== ZERO-GC 60FPS ANIMATION LOOP ====================
    const clock = new THREE.Clock();
    const lipMetrics = { open: 0, round: 0 };
    let smoothMouthOpen = 0;
    let smoothMouthRound = 0;
    let nextBlinkAt = 1.8;
    let blinkProgress = 0;
    let isBlinking = false;
    let jhumkaAngle = 0;
    let jhumkaVel = 0;
    let prevHeadYaw = 0;

    let stopped = false;
    let rafId = 0;
    let timeoutId = 0;

    const afterDraw = (cb: () => void) => {
      rafId = requestAnimationFrame(() => {
        timeoutId = window.setTimeout(cb, 0);
      });
    };

    const tick = () => {
      if (stopped) return;

      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      const cur = propsRef.current;

      // 1. Smooth Camera Framing per Mode ('hero' | 'call' | 'studio')
      const targetCamZ = cur.cameraMode === 'call' ? 3.35 : cur.cameraMode === 'studio' ? 3.85 : 3.55;
      const targetCamY = cur.cameraMode === 'call' ? 0.28 : cur.cameraMode === 'studio' ? 0.08 : 0.22;
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, dt * 4);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, dt * 4);

      // Gently decay drag rotation back toward natural eye contact when not dragging
      if (!isDragging) {
        userYawOffset = THREE.MathUtils.lerp(userYawOffset, 0, dt * 1.4);
        userPitchOffset = THREE.MathUtils.lerp(userPitchOffset, 0, dt * 1.6);
      }

      // 2. Organic Breathing & Head Kinematics
      const breath = Math.sin(elapsed * 2.1) * 0.018;
      torsoGroup.position.y = -0.05 + breath;
      torsoGroup.rotation.y = THREE.MathUtils.lerp(torsoGroup.rotation.y, userYawOffset * 0.65, dt * 6);

      // Attentive head motion: nods gently when listening, expressive sway when speaking
      const listenNod = cur.isListening ? Math.sin(elapsed * 4.5) * 0.035 : 0;
      const speakSway = cur.isSpeaking ? Math.sin(elapsed * 3.2) * 0.045 : 0;
      const targetHeadYaw =
        userYawOffset * 0.55 + pointerNormX * 0.16 + Math.sin(elapsed * 0.85) * 0.05 + speakSway;
      const targetHeadPitch =
        userPitchOffset * 0.5 - pointerNormY * 0.1 + Math.cos(elapsed * 1.1) * 0.025 + listenNod;
      const targetHeadRoll =
        (cur.isListening ? 0.065 : 0) + Math.sin(elapsed * 0.95) * 0.03 + speakSway * 0.5;

      headGroup.rotation.y = THREE.MathUtils.lerp(headGroup.rotation.y, targetHeadYaw, dt * 6.5);
      headGroup.rotation.x = THREE.MathUtils.lerp(headGroup.rotation.x, targetHeadPitch, dt * 6.5);
      headGroup.rotation.z = THREE.MathUtils.lerp(headGroup.rotation.z, targetHeadRoll, dt * 5.5);

      // 3. Spring-Damped Pendulum Physics on Golden Jhumka Earrings & Hair Locks
      const headYawAccel = (headGroup.rotation.y - prevHeadYaw) / Math.max(dt, 0.008);
      prevHeadYaw = headGroup.rotation.y;
      const springForce = -42 * jhumkaAngle - 5.5 * jhumkaVel - headYawAccel * 0.45 - headGroup.rotation.z * 8;
      jhumkaVel += springForce * dt;
      jhumkaAngle = THREE.MathUtils.clamp(jhumkaAngle + jhumkaVel * dt, -0.35, 0.35);

      leftJhumka.rotation.z = jhumkaAngle - 0.03;
      rightJhumka.rotation.z = jhumkaAngle + 0.03;
      leftHairLock.rotation.z = jhumkaAngle * 0.22;
      rightHairLock.rotation.z = jhumkaAngle * 0.22;

      // 4. Natural Eye Gaze & Blinking / Winking
      const gazeX = THREE.MathUtils.clamp(pointerNormX * 0.09, -0.1, 0.1);
      const gazeY = THREE.MathUtils.clamp(pointerNormY * 0.07, -0.08, 0.08);
      leftEye.eyeball.rotation.y = gazeX;
      leftEye.eyeball.rotation.x = -gazeY;
      rightEye.eyeball.rotation.y = gazeX;
      rightEye.eyeball.rotation.x = -gazeY;

      if (!isBlinking && elapsed >= nextBlinkAt) {
        isBlinking = true;
        blinkProgress = 0;
      }
      let blinkAmount = 0;
      if (isBlinking) {
        blinkProgress += dt * 7.5;
        if (blinkProgress >= 1) {
          isBlinking = false;
          nextBlinkAt = elapsed + 2.4 + Math.random() * 2.8;
          blinkAmount = 0;
        } else {
          blinkAmount = Math.sin(blinkProgress * Math.PI);
        }
      }

      const openLidRot = -Math.PI * 0.44;
      const closedLidRot = 0.08;
      const leftBlink = blinkAmount;
      const rightBlink = cur.expression === 'wink' ? 1 : blinkAmount;

      leftEye.eyelid.rotation.x = THREE.MathUtils.lerp(openLidRot, closedLidRot, leftBlink);
      rightEye.eyelid.rotation.x = THREE.MathUtils.lerp(openLidRot, closedLidRot, rightBlink);

      // 5. Real-Time Audio Lip-Sync (60fps from WebAudio AnalyserNode!)
      audioService.getLipSyncMetrics(lipMetrics);

      let targetOpen = lipMetrics.open;
      let targetRound = lipMetrics.round;

      // Fallback rhythmic articulation if browser plays via HTMLAudio/speechSynthesis
      if (cur.isSpeaking && targetOpen < 0.04) {
        targetOpen = 0.25 + Math.abs(Math.sin(elapsed * 13.5)) * 0.48;
        targetRound = 0.35 + Math.sin(elapsed * 7.2) * 0.25;
      }

      smoothMouthOpen = THREE.MathUtils.lerp(smoothMouthOpen, targetOpen, dt * 22);
      smoothMouthRound = THREE.MathUtils.lerp(smoothMouthRound, targetRound, dt * 16);

      const smileWidth = 1.05 - smoothMouthRound * 0.22 + (cur.expression === 'blush' ? 0.06 : 0);
      upperLip.position.y = 0.008 + smoothMouthOpen * 0.024;
      lowerLip.position.y = -0.006 - smoothMouthOpen * 0.068;
      upperLip.scale.x = smileWidth;
      lowerLip.scale.x = smileWidth * 0.97;

      mouthInner.scale.y = 0.12 + smoothMouthOpen * 0.88;
      mouthInner.scale.x = 1.12 - smoothMouthRound * 0.22;
      teethMesh.visible = smoothMouthOpen > 0.08;
      teethMesh.position.y = 0.015 + smoothMouthOpen * 0.018;

      // Expressive eyebrows lift gently with speech energy & listening attention
      const browLift = smoothMouthOpen * 0.018 + (cur.isListening ? 0.014 : 0);
      leftEye.brow.position.y = 0.042 + browLift;
      rightEye.brow.position.y = 0.042 + browLift;

      // Cheek blush warmth
      const targetBlushOpacity =
        cur.expression === 'blush' || cur.expression === 'love'
          ? 0.46
          : cur.loveMode
          ? 0.24
          : 0.12;
      blushMat.opacity = THREE.MathUtils.lerp(blushMat.opacity, targetBlushOpacity, dt * 5);

      // 6. Dynamic Halo & Voice Light Feedback
      const micBoost = Math.min(1, (cur.micVolume || 0) / 80);
      ring1.rotation.z += dt * (cur.isSpeaking ? 0.9 : 0.28);
      ring2.rotation.z -= dt * (cur.isListening ? 0.85 : 0.22);
      auraParticles.rotation.y += dt * 0.14;

      if (cur.isListening) {
        haloMat1.color.setHex(0x34d399);
        haloMat2.color.setHex(0x22d3ee);
        voiceAuraLight.color.setHex(0x10b981);
        voiceAuraLight.intensity = 1.6 + micBoost * 2.2;
      } else if (cur.isSpeaking) {
        haloMat1.color.setHex(0xf43f5e);
        haloMat2.color.setHex(0xe879f9);
        voiceAuraLight.color.setHex(0xec4899);
        voiceAuraLight.intensity = 1.8 + smoothMouthOpen * 2.8;
      } else {
        haloMat1.color.setHex(cur.loveMode ? 0xf472b6 : 0xa78bfa);
        haloMat2.color.setHex(0x38bdf8);
        voiceAuraLight.color.setHex(0xec4899);
        voiceAuraLight.intensity = 1.25;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      resizeObserver.disconnect();

      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('pointercancel', onPointerUp);
      domEl.removeEventListener('webglcontextlost', handleContextLost);

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      particleTex.dispose();
      envTarget.dispose();
      renderer.dispose();

      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
    };
  }, []);

  if (webglUnavailable) {
    return (
      <div
        onClick={() => onTapZara?.()}
        className={`relative w-full h-full flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-[#1e0b3b] via-[#120627] to-[#080314] border border-pink-500/40 p-4 text-center cursor-pointer ${className}`}
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(236,72,153,0.6)]">
          👩🏻
        </div>
        <div className="mt-2 text-sm font-bold text-pink-200 font-urdu">زارا (Zara AI)</div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#1d0b3b] via-[#100626] to-[#070314] ${className}`}
    />
  );
};
