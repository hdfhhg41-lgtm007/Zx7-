import { VisionMode } from '../types';

export type MobileItemCategory = 'mobile_settings' | 'social' | 'media' | 'system' | 'utility';

export interface MobileAppDefinition {
  id: string;
  name: string;
  nameHindi: string;
  nameUrdu: string;
  category: MobileItemCategory;
  locationLabel: string;
  iconEmoji: string;
  accentClass: string;
  keywords: string[];
  androidIntent: string;
  iosScheme: string;
  nativeScheme: string;
  packageId?: string;
  isCustom?: boolean;
}

export interface MobileBrandProfile {
  id: string;
  name: string;
  osName: string;
  badgeText: string;
  settingsPathHint: string;
}

export interface DetectedAppCommand {
  action: 'open' | 'close' | 'back';
  app: MobileAppDefinition | null;
  closeAll?: boolean;
  query?: string;
}

export interface MobilePermissionsStatus {
  microphone: 'granted' | 'denied' | 'prompt';
  camera: 'granted' | 'denied' | 'prompt';
  notifications: 'granted' | 'denied' | 'prompt';
  geolocation: 'granted' | 'denied' | 'prompt';
  persistentStorage: 'granted' | 'prompt';
  biometricAvailable: boolean;
  screenShare: 'ready' | 'active';
  appControl: 'enabled';
}

export interface MobileHardwareTelemetry {
  batteryLevel: number | null;
  isCharging: boolean | null;
  networkType: string;
  online: boolean;
  cores: number;
  memoryGb: number | null;
  storageUsedMb: number | null;
  platformLabel: string;
}

const CUSTOM_APPS_STORAGE_KEY = 'zara_custom_mobile_apps_v2';
const SELECTED_BRAND_STORAGE_KEY = 'zara_selected_mobile_brand_v1';

export const ALL_MOBILE_BRANDS: MobileBrandProfile[] = [
  {
    id: 'all_mobiles',
    name: 'All Mobile Phones (Universal)',
    osName: 'Android & iOS Universal',
    badgeText: 'Universal Ready',
    settingsPathHint: 'Settings -> Apps -> Permissions -> Allow All',
  },
  {
    id: 'samsung',
    name: 'Samsung Galaxy',
    osName: 'One UI Android',
    badgeText: 'Samsung Ready',
    settingsPathHint: 'Settings -> Apps -> Zara 4D -> Permissions',
  },
  {
    id: 'vivo',
    name: 'Vivo / iQOO',
    osName: 'Funtouch / OriginOS',
    badgeText: 'Vivo Ready',
    settingsPathHint: 'Settings -> Apps & Permissions -> App Manager',
  },
  {
    id: 'oppo',
    name: 'Oppo',
    osName: 'ColorOS Android',
    badgeText: 'Oppo Ready',
    settingsPathHint: 'Settings -> Apps -> App Management -> Permissions',
  },
  {
    id: 'xiaomi',
    name: 'Xiaomi / Redmi / Poco',
    osName: 'HyperOS / MIUI',
    badgeText: 'Redmi Ready',
    settingsPathHint: 'Settings -> Apps -> Manage Apps -> Permissions',
  },
  {
    id: 'infinix',
    name: 'Infinix',
    osName: 'XOS Android',
    badgeText: 'Infinix Ready',
    settingsPathHint: 'Settings -> App Management -> App Settings -> Permissions',
  },
  {
    id: 'tecno',
    name: 'Tecno / Itel',
    osName: 'HiOS Android',
    badgeText: 'Tecno Ready',
    settingsPathHint: 'Settings -> App Management -> App List -> Permissions',
  },
  {
    id: 'realme',
    name: 'Realme',
    osName: 'Realme UI Android',
    badgeText: 'Realme Ready',
    settingsPathHint: 'Settings -> Apps -> App Management -> Permissions',
  },
  {
    id: 'oneplus',
    name: 'OnePlus',
    osName: 'OxygenOS Android',
    badgeText: 'OnePlus Ready',
    settingsPathHint: 'Settings -> Apps -> App Management -> Permissions',
  },
  {
    id: 'huawei',
    name: 'Huawei / Honor',
    osName: 'EMUI / MagicOS',
    badgeText: 'Huawei Ready',
    settingsPathHint: 'Settings -> Apps & Services -> Permission Manager',
  },
  {
    id: 'pixel',
    name: 'Google Pixel / Motorola / Nokia',
    osName: 'Android 14 / 15',
    badgeText: 'Stock Android',
    settingsPathHint: 'Settings -> Apps -> See All Apps -> Permissions',
  },
  {
    id: 'iphone',
    name: 'Apple iPhone / iPad',
    osName: 'iOS / iPadOS',
    badgeText: 'iPhone Ready',
    settingsPathHint: 'Settings -> Privacy & Security -> Microphone & Camera',
  },
];

export function detectCurrentMobileBrand(): string {
  if (typeof navigator === 'undefined') return 'all_mobiles';
  const ua = (navigator.userAgent || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'iphone';
  if (/samsung|sm-|gt-/.test(ua)) return 'samsung';
  if (/vivo|v2\d{3}|iqoo/.test(ua)) return 'vivo';
  if (/oppo|cph\d{4}/.test(ua)) return 'oppo';
  if (/xiaomi|redmi|poco|mi\s/.test(ua)) return 'xiaomi';
  if (/infinix/.test(ua)) return 'infinix';
  if (/tecno|itel/.test(ua)) return 'tecno';
  if (/realme|rmx\d{4}/.test(ua)) return 'realme';
  if (/oneplus/.test(ua)) return 'oneplus';
  if (/huawei|honor/.test(ua)) return 'huawei';
  if (/pixel|moto|nokia/.test(ua)) return 'pixel';
  return 'all_mobiles';
}

export function getSelectedMobileBrand(): MobileBrandProfile {
  try {
    const saved = localStorage.getItem(SELECTED_BRAND_STORAGE_KEY);
    if (saved) {
      const found = ALL_MOBILE_BRANDS.find((b) => b.id === saved);
      if (found) return found;
    }
  } catch {}
  const detectedId = detectCurrentMobileBrand();
  return ALL_MOBILE_BRANDS.find((b) => b.id === detectedId) || ALL_MOBILE_BRANDS[0];
}

export function setSelectedMobileBrand(brandId: string): MobileBrandProfile {
  const found = ALL_MOBILE_BRANDS.find((b) => b.id === brandId) || ALL_MOBILE_BRANDS[0];
  try {
    localStorage.setItem(SELECTED_BRAND_STORAGE_KEY, found.id);
  } catch {}
  return found;
}

// Helper to construct native Android Intent URIs with Google Play Store fallback (NEVER Chrome web pages!)
function nativeAppIntent(schemeAndPath: string, packageId?: string, playStorePkg?: string): string {
  const colonIdx = schemeAndPath.indexOf('://');
  const scheme = colonIdx > 0 ? schemeAndPath.slice(0, colonIdx) : schemeAndPath;
  const hostPath = colonIdx > 0 ? schemeAndPath.slice(colonIdx + 3) : '';
  const pkgSegment = packageId ? `package=${packageId};` : '';
  const fallbackPkg = playStorePkg || packageId;
  const fallbackSegment = fallbackPkg
    ? `S.browser_fallback_url=${encodeURIComponent(`market://details?id=${fallbackPkg}`)};`
    : '';
  return `intent://${hostPath}#Intent;scheme=${scheme};${pkgSegment}action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;${fallbackSegment}end`;
}

// Complete Pre-Added Directory: All Native Mobile Settings + All Popular Mobile Apps (ZERO Chrome Website Fallbacks!)
// Specific sub-settings and specific app variants come first so voice matching hits exact targets accurately.
export const BUILTIN_MOBILE_APPS: MobileAppDefinition[] = [
  // ======================== 1. NATIVE MOBILE SYSTEM SETTINGS ========================
  {
    id: 'app_settings',
    name: 'Apps & Permissions Settings',
    nameHindi: 'ऐप्स और परमिशन सेटिंग्स',
    nameUrdu: 'ایپس اور پرمیشن سیٹنگز',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • App Manager',
    iconEmoji: '🛡️',
    accentClass: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200',
    keywords: [
      'app setting',
      'apps setting',
      'permission setting',
      'permissions setting',
      'manage apps',
      'app permission',
      'ایپ سیٹنگ',
      'پرمیشن سیٹنگ',
      'ایپس سیٹنگ',
      'ऐप सेटिंग',
      'परमिशन सेटिंग',
    ],
    androidIntent:
      'intent:#Intent;action=android.settings.APPLICATION_SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=Privacy',
    nativeScheme: 'intent:#Intent;action=android.settings.APPLICATION_SETTINGS;end',
  },
  {
    id: 'wifi',
    name: 'Wi-Fi & Internet Settings',
    nameHindi: 'वाई-फाई सेटिंग',
    nameUrdu: 'وائی فائی سیٹنگ',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • Network & Wi-Fi',
    iconEmoji: '📶',
    accentClass: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-200',
    keywords: ['wifi', 'wi-fi', 'وائی فائی', 'وائفائی', 'वाईफाई', 'वाई-फाई'],
    androidIntent:
      'intent:#Intent;action=android.settings.WIFI_SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=WIFI',
    nativeScheme: 'intent:#Intent;action=android.settings.WIFI_SETTINGS;end',
  },
  {
    id: 'bluetooth',
    name: 'Bluetooth Settings',
    nameHindi: 'ब्लूटूथ सेटिंग',
    nameUrdu: 'بلوٹوتھ سیٹنگ',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • Connected Devices',
    iconEmoji: '📘',
    accentClass: 'border-blue-500/40 bg-blue-950/40 text-blue-200',
    keywords: ['bluetooth', 'بلوٹوتھ', 'بلو ٹوتھ', 'ब्लूटूथ'],
    androidIntent:
      'intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=Bluetooth',
    nativeScheme: 'intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end',
  },
  {
    id: 'mobile_data',
    name: 'SIM & Mobile Data',
    nameHindi: 'सिम और मोबाइल डेटा',
    nameUrdu: 'سم اور موبائل ڈیٹا',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • SIM & Network',
    iconEmoji: '📡',
    accentClass: 'border-teal-500/40 bg-teal-950/40 text-teal-200',
    keywords: [
      'mobile data',
      'sim setting',
      'data setting',
      'network setting',
      'موبائل ڈیٹا',
      'سم سیٹنگ',
      'نیٹ ورک سیٹنگ',
      'मोबाइल डेटा',
      'सिम सेटिंग',
    ],
    androidIntent:
      'intent:#Intent;action=android.settings.DATA_ROAMING_SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=MOBILE_DATA_SETTINGS_ID',
    nativeScheme: 'intent:#Intent;action=android.settings.DATA_ROAMING_SETTINGS;end',
  },
  {
    id: 'hotspot',
    name: 'Hotspot & Tethering',
    nameHindi: 'हॉटस्पॉट सेटिंग',
    nameUrdu: 'ہاٹ اسپاٹ سیٹنگ',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • Portable Hotspot',
    iconEmoji: '🔥',
    accentClass: 'border-orange-500/40 bg-orange-950/40 text-orange-200',
    keywords: ['hotspot', 'tethering', 'ہاٹ اسپاٹ', 'ہاٹ سپاٹ', 'हॉटस्पॉट'],
    androidIntent:
      'intent:#Intent;action=android.settings.WIRELESS_SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=INTERNET_TETHERING',
    nativeScheme: 'intent:#Intent;action=android.settings.WIRELESS_SETTINGS;end',
  },
  {
    id: 'display_settings',
    name: 'Display & Brightness',
    nameHindi: 'डिस्प्ले और ब्राइटनेस',
    nameUrdu: 'ڈسپلے اور برائٹنس',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • Screen & Wallpaper',
    iconEmoji: '🔆',
    accentClass: 'border-amber-500/40 bg-amber-950/40 text-amber-200',
    keywords: [
      'display setting',
      'brightness',
      'screen setting',
      'ڈسپلے سیٹنگ',
      'ڈسپلے',
      'برائٹنس',
      'डिस्प्ले सेटिंग',
      'ब्राइटनेस',
    ],
    androidIntent:
      'intent:#Intent;action=android.settings.DISPLAY_SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=DISPLAY',
    nativeScheme: 'intent:#Intent;action=android.settings.DISPLAY_SETTINGS;end',
  },
  {
    id: 'sound_settings',
    name: 'Sound, Volume & Vibration',
    nameHindi: 'साउंड और वॉल्यूम सेटिंग',
    nameUrdu: 'ساؤنڈ اور والیوم سیٹنگ',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • Audio & Ringtone',
    iconEmoji: '🔊',
    accentClass: 'border-purple-500/40 bg-purple-950/40 text-purple-200',
    keywords: [
      'sound setting',
      'volume setting',
      'ringtone setting',
      'ringtone',
      'ساؤنڈ سیٹنگ',
      'آواز کی سیٹنگ',
      'رنگ ٹون',
      'साउंड सेटिंग',
      'वॉल्यूम सेटिंग',
      'रिंगटोन',
    ],
    androidIntent:
      'intent:#Intent;action=android.settings.SOUND_SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=Sounds',
    nativeScheme: 'intent:#Intent;action=android.settings.SOUND_SETTINGS;end',
  },
  {
    id: 'battery_settings',
    name: 'Battery & Power Saving',
    nameHindi: 'बैटरी सेटिंग',
    nameUrdu: 'بیٹری سیٹنگ',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • Battery Health',
    iconEmoji: '🔋',
    accentClass: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200',
    keywords: [
      'battery setting',
      'battery saver',
      'power saving',
      'بیٹری سیٹنگ',
      'بیٹری سیور',
      'बैटरी सेटिंग',
    ],
    androidIntent:
      'intent:#Intent;action=android.intent.action.POWER_USAGE_SUMMARY;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=BATTERY_USAGE',
    nativeScheme: 'intent:#Intent;action=android.intent.action.POWER_USAGE_SUMMARY;end',
  },
  {
    id: 'storage_settings',
    name: 'Storage & Memory',
    nameHindi: 'स्टोरेज और मेमोरी',
    nameUrdu: 'اسٹوریج اور میموری',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • Device Storage',
    iconEmoji: '💾',
    accentClass: 'border-indigo-500/40 bg-indigo-950/40 text-indigo-200',
    keywords: [
      'storage setting',
      'phone storage',
      'memory setting',
      'اسٹوریج سیٹنگ',
      'اسٹوریج',
      'میموری سیٹنگ',
      'स्टोरेज सेटिंग',
    ],
    androidIntent:
      'intent:#Intent;action=android.settings.INTERNAL_STORAGE_SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=General&path=STORAGE_ICLOUD_USAGE',
    nativeScheme: 'intent:#Intent;action=android.settings.INTERNAL_STORAGE_SETTINGS;end',
  },
  {
    id: 'security_settings',
    name: 'Security, Lock & Fingerprint',
    nameHindi: 'सिक्योरिटी और फिंगरप्रिंट',
    nameUrdu: 'سیکیورٹی اور فنگر پرنٹ',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • Lock Screen & Biometrics',
    iconEmoji: '🔐',
    accentClass: 'border-pink-500/40 bg-pink-950/40 text-pink-200',
    keywords: [
      'security setting',
      'fingerprint',
      'screen lock setting',
      'face unlock',
      'سیکیورٹی سیٹنگ',
      'فنگر پرنٹ',
      'لاک سیٹنگ',
      'सिक्योरिटी सेटिंग',
      'फिंगरप्रिंट',
    ],
    androidIntent:
      'intent:#Intent;action=android.settings.SECURITY_SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=PASSCODE',
    nativeScheme: 'intent:#Intent;action=android.settings.SECURITY_SETTINGS;end',
  },
  {
    id: 'location_settings',
    name: 'Location & GPS Settings',
    nameHindi: 'लोकेशन और जीपीएस',
    nameUrdu: 'لوکیشن اور جی پی ایس',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • GPS & Location',
    iconEmoji: '📍',
    accentClass: 'border-rose-500/40 bg-rose-950/40 text-rose-200',
    keywords: ['location setting', 'gps', 'لوکیشن سیٹنگ', 'لوکیشن', 'جی پی ایس', 'लोकेशन सेटिंग'],
    androidIntent:
      'intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=Privacy&path=LOCATION',
    nativeScheme: 'intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end',
  },
  {
    id: 'notification_settings',
    name: 'Notifications Settings',
    nameHindi: 'नोटिफिकेशन सेटिंग',
    nameUrdu: 'نوٹیفکیشن سیٹنگ',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • Status Bar & Alerts',
    iconEmoji: '🔔',
    accentClass: 'border-amber-500/40 bg-amber-950/40 text-amber-200',
    keywords: [
      'notification setting',
      'notifications setting',
      'نوٹیفکیشن سیٹنگ',
      'नोटिफिकेशन सेटिंग',
    ],
    androidIntent:
      'intent:#Intent;action=android.settings.NOTIFICATION_SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=NOTIFICATIONS_ID',
    nativeScheme: 'intent:#Intent;action=android.settings.NOTIFICATION_SETTINGS;end',
  },
  {
    id: 'airplane_settings',
    name: 'Airplane Mode',
    nameHindi: 'एयरप्लेन / फ्लाइट मोड',
    nameUrdu: 'ایئرپلین موڈ',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • Flight Mode',
    iconEmoji: '✈️',
    accentClass: 'border-sky-500/40 bg-sky-950/40 text-sky-200',
    keywords: [
      'airplane mode',
      'flight mode',
      'ایئرپلین موڈ',
      'فلائٹ موڈ',
      'एयरप्लेन मोड',
      'फ्लाइट मोड',
    ],
    androidIntent:
      'intent:#Intent;action=android.settings.AIRPLANE_MODE_SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=AIRPLANE_MODE',
    nativeScheme: 'intent:#Intent;action=android.settings.AIRPLANE_MODE_SETTINGS;end',
  },
  {
    id: 'accessibility_settings',
    name: 'Accessibility & Control',
    nameHindi: 'एक्सेसिबिलिटी सेटिंग',
    nameUrdu: 'ایکسیسیبلٹی سیٹنگ',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • Smart Assistance',
    iconEmoji: '🪄',
    accentClass: 'border-violet-500/40 bg-violet-950/40 text-violet-200',
    keywords: ['accessibility', 'ایکسیسیبلٹی', 'एक्सेसिबिलिटी'],
    androidIntent:
      'intent:#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=ACCESSIBILITY',
    nativeScheme: 'intent:#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;end',
  },
  {
    id: 'about_phone',
    name: 'About Phone & System Update',
    nameHindi: 'अबाउट फ़ोन और अपडेट',
    nameUrdu: 'اباؤٹ فون اور اپڈیٹ',
    category: 'mobile_settings',
    locationLabel: 'Mobile Settings • Device Info',
    iconEmoji: '📲',
    accentClass: 'border-slate-500/40 bg-slate-900/80 text-slate-200',
    keywords: [
      'about phone',
      'device info',
      'software update',
      'system update',
      'اباؤٹ فون',
      'سافٹ ویئر اپڈیٹ',
      'अबाउट फोन',
      'सॉफ्टवेयर अपडेट',
    ],
    androidIntent:
      'intent:#Intent;action=android.settings.DEVICE_INFO_SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:root=General&path=About',
    nativeScheme: 'intent:#Intent;action=android.settings.DEVICE_INFO_SETTINGS;end',
  },
  {
    id: 'settings',
    name: 'Phone Settings (Main)',
    nameHindi: 'मोबाइल सेटिंग्स',
    nameUrdu: 'موبائل کی سیٹنگز',
    category: 'mobile_settings',
    locationLabel: 'System OS • Main Mobile Settings',
    iconEmoji: '⚙️',
    accentClass: 'border-cyan-400/50 bg-slate-900/90 text-cyan-200',
    keywords: [
      'mobile setting',
      'phone setting',
      'system setting',
      'open setting',
      'settings',
      'setting',
      'موبائل کی سیٹنگ',
      'موبائل سیٹنگ',
      'فون کی سیٹنگ',
      'سیٹنگز',
      'سیٹنگ',
      'मोबाइल की सेटिंग',
      'मोबाइल सेटिंग',
      'सेटिंग्स',
      'सेटिंग',
      'ਸੈਟਿੰਗਜ਼',
      'ਸੈਟਿੰਗ',
    ],
    androidIntent:
      'intent:#Intent;action=android.settings.SETTINGS;category=android.intent.category.DEFAULT;end',
    iosScheme: 'App-Prefs:',
    nativeScheme: 'intent:#Intent;action=android.settings.SETTINGS;end',
  },

  // ======================== 2. NATIVE MOBILE APPS (NO CHROME WEB FALLBACKS!) ========================
  {
    id: 'whatsapp_business',
    name: 'WhatsApp Business',
    nameHindi: 'व्हाट्सएप बिज़नेस',
    nameUrdu: 'واٹس ایپ بزنس',
    category: 'social',
    locationLabel: 'Installed App • Business Messaging',
    iconEmoji: '💼',
    accentClass: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300',
    keywords: [
      'whatsapp business',
      'business whatsapp',
      'واٹس ایپ بزنس',
      'व्हाट्सएप बिजनेस',
      'व्हाट्सएप बिज़नेस',
    ],
    packageId: 'com.whatsapp.w4b',
    androidIntent: nativeAppIntent('whatsapp://send', 'com.whatsapp.w4b', 'com.whatsapp.w4b'),
    iosScheme: 'whatsapp://app',
    nativeScheme: 'whatsapp://send',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    nameHindi: 'व्हाट्सएप',
    nameUrdu: 'واٹس ایپ',
    category: 'social',
    locationLabel: 'Installed App • Native WhatsApp',
    iconEmoji: '💬',
    accentClass: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300',
    keywords: [
      'whatsapp',
      'whats app',
      'واٹس ایپ',
      'واٹسپ',
      'واٹس',
      'व्हाट्सएप',
      'व्हाट्सऐप',
      'ਵਟਸਐਪ',
    ],
    packageId: 'com.whatsapp',
    // Omit strict package lock so standard WhatsApp, Dual WhatsApp & WhatsApp Business all resolve natively; fallback is Play Store market:// (NEVER Chrome!)
    androidIntent: nativeAppIntent('whatsapp://send', undefined, 'com.whatsapp'),
    iosScheme: 'whatsapp://app',
    nativeScheme: 'whatsapp://send',
  },
  {
    id: 'yt_music',
    name: 'YouTube Music',
    nameHindi: 'यूट्यूब म्यूज़िक',
    nameUrdu: 'یوٹیوب میوزک',
    category: 'media',
    locationLabel: 'Installed App • Music Streaming',
    iconEmoji: '🎶',
    accentClass: 'border-rose-500/40 bg-rose-950/40 text-rose-300',
    keywords: ['youtube music', 'yt music', 'یوٹیوب میوزک', 'यूट्यूब म्यूजिक', 'ਯੂਟਿਊਬ ਮਿਊਜ਼ਿਕ'],
    packageId: 'com.google.android.apps.youtube.music',
    androidIntent: nativeAppIntent(
      'vnd.youtube.music://',
      'com.google.android.apps.youtube.music',
      'com.google.android.apps.youtube.music'
    ),
    iosScheme: 'youtubemusic://',
    nativeScheme: 'vnd.youtube.music://',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    nameHindi: 'यूट्यूब',
    nameUrdu: 'یوٹیوب',
    category: 'media',
    locationLabel: 'Installed App • Native YouTube',
    iconEmoji: '▶️',
    accentClass: 'border-rose-500/40 bg-rose-950/40 text-rose-300',
    keywords: ['youtube', 'you tube', 'یوٹیوب', 'یو ٹیوب', 'यूट्यूब', 'ਯੂਟਿਊਬ'],
    packageId: 'com.google.android.youtube',
    androidIntent: nativeAppIntent(
      'vnd.youtube://',
      'com.google.android.youtube',
      'com.google.android.youtube'
    ),
    iosScheme: 'youtube://',
    nativeScheme: 'vnd.youtube://',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    nameHindi: 'इंस्टाग्राम',
    nameUrdu: 'انسٹاگرام',
    category: 'social',
    locationLabel: 'Installed App • Native Instagram',
    iconEmoji: '📸',
    accentClass: 'border-pink-500/40 bg-pink-950/40 text-pink-300',
    keywords: ['instagram', 'insta', 'انسٹاگرام', 'انسٹا', 'इंस्टाग्राम', 'इंस्टा', 'ਇੰਸਟਾਗ੍ਰਾਮ'],
    packageId: 'com.instagram.android',
    androidIntent: nativeAppIntent(
      'instagram://app',
      'com.instagram.android',
      'com.instagram.android'
    ),
    iosScheme: 'instagram://app',
    nativeScheme: 'instagram://app',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    nameHindi: 'टिकटॉक',
    nameUrdu: 'ٹک ٹاک',
    category: 'media',
    locationLabel: 'Installed App • Native TikTok',
    iconEmoji: '🎵',
    accentClass: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300',
    keywords: ['tiktok', 'tik tok', 'ٹک ٹاک', 'टिकटॉक', 'टिक टॉक'],
    packageId: 'com.zhiliaoapp.musically',
    androidIntent: nativeAppIntent(
      'snssdk1233://feed',
      undefined,
      'com.zhiliaoapp.musically'
    ),
    iosScheme: 'snssdk1233://',
    nativeScheme: 'snssdk1233://feed',
  },
  {
    id: 'messenger',
    name: 'Messenger',
    nameHindi: 'मैसेंजर',
    nameUrdu: 'میسنجر',
    category: 'social',
    locationLabel: 'Installed App • Meta Messenger',
    iconEmoji: '⚡',
    accentClass: 'border-blue-500/40 bg-blue-950/40 text-blue-300',
    keywords: ['messenger', 'fb messenger', 'میسنجر', 'मैसेंजर'],
    packageId: 'com.facebook.orca',
    androidIntent: nativeAppIntent(
      'fb-messenger://threads',
      undefined,
      'com.facebook.orca'
    ),
    iosScheme: 'fb-messenger://',
    nativeScheme: 'fb-messenger://threads',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    nameHindi: 'फेसबुक',
    nameUrdu: 'فیس بک',
    category: 'social',
    locationLabel: 'Installed App • Native Facebook',
    iconEmoji: '🌐',
    accentClass: 'border-blue-500/40 bg-blue-950/40 text-blue-300',
    keywords: ['facebook', 'fb', 'فیس بک', 'फेसबुक'],
    packageId: 'com.facebook.katana',
    androidIntent: nativeAppIntent('fb://root', undefined, 'com.facebook.katana'),
    iosScheme: 'fb://',
    nativeScheme: 'fb://root',
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    nameHindi: 'स्नैपचैट',
    nameUrdu: 'اسنیپ چیٹ',
    category: 'social',
    locationLabel: 'Installed App • Native Snapchat',
    iconEmoji: '👻',
    accentClass: 'border-amber-400/40 bg-amber-950/40 text-amber-200',
    keywords: ['snapchat', 'snap', 'اسنیپ چیٹ', 'سنیپ چیٹ', 'स्नैपचैट'],
    packageId: 'com.snapchat.android',
    androidIntent: nativeAppIntent(
      'snapchat://',
      'com.snapchat.android',
      'com.snapchat.android'
    ),
    iosScheme: 'snapchat://',
    nativeScheme: 'snapchat://',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    nameHindi: 'टेलीग्राम',
    nameUrdu: 'ٹیلی گرام',
    category: 'social',
    locationLabel: 'Installed App • Native Telegram',
    iconEmoji: '📨',
    accentClass: 'border-sky-500/40 bg-sky-950/40 text-sky-300',
    keywords: ['telegram', 'ٹیلی گرام', 'ٹیلیگرام', 'टेलीग्राम'],
    packageId: 'org.telegram.messenger',
    androidIntent: nativeAppIntent('tg://resolve', undefined, 'org.telegram.messenger'),
    iosScheme: 'tg://',
    nativeScheme: 'tg://resolve',
  },
  {
    id: 'imo',
    name: 'IMO Video Calls',
    nameHindi: 'इमो कॉल ऐप',
    nameUrdu: 'ایمو کال ایپ',
    category: 'social',
    locationLabel: 'Installed App • Video & Voice',
    iconEmoji: '📹',
    accentClass: 'border-sky-500/40 bg-sky-950/40 text-sky-200',
    keywords: ['imo', 'imo app', 'ایمو', 'इमो'],
    packageId: 'com.imo.android.imoim',
    androidIntent: nativeAppIntent('imo://', 'com.imo.android.imoim', 'com.imo.android.imoim'),
    iosScheme: 'imo://',
    nativeScheme: 'imo://',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    nameHindi: 'ट्विटर / एक्स',
    nameUrdu: 'ٹوئٹر / ایکس',
    category: 'social',
    locationLabel: 'Installed App • Social Feed',
    iconEmoji: '🐦',
    accentClass: 'border-slate-500/40 bg-slate-900/80 text-slate-200',
    keywords: ['twitter', 'ٹوئٹر', 'ٹویٹر', 'ट्विटर'],
    packageId: 'com.twitter.android',
    androidIntent: nativeAppIntent('twitter://timeline', undefined, 'com.twitter.android'),
    iosScheme: 'twitter://',
    nativeScheme: 'twitter://timeline',
  },
  {
    id: 'playstore',
    name: 'Google Play Store',
    nameHindi: 'प्ले स्टोर',
    nameUrdu: 'پلے اسٹور',
    category: 'system',
    locationLabel: 'System App • Official App Store',
    iconEmoji: '🛍️',
    accentClass: 'border-teal-500/40 bg-teal-950/40 text-teal-300',
    keywords: ['play store', 'playstore', 'google play', 'پلے اسٹور', 'پلے سٹور', 'प्ले स्टोर'],
    packageId: 'com.android.vending',
    androidIntent: 'market://search?q=apps',
    iosScheme: 'itms-apps://itunes.apple.com',
    nativeScheme: 'market://search?q=apps',
  },
  {
    id: 'google',
    name: 'Google',
    nameHindi: 'गूगल',
    nameUrdu: 'گوگل',
    category: 'system',
    locationLabel: 'System App • Native Google App',
    iconEmoji: '🔍',
    accentClass: 'border-blue-500/40 bg-blue-950/40 text-blue-300',
    keywords: ['google app', 'ok google', 'google search', 'google', 'گوگل', 'गूगल'],
    packageId: 'com.google.android.googlequicksearchbox',
    androidIntent: nativeAppIntent(
      'google://',
      'com.google.android.googlequicksearchbox',
      'com.google.android.googlequicksearchbox'
    ),
    iosScheme: 'google://',
    nativeScheme: 'google://',
  },
  {
    id: 'dialer',
    name: 'Phone Dialer',
    nameHindi: 'फ़ोन डायलर',
    nameUrdu: 'فون ڈائلر',
    category: 'system',
    locationLabel: 'System Phone • Call Keypad',
    iconEmoji: '📞',
    accentClass: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300',
    keywords: ['dialer', 'phone dialer', 'keypad', 'فون ڈائلر', 'ڈائلر', 'डायलर'],
    androidIntent: 'tel:',
    iosScheme: 'tel:',
    nativeScheme: 'tel:',
  },
  {
    id: 'contacts',
    name: 'Contacts',
    nameHindi: 'कॉन्टैक्ट्स / नंबर',
    nameUrdu: 'کانٹیکٹس / نمبرز',
    category: 'system',
    locationLabel: 'System Phone • Address Book',
    iconEmoji: '👥',
    accentClass: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300',
    keywords: [
      'contacts',
      'contact list',
      'contact',
      'phonebook',
      'phone book',
      'کانٹیکٹس',
      'کانٹیکٹ',
      'نمبر لسٹ',
      'कॉन्टैक्ट्स',
      'कॉन्टैक्ट',
      'ਕਾਨਟੈਕਟਸ',
      'ਕਾਨਟੈਕਟ',
    ],
    androidIntent:
      'intent:#Intent;action=android.intent.action.VIEW;type=vnd.android.cursor.dir/contact;end',
    iosScheme: 'contacts://',
    nativeScheme: 'contacts://',
  },
  {
    id: 'messages',
    name: 'SMS Messages',
    nameHindi: 'मैसेज (SMS)',
    nameUrdu: 'ایس ایم ایس میسجز',
    category: 'system',
    locationLabel: 'System Phone • Text Inbox',
    iconEmoji: '✉️',
    accentClass: 'border-indigo-500/40 bg-indigo-950/40 text-indigo-300',
    keywords: [
      'sms',
      'text message',
      'messages app',
      'message app',
      'messages',
      'ایس ایم ایس',
      'میسجز',
      'میسج ایپ',
      'एसएमएस',
      'मैसेज ऐप',
      'मैसेज',
      'ਐਸਐਮਐਸ',
      'ਮੈਸੇਜ',
    ],
    androidIntent: 'sms:',
    iosScheme: 'sms:',
    nativeScheme: 'sms:',
  },
  {
    id: 'camera_app',
    name: 'Mobile Camera',
    nameHindi: 'मोबाइल कैमरा',
    nameUrdu: 'موبائل کیمرہ',
    category: 'system',
    locationLabel: 'System Phone • Native Camera',
    iconEmoji: '📷',
    accentClass: 'border-pink-500/40 bg-pink-950/40 text-pink-300',
    keywords: [
      'camera app',
      'mobile camera',
      'open camera',
      'camera',
      'موبائل کیمرہ',
      'کیمرہ کھولو',
      'کیمرہ',
      'कैमरा खोलो',
      'कैमरा',
      'ਕੈਮਰਾ',
    ],
    androidIntent: 'intent:#Intent;action=android.media.action.STILL_IMAGE_CAMERA;end',
    iosScheme: 'camera://',
    nativeScheme: '#zara-camera-vision',
  },
  {
    id: 'gallery',
    name: 'Gallery & Photos',
    nameHindi: 'गैलरी / फ़ोटो',
    nameUrdu: 'گیلری اور فوٹوز',
    category: 'media',
    locationLabel: 'System Media • Photos & Videos',
    iconEmoji: '🖼️',
    accentClass: 'border-fuchsia-500/40 bg-fuchsia-950/40 text-fuchsia-300',
    keywords: [
      'gallery',
      'photos app',
      'album',
      'گیلری',
      'فوٹوز',
      'تصویریں',
      'गैलरी',
      'फोटो ऐप',
      'ਗੈਲਰੀ',
    ],
    androidIntent: 'intent:#Intent;action=android.intent.action.VIEW;type=image/*;end',
    iosScheme: 'photos-redirect://',
    nativeScheme: 'photos-redirect://',
  },
  {
    id: 'files',
    name: 'File Manager (My Files)',
    nameHindi: 'फ़ाइल मैनेजर',
    nameUrdu: 'فائل مینیجر',
    category: 'system',
    locationLabel: 'System Tools • Phone Folders',
    iconEmoji: '📁',
    accentClass: 'border-amber-500/40 bg-amber-950/40 text-amber-300',
    keywords: ['file manager', 'my files', 'files app', 'فائل مینیجر', 'مائی فائلز', 'फाइल मैनेजर'],
    androidIntent:
      'intent:#Intent;action=android.intent.action.GET_CONTENT;type=*/*;category=android.intent.category.OPENABLE;end',
    iosScheme: 'shareddocuments://',
    nativeScheme: 'shareddocuments://',
  },
  {
    id: 'maps',
    name: 'Google Maps',
    nameHindi: 'गूगल मैप्स',
    nameUrdu: 'گوگل میپس',
    category: 'utility',
    locationLabel: 'Installed App • GPS Navigation',
    iconEmoji: '🗺️',
    accentClass: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300',
    keywords: ['google map', 'maps', 'گوگل میپ', 'میپس', 'نقشہ', 'गूगल मैप', 'मैप्स'],
    packageId: 'com.google.android.apps.maps',
    androidIntent: 'geo:0,0?q=',
    iosScheme: 'comgooglemaps://',
    nativeScheme: 'geo:0,0?q=',
  },
  {
    id: 'gmail',
    name: 'Gmail / Email',
    nameHindi: 'जीमेल (ईमेल)',
    nameUrdu: 'جی میل',
    category: 'utility',
    locationLabel: 'Installed App • Mail Inbox',
    iconEmoji: '📧',
    accentClass: 'border-red-500/40 bg-red-950/40 text-red-300',
    keywords: ['gmail', 'email', 'جی میل', 'ای میل', 'जीमेल', 'ईमेल'],
    packageId: 'com.google.android.gm',
    androidIntent: nativeAppIntent(
      'googlegmail://',
      'com.google.android.gm',
      'com.google.android.gm'
    ),
    iosScheme: 'googlegmail://',
    nativeScheme: 'mailto:',
  },
  {
    id: 'spotify',
    name: 'Spotify Music',
    nameHindi: 'स्पॉटिफाई म्यूज़िक',
    nameUrdu: 'اسپاٹیفائی میوزک',
    category: 'media',
    locationLabel: 'Installed App • Music & Songs',
    iconEmoji: '🎧',
    accentClass: 'border-green-500/40 bg-green-950/40 text-green-300',
    keywords: ['spotify', 'اسپاٹیفائی', 'سپاٹیفائی', 'स्पॉटिफाई', 'گانے چلاؤ', 'गाने चलाओ'],
    packageId: 'com.spotify.music',
    androidIntent: nativeAppIntent('spotify://', 'com.spotify.music', 'com.spotify.music'),
    iosScheme: 'spotify://',
    nativeScheme: 'spotify://',
  },
  {
    id: 'alarm',
    name: 'Clock & Alarm',
    nameHindi: 'अलार्म / घड़ी',
    nameUrdu: 'الارم اور گھڑی',
    category: 'utility',
    locationLabel: 'System Tools • Alarm & Timer',
    iconEmoji: '⏰',
    accentClass: 'border-purple-500/40 bg-purple-950/40 text-purple-300',
    keywords: ['alarm', 'clock', 'timer', 'الارم', 'گھڑی', 'ٹائمر', 'अलार्म', 'घड़ी'],
    androidIntent: 'intent:#Intent;action=android.intent.action.SHOW_ALARMS;end',
    iosScheme: 'clock-alarm://',
    nativeScheme: 'clock-alarm://',
  },
  {
    id: 'calculator',
    name: 'Calculator',
    nameHindi: 'कैलकुलेटर',
    nameUrdu: 'کیلکولیٹر',
    category: 'utility',
    locationLabel: 'System Tools • Native Calculator',
    iconEmoji: '🧮',
    accentClass: 'border-orange-500/40 bg-orange-950/40 text-orange-300',
    keywords: ['calculator', 'کیلکولیٹر', 'حساب', 'कैलकुलेटर', 'हिसाब'],
    androidIntent:
      'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALCULATOR;end',
    iosScheme: 'calc://',
    nativeScheme: 'calc://',
  },
  {
    id: 'calendar',
    name: 'Calendar',
    nameHindi: 'कैलेंडर',
    nameUrdu: 'کیلنڈر',
    category: 'utility',
    locationLabel: 'System Tools • Schedule & Dates',
    iconEmoji: '📅',
    accentClass: 'border-blue-500/40 bg-blue-950/40 text-blue-300',
    keywords: ['calendar', 'کیلنڈر', 'تاریخ', 'कैलेंडर'],
    androidIntent:
      'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALENDAR;end',
    iosScheme: 'calshow://',
    nativeScheme: 'calshow://',
  },
  {
    id: 'easypaisa',
    name: 'Easypaisa',
    nameHindi: 'इज़ीपैसा',
    nameUrdu: 'ایزی پیسہ',
    category: 'utility',
    locationLabel: 'Mobile Wallet • Payments',
    iconEmoji: '💳',
    accentClass: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300',
    keywords: ['easypaisa', 'easy paisa', 'ایزی پیسہ', 'ایزی پیسا', 'इजीपैसा'],
    packageId: 'pk.com.telenor.phoenix',
    androidIntent: nativeAppIntent(
      'easypaisa://',
      'pk.com.telenor.phoenix',
      'pk.com.telenor.phoenix'
    ),
    iosScheme: 'easypaisa://',
    nativeScheme: 'market://details?id=pk.com.telenor.phoenix',
  },
  {
    id: 'jazzcash',
    name: 'JazzCash',
    nameHindi: 'जैज़कैश',
    nameUrdu: 'جاز کیش',
    category: 'utility',
    locationLabel: 'Mobile Wallet • Payments',
    iconEmoji: '🏦',
    accentClass: 'border-rose-500/40 bg-rose-950/40 text-rose-300',
    keywords: ['jazzcash', 'jazz cash', 'جاز کیش', 'جیز کیش', 'जैज़कैश'],
    packageId: 'com.techlogix.mobilinkcustomer',
    androidIntent: nativeAppIntent(
      'jazzcash://',
      'com.techlogix.mobilinkcustomer',
      'com.techlogix.mobilinkcustomer'
    ),
    iosScheme: 'jazzcash://',
    nativeScheme: 'market://details?id=com.techlogix.mobilinkcustomer',
  },
  {
    id: 'gpay',
    name: 'Google Wallet / Pay',
    nameHindi: 'गूगल पे / वॉलेट',
    nameUrdu: 'گوگل پے / والیٹ',
    category: 'utility',
    locationLabel: 'Mobile Wallet • UPI & Cards',
    iconEmoji: '🪙',
    accentClass: 'border-indigo-500/40 bg-indigo-950/40 text-indigo-300',
    keywords: ['google pay', 'gpay', 'google wallet', 'paytm', 'گوگل پے', 'गूगल पे', 'पेटीएम'],
    packageId: 'com.google.android.apps.walletnfcrel',
    androidIntent: nativeAppIntent(
      'tez://upi',
      undefined,
      'com.google.android.apps.walletnfcrel'
    ),
    iosScheme: 'shoebox://',
    nativeScheme: 'market://details?id=com.google.android.apps.walletnfcrel',
  },
  {
    id: 'daraz',
    name: 'Daraz Shopping',
    nameHindi: 'दराज़ शॉपिंग',
    nameUrdu: 'دراز شاپنگ',
    category: 'utility',
    locationLabel: 'Installed App • Online Store',
    iconEmoji: '🛒',
    accentClass: 'border-orange-500/40 bg-orange-950/40 text-orange-300',
    keywords: ['daraz', 'دراز', 'दराज़'],
    packageId: 'com.daraz.android',
    androidIntent: nativeAppIntent('daraz://', 'com.daraz.android', 'com.daraz.android'),
    iosScheme: 'daraz://',
    nativeScheme: 'market://details?id=com.daraz.android',
  },
  {
    id: 'careem',
    name: 'Careem / Ride',
    nameHindi: 'करीम राइड',
    nameUrdu: 'کریم رائیڈ',
    category: 'utility',
    locationLabel: 'Installed App • Ride & Delivery',
    iconEmoji: '🚖',
    accentClass: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300',
    keywords: ['careem', 'inDrive', 'indrive', 'uber', 'کریم', 'ان ڈرائیو', 'اوبر', 'करीम', 'उबर'],
    packageId: 'com.careem.acma',
    androidIntent: nativeAppIntent('careem://', undefined, 'com.careem.acma'),
    iosScheme: 'careem://',
    nativeScheme: 'market://search?q=ride%20app',
  },
];

export function loadCustomMobileApps(): MobileAppDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_APPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Add any app from user's mobile WITHOUT needing links — uses native Android package or Play Store search intent!
export function addCustomMobileApp(name: string, packageOrScheme = ''): MobileAppDefinition {
  const cleanName = name.trim();
  const cleanTarget = packageOrScheme.trim();

  let androidIntent = `market://search?q=${encodeURIComponent(cleanName)}`;
  let nativeScheme = androidIntent;
  let iosScheme = `itms-apps://itunes.apple.com/WebObjects/MZStore.woa/wa/search?term=${encodeURIComponent(cleanName)}`;

  if (cleanTarget) {
    if (cleanTarget.includes('://') && !cleanTarget.startsWith('http')) {
      nativeScheme = cleanTarget;
      androidIntent = cleanTarget;
      iosScheme = cleanTarget;
    } else if (/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(cleanTarget)) {
      const encodedFallback = encodeURIComponent(`market://details?id=${cleanTarget}`);
      androidIntent = `intent://#Intent;package=${cleanTarget};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodedFallback};end`;
      nativeScheme = `market://details?id=${cleanTarget}`;
    }
  }

  const created: MobileAppDefinition = {
    id: `custom_app_${Date.now()}`,
    name: cleanName,
    nameHindi: cleanName,
    nameUrdu: cleanName,
    category: 'utility',
    locationLabel: 'My Mobile • Custom App',
    iconEmoji: '📱',
    accentClass: 'border-pink-500/40 bg-pink-950/40 text-pink-300',
    keywords: [cleanName.toLowerCase()],
    androidIntent,
    iosScheme,
    nativeScheme,
    isCustom: true,
  };

  const next = [created, ...loadCustomMobileApps()].slice(0, 25);
  try {
    localStorage.setItem(CUSTOM_APPS_STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return created;
}

export function getAllMobileApps(): MobileAppDefinition[] {
  return [...loadCustomMobileApps(), ...BUILTIN_MOBILE_APPS];
}

const RUNNING_APPS_STORAGE_KEY = 'zara_running_mobile_apps_v1';
const runningAppsListeners = new Set<(ids: string[]) => void>();

export function getRunningAppIds(): string[] {
  try {
    const raw = localStorage.getItem(RUNNING_APPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRunningAppIds(ids: string[]) {
  try {
    localStorage.setItem(RUNNING_APPS_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
  runningAppsListeners.forEach((cb) => {
    try {
      cb(ids);
    } catch {}
  });
}

export function subscribeRunningApps(cb: (ids: string[]) => void): () => void {
  runningAppsListeners.add(cb);
  cb(getRunningAppIds());
  return () => {
    runningAppsListeners.delete(cb);
  };
}

export function markAppOpened(appId: string) {
  const current = getRunningAppIds().filter((id) => id !== appId);
  saveRunningAppIds([appId, ...current].slice(0, 20));
}

// Detect if spoken or typed message asks Zara to OPEN or CLOSE/OFF any mobile app or mobile system setting
export function detectMobileCommandFromText(rawText: string): DetectedAppCommand | null {
  if (!rawText) return null;
  const lower = rawText.toLowerCase().trim();

  // Detect BACK command ("back karo / wapas jao / بیک کرو / واپس جاؤ")
  if (
    /^(zara\s+)?(go\s*back|back\s*karo|back\s*kar\s*do|back\s*jao|back\s*aao|back|wapas\s*jao|wapas\s*aao|wapas\s*karo|wapas|peeche\s*jao|peeche\s*karo|peeche|return)(\s+zara|\s+please)?$/i.test(
      lower
    ) ||
    /(بیک\s*کرو|بیک\s*کر\s*دو|بیک\s*جاؤ|واپس\s*جاؤ|واپس\s*آؤ|واپس\s*کرو|پیچھے\s*جاؤ|پیچھے\s*کرو|اس\s*کو\s*بیک\s*کرو|واٹس\s*ایپ\s*بیک\s*کرو|बैक\s*करो|बैक\s*जाओ|वापस\s*जाओ|वापस\s*आओ|पीछे\s*जाओ)/i.test(
      lower
    )
  ) {
    return { action: 'back', app: null };
  }

  // Never hijack visual truthfulness questions ("can you see me through the camera?") as an app open
  if (
    /\b(can\s+you\s+see|do\s+you\s+see|are\s+you\s+watching|kya\s+tum.*dekh|کیا\s*تم.*دیکھ|क्या\s*तुम.*देख|ਕੀ\s*ਤੁਸੀਂ.*ਦੇਖ)\b/i.test(
      lower
    )
  ) {
    return null;
  }

  // Do not hijack WhatsApp / SMS / Telegram message-dictation or contact-calling commands as plain app opens
  if (
    /(message\s*bhejo|message\s*karo|sms\s*bhejo|send\s*(?:a\s*)?(?:whatsapp\s*|sms\s*|telegram\s*|text\s*)?(?:message|msg|sms|text)|میسج\s*بھیجو|ایس\s*ایم\s*ایس\s*بھیجو|سنیہا\s*بھیجو|मैसेज\s*भेजो|एसएमएस\s*भेजो|ਮੈਸੇਜ\s*ਭੇਜੋ|ਐਸਐਮਐਸ\s*ਭੇਜੋ)/i.test(
      lower
    ) &&
    !/(close|band|off|بند|کلوز|آف|बंद|क्लोज|ਬੰਦ)/i.test(lower)
  ) {
    return null;
  }

  // Do not hijack natural time/alarm setting phrases like "subah 8 baje alarm laga do"
  if (
    /\b\d{1,2}\s*(:\s*\d{2})?\s*(am|pm|baje|bjy|بجے|बजे)/i.test(lower) &&
    /(alarm|الارم|अलार्म|yaad|یاد|याद|kaam|کام|काम|jana|جانا|जाना)/i.test(lower)
  ) {
    return null;
  }

  const closeTriggers = [
    'close',
    'turn off',
    'switch off',
    'shut down',
    'shut',
    'exit',
    'quit',
    'stop app',
    'off karo',
    'off kar do',
    'off kardo',
    'off kar',
    'close karo',
    'close kar do',
    'close kardo',
    'close kar',
    'band karo',
    'band kar do',
    'band kardo',
    'band kar',
    'band kr',
    'band kro',
    'hatao',
    'hata do',
    'बंद करो',
    'बंद कर दो',
    'बंद कर',
    'बंद करें',
    'ऑफ करो',
    'ऑफ कर दो',
    'ऑफ़ करो',
    'क्लोज करो',
    'क्लोज कर दो',
    'हटाओ',
    'हटा दो',
    'بند کرو',
    'بند کر دو',
    'بند کر دے',
    'بند کر',
    'بند کریں',
    'آف کرو',
    'آف کر دو',
    'کلوز کرو',
    'کلوز کر دو',
    'ہٹاؤ',
    'ہٹا دو',
    'ਬੰਦ ਕਰੋ',
    'ਬੰਦ ਕਰ ਦਿਓ',
    'ਬੰਦ ਕਰ',
  ];

  const openTriggers = [
    'open',
    'launch',
    'start',
    'go to',
    'goto',
    'show',
    'turn on',
    'switch to',
    'kholo',
    'khol',
    'khol de',
    'khol dio',
    'kholen',
    'kholna',
    'chalao',
    'chala',
    'chala de',
    'chalana',
    'on karo',
    'jao',
    'dikhao',
    'nikalo',
    'lagao',
    'ओपन',
    'खोलो',
    'खोल',
    'खोलें',
    'खोलना',
    'चलाओ',
    'चला',
    'चालू',
    'जाओ',
    'दिखाओ',
    'निकालो',
    'کھولو',
    'کھول',
    'کھول دے',
    'کھولیں',
    'کھولنا',
    'چلاؤ',
    'چلا',
    'چلا دے',
    'چلائیں',
    'اوپن',
    'آن کرو',
    'جاؤ',
    'جائیں',
    'دکھاؤ',
    'نکالو',
    'لگاؤ',
    'ਖੋਲ੍ਹੋ',
    'ਖੋਲ੍ਹ',
    'ਖੋਲੋ',
    'ਚਲਾਓ',
    'ਚਲਾ',
    'ਓਪਨ',
  ];

  const hasCloseVerb = closeTriggers.some((v) => lower.includes(v));
  const hasOpenVerb = openTriggers.some((v) => lower.includes(v));
  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  const isShortDirectCommand = wordCount >= 1 && wordCount <= 3;

  const allApps = getAllMobileApps();

  // 1. Handle CLOSE / OFF command first so "WhatsApp band karo" or "usko close kar do" always closes!
  if (hasCloseVerb) {
    for (const app of allApps) {
      for (const kw of app.keywords) {
        if (lower.includes(kw.toLowerCase())) {
          return { action: 'close', app };
        }
      }
    }

    const closeAllIntent =
      /all\s*apps|sab\s*app|sari\s*app|sabhi\s*app|ساری\s*ایپ|سب\s*ایپ|सब\s*ऐप|सारी\s*ऐप/i.test(
        lower
      );
    if (closeAllIntent) {
      return { action: 'close', app: null, closeAll: true };
    }

    // Generic pronoun/app close command: "usko band kar do", "app close kar do", "off kar do"
    const genericAppClose =
      /(app|ایپ|ऐप|usko|isko|اس\s*کو|اسے|उसको|इसको|yeh|یہ|यह)/i.test(lower) || wordCount <= 5;
    if (genericAppClose) {
      const running = getRunningAppIds();
      const lastApp = running.length > 0 ? allApps.find((a) => a.id === running[0]) || null : null;
      return { action: 'close', app: lastApp, closeAll: !lastApp };
    }
  }

  // 2. Handle OPEN / LAUNCH command (Per-App Settings FIRST -> Specific Apps & Specific Settings -> Main Phone Settings)
  if (!hasOpenVerb && !isShortDirectCommand) return null;

  const asksForAppSpecificSettings =
    /\b(setting|settings|permission|permissions|app\s*info|storage|cache)\b/i.test(lower) ||
    /(سیٹنگ|سیٹنگز|پرمیشن|انفو|सेटिंग|सेटिंग्स|परमिशन)/i.test(lower);

  if (asksForAppSpecificSettings) {
    const concreteApps = allApps.filter((a) => a.category !== 'mobile_settings');
    for (const targetApp of concreteApps) {
      for (const kw of targetApp.keywords) {
        const kwLower = kw.toLowerCase();
        if (kwLower.length >= 3 && lower.includes(kwLower)) {
          const pkg = targetApp.packageId || 'com.android.settings';
          const perAppSettingsDef: MobileAppDefinition = {
            id: `${targetApp.id}_app_settings`,
            name: `${targetApp.name} Settings & Permissions`,
            nameHindi: `${targetApp.nameHindi} की सेटिंग और परमिशन`,
            nameUrdu: `${targetApp.nameUrdu} کی سیٹنگ اور پرمیشن`,
            category: 'mobile_settings',
            locationLabel: `Android App Info • ${pkg}`,
            iconEmoji: '⚙️',
            accentClass: targetApp.accentClass,
            keywords: [kwLower],
            packageId: pkg,
            androidIntent: targetApp.packageId
              ? `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${targetApp.packageId};category=android.intent.category.DEFAULT;end`
              : 'intent:#Intent;action=android.settings.APPLICATION_SETTINGS;category=android.intent.category.DEFAULT;end',
            iosScheme: 'app-settings:',
            nativeScheme: targetApp.packageId
              ? `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${targetApp.packageId};end`
              : 'intent:#Intent;action=android.settings.APPLICATION_SETTINGS;end',
          };
          return { action: 'open', app: perAppSettingsDef };
        }
      }
    }
  }

  // Prioritize specific apps & specific settings (wifi, bluetooth, sound, etc.) BEFORE generic catch-all 'settings'
  const orderedApps = [
    ...allApps.filter((a) => a.id !== 'settings'),
    ...allApps.filter((a) => a.id === 'settings'),
  ];

  for (const app of orderedApps) {
    for (const kw of app.keywords) {
      const kwLower = kw.toLowerCase();
      if (lower.includes(kwLower)) {
        if (!hasOpenVerb) {
          const stripped = lower
            .replace(/zara|ज़ारा|زارا|زہرہ|please|پلیز|ذرا|प्लीज/gi, '')
            .trim();
          if (stripped !== kwLower && stripped !== app.name.toLowerCase()) {
            continue;
          }
        }

        let query: string | undefined;
        if (app.id === 'youtube') {
          const cleaned = lower
            .replace(
              /zara|ज़ारा|زارا|youtube|यूट्यूब|یوٹیوب|open|kholo|chalao|ओपन|खोलो|चलाओ|کھولو|اوپن|پر|पर|on|karo|करो|کریں/gi,
              ' '
            )
            .replace(/\s+/g, ' ')
            .trim();
          if (cleaned.length >= 3) query = cleaned;
        }
        return { action: 'open', app, query };
      }
    }
  }

  return null;
}

export function detectMobilePlatform(): 'android' | 'ios' | 'other' {
  if (typeof navigator === 'undefined') return 'android';
  const ua = navigator.userAgent || '';
  const uaPlatform = (navigator as any).userAgentData?.platform || '';

  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';

  // Accurately detect Android even when "Desktop site" is checked in mobile Chrome (Linux + touch points > 0)
  const isAndroid =
    /android/i.test(ua) ||
    /android/i.test(uaPlatform) ||
    (/linux/i.test(ua) && navigator.maxTouchPoints > 0);
  if (isAndroid) return 'android';

  return 'other';
}

export function resolveAppLaunchHref(app: MobileAppDefinition, query?: string): string {
  const platform = detectMobilePlatform();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isFirefoxAndroid = platform === 'android' && /firefox/i.test(ua);

  if (app.id === 'youtube' && query) {
    const encoded = encodeURIComponent(query);
    if (platform === 'android' && !isFirefoxAndroid) {
      return `intent://results?search_query=${encoded}#Intent;scheme=vnd.youtube;package=com.google.android.youtube;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(
        'market://details?id=com.google.android.youtube'
      )};end`;
    }
    if (platform === 'ios') {
      return `youtube://www.youtube.com/results?search_query=${encoded}`;
    }
    return `vnd.youtube://results?search_query=${encoded}`;
  }

  if (app.id === 'whatsapp') {
    return platform === 'ios' ? 'whatsapp://app' : 'whatsapp://send';
  }

  if (platform === 'android') {
    if (isFirefoxAndroid && !app.androidIntent.startsWith('intent:#Intent;action=android.settings')) {
      return app.nativeScheme;
    }
    return app.androidIntent;
  }

  if (platform === 'ios') {
    return app.iosScheme;
  }

  if (app.category === 'mobile_settings') {
    return `#mobile-setting-${app.id}`;
  }
  return app.nativeScheme;
}

// Launch native mobile app or mobile setting directly via OS URI scheme and record honest channel outcome
export function launchMobileAppNow(
  appOrId: MobileAppDefinition | string,
  query?: string,
  onEnableZaraCamera?: () => void,
  onOpenMobileSettingsInApp?: (settingId: string) => void
): {
  launched: boolean;
  app: MobileAppDefinition | null;
  href: string;
  executionChannel: 'native_bridge' | 'android_intent' | 'in_app' | 'browser_unsupported' | 'failed';
  honestReport: string;
} {
  const allApps = getAllMobileApps();
  const app =
    typeof appOrId === 'string'
      ? allApps.find((a) => a.id === appOrId || a.name.toLowerCase() === appOrId.toLowerCase()) || null
      : appOrId;

  if (!app) {
    return {
      launched: false,
      app: null,
      href: '',
      executionChannel: 'failed',
      honestReport: `Requested app "${String(appOrId)}" was not found in the supported app list.`,
    };
  }

  markAppOpened(app.id);

  const platform = detectMobilePlatform();

  if (app.id === 'camera_app' && onEnableZaraCamera && platform === 'other') {
    onEnableZaraCamera();
    return {
      launched: true,
      app,
      href: '#zara-camera-vision',
      executionChannel: 'in_app',
      honestReport: `Opened Zara Camera Vision inside the app.`,
    };
  }

  const href = resolveAppLaunchHref(app, query);
  if (href.startsWith('#')) {
    if (onOpenMobileSettingsInApp) {
      onOpenMobileSettingsInApp(app.id);
    }
    return {
      launched: true,
      app,
      href,
      executionChannel: 'in_app',
      honestReport: `Opened Zara in-app Mobile Control view for ${app.name}. Direct OS settings launch requires Android/iOS.`,
    };
  }

  // Prefer direct Android PackageManager / Settings Bridge when running inside Zara Native Android Companion
  if (!query && typeof window !== 'undefined') {
    try {
      const nativeBridge = (window as any).ZaraAndroidBridge;
      if (
        app.id.endsWith('_app_settings') &&
        app.packageId &&
        nativeBridge?.openAppDetailsSettings &&
        nativeBridge.openAppDetailsSettings(app.packageId)
      ) {
        return {
          launched: true,
          app,
          href,
          executionChannel: 'native_bridge',
          honestReport: `Opened ${app.name} directly via Zara Native Android Bridge.`,
        };
      }
      if (app.category !== 'mobile_settings' && app.packageId && nativeBridge?.launchPackage) {
        const ok = Boolean(nativeBridge.launchPackage(app.packageId));
        if (ok) {
          return {
            launched: true,
            app,
            href,
            executionChannel: 'native_bridge',
            honestReport: `Launched ${app.name} (${app.packageId}) via Zara Native Android Bridge.`,
          };
        }
        return {
          launched: false,
          app,
          href,
          executionChannel: 'failed',
          honestReport: `${app.name} (${app.packageId}) is not installed on this Android device.`,
        };
      }
    } catch {}
  }

  if (platform === 'other') {
    return {
      launched: false,
      app,
      href,
      executionChannel: 'browser_unsupported',
      honestReport: `${app.name} is an Android/iOS mobile app (${app.packageId || 'intent'}). Desktop browsers cannot directly launch mobile APKs; use the PC Companion tool for desktop apps.`,
    };
  }

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  if (isInIframe && app.category === 'mobile_settings' && onOpenMobileSettingsInApp) {
    onOpenMobileSettingsInApp(app.id);
  }

  try {
    if (!isInIframe && (platform === 'android' || platform === 'ios')) {
      window.location.assign(href);
      return {
        launched: true,
        app,
        href,
        executionChannel: 'android_intent',
        honestReport: `Sent OS launch intent for ${app.name}. If it is installed, Android/iOS will open it now.`,
      };
    }

    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.target = isInIframe ? '_top' : '_self';
    anchor.rel = 'noopener noreferrer';
    anchor.className = 'hidden';
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(() => {
      if (anchor.parentNode) anchor.parentNode.removeChild(anchor);
    }, 300);
    return {
      launched: true,
      app,
      href,
      executionChannel: 'android_intent',
      honestReport: `Dispatched OS intent for ${app.name}. Opening depends on the app being installed and browser intent permission.`,
    };
  } catch {
    return {
      launched: false,
      app,
      href,
      executionChannel: 'failed',
      honestReport: `Failed to dispatch launch intent for ${app.name} inside this browser.`,
    };
  }
}

// Close / Turn Off an opened mobile app honestly (uses Native Bridge / Accessibility if granted; reports limitation cleanly in browsers)
export function closeMobileAppNow(
  appOrId?: MobileAppDefinition | string | 'all' | 'last_active' | null
): {
  closed: boolean;
  app: MobileAppDefinition | null;
  closedAll: boolean;
  executionChannel: 'native_bridge' | 'in_app' | 'browser_limited';
  honestReport: string;
} {
  const allApps = getAllMobileApps();
  const running = getRunningAppIds();
  const nativeBridge = typeof window !== 'undefined' ? (window as any).ZaraAndroidBridge : undefined;

  if (appOrId === 'all') {
    saveRunningAppIds([]);
    if (zaraVision.getMode() !== 'off') {
      zaraVision.stop();
    }
    let wentHome = false;
    try {
      if (nativeBridge?.isAccessibilityGranted?.() && nativeBridge?.performGlobalAction) {
        wentHome = Boolean(nativeBridge.performGlobalAction('home'));
      }
    } catch {}
    return {
      closed: true,
      app: null,
      closedAll: true,
      executionChannel: wentHome ? 'native_bridge' : 'browser_limited',
      honestReport: wentHome
        ? 'Returned to Android Home screen via Accessibility Service and cleared active app list.'
        : 'Stopped Zara camera/overlay and cleared tracked list. Note: in a browser, Android blocks force-closing third-party apps without Zara Native Accessibility Service.',
    };
  }

  let targetApp: MobileAppDefinition | null = null;
  if (!appOrId || appOrId === 'last_active') {
    if (running.length > 0) {
      targetApp = allApps.find((a) => a.id === running[0]) || null;
    }
  } else if (typeof appOrId === 'string') {
    targetApp =
      allApps.find((a) => a.id === appOrId || a.name.toLowerCase() === appOrId.toLowerCase()) ||
      null;
  } else {
    targetApp = appOrId;
  }

  if (targetApp) {
    if (targetApp.id === 'camera_app' && zaraVision.getMode() === 'camera') {
      zaraVision.stop();
      saveRunningAppIds(running.filter((id) => id !== targetApp!.id));
      return {
        closed: true,
        app: targetApp,
        closedAll: false,
        executionChannel: 'in_app',
        honestReport: 'Turned off Zara camera stream.',
      };
    }

    let closedNatively = false;
    try {
      if (targetApp.packageId && nativeBridge?.closeAppPackage) {
        closedNatively = Boolean(nativeBridge.closeAppPackage(targetApp.packageId));
      } else if (nativeBridge?.isAccessibilityGranted?.() && nativeBridge?.performGlobalAction) {
        closedNatively = Boolean(nativeBridge.performGlobalAction('home'));
      }
    } catch {}

    saveRunningAppIds(running.filter((id) => id !== targetApp!.id));
    return {
      closed: closedNatively,
      app: targetApp,
      closedAll: false,
      executionChannel: closedNatively ? 'native_bridge' : 'browser_limited',
      honestReport: closedNatively
        ? `Left ${targetApp.name} and cleaned background state via Native Android Bridge.`
        : `Cleared ${targetApp.name} from Zara's active list, but standard web browsers cannot force-close other installed Android apps without Zara's Native APK + Accessibility Service.`,
    };
  }

  saveRunningAppIds([]);
  if (zaraVision.getMode() !== 'off') {
    zaraVision.stop();
  }
  return {
    closed: true,
    app: null,
    closedAll: true,
    executionChannel: 'in_app',
    honestReport: 'Closed active Zara overlay/vision stream.',
  };
}

export interface DetectedCameraCommand {
  action: 'front' | 'back' | 'flip' | 'snap_photo' | 'off';
  facingHint?: 'user' | 'environment';
  caption?: string;
}

export function detectCameraFrontBackCommand(text: string): DetectedCameraCommand | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  // Do not confuse app builder or whatsapp message commands
  if (/(whatsapp|واٹس\s*ایپ|व्हाट्सएप|game\s*bana|app\s*bana)/i.test(lower)) {
    return null;
  }

  const mentionsFront =
    /(front\s*cam|front\s*camera|selfie\s*cam|selfie\s*camera|aage\s*wala\s*cam|aage\s*ka\s*cam|samne\s*wala\s*cam|فرنٹ\s*کیمر|سیلفی\s*کیمر|آگے\s*والا\s*کیمر|سامنے\s*والا\s*کیمر|फ्रंट\s*कैमर|सेल्फी\s*कैमर|आगे\s*वाला\s*कैमर|सामने\s*वाला\s*कैमर)/i.test(
      lower
    );

  const mentionsBack =
    /(back\s*cam|back\s*camera|rear\s*cam|rear\s*camera|peeche\s*wala\s*cam|peeche\s*ka\s*cam|pichla\s*cam|بیک\s*کیمر|پیچھے\s*والا\s*کیمر|پچھلا\s*کیمر|ریئر\s*کیمر|बैक\s*कैमर|पीछे\s*वाला\s*कैमर|पिछला\s*कैमर)/i.test(
      lower
    );

  const mentionsSnapPhoto =
    /(photo\s*(khinch|kheench|lo|le\s*lo|bhej|send|click)|tasveer\s*(khinch|lo|le\s*lo|bhej|send)|selfie\s*(lo|le\s*lo|khinch|bhej)|take\s*a?\s*(photo|picture|selfie)|snap\s*a?\s*photo|تصویر\s*(لو|لے\s*لو|کھینچو|بھیجو)|فوٹو\s*(لو|کھینچو|بھیجو)|سیلفی\s*(لو|لے\s*لو|بھیجو)|फोटो\s*(खींचो|लो|ले\s*लो|भेजो)|तस्वीर\s*(खींचो|लो|भेजो)|सेल्फी\s*(लो|खींचो|भेजो))/i.test(
      lower
    );

  if (mentionsSnapPhoto) {
    return {
      action: 'snap_photo',
      facingHint: mentionsBack ? 'environment' : mentionsFront ? 'user' : undefined,
      caption: text.trim(),
    };
  }

  if (
    /(flip\s*cam|cam(era)?\s*flip|switch\s*cam|cam(era)?\s*switch|cam(era)?\s*(badlo|badal\s*do|change\s*karo|ghuma\s*do)|doosra\s*cam|dusra\s*cam|کیمرہ\s*(بدلو|بدل\s*دو|چینج\s*کرو|گھما\s*دو)|دوسرا\s*کیمرہ|कैमरा\s*(बदलो|बदल\s*दो|चेंज\s*करो|घुमा\s*दो)|दूसरा\s*कैमरा)/i.test(
      lower
    )
  ) {
    return { action: 'flip' };
  }

  if (
    /(cam(era)?\s*(band|off|close)\s*(karo|kar\s*do)?|(band|off|close)\s*cam(era)?|کیمرہ\s*(بند|آف|کلوز)|कैमरा\s*(बंद|ऑफ|क्लोज))/i.test(
      lower
    )
  ) {
    return { action: 'off' };
  }

  if (mentionsBack) {
    return { action: 'back', facingHint: 'environment' };
  }

  if (mentionsFront) {
    return { action: 'front', facingHint: 'user' };
  }

  return null;
}

// Live Vision Manager Singleton (Front & Back Camera + Live Photo Snap + Screen Share)
class ZaraVisionManager {
  private mode: VisionMode = 'off';
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private captureCanvas: HTMLCanvasElement | null = null;
  private motionCanvas: HTMLCanvasElement | null = null;
  private prevMotionFrame: Uint8ClampedArray | null = null;
  private facingMode: 'user' | 'environment' = 'user';
  private desiredCameraActive = false;
  private staticScreenDataUrl: string | null = null;
  private userGazeTarget = { x: 0, y: 0 };
  private motionTimer: number | null = null;
  private listeners = new Set<
    (
      mode: VisionMode,
      stream: MediaStream | null,
      staticImg: string | null,
      facing: 'user' | 'environment'
    ) => void
  >();

  constructor() {
    if (typeof document !== 'undefined') {
      const v = document.createElement('video');
      v.autoplay = true;
      v.muted = true;
      v.playsInline = true;
      v.setAttribute('playsinline', 'true');
      this.videoEl = v;
      this.captureCanvas = document.createElement('canvas');
      this.motionCanvas = document.createElement('canvas');
      this.motionCanvas.width = 48;
      this.motionCanvas.height = 36;
    }
  }

  subscribe(
    cb: (
      mode: VisionMode,
      stream: MediaStream | null,
      staticImg: string | null,
      facing: 'user' | 'environment'
    ) => void
  ) {
    this.listeners.add(cb);
    cb(this.mode, this.stream, this.staticScreenDataUrl, this.facingMode);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) =>
      cb(this.mode, this.stream, this.staticScreenDataUrl, this.facingMode)
    );
  }

  getMode(): VisionMode {
    return this.mode;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  getFacingMode(): 'user' | 'environment' {
    return this.facingMode;
  }

  isDesiredCameraActive(): boolean {
    return this.desiredCameraActive;
  }

  isStreamHealthy(): boolean {
    if (this.mode === 'off') return !this.desiredCameraActive;
    if (this.staticScreenDataUrl) return true;
    const tracks = this.stream?.getVideoTracks() || [];
    return tracks.some((t) => t.readyState === 'live' && t.enabled);
  }

  getUserGazeTarget(): { x: number; y: number } {
    return this.userGazeTarget;
  }

  private async openHardwareCameraStream(facing: 'user' | 'environment'): Promise<MediaStream> {
    // 1. Try exact facingMode first (switches reliably between Front selfie & Back rear camera on Android/iOS)
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {}

    // 2. Enumerate videoinput devices and match explicit Front/Back hardware lens label if available
    if (typeof navigator.mediaDevices.enumerateDevices === 'function') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
        if (videoDevices.length > 0) {
          const targetRegex =
            facing === 'environment'
              ? /back|rear|environment|world|main|0/i
              : /front|user|selfie|facetime|1/i;
          const matched =
            videoDevices.find((d) => targetRegex.test(d.label || '')) ||
            (facing === 'environment' && videoDevices.length > 1
              ? videoDevices[videoDevices.length - 1]
              : videoDevices[0]);
          if (matched?.deviceId) {
            return await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: matched.deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });
          }
        }
      } catch {}
    }

    // 3. Soft facingMode preference fallback
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 960 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  }

  async startCamera(
    facing: 'user' | 'environment' = this.facingMode
  ): Promise<{ ok: boolean; facing: 'user' | 'environment'; error?: string }> {
    const hadActiveStream = Boolean(this.stream);
    this.stop(true);
    this.facingMode = facing;
    this.desiredCameraActive = true;

    // Give mobile Camera HAL 120ms to release previous lens cleanly when switching Front <-> Back
    if (hadActiveStream) {
      await new Promise((r) => window.setTimeout(r, 120));
    }

    try {
      const stream = await this.openHardwareCameraStream(facing);

      this.stream = stream;
      this.mode = 'camera';
      this.staticScreenDataUrl = null;

      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) {
        const settingsFacing = (vTrack.getSettings?.() as any)?.facingMode;
        if (settingsFacing === 'environment' || settingsFacing === 'user') {
          this.facingMode = settingsFacing;
        }
        vTrack.onended = () => {
          this.notify();
        };
      }

      if (this.videoEl) {
        this.videoEl.srcObject = stream;
        await this.videoEl.play().catch(() => {});
      }

      this.startMotionTracking();
      this.notify();
      return { ok: true, facing: this.facingMode };
    } catch {
      this.desiredCameraActive = false;
      this.stop();
      return {
        ok: false,
        facing,
        error: 'Please allow Camera permission so Zara can use Front & Back Camera.',
      };
    }
  }

  async flipCamera(): Promise<{ ok: boolean; facing: 'user' | 'environment'; error?: string }> {
    const next: 'user' | 'environment' = this.facingMode === 'user' ? 'environment' : 'user';
    return this.startCamera(next);
  }

  // Capture high-clarity JPEG DataURL from active camera (or open requested Front/Back lens & snap!)
  async snapPhotoFromLens(
    requestedFacing?: 'user' | 'environment'
  ): Promise<{ dataUrl: string; base64: string; facing: 'user' | 'environment' } | null> {
    const targetFacing = requestedFacing || this.facingMode || 'user';
    const wasOff = this.mode !== 'camera';

    if (this.mode !== 'camera' || (requestedFacing && this.facingMode !== requestedFacing)) {
      const started = await this.startCamera(targetFacing);
      if (!started.ok) return null;
      // Wait briefly for camera auto-exposure & first clear video frame
      await new Promise((r) => window.setTimeout(r, 480));
    } else if (this.videoEl && this.videoEl.readyState < 2) {
      await new Promise((r) => window.setTimeout(r, 320));
    }

    const snapped = this.capturePhotoDataUrl(840);
    if (wasOff && snapped) {
      // Keep camera open only if user already had it open; if snapped transiently from closed state, release cleanly
      this.stop();
    }
    return snapped;
  }

  capturePhotoDataUrl(
    maxDim = 840
  ): { dataUrl: string; base64: string; facing: 'user' | 'environment' } | null {
    if (!this.videoEl || !this.captureCanvas || this.videoEl.readyState < 2) {
      return null;
    }

    const vw = this.videoEl.videoWidth || 640;
    const vh = this.videoEl.videoHeight || 480;
    const scale = Math.min(1, maxDim / Math.max(vw, vh));
    const cw = Math.max(200, Math.round(vw * scale));
    const ch = Math.max(150, Math.round(vh * scale));

    this.captureCanvas.width = cw;
    this.captureCanvas.height = ch;
    const ctx = this.captureCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(this.videoEl, 0, 0, cw, ch);
    const dataUrl = this.captureCanvas.toDataURL('image/jpeg', 0.8);
    const comma = dataUrl.indexOf(',');
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    if (!base64) return null;
    return { dataUrl, base64, facing: this.facingMode };
  }

  async startScreenShare(): Promise<{ ok: boolean; fallbackNeeded?: boolean; error?: string }> {
    const md = navigator.mediaDevices as MediaDevices & {
      getDisplayMedia?: (constraints?: DisplayMediaStreamOptions) => Promise<MediaStream>;
    };

    if (!md || typeof md.getDisplayMedia !== 'function') {
      return {
        ok: false,
        fallbackNeeded: true,
        error: 'Live screen share is unavailable in this mobile browser — select a screenshot to show Zara your screen!',
      };
    }

    try {
      const stream = await md.getDisplayMedia({
        video: true,
        audio: false,
      });

      this.stop();
      this.stream = stream;
      this.mode = 'screen';
      this.staticScreenDataUrl = null;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          if (this.mode === 'screen') {
            this.stop();
          }
        };
      }

      if (this.videoEl) {
        this.videoEl.srcObject = stream;
        await this.videoEl.play().catch(() => {});
      }

      this.notify();
      return { ok: true };
    } catch {
      return {
        ok: false,
        fallbackNeeded: true,
        error: 'Screen share cancelled — upload a screenshot anytime to show Zara your mobile screen.',
      };
    }
  }

  setUploadedScreenSnapshot(dataUrl: string) {
    this.stop();
    this.staticScreenDataUrl = dataUrl;
    this.mode = 'screen';
    this.notify();
  }

  private startMotionTracking() {
    if (this.motionTimer) window.clearInterval(this.motionTimer);
    this.prevMotionFrame = null;

    this.motionTimer = window.setInterval(() => {
      if (this.mode !== 'camera' || !this.videoEl || !this.motionCanvas) return;
      if (this.videoEl.readyState < 2) return;

      const ctx = this.motionCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      const w = this.motionCanvas.width;
      const h = this.motionCanvas.height;
      ctx.drawImage(this.videoEl, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;

      if (this.prevMotionFrame && this.prevMotionFrame.length === data.length) {
        let weightedX = 0;
        let weightedY = 0;
        let totalDiff = 0;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const diff =
              Math.abs(data[idx] - this.prevMotionFrame[idx]) +
              Math.abs(data[idx + 1] - this.prevMotionFrame[idx + 1]) +
              Math.abs(data[idx + 2] - this.prevMotionFrame[idx + 2]);
            if (diff > 42) {
              weightedX += (x / w - 0.5) * diff;
              weightedY += (y / h - 0.5) * diff;
              totalDiff += diff;
            }
          }
        }

        if (totalDiff > 1800) {
          const mirrorSign = this.facingMode === 'user' ? -1 : 1;
          const targetX = Math.max(-1, Math.min(1, (weightedX / totalDiff) * 3.2 * mirrorSign));
          const targetY = Math.max(-1, Math.min(1, (weightedY / totalDiff) * 2.5));
          this.userGazeTarget = {
            x: this.userGazeTarget.x * 0.6 + targetX * 0.4,
            y: this.userGazeTarget.y * 0.6 + targetY * 0.4,
          };
        }
      }

      this.prevMotionFrame = new Uint8ClampedArray(data);
    }, 220);
  }

  captureFrameBase64(): {
    base64: string;
    source: 'camera' | 'camera_front' | 'camera_back' | 'screen';
  } | null {
    if (this.mode === 'off') return null;

    if (this.staticScreenDataUrl) {
      const commaIdx = this.staticScreenDataUrl.indexOf(',');
      const b64 =
        commaIdx >= 0 ? this.staticScreenDataUrl.slice(commaIdx + 1) : this.staticScreenDataUrl;
      return b64 ? { base64: b64, source: 'screen' } : null;
    }

    if (!this.videoEl || !this.captureCanvas || this.videoEl.readyState < 2) {
      return null;
    }

    const vw = this.videoEl.videoWidth || 640;
    const vh = this.videoEl.videoHeight || 480;
    const maxDim = this.mode === 'screen' ? 768 : 560;
    const scale = Math.min(1, maxDim / Math.max(vw, vh));
    const cw = Math.max(160, Math.round(vw * scale));
    const ch = Math.max(120, Math.round(vh * scale));

    this.captureCanvas.width = cw;
    this.captureCanvas.height = ch;
    const ctx = this.captureCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(this.videoEl, 0, 0, cw, ch);
    const dataUrl = this.captureCanvas.toDataURL('image/jpeg', 0.72);
    const comma = dataUrl.indexOf(',');
    const rawB64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    const camSource =
      this.mode === 'screen'
        ? 'screen'
        : this.facingMode === 'environment'
        ? 'camera_back'
        : 'camera_front';
    return rawB64 ? { base64: rawB64, source: camSource } : null;
  }

  stop(keepDesiredFlag = false) {
    if (!keepDesiredFlag) {
      this.desiredCameraActive = false;
    }
    if (this.motionTimer) {
      window.clearInterval(this.motionTimer);
      this.motionTimer = null;
    }
    this.prevMotionFrame = null;
    this.userGazeTarget = { x: 0, y: 0 };
    this.staticScreenDataUrl = null;

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
    this.mode = 'off';
    this.notify();
  }
}

export const zaraVision = new ZaraVisionManager();

export async function queryMobilePermissions(): Promise<MobilePermissionsStatus> {
  let microphone: 'granted' | 'denied' | 'prompt' = 'prompt';
  let camera: 'granted' | 'denied' | 'prompt' = 'prompt';
  let notifications: 'granted' | 'denied' | 'prompt' = 'prompt';
  let geolocation: 'granted' | 'denied' | 'prompt' = 'prompt';
  let persistentStorage: 'granted' | 'prompt' = 'prompt';
  let biometricAvailable = false;

  if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
    try {
      const micRes = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      microphone = micRes.state;
    } catch {}
    try {
      const camRes = await navigator.permissions.query({ name: 'camera' as PermissionName });
      camera = camRes.state;
    } catch {}
    try {
      const geoRes = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      geolocation = geoRes.state;
    } catch {}
  }

  if (typeof Notification !== 'undefined') {
    notifications = Notification.permission === 'default' ? 'prompt' : Notification.permission;
  }

  if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
    try {
      const isPersisted = await navigator.storage.persisted();
      persistentStorage = isPersisted ? 'granted' : 'prompt';
    } catch {}
  }

  if (typeof window !== 'undefined' && typeof PublicKeyCredential !== 'undefined') {
    try {
      biometricAvailable =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {}
  }

  return {
    microphone,
    camera,
    notifications,
    geolocation,
    persistentStorage,
    biometricAvailable,
    screenShare: zaraVision.getMode() === 'screen' ? 'active' : 'ready',
    appControl: 'enabled',
  };
}

export async function requestAllPermissionsMaster(): Promise<{
  micGranted: boolean;
  cameraGranted: boolean;
  notifGranted: boolean;
  geoGranted: boolean;
  storagePersisted: boolean;
}> {
  let micGranted = false;
  let cameraGranted = false;
  let notifGranted = false;
  let geoGranted = false;
  let storagePersisted = false;

  // Trigger Native Android Runtime Permission Dialog if running inside Zara Native APK
  if (typeof window !== 'undefined' && window.ZaraAndroidBridge?.requestAllAndroidPermissions) {
    try {
      window.ZaraAndroidBridge.requestAllAndroidPermissions();
    } catch {}
  }

  try {
    const bothStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    bothStream.getTracks().forEach((t) => t.stop());
    micGranted = true;
    cameraGranted = true;
  } catch {
    try {
      const micOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
      micOnly.getTracks().forEach((t) => t.stop());
      micGranted = true;
    } catch {}

    try {
      const camOnly = await navigator.mediaDevices.getUserMedia({ video: true });
      camOnly.getTracks().forEach((t) => t.stop());
      cameraGranted = true;
    } catch {}
  }

  if (typeof Notification !== 'undefined' && Notification.requestPermission) {
    try {
      const perm = await Notification.requestPermission();
      notifGranted = perm === 'granted';
    } catch {}
  }

  if (typeof navigator !== 'undefined' && navigator.geolocation?.getCurrentPosition) {
    geoGranted = await new Promise<boolean>((resolve) => {
      try {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { timeout: 4500, maximumAge: 60000 }
        );
      } catch {
        resolve(false);
      }
    });
  }

  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    try {
      storagePersisted = await navigator.storage.persist();
    } catch {}
  }

  return { micGranted, cameraGranted, notifGranted, geoGranted, storagePersisted };
}

export async function readMobileHardwareTelemetry(): Promise<MobileHardwareTelemetry> {
  let batteryLevel: number | null = null;
  let isCharging: boolean | null = null;
  let networkType = '4G / Wi-Fi';
  let storageUsedMb: number | null = null;

  const nav = navigator as any;

  if (typeof nav.getBattery === 'function') {
    try {
      const bat = await nav.getBattery();
      batteryLevel = Math.round((bat.level ?? 0.85) * 100);
      isCharging = Boolean(bat.charging);
    } catch {}
  }

  if (nav.connection) {
    const eff = nav.connection.effectiveType ? String(nav.connection.effectiveType).toUpperCase() : '';
    const typ = nav.connection.type ? String(nav.connection.type).toUpperCase() : '';
    networkType = [typ, eff].filter(Boolean).join(' • ') || 'High-Speed';
  }

  if (navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      if (typeof est.usage === 'number') {
        storageUsedMb = Math.max(1, Math.round(est.usage / (1024 * 1024)));
      }
    } catch {}
  }

  const brand = getSelectedMobileBrand();
  const platform = detectMobilePlatform();
  const platformLabel =
    brand.id !== 'all_mobiles'
      ? brand.name
      : platform === 'android'
      ? 'Android Smartphone'
      : platform === 'ios'
      ? 'iPhone / iOS'
      : 'All Mobile Ready';

  return {
    batteryLevel,
    isCharging,
    networkType,
    online: navigator.onLine,
    cores: navigator.hardwareConcurrency || 8,
    memoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
    storageUsedMb,
    platformLabel,
  };
}
