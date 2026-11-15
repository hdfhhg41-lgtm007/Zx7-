import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ZaraEmotionMode, ZaraUiThemeId } from '../../types';

interface HoloParticleFace3DProps {
  isSpeaking: boolean;
  isListening: boolean;
  micVolume?: number;
  emotionMode?: ZaraEmotionMode;
  uiTheme?: ZaraUiThemeId;
  heartLockLocked?: boolean;
  onTapOrb?: () => void;
  className?: string;
}

const STATE_PALETTE = {
  standby: 0x38bdf8, // Crisp cyan neural armor
  listening: 0x10b981, // Active emerald pulse when listening
  speaking: 0x0ea5e9, // Radiant sky energy when speaking
  locked: 0xf59e0b,
};

const THEME_BASE_HEX: Record<ZaraUiThemeId, number> = {
  cyber_cyan: 0x38bdf8,
  royal_violet: 0xa855f7,
  emerald_matrix: 0x10b981,
  crimson_flare: 0xf43f5e,
  golden_aura: 0xf59e0b,
};

const EMOTION_TINT: Record<ZaraEmotionMode, number> = {
  calm: 0x38bdf8,
  apnapan: 0x38bdf8,
  pyar: 0xec4899,
  gussa: 0xf97316,
  narazgi: 0xa855f7,
  ladai: 0xef4444,
  emotional: 0x6366f1,
};

export const HoloParticleFace3D: React.FC<HoloParticleFace3DProps> = ({
  isSpeaking,
  isListening,
  micVolume = 0,
  emotionMode = 'calm',
  uiTheme = 'cyber_cyan',
  heartLockLocked = false,
  onTapOrb,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [glReady, setGlReady] = useState(false);

  const stateRef = useRef({
    isSpeaking,
    isListening,
    micVolume,
    emotionMode,
    uiTheme,
    heartLockLocked,
    pointerX: 0,
    pointerY: 0,
  });

  useEffect(() => {
    stateRef.current.isSpeaking = isSpeaking;
    stateRef.current.isListening = isListening;
    stateRef.current.micVolume = micVolume;
    stateRef.current.emotionMode = emotionMode;
    stateRef.current.uiTheme = uiTheme;
    stateRef.current.heartLockLocked = heartLockLocked;
  }, [isSpeaking, isListening, micVolume, emotionMode, uiTheme, heartLockLocked]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 320;
    let height = container.clientHeight || 320;

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
    scene.fog = new THREE.FogExp2(0x060913, 0.045);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 5.2);
    camera.lookAt(0, 0.05, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    container.appendChild(renderer.domElement);
    setGlReady(true);

    // Studio metallic reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    // 3-Point Cybernetic Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x090d1a, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xf0f9ff, 2.3);
    keyLight.position.set(3.2, 4.8, 5.2);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 5.2, 16);
    rimLight.position.set(-2.6, 1.4, -1.8);
    scene.add(rimLight);

    const chestLight = new THREE.PointLight(0x38bdf8, 4.0, 9);
    chestLight.position.set(0, -0.55, 1.3);
    scene.add(chestLight);

    // Soft glow sprite texture
    const glowTex = (() => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d');
      if (ctx) {
        const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
        g.addColorStop(0, 'rgba(255, 255, 255, 1)');
        g.addColorStop(0.28, 'rgba(125, 211, 252, 0.92)');
        g.addColorStop(0.65, 'rgba(14, 165, 233, 0.25)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 64);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    })();

    const disposables: Array<{ dispose: () => void }> = [glowTex, envTex];
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      disposables.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      disposables.push(m);
      return m;
    };

    // Materials (varied metallic titanium, obsidian armor plates, & emissive hologram energy)
    const darkArmorMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.85,
        roughness: 0.28,
      })
    );
    const titaniumMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.92,
        roughness: 0.18,
      })
    );
    const visorGlassMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x020617,
        metalness: 0.45,
        roughness: 0.1,
      })
    );
    const energyMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x082f49,
        emissive: 0x38bdf8,
        emissiveIntensity: 2.1,
        roughness: 0.15,
        metalness: 0.3,
      })
    );
    const eyeGlowMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
      })
    );
    const edgeWireMat = trackMat(
      new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
      })
    );

    // Root 3D AI Mecha Robot Bust Assembly (sharp angular silhouette — NOT a round orb!)
    const mechRoot = new THREE.Group();
    scene.add(mechRoot);

    // --- 1. ANGULAR TORSO CHASSIS & NECK COLUMN ---
    const torsoShape = new THREE.Shape();
    torsoShape.moveTo(-0.88, 0.32);
    torsoShape.lineTo(0.88, 0.32);
    torsoShape.lineTo(1.12, -0.04);
    torsoShape.lineTo(0.72, -0.78);
    torsoShape.lineTo(-0.72, -0.78);
    torsoShape.lineTo(-1.12, -0.04);
    torsoShape.closePath();

    const torsoGeo = trackGeo(
      new THREE.ExtrudeGeometry(torsoShape, {
        depth: 0.72,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.08,
        bevelSegments: 2,
      })
    );
    torsoGeo.center();
    const torsoMesh = new THREE.Mesh(torsoGeo, darkArmorMat);
    torsoMesh.position.set(0, -0.78, -0.04);
    mechRoot.add(torsoMesh);

    // Faceted Titanium Collar & Servo Neck
    const collarGeo = trackGeo(new THREE.CylinderGeometry(0.42, 0.54, 0.22, 8));
    const collarMesh = new THREE.Mesh(collarGeo, titaniumMat);
    collarMesh.position.set(0, -0.14, 0);
    mechRoot.add(collarMesh);

    const neckGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.28, 0.38, 8));
    const neckMesh = new THREE.Mesh(neckGeo, darkArmorMat);
    neckMesh.position.set(0, 0.1, 0);
    mechRoot.add(neckMesh);

    // Sloped Left & Right Shoulder Pauldrons + Glowing Trim Strips
    const pauldronGeo = trackGeo(new THREE.BoxGeometry(0.74, 0.34, 0.68));
    const trimBarGeo = trackGeo(new THREE.BoxGeometry(0.62, 0.055, 0.72));

    const leftPauldron = new THREE.Group();
    leftPauldron.position.set(-1.14, -0.36, -0.02);
    leftPauldron.rotation.z = 0.28;
    leftPauldron.add(new THREE.Mesh(pauldronGeo, titaniumMat));
    const leftTrim = new THREE.Mesh(trimBarGeo, energyMat);
    leftTrim.position.y = 0.16;
    leftPauldron.add(leftTrim);
    mechRoot.add(leftPauldron);

    const rightPauldron = new THREE.Group();
    rightPauldron.position.set(1.14, -0.36, -0.02);
    rightPauldron.rotation.z = -0.28;
    rightPauldron.add(new THREE.Mesh(pauldronGeo, titaniumMat));
    const rightTrim = new THREE.Mesh(trimBarGeo, energyMat);
    rightTrim.position.y = 0.16;
    rightPauldron.add(rightTrim);
    mechRoot.add(rightPauldron);

    // Hexagonal Chest Energy Reactor Core
    const reactorBezelGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.36, 0.12, 6));
    const reactorBezel = new THREE.Mesh(reactorBezelGeo, titaniumMat);
    reactorBezel.rotation.x = Math.PI / 2;
    reactorBezel.position.set(0, -0.68, 0.41);
    mechRoot.add(reactorBezel);

    const reactorCoreGeo = trackGeo(new THREE.CylinderGeometry(0.21, 0.21, 0.15, 6));
    const reactorCore = new THREE.Mesh(reactorCoreGeo, energyMat);
    reactorCore.rotation.x = Math.PI / 2;
    reactorCore.position.set(0, -0.68, 0.43);
    mechRoot.add(reactorCore);

    // --- 2. ANGULAR CYBERNETIC HEAD + ARTICULATED JAW + TWIN V-FIN ANTENNAE ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.72, 0.02);
    mechRoot.add(headGroup);

    // Sharp Faceted Helmet Crown
    const helmetShape = new THREE.Shape();
    helmetShape.moveTo(-0.56, -0.18);
    helmetShape.lineTo(-0.62, 0.26);
    helmetShape.lineTo(-0.34, 0.62);
    helmetShape.lineTo(0.34, 0.62);
    helmetShape.lineTo(0.62, 0.26);
    helmetShape.lineTo(0.56, -0.18);
    helmetShape.closePath();

    const helmetGeo = trackGeo(
      new THREE.ExtrudeGeometry(helmetShape, {
        depth: 0.76,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.05,
        bevelSegments: 2,
      })
    );
    helmetGeo.center();
    const helmetMesh = new THREE.Mesh(helmetGeo, titaniumMat);
    helmetMesh.position.set(0, 0.14, -0.02);
    headGroup.add(helmetMesh);

    // Crown Central Crest Blade
    const crestGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.32, 0.88));
    const crestMesh = new THREE.Mesh(crestGeo, darkArmorMat);
    crestMesh.position.set(0, 0.64, 0);
    headGroup.add(crestMesh);

    const crestGlowGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.12, 0.56));
    const crestGlow = new THREE.Mesh(crestGlowGeo, energyMat);
    crestGlow.position.set(0, 0.78, 0.06);
    headGroup.add(crestGlow);

    // Twin Swept-Back Telemetry V-Fin Antennae
    const antennaBladeGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.72, 0.16));
    const tipBeaconGeo = trackGeo(new THREE.OctahedronGeometry(0.06, 0));

    const leftAntenna = new THREE.Group();
    leftAntenna.position.set(-0.64, 0.38, -0.06);
    leftAntenna.rotation.set(-0.22, 0, 0.34);
    leftAntenna.add(new THREE.Mesh(antennaBladeGeo, darkArmorMat));
    const leftTip = new THREE.Mesh(tipBeaconGeo, energyMat);
    leftTip.position.y = 0.38;
    leftAntenna.add(leftTip);
    headGroup.add(leftAntenna);

    const rightAntenna = new THREE.Group();
    rightAntenna.position.set(0.64, 0.38, -0.06);
    rightAntenna.rotation.set(-0.22, 0, -0.34);
    rightAntenna.add(new THREE.Mesh(antennaBladeGeo, darkArmorMat));
    const rightTip = new THREE.Mesh(tipBeaconGeo, energyMat);
    rightTip.position.y = 0.38;
    rightAntenna.add(rightTip);
    headGroup.add(rightAntenna);

    // Cheek Side Armor Wings
    const cheekPlateGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.36, 0.58));
    const leftCheek = new THREE.Mesh(cheekPlateGeo, darkArmorMat);
    leftCheek.position.set(-0.58, -0.1, 0.08);
    leftCheek.rotation.z = -0.14;
    headGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekPlateGeo, darkArmorMat);
    rightCheek.position.set(0.58, -0.1, 0.08);
    rightCheek.rotation.z = 0.14;
    headGroup.add(rightCheek);

    // Wide Obsidian Cyber-Visor + Luminous Twin Scanner Eyes
    const visorHousingGeo = trackGeo(new THREE.BoxGeometry(1.06, 0.28, 0.28));
    const visorHousing = new THREE.Mesh(visorHousingGeo, visorGlassMat);
    visorHousing.position.set(0, 0.1, 0.34);
    headGroup.add(visorHousing);

    const visorSlitGeo = trackGeo(new THREE.BoxGeometry(0.96, 0.04, 0.06));
    const visorSlit = new THREE.Mesh(visorSlitGeo, energyMat);
    visorSlit.position.set(0, 0.1, 0.48);
    headGroup.add(visorSlit);

    const opticEyeGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.095, 0.07));
    const leftOptic = new THREE.Mesh(opticEyeGeo, eyeGlowMat);
    leftOptic.position.set(-0.24, 0.1, 0.49);
    leftOptic.rotation.z = -0.08;
    headGroup.add(leftOptic);

    const rightOptic = new THREE.Mesh(opticEyeGeo, eyeGlowMat);
    rightOptic.position.set(0.24, 0.1, 0.49);
    rightOptic.rotation.z = 0.08;
    headGroup.add(rightOptic);

    // Articulated Chin / Jaw Voice Synchronizer Plate
    const jawGroup = new THREE.Group();
    jawGroup.position.set(0, -0.22, 0.16);
    const jawGeo = trackGeo(new THREE.BoxGeometry(0.56, 0.22, 0.46));
    const jawMesh = new THREE.Mesh(jawGeo, darkArmorMat);
    jawGroup.add(jawMesh);
    const vocalGrillGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.055, 0.08));
    const vocalGrill = new THREE.Mesh(vocalGrillGeo, energyMat);
    vocalGrill.position.set(0, 0.02, 0.23);
    jawGroup.add(vocalGrill);
    headGroup.add(jawGroup);

    // --- 3. TILTED HEXAGONAL HOLOGRAPHIC TELEMETRY FRAME BEHIND ROBOT ---
    const hexFrameGroup = new THREE.Group();
    hexFrameGroup.position.set(0, 0.08, -0.95);
    mechRoot.add(hexFrameGroup);

    const outerHexBase = new THREE.CylinderGeometry(2.05, 2.05, 0.03, 6, 1, true);
    const outerHexEdges = trackGeo(new THREE.EdgesGeometry(outerHexBase));
    outerHexBase.dispose();
    const outerHexFrame = new THREE.LineSegments(outerHexEdges, edgeWireMat);
    outerHexFrame.rotation.x = Math.PI / 2;
    hexFrameGroup.add(outerHexFrame);

    const innerHexBase = new THREE.CylinderGeometry(1.52, 1.52, 0.03, 6, 1, true);
    const innerHexEdges = trackGeo(new THREE.EdgesGeometry(innerHexBase));
    innerHexBase.dispose();
    const innerHexFrame = new THREE.LineSegments(innerHexEdges, edgeWireMat);
    innerHexFrame.rotation.x = Math.PI / 2;
    innerHexFrame.rotation.y = Math.PI / 6;
    hexFrameGroup.add(innerHexFrame);

    // Six Orbiting Diamond Data Nodes around the Hex Frame
    const diamondGeo = trackGeo(new THREE.OctahedronGeometry(0.08, 0));
    const dataNodes: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const node = new THREE.Mesh(diamondGeo, energyMat);
      node.position.set(Math.cos(ang) * 2.05, Math.sin(ang) * 2.05, 0);
      hexFrameGroup.add(node);
      dataNodes.push(node);
    }

    // Subtle Rising Ambient Neural Sparkles (clean low-density holographic aura)
    const SPARK_COUNT = 220;
    const sparkPos = new Float32Array(SPARK_COUNT * 3);
    const sparkBaseY = new Float32Array(SPARK_COUNT);
    const sparkSpeed = new Float32Array(SPARK_COUNT);
    for (let i = 0; i < SPARK_COUNT; i++) {
      sparkPos[i * 3] = (Math.random() - 0.5) * 4.6;
      const y = (Math.random() - 0.5) * 3.8;
      sparkPos[i * 3 + 1] = y;
      sparkBaseY[i] = y;
      sparkPos[i * 3 + 2] = -1.8 + Math.random() * 2.4;
      sparkSpeed[i] = 0.15 + Math.random() * 0.35;
    }
    const sparkGeo = trackGeo(new THREE.BufferGeometry());
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = trackMat(
      new THREE.PointsMaterial({
        size: 0.065,
        color: 0x38bdf8,
        map: glowTex,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    // Subtle Backdrop Halo behind Robot
    const haloMat = trackMat(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const haloSprite = new THREE.Sprite(haloMat);
    haloSprite.position.set(0, 0.1, -1.5);
    haloSprite.scale.set(5.2, 5.2, 1);
    scene.add(haloSprite);

    // --- 4. CELESTIAL 3D CRESCENT MOON & 3D STARS NEAR ROBOT (چاند اور تارے) ---
    const celestialGroup = new THREE.Group();
    scene.add(celestialGroup);

    // Sculpted 3D Beveled Crescent Moon positioned beside the robot's upper-left shoulder/crown
    const moonShape = new THREE.Shape();
    const outerMoonR = 0.56;
    const innerMoonR = 0.44;
    const innerOffsetX = 0.24;
    const innerOffsetY = 0.08;
    const arcSteps = 44;
    // Build crescent contour by tracing outer sunlit arc then inner shadow arc back to start
    const startAngle = Math.PI * 0.32;
    const endAngle = Math.PI * 1.68;
    const pStartX = Math.cos(startAngle) * outerMoonR;
    const pStartY = Math.sin(startAngle) * outerMoonR;
    const pEndX = Math.cos(endAngle) * outerMoonR;
    const pEndY = Math.sin(endAngle) * outerMoonR;
    moonShape.moveTo(pStartX, pStartY);
    for (let i = 1; i <= arcSteps; i++) {
      const a = startAngle + ((endAngle - startAngle) * i) / arcSteps;
      moonShape.lineTo(Math.cos(a) * outerMoonR, Math.sin(a) * outerMoonR);
    }
    const iEndAng = Math.atan2(pEndY - innerOffsetY, pEndX - innerOffsetX);
    let iStartAng = Math.atan2(pStartY - innerOffsetY, pStartX - innerOffsetX);
    if (iStartAng < iEndAng) iStartAng += Math.PI * 2;
    for (let i = 1; i <= arcSteps; i++) {
      const a = iEndAng + ((iStartAng - iEndAng) * i) / arcSteps;
      moonShape.lineTo(
        innerOffsetX + Math.cos(a) * innerMoonR,
        innerOffsetY + Math.sin(a) * innerMoonR
      );
    }
    moonShape.closePath();

    const moonGeo = trackGeo(
      new THREE.ExtrudeGeometry(moonShape, {
        depth: 0.14,
        bevelEnabled: true,
        bevelThickness: 0.045,
        bevelSize: 0.035,
        bevelSegments: 3,
        curveSegments: 24,
      })
    );
    moonGeo.center();

    const moonMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xfde68a,
        emissiveIntensity: 0.85,
        metalness: 0.35,
        roughness: 0.25,
      })
    );
    const moonGroup = new THREE.Group();
    moonGroup.position.set(-1.58, 1.08, -0.35);
    moonGroup.rotation.set(0.08, 0.24, -0.22);
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moonMesh);

    const moonAuraMat = trackMat(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xfef08a,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const moonAura = new THREE.Sprite(moonAuraMat);
    moonAura.position.set(-0.08, 0, -0.08);
    moonAura.scale.set(2.3, 2.3, 1);
    moonGroup.add(moonAura);

    const moonLight = new THREE.PointLight(0xfef08a, 1.8, 5.5);
    moonLight.position.set(0, 0, 0.35);
    moonGroup.add(moonLight);
    celestialGroup.add(moonGroup);

    // Sculpted 3D 5-Pointed Celestial Stars (InstancedMesh framing the moon & robot!)
    const starShape = new THREE.Shape();
    const starPoints = 5;
    const starOuterR = 0.13;
    const starInnerR = 0.052;
    for (let i = 0; i < starPoints * 2; i++) {
      const r = i % 2 === 0 ? starOuterR : starInnerR;
      const a = (i / (starPoints * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) starShape.moveTo(x, y);
      else starShape.lineTo(x, y);
    }
    starShape.closePath();

    const starGeo = trackGeo(
      new THREE.ExtrudeGeometry(starShape, {
        depth: 0.036,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.012,
        bevelSegments: 2,
      })
    );
    starGeo.center();

    const starMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xfef9c3,
        emissiveIntensity: 1.15,
        metalness: 0.45,
        roughness: 0.2,
      })
    );

    const STAR_LAYOUT: Array<{ x: number; y: number; z: number; s: number; phase: number; gold: boolean }> = [
      // Cluster near Crescent Moon (upper-left)
      { x: -1.02, y: 1.44, z: -0.25, s: 0.92, phase: 0.2, gold: true },
      { x: -2.02, y: 0.56, z: -0.45, s: 0.72, phase: 1.4, gold: false },
      { x: -1.24, y: 0.62, z: -0.15, s: 0.56, phase: 2.3, gold: true },
      { x: -2.14, y: 1.48, z: -0.62, s: 0.68, phase: 3.1, gold: false },
      { x: -0.78, y: 1.05, z: -0.42, s: 0.5, phase: 4.0, gold: true },
      // Companion 3D Stars framing upper-right & sides of Robot
      { x: 1.56, y: 1.28, z: -0.32, s: 1.05, phase: 0.8, gold: true },
      { x: 1.94, y: 0.82, z: -0.48, s: 0.74, phase: 1.9, gold: false },
      { x: 1.24, y: 1.56, z: -0.5, s: 0.64, phase: 2.7, gold: false },
      { x: 1.92, y: 1.54, z: -0.68, s: 0.58, phase: 3.8, gold: true },
      { x: 1.58, y: 0.34, z: -0.35, s: 0.55, phase: 4.7, gold: true },
      { x: -1.68, y: -0.22, z: -0.5, s: 0.6, phase: 5.2, gold: false },
      { x: 1.72, y: -0.32, z: -0.52, s: 0.62, phase: 1.1, gold: false },
      { x: 0.02, y: 1.74, z: -0.58, s: 0.76, phase: 2.5, gold: true },
      { x: -0.52, y: 1.62, z: -0.65, s: 0.52, phase: 3.6, gold: false },
    ];

    const starInstances = new THREE.InstancedMesh(starGeo, starMat, STAR_LAYOUT.length);
    starInstances.frustumCulled = false;
    const _starDummy = new THREE.Object3D();
    const _starWarmColor = new THREE.Color(0xfef08a);
    const _starIceColor = new THREE.Color(0xe0f2fe);
    for (let i = 0; i < STAR_LAYOUT.length; i++) {
      const cfg = STAR_LAYOUT[i];
      _starDummy.position.set(cfg.x, cfg.y, cfg.z);
      _starDummy.scale.setScalar(cfg.s);
      _starDummy.rotation.set(0, 0, cfg.phase * 0.4);
      _starDummy.updateMatrix();
      starInstances.setMatrixAt(i, _starDummy.matrix);
      starInstances.setColorAt(i, cfg.gold ? _starWarmColor : _starIceColor);
    }
    starInstances.instanceMatrix.needsUpdate = true;
    if (starInstances.instanceColor) starInstances.instanceColor.needsUpdate = true;
    celestialGroup.add(starInstances);

    // Distant Night-Sky Starfield (Points backdrop behind moon & robot)
    const SKY_STAR_COUNT = 180;
    const skyPos = new Float32Array(SKY_STAR_COUNT * 3);
    const skyCol = new Float32Array(SKY_STAR_COUNT * 3);
    const _skyColorTmp = new THREE.Color();
    for (let i = 0; i < SKY_STAR_COUNT; i++) {
      skyPos[i * 3] = (Math.random() - 0.5) * 6.8;
      skyPos[i * 3 + 1] = -1.6 + Math.random() * 3.8;
      skyPos[i * 3 + 2] = -2.5 + Math.random() * 1.4;
      const pick = Math.random();
      _skyColorTmp.setHex(pick < 0.45 ? 0xfef3c7 : pick < 0.8 ? 0xe0f2fe : 0xffffff);
      skyCol[i * 3] = _skyColorTmp.r;
      skyCol[i * 3 + 1] = _skyColorTmp.g;
      skyCol[i * 3 + 2] = _skyColorTmp.b;
    }
    const skyStarGeo = trackGeo(new THREE.BufferGeometry());
    skyStarGeo.setAttribute('position', new THREE.BufferAttribute(skyPos, 3));
    skyStarGeo.setAttribute('color', new THREE.BufferAttribute(skyCol, 3));
    const skyStarMat = trackMat(
      new THREE.PointsMaterial({
        size: 0.055,
        map: glowTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const skyStars = new THREE.Points(skyStarGeo, skyStarMat);
    scene.add(skyStars);

    const targetColor = new THREE.Color(STATE_PALETTE.standby);
    const whiteColor = new THREE.Color(0xffffff);

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      stateRef.current.pointerX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      stateRef.current.pointerY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    container.addEventListener('pointermove', onPointerMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || 320;
      height = container.clientHeight || 320;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let elapsed = 0;
    let animId = 0;
    let frameTimerId: number | null = null;

    const afterDraw = (cb: () => void) => {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        if (!sync) {
          frameTimerId = window.setTimeout(cb, 80);
          return;
        }
        const poll = () => {
          const status = gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (status === gl.UNSIGNALED) {
            frameTimerId = window.setTimeout(poll, 6);
          } else {
            gl.deleteSync(sync);
            frameTimerId = window.setTimeout(cb, 80);
          }
        };
        frameTimerId = window.setTimeout(poll, 6);
      } catch {
        frameTimerId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      const delta = Math.min(0.05, clock.getDelta() || 0.016);
      elapsed += delta;

      const {
        isSpeaking: speaking,
        isListening: listening,
        micVolume: vol,
        emotionMode: mood,
        uiTheme: activeUiTheme,
        heartLockLocked: locked,
        pointerX,
        pointerY,
      } = stateRef.current;

      const themeHex = THEME_BASE_HEX[activeUiTheme] || STATE_PALETTE.standby;
      const desiredHex = locked
        ? STATE_PALETTE.locked
        : speaking
        ? activeUiTheme === 'cyber_cyan'
          ? STATE_PALETTE.speaking
          : themeHex
        : listening
        ? STATE_PALETTE.listening
        : mood === 'calm' || mood === 'apnapan'
        ? themeHex
        : EMOTION_TINT[mood] || themeHex;

      targetColor.setHex(desiredHex);
      energyMat.emissive.lerp(targetColor, 0.1);
      edgeWireMat.color.lerp(targetColor, 0.1);
      sparkMat.color.lerp(targetColor, 0.1);
      haloMat.color.lerp(targetColor, 0.1);
      chestLight.color.lerp(targetColor, 0.1);
      rimLight.color.lerp(targetColor, 0.1);
      eyeGlowMat.color.copy(targetColor).lerp(whiteColor, 0.55);

      const audioEnergy = speaking
        ? 0.45 + Math.abs(Math.sin(elapsed * 12.5)) * 0.45
        : listening
        ? 0.14 + Math.min(1, vol / 45) * 0.65
        : 0.06;

      // Subtle floating hover + reactive breathing torso tilt
      mechRoot.position.y = Math.sin(elapsed * 1.5) * 0.055;
      mechRoot.rotation.y += (pointerX * 0.12 - mechRoot.rotation.y) * 0.05;

      // Head tracks pointer naturally and nods slightly during speech
      const speakNod = speaking ? Math.sin(elapsed * 7) * 0.04 : 0;
      headGroup.rotation.y += (pointerX * 0.34 - headGroup.rotation.y) * 0.08;
      headGroup.rotation.x += (-pointerY * 0.2 + speakNod - headGroup.rotation.x) * 0.08;

      // Articulated jaw opens smoothly with voice
      const targetJawY = -0.22 - (speaking ? audioEnergy * 0.11 : 0);
      jawGroup.position.y += (targetJawY - jawGroup.position.y) * 0.35;

      // Twin cyber-optic scanner eyes pulse & blink naturally every ~4.5s
      const blinkCycle = elapsed % 4.6;
      const blinkScale = blinkCycle > 4.42 && !speaking ? 0.15 : 1;
      const opticPulse = speaking ? 1 + Math.sin(elapsed * 18) * 0.22 : 1;
      leftOptic.scale.y = blinkScale * opticPulse;
      rightOptic.scale.y = blinkScale * opticPulse;

      // Chest reactor & energy strips glow with speech/listening
      energyMat.emissiveIntensity = 1.4 + audioEnergy * 2.4;
      reactorCore.scale.setScalar(1 + audioEnergy * 0.14);
      haloMat.opacity = 0.26 + audioEnergy * 0.32;

      // Crescent moon gentle float + lunar aura shimmer + twinkling 3D stars
      moonGroup.position.y = 1.08 + Math.sin(elapsed * 0.9) * 0.06;
      moonGroup.rotation.y = 0.24 + Math.sin(elapsed * 0.55) * 0.14;
      moonAuraMat.opacity = 0.42 + Math.sin(elapsed * 1.6) * 0.12 + audioEnergy * 0.15;
      moonMat.emissiveIntensity = 0.72 + audioEnergy * 0.45;
      celestialGroup.rotation.y += (pointerX * 0.06 - celestialGroup.rotation.y) * 0.04;

      for (let i = 0; i < STAR_LAYOUT.length; i++) {
        const cfg = STAR_LAYOUT[i];
        const twinkle = 0.78 + Math.sin(elapsed * 2.2 + cfg.phase) * 0.26 + audioEnergy * 0.16;
        _starDummy.position.set(
          cfg.x,
          cfg.y + Math.sin(elapsed * 0.95 + cfg.phase) * 0.045,
          cfg.z
        );
        _starDummy.rotation.set(
          Math.sin(elapsed * 0.7 + cfg.phase) * 0.25,
          elapsed * 0.65 + cfg.phase,
          cfg.phase * 0.4
        );
        _starDummy.scale.setScalar(cfg.s * twinkle);
        _starDummy.updateMatrix();
        starInstances.setMatrixAt(i, _starDummy.matrix);
      }
      starInstances.instanceMatrix.needsUpdate = true;
      skyStarMat.opacity = 0.72 + Math.sin(elapsed * 1.4) * 0.14;

      // Background hexagonal telemetry frame rotation (opposite directions)
      const spinMult = speaking ? 2.2 : listening ? 1.4 : 0.65;
      outerHexFrame.rotation.z += delta * 0.22 * spinMult;
      innerHexFrame.rotation.z -= delta * 0.32 * spinMult;
      for (let i = 0; i < dataNodes.length; i++) {
        dataNodes[i].rotation.y += delta * 1.8;
        dataNodes[i].rotation.x += delta * 1.1;
      }

      // Gently drifting ambient neural sparkles
      const spAttr = sparkGeo.attributes.position as THREE.BufferAttribute;
      const spArr = spAttr.array as Float32Array;
      for (let i = 0; i < SPARK_COUNT; i++) {
        const yIdx = i * 3 + 1;
        spArr[yIdx] += delta * sparkSpeed[i] * (speaking ? 1.8 : 1.0);
        if (spArr[yIdx] > 2.1) {
          spArr[yIdx] = -2.1;
        }
      }
      spAttr.needsUpdate = true;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        animId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      tick();
    } else {
      animId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(animId);
      if (frameTimerId !== null) window.clearTimeout(frameTimerId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('pointermove', onPointerMove);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      disposables.forEach((d) => {
        try {
          d.dispose();
        } catch {}
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      onClick={onTapOrb}
      role={onTapOrb ? 'button' : undefined}
      tabIndex={onTapOrb ? 0 : undefined}
      onKeyDown={(e) => {
        if (onTapOrb && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onTapOrb();
        }
      }}
      className={`relative w-full h-full min-h-[260px] flex items-center justify-center overflow-hidden ${
        onTapOrb ? 'cursor-pointer' : ''
      } ${className}`}
      aria-label="3D Cybernetic AI Robot Core"
    >
      {!glReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl rotate-45 bg-sky-500/15 border border-sky-400/60" />
        </div>
      )}
    </div>
  );
};
