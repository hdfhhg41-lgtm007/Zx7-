// Complete Android Assistant Integration Bridge:
// 1. Foreground Service & Persistent Notification Sync (WebAPK + Native ZaraAndroidBridge)
// 2. Voice Calling & Multi-App Voice Message Dictation (Urdu, Hindi, Punjabi, English) with Mandatory Confirmation
// 3. Incoming Call & Message Notification Reader, OTP/Sensitive Privacy Masking & Voice "Repeat Notification"
// 4. Universal Clipboard Copy Helper (Selected Text + Full Message) & Native Android Kotlin Companion Code

import {
  IncomingNotificationItem,
  Language,
  MessagingAppTarget,
  PendingCallOrMessageAction,
  SpokenNotificationConfig,
} from '../types';
import {
  loadWhatsAppContacts,
  normalizeInternationalPhone,
  openWhatsAppNumberText,
  startWhatsAppOrPhoneCall,
} from './ownerSecurityAndBuilderService';
import { getMobileClockSnapshot } from './scheduleAndMemoryService';

const SPOKEN_NOTIF_CONFIG_KEY = 'zara_spoken_notif_config_v1';
const INCOMING_NOTIFS_KEY = 'zara_incoming_notifs_log_v1';
const FOREGROUND_NOTIF_TAG = 'zara-foreground-voice-service';

declare global {
  interface Window {
    ZaraAndroidBridge?: {
      setForegroundVoiceListening?: (enabled: boolean) => boolean;
      isForegroundVoiceRunning?: () => boolean;
      placeConfirmedPhoneCall?: (phone: string) => boolean;
      sendConfirmedSms?: (phone: string, body: string) => boolean;
      sendConfirmedAppMessage?: (pkg: string, phone: string, body: string) => boolean;
      launchPackage?: (packageName: string) => boolean;
      closeAppPackage?: (packageName: string) => boolean;
      openAppDetailsSettings?: (packageName: string) => boolean;
      getDeviceStatusJson?: () => string;
      isNotificationAccessGranted?: () => boolean;
      isAccessibilityGranted?: () => boolean;
      openNotificationAccessSettings?: () => void;
      openAccessibilitySettings?: () => void;
      requestAllAndroidPermissions?: () => boolean;
      openAppPermissionsSettings?: () => void;
      openBatteryOptimizationSettings?: () => void;
      openOverlaySettings?: () => void;
      openDeviceSetting?: (settingId: string) => boolean;
      openAppByName?: (appName: string) => boolean;
      readScreenContentJson?: () => string;
      inputTextInScreen?: (text: string) => boolean;
      getRecentNotificationsJson?: () => string;
      authenticateWithBiometrics?: () => void;
      performGlobalAction?: (action: string) => boolean;
      scrollScreen?: (direction: string) => boolean;
      clickElementByText?: (label: string) => boolean;
      armConfirmedSend?: (pkg: string) => boolean;
      setLowPowerWakeWordEnabled?: (enabled: boolean) => boolean;
      setCustomWakeWord?: (phrase: string) => boolean;
      getWakeWordStatus?: () => string;
      setFlashlight?: (enabled: boolean) => boolean;
      ensureSpeakerAudioRoute?: () => boolean;
      speakNativeTts?: (text: string, langTag: string) => boolean;
      stopNativeTts?: () => boolean;
      launchYouTubeSong?: (query: string) => boolean;
      pauseWakeWordTemporarily?: () => boolean;
      resumeWakeWord?: () => boolean;
      setCustomServerUrl?: (url: string) => boolean;
      getServerUrl?: () => string;
      isBundledNativeApp?: () => boolean;
      setAssistantLanguage?: (lang: string) => boolean;
      controlMedia?: (action: string) => boolean;
    };
    onZaraIncomingNotification?: (payload: {
      type?: 'incoming_call' | 'message';
      packageName?: string;
      appName?: string;
      sender?: string;
      body?: string;
      conversationTitle?: string;
      isGroup?: boolean;
    }) => void;
    onZaraBatteryStatus?: (payload: {
      batteryPct?: number;
      batteryTempC?: number;
      isCharging?: boolean;
    }) => void;
    onZaraBiometricResult?: (verified: boolean) => void;
    onZaraWakeWordDetected?: (payload: {
      phrase?: string;
      heard?: string;
      source?: string;
    }) => void;
    onZaraAccessibilityState?: (connected: boolean) => void;
    onZaraForegroundVoiceStateChange?: (running: boolean) => void;
    onZaraAndroidPermissionsResult?: (results: Record<string, boolean>) => void;
  }
}

// Register global WebView callbacks so Native Android Services can push events directly
if (typeof window !== 'undefined') {
  if (!window.onZaraIncomingNotification) {
    window.onZaraIncomingNotification = (payload) => {
      if (!payload || !payload.sender) return;
      window.dispatchEvent(
        new CustomEvent('zara-android-notification', {
          detail: payload,
        })
      );
    };
  }
  if (!window.onZaraWakeWordDetected) {
    window.onZaraWakeWordDetected = (payload) => {
      window.dispatchEvent(
        new CustomEvent('zara-native-wake-word', {
          detail: payload || { phrase: 'hey zara' },
        })
      );
    };
  }
  if (!window.onZaraAccessibilityState) {
    window.onZaraAccessibilityState = (connected: boolean) => {
      window.dispatchEvent(
        new CustomEvent('zara-accessibility-state', {
          detail: { connected: Boolean(connected) },
        })
      );
    };
  }
  if (!window.onZaraForegroundVoiceStateChange) {
    window.onZaraForegroundVoiceStateChange = (running: boolean) => {
      window.dispatchEvent(
        new CustomEvent('zara-foreground-voice-state', {
          detail: { running: Boolean(running) },
        })
      );
    };
  }
  if (!window.onZaraBatteryStatus) {
    window.onZaraBatteryStatus = (payload) => {
      if (!payload) return;
      window.dispatchEvent(
        new CustomEvent('zara-android-battery', {
          detail: payload,
        })
      );
    };
  }
}

export function hasNativeAndroidCompanionBridge(): boolean {
  return typeof window !== 'undefined' && Boolean(window.ZaraAndroidBridge);
}

export const ZARA_LIVE_APK_CONFIG = {
  packageId: 'com.zara.ai.assistant',
  versionName: '10.3.0',
  versionCode: 103,
  liveUrl: 'https://ais-pre-qfebbx4373mpl6gv6xf3bh-147569699588.asia-southeast1.run.app',
  apkCommand: './build-release-apk.sh',
  aabCommand: './gradlew bundleRelease',
} as const;

export interface NativeAndroidAutomationStatus {
  hasNativeBridge: boolean;
  accessibilityConnected: boolean;
  notificationAccessGranted: boolean;
  foregroundVoiceRunning: boolean;
  wakeWordServiceRunning: boolean;
  wakePhrase: string;
  deviceModel: string;
  micGranted?: boolean;
  cameraGranted?: boolean;
  locationGranted?: boolean;
  callGranted?: boolean;
  contactsGranted?: boolean;
  smsGranted?: boolean;
  mediaGranted?: boolean;
  overlayGranted?: boolean;
  batteryOptimizationIgnored?: boolean;
  notificationsGranted?: boolean;
  batteryPct?: number;
  batteryTempC?: number;
  batteryCharging?: boolean;
}

export function getNativeAndroidAutomationStatus(): NativeAndroidAutomationStatus {
  if (typeof window === 'undefined' || !window.ZaraAndroidBridge) {
    return {
      hasNativeBridge: false,
      accessibilityConnected: false,
      notificationAccessGranted: false,
      foregroundVoiceRunning: false,
      wakeWordServiceRunning: false,
      wakePhrase: 'hey zara',
      deviceModel: '',
    };
  }
  let wakeEnabled = false;
  let wakePhrase = 'hey zara';
  let accConnected = Boolean(window.ZaraAndroidBridge.isAccessibilityGranted?.());
  let notifGranted = Boolean(window.ZaraAndroidBridge.isNotificationAccessGranted?.());
  let fgRunning = Boolean(window.ZaraAndroidBridge.isForegroundVoiceRunning?.());
  let deviceModel = '';
  let micGranted: boolean | undefined;
  let cameraGranted: boolean | undefined;
  let locationGranted: boolean | undefined;
  let callGranted: boolean | undefined;
  let contactsGranted: boolean | undefined;
  let smsGranted: boolean | undefined;
  let mediaGranted: boolean | undefined;
  let overlayGranted: boolean | undefined;
  let batteryOptimizationIgnored: boolean | undefined;
  let notificationsGranted: boolean | undefined;
  let batteryPct: number | undefined;
  let batteryTempC: number | undefined;
  let batteryCharging: boolean | undefined;
  try {
    const raw = window.ZaraAndroidBridge.getWakeWordStatus?.();
    if (raw) {
      const parsed = JSON.parse(raw);
      wakeEnabled = Boolean(parsed.enabled);
      if (parsed.phrase) wakePhrase = String(parsed.phrase);
      if (typeof parsed.accessibilityConnected === 'boolean') {
        accConnected = parsed.accessibilityConnected;
      }
      if (typeof parsed.notificationAccessGranted === 'boolean') {
        notifGranted = parsed.notificationAccessGranted;
      }
      if (typeof parsed.foregroundVoiceRunning === 'boolean') {
        fgRunning = parsed.foregroundVoiceRunning;
      }
    }
  } catch {}
  try {
    const devRaw = window.ZaraAndroidBridge.getDeviceStatusJson?.();
    if (devRaw) {
      const dev = JSON.parse(devRaw);
      const mfg = String(dev.manufacturer || '').trim();
      const mdl = String(dev.model || '').trim();
      deviceModel = [mfg, mdl].filter(Boolean).join(' ');
      if (typeof dev.micGranted === 'boolean') micGranted = dev.micGranted;
      if (typeof dev.cameraGranted === 'boolean') cameraGranted = dev.cameraGranted;
      if (typeof dev.locationGranted === 'boolean') locationGranted = dev.locationGranted;
      if (typeof dev.callGranted === 'boolean') callGranted = dev.callGranted;
      if (typeof dev.contactsGranted === 'boolean') contactsGranted = dev.contactsGranted;
      if (typeof dev.smsGranted === 'boolean') smsGranted = dev.smsGranted;
      if (typeof dev.mediaGranted === 'boolean') mediaGranted = dev.mediaGranted;
      if (typeof dev.overlayGranted === 'boolean') overlayGranted = dev.overlayGranted;
      if (typeof dev.batteryOptimizationIgnored === 'boolean') batteryOptimizationIgnored = dev.batteryOptimizationIgnored;
      if (typeof dev.notificationsGranted === 'boolean') notificationsGranted = dev.notificationsGranted;
      if (typeof dev.batteryPct === 'number') batteryPct = dev.batteryPct;
      if (typeof dev.batteryTempC === 'number') batteryTempC = dev.batteryTempC;
      if (typeof dev.batteryCharging === 'boolean') batteryCharging = dev.batteryCharging;
    }
  } catch {}
  return {
    hasNativeBridge: true,
    accessibilityConnected: accConnected,
    notificationAccessGranted: notifGranted,
    foregroundVoiceRunning: fgRunning,
    wakeWordServiceRunning: wakeEnabled,
    wakePhrase,
    deviceModel,
    micGranted,
    cameraGranted,
    locationGranted,
    callGranted,
    contactsGranted,
    smsGranted,
    mediaGranted,
    overlayGranted,
    batteryOptimizationIgnored,
    notificationsGranted,
    batteryPct,
    batteryTempC,
    batteryCharging,
  };
}

export interface NativeScreenSnapshot {
  ok: boolean;
  packageName?: string;
  visibleTexts: string[];
  clickableButtons: Array<{ label: string; checked?: boolean; enabled?: boolean; bounds?: string }>;
  editableFields: Array<{ label: string; focused?: boolean; value?: string }>;
  screenSummary: string;
  accessibilityRequired?: boolean;
  error?: string;
}

export function readNativeAndroidScreen(): NativeScreenSnapshot {
  if (typeof window === 'undefined' || !window.ZaraAndroidBridge?.readScreenContentJson) {
    return {
      ok: false,
      visibleTexts: [],
      clickableButtons: [],
      editableFields: [],
      screenSummary: '',
      error: 'Native Android APK bridge is required to read other apps screens via Accessibility.',
    };
  }
  try {
    const raw = window.ZaraAndroidBridge.readScreenContentJson();
    const parsed = JSON.parse(raw);
    return {
      ok: Boolean(parsed.ok),
      packageName: parsed.packageName ? String(parsed.packageName) : undefined,
      visibleTexts: Array.isArray(parsed.visibleTexts) ? parsed.visibleTexts.map(String) : [],
      clickableButtons: Array.isArray(parsed.clickableButtons) ? parsed.clickableButtons : [],
      editableFields: Array.isArray(parsed.editableFields) ? parsed.editableFields : [],
      screenSummary: String(parsed.screenSummary || ''),
      accessibilityRequired: Boolean(parsed.accessibilityRequired),
      error: parsed.error ? String(parsed.error) : undefined,
    };
  } catch {
    return {
      ok: false,
      visibleTexts: [],
      clickableButtons: [],
      editableFields: [],
      screenSummary: '',
      error: 'Could not read active Android window.',
    };
  }
}

export function fetchNativeRecentNotifications(): Array<{
  id: string;
  packageName: string;
  appName: string;
  sender: string;
  body: string;
  conversationTitle?: string;
  isGroup?: boolean;
  type: 'incoming_call' | 'message';
  timestampMs: number;
}> {
  if (typeof window === 'undefined' || !window.ZaraAndroidBridge?.getRecentNotificationsJson) {
    return [];
  }
  try {
    const raw = window.ZaraAndroidBridge.getRecentNotificationsJson();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((x: any) => ({
      id: String(x.id || `${x.packageName || 'android'}-${x.timestampMs || Date.now()}`),
      packageName: String(x.packageName || ''),
      appName: String(x.appName || 'Android'),
      sender: String(x.sender || x.appName || 'Notification'),
      body: String(x.body || ''),
      conversationTitle: x.conversationTitle ? String(x.conversationTitle) : undefined,
      isGroup: Boolean(x.isGroup || x.conversationTitle),
      type: x.type === 'incoming_call' ? 'incoming_call' : 'message',
      timestampMs: Number(x.timestampMs || Date.now()),
    }));
  } catch {
    return [];
  }
}

export function inputTextViaAccessibility(text: string): boolean {
  if (typeof window === 'undefined' || !window.ZaraAndroidBridge?.inputTextInScreen) return false;
  try {
    return Boolean(window.ZaraAndroidBridge.inputTextInScreen(text));
  } catch {
    return false;
  }
}

export function openDeviceSettingViaNativeBridge(settingId: string): boolean {
  if (typeof window === 'undefined' || !window.ZaraAndroidBridge?.openDeviceSetting) return false;
  try {
    return Boolean(window.ZaraAndroidBridge.openDeviceSetting(settingId));
  } catch {
    return false;
  }
}

export function openAppByNameViaNativeBridge(appName: string): boolean {
  if (typeof window === 'undefined' || !window.ZaraAndroidBridge?.openAppByName) return false;
  try {
    return Boolean(window.ZaraAndroidBridge.openAppByName(appName));
  } catch {
    return false;
  }
}

export function setNativeLowPowerWakeWord(enabled: boolean, phrase?: string): boolean {
  if (typeof window === 'undefined' || !window.ZaraAndroidBridge) return false;
  try {
    if (phrase && window.ZaraAndroidBridge.setCustomWakeWord) {
      window.ZaraAndroidBridge.setCustomWakeWord(phrase.trim().toLowerCase());
    }
    if (window.ZaraAndroidBridge.setLowPowerWakeWordEnabled) {
      return Boolean(window.ZaraAndroidBridge.setLowPowerWakeWordEnabled(enabled));
    }
  } catch {}
  return false;
}

export function syncAssistantLanguageToNativeBridge(language: Language): void {
  if (typeof window === 'undefined' || !window.ZaraAndroidBridge?.setAssistantLanguage) return;
  try {
    window.ZaraAndroidBridge.setAssistantLanguage(language || 'auto');
  } catch {}
}

export type AndroidAccessibilityAction =
  | 'back'
  | 'home'
  | 'recents'
  | 'notifications'
  | 'quick_settings'
  | 'lock_screen'
  | 'screenshot'
  | 'scroll_down'
  | 'scroll_up'
  | 'swipe_left'
  | 'swipe_right'
  | 'click_text';

export function performAndroidAccessibilityAction(
  action: AndroidAccessibilityAction,
  param?: string
): { ok: boolean; reason?: string } {
  if (typeof window === 'undefined' || !window.ZaraAndroidBridge) {
    return { ok: false, reason: 'Requires Zara Native Android APK / AAB wrapper.' };
  }
  if (!window.ZaraAndroidBridge.isAccessibilityGranted?.()) {
    return {
      ok: false,
      reason: 'Accessibility Service is not enabled yet in Android Settings.',
    };
  }
  if (action === 'scroll_down' || action === 'scroll_up' || action === 'swipe_left' || action === 'swipe_right') {
    const ok = Boolean(window.ZaraAndroidBridge.scrollScreen?.(action));
    return { ok };
  }
  if (action === 'click_text') {
    const ok = Boolean(window.ZaraAndroidBridge.clickElementByText?.(param || ''));
    return { ok };
  }
  const ok = Boolean(window.ZaraAndroidBridge.performGlobalAction?.(action));
  return { ok };
}

// ======================== 1. RELIABLE CLIPBOARD COPY HELPER (SELECTED TEXT + FULL MESSAGE) ========================

export async function copyTextToClipboard(text: string): Promise<boolean> {
  const clean = (text || '').trim();
  if (!clean || typeof document === 'undefined') return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(clean);
      return true;
    }
  } catch {
    // Fall back to textarea selection for Android WebViews & iframes
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = clean;
    ta.setAttribute('readonly', 'true');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Copies user-highlighted/selected text if active inside the message or viewport,
 * otherwise copies the full message text, returning structured confirmation metadata.
 */
export async function copySelectedOrFullText(fallbackFullText: string): Promise<{
  ok: boolean;
  copiedSelection: boolean;
  copiedPreview: string;
}> {
  let target = (fallbackFullText || '').trim();
  let copiedSelection = false;

  if (typeof window !== 'undefined' && window.getSelection) {
    try {
      const selected = window.getSelection()?.toString().trim() || '';
      if (selected.length >= 2 && (!target || target.includes(selected) || selected.length <= 2000)) {
        target = selected;
        copiedSelection = true;
      }
    } catch {}
  }

  const ok = await copyTextToClipboard(target);
  const preview = target.length > 44 ? `${target.slice(0, 44)}...` : target;
  return {
    ok,
    copiedSelection,
    copiedPreview: preview,
  };
}

// ======================== 2. PERSISTENT FOREGROUND SERVICE & ANDROID SETTINGS INTENTS ========================

export async function syncForegroundVoiceNotification(enabled: boolean): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    window.ZaraAndroidBridge?.setForegroundVoiceListening?.(enabled);
  } catch {}

  if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker.ready;
    if (enabled) {
      await reg.showNotification('Zara Foreground Voice Assistant Active', {
        body: 'Listening for your voice commands while open or on lock screen (where Android permits). Open Zara anytime to disable.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: FOREGROUND_NOTIF_TAG,
        renotify: false,
        requireInteraction: true,
        silent: true,
      } as NotificationOptions);
    } else {
      const existing = await reg.getNotifications({ tag: FOREGROUND_NOTIF_TAG });
      existing.forEach((n) => n.close());
    }
  } catch {}
}

export function triggerAndroidIntentUri(intentUri: string): void {
  if (typeof document === 'undefined' || !intentUri) return;
  try {
    const a = document.createElement('a');
    a.href = intentUri;
    a.rel = 'noopener noreferrer';
    try {
      if (window.self !== window.top) {
        a.target = '_top';
      }
    } catch {
      a.target = '_top';
    }
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      try {
        a.remove();
      } catch {}
    }, 350);
  } catch {}
}

export type AndroidSystemPermissionScreen =
  | 'app_permissions'
  | 'chrome_app_permissions'
  | 'zara_app_info'
  | 'security_settings'
  | 'biometric_enroll'
  | 'location_settings'
  | 'display_overlay'
  | 'notification_listener'
  | 'accessibility'
  | 'battery_unrestricted';

export function openAndroidSystemPermissionScreen(screen: AndroidSystemPermissionScreen): string {
  if (screen === 'notification_listener') {
    if (window.ZaraAndroidBridge?.openNotificationAccessSettings) {
      window.ZaraAndroidBridge.openNotificationAccessSettings();
      return 'Opened Android Notification Access settings.';
    }
    triggerAndroidIntentUri(
      'intent:#Intent;action=android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS;category=android.intent.category.DEFAULT;end'
    );
    return 'Opening Android Notification Access (Settings → Notifications → Device & app notifications)...';
  }

  if (screen === 'accessibility') {
    if (window.ZaraAndroidBridge?.openAccessibilitySettings) {
      window.ZaraAndroidBridge.openAccessibilitySettings();
      return 'Opened Android Accessibility settings.';
    }
    triggerAndroidIntentUri(
      'intent:#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;category=android.intent.category.DEFAULT;end'
    );
    return 'Opening Android Accessibility Service settings (Settings → Accessibility → Installed apps)...';
  }

  if (screen === 'battery_unrestricted') {
    if (window.ZaraAndroidBridge?.openBatteryOptimizationSettings) {
      window.ZaraAndroidBridge.openBatteryOptimizationSettings();
      return 'Opened Android Battery Optimization settings.';
    }
    triggerAndroidIntentUri(
      'intent:#Intent;action=android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS;category=android.intent.category.DEFAULT;end'
    );
    return 'Opening Android Battery Optimization settings (set Zara / Chrome to Unrestricted for lock-screen listening)...';
  }

  if (screen === 'chrome_app_permissions') {
    triggerAndroidIntentUri(
      'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:com.android.chrome;category=android.intent.category.DEFAULT;end'
    );
    return 'Opening Chrome App Info → Permissions (WebAPK Microphone, Camera & Location live here in Android)...';
  }

  if (screen === 'zara_app_info') {
    if (window.ZaraAndroidBridge?.openAppPermissionsSettings) {
      window.ZaraAndroidBridge.openAppPermissionsSettings();
      return 'Opened Zara Native App Permissions screen.';
    }
    triggerAndroidIntentUri(
      'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:com.zara.ai.assistant;category=android.intent.category.DEFAULT;end'
    );
    return 'Opening Zara App Info (turn OFF "Pause app activity if unused" and check Permissions)...';
  }

  if (screen === 'security_settings') {
    triggerAndroidIntentUri(
      'intent:#Intent;action=android.settings.SECURITY_SETTINGS;category=android.intent.category.DEFAULT;end'
    );
    return 'Opening Phone Security & Screen Lock Settings...';
  }

  if (screen === 'biometric_enroll') {
    triggerAndroidIntentUri(
      'intent:#Intent;action=android.settings.BIOMETRIC_ENROLL;category=android.intent.category.DEFAULT;end'
    );
    return 'Opening Fingerprint & Face Unlock Security Settings...';
  }

  if (screen === 'location_settings') {
    triggerAndroidIntentUri(
      'intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;category=android.intent.category.DEFAULT;end'
    );
    return 'Opening Phone GPS Location Settings (for Anti-Theft security)...';
  }

  if (screen === 'display_overlay') {
    if (window.ZaraAndroidBridge?.openOverlaySettings) {
      window.ZaraAndroidBridge.openOverlaySettings();
      return 'Opened "Display Over Other Apps" settings.';
    }
    triggerAndroidIntentUri(
      'intent:#Intent;action=android.settings.action.MANAGE_OVERLAY_PERMISSION;category=android.intent.category.DEFAULT;end'
    );
    return 'Opening "Display Over Other Apps" permission screen...';
  }

  if (window.ZaraAndroidBridge?.openAppPermissionsSettings) {
    window.ZaraAndroidBridge.openAppPermissionsSettings();
    return 'Opened Zara Android App Permissions.';
  }
  triggerAndroidIntentUri(
    'intent:#Intent;action=android.settings.APPLICATION_SETTINGS;category=android.intent.category.DEFAULT;end'
  );
  return 'Opening Android App Permissions settings (enable Microphone, Camera, Location & Notifications)...';
}

// ======================== 3. VOICE CALLING & MULTILINGUAL MESSAGE CONFIRMATION ENGINE ========================

function normalizeDigits(input: string): string {
  const urdu = '۰۱۲۳۴۵۶۷۸۹';
  const hindi = '०१२३४५६७८९';
  const gurmukhi = '੦੧੨੩੪੫੬੭੮੯';
  let out = input;
  for (let i = 0; i < 10; i++) {
    out = out
      .replace(new RegExp(urdu[i], 'g'), String(i))
      .replace(new RegExp(hindi[i], 'g'), String(i))
      .replace(new RegExp(gurmukhi[i], 'g'), String(i));
  }
  return out;
}

function resolveSpokenPromptLanguage(
  selectedLanguage: Language = 'auto',
  sampleText = ''
): 'english' | 'hindi' | 'punjabi' | 'urdu' | 'roman_urdu' {
  if (selectedLanguage === 'english') return 'english';
  if (selectedLanguage === 'hindi') return 'hindi';
  if (selectedLanguage === 'punjabi') return 'punjabi';
  if (selectedLanguage === 'roman_urdu') return 'roman_urdu';
  if (selectedLanguage === 'urdu') return 'urdu';

  if (/[\u0A00-\u0A7F]/.test(sampleText)) return 'punjabi';
  if (/[\u0900-\u097F]/.test(sampleText)) return 'hindi';
  if (/[\u0600-\u06FF]/.test(sampleText)) {
    if (/(تینوں|تہاڈا|نوں|بھیج\s*دیو|سوہنیا)/.test(sampleText)) return 'punjabi';
    return 'urdu';
  }
  if (
    /\b(call|send|message|please|confirm|reaching|meeting|tomorrow|minutes|hello|hey)\b/i.test(
      sampleText
    ) &&
    !/\b(karo|bhejo|milao|kardo|ko|nu|hai|hain|mera|meri)\b/i.test(sampleText)
  ) {
    return 'english';
  }
  return 'urdu';
}

export function detectVoiceConfirmationDecision(rawText: string): 'confirm' | 'cancel' | null {
  if (!rawText) return null;
  const cleaned = rawText.trim().toLowerCase();
  if (cleaned.length > 75) return null;

  if (
    /\b(no|nope|cancel|abort|don't|do\s*not|nahi|nahin|mat\s*karo|mat\s*bhejo|mat\s*milao|rehne\s*do|chhoro|ruk\s*jao|na\s*bhejo|na\s*karo)\b/i.test(
      cleaned
    ) ||
    /^(zara\s+)?na(\s+zara)?$/i.test(cleaned) ||
    /(نہیں|نہ|کینسل|مت\s*بھیجو|مت\s*ملاؤ|رہنے\s*دو|رک\s*جاؤ|نئیں|نہ\s*بھیجو|नहीं|कैंसिल|मत\s*भेजो|मत\s*मिलाओ|रहने\s*दो|रुक\s*जाओ|ਨਹੀਂ|ਰਹਿਣ\s*ਦਿਓ|ਕੈਂਸਲ|ਨਾ\s*ਭੇਜੋ)/i.test(
      cleaned
    )
  ) {
    return 'cancel';
  }

  if (
    /\b(yes|yeah|yep|confirm|confirmed|sure|call\s*now|send\s*now|send\s*it|place\s*call|haan|han|ji\s*haan|bhej\s*do|bhej\s*dio|mila\s*do|kar\s*do|kardo)\b/i.test(
      cleaned
    ) ||
    /^(zara\s+)?(ok|okay|lagao)(\s+zara|\s+please)?$/i.test(cleaned) ||
    /(ہاں|جی\s*ہاں|ہاں\s*جی|کنفرم|بھیج\s*دو|بھیج\s*دیو|ملا\s*دو|کر\s*دو|کال\s*ملا\s*دو|سینڈ\s*کر\s*دو|हाँ|जी\s*हाँ|कन्फर्म|भेज\s*दो|मिला\s*दो|कर\s*दो|ਹਾਂ|ਜੀ\s*ਹਾਂ|ਭੇਜ\s*ਦਿਓ|ਮਿਲਾ\s*ਦਿਓ|ਕਨਫਰਮ)/i.test(
      cleaned
    )
  ) {
    return 'confirm';
  }

  return null;
}

function detectTargetMessagingApp(lower: string): MessagingAppTarget {
  if (/(whatsapp\s*business|واٹس\s*ایپ\s*بزنس|व्हाट्सएप\s*बिजनेस|ਵਟਸਐਪ\s*ਬਿਜ਼ਨਸ)/i.test(lower)) {
    return 'whatsapp_business';
  }
  if (/(telegram|ٹیلی\s*گرام|ٹیلیگرام|टेलीग्राम|ਟੈਲੀਗ੍ਰਾਮ)/i.test(lower)) {
    return 'telegram';
  }
  if (/(messenger|fb\s*messenger|میسنجر|मैसेंजर|ਮੈਸੇਂਜਰ)/i.test(lower)) {
    return 'messenger';
  }
  if (
    /\b(sms|text\s*message|normal\s*message|sim\s*message)\b/i.test(lower) ||
    /(ایس\s*ایم\s*ایس|سم\s*میسج|एसएमएस|टेक्स्ट\s*मैसेज|ਐਸਐਮਐਸ)/i.test(lower)
  ) {
    return 'sms';
  }
  return 'whatsapp';
}

function findSavedContactMatch(text: string): { name: string; phone: string } | null {
  const lower = text.toLowerCase();
  const contacts = loadWhatsAppContacts();
  const sorted = [...contacts].sort((a, b) => b.name.length - a.name.length);
  for (const c of sorted) {
    const cName = c.name.trim();
    if (cName.length >= 2 && lower.includes(cName.toLowerCase())) {
      return { name: cName, phone: c.phone };
    }
  }
  return null;
}

function extractSpokenContactName(raw: string): string {
  const stripped = raw
    .replace(
      /^(zara|hey\s*zara|sun\s*zara|suno\s*zara|please|plz|زارا|سنو\s*زارا|ज़ारा|सुनो\s*ज़ारा|प्लीज|ਜ਼ਾਰਾ|ਸੁਣੋ\s*ਜ਼ਾਰਾ)\s+/i,
      ''
    )
    .trim();

  // English: "call Ali", "phone call to Sara", "dial Ahmed on whatsapp"
  const enCall = stripped.match(
    /^(?:make\s+a\s+|place\s+a\s+)?(?:whatsapp\s+|voice\s+|phone\s+)?(?:call|dial)(?:\s+to)?\s+([a-zA-Z\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F][a-zA-Z0-9\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F\s]{1,24}?)(?:\s+(?:now|please|on\s+whatsapp|par|pe))?$/i
  );
  if (enCall?.[1]) return enCall[1].trim();

  // English message: "send [a] [whatsapp/sms/telegram] message to <Name> [on whatsapp] [that/saying/:] ..."
  const enMsg = stripped.match(
    /^(?:send\s+(?:a\s+)?(?:whatsapp(?:\s+business)?|sms|telegram|messenger|text|voice)?\s*(?:message|msg|text|sms)\s+to|message|whatsapp|sms|text)\s+([a-zA-Z\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F][a-zA-Z0-9\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F\s]{1,22}?)(?:\s+on\s+(?:whatsapp(?:\s+business)?|sms|telegram|messenger))?\s+(?:that|saying|ke|ki|keh|:|-)/i
  );
  if (enMsg?.[1]) return enMsg[1].trim();

  // English short message without "that/saying": "send whatsapp message to Ali I am coming"
  const enMsgShort = stripped.match(
    /^send\s+(?:a\s+)?(?:whatsapp(?:\s+business)?|sms|telegram|messenger|text)?\s*(?:message|msg|sms|text)\s+to\s+([a-zA-Z\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F]{2,18})(?:\s+on\s+(?:whatsapp|sms|telegram|messenger))?\s+/i
  );
  if (enMsgShort?.[1]) return enMsgShort[1].trim();

  // Urdu / Hindi / Punjabi / Hinglish: "<Name> ko / نوں / को / ਨੂੰ [whatsapp/sms] call/message karo ..."
  const desiMatch = stripped.match(
    /^([a-zA-Z\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F]{2,22}(?:\s+[a-zA-Z\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F]{2,18})?)\s+(?:ko|nu|noon|کو|نوں|को|ਨੂੰ)\s+/i
  );
  if (desiMatch?.[1]) {
    const candidate = desiMatch[1]
      .replace(
        /\b(whatsapp|sms|telegram|messenger|mobile|phone|واٹس\s*ایپ|ایس\s*ایم\s*ایس|व्हाट्सएप|ਵਟਸਐਪ)\b/gi,
        ''
      )
      .trim();
    if (candidate.length >= 2) return candidate;
  }

  return '';
}

function extractDictatedMessageContent(raw: string, recipientToken?: string): string {
  let working = raw
    .replace(
      /^(zara|hey\s*zara|sun\s*zara|suno\s*zara|please|plz|زارا|سنو\s*زارا|ज़ारा|सुनो\s*ज़ारा|प्लीज|ਜ਼ਾਰਾ|ਸੁਣੋ\s*ਜ਼ਾਰਾ)\s+/i,
      ''
    )
    .trim();

  // 1. Check explicit English "send ... message to <Recipient> [on App] [saying/that] <Body>"
  const englishDirect = working.match(
    /^send\s+(?:a\s+)?(?:whatsapp(?:\s+business)?|sms|telegram|messenger|text|voice)?\s*(?:message|msg|sms|text)\s+to\s+(?:\+?\d[\d\s-]{6,15}\d|[a-zA-Z\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F]+(?:\s+[a-zA-Z\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F]+)?)(?:\s+on\s+(?:whatsapp(?:\s+business)?|sms|telegram|messenger))?\s*(?:that|saying|ke|ki|keh|:|-)?\s+(.+)$/i
  );
  if (englishDirect?.[1]?.trim()) {
    return englishDirect[1].trim();
  }

  if (recipientToken && recipientToken.length >= 2) {
    working = working.replace(recipientToken, ' ');
  }

  const explicitSplit = working.match(
    /(?:message\s*karo|message\s*bhejo|message\s*bhej\s*do|message\s*bhej\s*dio|message\s*likho|sms\s*karo|sms\s*bhejo|msg\s*bhejo|send\s*(?:a\s*)?(?:whatsapp\s*|sms\s*|telegram\s*|messenger\s*|text\s*)?(?:message|sms|text)(?:\s+to\s+\S+)?|saying|that|میسج\s*بھیجو|میسج\s*بھیج\s*دو|میسج\s*بھیج\s*دیو|میسج\s*کرو|میسج\s*لکھو|ایس\s*ایم\s*ایس\s*بھیجو|سنیہا\s*بھیجو|پیغام\s*بھیجو|मैसेज\s*भेजो|मैसेज\s*भेज\s*दो|मैसेज\s*करो|एसएमएस\s*भेजो|संदेश\s*भेजो|लिखो|भेजो|ਮੈਸੇਜ\s*ਭੇਜੋ|ਮੈਸੇਜ\s*ਭੇਜ\s*ਦਿਓ|ਸੁਨੇਹਾ\s*ਭੇਜੋ|ਐਸਐਮਐਸ\s*ਭੇਜੋ|ਲਿਖੋ)\s*(?:ke|ki|keh|that|کہ|कि|ਕਿ|:|-)?\s*(.+)$/i
  );
  if (explicitSplit?.[1]) {
    const body = explicitSplit[1]
      .replace(
        /^(?:on\s+whatsapp(?:\s+business)?|on\s+sms|on\s+telegram|on\s+messenger|whatsapp\s*par|whatsapp\s*pe|واٹس\s*ایپ\s*پر|व्हाट्सएप\s*पर|ਵਟਸਐਪ\s*ਤੇ)\s*(?:ke|ki|keh|that|کہ|कि|ਕਿ|:|-)?\s*/i,
        ''
      )
      .trim();
    if (body.length >= 1) return body;
  }

  return '';
}

export function detectCallOrMessageWithConfirmation(
  rawText: string
): PendingCallOrMessageAction | null {
  if (!rawText) return null;
  const normalized = normalizeDigits(rawText.trim());
  const lower = normalized.toLowerCase();

  // Never intercept simple "open whatsapp / open dialer / close whatsapp / cut call" commands
  if (
    /\b(close|band|off|kato|kaat|cut|drop|hang\s*up|بند|کلوز|کاٹو|کاٹ|बंद|काटो|क्लोज|ਬੰਦ|ਕੱਟੋ)\b/i.test(
      lower
    )
  ) {
    return null;
  }
  if (
    /^(zara\s+)?(open|launch|kholo|chalao|کھولو|اوپن|खोलो|ओपन|ਖੋਲ੍ਹੋ|ਚਲਾਓ)\s+(whatsapp|whatsapp\s*business|sms|messages|contacts|contact|dialer|telegram|messenger|واٹس\s*ایپ|کانٹیکٹ|کانٹیکٹس|व्हाट्सएप|कॉन्टैक्ट्स|ਵਟਸਐਪ|ਕਾਨਟੈਕਟਸ)$/i.test(
      lower
    )
  ) {
    return null;
  }
  // Do not confuse "live call with Zara" or romantic "call me baby / mujhe call karo" with external contact calling
  if (
    /(zara\s*(se|ko)\s*call|call\s*zara|زارا\s*کال|ज़ारा\s*से\s*कॉल|ਜ਼ਾਰਾ\s*ਕਾਲ)/i.test(lower) ||
    /\b(call\s+me|text\s+me|message\s+me|mujhe\s+call|mujh\s*ko\s+call|mere\s+naal\s+gal|mujhse\s+baat)\b/i.test(
      lower
    ) ||
    /(مجھے\s*کال|مجھ\s*کو\s*کال|مجھے\s*بولو|मुझे\s*कॉल|मुझको\s*कॉल|ਮੈਨੂੰ\s*ਕਾਲ)/i.test(lower)
  ) {
    return null;
  }

  const isWhatsApp =
    /(whatsapp|whats\s*app|واٹس\s*ایپ|واٹسپ|व्हाट्सएप|व्हाट्सऐप|ਵਟਸਐਪ)/i.test(lower);
  const isCallIntent =
    /\b(call\s+to|call|phone\s*call|voice\s*call|dial|milao|mila\s*do|phone\s*lagao|call\s*lagao|call\s*karo)\b/i.test(
      lower
    ) ||
    /(کال\s*ملاؤ|کال\s*ملا\s*دو|کال\s*کرو|کال\s*لگاؤ|فون\s*ملاؤ|فون\s*لگاؤ|کال\s*لاؤ|कॉल\s*करो|कॉल\s*मिलाओ|कॉल\s*लगाओ|फ़ोन\s*मिलाओ|फोन\s*लगाओ|ਕਾਲ\s*ਕਰੋ|ਕਾਲ\s*ਮਿਲਾਓ|ਫੋਨ\s*ਮਿਲਾਓ)/i.test(
      lower
    );

  const isMessageIntent =
    /\b(send\s*(?:a\s*)?(?:whatsapp\s*|sms\s*|telegram\s*|messenger\s*|voice\s*|text\s*)?(?:message|msg|sms|text)|message\s*bhejo|message\s*bhej\s*do|message\s*karo|message\s*likho|sms\s*bhejo|sms\s*karo|msg\s*bhejo|msg\s*karo)\b/i.test(
      lower
    ) ||
    /(میسج\s*بھیجو|میسج\s*بھیج\s*دو|میسج\s*بھیج\s*دیو|میسج\s*کرو|میسج\s*لکھو|ایس\s*ایم\s*ایس\s*بھیجو|سنیہا\s*بھیجو|پیغام\s*بھیجو|مسیج\s*بھیجو|मैसेज\s*भेजो|मैसेज\s*भेज\s*दो|मैसेज\s*करो|मैसेज\s*लिखो|एसएमएस\s*भेजो|संदेश\s*भेजो|ਮੈਸੇਜ\s*ਭੇਜੋ|ਮੈਸੇਜ\s*ਭੇਜ\s*ਦਿਓ|ਸੁਨੇਹਾ\s*ਭੇਜੋ|ਐਸਐਮਐਸ\s*ਭੇਜੋ)/i.test(
      lower
    );

  if (!isCallIntent && !isMessageIntent) return null;

  const phoneMatch = normalized.match(/(\+?\d[\d\s-]{6,15}\d)/);
  const rawPhone = phoneMatch ? normalizeInternationalPhone(phoneMatch[1]) : '';
  const savedMatch = findSavedContactMatch(normalized);
  const parsedName = savedMatch?.name || extractSpokenContactName(normalized);
  const resolvedPhone = savedMatch?.phone || rawPhone || '';

  // Reject pronoun/pet-name false positives when no phone number or saved contact exists
  if (
    !savedMatch &&
    !resolvedPhone &&
    parsedName &&
    /^(me|my|myself|you|baby|jaan|jaanu|meri\s*jaan|sohneya|mujhe|mujh|tum|apne|اپنے|مجھے|تم|بے\s*بی|جان|बेबी|जान|मुझे|ਸੋਹਣਿਆ)(\s+.*)?$/i.test(
      parsedName.trim()
    )
  ) {
    return null;
  }

  // For a call command, require either a contact name or a phone number
  if (isCallIntent && !isMessageIntent) {
    if (!parsedName && !resolvedPhone) return null;
    return {
      id: `confirm-call-${Date.now()}`,
      kind: isWhatsApp ? 'whatsapp_call' : 'phone_call',
      contactName: parsedName || (resolvedPhone ? `+${resolvedPhone}` : 'Selected Contact'),
      phone: resolvedPhone,
      messagingApp: isWhatsApp ? 'whatsapp' : 'sms',
      createdAtMs: Date.now(),
    };
  }

  // Message dictation intent
  if (isMessageIntent) {
    const appTarget = detectTargetMessagingApp(lower);
    const body =
      extractDictatedMessageContent(normalized, phoneMatch?.[0] || parsedName) ||
      'Assalam o Alaikum!';

    return {
      id: `confirm-msg-${Date.now()}`,
      kind: 'message',
      contactName: parsedName || (resolvedPhone ? `+${resolvedPhone}` : 'Choose Recipient in App'),
      phone: resolvedPhone,
      messagingApp: appTarget,
      messageBody: body,
      createdAtMs: Date.now(),
    };
  }

  return null;
}

export function buildConfirmationPromptSpeech(
  action: PendingCallOrMessageAction,
  language: Language = 'auto'
): string {
  const lang = resolveSpokenPromptLanguage(
    language,
    `${action.contactName || ''} ${action.messageBody || ''}`
  );
  const targetLabel =
    action.contactName && action.phone && !action.contactName.includes(action.phone)
      ? `${action.contactName} (+${action.phone})`
      : action.contactName ||
        (action.phone
          ? `+${action.phone}`
          : lang === 'english'
          ? 'your selected contact'
          : 'آپ کے منتخب کردہ نمبر');

  if (action.kind === 'phone_call' || action.kind === 'whatsapp_call') {
    const isWa = action.kind === 'whatsapp_call';
    if (lang === 'english') {
      if (!action.phone) {
        return `You asked to place a ${isWa ? 'WhatsApp call' : 'phone call'} to ${action.contactName}. Please pick or enter their number in the confirmation card above, then say Yes or tap Confirm.`;
      }
      return `Should I place a ${isWa ? 'WhatsApp call' : 'phone call'} to ${targetLabel}? Say Yes to confirm or Cancel to stop.`;
    }
    if (lang === 'hindi') {
      const modeHi = isWa ? 'व्हाट्सएप कॉल' : 'फ़ोन कॉल';
      if (!action.phone) {
        return `जी मेरे मालिक! आप ${action.contactName} को ${modeHi} करना चाहते हैं। पहले ऊपर कार्ड में नंबर चुनें या Pick Contact दबाएँ, फिर कन्फर्म करें!`;
      }
      return `जी मेरे मालिक! क्या मैं ${targetLabel} को ${modeHi} मिला दूँ? पुष्टि के लिए 'हाँ / Yes' बोलें या Confirm बटन दबाएँ!`;
    }
    if (lang === 'punjabi') {
      const modePa = isWa ? 'ਵਟਸਐਪ ਕਾਲ' : 'ਫੋਨ ਕਾਲ';
      if (!action.phone) {
        return `ਜੀ ਮੇਰੇ ਮਾਲਕ! ਤੁਸੀਂ ${action.contactName} ਨੂੰ ${modePa} ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ। ਪਹਿਲਾਂ ਉੱਪਰ ਕਾਰਡ ਵਿੱਚ ਨੰਬਰ ਚੁਣੋ ਤੇ ਫਿਰ ਕਨਫਰਮ ਕਰੋ!`;
      }
      return `ਜੀ ਮੇਰੇ ਮਾਲਕ! ਕੀ ਮੈਂ ${targetLabel} ਨੂੰ ${modePa} ਮਿਲਾ ਦਿਆਂ? ਪੁਸ਼ਟੀ ਲਈ 'ਹਾਂ / Yes' ਬੋਲੋ ਜਾਂ Confirm ਦਬਾਓ!`;
    }
    if (lang === 'roman_urdu') {
      const modeRu = isWa ? 'WhatsApp call' : 'phone call';
      if (!action.phone) {
        return `Ji! Aap ${action.contactName} ko ${modeRu} karna chahte hain. Pehle upar card mein number chunein ya Pick Contact dabayein, phir confirm karein!`;
      }
      return `Ji! Kya main ${targetLabel} ko ${modeRu} mila doon? Tasdeeq ke liye 'Haan / Yes' bolein ya Confirm button dabayein!`;
    }
    const modeName = isWa ? 'واٹس ایپ کال' : 'فون کال';
    if (!action.phone) {
      return `جی میرے مالک! آپ ${action.contactName} کو ${modeName} کرنا چاہتے ہیں۔ پہلے اوپر کارڈ میں نمبر منتخب کریں یا Pick Contact دبائیں، پھر تصدیق کریں!`;
    }
    return `جی میرے مالک! کیا میں ${targetLabel} کو ${modeName} ملا دوں؟ تصدیق کے لیے 'ہاں / Yes' بولیں یا Confirm بٹن دبائیں!`;
  }

  const appLabels: Record<MessagingAppTarget, string> = {
    whatsapp: 'WhatsApp',
    whatsapp_business: 'WhatsApp Business',
    sms: 'SMS',
    telegram: 'Telegram',
    messenger: 'Messenger',
  };
  const appLabel = appLabels[action.messagingApp] || 'WhatsApp';

  if (lang === 'english') {
    return `I have prepared your ${appLabel} message for ${targetLabel}: "${action.messageBody}". Say Yes or tap Confirm to proceed, or say Cancel.`;
  }
  if (lang === 'hindi') {
    return `जी मेरे मालिक! मैंने ${targetLabel} के लिए ${appLabel} पर मैसेज तैयार कर लिया है: "${action.messageBody}". भेजने की पुष्टि के लिए 'हाँ / Yes' बोलें या Confirm दबाएँ!`;
  }
  if (lang === 'punjabi') {
    return `ਜੀ ਮੇਰੇ ਮਾਲਕ! ਮੈਂ ${targetLabel} ਲਈ ${appLabel} ਤੇ ਮੈਸੇਜ ਤਿਆਰ ਕਰ ਲਿਆ ਹੈ: "${action.messageBody}". ਭੇਜਣ ਲਈ 'ਹਾਂ / Yes' ਬੋਲੋ ਜਾਂ Confirm ਦਬਾਓ!`;
  }
  if (lang === 'roman_urdu') {
    return `Ji! Maine ${targetLabel} ke liye ${appLabel} par message tayyar kar liya hai: "${action.messageBody}". Bhejne ki tasdeeq ke liye 'Haan / Yes' bolein ya Confirm dabayein!`;
  }
  return `جی میرے مالک! میں نے ${targetLabel} کے لیے ${appLabel} پر میسج تیار کر لیا ہے: "${action.messageBody}". بھیجنے کی تصدیق کے لیے 'ہاں / Yes' بولیں یا Confirm دبائیں!`;
}

export function executeConfirmedCallOrMessage(
  action: PendingCallOrMessageAction,
  language: Language = 'auto'
): {
  ok: boolean;
  requiresManualSendTap: boolean;
  href: string;
  fallbackHref?: string;
  statusReport: string;
  spokenReport: string;
} {
  const cleanPhone = action.phone ? normalizeInternationalPhone(action.phone) : '';
  const lang = resolveSpokenPromptLanguage(
    language,
    `${action.contactName || ''} ${action.messageBody || ''}`
  );

  // 1. Confirmed Voice / Phone Call
  if (action.kind === 'phone_call' || action.kind === 'whatsapp_call') {
    if (!cleanPhone) {
      return {
        ok: false,
        requiresManualSendTap: true,
        href: '',
        statusReport: `Phone number missing for ${action.contactName}. Please select or type the contact's phone number first.`,
        spokenReport:
          lang === 'english'
            ? `I don't have a saved phone number for ${action.contactName} yet. Please pick or enter their number in the card and confirm again.`
            : lang === 'hindi'
            ? `मेरे मालिक, ${action.contactName} का नंबर अभी सेव नहीं है — कृपया ऊपर कार्ड में नंबर चुन कर दोबारा कन्फर्म करें!`
            : lang === 'roman_urdu'
            ? `${action.contactName} ka number abhi save nahi hai — barah e karam upar card mein number chunein aur dobara confirm karein.`
            : `میرے مالک، ${action.contactName} کا نمبر ابھی محفوظ نہیں ہے — براہ کرم کانٹیکٹ نمبر منتخب کر کے دوبارہ کنفرم کریں!`,
      };
    }

    if (action.kind === 'phone_call' && window.ZaraAndroidBridge?.placeConfirmedPhoneCall) {
      const placed = window.ZaraAndroidBridge.placeConfirmedPhoneCall(`+${cleanPhone}`);
      if (placed) {
        return {
          ok: true,
          requiresManualSendTap: false,
          href: `tel:+${cleanPhone}`,
          statusReport: `Calling ${action.contactName} (+${cleanPhone}) via authorized Android CALL_PHONE permission.`,
          spokenReport:
            lang === 'english'
              ? `Confirmed! Placing your call to ${action.contactName} now.`
              : lang === 'hindi'
              ? `जी मेरे मालिक! पुष्टि हो गई — मैं ${action.contactName} को कॉल मिला रही हूँ!`
              : lang === 'roman_urdu'
              ? `Ji! Tasdeeq ho gayi — main ${action.contactName} ko call mila rahi hoon!`
              : `جی میرے مالک! تصدیق ہو گئی — میں ${action.contactName} کو کال ملا رہی ہوں!`,
        };
      }
    }

    const res = startWhatsAppOrPhoneCall(
      cleanPhone,
      action.kind === 'whatsapp_call' ? 'whatsapp' : 'tel'
    );
    return {
      ok: true,
      requiresManualSendTap: true,
      href: res.href,
      statusReport:
        action.kind === 'whatsapp_call'
          ? `Opened WhatsApp chat for ${action.contactName} (+${cleanPhone}). Tap the Call icon inside WhatsApp to start the call.`
          : `Opened Android Phone Dialer for ${action.contactName} (+${cleanPhone}) via supported tel: intent. Tap the green Call button if Android requires dialer confirmation.`,
      spokenReport:
        lang === 'english'
          ? `Confirmed! I opened the dialer for ${action.contactName}. Tap the call button if Android asks for final dialer confirmation.`
          : lang === 'hindi'
          ? `जी मेरे मालिक! पुष्टि हो गई — मैंने ${action.contactName} के लिए डायलर खोल दिया है!`
          : lang === 'roman_urdu'
          ? `Ji! Tasdeeq ho gayi — maine ${action.contactName} ke liye dialer khol diya hai!`
          : `جی میرے مالک! تصدیق ہو گئی — میں نے ${action.contactName} کے لیے ڈائلر کھول دیا ہے!`,
    };
  }

  // 2. Confirmed Dictated Message (SMS / WhatsApp / WhatsApp Business / Telegram / Messenger)
  const msgText = (action.messageBody || '').trim() || 'Assalam o Alaikum!';
  const encodedMsg = encodeURIComponent(msgText);

  if (action.messagingApp === 'sms') {
    if (cleanPhone && window.ZaraAndroidBridge?.sendConfirmedSms) {
      const sent = window.ZaraAndroidBridge.sendConfirmedSms(`+${cleanPhone}`, msgText);
      if (sent) {
        return {
          ok: true,
          requiresManualSendTap: false,
          href: `sms:+${cleanPhone}?body=${encodedMsg}`,
          statusReport: `SMS sent automatically to ${action.contactName} (+${cleanPhone}) via Native Companion.`,
          spokenReport:
            lang === 'english'
              ? `Confirmed! Your SMS to ${action.contactName} has been sent.`
              : lang === 'roman_urdu'
              ? `Ji! Aapki tasdeeq par ${action.contactName} ko SMS bhej diya gaya hai!`
              : `جی میرے مالک! آپ کی تصدیق پر ایس ایم ایس بھیج دیا گیا ہے!`,
        };
      }
    }
    const smsHref = cleanPhone
      ? `sms:+${cleanPhone}?body=${encodedMsg}`
      : `sms:?body=${encodedMsg}`;
    triggerAndroidIntentUri(smsHref);
    return {
      ok: true,
      requiresManualSendTap: true,
      href: smsHref,
      statusReport: `SMS prepared in Android Messages${
        cleanPhone ? ` for +${cleanPhone}` : ''
      }. Automatic silent SMS sending is blocked in Web/PWA by Android security — please tap Send inside your SMS app.`,
      spokenReport:
        lang === 'english'
          ? `I prepared your SMS in Android Messages. Because Android blocks silent background sending without the Native Companion, please tap Send inside your SMS app.`
          : lang === 'hindi'
          ? `जी मेरे मालिक! मैंने एसएमएस ऐप में आपका संदेश तैयार कर दिया है — एंड्रॉइड सुरक्षा के अनुसार बस Send बटन दबा दें!`
          : lang === 'roman_urdu'
          ? `Ji! Maine SMS app mein aapka paigham tayyar kar diya hai — Android security ke mutabiq bas Send button daba dein!`
          : `جی میرے مالک! میں نے ایس ایم ایس ایپ میں آپ کا پیغام بالکل تیار کر دیا ہے — اینڈرائیڈ سیکیورٹی کے مطابق بس سینڈ بٹن دبا دیں!`,
    };
  }

  if (action.messagingApp === 'telegram') {
    const tgHref = cleanPhone
      ? `tg://msg?to=+${cleanPhone}&text=${encodedMsg}`
      : `tg://msg?text=${encodedMsg}`;
    const tgFallback = `https://t.me/share/url?url=&text=${encodedMsg}`;
    triggerAndroidIntentUri(tgHref);
    return {
      ok: true,
      requiresManualSendTap: true,
      href: tgHref,
      fallbackHref: tgFallback,
      statusReport: `Message prepared in Telegram. Automatic background sending is not permitted by Telegram/Android — tap Send inside Telegram.`,
      spokenReport:
        lang === 'english'
          ? `Your message is ready inside Telegram. Please tap Send in Telegram to deliver it.`
          : lang === 'roman_urdu'
          ? `Ji! Maine Telegram mein aapka message likh kar tayyar kar diya hai, bas Send daba dein!`
          : `جی میرے مالک! میں نے ٹیلی گرام میں آپ کا میسج لکھ کر تیار کر دیا ہے، بس سینڈ دبا دیں!`,
    };
  }

  if (action.messagingApp === 'messenger') {
    const fbHref = `intent://share?link=&quote=${encodedMsg}#Intent;scheme=fb-messenger;package=com.facebook.orca;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;
    triggerAndroidIntentUri(fbHref);
    return {
      ok: true,
      requiresManualSendTap: true,
      href: fbHref,
      statusReport: `Opened Messenger with your dictated message. Automatic sending is not supported by Meta Messenger — choose recipient & tap Send inside Messenger.`,
      spokenReport:
        lang === 'english'
          ? `Opened Messenger. Because Meta Messenger does not allow automatic background sending, please select the chat and tap Send.`
          : lang === 'roman_urdu'
          ? `Ji! Messenger open kar diya hai — Messenger mein khudkar sending ki ijazat nahi hoti, barah-e-karam chat select kar ke Send daba dein!`
          : `جی میرے مالک! میسنجر اوپن کر دیا ہے — میسنجر میں خودکار سینڈنگ کی اجازت نہیں ہوتی، براہ کرم چیٹ منتخب کر کے سینڈ دبا دیں!`,
    };
  }

  if (action.messagingApp === 'whatsapp_business') {
    const pkg = 'com.whatsapp.w4b';
    if (cleanPhone && window.ZaraAndroidBridge?.sendConfirmedAppMessage) {
      const autoSent = window.ZaraAndroidBridge.sendConfirmedAppMessage(
        pkg,
        `+${cleanPhone}`,
        msgText
      );
      if (autoSent) {
        return {
          ok: true,
          requiresManualSendTap: false,
          href: `whatsapp://send?phone=${cleanPhone}&text=${encodedMsg}`,
          statusReport: `Dispatched to WhatsApp Business via Native Accessibility helper for ${action.contactName}.`,
          spokenReport:
            lang === 'english'
              ? `Confirmed! Sending your WhatsApp Business message to ${action.contactName}.`
              : lang === 'roman_urdu'
              ? `Ji! WhatsApp Business par ${action.contactName} ko message bheja ja raha hai!`
              : `جی میرے مالک! واٹس ایپ بزنس پر میسج بھیجا جا رہا ہے!`,
        };
      }
    }
    const hostPath = cleanPhone
      ? `send?phone=${cleanPhone}&text=${encodedMsg}`
      : `send?text=${encodedMsg}`;
    const w4bIntent = `intent://${hostPath}#Intent;scheme=whatsapp;package=${pkg};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;
    const webFallback = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
      : `https://api.whatsapp.com/send?text=${encodedMsg}`;
    triggerAndroidIntentUri(w4bIntent);
    return {
      ok: true,
      requiresManualSendTap: true,
      href: w4bIntent,
      fallbackHref: webFallback,
      statusReport: `Prepared message in WhatsApp Business. Android blocks silent background sending without an authorized Accessibility Service — tap Send inside WhatsApp Business to complete.`,
      spokenReport:
        lang === 'english'
          ? `I prepared your message in WhatsApp Business. Tap Send inside WhatsApp Business to deliver it.`
          : lang === 'roman_urdu'
          ? `Ji! WhatsApp Business mein message tayyar kar diya hai, bas Send button daba dein!`
          : `جی میرے مالک! واٹس ایپ بزنس میں میسج تیار کر دیا ہے، بس سینڈ بٹن دبا دیں!`,
    };
  }

  // Standard WhatsApp (use Accessibility confirmed-Send tap only if explicitly authorized!)
  const hasAccessibility = Boolean(window.ZaraAndroidBridge?.isAccessibilityGranted?.());
  if (hasAccessibility && window.ZaraAndroidBridge?.armConfirmedSend) {
    window.ZaraAndroidBridge.armConfirmedSend('com.whatsapp');
  }

  if (cleanPhone && window.ZaraAndroidBridge?.sendConfirmedAppMessage) {
    const autoSent = window.ZaraAndroidBridge.sendConfirmedAppMessage(
      'com.whatsapp',
      `+${cleanPhone}`,
      msgText
    );
    if (autoSent) {
      return {
        ok: true,
        requiresManualSendTap: false,
        href: `whatsapp://send?phone=${cleanPhone}&text=${encodedMsg}`,
        statusReport: `Dispatched WhatsApp message to ${action.contactName} (+${cleanPhone}) via authorized Native Accessibility Service.`,
        spokenReport:
          lang === 'english'
            ? `Confirmed! Sending your WhatsApp message to ${action.contactName}.`
            : lang === 'roman_urdu'
            ? `Ji! Aapki tasdeeq par ${action.contactName} ko WhatsApp message bheja ja raha hai!`
            : `جی میرے مالک! آپ کی تصدیق پر واٹس ایپ میسج بھیجا جا رہا ہے!`,
      };
    }
  }

  const waRes = openWhatsAppNumberText(cleanPhone, msgText);
  return {
    ok: true,
    requiresManualSendTap: !hasAccessibility,
    href: waRes.href,
    fallbackHref: waRes.webFallbackHref,
    statusReport: hasAccessibility
      ? `Prepared message in WhatsApp${
          cleanPhone ? ` for ${action.contactName} (+${cleanPhone})` : ''
        } — Authorized Accessibility Service armed to tap Send after your confirmation.`
      : `Prepared message in WhatsApp${
          cleanPhone ? ` for ${action.contactName} (+${cleanPhone})` : ''
        }. Enable Zara Accessibility Service in Native APK for hands-free Send, or tap Send in WhatsApp.`,
    spokenReport:
      lang === 'english'
        ? `I prepared your WhatsApp message for ${action.contactName}. Since Android restricts silent background sending without Accessibility Service, please tap Send inside WhatsApp.`
        : lang === 'hindi'
        ? `जी मेरे मालिक! मैंने व्हाट्सएप में ${action.contactName} के लिए मैसेज तैयार कर दिया है — एंड्रॉइड प्राइवेसी नियम के अनुसार बस Send दबा दें!`
        : lang === 'roman_urdu'
        ? `Ji! Maine WhatsApp mein ${action.contactName} ke liye message tayyar kar diya hai — bas Send button daba dein!`
        : `جی میرے مالک! میں نے واٹس ایپ میں ${action.contactName} کے لیے میسج تیار کر دیا ہے — اینڈرائیڈ پرائیویسی رول کے مطابق بس سینڈ دبا دیں!`,
  };
}

// ======================== 4. INCOMING CALL & MESSAGE NOTIFICATION READER + PRIVACY GUARD ========================

export function loadSpokenNotificationConfig(): SpokenNotificationConfig {
  try {
    const raw = localStorage.getItem(SPOKEN_NOTIF_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: Boolean(parsed.enabled),
        announceCalls: parsed.announceCalls ?? true,
        announceMessages: parsed.announceMessages ?? true,
        readMessageContent: Boolean(parsed.readMessageContent),
        maskSensitiveCodes: parsed.maskSensitiveCodes ?? true,
      };
    }
  } catch {}
  // Explicit user consent required: disabled by default, message content private by default!
  return {
    enabled: false,
    announceCalls: true,
    announceMessages: true,
    readMessageContent: false,
    maskSensitiveCodes: true,
  };
}

export function saveSpokenNotificationConfig(cfg: SpokenNotificationConfig): void {
  try {
    localStorage.setItem(SPOKEN_NOTIF_CONFIG_KEY, JSON.stringify(cfg));
  } catch {}
}

export function maskSensitiveNotificationText(rawBody: string): {
  maskedText: string;
  wasMasked: boolean;
} {
  if (!rawBody) return { maskedText: '', wasMasked: false };
  const otpKeywords =
    /\b(otp|verification\s*code|security\s*code|passcode|password|pin|cvv|bank|one-time|debit\s*card|credit\s*card|کوڈ|پاس\s*ورڈ|بینک|ओटीपी|पासवर्ड|बैंक|ਓਟੀਪੀ|ਪਾਸਵਰਡ)\b/i;
  const hasDigitCode = /\b\d{4,8}\b/.test(rawBody);

  if (otpKeywords.test(rawBody) || hasDigitCode) {
    const sanitized = rawBody.replace(/\b\d{4,8}\b/g, '[Private Code Hidden]');
    return {
      maskedText: otpKeywords.test(rawBody)
        ? 'Private verification / security message (content hidden for your safety).'
        : sanitized,
      wasMasked: true,
    };
  }
  return { maskedText: rawBody, wasMasked: false };
}

export function loadIncomingNotifications(): IncomingNotificationItem[] {
  try {
    const raw = localStorage.getItem(INCOMING_NOTIFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [
    {
      id: 'welcome-notif-1',
      type: 'system',
      appName: 'Zara Assistant',
      sender: 'Privacy & Notification Guard',
      body: 'Enable "Announce Notifications Aloud" above and grant Android Notification Access when you want Zara to announce incoming calls & messages.',
      timestamp: getMobileClockSnapshot().shortTime12,
      createdAtMs: Date.now(),
    },
  ];
}

export function saveIncomingNotifications(items: IncomingNotificationItem[]): void {
  try {
    localStorage.setItem(INCOMING_NOTIFS_KEY, JSON.stringify(items.slice(0, 40)));
  } catch {}
}

export function buildSpokenNotificationAnnouncement(
  item: IncomingNotificationItem,
  cfg: SpokenNotificationConfig,
  language: Language = 'auto'
): string {
  const lang = resolveSpokenPromptLanguage(language, `${item.sender} ${item.body}`);

  if (item.type === 'incoming_call') {
    if (lang === 'english') {
      return `Attention! Incoming call from ${item.sender} on ${item.appName}.`;
    }
    if (lang === 'hindi') {
      return `ध्यान दीजिए मेरे मालिक! ${item.sender} की तरफ से ${item.appName} पर इनकमिंग कॉल आ रही है!`;
    }
    if (lang === 'punjabi') {
      return `ਧਿਆਨ ਦਿਓ ਮੇਰੇ ਮਾਲਕ! ${item.sender} ਵੱਲੋਂ ${item.appName} ਤੇ ਇਨਕਮਿੰਗ ਕਾਲ ਆ ਰਹੀ ਹੈ!`;
    }
    if (lang === 'roman_urdu') {
      return `Tawajjo dein! ${item.sender} ki taraf se ${item.appName} par incoming call aa rahi hai!`;
    }
    return `توجہ فرمائیں میرے مالک! ${item.sender} کی طرف سے ${item.appName} پر انکمنگ کال آ رہی ہے!`;
  }

  const groupPrefix = item.conversationTitle ? ` (${item.conversationTitle})` : '';

  if (!cfg.readMessageContent) {
    if (lang === 'english') {
      return `New message from ${item.sender}${groupPrefix} on ${item.appName}. Message text is kept private.`;
    }
    if (lang === 'hindi') {
      return `मेरे मालिक! ${item.appName} पर ${item.sender}${groupPrefix} का नया मैसेज आया है — प्राइवेसी गार्ड ऑन होने की वजह से संदेश गोपनीय रखा गया है।`;
    }
    if (lang === 'punjabi') {
      return `ਮੇਰੇ ਮਾਲਕ! ${item.appName} ਤੇ ${item.sender}${groupPrefix} ਦਾ ਨਵਾਂ ਮੈਸੇਜ ਆਇਆ ਹੈ — ਪ੍ਰਾਈਵੇਸੀ ਗਾਰਡ ਆਨ ਹੋਣ ਕਰਕੇ ਮੈਸੇਜ ਲੁਕਾਇਆ ਗਿਆ ਹੈ।`;
    }
    if (lang === 'roman_urdu') {
      return `${item.appName} par ${item.sender}${groupPrefix} ka naya message aaya hai — privacy guard on hone ki wajah se message chhupaya gaya hai.`;
    }
    return `میرے مالک! ${item.appName} پر ${item.sender}${groupPrefix} کا نیا میسج آیا ہے — پرائیویسی گارڈ آن ہونے کی وجہ سے پیغام کا متن چھپایا گیا ہے۔`;
  }

  const safeBody = cfg.maskSensitiveCodes
    ? maskSensitiveNotificationText(item.body).maskedText
    : item.body;

  if (safeBody.includes('Private verification') || safeBody.includes('[Private Code Hidden]')) {
    if (lang === 'english') {
      return `New private verification or security message from ${item.sender} on ${item.appName}. Sensitive codes were hidden for your safety.`;
    }
    if (lang === 'hindi') {
      return `मेरे मालिक! ${item.appName} पर ${item.sender} की ओर से एक प्राइवेट सिक्योरिटी या ओटीपी मैसेज आया है, जिसे आपकी सुरक्षा के लिए छिपाया गया है।`;
    }
    if (lang === 'roman_urdu') {
      return `${item.appName} par ${item.sender} ki taraf se ek private security ya OTP message aaya hai, jise aapki hifazat ke liye nahi parha gaya.`;
    }
    return `میرے مالک! ${item.appName} پر ${item.sender} کی طرف سے ایک پرائیویٹ سیکیورٹی یا او ٹی پی میسج آیا ہے، جسے آپ کی حفاظت کے لیے باآواز نہیں پڑھا گیا۔`;
  }

  if (lang === 'english') {
    return `Message from ${item.sender}${groupPrefix} on ${item.appName}: "${safeBody.slice(0, 160)}"`;
  }
  if (lang === 'hindi') {
    return `मेरे मालिक! ${item.appName} पर ${item.sender}${groupPrefix} का मैसेज आया है: "${safeBody.slice(0, 160)}"`;
  }
  if (lang === 'punjabi') {
    return `ਮੇਰੇ ਮਾਲਕ! ${item.appName} ਤੇ ${item.sender}${groupPrefix} ਦਾ ਮੈਸੇਜ ਆਇਆ ਹੈ: "${safeBody.slice(0, 160)}"`;
  }
  if (lang === 'roman_urdu') {
    return `${item.appName} par ${item.sender}${groupPrefix} ka message aaya hai: "${safeBody.slice(0, 160)}"`;
  }
  return `میرے مالک! ${item.appName} پر ${item.sender}${groupPrefix} کا میسج آیا ہے: "${safeBody.slice(0, 160)}"`;
}

export function detectRepeatNotificationCommand(rawText: string): boolean {
  if (!rawText) return false;
  const lower = rawText.trim().toLowerCase();
  return (
    /(repeat\s*(?:last\s*|the\s*|my\s*)?notification|read\s*(?:last\s*|my\s*)?notification|last\s*notification|who\s*called|who\s*messaged|kis\s*ka\s*message|kiska\s*message|kis\s*ki\s*call|notification\s*(?:sunao|parho|dobara|repeat)|نوٹیفکیشن\s*(?:سناؤ|پڑھو|دوبارہ)|آخری\s*نوٹیفکیشن|کس\s*کا\s*میسج\s*آیا|کس\s*کی\s*کال\s*آئی|नोटिफिकेशन\s*(?:सुनाओ|पढ़ो|दोबारा)|आख़िरी\s*नोटिफिकेशन|किसका\s*मैसेज\s*आया|ਨੋਟੀਫਿਕੇਸ਼ਨ\s*(?:ਸੁਣਾਓ|ਦੁਬਾਰਾ)|ਆਖਰੀ\s*ਨੋਟੀਫਿਕੇਸ਼ਨ)/i.test(
      lower
    )
  );
}

export async function requestWhatsAppGroupDigest(
  notifications: IncomingNotificationItem[],
  language: Language = 'auto',
  voiceName = 'Zephyr',
  includeAudio = true
): Promise<{
  ok: boolean;
  digestText: string;
  audio: string | null;
  totalCount: number;
  groupCount: number;
}> {
  const res = await fetch('/api/notifications/digest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notifications, language, voiceName, includeAudio }),
  });
  const data = await res.json();
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Could not generate WhatsApp group digest.');
  }
  return {
    ok: true,
    digestText: String(data.digestText || ''),
    audio: data.audio ? String(data.audio) : null,
    totalCount: Number(data.totalCount || 0),
    groupCount: Number(data.groupCount || 0),
  };
}

// ======================== 5. READY-TO-COMPILE NATIVE ANDROID KOTLIN COMPANION BUNDLE ========================

export const NATIVE_ANDROID_COMPANION_GUIDE_TEXT = `================================================================================
ZARA NATIVE ANDROID COMPANION MODULE (KOTLIN — ANDROID 10 TO ANDROID 15)
================================================================================
Why this companion module exists:
- Web / Installed PWA (WebAPK) directly supports:
  * AI chat & neural TTS in Urdu, Hindi, Punjabi, and English
  * Full-screen HD female avatar with blinking, expressions, lip-sync & custom bg
  * Front/Back camera & screen vision with explicit user permission + active badge
  * Copy selected or full chat message / AI reply with clipboard confirmation
  * Opening installed Android apps & dialing/preparing WhatsApp/SMS/Telegram via
    Android intents AFTER mandatory recipient confirmation.
- Android OS sandboxes browsers/PWAs from 3 OS-restricted capabilities unless
  wrapped in this Native Android Companion APK:
  (1) Reading other apps' incoming call / WhatsApp / SMS notifications
      -> requires Android NotificationListenerService + user toggle in Settings.
  (2) Indefinite lock-screen microphone capture when screen is off for hours
      -> requires Android foregroundServiceType="microphone" + Unrestricted Battery.
  (3) Automatic final "Send" tap inside WhatsApp/WhatsApp Business without manual tap
      -> requires user-enabled AccessibilityService AFTER Zara UI confirmation.

--------------------------------------------------------------------------------
1. AndroidManifest.xml (Least-Privilege Permissions & Services)
--------------------------------------------------------------------------------
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.zara.assistant">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <!-- Only invoked AFTER explicit user confirmation in Zara UI -->
    <uses-permission android:name="android.permission.CALL_PHONE" />
    <uses-permission android:name="android.permission.SEND_SMS" />
    <uses-permission android:name="android.permission.READ_CONTACTS" />

    <application
        android:label="Zara AI Assistant"
        android:usesCleartextTraffic="false"
        android:theme="@style/Theme.AppCompat.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:showWhenLocked="true"
            android:turnScreenOn="true"
            android:launchMode="singleTask">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".ZaraVoiceForegroundService"
            android:exported="false"
            android:foregroundServiceType="microphone" />

        <service
            android:name=".ZaraNotificationListenerService"
            android:label="Zara Spoken Notifications"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

        <service
            android:name=".ZaraAccessibilityService"
            android:label="Zara App Control Helper"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/zara_accessibility_config" />
        </service>
    </application>
</manifest>

--------------------------------------------------------------------------------
2. MainActivity.kt (WebView + @JavascriptInterface ZaraAndroidBridge)
--------------------------------------------------------------------------------
package com.zara.assistant

import android.Manifest
import android.annotation.SuppressLint
import android.content.*
import android.content.pm.PackageManager
import android.net.Uri
import android.os.*
import android.provider.Settings
import android.telephony.SmsManager
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private val WEB_APP_URL = "https://YOUR-DEPLOYED-ZARA-URL.run.app"

    private val notifReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != "com.zara.NOTIFICATION_EVENT") return
            val payload = JSONObject().apply {
                put("type", intent.getStringExtra("type") ?: "message")
                put("appName", intent.getStringExtra("appName") ?: "Android")
                put("sender", intent.getStringExtra("sender") ?: "")
                put("body", intent.getStringExtra("body") ?: "")
            }
            webView.post {
                webView.evaluateJavascript(
                    "window.onZaraIncomingNotification && window.onZaraIncomingNotification(" + payload.toString() + ");",
                    null
                )
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread { request.grant(request.resources) }
            }
        }
        webView.addJavascriptInterface(ZaraBridge(), "ZaraAndroidBridge")
        webView.loadUrl(WEB_APP_URL)

        ContextCompat.registerReceiver(
            this, notifReceiver, IntentFilter("com.zara.NOTIFICATION_EVENT"),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
    }

    inner class ZaraBridge {
        @JavascriptInterface
        fun setForegroundVoiceListening(enabled: Boolean): Boolean {
            val svc = Intent(this@MainActivity, ZaraVoiceForegroundService::class.java)
            if (enabled) ContextCompat.startForegroundService(this@MainActivity, svc)
            else stopService(svc)
            return true
        }

        @JavascriptInterface
        fun placeConfirmedPhoneCall(phone: String): Boolean {
            if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CALL_PHONE)
                != PackageManager.PERMISSION_GRANTED) return false
            val callIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:" + phone)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(callIntent)
            return true
        }

        @JavascriptInterface
        fun sendConfirmedSms(phone: String, body: String): Boolean {
            if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.SEND_SMS)
                != PackageManager.PERMISSION_GRANTED) return false
            val sms = getSystemService(SmsManager::class.java)
            sms.sendTextMessage(phone, null, body, null, null)
            return true
        }

        @JavascriptInterface
        fun launchPackage(pkg: String): Boolean {
            val launch = packageManager.getLaunchIntentForPackage(pkg) ?: return false
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(launch)
            return true
        }

        @JavascriptInterface
        fun openNotificationAccessSettings() {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        @JavascriptInterface
        fun openAccessibilitySettings() {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }
    }

    override fun onDestroy() {
        unregisterReceiver(notifReceiver)
        super.onDestroy()
    }
}

--------------------------------------------------------------------------------
3. ZaraVoiceForegroundService.kt (Lock-Screen Persistent Notification & WakeLock)
--------------------------------------------------------------------------------
package com.zara.assistant

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.*
import androidx.core.app.NotificationCompat

class ZaraVoiceForegroundService : Service() {
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        val channelId = "zara_voice_fg"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Zara Background Voice Service",
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }

        val openIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Zara Voice Assistant Active")
            .setContentText("Listening on lock screen when permitted. Tap to open or disable.")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setContentIntent(openIntent)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1001, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
            startForeground(1001, notification)
        }

        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Zara::VoiceLock").apply {
            acquire(6 * 60 * 60 * 1000L)
        }
    }

    override fun onDestroy() {
        wakeLock?.let { if (it.isHeld) it.release() }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}

--------------------------------------------------------------------------------
4. ZaraNotificationListenerService.kt (Forwards Call & Message Alerts to WebView)
--------------------------------------------------------------------------------
package com.zara.assistant

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class ZaraNotificationListenerService : NotificationListenerService() {
    private val allowedPackages = setOf(
        "com.whatsapp", "com.whatsapp.w4b", "com.google.android.apps.messaging",
        "com.samsung.android.messaging", "org.telegram.messenger",
        "com.facebook.orca", "com.google.android.dialer", "com.samsung.android.incallui"
    )

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val pkg = sbn.packageName ?: return
        if (!allowedPackages.contains(pkg)) return
        val extras = sbn.notification.extras ?: return
        val sender = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: return
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val isCall = sbn.notification.category == Notification.CATEGORY_CALL

        val broadcast = Intent("com.zara.NOTIFICATION_EVENT").apply {
            setPackage(packageName)
            putExtra("type", if (isCall) "incoming_call" else "message")
            putExtra("appName", pkg)
            putExtra("sender", sender)
            putExtra("body", text)
        }
        sendBroadcast(broadcast)
    }
}

--------------------------------------------------------------------------------
5. ZaraAccessibilityService.kt (User-Authorized Send Button Helper)
--------------------------------------------------------------------------------
package com.zara.assistant

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class ZaraAccessibilityService : AccessibilityService() {
    companion object {
        @Volatile var pendingConfirmedSendForPkg: String? = null
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val targetPkg = pendingConfirmedSendForPkg ?: return
        if (event?.packageName?.toString() != targetPkg) return
        val root = rootInActiveWindow ?: return
        val sendNodes = root.findAccessibilityNodeInfosByViewId(targetPkg + ":id/send")
        if (!sendNodes.isNullOrEmpty()) {
            pendingConfirmedSendForPkg = null
            sendNodes[0].performAction(AccessibilityNodeInfo.ACTION_CLICK)
        }
    }

    override fun onInterrupt() {}
}
`;
