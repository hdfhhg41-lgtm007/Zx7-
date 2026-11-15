import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlarmClock,
  PowerOff,
  Code2,
  PhoneCall,
  Check,
  UserCheck,
} from 'lucide-react';

import type { AssistantControlHubTab } from './components/NotificationsModal';
import type { MobileControlTab } from './components/MobileControlModal';
import {
  SecurityOverlayMode,
  SecurityShieldOverlay,
} from './components/SecurityShieldOverlay';
import { usePWAInstall } from './hooks/usePWAInstall';

const MemoriesModal = lazy(() =>
  import('./components/MemoriesModal').then((m) => ({ default: m.MemoriesModal }))
);
const SoulModal = lazy(() =>
  import('./components/SoulModal').then((m) => ({ default: m.SoulModal }))
);
const DataModal = lazy(() =>
  import('./components/DataModal').then((m) => ({ default: m.DataModal }))
);
const StatsModal = lazy(() =>
  import('./components/StatsModal').then((m) => ({ default: m.StatsModal }))
);
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const NotificationsModal = lazy(() =>
  import('./components/NotificationsModal').then((m) => ({ default: m.NotificationsModal }))
);
const ChatDrawer = lazy(() =>
  import('./components/ChatDrawer').then((m) => ({ default: m.ChatDrawer }))
);
const PWAInstallModal = lazy(() =>
  import('./components/PWAInstallModal').then((m) => ({ default: m.PWAInstallModal }))
);
const MobileControlModal = lazy(() =>
  import('./components/MobileControlModal').then((m) => ({ default: m.MobileControlModal }))
);
const BuiltAppPreviewModal = lazy(() =>
  import('./components/BuiltAppPreviewModal').then((m) => ({ default: m.BuiltAppPreviewModal }))
);
const ZaraProjectExportModal = lazy(() =>
  import('./components/ZaraProjectExportModal').then((m) => ({
    default: m.ZaraProjectExportModal,
  }))
);
const MoodGestureWorkModal = lazy(() =>
  import('./components/MoodGestureWorkModal').then((m) => ({ default: m.MoodGestureWorkModal }))
);
const AdvancedAiStudioModal = lazy(() =>
  import('./components/AdvancedAiStudioModal').then((m) => ({
    default: m.AdvancedAiStudioModal,
  }))
);
const VoiceCallModal = lazy(() =>
  import('./components/VoiceCallModal').then((m) => ({ default: m.VoiceCallModal }))
);
const DriverModeModal = lazy(() =>
  import('./components/DriverModeModal').then((m) => ({ default: m.DriverModeModal }))
);
const FileManagerModal = lazy(() =>
  import('./components/FileManagerModal').then((m) => ({ default: m.FileManagerModal }))
);
import type { AiStudioTab } from './components/AdvancedAiStudioModal';
import { ZaraSciFi3DHudDashboard } from './components/hud3d/ZaraSciFi3DHudDashboard';
import {
  PcAllowedAction,
  detectPcVoiceCommand,
  executeAuthorizedPcCommand,
} from './services/computerControlService';

import { audioService } from './services/audioService';
import { DirectMicSession } from './services/voiceCaptureService';
import {
  AlwaysOnVoiceListener,
  floatingCirclePiP,
  screenKeepAlive,
} from './services/alwaysOnFloatService';
import {
  MobileAppDefinition,
  closeMobileAppNow,
  detectCameraFrontBackCommand,
  detectMobileCommandFromText,
  launchMobileAppNow,
  queryMobilePermissions,
  requestAllPermissionsMaster,
  zaraVision,
} from './services/visionAndControlService';
import {
  detectSelfHealOrMacroCommand,
  splitCompoundMacroSteps,
  zaraSelfHealEngine,
} from './services/selfHealAndMacroService';
import {
  GESTURE_ACTION_META,
  MOOD_DISPLAY_META,
  MoodAndGestureScanResult,
  analyzeCameraMoodAndGesture,
  detectMoodFromText,
  detectMoodGestureOrWorkCommand,
  loadWorkTasks,
  runAdvancedWorkStudio,
  saveWorkTasks,
} from './services/moodAndGestureService';
import {
  autoExtractMemoryFromTurn,
  buildMemoryAndScheduleDigest,
  detectExplicitRememberCommand,
  detectScheduleCommandFromText,
  format24To12Hour,
  formatZaraProfileShareText,
  getMobileClockSnapshot,
  loadDeviceMemories,
  loadLongTermMemories,
  loadLongTermMessages,
  loadSavedSchedules,
  saveDeviceMemories,
  saveLongTermMemories,
  saveLongTermMessages,
  saveSchedules,
} from './services/scheduleAndMemoryService';
import {
  buildProactiveCompanionMessage,
  detectMoodShiftFromInput,
} from './services/emotionMoodEngine';
import {
  fetchWithContainerWakeup,
  mergeChatMessageHistories,
  mergeMemoryLists,
  reconcileDurableChatVault,
} from './services/chatVaultPersistence';
import {
  OwnerAuthSnapshot,
  getOwnerAuthHeaders,
  getOwnerAuthSnapshot,
  subscribeOwnerAuth,
} from './services/ownerAuthService';
import {
  buildNewAppWithZara,
  captureSafeLocationCoords,
  detectAppBuilderCommand,
  detectDiagnosticsCommand,
  detectSpecialControlCommand,
  endExternalCallNow,
  loadBuiltApps,
  openWhatsAppNumberText,
  recordIntruderAlert,
  runFullZaraAndMobileDiagnostics,
  saveBuiltApps,
  startWhatsAppOrPhoneCall,
  syncBuiltAppsToServer,
} from './services/ownerSecurityAndBuilderService';
import {
  buildConfirmationPromptSpeech,
  buildSpokenNotificationAnnouncement,
  detectCallOrMessageWithConfirmation,
  detectRepeatNotificationCommand,
  detectVoiceConfirmationDecision,
  executeConfirmedCallOrMessage,
  loadIncomingNotifications,
  loadSpokenNotificationConfig,
  performAndroidAccessibilityAction,
  saveIncomingNotifications,
  saveSpokenNotificationConfig,
  setNativeLowPowerWakeWord,
  syncForegroundVoiceNotification,
} from './services/androidAssistantBridgeService';
import {
  detectFlashlightCommand,
  detectZaraInternalUiCommand,
  isAppOnline,
  runOfflineZaraBrain,
  subscribeNetworkStatus,
  toggleMobileFlashlight,
} from './services/offlineBrainService';
import {
  detectAssistantOrLanguageCommand,
  getAssistantProfile,
} from './services/assistantRouterService';
import {
  activateProTier,
  fetchProTierStatus,
  getTierRequestHeaders,
} from './services/proTierService';
import {
  AdvancedWorkTaskItem,
  AiAssistantId,
  AlarmScheduleItem,
  BuiltAppItem,
  CameraFacing,
  DetectedHandGesture,
  DetectedUserMood,
  IncomingNotificationItem,
  Language,
  ChatMessage,
  MemoryItem,
  MessagingAppTarget,
  PendingCallOrMessageAction,
  PersonalityConfig,
  SecurityAndControlConfig,
  SettingsTabId,
  SpokenNotificationConfig,
  VisionMode,
  ZaraEmotionMode,
} from './types';

const CONFIG_STORAGE_KEY = 'zara_personality_config_v5';
const SECURITY_STORAGE_KEY = 'zara_security_control_v1';
const ALWAYS_ON_VOICE_KEY = 'zara_always_on_voice_v1';

export default function App() {
  // Modals & Screen Circle state (All former bottom buttons now live inside Settings -> 'controls'!)
  const [showMemories, setShowMemories] = useState(false);
  const [showSoul, setShowSoul] = useState(false);
  const [showData, setShowData] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabId>('controls');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifModalTab, setNotifModalTab] = useState<AssistantControlHubTab>('alerts');
  const [pendingConfirmAction, setPendingConfirmAction] =
    useState<PendingCallOrMessageAction | null>(null);
  const [spokenNotifConfig, setSpokenNotifConfig] = useState<SpokenNotificationConfig>(() =>
    loadSpokenNotificationConfig()
  );
  const [incomingNotifs, setIncomingNotifs] = useState<IncomingNotificationItem[]>(() =>
    loadIncomingNotifications()
  );
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [autoStartPlayDownload, setAutoStartPlayDownload] = useState(false);
  const [showMobileControl, setShowMobileControl] = useState(false);
  const [mobileControlTab, setMobileControlTab] = useState<MobileControlTab>('settings');
  const [highlightedSettingId, setHighlightedSettingId] = useState<string | null>(null);
  const [showAiStudio, setShowAiStudio] = useState(false);
  const [aiStudioTab, setAiStudioTab] = useState<AiStudioTab>('office');
  const [showAudioCall, setShowAudioCall] = useState(false);
  const [showDriverMode, setShowDriverMode] = useState(false);
  const [showFileManager, setShowFileManager] = useState(false);
  const [pendingPcConfirm, setPendingPcConfirm] = useState<{
    action: PcAllowedAction;
    params: Record<string, any>;
    label: string;
  } | null>(null);
  const [showProjectExport, setShowProjectExport] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('export_files') === '1' || params.get('all_files') === '1';
    } catch {
      return false;
    }
  });

  // 24/7 Instant Voice Command Listener (starts cleanly via user's ON tap or granted permission restore)
  const [alwaysOnVoiceEnabled, setAlwaysOnVoiceEnabled] = useState<boolean>(false);
  const [isAlwaysOnRunning, setIsAlwaysOnRunning] = useState(false);
  const [isFloatingPiP, setIsFloatingPiP] = useState(false);
  const [interimVoiceText, setInterimVoiceText] = useState('');

  const { isInstalled, isInIframe, playStoreLaunchUrl } = usePWAInstall();
  // Default full-screen viewport immediately on launch ("سامنے پوری اسکرین پہ دکھنا چاہیے زارا ایپ اوپن کرتے ہی")
  const [isMobileFrame, setIsMobileFrame] = useState(false);

  // Auto-open Google Play Direct Installer or Professional AI Studio / Chat via shortcut query params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const studioParam = params.get('studio') as AiStudioTab | null;
    const actionParam = params.get('action');
    let handled = false;
    if ((params.get('play_install') === '1' || params.get('install') === '1') && !isInstalled) {
      setAutoStartPlayDownload(true);
      setShowInstallModal(true);
      handled = true;
    } else if (
      studioParam &&
      [
        'brains',
        'research',
        'social',
        'devlab',
        'audit',
        'office',
        'pctools',
        'security',
        'messages',
        'photo',
        'video',
      ].includes(studioParam)
    ) {
      setAiStudioTab(studioParam);
      setShowAiStudio(true);
      handled = true;
    } else if (actionParam === 'chat') {
      setShowChatDrawer(true);
      handled = true;
    }
    if (handled) {
      const nextUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', nextUrl || '/');
    }
  }, [isInstalled]);

  // Core User, Online/Offline Hybrid Brain, Studio Task & Zara Configuration
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('zara_saved_language') as Language | null;
        if (
          saved &&
          ['auto', 'uzbek', 'malay', 'arabic', 'urdu', 'hindi', 'punjabi', 'english'].includes(saved)
        ) {
          return saved;
        }
      } catch {}
    }
    return 'auto';
  });

  const handleSelectLanguage = (newLang: Language) => {
    setLanguage(newLang);
    try {
      localStorage.setItem('zara_saved_language', newLang);
    } catch {}
    const labels: Record<Language, string> = {
      auto: 'Auto-Match Universal (خودکار)',
      uzbek: "O'zbekcha (Uzbek)",
      malay: 'Bahasa Melayu',
      arabic: 'العربية (Arabic)',
      urdu: 'Urdu (اردو)',
      hindi: 'Hindi (हिंदी)',
      punjabi: 'Punjabi (ਪੰਜਾਬੀ)',
      english: 'English',
    };
    setHomeStatusBanner(`Language active: ${labels[newLang]}`);
    window.setTimeout(() => setHomeStatusBanner(null), 3200);
  };

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHomeMicActive, setIsHomeMicActive] = useState(false);
  const [isThinkingHome, setIsThinkingHome] = useState(false);
  const [homeMicVol, setHomeMicVol] = useState(0);
  const [homeStatusBanner, setHomeStatusBanner] = useState<string | null>(null);
  const [visionMode, setVisionMode] = useState<VisionMode>('off');
  const [isManualCameraPreview, setIsManualCameraPreview] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>(() =>
    zaraVision.getFacingMode()
  );
  const [isSelfHealing, setIsSelfHealing] = useState(false);
  const [needsPermissionSetup, setNeedsPermissionSetup] = useState(false);

  const markStudioTaskProgress = (_rawCommand: string, _status: 'working' | 'completed') => {};

  // App Open / Close / WhatsApp Status Toast on Screen
  const [appControlToast, setAppControlToast] = useState<{
    mode: 'open' | 'close';
    app: MobileAppDefinition | null;
    href: string;
    fallbackHref?: string;
    label: string;
  } | null>(null);

  // Built Apps, Builder Busy State & Live App Preview Modal
  const [builtApps, setBuiltApps] = useState<BuiltAppItem[]>(() => loadBuiltApps());
  const [isBuildingApp, setIsBuildingApp] = useState(false);
  const [activePreviewApp, setActivePreviewApp] = useState<BuiltAppItem | null>(null);

  // Alarms, Work Time Schedules & Ringing Alert State
  const [schedules, setSchedules] = useState<AlarmScheduleItem[]>(() => loadSavedSchedules());
  const [ringingSchedule, setRingingSchedule] = useState<AlarmScheduleItem | null>(null);

  // Real-Time Mood & Touchless Gesture Recognition + Advanced Work Studio State
  const [showMoodWorkModal, setShowMoodWorkModal] = useState(false);
  const [moodWorkInitialTab, setMoodWorkInitialTab] = useState<'mood_gesture' | 'work'>(
    'mood_gesture'
  );
  const [currentMood, setCurrentMood] = useState<DetectedUserMood>('calm');
  const [lastGesture, setLastGesture] = useState<DetectedHandGesture>('none');
  const [autoGestureWatch, setAutoGestureWatch] = useState(false);
  const [workTasks, setWorkTasks] = useState<AdvancedWorkTaskItem[]>(() => loadWorkTasks());

  const homeMicRef = useRef<DirectMicSession | null>(null);
  const alwaysOnRef = useRef<AlwaysOnVoiceListener | null>(null);
  const voiceToggleBusyRef = useRef(false);
  const homeScreenInputRef = useRef<HTMLInputElement | null>(null);

  const [config, setConfig] = useState<PersonalityConfig>(() => {
    try {
      const saved =
        localStorage.getItem(CONFIG_STORAGE_KEY) ||
        localStorage.getItem('zara_personality_config_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          portraitId: parsed.portraitId || 'ai_broadcast_studio',
          ambientVisionEnabled: parsed.ambientVisionEnabled ?? true,
          unfilteredBoldTalk: parsed.unfilteredBoldTalk ?? true,
          romanceIntensity: parsed.romanceIntensity || 'passionate',
          emotionMode: parsed.emotionMode || 'apnapan',
          uiTheme: parsed.uiTheme || 'cyber_cyan',
          showHudQuickBar: parsed.showHudQuickBar ?? true,
          heartLockEnabled: parsed.heartLockEnabled ?? false,
          heartLockUnlocked: parsed.heartLockEnabled ? false : true,
          voiceGender: parsed.voiceGender || 'female',
          ownerOnlyRomance: parsed.ownerOnlyRomance ?? true,
          isOwnerSessionUnlocked: parsed.isOwnerSessionUnlocked ?? true,
          brainMode: parsed.brainMode || 'auto',
          sttEngine: parsed.sttEngine || 'hunter_stt_beta',
          ttsEngine: parsed.ttsEngine || 'hunter_tts_ultra_premium',
          enabledAiEngines: parsed.enabledAiEngines,
          activeAssistantId: parsed.activeAssistantId || 'zara',
          preferredReplyLanguage: parsed.preferredReplyLanguage || undefined,
          proactiveSelfTalkEnabled: parsed.proactiveSelfTalkEnabled ?? true,
          autoSelfCheckEnabled: parsed.autoSelfCheckEnabled ?? true,
        };
      }
    } catch {}
    return {
      loveMode: true,
      affectionLevel: 100,
      obedienceLevel: 100,
      romanceIntensity: 'passionate',
      emotionMode: 'apnapan',
      uiTheme: 'cyber_cyan',
      showHudQuickBar: true,
      heartLockEnabled: false,
      heartLockUnlocked: true,
      unfilteredBoldTalk: true,
      ownerOnlyRomance: true,
      isOwnerSessionUnlocked: true,
      voicePitch: 1.05,
      voiceSpeed: 0.98,
      voiceGender: 'female',
      voiceName: 'Zephyr',
      avatarOutfit: 'cyber_rose',
      portraitId: 'ai_broadcast_studio',
      ambientVisionEnabled: true,
      userNickname: 'Jaan',
      wakeWordEnabled: true,
      autoSpeak: true,
      proactiveSelfTalkEnabled: true,
      autoSelfCheckEnabled: true,
      brainMode: 'auto',
      sttEngine: 'hunter_stt_beta',
      ttsEngine: 'hunter_tts_ultra_premium',
      activeAssistantId: 'zara',
    };
  });

  const [securityConfig, setSecurityConfig] = useState<SecurityAndControlConfig>(() => {
    try {
      const saved = localStorage.getItem(SECURITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          ownerName: parsed.ownerName || 'Malaysia wala badshah',
          autoLockOnIntruder: parsed.autoLockOnIntruder ?? true,
          customWakeWord: parsed.customWakeWord || 'hey zara',
          lowPowerWakeWordEnabled: parsed.lowPowerWakeWordEnabled ?? true,
        };
      }
    } catch {}
      return {
        pinEnabled: false,
        pinCode: '1234',
        autoAppLaunch: true,
        voiceControlEnabled: true,
        privacyGuard: true,
        allPermissionsGranted: false,
        faceLockEnabled: false,
        biometricLockEnabled: false,
        antiTheftGpsEnabled: true,
        customWakeWord: 'hey zara',
        lowPowerWakeWordEnabled: true,
        autoLockOnIntruder: true,
        ownerName: 'Malaysia wala badshah',
      };
  });

  // Never block launch with automatic Face Scan or PIN Lock (available manually inside Settings)
  const [securityOverlayMode, setSecurityOverlayMode] = useState<SecurityOverlayMode | null>(null);
  const [intruderReason, setIntruderReason] = useState<string>('');
  const [antiTouchArmedLive, setAntiTouchArmedLive] = useState(false);

  const [isPinLocked, setIsPinLocked] = useState<boolean>(false);
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState(false);

  // Cryptographic Owner Verification & Guest-Safe Lock State (Zero-Bypass)
  const [ownerAuth, setOwnerAuth] = useState<OwnerAuthSnapshot>(() => getOwnerAuthSnapshot());
  const ownerAuthRef = useRef<OwnerAuthSnapshot>(ownerAuth);
  useEffect(() => {
    ownerAuthRef.current = ownerAuth;
  }, [ownerAuth]);

  useEffect(() => {
    return subscribeOwnerAuth((snap) => {
      ownerAuthRef.current = snap;
      setOwnerAuth(snap);
      if (!snap.isOwnerVerified) {
        setConfig((prev) =>
          prev.heartLockUnlocked ? { ...prev, heartLockUnlocked: false } : prev
        );
      }
    });
  }, []);

  const createDefaultOwnerWelcome = (): ChatMessage => ({
    id: 'init-1',
    sender: 'zara',
    text: 'Assalam o Alaikum. Zara ready hai — voice ya message se baat shuru karein.',
    timestamp: getMobileClockSnapshot().shortTime12,
    createdAtMs: Date.now(),
    language: 'urdu',
  });

  const createDefaultGuestWelcome = (): ChatMessage => ({
    id: 'guest-init-1',
    sender: 'zara',
    text: 'Assalam o Alaikum! Main Zara hoon, aapki AI voice assistant. Batayein aaj main aapki kya madad karoon?',
    timestamp: getMobileClockSnapshot().shortTime12,
    createdAtMs: Date.now(),
    language: 'urdu',
  });

  // 100+ Days Long-Term Persistent Memories & Messages (Firebase Cloud Vault for Owner + Local Device Vault)
  const [ownerMemories, setOwnerMemories] = useState<MemoryItem[]>(() =>
    getOwnerAuthSnapshot().isOwnerVerified ? loadLongTermMemories() : []
  );
  const [deviceMemories, setDeviceMemories] = useState<MemoryItem[]>(() => loadDeviceMemories());
  const [ownerMessages, setOwnerMessages] = useState<ChatMessage[]>(() => {
    if (!getOwnerAuthSnapshot().isOwnerVerified) {
      return [];
    }
    const saved = loadLongTermMessages();
    if (saved && saved.length > 0) return saved;
    return [createDefaultOwnerWelcome()];
  });

  // Persistent normal chat session for Guests (kept strictly isolated from Owner Vault)
  const [guestMessages, setGuestMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem('zara_guest_chat_session_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(-60);
        }
      }
    } catch {}
    return [createDefaultGuestWelcome()];
  });

  useEffect(() => {
    if (ownerAuth.isOwnerVerified) return;
    try {
      localStorage.setItem('zara_guest_chat_session_v1', JSON.stringify(guestMessages.slice(-60)));
    } catch {}
  }, [guestMessages, ownerAuth.isOwnerVerified]);

  const appendActiveMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    if (ownerAuthRef.current.isOwnerVerified) {
      setOwnerMessages(updater);
    } else {
      setGuestMessages(updater);
    }
  };

  const messages = ownerAuth.isOwnerVerified ? ownerMessages : guestMessages;
  const memories = ownerAuth.isOwnerVerified ? ownerMemories : deviceMemories;

  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {}
    audioService.setPreferredTtsEngine(config.ttsEngine || 'hunter_tts_ultra_premium');
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(securityConfig));
    } catch {}
    setNativeLowPowerWakeWord(
      securityConfig.lowPowerWakeWordEnabled ?? true,
      securityConfig.customWakeWord || 'hey zara'
    );
  }, [securityConfig]);

  useEffect(() => {
    const onNativeWake = (e: Event) => {
      const detail = (e as CustomEvent<{ phrase?: string; heard?: string }>).detail || {};
      audioService.unlock();
      audioService.playChime('activate');
      setSecurityOverlayMode((cur) => (cur === 'zara_closed' ? null : cur));
      screenKeepAlive.enable();
      setHomeStatusBanner(
        `🎤 Wake-Word "${detail.phrase || securityConfig.customWakeWord || 'hey zara'}" Active — Zara Listening!`
      );
      if (alwaysOnVoiceEnabled && alwaysOnRef.current && !alwaysOnRef.current.isRunning()) {
        alwaysOnRef.current.start();
      }
    };
    window.addEventListener('zara-native-wake-word', onNativeWake);
    return () => window.removeEventListener('zara-native-wake-word', onNativeWake);
  }, [alwaysOnVoiceEnabled, securityConfig.customWakeWord]);

  // Sync Web Wake-Word Gate Mode + Custom Phrase into AlwaysOnVoiceListener
  useEffect(() => {
    alwaysOnRef.current?.setWakeWordConfig(
      Boolean(securityConfig.wakeWordOnlyMode),
      securityConfig.customWakeWord || 'hey zara'
    );
  }, [securityConfig.wakeWordOnlyMode, securityConfig.customWakeWord]);

  // Sync Pro Tier status on mount & listen for Native Play Billing verification callbacks
  useEffect(() => {
    fetchProTierStatus().catch(() => {});
    const onPlayBilling = async (e: Event) => {
      const detail = (e as CustomEvent<{ state?: string; sku?: string; purchaseToken?: string }>).detail;
      if (detail?.state === 'purchased' && detail.purchaseToken) {
        const res = await activateProTier({
          mode: 'play_billing',
          sku: detail.sku || 'zara_pro_monthly',
          purchaseToken: detail.purchaseToken,
        });
        setHomeStatusBanner(res.message);
      }
    };
    window.addEventListener('zara-play-billing-update', onPlayBilling);
    return () => window.removeEventListener('zara-play-billing-update', onPlayBilling);
  }, [ownerAuth.isOwnerVerified]);

  const lastUserActivityAtRef = useRef<number>(Date.now());
  const hasUserInteractedRef = useRef<boolean>(false);
  const proactiveTurnCountRef = useRef<number>(0);
  const lastProactiveSpokenAtRef = useRef<number>(0);

  // Track user gestures so proactive voice only speaks once browser audio autoplay is unlocked
  useEffect(() => {
    const markGesture = () => {
      hasUserInteractedRef.current = true;
      lastUserActivityAtRef.current = Date.now();
    };
    window.addEventListener('pointerdown', markGesture, { passive: true });
    window.addEventListener('keydown', markGesture, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', markGesture);
      window.removeEventListener('keydown', markGesture);
    };
  }, []);

  // Autonomous Boot App Self-Check & Auto-Update Announcement
  useEffect(() => {
    if (config.autoSelfCheckEnabled === false) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled || !isAppOnline()) return;
      try {
        const report = await zaraSelfHealEngine.fetchUpdateCheckReport();
        if (!report || cancelled) return;
        const announcedVer = localStorage.getItem('zara_announced_version_v1');
        if (announcedVer !== report.currentVersion || report.pendingRuntimeCount > 0) {
          const updateRes = await zaraSelfHealEngine.runFullAutonomousSelfUpdate();
          if (cancelled) return;
          try {
            localStorage.setItem('zara_announced_version_v1', report.currentVersion);
          } catch {}
          const summaryMsg = updateRes.spokenSummaryHi || report.spokenReportHi;
          const nowSnap = getMobileClockSnapshot();
          appendActiveMessages((prev) => {
            if (prev.some((m) => m.text === summaryMsg)) return prev;
            return [
              ...prev,
              {
                id: `autoupdate-${Date.now()}`,
                sender: 'zara',
                text: summaryMsg,
                timestamp: nowSnap.shortTime12,
                createdAtMs: Date.now(),
                language,
              },
            ];
          });
          setHomeStatusBanner(`Zara v${report.currentVersion} Checked & Updated (${report.healthScore}%) ✓`);
          if (config.autoSpeak && hasUserInteractedRef.current && !audioService.getIsSpeaking()) {
            audioService.selfHealAudioPipeline();
            await audioService.speakText(summaryMsg, {
              language,
              rate: config.voiceSpeed,
              voiceName: config.voiceName || 'Zephyr',
            });
          }
        }
      } catch {}
    }, 7500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [config.autoSelfCheckEnabled]);

  // Proactive Companion Self-Talking & Emotional Check-In Loop ("खुद-ब-खुद बात करे, गुस्सा/इमोशनल व यादें साझा करे")
  useEffect(() => {
    if (config.proactiveSelfTalkEnabled === false) return;
    const interval = window.setInterval(async () => {
      const now = Date.now();
      if (
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible'
      ) {
        return;
      }
      if (
        isThinkingHome ||
        showAudioCall ||
        showSettings ||
        audioService.getIsSpeaking() ||
        now - lastUserActivityAtRef.current < 85_000 ||
        now - lastProactiveSpokenAtRef.current < 110_000
      ) {
        return;
      }

      const verified = ownerAuthRef.current.isOwnerVerified;
      const heartLocked = Boolean(config.heartLockEnabled && !config.heartLockUnlocked);
      const allowLove = Boolean(config.loveMode && !heartLocked);
      const nextIdx = proactiveTurnCountRef.current;
      proactiveTurnCountRef.current += 1;

      const proactive = buildProactiveCompanionMessage({
        isOwnerVerified: verified,
        loveMode: allowLove,
        emotionMode: config.emotionMode || 'apnapan',
        nickname: config.userNickname || 'Jaan',
        memories: !heartLocked ? (verified ? ownerMemories : deviceMemories) : [],
        turnIndex: nextIdx,
      });

      lastProactiveSpokenAtRef.current = now;
      if (allowLove && proactive.suggestedEmotion && proactive.suggestedEmotion !== config.emotionMode) {
        setConfig((prev) => ({ ...prev, emotionMode: proactive.suggestedEmotion }));
      }

      const clock = getMobileClockSnapshot();
      appendActiveMessages((prev) => [
        ...prev,
        {
          id: `proactive-${now}`,
          sender: 'zara',
          text: proactive.text,
          timestamp: clock.shortTime12,
          createdAtMs: now,
          language,
          assistantId: 'zara',
          assistantLabel: 'Main Zara AI',
        },
      ]);
      setHomeStatusBanner(proactive.text.slice(0, 72));

      if (config.autoSpeak && hasUserInteractedRef.current) {
        audioService.selfHealAudioPipeline();
        await audioService.speakText(proactive.text, {
          language,
          pitch: config.voicePitch,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
          loveMode: allowLove,
          romanceIntensity: allowLove ? config.romanceIntensity : 'calm',
          emotionMode: allowLove ? proactive.suggestedEmotion || config.emotionMode || 'apnapan' : 'calm',
        });
      }
    }, 35_000);

    return () => window.clearInterval(interval);
  }, [
    config.proactiveSelfTalkEnabled,
    config.emotionMode,
    config.loveMode,
    config.heartLockEnabled,
    config.heartLockUnlocked,
    config.autoSpeak,
    config.voiceName,
    config.voicePitch,
    config.voiceSpeed,
    config.userNickname,
    config.romanceIntensity,
    isThinkingHome,
    showAudioCall,
    showSettings,
    ownerMemories,
    language,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(ALWAYS_ON_VOICE_KEY, alwaysOnVoiceEnabled ? '1' : '0');
    } catch {}
  }, [alwaysOnVoiceEnabled]);

  useEffect(() => {
    saveSchedules(schedules);
  }, [schedules]);

  useEffect(() => {
    saveWorkTasks(workTasks);
  }, [workTasks]);

  useEffect(() => {
    if (!ownerAuth.isOwnerVerified) return;
    saveLongTermMemories(ownerMemories);
  }, [ownerMemories, ownerAuth.isOwnerVerified]);

  useEffect(() => {
    saveDeviceMemories(deviceMemories);
  }, [deviceMemories]);

  useEffect(() => {
    if (!ownerAuth.isOwnerVerified || ownerMessages.length === 0) return;
    saveLongTermMessages(ownerMessages);
  }, [ownerMessages, ownerAuth.isOwnerVerified]);

  // Load & Reconcile 3-Layer Permanent Owner Vault ONLY when cryptographic Owner Verification is active!
  useEffect(() => {
    if (!ownerAuth.isOwnerVerified || !ownerAuth.signedInUid) {
      return;
    }

    let cancelled = false;
    const localSavedMsgs = loadLongTermMessages();
    const localSavedMems = loadLongTermMemories();
    const seedMsgs =
      localSavedMsgs && localSavedMsgs.length > 0
        ? localSavedMsgs
        : ownerMessages.length > 0
        ? ownerMessages
        : [createDefaultOwnerWelcome()];
    const seedMems = localSavedMems && localSavedMems.length > 0 ? localSavedMems : ownerMemories;

    setOwnerMessages(seedMsgs);
    setOwnerMemories(seedMems);

    reconcileDurableChatVault(seedMsgs, seedMems)
      .then(({ mergedMessages, mergedMemories, restoredCount }) => {
        if (cancelled || !ownerAuthRef.current.isOwnerVerified) return;
        if (mergedMessages.length > 0) {
          setOwnerMessages((prev) => {
            const base = prev.length > 0 ? prev : seedMsgs;
            const combined = mergeChatMessageHistories(base, mergedMessages);
            const hasRealHistory = combined.some((m) => m.id !== 'init-1');
            const filtered =
              hasRealHistory && base.length === 1 && base[0]?.id === 'init-1'
                ? combined.filter((m) => m.id !== 'init-1')
                : combined;
            return filtered.length !== prev.length ? filtered : prev;
          });
        }
        if (mergedMemories.length > 0) {
          setOwnerMemories((prev) => {
            const combined = mergeMemoryLists(prev, mergedMemories);
            return combined.length !== prev.length ? combined : prev;
          });
        }
        if (restoredCount > 0) {
          setHomeStatusBanner(`✓ Restored ${restoredCount} private Owner messages from Zara Vault`);
          setTimeout(() => setHomeStatusBanner(null), 3200);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [ownerAuth.isOwnerVerified, ownerAuth.signedInUid]);

  useEffect(() => {
    saveBuiltApps(builtApps);
  }, [builtApps]);

  useEffect(() => {
    if (builtApps.length > 0) {
      syncBuiltAppsToServer(builtApps);
    }
  }, []);

  useEffect(() => {
    return audioService.subscribeSpeaking((sp) => setIsSpeaking(sp));
  }, []);

  useEffect(() => {
    return audioService.subscribeVoiceNotice((notice) => {
      if (!notice.available) {
        setHomeStatusBanner(notice.message);
        window.setTimeout(() => {
          setHomeStatusBanner((cur) => (cur === notice.message ? null : cur));
        }, 5000);
      }
    });
  }, []);

  useEffect(() => {
    return zaraVision.subscribe((mode, _stream, _staticImg, facing) => {
      setVisionMode(mode);
      setCameraFacing(facing);
      if (mode === 'off') {
        setIsManualCameraPreview(false);
      }
    });
  }, []);

  useEffect(() => {
    return subscribeNetworkStatus((online) => {
      if (!online) {
        setHomeStatusBanner('Offline mode — local Zara voice & tools active.');
      }
    });
  }, []);

  // Keep Cloud Run container warm and prevent idle scale-to-zero while the user has Zara open
  useEffect(() => {
    const keepWarm = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      fetch('/api/health?_keepalive=' + Date.now(), {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      }).catch(() => {});
    };

    keepWarm();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' || alwaysOnVoiceEnabled) {
        keepWarm();
      }
    }, 60_000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        keepWarm();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [alwaysOnVoiceEnabled]);

  // Camera & Screen Privacy Guarantee: NEVER activate camera or screen sharing silently!
  // Camera only turns on via explicit user tap or explicit camera voice/text command.
  useEffect(() => {
    if (!ownerAuth.isOwnerVerified && visionMode === 'camera' && !isManualCameraPreview) {
      zaraVision.stop();
    }
  }, [ownerAuth.isOwnerVerified, visionMode, isManualCameraPreview]);

  useEffect(() => {
    return floatingCirclePiP.subscribe((floating) => setIsFloatingPiP(floating));
  }, []);

  // Autonomous Self-Update, Issue Clear & Macro Auto-Execution Watchdog
  useEffect(() => {
    zaraSelfHealEngine.registerVoiceHealHook(async () => {
      const blocked =
        isPinLocked ||
        securityOverlayRef.current === 'intruder_lockout' ||
        securityOverlayRef.current === 'owner_face_scan';
      if (alwaysOnVoiceEnabled && !blocked && alwaysOnRef.current) {
        screenKeepAlive.enable();
        if (!alwaysOnRef.current.isPipelineHealthy()) {
          return await alwaysOnRef.current.forceSelfHeal();
        }
      }
      return false;
    });
  }, [alwaysOnVoiceEnabled, isPinLocked]);

  useEffect(() => {
    const stopMonitor = zaraSelfHealEngine.startAutonomousMonitor();
    const unsubStatus = zaraSelfHealEngine.subscribeStatus((msg) => {
      setHomeStatusBanner(msg);
    });
    return () => {
      stopMonitor();
      unsubStatus();
    };
  }, []);

  useEffect(() => {
    queryMobilePermissions().then((p) => {
      if (p.microphone !== 'granted') {
        setNeedsPermissionSetup(true);
      } else {
        setNeedsPermissionSetup(false);
      }
    });
  }, []);

  // Seamless Online / Offline Hybrid Brain Status Announcer ("نیٹ آن ہو یا آف، ایپ پراپرلی کام کرے")
  useEffect(() => {
    const onOffline = () => {
      const verified = ownerAuthRef.current.isOwnerVerified;
      const msg = verified
        ? 'Internet disconnected — offline local mode active.'
        : 'Internet disconnected — offline mode active.';
      setHomeStatusBanner('Offline Local Brain Active · Ready');
      appendActiveMessages((prev) => [
        ...prev,
        {
          id: `net-offline-${Date.now()}`,
          sender: 'zara',
          text: msg,
          timestamp: getMobileClockSnapshot().shortTime12,
          createdAtMs: Date.now(),
        },
      ]);
    };
    const onOnline = () => {
      setHomeStatusBanner('Online Connected · Cloud + Local AI Studio Synced');
      window.setTimeout(() => setHomeStatusBanner(null), 2800);
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [language, config.voiceSpeed, config.voiceName, config.loveMode]);

  // Intruder Voice Alert & Immediate Phone Screen Lockout
  const speakIntruderVoiceWarning = () => {
    audioService.unlock();
    audioService.playChime('call_end');
    const warning =
      'خبردار! ملیشیا والا بادشاہ، آپ کا کوئی فون چھو رہا ہے اور یوز کرنے کی کوشش کر رہا ہے! میں نے فوراً فون اور اسکرین لاک کر دی ہے!';
    audioService.speakText(warning, {
      language: 'urdu',
      rate: config.voiceSpeed,
      voiceName: config.voiceName || 'Zephyr',
    });
  };

  const triggerIntruderLockout = (reason: string, snapshotDataUrl?: string) => {
    setAntiTouchArmedLive(false);
    setIntruderReason(reason);
    setSecurityOverlayMode('intruder_lockout');
    speakIntruderVoiceWarning();
    void (async () => {
      let loc: string | null = null;
      if (securityConfig.antiTheftGpsEnabled !== false) {
        loc = await captureSafeLocationCoords().catch(() => null);
      }
      recordIntruderAlert(reason, snapshotDataUrl, loc || undefined);
    })();
  };

  // Anti-Touch / Unauthorized Motion Guard Listener
  useEffect(() => {
    if (!antiTouchArmedLive) return;

    const handleUnauthorizedTouch = () => {
      triggerIntruderLockout('Someone touched your mobile while Anti-Touch Guard was armed!');
    };

    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const total = Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);
      if (total > 23) {
        triggerIntruderLockout('Someone picked up / shook your mobile!');
      }
    };

    window.addEventListener('pointerdown', handleUnauthorizedTouch, { capture: true });
    window.addEventListener('keydown', handleUnauthorizedTouch, { capture: true });
    window.addEventListener('devicemotion', handleDeviceMotion);

    return () => {
      window.removeEventListener('pointerdown', handleUnauthorizedTouch, { capture: true });
      window.removeEventListener('keydown', handleUnauthorizedTouch, { capture: true });
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, [antiTouchArmedLive]);

  const handleArmAntiTouchGuard = () => {
    audioService.unlock();
    audioService.playChime('activate');
    setHomeStatusBanner(
      'Anti-Touch Guard arming in 3 seconds — if anyone touches the phone, Zara will lock it!'
    );
    audioService.speakText(
      'جی میرے مالک! تین سیکنڈ میں اینٹی ٹچ گارڈ آن ہو رہا ہے — اب اگر کسی نے بھی موبائل کو ہاتھ لگایا تو میں فوراً فون لاک کر کے آپ کو بتاؤں گی!',
      { language, rate: config.voiceSpeed, voiceName: config.voiceName || 'Zephyr' }
    );
    window.setTimeout(() => {
      setAntiTouchArmedLive(true);
      setHomeStatusBanner('🛡️ Anti-Touch Guard ARMED — Watching Phone!');
    }, 3000);
  };

  // Owner Face Verified Handler
  const handleOwnerVerifiedSuccess = () => {
    audioService.unlock();
    audioService.playChime('activate');
    setSecurityOverlayMode(null);
    setIsPinLocked(false);
    setIntruderReason('');

    const verified = ownerAuthRef.current.isOwnerVerified;
    const ownerTitle = verified ? 'Owner' : 'User';
    const welcomeText = verified
      ? 'Face verification complete. Ready whenever you speak or message.'
      : 'Device unlocked. Ready to assist.';
    const snap = getMobileClockSnapshot();

    appendActiveMessages((prev) => [
      ...prev,
      {
        id: `face-ok-${Date.now()}`,
        sender: 'zara',
        text: welcomeText,
        timestamp: snap.shortTime12,
        createdAtMs: Date.now(),
        language: 'english',
      },
    ]);
    setHomeStatusBanner(verified ? `Verified ${ownerTitle} ✓` : 'Unlocked ✓');
  };

  // Close Zara Screen into Background Standby ("call kato / apna Zara app close karo") — keeps 24/7 Voice Commander listening!
  const handleCloseZaraAppNow = () => {
    audioService.stopAudio();
    audioService.playChime('call_end');
    homeMicRef.current?.stopAndDiscard();
    zaraVision.stop();
    setIsHomeMicActive(false);
    setShowChatDrawer(false);
    setShowSettings(false);
    setSecurityOverlayMode('zara_closed');
    if (alwaysOnVoiceEnabled) {
      screenKeepAlive.enable();
      if (!alwaysOnRef.current?.isRunning()) {
        alwaysOnRef.current?.start();
      } else {
        alwaysOnRef.current?.setPaused(false);
      }
    }
  };

  // Universal BACK Action ("بیک کرو / واپس جاؤ / go back")
  const handleGoBackCommand = (speakOut = true): string => {
    audioService.playChime('tap');

    if (ringingSchedule) {
      audioService.stopAudio();
      setRingingSchedule(null);
    } else if (activePreviewApp) {
      setActivePreviewApp(null);
    } else if (showInstallModal) {
      setShowInstallModal(false);
      setAutoStartPlayDownload(false);
    } else if (showMoodWorkModal) {
      setShowMoodWorkModal(false);
    } else if (showMobileControl) {
      setShowMobileControl(false);
    } else if (showNotifications) {
      setShowNotifications(false);
    } else if (showSettings) {
      setShowSettings(false);
    } else if (showChatDrawer) {
      setShowChatDrawer(false);
    } else if (showMemories || showSoul || showData || showStats) {
      setShowMemories(false);
      setShowSoul(false);
      setShowData(false);
      setShowStats(false);
    } else if (appControlToast) {
      setAppControlToast(null);
    } else if (visionMode !== 'off') {
      zaraVision.stop();
    }

    setHomeStatusBanner('Stepped Back (واپس) ✓');
    const msg = 'جی میرے مالک! میں بیک آ گئی ہوں!';
    if (speakOut) {
      audioService.speakText(msg, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
      });
    }
    return msg;
  };

  // Universal CLOSE Active App / Overlay — honestly reports whether OS/native close succeeded or browser sandbox limits apply
  const handleCloseActiveCommand = (targetHint?: string, speakOut = true): string => {
    audioService.playChime('tap');
    endExternalCallNow();

    const closed = closeMobileAppNow(targetHint || 'last_active');
    setActivePreviewApp(null);
    setShowSettings(false);
    setShowMoodWorkModal(false);
    setShowMobileControl(false);
    setShowChatDrawer(false);
    setShowInstallModal(false);
    setShowDriverMode(false);
    setShowFileManager(false);

    const closedName = closed.app?.name || (targetHint === 'whatsapp' ? 'WhatsApp' : '');
    const labelText = closed.honestReport || (closedName ? `Handled ${closedName}` : 'Closed Zara overlays');
    setAppControlToast({
      mode: 'close',
      app: closed.app,
      href: '',
      label: labelText,
    });

    const msg = closed.honestReport;

    if (speakOut) {
      audioService.speakText(msg, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
      });
    }
    return msg;
  };

  // Build Any App, Game, or Station by Command & Send Link in Chat + Open Preview!
  const handleBuildNewApp = async (
    promptText: string,
    categoryHint: 'game' | 'station' | 'app' | 'utility' = 'app'
  ) => {
    setIsBuildingApp(true);
    markStudioTaskProgress(`Build ${categoryHint}: ${promptText}`, 'working');
    setHomeStatusBanner(`Zara & AI Team coding "${promptText.slice(0, 36)}"...`);
    audioService.unlock();
    audioService.speakText(
      'جی میرے مالک! میں نے اور میرے اے آئی اسسٹنٹس نے آپ کی کمانڈ سن لی ہے اور ابھی پورا کوڈ اور سسٹم بنا کر اوپن کر رہے ہیں!',
      { language, rate: config.voiceSpeed, voiceName: config.voiceName || 'Zephyr' }
    );

    try {
      const built = await buildNewAppWithZara(promptText, categoryHint);
      setBuiltApps((prev) => [built, ...prev]);
      markStudioTaskProgress(`Built ${built.title}`, 'completed');

      const snap = getMobileClockSnapshot();
      const doneReply = `جی میرے مالک! میں نے اور میرے اسسٹنٹس نے آپ کے حکم پر "${built.title}" کا پورا کوڈ اور سسٹم تیار کر دیا ہے!\n🔗 ڈائریکٹ براؤزر لنک: ${built.url}`;

      appendActiveMessages((prev) => [
        ...prev,
        {
          id: `built-msg-${Date.now()}`,
          sender: 'zara',
          text: doneReply,
          timestamp: snap.shortTime12,
          createdAtMs: Date.now(),
          builtApp: {
            id: built.id,
            slug: built.slug,
            title: built.title,
            url: built.url,
            category: built.category,
          },
        },
      ]);

      setHomeStatusBanner(`Built "${built.title}" ✓ Link added to Chat & Opened!`);
      setActivePreviewApp(built);
      audioService.playChime('activate');
      audioService.speakText(
        `میرے مالک! آپ کی ${built.title} بالکل تیار ہو گئی ہے، میں نے چیٹ میں لنک دے دیا ہے اور آپ کی اسکرین پر اوپن کر دی ہے!`,
        {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
          loveMode: config.loveMode,
        }
      );
    } catch {
      markStudioTaskProgress(promptText, 'completed');
      setHomeStatusBanner('App Builder encountered a temporary error — please try again.');
    } finally {
      setIsBuildingApp(false);
    }
  };

  // Real-time 1-second Alarm & Work Schedule Watcher
  const triggerScheduleVoiceAlert = (item: AlarmScheduleItem) => {
    audioService.unlock();
    audioService.playChime('call_connect');
    setRingingSchedule(item);

    const verified = ownerAuthRef.current.isOwnerVerified;
    const timeSpoken = format24To12Hour(item.time24);
    const nick = !verified
      ? 'دوست'
      : !config.userNickname || config.userNickname === 'My Love'
      ? 'میرے مالک'
      : config.userNickname;

    const spokenReminder = !verified
      ? `${nick}! موبائل میں ${timeSpoken} بج گئے ہیں — آپ کی یاد دہانی کا وقت ہو گیا ہے: ${item.label}!`
      : item.type === 'work'
      ? `سنو ${nick}! موبائل میں ${timeSpoken} بج گئے ہیں! آپ نے جانا ہے اور یہ کام کرنا ہے: ${item.label}! جلدی سے تیار ہو جاؤ میری جان!`
      : `${nick}! موبائل میں ${timeSpoken} بج گئے ہیں! آپ کا الارم اور یاد دہانی کا وقت ہو گیا ہے: ${item.label}!`;

    const zaraReminderMsg: ChatMessage = {
      id: `alarm-${Date.now()}`,
      sender: 'zara',
      text: `⏰ ${timeSpoken} — ${spokenReminder}`,
      timestamp: timeSpoken,
      createdAtMs: Date.now(),
      language,
    };
    appendActiveMessages((prev) => [...prev, zaraReminderMsg]);

    audioService.speakText(spokenReminder, {
      language,
      pitch: config.voicePitch,
      rate: config.voiceSpeed,
      voiceName: config.voiceName || 'Zephyr',
      loveMode: verified ? config.loveMode : false,
    });
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      const snap = getMobileClockSnapshot();
      setSchedules((prev) => {
        let matchedItem: AlarmScheduleItem | null = null;
        const next = prev.map((s) => {
          if (
            s.enabled &&
            s.time24 === snap.time24 &&
            s.lastTriggeredDate !== snap.todayKey
          ) {
            matchedItem = s;
            return {
              ...s,
              lastTriggeredDate: snap.todayKey,
              enabled: s.repeatDaily ? true : false,
            };
          }
          return s;
        });

        if (matchedItem) {
          const itemToFire = matchedItem;
          window.setTimeout(() => triggerScheduleVoiceAlert(itemToFire), 50);
          return next;
        }
        return prev;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [config.userNickname, config.voicePitch, config.voiceSpeed, config.voiceName, language]);



  const latestZaraMessage =
    [...messages].reverse().find((m) => m.sender === 'zara')?.text ||
    (ownerAuth.isOwnerVerified
      ? 'Zara ready hai — voice ya message se baat karein.'
      : 'Assalam o Alaikum! Main aapki kya madad karoon?');

  const memoryDigest = buildMemoryAndScheduleDigest(memories, messages, schedules);

  // Sync Picture-in-Picture Floating Circle Canvas with live state
  useEffect(() => {
    floatingCirclePiP.updateVisualState({
      isListening: isAlwaysOnRunning || isHomeMicActive,
      isSpeaking,
      micVol: homeMicVol,
      subtitle: interimVoiceText || homeStatusBanner || 'Zara Listening 24/7',
    });
  }, [isAlwaysOnRunning, isHomeMicActive, isSpeaking, homeMicVol, interimVoiceText, homeStatusBanner]);

  const openSettingsAtTab = (tabId: SettingsTabId) => {
    setSettingsInitialTab(tabId);
    setShowSettings(true);
  };

  const openInAppMobileSetting = (settingId: string) => {
    setHighlightedSettingId(settingId);
    setMobileControlTab('settings');
    setShowMobileControl(true);
  };

  // Execute Open, Close/Off, and Back mobile app, per-app Android settings & system settings commands immediately on device
  const executeMobileAppCommand = (
    textOrId: string,
    directAction?: 'open' | 'close' | 'back'
  ) => {
    if (!securityConfig.autoAppLaunch) return;

    markStudioTaskProgress(textOrId, 'working');

    if (directAction === 'back') {
      handleGoBackCommand(false);
      markStudioTaskProgress('Step Back', 'completed');
      return;
    }

    if (directAction === 'close') {
      handleCloseActiveCommand(textOrId, false);
      markStudioTaskProgress(`Close ${textOrId}`, 'completed');
      return;
    }

    if (directAction === 'open') {
      const res = launchMobileAppNow(
        textOrId,
        undefined,
        () => {
          setIsManualCameraPreview(true);
          zaraVision.startCamera('user');
        },
        openInAppMobileSetting
      );
      if (res.app) {
        markStudioTaskProgress(`Opened ${res.app.name}`, 'completed');
        setAppControlToast({
          mode: 'open',
          app: res.app,
          href: res.href,
          label: res.honestReport || `Launching ${res.app.name}`,
        });
      }
      return;
    }

    const cmd = detectMobileCommandFromText(textOrId);
    if (!cmd) return;

    if (cmd.action === 'back') {
      handleGoBackCommand(false);
      markStudioTaskProgress('Step Back', 'completed');
      return;
    }

    if (cmd.action === 'close') {
      const target = cmd.closeAll ? 'all' : cmd.app?.id || 'last_active';
      handleCloseActiveCommand(target, false);
      markStudioTaskProgress(`Closed ${cmd.app?.name || target}`, 'completed');
      return;
    }

    if (cmd.app) {
      const res = launchMobileAppNow(
        cmd.app,
        cmd.query,
        () => {
          setIsManualCameraPreview(true);
          zaraVision.startCamera('user');
        },
        openInAppMobileSetting
      );
      if (res.app) {
        markStudioTaskProgress(`Opened ${res.app.name}`, 'completed');
        setAppControlToast({
          mode: 'open',
          app: res.app,
          href: res.href,
          label: res.honestReport || `Opening ${res.app.name}`,
        });
      }
    }
  };

  const capture100DayMemoryIfNotable = (userText: string) => {
    const activeList = ownerAuthRef.current.isOwnerVerified ? ownerMemories : deviceMemories;
    const extracted = autoExtractMemoryFromTurn(userText, activeList);
    if (extracted) {
      const newMem = { ...extracted, id: `auto-${Date.now()}` };
      if (ownerAuthRef.current.isOwnerVerified) {
        setOwnerMemories((prev) => [newMem, ...prev]);
      } else {
        setDeviceMemories((prev) => [newMem, ...prev]);
      }
    }
  };

  // Run Autonomous Self-Update, Issue Clear & Pending Macro Execution
  const handleTriggerSelfHeal = async (speakOut = true): Promise<string> => {
    setIsSelfHealing(true);
    audioService.unlock();
    audioService.playChime('activate');
    setHomeStatusBanner('Zara Auto-Update & Self-Heal clearing issues...');
    try {
      const report = await zaraSelfHealEngine.runSelfHealAndAutoUpdateNow({
        silent: false,
        forceSwUpdate: true,
      });
      const detailsLine =
        report.actionsTaken.length > 0 ? `\n✓ ${report.actionsTaken.join(' · ')}` : '';
      const fullMsg = `${report.spokenSummary}${detailsLine}`;
      setHomeStatusBanner('Zara Auto-Update & Issue Clear Complete ✓');
      if (speakOut) {
        audioService.selfHealAudioPipeline();
        await audioService.speakText(report.spokenSummary, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
        });
      }
      return fullMsg;
    } finally {
      setIsSelfHealing(false);
    }
  };

  // Run Full Zara App Check & Report ("मेरे अंदर ये नई अपडेट आई है / क्या अपडेट होना चाहिए") or Autonomous Self-Update
  const handleCheckUpdatesAndSpeak = async (autoApply = false): Promise<string> => {
    setIsSelfHealing(true);
    audioService.unlock();
    audioService.playChime('activate');
    setHomeStatusBanner(
      autoApply
        ? 'Zara checking & auto-updating her app...'
        : 'Zara scanning her app & checking new updates...'
    );
    try {
      let spokenMsg = '';
      let extraLines: string[] = [];

      if (autoApply) {
        const res = await zaraSelfHealEngine.runFullAutonomousSelfUpdate();
        spokenMsg = res.spokenSummaryHi;
        extraLines = res.actionsTaken;
        if (res.report?.currentVersion) {
          try {
            localStorage.setItem('zara_announced_version_v1', res.report.currentVersion);
          } catch {}
        }
        setHomeStatusBanner(
          `Zara Auto-Updated to v${res.report?.currentVersion || '5.6.0'} ✓`
        );
      } else {
        const report = await zaraSelfHealEngine.fetchUpdateCheckReport();
        if (report) {
          spokenMsg = report.spokenReportHi;
          const newTitles = report.whatsNewInZara.map((u) => `• ${u.title}: ${u.summaryHi}`);
          const nextRecs = report.recommendedNextUpdates.map(
            (r) => `→ ${r.title} (${r.canAutoApplyRuntime ? 'Auto-Apply Ready' : 'Secrets/APK Required'})`
          );
          extraLines = [...newTitles, ...nextRecs];
          setHomeStatusBanner(
            `Zara v${report.currentVersion} Checked (${report.healthScore}% · ${report.pendingRuntimeCount} runtime updates ready) ✓`
          );
        } else {
          spokenMsg =
            'मैंने अपना लोकल ज़ारा ऐप चेक कर लिया है — ऑनलाइन सर्वर से जुड़ते ही पूरा लाइव अपडेट चेक भी सिंक कर दूँगी।';
          setHomeStatusBanner('Offline App Check Complete ✓');
        }
      }

      const fullReply =
        extraLines.length > 0 ? `${spokenMsg}\n\n${extraLines.join('\n')}` : spokenMsg;
      if (config.autoSpeak) {
        audioService.selfHealAudioPipeline();
        await audioService.speakText(spokenMsg, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
        });
      }
      return fullReply;
    } finally {
      setIsSelfHealing(false);
    }
  };

  // Priority Work Task Handlers + Live Touchless Gesture & Mood Execution
  const handleAddWorkTask = (
    title: string,
    priority: 'urgent' | 'today' | 'normal' = 'today',
    aiNotes?: string
  ) => {
    const newTask: AdvancedWorkTaskItem = {
      id: `work-${Date.now()}`,
      title,
      priority,
      completed: false,
      aiNotes,
      createdAtMs: Date.now(),
    };
    setWorkTasks((prev) => [newTask, ...prev]);
  };

  const handleToggleWorkTask = (id: string) => {
    setWorkTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteWorkTask = (id: string) => {
    setWorkTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleMoodGestureDetected = async (
    res: MoodAndGestureScanResult,
    silentIfNoGesture = false
  ) => {
    setCurrentMood(res.mood);
    setLastGesture(res.gesture);

    // 1. Touchless Open-Palm Stop Gesture: immediately pause Zara audio!
    if (res.gesture === 'open_palm_stop') {
      audioService.stopAudio();
      setHomeStatusBanner('Open Palm Gesture — Zara paused speaking');
      return;
    }

    // 2. Touchless Peace / V-Sign Gesture: auto-snap camera photo into Chat!
    if (res.gesture === 'peace_victory') {
      setHomeStatusBanner('Peace Gesture — Capturing camera photo to Chat...');
      await handleSnapCameraToChat();
      return;
    }

    if (silentIfNoGesture && res.gesture === 'none') {
      setHomeStatusBanner(`Mood: ${MOOD_DISPLAY_META[res.mood].label}`);
      return;
    }

    const gestureSuffix =
      res.gesture !== 'none' ? ` · ${GESTURE_ACTION_META[res.gesture].label}` : '';
    setHomeStatusBanner(`Mood: ${MOOD_DISPLAY_META[res.mood].label}${gestureSuffix}`);

    appendActiveMessages((prev) => [
      ...prev,
      {
        id: `mood-${Date.now()}`,
        sender: 'zara',
        text: res.spokenReply,
        timestamp: getMobileClockSnapshot().shortTime12,
        createdAtMs: Date.now(),
        language,
      },
    ]);

    audioService.selfHealAudioPipeline();
    await audioService.speakText(res.spokenReply, {
      language,
      pitch: config.voicePitch,
      rate: config.voiceSpeed,
      voiceName: config.voiceName || 'Zephyr',
      loveMode: ownerAuthRef.current.isOwnerVerified ? config.loveMode : false,
      base64Audio: res.audio,
    });
  };

  const handleToggleAutoGestureWatch = async () => {
    audioService.unlock();
    const next = !autoGestureWatch;
    setAutoGestureWatch(next);
    if (next) {
      if (zaraVision.getMode() !== 'camera') {
        const started = await zaraVision.startCamera('user');
        if (!started.ok) {
          setAutoGestureWatch(false);
          setHomeStatusBanner(started.error || 'Camera required for Live Gesture Watch');
          return;
        }
      }
      setHomeStatusBanner('Live Touchless Gesture & Mood Watch ON');
    } else {
      setHomeStatusBanner('Live Gesture Watch Paused');
    }
  };

  const moodGestureHandlerRef = useRef(handleMoodGestureDetected);
  useEffect(() => {
    moodGestureHandlerRef.current = handleMoodGestureDetected;
  });

  // Background Touchless Camera Gesture & Mood Watcher (polls every 7s when Auto Gesture Watch is ON)
  useEffect(() => {
    if (!autoGestureWatch) return;
    let inFlight = false;
    const interval = window.setInterval(async () => {
      if (inFlight || document.visibilityState === 'hidden') return;
      const frame = zaraVision.captureFrameBase64();
      if (!frame?.base64) return;
      inFlight = true;
      try {
        const res = await analyzeCameraMoodAndGesture({
          imageBase64: frame.base64,
          userNickname: config.userNickname,
          voiceName: config.voiceName || 'Zephyr',
        });
        await moodGestureHandlerRef.current(res, true);
      } catch {
        // Ignore transient poll errors silently
      } finally {
        inFlight = false;
      }
    }, 7000);

    return () => window.clearInterval(interval);
  }, [autoGestureWatch, config.userNickname, config.voiceName]);

  // Persist Spoken Notification Config & Incoming Notification Log
  useEffect(() => {
    saveSpokenNotificationConfig(spokenNotifConfig);
  }, [spokenNotifConfig]);

  useEffect(() => {
    saveIncomingNotifications(incomingNotifs);
  }, [incomingNotifs]);

  const handleIncomingNotificationEvent = (
    payload: Omit<IncomingNotificationItem, 'id' | 'timestamp' | 'createdAtMs'>
  ) => {
    const newItem: IncomingNotificationItem = {
      ...payload,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: getMobileClockSnapshot().shortTime12,
      createdAtMs: Date.now(),
    };
    setIncomingNotifs((prev) => [newItem, ...prev].slice(0, 40));

    const shouldSpeak =
      spokenNotifConfig.enabled &&
      (newItem.type === 'incoming_call'
        ? spokenNotifConfig.announceCalls
        : spokenNotifConfig.announceMessages);

    if (shouldSpeak) {
      const announcement = buildSpokenNotificationAnnouncement(
        newItem,
        spokenNotifConfig,
        language
      );
      setHomeStatusBanner(`${newItem.appName}: ${newItem.sender}`);
      audioService.selfHealAudioPipeline();
      audioService.speakText(announcement, {
        language: language === 'auto' ? 'urdu' : language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
      });
    } else {
      setHomeStatusBanner(
        `Notification logged (${newItem.appName} · ${newItem.sender}) — enable Spoken Alerts to announce aloud.`
      );
    }
  };

  const incomingNotifHandlerRef = useRef(handleIncomingNotificationEvent);
  useEffect(() => {
    incomingNotifHandlerRef.current = handleIncomingNotificationEvent;
  });

  // Listen for Native Android NotificationListenerService bridge events & ServiceWorker push messages
  useEffect(() => {
    const onNativeNotif = (evt: Event) => {
      const detail = (evt as CustomEvent)?.detail;
      if (!detail || !detail.sender) return;
      incomingNotifHandlerRef.current({
        type: detail.type === 'incoming_call' ? 'incoming_call' : 'message',
        appName: String(detail.appName || 'Android Alert'),
        sender: String(detail.sender),
        body: String(detail.body || ''),
      });
    };

    const onSwMessage = (evt: MessageEvent) => {
      const d = evt.data;
      if (d && d.type === 'ZARA_INCOMING_NOTIFICATION' && d.sender) {
        incomingNotifHandlerRef.current({
          type: d.alertType === 'incoming_call' ? 'incoming_call' : 'message',
          appName: String(d.appName || 'Mobile Notification'),
          sender: String(d.sender),
          body: String(d.body || ''),
        });
      }
    };

    window.addEventListener('zara-android-notification', onNativeNotif);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
    }
    return () => {
      window.removeEventListener('zara-android-notification', onNativeNotif);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      }
    };
  }, []);

  const handleRepeatLastNotification = async (): Promise<string> => {
    const latest =
      incomingNotifs.find((n) => n.type === 'incoming_call' || n.type === 'message') ||
      incomingNotifs[0];
    if (!latest) {
      const noneMsg = 'میرے مالک، ابھی کوئی نیا کال یا میسج نوٹیفکیشن موجود نہیں ہے۔';
      await audioService.speakText(noneMsg, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
      });
      return noneMsg;
    }
    const speech = buildSpokenNotificationAnnouncement(latest, spokenNotifConfig, language);
    setHomeStatusBanner(`Repeating: ${latest.appName} · ${latest.sender}`);
    audioService.selfHealAudioPipeline();
    await audioService.speakText(speech, {
      language,
      rate: config.voiceSpeed,
      voiceName: config.voiceName || 'Zephyr',
    });
    return speech;
  };

  const handleConfirmPendingAction = async (
    actionToExecute: PendingCallOrMessageAction
  ): Promise<string> => {
    const res = executeConfirmedCallOrMessage(actionToExecute, language);
    if (!res.ok) {
      setHomeStatusBanner(res.statusReport);
      await audioService.speakText(res.spokenReport, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
      });
      return res.spokenReport;
    }

    setPendingConfirmAction(null);
    setHomeStatusBanner(res.statusReport);
    if (res.href) {
      setAppControlToast({
        mode: 'open',
        app: null,
        href: res.href,
        fallbackHref: res.fallbackHref,
        label: res.statusReport,
      });
    }

    const nowSnap = getMobileClockSnapshot();
    appendActiveMessages((prev) => [
      ...prev,
      {
        id: `confirmed-${Date.now()}`,
        sender: 'zara',
        text: `${res.spokenReport}\n(${res.statusReport})`,
        timestamp: nowSnap.shortTime12,
        createdAtMs: Date.now(),
        language,
      },
    ]);

    audioService.selfHealAudioPipeline();
    await audioService.speakText(res.spokenReport, {
      language,
      rate: config.voiceSpeed,
      voiceName: config.voiceName || 'Zephyr',
    });
    return res.spokenReport;
  };

  const handlePickAndroidContactForPending = async () => {
    try {
      const navContacts = (navigator as any).contacts;
      if (navContacts?.select) {
        const picked = await navContacts.select(['name', 'tel'], { multiple: false });
        const first = picked?.[0];
        if (first) {
          const pickedName = first.name?.[0] || pendingConfirmAction?.contactName || 'Contact';
          const pickedTel = String(first.tel?.[0] || '').replace(/[^\d+]/g, '');
          setPendingConfirmAction((prev) =>
            prev
              ? {
                  ...prev,
                  contactName: pickedName,
                  phone: pickedTel,
                }
              : null
          );
          return;
        }
      }
      setHomeStatusBanner(
        'Enter the recipient phone number directly in the confirmation box above, or save contacts in Settings → WhatsApp.'
      );
    } catch {
      setHomeStatusBanner('Contact selection cancelled — you can type the phone number above.');
    }
  };

  // Process special Owner commands (Voice Confirmation, Repeat Notification, Multi-step Macros, Self-Heal, Front/Back Camera, Mood/Gesture, Call/Message Dictation, App Control!)
  const tryHandleSpecialIntercepts = async (
    rawText: string,
    isSubMacroStep = false
  ): Promise<string | null> => {
    // 0. Handle Voice Yes/No Confirmation when a PC lock action is awaiting confirmation
    if (pendingPcConfirm) {
      const decision = detectVoiceConfirmationDecision(rawText);
      if (decision === 'confirm') {
        const pending = pendingPcConfirm;
        setPendingPcConfirm(null);
        const res = await executeAuthorizedPcCommand(pending.action, pending.params, true);
        const msg = res.ok
          ? `Confirmed: ${res.output || pending.label} succeeded on your computer.`
          : `Could not execute "${pending.label}": ${res.error || 'PC Companion Agent is offline.'}`;
        setHomeStatusBanner(msg);
        await audioService.speakText(msg, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
        });
        return msg;
      }
      if (decision === 'cancel') {
        setPendingPcConfirm(null);
        const cancelMsg = 'Okay, cancelled the computer command.';
        setHomeStatusBanner(cancelMsg);
        await audioService.speakText(cancelMsg, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
        });
        return cancelMsg;
      }
    }

    // 0a. Handle Voice Yes/No Confirmation when a Call or Message is awaiting authorization
    if (pendingConfirmAction) {
      const decision = detectVoiceConfirmationDecision(rawText);
      if (decision === 'confirm') {
        return await handleConfirmPendingAction(pendingConfirmAction);
      }
      if (decision === 'cancel') {
        setPendingConfirmAction(null);
        setHomeStatusBanner('Call / Message cancelled.');
        const cancelMsg = 'Okay, cancelled the call or message.';
        await audioService.speakText(cancelMsg, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
        });
        return cancelMsg;
      }
    }

    // 0b. Driver Mode, File Manager, Memory/File Delete Confirmation Guard & Authorized PC Control
    if (/\b(driver\s*mode|driving\s*mode|ڈرائیور\s*موڈ|ड्राइवर\s*मोड)\b/i.test(rawText)) {
      const turningOff = /\b(off|exit|close|stop|band|بند|बंद)\b/i.test(rawText);
      setShowDriverMode(!turningOff);
      const msg = turningOff
        ? 'Driver Mode closed.'
        : 'Driver Mode is now active. Spoken message alerts and hands-free controls are ready — drive safely.';
      setHomeStatusBanner(msg);
      await audioService.speakText(msg, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
      });
      return msg;
    }

    if (
      /\b(open\s*(?:my\s*)?files|file\s*manager|storage\s*manager|search\s*(?:my\s*)?files|فائل\s*مینیجر|फ़ाइल\s*मैनेजर)\b/i.test(
        rawText
      )
    ) {
      setShowFileManager(true);
      const msg = 'Opening your Smart File & Storage Manager so you can browse, search, or have me explain your authorized files.';
      setHomeStatusBanner('Opened Smart File & Storage Manager');
      await audioService.speakText(msg, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
      });
      return msg;
    }

    if (
      /\b(delete|remove|erase|clear)\s+(?:a\s+|this\s+|that\s+|my\s+|all\s+)?(memory|memories|file|files|folder|vault)\b/i.test(
        rawText
      )
    ) {
      const isFile = /\b(file|files|folder)\b/i.test(rawText);
      if (isFile) {
        setShowFileManager(true);
      } else {
        setShowMemories(true);
      }
      const msg = isFile
        ? 'For safety, I never delete files automatically. I opened the File Manager — please tap Delete and confirm explicitly on screen.'
        : 'For safety, I never delete memories without explicit confirmation. I opened your Memory Vault — select the memory and confirm deletion.';
      setHomeStatusBanner(msg);
      await audioService.speakText(msg, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
      });
      return msg;
    }

    const pcCmd = detectPcVoiceCommand(rawText);
    if (pcCmd) {
      if (!ownerAuthRef.current.isOwnerVerified) {
        const denyPc = 'Authorized Owner Google Sign-In is required before executing computer commands.';
        await audioService.speakText(denyPc, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
          loveMode: false,
        });
        return denyPc;
      }
      if (pcCmd.requiresConfirm) {
        setPendingPcConfirm({
          action: pcCmd.action,
          params: pcCmd.params,
          label: pcCmd.label,
        });
        const askConfirm = `Please confirm explicitly: do you want me to ${pcCmd.label}? Say Yes or tap Confirm.`;
        setHomeStatusBanner(`Confirm PC action: ${pcCmd.label}`);
        await audioService.speakText(askConfirm, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
        });
        return askConfirm;
      }
      const res = await executeAuthorizedPcCommand(pcCmd.action, pcCmd.params, false);
      const replyPc = res.ok
        ? `Computer command "${pcCmd.label}" succeeded: ${res.output || 'Done.'}`
        : `Computer command "${pcCmd.label}" failed: ${res.error || 'No authorized PC Companion Agent is connected.'}`;
      setHomeStatusBanner(replyPc.slice(0, 110));
      await audioService.speakText(replyPc, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
      });
      return replyPc;
    }

    // 0c. Repeat Last Incoming Call or Message Notification Command
    if (detectRepeatNotificationCommand(rawText)) {
      return await handleRepeatLastNotification();
    }

    // 1. Multi-step compound macro auto-execution ("front camera on karo aur phir meri photo lo", etc.)
    if (!isSubMacroStep) {
      const macroSteps = splitCompoundMacroSteps(rawText);
      if (macroSteps.length >= 2) {
        const stepReplies: string[] = [];
        for (const step of macroSteps) {
          try {
            const r = await handleSendMessage(step, undefined, true);
            if (r) stepReplies.push(r);
          } catch {
            zaraSelfHealEngine.enqueueFailedTaskForAutoExecution(
              `Macro step: ${step}`,
              async () => {
                await sendMsgRef.current(step, undefined, true);
              }
            );
          }
        }
        return (
          stepReplies[stepReplies.length - 1] ||
          'جی میرے مالک! میں نے آپ کے میکرو کے سارے کام خود بخود مکمل کر دیے ہیں!'
        );
      }
    }

    // 2. Self-Check ("मेरे अंदर क्या नई अपडेट है / अपना ऐप चेक करो") vs Autonomous Self-Update / Self-Heal
    const selfHealCmd = detectSelfHealOrMacroCommand(rawText);
    if (selfHealCmd) {
      if (selfHealCmd.type === 'check_updates_and_status') {
        return await handleCheckUpdatesAndSpeak(false);
      }
      if (selfHealCmd.type === 'auto_update_self') {
        return await handleCheckUpdatesAndSpeak(true);
      }
      return await handleTriggerSelfHeal(true);
    }

    // 2.5 Explicit Direct Memory Save ("ज़ारा याद रखो...", "remember that...")
    const explicitMemText = detectExplicitRememberCommand(rawText);
    if (explicitMemText) {
      const newMem: MemoryItem = {
        id: `mem-direct-${Date.now()}`,
        title: 'Direct Memory (याद)',
        details: explicitMemText,
        category: 'promise',
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        createdAtMs: Date.now(),
      };
      if (ownerAuthRef.current.isOwnerVerified) {
        setOwnerMemories((prev) => [newMem, ...prev]);
      } else {
        setDeviceMemories((prev) => [newMem, ...prev]);
      }
      setHomeStatusBanner('Saved permanently in 100+ Day Memory Vault ✓');
      const savedReply = `जी बिल्कुल! मैंने दिल में पक्का याद रख लिया है: "${explicitMemText}" — अब कभी नहीं भूलूँगी!`;
      if (config.autoSpeak) {
        audioService.selfHealAudioPipeline();
        await audioService.speakText(savedReply, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
          loveMode: config.loveMode,
          emotionMode: config.emotionMode || 'apnapan',
        });
      }
      return savedReply;
    }

    // 2a. Auto-Open Zara's Own Settings Tabs, Video Call, Chat Drawer, Mobile Hub, or PWA Installer!
    const internalUiCmd = detectZaraInternalUiCommand(rawText);
    if (internalUiCmd) {
      audioService.unlock();
      audioService.playChime('activate');
      markStudioTaskProgress(internalUiCmd.label, 'completed');
      setHomeStatusBanner(`Opened: ${internalUiCmd.label} ✓`);

      if (internalUiCmd.kind === 'open_settings_tab') {
        openSettingsAtTab(internalUiCmd.tabId || 'controls');
      } else if (internalUiCmd.kind === 'open_chat') {
        setShowChatDrawer(true);
      } else if (internalUiCmd.kind === 'open_ai_studio') {
        setAiStudioTab(internalUiCmd.studioTab || 'office');
        setShowAiStudio(true);
      } else if (internalUiCmd.kind === 'open_mobile_hub') {
        setMobileControlTab('settings');
        setShowMobileControl(true);
      } else if (internalUiCmd.kind === 'open_pwa_install') {
        setShowInstallModal(true);
      }

      audioService.selfHealAudioPipeline();
      await audioService.speakText(internalUiCmd.spokenUrduHindi, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
        loveMode: ownerAuthRef.current.isOwnerVerified ? config.loveMode : false,
      });
      return internalUiCmd.spokenUrduHindi;
    }

    // 2b. Hardware Mobile Flashlight / LED Torch Command (Works Online & Offline)
    const torchCmd = detectFlashlightCommand(rawText);
    if (torchCmd) {
      const isVerified = ownerAuthRef.current.isOwnerVerified;
      markStudioTaskProgress(`Flashlight ${torchCmd.action}`, 'working');
      const desired =
        torchCmd.action === 'on' ? true : torchCmd.action === 'off' ? false : undefined;
      const torchRes = await toggleMobileFlashlight(desired);
      markStudioTaskProgress(torchRes.message, 'completed');
      setHomeStatusBanner(torchRes.message);
      const msg = torchRes.ok
        ? torchRes.active
          ? isVerified
            ? 'جی میرے مالک ملیشیا والا بادشاہ! میں نے اور میرے اسسٹنٹس نے آپ کے موبائل کی ٹارچ آن کر دی ہے!'
            : 'میں نے موبائل کی فلیش لائٹ آن کر دی ہے!'
          : 'میں نے موبائل کی ٹارچ بند کر دی ہے!'
        : torchRes.message;
      await audioService.speakText(msg, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
        loveMode: isVerified ? config.loveMode : false,
      });
      return msg;
    }

    // 3. Front & Back Camera Voice Commands (snap_photo falls through to handleSendMessage for visual AI analysis)
    const camCmd = detectCameraFrontBackCommand(rawText);
    if (camCmd && camCmd.action !== 'snap_photo') {
      const isVerified = ownerAuthRef.current.isOwnerVerified;
      if (camCmd.action === 'front') {
        setIsManualCameraPreview(true);
        const res = await zaraVision.startCamera('user');
        if (res.ok) {
          setNeedsPermissionSetup(false);
          setHomeStatusBanner('Front Selfie Camera ON ✓');
          const msg = isVerified
            ? 'جی میرے مالک! میں نے فرنٹ سیلفی کیمرہ آن کر دیا ہے اور آپ کو لائیو دیکھ رہی ہوں!'
            : 'میں نے فرنٹ کیمرہ آن کر دیا ہے!';
          await audioService.speakText(msg, {
            language,
            rate: config.voiceSpeed,
            voiceName: config.voiceName || 'Zephyr',
            loveMode: isVerified ? config.loveMode : false,
          });
          return msg;
        }
      } else if (camCmd.action === 'back') {
        setIsManualCameraPreview(true);
        const res = await zaraVision.startCamera('environment');
        if (res.ok) {
          setNeedsPermissionSetup(false);
          setHomeStatusBanner('Back Rear Camera ON ✓');
          const msg =
            'جی میرے مالک! میں نے موبائل کا بیک کیمرہ آن کر دیا ہے اور سامنے کا منظر لائیو دیکھ رہی ہوں!';
          await audioService.speakText(msg, {
            language,
            rate: config.voiceSpeed,
            voiceName: config.voiceName || 'Zephyr',
            loveMode: config.loveMode,
          });
          return msg;
        }
      } else if (camCmd.action === 'flip') {
        setIsManualCameraPreview(true);
        const res = await zaraVision.flipCamera();
        if (res.ok) {
          const lensName =
            res.facing === 'environment'
              ? 'بیک کیمرہ (Back Camera)'
              : 'فرنٹ کیمرہ (Front Camera)';
          setHomeStatusBanner(
            res.facing === 'environment' ? 'Switched to Back Camera ✓' : 'Switched to Front Camera ✓'
          );
          const msg = `جی میرے مالک! میں نے کیمرہ بدل کر ${lensName} آن کر دیا ہے!`;
          await audioService.speakText(msg, {
            language,
            rate: config.voiceSpeed,
            voiceName: config.voiceName || 'Zephyr',
          });
          return msg;
        }
      } else if (camCmd.action === 'off') {
        setIsManualCameraPreview(false);
        zaraVision.stop();
        setHomeStatusBanner('Camera Turned OFF ✓');
        const msg = 'جی میرے مالک! میں نے کیمرہ بند کر دیا ہے!';
        await audioService.speakText(msg, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
        });
        return msg;
      }
    }

    // 3b. Voice & Chat Mood/Gesture Scan + Advanced Work Studio Commands
    const moodWorkCmd = detectMoodGestureOrWorkCommand(rawText);
    if (moodWorkCmd) {
      if (moodWorkCmd.type === 'scan_mood_gesture') {
        setHomeStatusBanner('Scanning your Mood & Gesture...');
        let frameB64 = zaraVision.captureFrameBase64()?.base64;
        if (!frameB64) {
          const snapped = await zaraVision.snapPhotoFromLens('user');
          frameB64 = snapped?.base64;
        }
        const scanRes = await analyzeCameraMoodAndGesture({
          imageBase64: frameB64,
          textContext: rawText,
          userNickname: config.userNickname,
          voiceName: config.voiceName || 'Zephyr',
        });
        setCurrentMood(scanRes.mood);
        setLastGesture(scanRes.gesture);
        setHomeStatusBanner(
          `Mood: ${MOOD_DISPLAY_META[scanRes.mood].label} · ${
            GESTURE_ACTION_META[scanRes.gesture].label
          }`
        );
        audioService.selfHealAudioPipeline();
        await audioService.speakText(scanRes.spokenReply, {
          language,
          pitch: config.voicePitch,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
          loveMode: config.loveMode,
          base64Audio: scanRes.audio,
        });
        return scanRes.spokenReply;
      }

      if (
        moodWorkCmd.type === 'open_mood_gesture_hub' ||
        moodWorkCmd.type === 'open_advanced_work'
      ) {
        const targetTab =
          moodWorkCmd.type === 'open_advanced_work' ? 'work' : 'mood_gesture';
        setMoodWorkInitialTab(targetTab);
        setShowMoodWorkModal(true);
        const msg =
          targetTab === 'work'
            ? 'جی میرے مالک! میں نے آپ کا ایڈوانس ورک اسٹوڈیو، فوکس ٹائمر اور کام کی لسٹ اوپن کر دی ہے!'
            : 'جی میرے مالک! میں نے موڈ اور ٹچ لیس جیسچر سسٹم اوپن کر دیا ہے!';
        await audioService.speakText(msg, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
          loveMode: config.loveMode,
        });
        return msg;
      }

      if (moodWorkCmd.type === 'add_work_task' && moodWorkCmd.taskTitle) {
        handleAddWorkTask(moodWorkCmd.taskTitle, 'today');
        setHomeStatusBanner(`Saved Work Task: ${moodWorkCmd.taskTitle}`);
        const msg = `جی میرے مالک! میں نے آپ کے ایڈوانس ورک لسٹ میں یہ کام نوٹ کر لیا ہے: "${moodWorkCmd.taskTitle}"!`;
        await audioService.speakText(msg, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
        });
        return msg;
      }

      if (moodWorkCmd.type === 'run_work_ai') {
        setHomeStatusBanner('Zara & AI Assistants drafting work...');
        const workRes = await runAdvancedWorkStudio({
          workMode: moodWorkCmd.workMode || 'action_plan',
          prompt: moodWorkCmd.workPrompt || rawText,
          userNickname: config.userNickname,
          voiceName: config.voiceName || 'Zephyr',
        });
        setHomeStatusBanner(`${workRes.title} Ready ✓`);
        audioService.selfHealAudioPipeline();
        await audioService.speakText(workRes.spokenSummary, {
          language,
          pitch: config.voicePitch,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
          loveMode: config.loveMode,
          base64Audio: workRes.audio,
        });
        return `${workRes.title}\n\n${workRes.output}`;
      }
    }

    if (
      /(zara\s*(app\s*)?(open|on|wake|chalu|kholo|khol)|زارا\s*(ایپ\s*)?(اوپن|آن|کھولو|جاگو)|ज़ारा\s*(ऐप\s*)?(ओपन|ऑन|खोलो|चालू))/i.test(
        rawText
      ) &&
      !/(whatsapp|youtube|camera|instagram|tiktok|facebook|settings)/i.test(rawText)
    ) {
      setSecurityOverlayMode(null);
      screenKeepAlive.enable();
      const verified = ownerAuthRef.current.isOwnerVerified;
      const wakeMsg = verified
        ? 'جی میرے مالک ملیشیا والا بادشاہ! میں اور میرے اے آئی اسسٹنٹس لائیو حاضر ہیں — فون سائیڈ پر پڑا ہو، نیٹ آف ہو یا اسکرین بند ہو، آپ کی ہر آواز پر ہم کام کریں گے!'
        : 'جی دوست! میں حاضر ہوں — بتائیے میں آپ کے کس عام کام یا سوال میں مدد کروں؟';
      audioService.selfHealAudioPipeline();
      await audioService.speakText(wakeMsg, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
        loveMode: verified ? config.loveMode : false,
      });
      return wakeMsg;
    }

    // 3b-2. Hands-Free Native Android Accessibility OS Controls (Scroll, Home, Recents, Notifications, Screenshot)
    {
      let accAction:
        | 'scroll_down'
        | 'scroll_up'
        | 'home'
        | 'recents'
        | 'notifications'
        | 'screenshot'
        | null = null;
      let accSpoken = '';
      if (/(scroll\s*down|neeche\s*scroll|نیچے\s*اسکرول|नीचे\s*स्क्रॉल)/i.test(rawText)) {
        accAction = 'scroll_down';
        accSpoken = 'جی میرے مالک! اسکرین نیچے اسکرول کر دی ہے!';
      } else if (/(scroll\s*up|upar\s*scroll|اوپر\s*اسکرول|ऊपर\s*स्क्रॉल)/i.test(rawText)) {
        accAction = 'scroll_up';
        accSpoken = 'جی میرے مالک! اسکرین اوپر اسکرول کر دی ہے!';
      } else if (/(home\s*screen|go\s*home\s*screen|ہوم\s*اسکرین|होम\s*स्क्रीन)/i.test(rawText)) {
        accAction = 'home';
        accSpoken = 'جی میرے مالک! موبائل ہوم اسکرین پر لے آئی ہوں!';
      } else if (/(recent\s*apps|recents|ریسٹ\s*ایپس|ریسنٹ\s*ایپس|रीसेंट\s*ऐप्स)/i.test(rawText)) {
        accAction = 'recents';
        accSpoken = 'جی میرے مالک! ریسنٹ ایپس کھول دی ہیں!';
      } else if (/(take\s*screenshot|screenshot\s*lo|اسکرین\s*شاٹ|स्क्रीनशॉट)/i.test(rawText)) {
        accAction = 'screenshot';
        accSpoken = 'جی میرے مالک! اسکرین شاٹ لے لیا ہے!';
      }
      if (accAction) {
        const res = performAndroidAccessibilityAction(accAction);
        if (res.ok) {
          setHomeStatusBanner(`Accessibility Action (${accAction}) Executed ✓`);
          await audioService.speakText(accSpoken, {
            language,
            rate: config.voiceSpeed,
            voiceName: config.voiceName || 'Zephyr',
          });
          return accSpoken;
        }
      }
    }

    // 3c. Voice Calling & Multilingual Message Dictation (With User Confirmation Card)
    const callOrMsgCandidate = detectCallOrMessageWithConfirmation(rawText);
    if (callOrMsgCandidate) {
      setPendingConfirmAction(callOrMsgCandidate);
      const confirmSpeech = buildConfirmationPromptSpeech(callOrMsgCandidate, language);
      setHomeStatusBanner(
        callOrMsgCandidate.kind === 'message'
          ? `Confirm ${callOrMsgCandidate.messagingApp.toUpperCase()} message to ${callOrMsgCandidate.contactName}`
          : `Confirm call to ${callOrMsgCandidate.contactName}`
      );
      audioService.selfHealAudioPipeline();
      await audioService.speakText(confirmSpeech, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
      });
      return confirmSpeech;
    }

    const special = detectSpecialControlCommand(rawText);
    if (special) {
      if (special.type === 'close_zara_app') {
        handleCloseZaraAppNow();
        return 'جی میرے مالک! میں نے زارا اسکرین سٹینڈ بائی کر دی ہے، لیکن آپ بغیر چھوئے یا لاک اسکرین پر بھی جب آواز دیں گے میں سن کر جواب دوں گی!';
      }
      if (special.type === 'go_back') {
        return handleGoBackCommand(true);
      }
      if (special.type === 'close_active') {
        return handleCloseActiveCommand(special.targetAppHint, true);
      }
      if (special.type === 'drop_zara_call') {
        audioService.stopAudio();
        const msg = 'جی میرے مالک! میں نے آڈیو روک دی ہے!';
        audioService.speakText(msg, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
        });
        return msg;
      }
      if (special.type === 'lock_phone_now') {
        setSecurityOverlayMode('intruder_lockout');
        setIntruderReason('Locked on Owner Voice Command');
        return 'جی میرے مالک! میں نے فوراً موبائل اسکرین لاک کر دی ہے!';
      }
      if (special.type === 'arm_touch_guard') {
        handleArmAntiTouchGuard();
        return 'جی میرے مالک! اینٹی ٹچ سیکیورٹی گارڈ آن ہو رہا ہے!';
      }
      if (special.type === 'whatsapp_text') {
        const pendingMsg: PendingCallOrMessageAction = {
          id: `confirm-msg-${Date.now()}`,
          kind: 'message',
          contactName:
            special.contactName || (special.phone ? `+${special.phone}` : 'Choose Recipient in App'),
          phone: special.phone || '',
          messagingApp: 'whatsapp',
          messageBody: special.message || 'Assalam o Alaikum!',
          createdAtMs: Date.now(),
        };
        setPendingConfirmAction(pendingMsg);
        const confirmSpeech = buildConfirmationPromptSpeech(pendingMsg, language);
        setHomeStatusBanner(`Confirm WHATSAPP message to ${pendingMsg.contactName}`);
        audioService.selfHealAudioPipeline();
        await audioService.speakText(confirmSpeech, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
        });
        return confirmSpeech;
      }
      if (special.type === 'whatsapp_call' || special.type === 'phone_call') {
        const pendingCall: PendingCallOrMessageAction = {
          id: `confirm-call-${Date.now()}`,
          kind: special.type === 'whatsapp_call' ? 'whatsapp_call' : 'phone_call',
          contactName:
            special.contactName || (special.phone ? `+${special.phone}` : 'Selected Contact'),
          phone: special.phone || '',
          messagingApp: special.type === 'whatsapp_call' ? 'whatsapp' : 'sms',
          createdAtMs: Date.now(),
        };
        setPendingConfirmAction(pendingCall);
        const confirmSpeech = buildConfirmationPromptSpeech(pendingCall, language);
        setHomeStatusBanner(`Confirm call to ${pendingCall.contactName}`);
        audioService.selfHealAudioPipeline();
        await audioService.speakText(confirmSpeech, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
        });
        return confirmSpeech;
      }
      if (special.type === 'end_external_call') {
        const ended = endExternalCallNow();
        closeMobileAppNow('whatsapp');
        setAppControlToast({
          mode: 'close',
          app: null,
          href: '',
          label: `Call Ended ${ended || ''} ✓`,
        });
        const msg = 'جی میرے مالک! میں نے اس کی کال بند اور ختم کر دی ہے!';
        await audioService.speakText(msg, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
        });
        return msg;
      }
    }

    if (detectDiagnosticsCommand(rawText)) {
      const report = await runFullZaraAndMobileDiagnostics();
      await audioService.speakText(report.spokenUrduReport, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
      });
      return report.spokenUrduReport;
    }

    const buildCmd = detectAppBuilderCommand(rawText);
    if (buildCmd) {
      handleBuildNewApp(buildCmd.prompt, buildCmd.category);
      return `جی میرے مالک! میں اور میرے اسسٹنٹس آپ کے لیے "${buildCmd.prompt}" کا مکمل کوڈ اور ایپ تیار کر رہے ہیں — ابھی لنک کے ساتھ اوپن ہو جائے گی!`;
    }

    if (
      /(पूरी\s*फाइल|सारी\s*फाइल|सब\s*फाइल|जितनी\s*भी\s*फाइल|ऑल\s*टू\s*जेड|कौन\s*सा\s*टूल|कौन\s*सा\s*कोड|पूरा\s*कोड|सोर्स\s*कोड|all\s*files|full\s*code|source\s*code|export\s*files|پوری\s*فائل|ساری\s*فائل|پورا\s*کوڈ)/i.test(
        rawText
      )
    ) {
      setShowProjectExport(true);
      const msg =
        'जी मेरे मालिक! मैंने ज़ारा की शुरू से लेकर अब तक की सभी फाइलें, टूल्स की A-to-Z जानकारी और पूरा सोर्स कोड डाउनलोड पैनल खोल दिया है!';
      await audioService.speakText(msg, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
      });
      return msg;
    }

    return null;
  };

  const handleSwitchAssistant = async (
    targetId: AiAssistantId,
    announceVoice = true
  ): Promise<string> => {
    const profile = getAssistantProfile(targetId);
    setConfig((prev) => ({ ...prev, activeAssistantId: targetId }));
    const switchText =
      targetId === 'zara'
        ? 'Connected back to Main Zara Assistant (Personal AI OS).'
        : `Connected to ${profile.name} (${profile.disclosureText}). Say "disconnect assistant" or tap Back to Zara anytime to return to Main Zara.`;
    setHomeStatusBanner(`Active Assistant: ${profile.shortLabel}`);
    appendActiveMessages((prev) => [
      ...prev,
      {
        id: `switch-${Date.now()}`,
        sender: 'zara',
        text: switchText,
        timestamp: getMobileClockSnapshot().shortTime12,
        createdAtMs: Date.now(),
        language,
        assistantId: targetId,
        assistantLabel: profile.shortLabel,
      },
    ]);
    if (announceVoice) {
      audioService.selfHealAudioPipeline();
      await audioService.speakText(switchText, {
        language: language === 'auto' ? 'english' : language,
        pitch: config.voicePitch,
        rate: config.voiceSpeed,
        voiceName:
          targetId === 'zara' ? config.voiceName || 'Zephyr' : profile.defaultVoice,
        loveMode: false,
      });
    }
    return switchText;
  };

  // Handle sending a text, Gallery/Camera photo, or recognized voice command
  const handleSendMessage = async (
    userText: string,
    attachedImageDataUrl?: string,
    isMacroStep = false
  ): Promise<string> => {
    let effectiveImageDataUrl = attachedImageDataUrl;
    const camSnapCheck = !effectiveImageDataUrl ? detectCameraFrontBackCommand(userText) : null;
    if (camSnapCheck?.action === 'snap_photo') {
      setHomeStatusBanner('Capturing Front/Back Camera photo & sending to Zara...');
      const snapped = await zaraVision.snapPhotoFromLens(camSnapCheck.facingHint);
      if (snapped?.dataUrl) {
        effectiveImageDataUrl = snapped.dataUrl;
      }
    }

    const displayUserText =
      userText.trim() ||
      (effectiveImageDataUrl ? 'یہ تصویر دیکھو زارا اور بتاؤ اس میں کیا نظر آ رہا ہے؟' : '');
    if (!displayUserText) return '';

    markStudioTaskProgress(displayUserText, 'working');

    const passiveMood = detectMoodFromText(displayUserText);
    if (passiveMood) {
      setCurrentMood(passiveMood);
    }

    const nowSnap = getMobileClockSnapshot();
    if (!isMacroStep) {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'user',
        text: displayUserText,
        imageUrl: effectiveImageDataUrl,
        timestamp: nowSnap.shortTime12,
        createdAtMs: Date.now(),
      };
      capture100DayMemoryIfNotable(displayUserText);
      appendActiveMessages((prev) => [...prev, userMsg]);
    }

    // Check AI-to-AI assistant switching commands ("connect me with Mother Assistant", "back to Zara", etc.)
    const assistantCmd = !effectiveImageDataUrl
      ? detectAssistantOrLanguageCommand(displayUserText)
      : null;
    if (assistantCmd?.type === 'switch_assistant' && assistantCmd.assistantId) {
      markStudioTaskProgress(displayUserText, 'completed');
      return await handleSwitchAssistant(assistantCmd.assistantId, config.autoSpeak);
    }

    if (!effectiveImageDataUrl) {
      const interceptedReply = await tryHandleSpecialIntercepts(displayUserText, isMacroStep);
      if (interceptedReply) {
        markStudioTaskProgress(displayUserText, 'completed');
        if (!detectAppBuilderCommand(displayUserText)) {
          appendActiveMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-z`,
              sender: 'zara',
              text: interceptedReply,
              timestamp: getMobileClockSnapshot().shortTime12,
              createdAtMs: Date.now(),
              language,
            },
          ]);
        }
        return interceptedReply;
      }
    }

    let scheduleNote = '';
    const parsedSched = !effectiveImageDataUrl ? detectScheduleCommandFromText(displayUserText) : null;
    if (parsedSched) {
      const newSched: AlarmScheduleItem = {
        id: `sched-${Date.now()}`,
        time24: parsedSched.time24,
        label: parsedSched.label,
        type: parsedSched.type,
        repeatDaily: true,
        enabled: true,
        createdAtMs: Date.now(),
      };
      setSchedules((prev) => [newSched, ...prev]);
      scheduleNote = `Alarm / Work Reminder SET for ${format24To12Hour(parsedSched.time24)} (${parsedSched.label})`;
      setHomeStatusBanner(`⏰ Set for ${format24To12Hour(parsedSched.time24)}: ${parsedSched.label}`);
    } else if (!effectiveImageDataUrl) {
      executeMobileAppCommand(displayUserText);
    }

    lastUserActivityAtRef.current = Date.now();
    hasUserInteractedRef.current = true;
    const isOwnerVerified = getOwnerAuthSnapshot().isOwnerVerified;
    const heartLockedNow = Boolean(config.heartLockEnabled && !config.heartLockUnlocked);
    const activeAssistantId: AiAssistantId = config.activeAssistantId || 'zara';
    const activeAssistantProfile = getAssistantProfile(activeAssistantId);
    const effectiveVoiceForAssistant =
      activeAssistantId === 'zara'
        ? config.voiceName || 'Zephyr'
        : activeAssistantProfile.defaultVoice;
    const effectiveLoveMode =
      activeAssistantId === 'zara'
        ? Boolean(config.loveMode && !heartLockedNow)
        : false;
    const baseEmotionMode: ZaraEmotionMode =
      activeAssistantId === 'zara'
        ? heartLockedNow
          ? 'calm'
          : config.emotionMode || 'apnapan'
        : 'calm';

    const moodShift =
      effectiveLoveMode && !effectiveImageDataUrl
        ? detectMoodShiftFromInput(displayUserText, baseEmotionMode)
        : { nextMood: baseEmotionMode, changed: false, reasonPromptNote: '' };

    const effectiveEmotionMode: ZaraEmotionMode = effectiveLoveMode ? moodShift.nextMood : baseEmotionMode;
    if (effectiveLoveMode && moodShift.changed) {
      setConfig((prev) => ({ ...prev, emotionMode: moodShift.nextMood }));
    }

    const activeMemList = isOwnerVerified ? ownerMemories : deviceMemories;

    // 100% OFFLINE LOCAL BRAIN EXECUTION ("نیٹ آن ہو یا آف، ایپ پراپرلی کام کرے")
    if (!isAppOnline()) {
      const offlineRes = await runOfflineZaraBrain({
        userText: displayUserText,
        language,
        isOwnerVerified,
        userNickname: config.userNickname || 'Friend',
        loveMode: effectiveLoveMode,
        schedules,
        workTasks,
        memories: !heartLockedNow ? activeMemList : [],
      });
      const offlineMsg: ChatMessage = {
        id: `${Date.now() + 1}-off`,
        sender: 'zara',
        text: offlineRes.replyText,
        timestamp: getMobileClockSnapshot().shortTime12,
        createdAtMs: Date.now(),
        language,
        assistantId: activeAssistantId,
        assistantLabel: activeAssistantProfile.shortLabel,
      };
      appendActiveMessages((prev) => [...prev, offlineMsg]);
      markStudioTaskProgress(displayUserText, 'completed');
      setHomeStatusBanner('Offline Local Brain · Task Completed ✓');
      if (config.autoSpeak) {
        audioService.selfHealAudioPipeline();
        await audioService.speakText(offlineRes.replyText, {
          language,
          pitch: config.voicePitch,
          rate: config.voiceSpeed,
          voiceName: effectiveVoiceForAssistant,
          loveMode: effectiveLoveMode,
          romanceIntensity: effectiveLoveMode ? config.romanceIntensity : 'calm',
          emotionMode: effectiveEmotionMode,
        });
      }
      return offlineRes.replyText;
    }

    const activeThread = isOwnerVerified ? ownerMessages : guestMessages;
    const historySnapshot = activeThread.slice(-22).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    try {
      let payloadImageBase64: string | undefined;
      let payloadImageMime: string | undefined;
      let payloadVisionSource: string | undefined;

      if (effectiveImageDataUrl) {
        const commaIdx = effectiveImageDataUrl.indexOf(',');
        const header = commaIdx >= 0 ? effectiveImageDataUrl.slice(0, commaIdx) : '';
        const mimeMatch = header.match(/data:([^;]+);/);
        payloadImageBase64 =
          commaIdx >= 0 ? effectiveImageDataUrl.slice(commaIdx + 1) : effectiveImageDataUrl;
        payloadImageMime = mimeMatch?.[1] || 'image/jpeg';
        payloadVisionSource = 'uploaded_photo';
      } else {
        const activeFrame = zaraVision.captureFrameBase64();
        payloadImageBase64 = activeFrame?.base64;
        payloadVisionSource = activeFrame?.source;
      }

      const authHeaders = await getOwnerAuthHeaders();

      const contextualMemoryDigest = !heartLockedNow
        ? buildMemoryAndScheduleDigest(activeMemList, activeThread, schedules, displayUserText)
        : '';

      const res = await fetchWithContainerWakeup(
        '/api/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...getTierRequestHeaders(),
          },
          body: JSON.stringify({
            message: displayUserText,
            imageBase64: payloadImageBase64,
            imageMimeType: payloadImageMime,
            visionSource: payloadVisionSource,
            history: historySnapshot,
            language,
            assistantId: activeAssistantId,
            preferredReplyLanguage: config.preferredReplyLanguage || '',
            loveMode: effectiveLoveMode,
            affectionLevel: config.affectionLevel,
            obedienceLevel: config.obedienceLevel,
            romanceIntensity: effectiveLoveMode ? config.romanceIntensity : 'calm',
            emotionMode: effectiveEmotionMode,
            unfilteredBoldTalk: effectiveLoveMode ? (config.unfilteredBoldTalk ?? true) : false,
            userNickname: config.userNickname || 'Friend',
            voiceName: effectiveVoiceForAssistant,
            memoryDigest: contextualMemoryDigest,
            scheduleNote,
            skipServerTts: true,
            brainMode: config.brainMode || 'auto',
            ttsEngine: config.ttsEngine || 'hunter_tts_ultra_premium',
            enabledAiEngines: config.enabledAiEngines,
            moodTransitionNote: moodShift.reasonPromptNote || '',
          }),
        },
        {
          maxWakeRetries: 3,
          onWakingUp: () =>
            setHomeStatusBanner('Zara server waking up — connecting automatically...'),
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const serverVerified = Boolean(data.ownerVerified);
      const replyText =
        data.text ||
        (serverVerified
          ? 'جی میری جان، میں دل و جان سے آپ کے ساتھ ہوں!'
          : 'नमस्ते! मैं आपकी मदद के लिए तैयार हूँ।');
      const serverAudio: string | null = data.audio || null;
      const replyAssistantId: AiAssistantId = data.assistantId || activeAssistantId;
      const replyAssistantLabel: string = data.assistantLabel || activeAssistantProfile.shortLabel;

      if (data.deviceAction?.action === 'drop_call') {
        audioService.stopAudio();
      } else if (data.deviceAction?.action === 'close_zara') {
        handleCloseZaraAppNow();
      } else if (data.deviceAction?.action === 'back') {
        handleGoBackCommand(false);
      } else if (
        data.deviceAction?.appId &&
        !parsedSched &&
        !effectiveImageDataUrl &&
        !detectMobileCommandFromText(displayUserText)
      ) {
        executeMobileAppCommand(
          data.deviceAction.appId,
          data.deviceAction.action === 'close' ? 'close' : 'open'
        );
      }

      const zaraMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'zara',
        text: replyText,
        timestamp: getMobileClockSnapshot().shortTime12,
        createdAtMs: Date.now(),
        language,
        assistantId: replyAssistantId,
        assistantLabel: replyAssistantLabel,
        detectedLanguage: data.detectedLanguage || undefined,
        sources: Array.isArray(data.sources) ? data.sources : undefined,
      };

      appendActiveMessages((prev) => [...prev, zaraMsg]);
      markStudioTaskProgress(displayUserText, 'completed');
      setHomeStatusBanner(null);

      if (config.autoSpeak) {
        audioService.selfHealAudioPipeline();
        await audioService.speakText(replyText, {
          language,
          pitch: config.voicePitch,
          rate: config.voiceSpeed,
          voiceName:
            replyAssistantId === 'zara'
              ? config.voiceName || 'Zephyr'
              : getAssistantProfile(replyAssistantId).defaultVoice,
          loveMode: serverVerified && replyAssistantId === 'zara' && !heartLockedNow ? config.loveMode : false,
          romanceIntensity:
            serverVerified && replyAssistantId === 'zara' && !heartLockedNow
              ? config.romanceIntensity
              : 'calm',
          emotionMode:
            serverVerified && replyAssistantId === 'zara' && !heartLockedNow
              ? config.emotionMode || 'apnapan'
              : 'calm',
          base64Audio: serverAudio,
        });
      }

      return replyText;
    } catch {
      // Seamless Instant Offline Fallback if Internet drops mid-request!
      const verifiedNow = ownerAuthRef.current.isOwnerVerified;
      const offlineFallback = await runOfflineZaraBrain({
        userText: displayUserText,
        language,
        isOwnerVerified: verifiedNow,
        userNickname: verifiedNow ? config.userNickname : 'Friend',
        loveMode: verifiedNow ? config.loveMode : false,
        schedules,
        workTasks,
        memories: verifiedNow ? ownerMemories : [],
      });
      appendActiveMessages((prev) => [
        ...prev,
        {
          id: `${Date.now() + 2}-off`,
          sender: 'zara',
          text: offlineFallback.replyText,
          timestamp: getMobileClockSnapshot().shortTime12,
          createdAtMs: Date.now(),
          language,
        },
      ]);
      markStudioTaskProgress(displayUserText, 'completed');
      setHomeStatusBanner('Offline Local Brain · Answered Without Internet ✓');
      if (config.autoSpeak) {
        audioService.selfHealAudioPipeline();
        await audioService.speakText(offlineFallback.replyText, {
          language,
          pitch: config.voicePitch,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
          loveMode: verifiedNow ? config.loveMode : false,
        });
      }
      return offlineFallback.replyText;
    }
  };

  const handleAskZaraAboutVision = async (customPrompt?: string) => {
    const promptToSend =
      customPrompt ||
      (visionMode === 'screen'
        ? 'Zara look closely at my mobile screen and tell me what app or content you see on it.'
        : cameraFacing === 'environment'
        ? 'Zara look through my mobile back camera and tell me what you see in front of me.'
        : 'Zara look at me through the front camera and tell me how I look and what is around me.');
    setHomeStatusBanner('Zara is looking closely and replying...');
    await handleSendMessage(promptToSend);
    setHomeStatusBanner(null);
  };

  // Send a recorded 16kHz RIFF WAV or Zero-Touch Lock-Screen audio clip + optional Camera/Screen frame to /api/voice-chat
  const handleSendAudioWav = async (
    wavBase64: string,
    mimeType = 'audio/wav',
    isAutoRetry = false
  ) => {
    setIsThinkingHome(true);
    markStudioTaskProgress('Live Voice Command', 'working');
    setHomeStatusBanner('Zara & AI Team heard your voice — executing...');

    lastUserActivityAtRef.current = Date.now();
    hasUserInteractedRef.current = true;
    try {
      const isOwnerVerified = getOwnerAuthSnapshot().isOwnerVerified;
      const heartLockedNow = Boolean(config.heartLockEnabled && !config.heartLockUnlocked);
      const effectiveLoveVoice = Boolean(config.loveMode && !heartLockedNow);
      const effectiveEmotionVoice = heartLockedNow ? 'calm' : config.emotionMode || 'apnapan';
      const activeMemList = isOwnerVerified ? ownerMemories : deviceMemories;

      if (!isAppOnline()) {
        const offlineVoice = await runOfflineZaraBrain({
          userText: 'Zara offline voice status',
          language,
          isOwnerVerified,
          userNickname: config.userNickname || 'Friend',
          loveMode: effectiveLoveVoice,
          schedules,
          workTasks,
          memories: !heartLockedNow ? activeMemList : [],
        });
        markStudioTaskProgress('Offline Voice Ready', 'completed');
        setHomeStatusBanner('Offline Voice Active · Zara & AI Team Listening');
        await audioService.speakText(offlineVoice.replyText, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
          loveMode: effectiveLoveVoice,
          emotionMode: effectiveEmotionVoice,
        });
        return;
      }

      const activeThread = isOwnerVerified ? ownerMessages : guestMessages;
      const historySnapshot = activeThread.slice(-22).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const activeFrame = zaraVision.captureFrameBase64();
      const authHeaders = await getOwnerAuthHeaders();

      const activeAssistantId: AiAssistantId = config.activeAssistantId || 'zara';
      const activeAssistantProfile = getAssistantProfile(activeAssistantId);
      const effectiveVoiceForAssistant =
        activeAssistantId === 'zara'
          ? config.voiceName || 'Zephyr'
          : activeAssistantProfile.defaultVoice;

      const contextualVoiceDigest = !heartLockedNow
        ? buildMemoryAndScheduleDigest(activeMemList, activeThread, schedules, 'voice command')
        : '';

      const voiceController = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const voiceAbortTimer = voiceController
        ? window.setTimeout(() => voiceController.abort(), 42_000)
        : null;

      let res: Response;
      try {
        res = await fetchWithContainerWakeup(
          '/api/voice-chat',
          {
            method: 'POST',
            signal: voiceController ? voiceController.signal : undefined,
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
              ...getTierRequestHeaders(),
            },
            body: JSON.stringify({
              audioBase64: wavBase64,
              mimeType: mimeType || 'audio/wav',
              imageBase64: activeFrame?.base64,
              visionSource: activeFrame?.source,
              history: historySnapshot,
              language,
              assistantId: activeAssistantId,
              preferredReplyLanguage: config.preferredReplyLanguage || '',
              loveMode: effectiveLoveVoice && activeAssistantId === 'zara',
              affectionLevel: config.affectionLevel,
              obedienceLevel: config.obedienceLevel,
              romanceIntensity:
                effectiveLoveVoice && activeAssistantId === 'zara'
                  ? config.romanceIntensity
                  : 'calm',
              emotionMode: activeAssistantId === 'zara' ? effectiveEmotionVoice : 'calm',
              unfilteredBoldTalk:
                effectiveLoveVoice && activeAssistantId === 'zara'
                  ? config.unfilteredBoldTalk ?? true
                  : false,
              userNickname: config.userNickname || 'Friend',
              voiceName: effectiveVoiceForAssistant,
              memoryDigest: contextualVoiceDigest,
              allowClientInterceptFastPath: false,
              hasPendingConfirm: Boolean(pendingConfirmAction),
              brainMode: config.brainMode || 'auto',
              ttsEngine: config.ttsEngine || 'hunter_tts_ultra_premium',
              enabledAiEngines: config.enabledAiEngines,
            }),
          },
          {
            maxWakeRetries: 3,
            onWakingUp: () =>
              setHomeStatusBanner('Zara voice server waking up — connecting automatically...'),
          }
        );
      } finally {
        if (voiceAbortTimer) window.clearTimeout(voiceAbortTimer);
      }

      if (res.ok) {
        const data = await res.json();
        if (data.silence) {
          setHomeStatusBanner('آواز بہت ہلکی تھی — دوبارہ بولیں (Voice ON ✓)');
          return;
        }

        const serverVerified = Boolean(data.ownerVerified);
        const heard = data.userTranscription || '';
        const replyAssistantId: AiAssistantId = data.assistantId || activeAssistantId;
        const replyAssistantLabel: string =
          data.assistantLabel || activeAssistantProfile.shortLabel;
        let reply =
          data.zaraReply ||
          (serverVerified
            ? 'جی میری جان، میں آپ کی بات سن رہی ہوں!'
            : 'जी दोस्त, मैं आपकी बात सुन रही हूँ!');
        const timeLabel = getMobileClockSnapshot().shortTime12;
        const nowId = Date.now();

        if (heard) {
          if (
            securityOverlayRef.current === 'zara_closed' &&
            !/(close|band|off|بند|کلوز|آف|बंद|क्लोज)/i.test(heard)
          ) {
            setSecurityOverlayMode(null);
          }
          capture100DayMemoryIfNotable(heard);
          const heardMood = detectMoodFromText(heard);
          if (heardMood) {
            setCurrentMood(heardMood);
          }
          if (serverVerified && activeAssistantId === 'zara' && config.loveMode && !heartLockedNow) {
            const voiceShift = detectMoodShiftFromInput(heard, config.emotionMode || 'apnapan');
            if (voiceShift.changed) {
              setConfig((prev) => ({ ...prev, emotionMode: voiceShift.nextMood }));
            }
          }

          // Voice command switching between the 6 AI Assistants
          const voiceAssistantCmd = detectAssistantOrLanguageCommand(heard);
          if (voiceAssistantCmd?.type === 'switch_assistant' && voiceAssistantCmd.assistantId) {
            appendActiveMessages((prev) => [
              ...prev,
              {
                id: `${nowId}-u`,
                sender: 'user',
                text: heard,
                timestamp: timeLabel,
                createdAtMs: nowId,
                language,
              },
            ]);
            await handleSwitchAssistant(voiceAssistantCmd.assistantId, true);
            setHomeStatusBanner(null);
            return;
          }

          // Route spoken photo-snap or multi-step macro commands through handleSendMessage
          if (
            detectCameraFrontBackCommand(heard)?.action === 'snap_photo' ||
            splitCompoundMacroSteps(heard).length >= 2
          ) {
            setHomeStatusBanner(null);
            await handleSendMessage(heard);
            return;
          }

          const specialReply = await tryHandleSpecialIntercepts(heard);
          if (specialReply) {
            appendActiveMessages((prev) => [
              ...prev,
              {
                id: `${nowId}-u`,
                sender: 'user',
                text: heard,
                timestamp: timeLabel,
                createdAtMs: nowId,
                language,
              },
              ...(detectAppBuilderCommand(heard)
                ? []
                : [
                    {
                      id: `${nowId}-z`,
                      sender: 'zara' as const,
                      text: specialReply,
                      timestamp: timeLabel,
                      createdAtMs: nowId + 1,
                      language,
                      assistantId: replyAssistantId,
                      assistantLabel: replyAssistantLabel,
                    },
                  ]),
            ]);
            setHomeStatusBanner(null);
            return;
          }

          const parsedVoiceSched = detectScheduleCommandFromText(heard);
          if (parsedVoiceSched) {
            const newSched: AlarmScheduleItem = {
              id: `sched-${nowId}`,
              time24: parsedVoiceSched.time24,
              label: parsedVoiceSched.label,
              type: parsedVoiceSched.type,
              repeatDaily: true,
              enabled: true,
              createdAtMs: nowId,
            };
            setSchedules((prev) => [newSched, ...prev]);
            reply = serverVerified
              ? `جی میری جان! میں نے ${format24To12Hour(parsedVoiceSched.time24)} کا الارم سیٹ کر لیا ہے (${parsedVoiceSched.label})، وقت ہوتے ہی میں خود آپ کو بتاؤں گی!`
              : `جی دوست! میں نے ${format24To12Hour(parsedVoiceSched.time24)} کا الارم سیٹ کر لیا ہے (${parsedVoiceSched.label})!`;
          } else {
            executeMobileAppCommand(heard);
          }
        }

        if (
          data.deviceAction?.appId &&
          (!heard ||
            (!detectScheduleCommandFromText(heard) && !detectMobileCommandFromText(heard)))
        ) {
          if (data.deviceAction.action === 'drop_call') {
            audioService.stopAudio();
          } else if (data.deviceAction.action === 'close_zara') {
            handleCloseZaraAppNow();
          } else if (data.deviceAction.action === 'back') {
            handleGoBackCommand(false);
          } else {
            executeMobileAppCommand(
              data.deviceAction.appId,
              data.deviceAction.action === 'close' ? 'close' : 'open'
            );
          }
        }

        appendActiveMessages((prev) => [
          ...prev,
          ...(heard
            ? [
                {
                  id: `${nowId}-u`,
                  sender: 'user' as const,
                  text: heard,
                  timestamp: timeLabel,
                  createdAtMs: nowId,
                  language,
                  detectedLanguage: data.detectedLanguage || undefined,
                },
              ]
            : []),
          {
            id: `${nowId}-z`,
            sender: 'zara' as const,
            text: reply,
            timestamp: timeLabel,
            createdAtMs: nowId + 1,
            language,
            assistantId: replyAssistantId,
            assistantLabel: replyAssistantLabel,
            detectedLanguage: data.detectedLanguage || undefined,
            sources: Array.isArray(data.sources) ? data.sources : undefined,
          },
        ]);

        markStudioTaskProgress(heard || 'Voice Command', 'completed');
        setHomeStatusBanner(null);

        audioService.selfHealAudioPipeline();
        await audioService.speakText(reply, {
          language,
          pitch: config.voicePitch,
          rate: config.voiceSpeed,
          voiceName:
            replyAssistantId === 'zara'
              ? config.voiceName || 'Zephyr'
              : getAssistantProfile(replyAssistantId).defaultVoice,
          loveMode:
            serverVerified && replyAssistantId === 'zara' && !heartLockedNow
              ? config.loveMode
              : false,
          romanceIntensity:
            serverVerified && replyAssistantId === 'zara' && !heartLockedNow
              ? config.romanceIntensity
              : 'calm',
          emotionMode:
            serverVerified && replyAssistantId === 'zara' && !heartLockedNow
              ? config.emotionMode || 'apnapan'
              : 'calm',
          base64Audio: heard && detectScheduleCommandFromText(heard) ? undefined : data.audio,
        });
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      if (!isAutoRetry) {
        setHomeStatusBanner('Reconnecting voice server & retrying automatically...');
        zaraSelfHealEngine.enqueueFailedTaskForAutoExecution(
          'Auto-retry voice command',
          async () => {
            await sendWavRef.current(wavBase64, mimeType, true);
          }
        );
      } else {
        const verifiedNow = ownerAuthRef.current.isOwnerVerified;
        const heartLockedFallback = Boolean(config.heartLockEnabled && !config.heartLockUnlocked);
        const offlineVoice = await runOfflineZaraBrain({
          userText: 'Zara please answer me clearly in simple Urdu.',
          language,
          isOwnerVerified: verifiedNow,
          userNickname: verifiedNow ? config.userNickname : 'Friend',
          loveMode: verifiedNow && !heartLockedFallback ? config.loveMode : false,
          schedules,
          workTasks,
          memories: !heartLockedFallback && verifiedNow ? ownerMemories : [],
        });
        appendActiveMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-voice-fb`,
            sender: 'zara',
            text: offlineVoice.replyText,
            timestamp: getMobileClockSnapshot().shortTime12,
            createdAtMs: Date.now(),
            language,
          },
        ]);
        setHomeStatusBanner('Offline Local Brain · Answered Ready ✓');
        if (config.autoSpeak) {
          audioService.selfHealAudioPipeline();
          await audioService.speakText(offlineVoice.replyText, {
            language,
            pitch: config.voicePitch,
            rate: config.voiceSpeed,
            voiceName: config.voiceName || 'Zephyr',
            loveMode: verifiedNow && !heartLockedFallback ? config.loveMode : false,
          });
        }
      }
    } finally {
      setIsThinkingHome(false);
    }
  };

  // Keep latest handlers & overlay state in refs for Always-On 24/7 Hands-Free & Lock-Screen Voice Commander
  const sendMsgRef = useRef(handleSendMessage);
  const sendWavRef = useRef(handleSendAudioWav);
  const securityOverlayRef = useRef(securityOverlayMode);
  useEffect(() => {
    sendMsgRef.current = handleSendMessage;
    sendWavRef.current = handleSendAudioWav;
    securityOverlayRef.current = securityOverlayMode;
  });

  // Mount & Manage Always-On Zero-Touch Voice Commander (Works without touching mobile, Lock Screen, Side, or Background!)
  useEffect(() => {
    const listener = new AlwaysOnVoiceListener(
      {
        onStateChange: (active) => setIsAlwaysOnRunning(active),
        onInterimText: (txt) => setInterimVoiceText(txt),
        onCommandTranscript: async (finalText) => {
          if (
            securityOverlayRef.current === 'zara_closed' &&
            !/(close|band|off|بند|کلوز|آف|बंद|क्लोज)/i.test(finalText)
          ) {
            setSecurityOverlayMode(null);
          }
          audioService.selfHealAudioPipeline();
          setIsThinkingHome(true);
          try {
            await sendMsgRef.current(finalText);
          } finally {
            setIsThinkingHome(false);
          }
        },
        onAudioWavFallback: async (wavB64, mime) => {
          audioService.selfHealAudioPipeline();
          await sendWavRef.current(wavB64, mime);
        },
        onVolume: (v) => setHomeMicVol(v),
        onPermissionError: (msg) => {
          setHomeStatusBanner(msg);
          setNeedsPermissionSetup(true);
        },
        onWakeWordTriggered: (phrase) => {
          setHomeStatusBanner(`🎤 Wake-Word "${phrase}" heard — listening...`);
        },
      },
      language
    );

    listener.setWakeWordConfig(
      Boolean(securityConfig.wakeWordOnlyMode),
      securityConfig.customWakeWord || 'hey zara'
    );
    alwaysOnRef.current = listener;

    let savedContinuousOn = false;
    try {
      savedContinuousOn = localStorage.getItem(ALWAYS_ON_VOICE_KEY) === '1';
    } catch {}

    const blockedBySecurity =
      isPinLocked ||
      securityOverlayMode === 'intruder_lockout' ||
      securityOverlayMode === 'owner_face_scan';

    // Only auto-start on load if mic permission was previously granted AND user left continuous mode ON
    if (
      savedContinuousOn &&
      !blockedBySecurity &&
      typeof navigator !== 'undefined' &&
      navigator.permissions?.query
    ) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((perm) => {
          if (perm.state === 'granted' && alwaysOnRef.current) {
            setAlwaysOnVoiceEnabled(true);
            alwaysOnRef.current.start();
          }
        })
        .catch(() => {});
    }

    // Unlock Web Audio cleanly on first touch without racing against the Voice ON/OFF button onClick
    const unlockOnFirstTouch = () => {
      audioService.unlock();
    };
    window.addEventListener('pointerdown', unlockOnFirstTouch, { once: true });
    window.addEventListener('keydown', unlockOnFirstTouch, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockOnFirstTouch);
      window.removeEventListener('keydown', unlockOnFirstTouch);
      listener.dispose();
      alwaysOnRef.current = null;
    };
  }, []);

  useEffect(() => {
    alwaysOnRef.current?.setLanguage(language);
  }, [language]);

  // Keep 24/7 Voice Commander running even in 'zara_closed' Standby & Minimized Background!
  // Only stop if disabled or locked by PIN/Intruder, and pause temporarily during direct capture.
  useEffect(() => {
    if (!alwaysOnRef.current) return;
    const blockedBySecurity =
      isPinLocked ||
      securityOverlayMode === 'intruder_lockout' ||
      securityOverlayMode === 'owner_face_scan';

    if (!alwaysOnVoiceEnabled || blockedBySecurity) {
      alwaysOnRef.current.stop();
      return;
    }
    if (isHomeMicActive || showAudioCall) {
      alwaysOnRef.current.setPaused(true);
    } else {
      if (!alwaysOnRef.current.isRunning()) {
        alwaysOnRef.current.start();
      } else {
        alwaysOnRef.current.setPaused(false);
      }
    }
  }, [alwaysOnVoiceEnabled, isHomeMicActive, showAudioCall, securityOverlayMode, isPinLocked]);

  useEffect(() => {
    return () => {
      homeMicRef.current?.stopAndDiscard();
    };
  }, []);

  const handleToggleAlwaysOnVoice = async () => {
    audioService.unlock();
    const next = !alwaysOnVoiceEnabled;
    setAlwaysOnVoiceEnabled(next);
    if (next) {
      audioService.playChime('activate');
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      await alwaysOnRef.current?.start();
      setHomeStatusBanner(
        '24/7 Voice Commander ON — Zara hears you on Side, Lock Screen & Background!'
      );
    } else {
      audioService.playChime('tap');
      alwaysOnRef.current?.stop();
      syncForegroundVoiceNotification(false).catch(() => {});
      setHomeStatusBanner('Background & Lock-Screen Voice Listening disabled.');
    }
  };

  const handleToggleFloatPiP = async () => {
    audioService.unlock();
    screenKeepAlive.enable();
    const res = await floatingCirclePiP.toggleFloatingCircle();
    if (res.active) {
      setHomeStatusBanner(
        'Zara Floating Window ON — switch to Home Screen or any app and call out to Zara!'
      );
    } else if (!res.ok && res.message) {
      setHomeStatusBanner(res.message);
    } else {
      setHomeStatusBanner(null);
    }
  };

  // Steady Direct Mic toggle on Home / BottomNav
  const handleToggleDirectMic = async () => {
    audioService.unlock();

    if (isHomeMicActive) {
      const wav = homeMicRef.current?.finishAndGetWav();
      setIsHomeMicActive(false);
      setHomeMicVol(0);
      if (wav) {
        await handleSendAudioWav(wav);
      } else {
        setHomeStatusBanner(null);
      }
      return;
    }

    audioService.stopAudio();
    audioService.playChime('activate');
    setHomeStatusBanner(
      'Mic ON — say WhatsApp message, "Back karo", "Close karo", or any command!'
    );

    const session = new DirectMicSession();
    homeMicRef.current = session;
    setIsHomeMicActive(true);

    const ok = await session.start({
      onVolume: (v) => setHomeMicVol(v),
      onAutoFinish: async (wav) => {
        setIsHomeMicActive(false);
        setHomeMicVol(0);
        await handleSendAudioWav(wav);
      },
      onError: (msg) => {
        setIsHomeMicActive(false);
        setHomeMicVol(0);
        setHomeStatusBanner(msg);
        setNeedsPermissionSetup(true);
      },
    });

    if (!ok) {
      setIsHomeMicActive(false);
    } else {
      setNeedsPermissionSetup(false);
    }
  };

  // Single Master Assistant ON / OFF Button Handler (Continuous Listen -> Answer -> Speak -> Listen loop)
  const handleToggleFrontMicMaster = async () => {
    if (voiceToggleBusyRef.current) return;
    voiceToggleBusyRef.current = true;
    try {
      audioService.unlock();
      const micCurrentlyOpen = alwaysOnVoiceEnabled || isAlwaysOnRunning || isHomeMicActive;

      if (micCurrentlyOpen) {
        audioService.stopAudio();
        audioService.playChime('tap');
        setAlwaysOnVoiceEnabled(false);
        try {
          localStorage.setItem(ALWAYS_ON_VOICE_KEY, '0');
        } catch {}
        alwaysOnRef.current?.stop();
        homeMicRef.current?.stopAndDiscard();
        setIsAlwaysOnRunning(false);
        setIsHomeMicActive(false);
        setHomeMicVol(0);
        setInterimVoiceText('');
        setIsThinkingHome(false);
        syncForegroundVoiceNotification(false).catch(() => {});
        setHomeStatusBanner(
          'Assistant OFF — Tap ON anytime for continuous hands-free listening & replies.'
        );
        return;
      }

      audioService.stopAudio();
      audioService.playChime('activate');
      setAlwaysOnVoiceEnabled(true);
      try {
        localStorage.setItem(ALWAYS_ON_VOICE_KEY, '1');
      } catch {}
      await screenKeepAlive.enable();
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      const alwaysOnStarted = (await alwaysOnRef.current?.start()) ?? false;

      if (!alwaysOnStarted) {
        // Fallback: try direct single-turn mic session cleanly if continuous pipeline failed
        const fallbackSession = new DirectMicSession();
        homeMicRef.current = fallbackSession;
        const directOk = await fallbackSession.start({
          onVolume: (v) => setHomeMicVol(v),
          onAutoFinish: async (wav) => {
            setIsHomeMicActive(false);
            setHomeMicVol(0);
            await sendWavRef.current(wav);
          },
          onError: (msg) => {
            setIsHomeMicActive(false);
            setHomeMicVol(0);
            setHomeStatusBanner(msg);
          },
        });

        if (directOk) {
          setAlwaysOnVoiceEnabled(false);
          setIsHomeMicActive(true);
          setNeedsPermissionSetup(false);
          setHomeStatusBanner('Mic ON — اب بولیں، میں سن رہی ہوں!');
        } else {
          setAlwaysOnVoiceEnabled(false);
          try {
            localStorage.setItem(ALWAYS_ON_VOICE_KEY, '0');
          } catch {}
          setNeedsPermissionSetup(true);
          setHomeStatusBanner(
            'Allow Microphone permission so Zara can listen continuously & reply.'
          );
        }
      } else {
        setNeedsPermissionSetup(false);
        setHomeStatusBanner(
          'Assistant ON — Zara is listening continuously and will answer by voice.'
        );
      }
    } finally {
      voiceToggleBusyRef.current = false;
    }
  };

  // Dedicated Front ('user') & Back ('environment') Camera Switch + 1-Tap Photo Snap to Chat
  const handleSelectCameraLens = async (facing: CameraFacing) => {
    audioService.unlock();
    audioService.playChime('activate');

    if (visionMode === 'camera' && cameraFacing === facing && isManualCameraPreview) {
      setIsManualCameraPreview(false);
      zaraVision.stop();
      setHomeStatusBanner(null);
      return;
    }

    setIsManualCameraPreview(true);
    const res = await zaraVision.startCamera(facing);
    if (res.ok) {
      setNeedsPermissionSetup(false);
      const isBack = res.facing === 'environment';
      setHomeStatusBanner(
        isBack
          ? 'Back Camera ON — Zara is viewing through rear camera!'
          : 'Front Camera ON — Zara is looking right at you live!'
      );
      window.setTimeout(() => {
        handleAskZaraAboutVision(
          isBack
            ? 'Zara look through my mobile back camera and tell me what scene or object you see in front of me.'
            : 'Zara look at me through the front selfie camera and tell me how I look right now.'
        );
      }, 900);
    } else if (res.error) {
      setIsManualCameraPreview(false);
      setHomeStatusBanner(res.error);
      setMobileControlTab('permissions');
      setShowMobileControl(true);
    }
  };

  const handleSnapCameraPhoto = async (facing: CameraFacing): Promise<string | null> => {
    audioService.unlock();
    audioService.playChime('tap');
    const snapped = await zaraVision.snapPhotoFromLens(facing);
    if (!snapped?.dataUrl) {
      setHomeStatusBanner('Allow Camera permission to snap & send photos.');
      setMobileControlTab('permissions');
      setShowMobileControl(true);
      return null;
    }
    return snapped.dataUrl;
  };

  const handleSnapCameraToChat = async (): Promise<void> => {
    audioService.unlock();
    audioService.playChime('activate');
    const targetLens: CameraFacing =
      visionMode === 'camera' ? cameraFacing : cameraFacing || 'user';
    setHomeStatusBanner(
      `Snapping ${targetLens === 'environment' ? 'Back' : 'Front'} Camera photo & sending to Zara...`
    );
    const snapped = await zaraVision.snapPhotoFromLens(targetLens);
    if (!snapped?.dataUrl) {
      setHomeStatusBanner('Allow Camera permission so Zara can snap & analyze photos.');
      setMobileControlTab('permissions');
      setShowMobileControl(true);
      return;
    }
    const autoCaption =
      snapped.facing === 'environment'
        ? 'زارا بیک کیمرے کی یہ تصویر دیکھو اور بتاؤ سامنے کیا نظر آ رہا ہے؟'
        : 'زارا فرنٹ کیمرے کی میری یہ تصویر دیکھو اور بتاؤ میں کیسا لگ رہا ہوں؟';
    setIsThinkingHome(true);
    try {
      await handleSendMessage(autoCaption, snapped.dataUrl);
    } finally {
      setIsThinkingHome(false);
      setHomeStatusBanner(null);
    }
  };

  const handleToggleHomeScreenShare = async () => {
    audioService.unlock();
    audioService.playChime('activate');
    if (visionMode === 'screen') {
      zaraVision.stop();
      setHomeStatusBanner(null);
      return;
    }
    const res = await zaraVision.startScreenShare();
    if (res.ok) {
      setHomeStatusBanner('Screen Share ON — Zara can see your mobile screen!');
      window.setTimeout(() => {
        handleAskZaraAboutVision();
      }, 1000);
    } else if (res.fallbackNeeded) {
      homeScreenInputRef.current?.click();
    }
  };

  const handleHomeScreenSnapshotPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        zaraVision.setUploadedScreenSnapshot(reader.result);
        window.setTimeout(() => {
          handleAskZaraAboutVision(
            'Zara look at my mobile screen and tell me what is shown on it.'
          );
        }, 300);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleQuickAllowAllHome = async () => {
    audioService.unlock();
    audioService.playChime('activate');
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    const res = await requestAllPermissionsMaster();
    if (res.micGranted) {
      setNeedsPermissionSetup(false);
      setSecurityConfig((prev) => ({ ...prev, allPermissionsGranted: true }));
      screenKeepAlive.enable();
      if (alwaysOnVoiceEnabled) {
        alwaysOnRef.current?.start();
      }
      setHomeStatusBanner(
        'All permissions enabled — Zara hears you on Side, Lock Screen & Background!'
      );
      audioService.speakText(
        ownerAuthRef.current.isOwnerVerified
          ? 'جی میرے مالک! مائیک اور بیک گراؤنڈ آڈیو سسٹم آن ہو گیا ہے، اب موبائل سائیڈ پر پڑا ہو یا اسکرین لاک ہو، آپ کی آواز سنتے ہی میں فوراً جواب دوں گی!'
          : 'جی دوست! مائیک اور بیک گراؤنڈ آڈیو سسٹم آن ہو گیا ہے!',
        {
          loveMode: ownerAuthRef.current.isOwnerVerified ? config.loveMode : false,
        }
      );
    } else {
      setMobileControlTab('permissions');
      setShowMobileControl(true);
    }
  };

  const handleEnableAllZaraFunctions = async () => {
    audioService.unlock();
    audioService.playChime('activate');
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    setConfig((prev) => ({
      ...prev,
      loveMode: true,
      unfilteredBoldTalk: true,
      ambientVisionEnabled: true,
      wakeWordEnabled: true,
      autoSpeak: true,
      proactiveSelfTalkEnabled: true,
      autoSelfCheckEnabled: true,
      showHudQuickBar: true,
    }));
    setSecurityConfig((prev) => ({
      ...prev,
      autoAppLaunch: true,
      voiceControlEnabled: true,
      privacyGuard: true,
      allPermissionsGranted: true,
      lowPowerWakeWordEnabled: true,
      accessibilityAutomationEnabled: true,
    }));
    setSpokenNotifConfig((prev) => ({
      ...prev,
      enabled: true,
      announceCalls: true,
      announceMessages: true,
    }));
    setAlwaysOnVoiceEnabled(true);
    try {
      localStorage.setItem(ALWAYS_ON_VOICE_KEY, '1');
    } catch {}
    screenKeepAlive.enable();
    await requestAllPermissionsMaster().catch(() => {});
    setNeedsPermissionSetup(false);
    await alwaysOnRef.current?.start().catch(() => {});
    setHomeStatusBanner('All Zara Functions ON ✓ (Voice, Moods, Self-Check, Alerts & Controls Ready)');
    audioService.speakText(
      'जी बिल्कुल! मैंने ज़ारा ऐप के सारे फंक्शन ऑन कर दिए हैं — वॉइस, इमोशंस, ऑटो अपडेट चेक, अलर्ट्स और सारे कंट्रोल्स अब पूरी तरह एक्टिव हैं!',
      {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
        loveMode: true,
        emotionMode: config.emotionMode || 'apnapan',
      }
    );
  };

  const handleAddMemory = (item: Omit<MemoryItem, 'id'>) => {
    const newMem: MemoryItem = {
      ...item,
      id: Date.now().toString(),
      createdAtMs: item.createdAtMs || Date.now(),
    };
    if (ownerAuthRef.current.isOwnerVerified) {
      setOwnerMemories((prev) => [newMem, ...prev]);
    } else {
      setDeviceMemories((prev) => [newMem, ...prev]);
    }
  };

  const handleUpdateMemory = (id: string, updates: Partial<MemoryItem>) => {
    if (ownerAuthRef.current.isOwnerVerified) {
      setOwnerMemories((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
    } else {
      setDeviceMemories((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
    }
  };

  const handleDeleteMemory = (id: string) => {
    if (ownerAuthRef.current.isOwnerVerified) {
      setOwnerMemories((prev) => prev.filter((m) => m.id !== id));
    } else {
      setDeviceMemories((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleAddSchedule = (item: Omit<AlarmScheduleItem, 'id' | 'createdAtMs'>) => {
    setSchedules((prev) => [
      { ...item, id: `sched-${Date.now()}`, createdAtMs: Date.now() },
      ...prev,
    ]);
  };

  const handleToggleSchedule = (id: string) => {
    audioService.playChime('tap');
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled, lastTriggeredDate: undefined } : s
      )
    );
  };

  const handleDeleteSchedule = (id: string) => {
    audioService.playChime('tap');
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSnoozeRingingAlarm = () => {
    if (!ringingSchedule) return;
    audioService.stopAudio();
    audioService.playChime('tap');
    const snoozeDate = new Date(Date.now() + 5 * 60 * 1000);
    const next24 = `${String(snoozeDate.getHours()).padStart(2, '0')}:${String(
      snoozeDate.getMinutes()
    ).padStart(2, '0')}`;
    setSchedules((prev) => [
      {
        id: `snooze-${Date.now()}`,
        time24: next24,
        label: `${ringingSchedule.label} (Snoozed)`,
        type: ringingSchedule.type,
        repeatDaily: false,
        enabled: true,
        createdAtMs: Date.now(),
      },
      ...prev,
    ]);
    setRingingSchedule(null);
  };

  const handleSendProfileToChat = () => {
    const profileText = formatZaraProfileShareText(playStoreLaunchUrl);
    const nowSnap = getMobileClockSnapshot();
    appendActiveMessages((prev) => [
      ...prev,
      {
        id: `profile-${Date.now()}`,
        sender: 'zara',
        text: profileText,
        timestamp: nowSnap.shortTime12,
        createdAtMs: Date.now(),
      },
    ]);
    setShowChatDrawer(true);
  };

  const handleVoiceTurnComplete = (userText: string, zaraText: string) => {
    const timeLabel = getMobileClockSnapshot().shortTime12;
    const nowId = Date.now();
    capture100DayMemoryIfNotable(userText);

    const buildCmd = detectAppBuilderCommand(userText);
    if (buildCmd) {
      handleBuildNewApp(buildCmd.prompt, buildCmd.category);
    }

    const parsedVoiceSched = detectScheduleCommandFromText(userText);
    if (parsedVoiceSched) {
      setSchedules((prev) => [
        {
          id: `sched-${nowId}`,
          time24: parsedVoiceSched.time24,
          label: parsedVoiceSched.label,
          type: parsedVoiceSched.type,
          repeatDaily: true,
          enabled: true,
          createdAtMs: nowId,
        },
        ...prev,
      ]);
    }
    appendActiveMessages((prev) => [
      ...prev,
      {
        id: `${nowId}-u`,
        sender: 'user',
        text: userText,
        timestamp: timeLabel,
        createdAtMs: nowId,
        language,
      },
      {
        id: `${nowId}-z`,
        sender: 'zara',
        text: zaraText,
        timestamp: timeLabel,
        createdAtMs: nowId + 1,
        language,
      },
    ]);
  };

  // 1. Owner Face Verification / Anti-Touch Intruder Screen Lock / Zara Standby Overlay
  if (securityOverlayMode) {
    return (
      <SecurityShieldOverlay
        mode={securityOverlayMode}
        ownerName={ownerAuth.isOwnerVerified ? securityConfig.ownerName || 'Owner' : 'Protected'}
        ownerFaceDataUrl={securityConfig.ownerFaceDataUrl}
        pinCode={securityConfig.pinCode || '1234'}
        biometricLockEnabled={securityConfig.biometricLockEnabled}
        biometricCredentialId={securityConfig.biometricCredentialId}
        intruderReason={intruderReason}
        backgroundVoiceActive={alwaysOnVoiceEnabled && isAlwaysOnRunning}
        onVerifiedOwner={handleOwnerVerifiedSuccess}
        onIntruderDetected={triggerIntruderLockout}
        onRepeatIntruderVoice={speakIntruderVoiceWarning}
        onReopenZaraFromClosed={() => {
          setSecurityOverlayMode(null);
        }}
      />
    );
  }

  // 2. Security PIN Lock Screen Overlay
  if (isPinLocked && securityConfig.pinEnabled) {
    return (
      <div className="min-h-screen w-full bg-[#04020e] flex items-center justify-center p-4 text-white">
        <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#130a2e] to-[#070316] border border-cyan-500/40 p-6 space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.3)] text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Zara Mobile Security</h1>
            <p className="text-xs text-slate-300 mt-1">
              Enter Owner 4-digit PIN
            </p>
          </div>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinEntry}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPinEntry(val);
              setPinError(false);
              if (val === (securityConfig.pinCode || '1234')) {
                audioService.unlock();
                audioService.playChime('activate');
                setPinEntry('');
                setIsPinLocked(false);
              } else if (val.length === 4) {
                setPinError(true);
                setPinEntry('');
                if (securityConfig.autoLockOnIntruder !== false) {
                  triggerIntruderLockout('Unauthorized login attempt with wrong PIN!');
                }
              }
            }}
            placeholder="••••"
            className="w-full py-3 rounded-2xl bg-slate-950 border border-cyan-500/40 text-center text-2xl tracking-[0.6em] font-mono text-cyan-200 focus:outline-none focus:border-pink-500"
          />
          {pinError && (
            <p className="text-xs text-rose-400 font-bold">
              Incorrect PIN! Security Alert Triggered.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full bg-[#060913] flex items-center justify-center ${
        isMobileFrame ? 'p-0 sm:p-4' : 'p-0'
      } text-slate-100 overflow-x-hidden relative selection:bg-sky-500 selection:text-slate-950`}
    >
      <div className="fixed inset-0 bg-command-grid opacity-70 pointer-events-none" />

      <input
        ref={homeScreenInputRef}
        type="file"
        accept="image/*"
        onChange={handleHomeScreenSnapshotPicked}
        className="hidden"
      />

      <ZaraSciFi3DHudDashboard
        isSpeaking={isSpeaking}
        isListening={(alwaysOnVoiceEnabled && isAlwaysOnRunning) || isHomeMicActive}
        isThinking={isThinkingHome}
        micVolume={homeMicVol}
        interimTranscript={interimVoiceText}
        subtitleText={homeStatusBanner || latestZaraMessage}
        messages={messages}
        config={config}
        onUpdateConfig={(updates) => setConfig((prev) => ({ ...prev, ...updates }))}
        onSendMessage={handleSendMessage}
        onSendAudioWav={handleSendAudioWav}
        onToggleMic={handleToggleFrontMicMaster}
        onEnableAllFunctions={handleEnableAllZaraFunctions}
        allFunctionsActive={Boolean(
          alwaysOnVoiceEnabled &&
            isAlwaysOnRunning &&
            config.autoSpeak &&
            config.wakeWordEnabled &&
            config.autoSelfCheckEnabled &&
            securityConfig.voiceControlEnabled
        )}
        onOpenAudioCall={() => {
          audioService.unlock();
          audioService.stopAudio();
          setShowAudioCall(true);
        }}
        onOpenSettings={() => openSettingsAtTab('controls')}
        securityConfig={securityConfig}
        isOwnerVerified={ownerAuth.isOwnerVerified}
        language={language}
        visionMode={visionMode}
        cameraFacing={cameraFacing}
        onStartCamera={() => handleSelectCameraLens('user')}
        onStopCamera={() => {
          setIsManualCameraPreview(false);
          zaraVision.stop();
          setHomeStatusBanner('Camera turned OFF.');
        }}
        onToggleScreenShare={handleToggleHomeScreenShare}
        onOpenDriverMode={() => setShowDriverMode(true)}
        onOpenFileManager={() => setShowFileManager(true)}
      />

      {/* Event-Only Floating Overlays (Alarms, Call/Msg Confirmations, Mic Permission Prompt) */}
      {(pendingConfirmAction ||
        pendingPcConfirm ||
        ringingSchedule ||
        antiTouchArmedLive ||
        isBuildingApp ||
        needsPermissionSetup ||
        appControlToast) && (
        <div className="pointer-events-none fixed top-16 inset-x-0 z-40 px-3 flex justify-center">
          <div className="pointer-events-auto w-full max-w-md flex flex-col gap-2">
            {pendingPcConfirm && (
              <div className="w-full p-3 rounded-2xl bg-rose-950/95 backdrop-blur-md border border-rose-400/80 shadow-2xl space-y-2.5">
                <div className="text-xs font-bold text-white">
                  Confirm Computer Action: {pendingPcConfirm.label}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingPcConfirm(null);
                      setHomeStatusBanner('Computer action cancelled.');
                    }}
                    className="min-h-[40px] rounded-xl bg-slate-900 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const act = pendingPcConfirm;
                      setPendingPcConfirm(null);
                      const res = await executeAuthorizedPcCommand(act.action, act.params, true);
                      setHomeStatusBanner(
                        res.ok ? `Executed: ${act.label}` : `Failed: ${res.error || 'Offline'}`
                      );
                    }}
                    className="min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white cursor-pointer"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
            {pendingConfirmAction && (
              <div className="w-full p-3 rounded-2xl bg-slate-950/95 backdrop-blur-md border border-emerald-400/80 shadow-2xl space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-white truncate">
                      {pendingConfirmAction.kind === 'message'
                        ? `Confirm Message · ${pendingConfirmAction.contactName}`
                        : `Confirm Call · ${pendingConfirmAction.contactName}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePickAndroidContactForPending}
                    className="min-h-[30px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-[10px] font-semibold text-cyan-200 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <UserCheck className="w-3 h-3 shrink-0" />
                    <span>Pick Contact</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <input
                    type="tel"
                    value={pendingConfirmAction.phone}
                    onChange={(e) =>
                      setPendingConfirmAction((prev) =>
                        prev ? { ...prev, phone: e.target.value } : null
                      )
                    }
                    placeholder="Phone e.g. +923001234567"
                    className="min-h-[36px] px-2.5 py-1 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                  />

                  {pendingConfirmAction.kind === 'message' && (
                    <select
                      value={pendingConfirmAction.messagingApp}
                      onChange={(e) =>
                        setPendingConfirmAction((prev) =>
                          prev
                            ? { ...prev, messagingApp: e.target.value as MessagingAppTarget }
                            : null
                        )
                      }
                      className="min-h-[36px] px-2.5 py-1 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="whatsapp_business">WhatsApp Business</option>
                      <option value="sms">SMS (Android Messages)</option>
                      <option value="telegram">Telegram</option>
                      <option value="messenger">Meta Messenger</option>
                    </select>
                  )}
                </div>

                {pendingConfirmAction.kind === 'message' && (
                  <textarea
                    rows={2}
                    value={pendingConfirmAction.messageBody || ''}
                    onChange={(e) =>
                      setPendingConfirmAction((prev) =>
                        prev ? { ...prev, messageBody: e.target.value } : null
                      )
                    }
                    placeholder="Dictated message (Urdu / Hindi / Punjabi / English)"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400 resize-none"
                  />
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingConfirmAction(null);
                      setHomeStatusBanner('Action cancelled.');
                    }}
                    className="min-h-[42px] py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-200 font-bold text-xs cursor-pointer"
                  >
                    Cancel (نہیں)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      audioService.unlock();
                      handleConfirmPendingAction(pendingConfirmAction);
                    }}
                    className="min-h-[42px] py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>
                      {pendingConfirmAction.kind === 'message' ? 'Confirm & Prepare' : 'Confirm Call'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {ringingSchedule && (
              <div className="w-full p-3 rounded-2xl bg-slate-950/92 backdrop-blur-md border border-amber-400/80 shadow-xl space-y-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AlarmClock className="w-5 h-5 text-amber-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-amber-200 tabular-nums">
                      Zara Time Alert · {format24To12Hour(ringingSchedule.time24)}
                    </div>
                    <div className="text-sm font-bold text-white truncate mt-0.5">
                      {ringingSchedule.label}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSnoozeRingingAlarm}
                    className="min-h-[42px] py-2 rounded-xl bg-slate-900 border border-amber-400/50 text-amber-200 font-bold text-xs cursor-pointer"
                  >
                    Snooze 5 Min
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      audioService.stopAudio();
                      setRingingSchedule(null);
                    }}
                    className="min-h-[42px] py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {antiTouchArmedLive && (
              <div className="w-full px-3 py-2 rounded-2xl bg-rose-950/90 backdrop-blur-md border border-rose-400/80 flex items-center gap-2 text-xs text-rose-100 font-semibold">
                <ShieldAlert className="w-4 h-4 text-rose-300 shrink-0" />
                <span>Anti-Touch Guard Armed — Any touch locks phone</span>
              </div>
            )}

            {isBuildingApp && (
              <div className="w-full px-3 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-sky-400/70 flex items-center gap-2 text-xs text-sky-100 font-semibold">
                <Code2 className="w-4 h-4 text-sky-300 animate-spin shrink-0" />
                <span>Zara is coding &amp; building your app...</span>
              </div>
            )}

            {needsPermissionSetup && (
              <div className="w-full p-2.5 rounded-2xl bg-slate-950/95 backdrop-blur-md border border-emerald-400/60 flex items-center justify-between gap-2 shadow-xl">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white">
                    Enable Microphone Permission
                  </div>
                  <div className="text-[11px] text-emerald-200 truncate">
                    Allows Zara to hear &amp; reply continuously
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickAllowAllHome}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shrink-0 whitespace-nowrap cursor-pointer"
                >
                  Allow Mic
                </button>
              </div>
            )}

            {appControlToast && (
              <div
                className={`w-full px-3 py-2 rounded-2xl backdrop-blur-md border flex items-center justify-between gap-2 ${
                  appControlToast.mode === 'close'
                    ? 'bg-rose-950/90 border-rose-400/80 text-rose-100'
                    : 'bg-emerald-950/90 border-emerald-400/80 text-emerald-100'
                }`}
              >
                <span className="text-xs font-semibold truncate">{appControlToast.label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {appControlToast.mode === 'open' && appControlToast.href && (
                    <>
                      {appControlToast.href.startsWith('#') ? (
                        <button
                          type="button"
                          onClick={() =>
                            appControlToast.app && openInAppMobileSetting(appControlToast.app.id)
                          }
                          className="min-h-[34px] px-2.5 py-1 rounded-lg bg-emerald-500 text-black font-bold text-[11px] cursor-pointer"
                        >
                          Open
                        </button>
                      ) : (
                        <a
                          href={appControlToast.fallbackHref || appControlToast.href}
                          target={isInIframe ? '_top' : '_self'}
                          rel="noopener noreferrer"
                          className="min-h-[34px] px-2.5 py-1 rounded-lg bg-emerald-500 text-black font-bold text-[11px] flex items-center gap-1 no-underline"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (appControlToast.app) {
                            handleCloseActiveCommand(appControlToast.app.id, true);
                          } else {
                            handleCloseActiveCommand('whatsapp', true);
                          }
                        }}
                        className="min-h-[34px] px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <PowerOff className="w-3 h-3" />
                        <span>Close</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setAppControlToast(null)}
                    className="min-h-[34px] text-xs text-slate-300 px-1.5 cursor-pointer"
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LAZY-LOADED MODALS (zero startup download overhead on mobile 4G!) */}
      <Suspense fallback={null}>
        {showMemories && (
          <MemoriesModal
            isOpen={showMemories}
            onClose={() => setShowMemories(false)}
            memories={memories}
            onAddMemory={handleAddMemory}
            onUpdateMemory={handleUpdateMemory}
            onDeleteMemory={handleDeleteMemory}
          />
        )}

        {showSoul && (
          <SoulModal
            isOpen={showSoul}
            onClose={() => setShowSoul(false)}
            config={config}
            ownerPinCode={securityConfig.pinCode}
            onUpdateConfig={(updates) => setConfig((prev) => ({ ...prev, ...updates }))}
          />
        )}

        {showData && (
          <DataModal
            isOpen={showData}
            onClose={() => setShowData(false)}
            selectedLanguage={language}
            onSelectLanguage={setLanguage}
          />
        )}

        {showStats && (
          <StatsModal
            isOpen={showStats}
            onClose={() => setShowStats(false)}
            affectionLevel={config.affectionLevel}
          />
        )}

        {showSettings && (
          <SettingsModal
            isOpen={showSettings}
            initialTab={settingsInitialTab}
            onClose={() => setShowSettings(false)}
            config={config}
            onUpdateConfig={(updates) => setConfig((prev) => ({ ...prev, ...updates }))}
            securityConfig={securityConfig}
            onUpdateSecurity={(updates) =>
              setSecurityConfig((prev) => ({ ...prev, ...updates }))
            }
            onTriggerFaceScanNow={() => setSecurityOverlayMode('owner_face_scan')}
            onArmAntiTouchGuard={handleArmAntiTouchGuard}
            onLockPhoneScreenNow={() => {
              setIntruderReason('Locked immediately by Owner');
              setSecurityOverlayMode('intruder_lockout');
            }}
            onCloseZaraAppNow={handleCloseZaraAppNow}
            language={language}
            onSelectLanguage={setLanguage}
            isMobileFrame={isMobileFrame}
            onToggleMobileFrame={() => setIsMobileFrame(!isMobileFrame)}
            downloadLinkUrl={playStoreLaunchUrl}
            isInstalled={isInstalled}
            onOpenInstall={() => {
              setAutoStartPlayDownload(true);
              setShowInstallModal(true);
            }}
            onOpenMobileControl={() => {
              setHighlightedSettingId(null);
              setMobileControlTab('settings');
              setShowMobileControl(true);
            }}
            onOpenMobilePermissions={() => {
              setHighlightedSettingId(null);
              setMobileControlTab('permissions');
              setShowMobileControl(true);
            }}
            schedules={schedules}
            onAddSchedule={handleAddSchedule}
            onToggleSchedule={handleToggleSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onTestScheduleVoice={triggerScheduleVoiceAlert}
            memories={memories}
            onAddMemory={handleAddMemory}
            onUpdateMemory={handleUpdateMemory}
            onDeleteMemory={handleDeleteMemory}
            onOpenDriverMode={() => setShowDriverMode(true)}
            onOpenFileManager={() => setShowFileManager(true)}
            onSendProfileToChat={handleSendProfileToChat}
            builtApps={builtApps}
            isBuildingApp={isBuildingApp}
            onBuildNewApp={handleBuildNewApp}
            onOpenBuiltAppPreview={(app) => setActivePreviewApp(app)}
            onDeleteBuiltApp={(id) => setBuiltApps((prev) => prev.filter((b) => b.id !== id))}
            alwaysOnVoiceEnabled={alwaysOnVoiceEnabled}
            isAlwaysOnRunning={isAlwaysOnRunning}
            isDirectMicActive={isHomeMicActive}
            isSelfHealing={isSelfHealing}
            visionMode={visionMode}
            cameraFacing={cameraFacing}
            isFloatingPiP={isFloatingPiP}
            autoGestureWatch={autoGestureWatch}
            spokenAlertsEnabled={spokenNotifConfig.enabled}
            latestZaraMessage={latestZaraMessage}
            onToggleAlwaysOnVoice={handleToggleAlwaysOnVoice}
            onToggleDirectMic={handleToggleDirectMic}
            onToggleFloatPiP={handleToggleFloatPiP}
            onOpenChat={() => setShowChatDrawer(true)}
            onSendInlineChat={async (txt, photoUrl) => {
              setIsThinkingHome(true);
              try {
                await handleSendMessage(txt, photoUrl);
              } finally {
                setIsThinkingHome(false);
              }
            }}
            onSelectCameraLens={handleSelectCameraLens}
            onSnapCameraToChat={handleSnapCameraToChat}
            onToggleScreenShare={handleToggleHomeScreenShare}
            onTriggerSelfHeal={() => {
              handleTriggerSelfHeal(true);
            }}
            onOpenMoodGesture={() => {
              setMoodWorkInitialTab('mood_gesture');
              setShowMoodWorkModal(true);
            }}
            onOpenAdvancedWork={() => {
              setMoodWorkInitialTab('work');
              setShowMoodWorkModal(true);
            }}
            onTriggerBack={() => handleGoBackCommand(true)}
            onTriggerClose={() => handleCloseActiveCommand(undefined, true)}
            onOpenProjectFiles={() => setShowProjectExport(true)}
            onOpenAvatarPicker={() => {
              setNotifModalTab('alerts');
              setShowNotifications(true);
            }}
            onOpenSpokenAlerts={() => {
              setNotifModalTab('alerts');
              setShowNotifications(true);
            }}
            onOpenAiStudio={(tab) => {
              setAiStudioTab(tab || 'office');
              setShowAiStudio(true);
            }}
            onReplayLastReply={() => {
              audioService.selfHealAudioPipeline();
              audioService.speakText(latestZaraMessage, {
                language,
                rate: config.voiceSpeed,
                voiceName: config.voiceName || 'Zephyr',
                loveMode: config.loveMode,
                romanceIntensity: config.romanceIntensity,
                emotionMode: config.emotionMode || 'apnapan',
              });
            }}
            onEnableAllFunctions={handleEnableAllZaraFunctions}
          />
        )}

        {showMobileControl && (
          <MobileControlModal
            isOpen={showMobileControl}
            onClose={() => setShowMobileControl(false)}
            initialTab={mobileControlTab}
            highlightedSettingId={highlightedSettingId}
            visionMode={visionMode}
            securityConfig={securityConfig}
            onUpdateSecurity={(updates) =>
              setSecurityConfig((prev) => ({ ...prev, ...updates }))
            }
            onAskZaraAboutVision={handleAskZaraAboutVision}
            onLockNow={() => {
              setIntruderReason('Locked via Mobile Security Hub');
              setSecurityOverlayMode('intruder_lockout');
            }}
          />
        )}

        {showNotifications && (
          <NotificationsModal
            isOpen={showNotifications}
            initialTab={notifModalTab}
            onClose={() => setShowNotifications(false)}
            language={language}
            voiceName={config.voiceName}
            spokenConfig={spokenNotifConfig}
            onUpdateSpokenConfig={(updates) =>
              setSpokenNotifConfig((prev) => ({ ...prev, ...updates }))
            }
            notifications={incomingNotifs}
            onSimulateIncomingAlert={handleIncomingNotificationEvent}
            onClearNotifications={() => setIncomingNotifs([])}
            onRepeatLastNotification={() => {
              handleRepeatLastNotification();
            }}
            alwaysOnVoiceEnabled={alwaysOnVoiceEnabled}
            onToggleAlwaysOnVoice={handleToggleAlwaysOnVoice}
            selectedPortraitId={config.portraitId}
            onSelectPortrait={(portraitId) =>
              setConfig((prev) => ({ ...prev, portraitId }))
            }
          />
        )}

        {showChatDrawer && (
          <ChatDrawer
            isOpen={showChatDrawer}
            onClose={() => setShowChatDrawer(false)}
            messages={messages}
            onSendMessage={handleSendMessage}
            onSendAudioWav={handleSendAudioWav}
            onSnapCameraPhoto={handleSnapCameraPhoto}
            language={language}
            voiceName={config.voiceName}
            activeAssistantId={config.activeAssistantId || 'zara'}
            onSelectAssistant={(id) => {
              handleSwitchAssistant(id, false);
            }}
            loveMode={config.loveMode}
            romanceIntensity={config.romanceIntensity}
            onOpenBuiltAppById={(id) => {
              const found = builtApps.find((b) => b.id === id);
              if (found) setActivePreviewApp(found);
            }}
          />
        )}

        {activePreviewApp && (
          <BuiltAppPreviewModal
            app={activePreviewApp}
            onClose={() => setActivePreviewApp(null)}
          />
        )}

        {showInstallModal && (
          <PWAInstallModal
            isOpen={showInstallModal}
            onClose={() => {
              setShowInstallModal(false);
              setAutoStartPlayDownload(false);
            }}
            autoStartDownload={autoStartPlayDownload}
            onOpenMobileSettings={() => {
              setHighlightedSettingId(null);
              setMobileControlTab('settings');
              setShowMobileControl(true);
            }}
          />
        )}

        {showMoodWorkModal && (
          <MoodGestureWorkModal
            isOpen={showMoodWorkModal}
            initialTab={moodWorkInitialTab}
            onClose={() => setShowMoodWorkModal(false)}
            currentMood={currentMood}
            lastGesture={lastGesture}
            autoGestureWatch={autoGestureWatch}
            onToggleAutoGestureWatch={handleToggleAutoGestureWatch}
            onMoodGestureDetected={(res) => {
              handleMoodGestureDetected(res, false);
            }}
            workTasks={workTasks}
            onAddWorkTask={handleAddWorkTask}
            onToggleWorkTask={handleToggleWorkTask}
            onDeleteWorkTask={handleDeleteWorkTask}
            userNickname={config.userNickname || 'Friend'}
            voiceName={config.voiceName || 'Zephyr'}
            language={language}
            voiceSpeed={config.voiceSpeed}
          />
        )}

        {showProjectExport && (
          <ZaraProjectExportModal
            isOpen={showProjectExport}
            onClose={() => setShowProjectExport(false)}
          />
        )}

        {showAiStudio && (
          <AdvancedAiStudioModal
            isOpen={showAiStudio}
            onClose={() => setShowAiStudio(false)}
            initialTab={aiStudioTab}
            config={config}
            onUpdateConfig={(updates) => setConfig((prev) => ({ ...prev, ...updates }))}
            language={language}
            isOwnerVerified={ownerAuth.isOwnerVerified}
            onSendToChat={(txt) => {
              handleSendMessage(txt);
            }}
          />
        )}
        {showAudioCall && (
          <VoiceCallModal
            isOpen={showAudioCall}
            audioOnly={true}
            onClose={() => setShowAudioCall(false)}
            onCloseZaraApp={handleCloseZaraAppNow}
            config={config}
            onUpdateConfig={(updates) => setConfig((prev) => ({ ...prev, ...updates }))}
            language={language}
            messages={messages}
            visionMode={visionMode}
            autoAppLaunch={securityConfig.autoAppLaunch}
            memoryDigest={memoryDigest}
            isOwnerVerified={ownerAuth.isOwnerVerified}
            onVoiceTurnComplete={handleVoiceTurnComplete}
            onOpenMobileSettings={(settingId) => openInAppMobileSetting(settingId)}
            onRequestCallOrMessageConfirmation={(transcript) => {
              const cand = detectCallOrMessageWithConfirmation(transcript);
              if (cand) {
                setPendingConfirmAction(cand);
              }
            }}
          />
        )}

        {showDriverMode && (
          <DriverModeModal
            isOpen={showDriverMode}
            onClose={() => setShowDriverMode(false)}
            isListening={(alwaysOnVoiceEnabled && isAlwaysOnRunning) || isHomeMicActive}
            isSpeaking={isSpeaking}
            isThinking={isThinkingHome}
            interimTranscript={interimVoiceText}
            latestZaraMessage={latestZaraMessage}
            latestNotification={incomingNotifs[0] || null}
            spokenConfig={spokenNotifConfig}
            onUpdateSpokenConfig={(updates) =>
              setSpokenNotifConfig((prev) => ({ ...prev, ...updates }))
            }
            onToggleMic={handleToggleFrontMicMaster}
            onSendVoicePrompt={async (prompt) => {
              await handleSendMessage(prompt);
            }}
            language={language}
            config={config}
            isOwnerVerified={ownerAuth.isOwnerVerified}
          />
        )}

        {showFileManager && (
          <FileManagerModal
            isOpen={showFileManager}
            onClose={() => setShowFileManager(false)}
            memories={memories}
            language={language}
            voiceName={config.voiceName}
          />
        )}
      </Suspense>
    </div>
  );
}
