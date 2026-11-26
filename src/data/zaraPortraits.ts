import royalHomeImg from '../assets/images/zara_royal_home_1795353031349.jpg';
import royalCallImg from '../assets/images/zara_royal_call_1795353030804.jpg';
import royalSmileImg from '../assets/images/zara_royal_smile_1795353030373.jpg';

export interface EyeAnchor {
  x: number;
  y: number;
  rx: number;
  ry: number;
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
  rightEye?: EyeAnchor;
  mouth: MouthAnchor;
  cropZoom?: number;
  cropPanY?: number;
  objectPosition?: string;
  colorFilter?: string;
  isCustom?: boolean;
  hasLiveAssistants?: boolean;
}

const CUSTOM_PORTRAITS_STORAGE_KEY = 'zara_4d_custom_portraits_v1';

export const DEFAULT_ZARA_HOME_PORTRAIT_ID = 'royal_home';
export const DEFAULT_ZARA_CALL_PORTRAIT_ID = 'royal_call';

export const BUILTIN_ZARA_PORTRAITS: ZaraPortraitItem[] = [
  {
    id: 'royal_home',
    name: 'Royal Violet Zara',
    nameHindi: 'रॉयल वायलेट ज़ारा',
    nameUrdu: 'رائل وائلٹ زارا',
    src: royalHomeImg,
    accentHex: '#c084fc',
    butterflyColor: '#e879f9',
    skinTone: '#f8dcd6',
    lashColor: '#1f1218',
    irisHighlight: '#fde68a',
    leftEye: { x: 0.56, y: 0.34, rx: 0.036, ry: 0.018 },
    rightEye: { x: 0.72, y: 0.37, rx: 0.036, ry: 0.018 },
    mouth: { x: 0.63, y: 0.48, w: 0.08, h: 0.025 },
    objectPosition: '50% 18%',
  },
  {
    id: 'royal_call',
    name: 'Wink & Heart Zara',
    nameHindi: 'दिल इशारा ज़ारा',
    nameUrdu: 'دل اشارہ زارا',
    src: royalCallImg,
    accentHex: '#e879f9',
    butterflyColor: '#f0abfc',
    skinTone: '#f8dcd6',
    lashColor: '#1f1218',
    irisHighlight: '#fde68a',
    leftEye: { x: 0.49, y: 0.38, rx: 0.038, ry: 0.018 },
    rightEye: { x: 0.66, y: 0.36, rx: 0.038, ry: 0.018 },
    mouth: { x: 0.59, y: 0.49, w: 0.08, h: 0.024 },
    objectPosition: '50% 22%',
  },
  {
    id: 'royal_smile',
    name: 'Velvet Smile Zara',
    nameHindi: 'प्यारी मुस्कान ज़ारा',
    nameUrdu: 'پیاری مسکان زارا',
    src: royalSmileImg,
    accentHex: '#a855f7',
    butterflyColor: '#d8b4fe',
    skinTone: '#f8dcd6',
    lashColor: '#1f1218',
    irisHighlight: '#fde68a',
    leftEye: { x: 0.41, y: 0.35, rx: 0.04, ry: 0.02 },
    rightEye: { x: 0.59, y: 0.35, rx: 0.04, ry: 0.02 },
    mouth: { x: 0.5, y: 0.46, w: 0.085, h: 0.026 },
    objectPosition: '50% 16%',
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
    accentHex: '#c084fc',
    butterflyColor: '#e879f9',
    skinTone: '#f8dcd6',
    lashColor: '#1f1218',
    irisHighlight: '#fde68a',
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
  return [...BUILTIN_ZARA_PORTRAITS, ...loadCustomPortraits()];
}

export function isBuiltin2DPortraitId(id?: string): boolean {
  if (!id) return false;
  return BUILTIN_ZARA_PORTRAITS.some((p) => p.id === id);
}

export function getZaraPortraitById(id?: string): ZaraPortraitItem {
  const all = getAllZaraPortraits();
  if (!id) return BUILTIN_ZARA_PORTRAITS[0];
  return all.find((p) => p.id === id) || BUILTIN_ZARA_PORTRAITS[0];
}
