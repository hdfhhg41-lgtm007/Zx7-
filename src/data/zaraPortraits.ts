import aiTeamStudioImg from '../assets/images/zara_ai_team_studio_1793789896669.jpg';
import fullbodySmilingImg from '../assets/images/zara_fullbody_smiling_1792834142233.jpg';
import sapphireGazeImg from '../assets/images/zara_sapphire_gaze_1792782506108.jpg';
import crimsonRoyalImg from '../assets/images/zara_crimson_royal_1792782507106.jpg';
import emeraldPrincessImg from '../assets/images/zara_emerald_princess_1792782509150.jpg';
import roseBlossomImg from '../assets/images/zara_rose_blossom_1792782509956.jpg';
import violetStarlightImg from '../assets/images/zara_violet_starlight_1792782512951.jpg';
import goldenMoonImg from '../assets/images/zara_golden_moon_1792782514959.jpg';
import cyberAngelImg from '../assets/images/zara_cyber_angel_1792782516501.jpg';
import snowCrystalImg from '../assets/images/zara_snow_crystal_1792782519064.jpg';
import pearlQueenImg from '../assets/images/zara_pearl_queen_1792782521919.jpg';
import midnightDupattaImg from '../assets/images/zara_midnight_dupatta_1792782521365.jpg';

export interface EyeAnchor {
  x: number; // Normalized 0..1 of image width
  y: number; // Normalized 0..1 of image height
  rx: number; // Horizontal eye radius (normalized width)
  ry: number; // Vertical eye radius (normalized height)
}

export interface MouthAnchor {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ZaraPortraitItem {
  id: string;
  name: string;
  nameHindi: string;
  nameUrdu: string;
  src: string;
  accentHex: string;
  butterflyColor: string;
  skinTone: string;
  lashColor: string;
  irisHighlight: string;
  leftEye: EyeAnchor;
  rightEye?: EyeAnchor; // Optional for side-profile portrait
  mouth: MouthAnchor;
  cropZoom?: number;
  cropPanY?: number;
  colorFilter?: string;
  isCustom?: boolean;
  hasLiveAssistants?: boolean;
}

const CUSTOM_PORTRAITS_STORAGE_KEY = 'zara_4d_custom_portraits_v1';

export const BUILTIN_ZARA_PORTRAITS: ZaraPortraitItem[] = [
  {
    id: 'ai_broadcast_studio',
    name: 'Zara Full-Body & AI Assistants Live TV Studio (Default)',
    nameHindi: 'ज़ारा फुल-बॉडी और एआई असिस्टेंट लाइव टीवी स्टूडियो',
    nameUrdu: 'زارا فل باڈی اور اے آئی اسسٹنٹس لائیو ٹی وی اسٹوڈیو',
    src: aiTeamStudioImg,
    accentHex: '#38bdf8',
    butterflyColor: '#7dd3fc',
    skinTone: '#e5baa8',
    lashColor: '#16111c',
    irisHighlight: '#bae6fd',
    leftEye: { x: 0.485, y: 0.301, rx: 0.011, ry: 0.0055 },
    rightEye: { x: 0.528, y: 0.301, rx: 0.011, ry: 0.0055 },
    mouth: { x: 0.506, y: 0.329, w: 0.032, h: 0.011 },
    hasLiveAssistants: true,
  },
  {
    id: 'fullbody_smiling',
    name: 'Courtyard Royal HD',
    nameHindi: 'शाही आँगन फुल-बॉडी HD',
    nameUrdu: 'شاہی آنگن فل باڈی مسکراتی زارا',
    src: fullbodySmilingImg,
    accentHex: '#ec4899',
    butterflyColor: '#fbcfe8',
    skinTone: '#d9a48d',
    lashColor: '#1b1114',
    irisHighlight: '#fde68a',
    leftEye: { x: 0.487, y: 0.328, rx: 0.0155, ry: 0.0068 },
    rightEye: { x: 0.525, y: 0.328, rx: 0.0155, ry: 0.0068 },
    mouth: { x: 0.506, y: 0.355, w: 0.036, h: 0.0125 },
  },
  {
    id: 'sapphire_gaze',
    name: 'Sapphire Gaze HD',
    nameHindi: 'नीलम परी (सीधी नज़र)',
    nameUrdu: 'نیلم پری (آپ کو دیکھتی زارا)',
    src: sapphireGazeImg,
    accentHex: '#3b82f6',
    butterflyColor: '#60a5fa',
    skinTone: '#f6d8d5',
    lashColor: '#121833',
    irisHighlight: '#93c5fd',
    leftEye: { x: 0.402, y: 0.355, rx: 0.048, ry: 0.025 },
    rightEye: { x: 0.594, y: 0.355, rx: 0.048, ry: 0.025 },
    mouth: { x: 0.498, y: 0.453, w: 0.085, h: 0.026 },
  },
  {
    id: 'midnight_dupatta',
    name: 'Starry Dupatta',
    nameHindi: 'सितारों वाला दुपट्टा',
    nameUrdu: 'تاروں بھرا شاہی دوپٹہ',
    src: midnightDupattaImg,
    accentHex: '#6366f1',
    butterflyColor: '#818cf8',
    skinTone: '#f2cfc9',
    lashColor: '#1a1019',
    irisHighlight: '#fde68a',
    leftEye: { x: 0.415, y: 0.322, rx: 0.048, ry: 0.024 },
    rightEye: { x: 0.585, y: 0.322, rx: 0.048, ry: 0.024 },
    mouth: { x: 0.5, y: 0.422, w: 0.09, h: 0.028 },
  },
  {
    id: 'golden_moon',
    name: 'Golden Crescent',
    nameHindi: 'सुनहरा चाँद रूप',
    nameUrdu: 'سنہری چاند دلکش لک',
    src: goldenMoonImg,
    accentHex: '#f59e0b',
    butterflyColor: '#fcd34d',
    skinTone: '#f0cbbd',
    lashColor: '#1b1420',
    irisHighlight: '#fde047',
    leftEye: { x: 0.412, y: 0.382, rx: 0.044, ry: 0.021 },
    rightEye: { x: 0.585, y: 0.382, rx: 0.044, ry: 0.021 },
    mouth: { x: 0.498, y: 0.487, w: 0.088, h: 0.026 },
  },
  {
    id: 'cyber_angel',
    name: 'Neon Sapphire',
    nameHindi: 'नियॉन ब्लू एंजल',
    nameUrdu: 'نیون فیروزی پری',
    src: cyberAngelImg,
    accentHex: '#06b6d4',
    butterflyColor: '#22d3ee',
    skinTone: '#ebd4df',
    lashColor: '#111c33',
    irisHighlight: '#67e8f9',
    leftEye: { x: 0.405, y: 0.365, rx: 0.048, ry: 0.023 },
    rightEye: { x: 0.602, y: 0.365, rx: 0.048, ry: 0.023 },
    mouth: { x: 0.503, y: 0.478, w: 0.088, h: 0.025 },
  },
  {
    id: 'rose_blossom',
    name: 'Sakura Rose',
    nameHindi: 'गुलाबी परी रूप',
    nameUrdu: 'گلابی بہار شہزادی',
    src: roseBlossomImg,
    accentHex: '#ec4899',
    butterflyColor: '#f9a8d4',
    skinTone: '#f9dadf',
    lashColor: '#261221',
    irisHighlight: '#93c5fd',
    leftEye: { x: 0.408, y: 0.312, rx: 0.047, ry: 0.023 },
    rightEye: { x: 0.592, y: 0.312, rx: 0.047, ry: 0.023 },
    mouth: { x: 0.5, y: 0.412, w: 0.085, h: 0.026 },
  },
  {
    id: 'violet_starlight',
    name: 'Cosmic Violet',
    nameHindi: 'बैंगनी सितारा परी',
    nameUrdu: 'بنفشی کہکشاں پری',
    src: violetStarlightImg,
    accentHex: '#a855f7',
    butterflyColor: '#d8b4fe',
    skinTone: '#f5d7e6',
    lashColor: '#1e1233',
    irisHighlight: '#e9d5ff',
    leftEye: { x: 0.404, y: 0.368, rx: 0.048, ry: 0.024 },
    rightEye: { x: 0.596, y: 0.368, rx: 0.048, ry: 0.024 },
    mouth: { x: 0.5, y: 0.472, w: 0.086, h: 0.025 },
  },
  {
    id: 'snow_crystal',
    name: 'Crystal Queen',
    nameHindi: 'बर्फानी क्रिस्टल रानी',
    nameUrdu: 'کرسٹل چاندنی ملکہ',
    src: snowCrystalImg,
    accentHex: '#38bdf8',
    butterflyColor: '#bae6fd',
    skinTone: '#eed7e2',
    lashColor: '#141b33',
    irisHighlight: '#7dd3fc',
    leftEye: { x: 0.408, y: 0.382, rx: 0.048, ry: 0.023 },
    rightEye: { x: 0.59, y: 0.382, rx: 0.048, ry: 0.023 },
    mouth: { x: 0.499, y: 0.486, w: 0.08, h: 0.024 },
  },
  {
    id: 'pearl_queen',
    name: 'Royal Pearl',
    nameHindi: 'मोतियों की शहज़ादी',
    nameUrdu: 'موتیوں کی شہزادی',
    src: pearlQueenImg,
    accentHex: '#93c5fd',
    butterflyColor: '#f8fafc',
    skinTone: '#f7dfe3',
    lashColor: '#1c1826',
    irisHighlight: '#dbeafe',
    leftEye: { x: 0.404, y: 0.348, rx: 0.044, ry: 0.02 },
    rightEye: { x: 0.596, y: 0.348, rx: 0.044, ry: 0.02 },
    mouth: { x: 0.5, y: 0.474, w: 0.086, h: 0.025 },
  },
  {
    id: 'emerald_princess',
    name: 'Emerald Begum',
    nameHindi: 'शाही ज़मुर्रद रूप',
    nameUrdu: 'شاہی زمرد شہزادی',
    src: emeraldPrincessImg,
    accentHex: '#10b981',
    butterflyColor: '#6ee7b7',
    skinTone: '#f1c7bc',
    lashColor: '#1e1412',
    irisHighlight: '#a7f3d0',
    leftEye: { x: 0.398, y: 0.332, rx: 0.05, ry: 0.025 },
    rightEye: { x: 0.602, y: 0.332, rx: 0.05, ry: 0.025 },
    mouth: { x: 0.5, y: 0.448, w: 0.11, h: 0.028 },
  },
  {
    id: 'crimson_royal',
    name: 'Crimson Bridal',
    nameHindi: 'शाही सुर्ख़ दुल्हन',
    nameUrdu: 'شاہی سرخ عروسی لک',
    src: crimsonRoyalImg,
    accentHex: '#f43f5e',
    butterflyColor: '#fda4af',
    skinTone: '#f6d2c4',
    lashColor: '#241314',
    irisHighlight: '#99f6e4',
    leftEye: { x: 0.404, y: 0.372, rx: 0.05, ry: 0.025 },
    rightEye: { x: 0.596, y: 0.372, rx: 0.05, ry: 0.025 },
    mouth: { x: 0.5, y: 0.476, w: 0.1, h: 0.028 },
  },
  {
    id: 'sapphire_closeup',
    name: 'Intimate Sapphire',
    nameHindi: 'क़रीबी प्यार भरी नज़र',
    nameUrdu: 'قریب سے محبت بھری نظر',
    src: sapphireGazeImg,
    accentHex: '#60a5fa',
    butterflyColor: '#93c5fd',
    skinTone: '#f6d8d5',
    lashColor: '#121833',
    irisHighlight: '#bfdbfe',
    leftEye: { x: 0.402, y: 0.355, rx: 0.048, ry: 0.025 },
    rightEye: { x: 0.594, y: 0.355, rx: 0.048, ry: 0.025 },
    mouth: { x: 0.498, y: 0.453, w: 0.085, h: 0.026 },
    cropZoom: 1.24,
    cropPanY: -0.05,
  },
  {
    id: 'twilight_magenta',
    name: 'Twilight Glow',
    nameHindi: 'शाम-ए-मोहब्बत ग्लो',
    nameUrdu: 'شامِ محبت گلابی جلوہ',
    src: sapphireGazeImg,
    accentHex: '#e879f9',
    butterflyColor: '#f5d0fe',
    skinTone: '#f5d2df',
    lashColor: '#1c1230',
    irisHighlight: '#f0abfc',
    leftEye: { x: 0.402, y: 0.355, rx: 0.048, ry: 0.025 },
    rightEye: { x: 0.594, y: 0.355, rx: 0.048, ry: 0.025 },
    mouth: { x: 0.498, y: 0.453, w: 0.085, h: 0.026 },
    colorFilter: 'hue-rotate(42deg) saturate(1.18)',
  },
  {
    id: 'aurora_dream',
    name: 'Aurora Dream',
    nameHindi: 'सतरंगी परी रूप',
    nameUrdu: 'قوسِ قزح پری لک',
    src: midnightDupattaImg,
    accentHex: '#2dd4bf',
    butterflyColor: '#5eead4',
    skinTone: '#f2cfc9',
    lashColor: '#141824',
    irisHighlight: '#99f6e4',
    leftEye: { x: 0.415, y: 0.322, rx: 0.048, ry: 0.024 },
    rightEye: { x: 0.585, y: 0.322, rx: 0.048, ry: 0.024 },
    mouth: { x: 0.5, y: 0.422, w: 0.09, h: 0.028 },
    colorFilter: 'hue-rotate(-28deg) saturate(1.2)',
  },
];

export function loadCustomPortraits(): ZaraPortraitItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PORTRAITS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomPortrait(dataUrl: string, label?: string): ZaraPortraitItem {
  const existing = loadCustomPortraits();
  const item: ZaraPortraitItem = {
    id: `custom_${Date.now()}`,
    name: label || `My Zara #${existing.length + 1}`,
    nameHindi: label || `मेरी ज़ारा #${existing.length + 1}`,
    nameUrdu: label || `میری زارا #${existing.length + 1}`,
    src: dataUrl,
    accentHex: '#ec4899',
    butterflyColor: '#60a5fa',
    skinTone: '#f0cfc8',
    lashColor: '#181326',
    irisHighlight: '#93c5fd',
    leftEye: { x: 0.41, y: 0.35, rx: 0.046, ry: 0.023 },
    rightEye: { x: 0.59, y: 0.35, rx: 0.046, ry: 0.023 },
    mouth: { x: 0.5, y: 0.46, w: 0.085, h: 0.025 },
    isCustom: true,
  };
  const updated = [item, ...existing].slice(0, 8);
  try {
    localStorage.setItem(CUSTOM_PORTRAITS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota overflow for very large images
  }
  return item;
}

export function deleteCustomPortrait(id: string) {
  const existing = loadCustomPortraits().filter((p) => p.id !== id);
  try {
    localStorage.setItem(CUSTOM_PORTRAITS_STORAGE_KEY, JSON.stringify(existing));
  } catch {}
}

export function getAllZaraPortraits(): ZaraPortraitItem[] {
  return [...loadCustomPortraits(), ...BUILTIN_ZARA_PORTRAITS];
}

export function getZaraPortraitById(id?: string): ZaraPortraitItem {
  const all = getAllZaraPortraits();
  if (!id) return all[0];
  return all.find((p) => p.id === id) || all[0];
}
