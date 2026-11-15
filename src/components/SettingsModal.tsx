import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Settings,
  Volume2,
  User,
  Smartphone,
  Sparkles,
  Download,
  ShieldCheck,
  ShieldAlert,
  ScanFace,
  Lock,
  Code2,
  Activity,
  AlarmClock,
  Heart,
  Flame,
  BookOpen,
  Plus,
  Trash2,
  Copy,
  Check,
  Send,
  PowerOff,
  ExternalLink,
  PhoneCall,
  PhoneOff,
  MessageSquare,
  Mic,
  Square,
  Play,
  Camera,
  RefreshCw,
  CircleDot,
  Share2,
  ArrowLeft,
  Bell,
  Briefcase,
  Eye,
  FileArchive,
  Flashlight,
  Image as ImageIcon,
  ImagePlus,
  MonitorUp,
  PictureInPicture2,
  Power,
  Smile,
  SwitchCamera,
  Fingerprint,
  MapPin,
  HardDrive,
  BatteryCharging,
  Layers,
  Car,
  FolderOpen,
  Monitor,
  Pencil,
  Search,
  AlertTriangle,
  Crown,
  Globe,
  Palette,
} from 'lucide-react';
import {
  AiBrainEngineId,
  AlarmScheduleItem,
  BuiltAppItem,
  CameraFacing,
  DiagnosticCheckItem,
  IntruderAlertEvent,
  Language,
  MemoryCategory,
  MemoryItem,
  PersonalityConfig,
  ProTierEntitlement,
  SecurityAndControlConfig,
  SettingsTabId,
  TtsEngineId,
  VisionMode,
  WhatsAppContactItem,
  ZaraEmotionMode,
  ZaraUiThemeId,
  ZaraUpdateReport,
  ZaraVoiceGender,
  ZaraVoiceName,
  ZARA_VOICE_PROFILES,
  getVoiceGenderFromName,
} from '../types';
import { zaraSelfHealEngine } from '../services/selfHealAndMacroService';
import type { AiStudioTab } from './AdvancedAiStudioModal';
import {
  PLAY_BILLING_SKUS,
  activateProTier,
  downgradeToStandardTier,
  fetchProTierStatus,
  getCachedTierEntitlement,
  getTierPlanBadgeLabel,
  launchNativePlayProPurchase,
} from '../services/proTierService';
import { audioService } from '../services/audioService';
import {
  BRAIN_ENGINE_OPTIONS,
  TTS_ENGINE_OPTIONS,
  updateAiOrchestratorConfig,
} from '../services/aiOrchestratorService';
import { DirectMicSession } from '../services/voiceCaptureService';
import { compressImageToJpeg } from '../services/selfHealAndMacroService';
import {
  NativeAndroidAutomationStatus,
  ZARA_LIVE_APK_CONFIG,
  copySelectedOrFullText,
  getNativeAndroidAutomationStatus,
  openAndroidSystemPermissionScreen,
  performAndroidAccessibilityAction,
  setNativeLowPowerWakeWord,
} from '../services/androidAssistantBridgeService';
import {
  getFlashlightState,
  isAppOnline,
  subscribeFlashlightState,
  subscribeNetworkStatus,
  toggleMobileFlashlight,
} from '../services/offlineBrainService';
import {
  MobileAppDefinition,
  MobilePermissionsStatus,
  closeMobileAppNow,
  getAllMobileApps,
  launchMobileAppNow,
  queryMobilePermissions,
  requestAllPermissionsMaster,
  subscribeRunningApps,
  zaraVision,
} from '../services/visionAndControlService';
import {
  ZARA_COMPLETE_PROFILE,
  format24To12Hour,
  formatMemoryAgeBadge,
  formatZaraProfileShareText,
  getMobileClockSnapshot,
} from '../services/scheduleAndMemoryService';
import {
  captureVideoFrameDataUrl,
  clearIntruderLogs,
  endExternalCallNow,
  isPlatformBiometricSupported,
  loadIntruderLogs,
  loadWhatsAppContacts,
  normalizeInternationalPhone,
  openWhatsAppNumberText,
  pickPhoneContactsNative,
  registerOwnerBiometricPasskey,
  runFullZaraAndMobileDiagnostics,
  saveWhatsAppContacts,
  startWhatsAppOrPhoneCall,
  subscribeExternalCall,
  verifyOwnerBiometricPasskey,
} from '../services/ownerSecurityAndBuilderService';
import {
  OwnerAuthSnapshot,
  engageGuestSafeLock,
  getOwnerAuthSnapshot,
  signInOwnerWithGoogle,
  subscribeOwnerAuth,
} from '../services/ownerAuthService';

interface SettingsModalProps {
  isOpen: boolean;
  initialTab?: SettingsTabId;
  onClose: () => void;
  config: PersonalityConfig;
  onUpdateConfig: (newConfig: Partial<PersonalityConfig>) => void;
  securityConfig: SecurityAndControlConfig;
  onUpdateSecurity: (updates: Partial<SecurityAndControlConfig>) => void;
  onTriggerFaceScanNow: () => void;
  onArmAntiTouchGuard: () => void;
  onLockPhoneScreenNow: () => void;
  onCloseZaraAppNow: () => void;
  language: Language;
  onSelectLanguage: (lang: Language) => void;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
  downloadLinkUrl: string;
  isInstalled: boolean;
  onOpenInstall: () => void;
  onOpenMobileControl: () => void;
  onOpenMobilePermissions?: () => void;
  schedules: AlarmScheduleItem[];
  onAddSchedule: (item: Omit<AlarmScheduleItem, 'id' | 'createdAtMs'>) => void;
  onToggleSchedule: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
  onTestScheduleVoice: (item: AlarmScheduleItem) => void;
  memories: MemoryItem[];
  onAddMemory: (item: Omit<MemoryItem, 'id'>) => void;
  onUpdateMemory?: (id: string, updates: Partial<MemoryItem>) => void;
  onDeleteMemory: (id: string) => void;
  onSendProfileToChat: () => void;
  builtApps: BuiltAppItem[];
  isBuildingApp: boolean;
  onBuildNewApp: (
    prompt: string,
    category: 'game' | 'station' | 'app' | 'utility'
  ) => Promise<void>;
  onOpenBuiltAppPreview: (app: BuiltAppItem) => void;
  onDeleteBuiltApp: (id: string) => void;
  // All Former Bottom-Bar Controls Moved into Settings ("جتنے بھی نیچے بٹن ہیں اس کو سیٹنگ میں کنورٹ کر دو")
  alwaysOnVoiceEnabled?: boolean;
  isAlwaysOnRunning?: boolean;
  isDirectMicActive?: boolean;
  isSelfHealing?: boolean;
  visionMode?: VisionMode;
  cameraFacing?: CameraFacing;
  isFloatingPiP?: boolean;
  autoGestureWatch?: boolean;
  spokenAlertsEnabled?: boolean;
  latestZaraMessage?: string;
  onToggleAlwaysOnVoice?: () => void;
  onToggleDirectMic?: () => void;
  onToggleFloatPiP?: () => void;
  onOpenChat?: () => void;
  onSendInlineChat?: (text: string, attachedPhotoDataUrl?: string) => Promise<void>;
  onSelectCameraLens?: (facing: CameraFacing) => void;
  onSnapCameraToChat?: () => Promise<void>;
  onToggleScreenShare?: () => void;
  onTriggerSelfHeal?: () => void;
  onOpenMoodGesture?: () => void;
  onOpenAdvancedWork?: () => void;
  onTriggerBack?: () => void;
  onTriggerClose?: () => void;
  onOpenProjectFiles?: () => void;
  onOpenAvatarPicker?: () => void;
  onOpenSpokenAlerts?: () => void;
  onReplayLastReply?: () => void;
  onOpenAiStudio?: (tab?: AiStudioTab) => void;
  onOpenDriverMode?: () => void;
  onOpenFileManager?: () => void;
  onEnableAllFunctions?: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  initialTab = 'controls',
  onClose,
  config,
  onUpdateConfig,
  securityConfig,
  onUpdateSecurity,
  onTriggerFaceScanNow,
  onArmAntiTouchGuard,
  onLockPhoneScreenNow,
  onCloseZaraAppNow,
  language,
  onSelectLanguage,
  isMobileFrame,
  onToggleMobileFrame,
  downloadLinkUrl,
  isInstalled,
  onOpenInstall,
  onOpenMobileControl,
  onOpenMobilePermissions,
  schedules,
  onAddSchedule,
  onToggleSchedule,
  onDeleteSchedule,
  onTestScheduleVoice,
  memories,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  onSendProfileToChat,
  builtApps,
  isBuildingApp,
  onBuildNewApp,
  onOpenBuiltAppPreview,
  onDeleteBuiltApp,
  alwaysOnVoiceEnabled = true,
  isAlwaysOnRunning = false,
  isSelfHealing = false,
  visionMode = 'off',
  cameraFacing = 'user',
  isFloatingPiP = false,
  autoGestureWatch = false,
  spokenAlertsEnabled = false,
  latestZaraMessage = '',
  onToggleAlwaysOnVoice,
  onToggleFloatPiP,
  onOpenChat,
  onSendInlineChat,
  onSelectCameraLens,
  onSnapCameraToChat,
  onToggleScreenShare,
  onTriggerSelfHeal,
  onOpenMoodGesture,
  onOpenAdvancedWork,
  onTriggerBack,
  onTriggerClose,
  onOpenProjectFiles,
  onOpenAvatarPicker,
  onOpenSpokenAlerts,
  onReplayLastReply,
  onOpenAiStudio,
  onOpenDriverMode,
  onOpenFileManager,
  onEnableAllFunctions,
}) => {
  const [ownerAuth, setOwnerAuth] = useState<OwnerAuthSnapshot>(() => getOwnerAuthSnapshot());
  const [tab, setTab] = useState<SettingsTabId>(() => initialTab);
  const [ownerAuthNotice, setOwnerAuthNotice] = useState<string | null>(null);
  const [isVerifyingOwner, setIsVerifyingOwner] = useState(false);
  const [enablingAllBusy, setEnablingAllBusy] = useState(false);
  const [torchActive, setTorchActive] = useState<boolean>(() => getFlashlightState());
  const [onlineState, setOnlineState] = useState<boolean>(() => isAppOnline());
  const [quickChatText, setQuickChatText] = useState('');
  const [quickPhotoDataUrl, setQuickPhotoDataUrl] = useState<string | null>(null);
  const [isSendingInline, setIsSendingInline] = useState(false);
  const [copiedReplyLabel, setCopiedReplyLabel] = useState<string | null>(null);
  const settingsPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const initialNick =
    !config.userNickname || config.userNickname === 'جان' || config.userNickname === 'जान'
      ? 'My Love'
      : config.userNickname;
  const [nickname, setNickname] = useState(initialNick);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  // Apps, WhatsApp Number Dialer & Play Store state
  const [allApps, setAllApps] = useState<MobileAppDefinition[]>([]);
  const [runningAppIds, setRunningAppIds] = useState<string[]>([]);
  const [appSearch, setAppSearch] = useState('');
  const [appToast, setAppToast] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedProfile, setCopiedProfile] = useState(false);

  // WhatsApp Direct Number / Contact / General Text & Call state
  const [waPhone, setWaPhone] = useState('');
  const [waContactName, setWaContactName] = useState('');
  const [waMessage, setWaMessage] = useState('Assalam o Alaikum!');
  const [waContacts, setWaContacts] = useState<WhatsAppContactItem[]>(() => loadWhatsAppContacts());
  const [activeCallNum, setActiveCallNum] = useState<string | null>(null);

  // Security, Permissions, Biometrics & Owner Face Enrollment state
  const [pinDraft, setPinDraft] = useState(securityConfig.pinCode || '1234');
  const [isEnrollingFace, setIsEnrollingFace] = useState(false);
  const [enrollCamReady, setEnrollCamReady] = useState(false);
  const [intruderLogs, setIntruderLogs] = useState<IntruderAlertEvent[]>([]);
  const [mobilePerms, setMobilePerms] = useState<MobilePermissionsStatus | null>(null);
  const [bioHardwareSupported, setBioHardwareSupported] = useState<boolean>(false);
  const [isRegisteringBio, setIsRegisteringBio] = useState(false);
  const [nativeAuto, setNativeAuto] = useState<NativeAndroidAutomationStatus>(() =>
    getNativeAndroidAutomationStatus()
  );
  const [wakePhraseDraft, setWakePhraseDraft] = useState(
    securityConfig.customWakeWord || 'hey zara'
  );
  const [proTier, setProTier] = useState<ProTierEntitlement>(() => getCachedTierEntitlement());
  const [proTierBusy, setProTierBusy] = useState(false);
  const [proTierNote, setProTierNote] = useState<string | null>(null);
  const [selfUpdateBusy, setSelfUpdateBusy] = useState(false);
  const [liveUpdateReport, setLiveUpdateReport] = useState<ZaraUpdateReport | null>(null);
  const [selfUpdateMessage, setSelfUpdateMessage] = useState<string | null>(null);
  const enrollVideoRef = useRef<HTMLVideoElement | null>(null);
  const enrollStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProTierStatus().then(setProTier).catch(() => {});
      zaraSelfHealEngine.fetchUpdateCheckReport().then((r) => {
        if (r) setLiveUpdateReport(r);
      }).catch(() => {});
    }
  }, [isOpen]);

  // AI App / Game / Station Builder state
  const [builderPrompt, setBuilderPrompt] = useState('');
  const [builderCategory, setBuilderCategory] = useState<'game' | 'station' | 'app' | 'utility'>(
    'game'
  );
  const [isBuilderMicOn, setIsBuilderMicOn] = useState(false);
  const builderMicRef = useRef<DirectMicSession | null>(null);

  // Diagnostics / Health Doctor state
  const [diagChecks, setDiagChecks] = useState<DiagnosticCheckItem[]>([]);
  const [diagSummary, setDiagSummary] = useState<string>('');
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  // Live Clock & Alarm Schedule form state
  const [clock, setClock] = useState(() => getMobileClockSnapshot());
  const [schedTime, setSchedTime] = useState('09:00');
  const [schedLabel, setSchedLabel] = useState('Kaam par jana hai');
  const [schedType, setSchedType] = useState<'work' | 'alarm' | 'reminder'>('work');
  const [schedDaily, setSchedDaily] = useState(true);

  // 100+ Day Memory form & explicit confirmation state
  const [memTitle, setMemTitle] = useState('');
  const [memDetails, setMemDetails] = useState('');
  const [memCategory, setMemCategory] = useState<MemoryCategory>('romantic');
  const [memSearch, setMemSearch] = useState('');
  const [confirmDeleteMem, setConfirmDeleteMem] = useState<MemoryItem | null>(null);
  const [editingMemId, setEditingMemId] = useState<string | null>(null);
  const [editMemTitle, setEditMemTitle] = useState('');
  const [editMemDetails, setEditMemDetails] = useState('');

  const stopEnrollCamera = () => {
    if (enrollStreamRef.current) {
      enrollStreamRef.current.getTracks().forEach((t) => t.stop());
      enrollStreamRef.current = null;
    }
    setEnrollCamReady(false);
    setIsEnrollingFace(false);
  };

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setAllApps(getAllMobileApps());
      setIntruderLogs(loadIntruderLogs());
      setWaContacts(loadWhatsAppContacts());
      setPinDraft(securityConfig.pinCode || '1234');
      setWakePhraseDraft(securityConfig.customWakeWord || 'hey zara');
      setNativeAuto(getNativeAndroidAutomationStatus());
      setAppToast(null);
      queryMobilePermissions().then(setMobilePerms).catch(() => {});
      isPlatformBiometricSupported().then(setBioHardwareSupported).catch(() => {});
    } else {
      stopEnrollCamera();
      builderMicRef.current?.stopAndDiscard();
      setIsBuilderMicOn(false);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (isOpen && tab === 'diagnostics' && diagChecks.length === 0 && !isRunningDiag) {
      handleRunHealthDoctor(false);
    }
  }, [isOpen, tab]);

  useEffect(() => {
    return subscribeRunningApps(setRunningAppIds);
  }, []);

  useEffect(() => {
    return subscribeExternalCall(setActiveCallNum);
  }, []);

  useEffect(() => {
    return subscribeOwnerAuth(setOwnerAuth);
  }, []);

  useEffect(() => {
    return subscribeFlashlightState(setTorchActive);
  }, []);

  useEffect(() => {
    return subscribeNetworkStatus(setOnlineState);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setInterval(() => {
      setClock(getMobileClockSnapshot());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopEnrollCamera();
      builderMicRef.current?.stopAndDiscard();
    };
  }, []);

  if (!isOpen) return null;

  // WhatsApp Direct Actions (works with phone number OR opens WhatsApp chat chooser when blank!)
  const handleWhatsAppSendText = (e: React.FormEvent) => {
    e.preventDefault();
    audioService.unlock();
    audioService.playChime('activate');
    const res = openWhatsAppNumberText(waPhone.trim(), waMessage);
    if (res.cleanPhone) {
      setAppToast(`Opening WhatsApp message to +${res.cleanPhone} ✓`);
      audioService.speakText(
        `جی میرے مالک! میں نے واٹس ایپ کھول کر نمبر ${waPhone} پر میسج تیار کر دیا ہے!`,
        { language, rate: config.voiceSpeed, voiceName: config.voiceName || 'Zephyr' }
      );
    } else {
      setAppToast('Opening WhatsApp chat chooser with your message ready ✓');
      audioService.speakText(
        'جی میرے مالک! میں نے واٹس ایپ اوپن کر کے آپ کا میسج لکھ دیا ہے!',
        { language, rate: config.voiceSpeed, voiceName: config.voiceName || 'Zephyr' }
      );
    }
  };

  const handleSaveWaContact = () => {
    const cleanP = normalizeInternationalPhone(waPhone);
    const cleanN = waContactName.trim();
    if (!cleanN || cleanP.length < 7) {
      setAppToast('Enter both Contact Name and Phone Number to save for voice messaging.');
      return;
    }
    audioService.playChime('tap');
    const updated: WhatsAppContactItem[] = [
      { id: `wa-${Date.now()}`, name: cleanN, phone: cleanP },
      ...waContacts.filter((c) => c.name.toLowerCase() !== cleanN.toLowerCase()),
    ];
    setWaContacts(updated);
    saveWhatsAppContacts(updated);
    setWaContactName('');
    setAppToast(`Saved "${cleanN}" (+${cleanP}) — now say "${cleanN} ko WhatsApp pe message karo..."!`);
  };

  const handlePickNativePhoneContacts = async () => {
    audioService.playChime('tap');
    const picked = await pickPhoneContactsNative();
    if (picked.length > 0) {
      const merged = [...picked, ...waContacts];
      setWaContacts(merged);
      saveWhatsAppContacts(merged);
      setWaPhone(picked[0].phone);
      setAppToast(`Imported ${picked.length} WhatsApp contact(s) from your phone ✓`);
    } else {
      setAppToast('Type Name + Number above and tap Save Contact so Zara knows them by voice.');
    }
  };

  const handleWhatsAppStartCall = (mode: 'whatsapp' | 'tel') => {
    if (!waPhone.trim()) {
      setAppToast('Please enter a mobile/WhatsApp number first.');
      return;
    }
    audioService.unlock();
    audioService.playChime('call_connect');
    const res = startWhatsAppOrPhoneCall(waPhone, mode);
    setAppToast(
      `${mode === 'whatsapp' ? 'WhatsApp Call' : 'Phone Call'} dialing +${res.cleanPhone} ✓`
    );
    audioService.speakText(
      `جی میرے مالک! نمبر ${waPhone} کو کال ملا رہی ہوں!`,
      { language, rate: config.voiceSpeed, voiceName: config.voiceName || 'Zephyr' }
    );
  };

  const handleWhatsAppEndCall = () => {
    audioService.unlock();
    audioService.playChime('call_end');
    const ended = endExternalCallNow();
    closeMobileAppNow('whatsapp');
    setAppToast(`Call ended / cut ${ended ? `(${ended})` : ''} ✓`);
    audioService.speakText('جی میرے مالک! میں نے کال کاٹ اور بند کر دی ہے!', {
      language,
      rate: config.voiceSpeed,
      voiceName: config.voiceName || 'Zephyr',
    });
  };

  // Owner Face Enrollment
  const handleStartFaceEnrollCamera = async () => {
    audioService.unlock();
    setIsEnrollingFace(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      enrollStreamRef.current = stream;
      if (enrollVideoRef.current) {
        enrollVideoRef.current.srcObject = stream;
        await enrollVideoRef.current.play().catch(() => {});
      }
      setEnrollCamReady(true);
    } catch {
      setIsEnrollingFace(false);
      setAppToast('Please tap "Allow All Mobile Permissions" first so Camera can open.');
    }
  };

  const handleCaptureOwnerFace = () => {
    if (!enrollVideoRef.current) return;
    const snap = captureVideoFrameDataUrl(enrollVideoRef.current);
    if (!snap) return;
    audioService.playChime('activate');
    onUpdateSecurity({
      faceLockEnabled: true,
      ownerFaceDataUrl: snap,
      ownerEnrolledAt: new Date().toLocaleString(),
      autoLockOnIntruder: true,
      ownerName: 'Malaysia wala badshah',
    });
    stopEnrollCamera();
    audioService.speakText(
      'مبارک ہو میرے مالک ملیشیا والا بادشاہ! آپ کا فیس لاک سیو ہو گیا ہے — اب جب بھی زارا اوپن ہو گی میں کیمرہ کھول کر صرف آپ کا چہرہ اسکین کروں گی اور ٹیکسٹ بھیجوں گی!',
      { language, rate: config.voiceSpeed, voiceName: config.voiceName || 'Zephyr' }
    );
  };

  const handleAllowAllMasterInSecurity = async () => {
    audioService.unlock();
    audioService.playChime('activate');
    const res = await requestAllPermissionsMaster();
    queryMobilePermissions().then(setMobilePerms).catch(() => {});
    onUpdateSecurity({ allPermissionsGranted: res.micGranted || res.cameraGranted || res.geoGranted });
    if (res.micGranted && res.cameraGranted) {
      setAppToast(
        `Permissions Updated ✓ Mic, Camera${res.geoGranted ? ', GPS' : ''}${
          res.storagePersisted ? ', Vault Storage' : ''
        } Active!`
      );
      audioService.speakText(
        'جی میرے مالک! آپ کے موبائل کی ساری پرمیشن اور سیکیورٹی الاؤ ہو گئی ہیں!',
        { language, rate: config.voiceSpeed, voiceName: config.voiceName || 'Zephyr' }
      );
    } else {
      setAppToast('Some mobile permissions need tap inside Permissions Hub — opening now...');
      onClose();
      if (onOpenMobilePermissions) {
        onOpenMobilePermissions();
      } else {
        onOpenMobileControl();
      }
    }
  };

  const handleEnrollOwnerBiometrics = async () => {
    audioService.unlock();
    audioService.playChime('tap');
    setIsRegisteringBio(true);
    try {
      const res = await registerOwnerBiometricPasskey();
      if (res.ok) {
        onUpdateSecurity({
          biometricLockEnabled: true,
          biometricCredentialId: res.credentialId,
        });
        audioService.playChime('activate');
        setAppToast('Hardware Fingerprint / Biometric Lock Enabled ✓');
      } else {
        setAppToast(res.error || 'Could not enable biometric lock — ensure phone Fingerprint/PIN is set.');
      }
    } finally {
      setIsRegisteringBio(false);
    }
  };

  const handleTestBiometrics = async () => {
    audioService.unlock();
    const ok = await verifyOwnerBiometricPasskey(securityConfig.biometricCredentialId);
    setAppToast(ok ? 'Fingerprint / Biometric Verified ✓' : 'Biometric verification canceled or failed.');
  };

  // Builder Voice Input inside Settings
  const handleToggleBuilderMic = async () => {
    audioService.unlock();
    if (isBuilderMicOn) {
      const wav = builderMicRef.current?.finishAndGetWav();
      setIsBuilderMicOn(false);
      if (wav) {
        try {
          const res = await fetch('/api/voice-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: wav, mimeType: 'audio/wav', language }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.userTranscription) {
              setBuilderPrompt(data.userTranscription);
              await onBuildNewApp(data.userTranscription, builderCategory);
              onClose();
            }
          }
        } catch {}
      }
      return;
    }

    audioService.stopAudio();
    const session = new DirectMicSession();
    builderMicRef.current = session;
    setIsBuilderMicOn(true);
    const ok = await session.start({
      onVolume: () => {},
      onAutoFinish: async (wav) => {
        setIsBuilderMicOn(false);
        try {
          const res = await fetch('/api/voice-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: wav, mimeType: 'audio/wav', language }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.userTranscription) {
              setBuilderPrompt(data.userTranscription);
              await onBuildNewApp(data.userTranscription, builderCategory);
              onClose();
            }
          }
        } catch {}
      },
      onError: () => setIsBuilderMicOn(false),
    });
    if (!ok) setIsBuilderMicOn(false);
  };

  const handleSubmitBuilderForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderPrompt.trim() || isBuildingApp) return;
    const p = builderPrompt.trim();
    setBuilderPrompt('');
    await onBuildNewApp(p, builderCategory);
    onClose();
  };

  // Diagnostics Runner
  const handleRunHealthDoctor = async (speakOutLoud = true) => {
    setIsRunningDiag(true);
    try {
      const report = await runFullZaraAndMobileDiagnostics();
      setDiagChecks(report.checks);
      setDiagSummary(report.spokenUrduReport);
      if (speakOutLoud) {
        audioService.unlock();
        audioService.speakText(report.spokenUrduReport, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
        });
      }
    } finally {
      setIsRunningDiag(false);
    }
  };

  const handleOpenAppFromSettings = (app: MobileAppDefinition) => {
    audioService.unlock();
    audioService.playChime('activate');
    launchMobileAppNow(app, undefined, () => {
      zaraVision.startCamera('user');
    });
    setAppToast(`Opened ${app.name} on your mobile ✓`);
    audioService.speakText(`جی میری جان، ابھی آپ کے موبائل میں ${app.name} اوپن کر رہی ہوں!`, {
      language,
      rate: config.voiceSpeed,
      voiceName: config.voiceName || 'Zephyr',
    });
  };

  const handleCloseAppFromSettings = (appOrAll: MobileAppDefinition | 'all') => {
    audioService.unlock();
    audioService.playChime('tap');
    const res = closeMobileAppNow(appOrAll);
    if (res.closedAll) {
      setAppToast('Closed & turned off all running mobile apps ✓');
      audioService.speakText('جی میری جان، میں نے ساری ایپس کو بند اور کلوز کر دیا ہے!', {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
      });
    } else if (res.app) {
      setAppToast(`Closed & turned off ${res.app.name} ✓`);
      audioService.speakText(`جی میری جان، میں نے ${res.app.name} کو بند اور آف کر دیا ہے!`, {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
      });
    }
  };

  const handleCopyDownloadLink = async () => {
    audioService.playChime('tap');
    try {
      await navigator.clipboard.writeText(downloadLinkUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleCopyProfile = async () => {
    audioService.playChime('heart');
    try {
      await navigator.clipboard.writeText(formatZaraProfileShareText(downloadLinkUrl));
      setCopiedProfile(true);
      window.setTimeout(() => setCopiedProfile(false), 2500);
    } catch {}
  };

  const handleVerifyOwnerInSettings = async () => {
    setOwnerAuthNotice(null);
    setIsVerifyingOwner(true);
    audioService.unlock();
    audioService.playChime('tap');
    const res = await signInOwnerWithGoogle();
    setIsVerifyingOwner(false);
    if (res.ok) {
      audioService.playChime('heart');
      onUpdateConfig({ isOwnerSessionUnlocked: true, ownerOnlyRomance: true, loveMode: true });
    } else if (res.error) {
      setOwnerAuthNotice(res.error);
    }
  };

  const handleSaveNickname = () => {
    audioService.unlock();
    audioService.playChime('tap');
    const cleanName = nickname.trim() || 'My Love';
    onUpdateConfig({ userNickname: cleanName });
    setAppToast(`Saved nickname: ${cleanName} ✓`);
    audioService.speakText(
      `Okay ${cleanName}... from now on I will lovingly call you ${cleanName}.`,
      {
        pitch: config.voicePitch,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
        loveMode: config.loveMode,
        romanceIntensity: config.romanceIntensity || 'bold',
      }
    );
  };

  const handleSelectNeuralVoice = (vName: ZaraVoiceName) => {
    audioService.unlock();
    audioService.playChime('tap');
    onUpdateConfig({ voiceName: vName, voiceGender: getVoiceGenderFromName(vName) });
    setIsTestingVoice(true);

    const samplePreview =
      language === 'hindi'
        ? `नमस्ते ${initialNick}, मैं पूरे अपना-पन और प्यार के साथ हमेशा आपके साथ हूँ।`
        : language === 'punjabi'
        ? `ست سری اکال ${initialNick}، میں ہمیشہ پورے اپنا پن تے پیار نال تہاڈے نال آں۔`
        : language === 'english'
        ? `Hello ${initialNick}, this is my selected voice with warm care and attention.`
        : `السلام علیکم ${initialNick}، میں پورے اپنا پن اور خلوص کے ساتھ آپ کے ساتھ ہوں۔`;
    audioService.speakText(samplePreview, {
      language,
      rate: config.voiceSpeed,
      voiceName: vName,
      loveMode: config.loveMode,
      romanceIntensity: config.romanceIntensity || 'passionate',
      emotionMode: config.emotionMode || 'apnapan',
      onEnd: () => setIsTestingVoice(false),
    });
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedTime) return;
    audioService.unlock();
    audioService.playChime('activate');
    const finalLabel =
      schedLabel.trim() || (schedType === 'work' ? 'Kaam par jana hai' : 'Zara Mobile Alarm');
    onAddSchedule({
      time24: schedTime,
      label: finalLabel,
      type: schedType,
      repeatDaily: schedDaily,
      enabled: true,
    });
    const spokenTime = format24To12Hour(schedTime);
    audioService.speakText(
      `جی! میں نے ${spokenTime} کا الارم سیٹ کر دیا ہے — جب وقت ہو گا تو میں خود آواز دے کر بتاؤں گی کہ ${finalLabel}!`,
      {
        language,
        rate: config.voiceSpeed,
        voiceName: config.voiceName || 'Zephyr',
        loveMode: config.loveMode,
      }
    );
  };

  const handleCreateMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memTitle.trim() || !memDetails.trim()) return;
    audioService.playChime('heart');
    onAddMemory({
      title: memTitle.trim(),
      details: memDetails.trim(),
      category: memCategory,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      createdAtMs: Date.now(),
    });
    setMemTitle('');
    setMemDetails('');
    setAppToast('Memory saved permanently ✓');
  };

  const featuredIds = ['playstore', 'google', 'whatsapp', 'youtube', 'instagram', 'settings'];
  const featuredApps = featuredIds
    .map((id) => allApps.find((a) => a.id === id))
    .filter((a): a is MobileAppDefinition => Boolean(a));

  const filteredDirectory = allApps.filter((a) => {
    if (!appSearch.trim()) return true;
    const q = appSearch.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.nameHindi.includes(q) ||
      a.nameUrdu.includes(q) ||
      a.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  const boldEnabled = config.unfilteredBoldTalk ?? true;

  const requireOwnerAccess = (_featureName: string): boolean => true;

  const handleSettingsInlinePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageToJpeg(file, 840, 0.8);
      setQuickPhotoDataUrl(compressed.dataUrl);
    } catch {}
  };

  const handleSettingsInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!quickChatText.trim() && !quickPhotoDataUrl) || isSendingInline || !onSendInlineChat) {
      return;
    }
    const msg =
      quickChatText.trim() || 'زارا یہ تصویر دیکھو اور مجھے بتاؤ اس میں کیا ہے!';
    const photo = quickPhotoDataUrl || undefined;
    setQuickChatText('');
    setQuickPhotoDataUrl(null);
    setIsSendingInline(true);
    audioService.unlock();
    try {
      await onSendInlineChat(msg, photo);
      setAppToast('Sent to Zara & AI Studio ✓');
    } finally {
      setIsSendingInline(false);
    }
  };

  const systemSettingsQuickList = allApps.filter((a) => a.category === 'mobile_settings');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-gradient-to-b from-[#150a2e] via-[#0c061d] to-[#070312] border border-pink-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_0_45px_rgba(236,72,153,0.3)] max-h-[93vh] flex flex-col overflow-hidden">
        <input
          ref={settingsPhotoInputRef}
          type="file"
          accept="image/*"
          onChange={handleSettingsInlinePhotoPick}
          className="hidden"
        />

        {/* Header with Owner Badge & Live Mobile Time */}
        <div className="flex items-center justify-between pb-2.5 border-b border-purple-900/50 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                Zara Settings · Full Authority
              </h2>
              <p className="text-[11px] text-cyan-300 font-mono tabular-nums truncate">
                {clock.time12WithSec} · {onlineState ? 'Online' : 'Offline Mode'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 cursor-pointer shrink-0"
            aria-label="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Full-Authority Open Navigation Grid — All 9 Tabs Always Accessible */}
        <div className="grid grid-cols-3 gap-1 p-1 mt-2.5 rounded-xl bg-slate-950 border border-slate-800">
          {[
            { id: 'controls', label: 'All Controls' },
            { id: 'apps', label: 'Apps & WA' },
            { id: 'security', label: 'Face/Lock' },
            { id: 'builder', label: 'Builder' },
            { id: 'diagnostics', label: 'Issues/Fix' },
            { id: 'schedule', label: 'Time/Alarm' },
            { id: 'profile', label: 'Profile' },
            { id: 'romance', label: 'Emotions' },
            { id: 'memory', label: '100+ Days' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                audioService.playChime('tap');
                setTab(t.id as SettingsTabId);
              }}
              className={`min-h-[34px] py-1 px-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                tab === t.id
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-0.5">
          {appToast && (
            <div className="px-3 py-2 rounded-xl bg-emerald-950/85 border border-emerald-400/50 text-xs text-emerald-100 font-semibold">
              {appToast}
            </div>
          )}

          {/* ================= TAB 0: MASTER FUNCTIONS ON, UI DESIGN STUDIO, VOICE & CONTROLS ================= */}
          {tab === 'controls' && (
            <div className="space-y-3">
              {/* 0. MASTER "TURN ALL ZARA FUNCTIONS ON" BUTTON */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/70 border border-emerald-400/55 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Power className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Zara App Master Functions ON</span>
                    </div>
                    <p className="text-[10px] text-emerald-200/90 mt-0.5 leading-relaxed">
                      Enable continuous voice listening, auto-speak, emotions, self-check updates,
                      alerts, wake-word, and controls in one tap.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={enablingAllBusy}
                  onClick={async () => {
                    if (!onEnableAllFunctions) return;
                    setEnablingAllBusy(true);
                    try {
                      await onEnableAllFunctions();
                      setAppToast('All Zara Functions Turned ON ✓');
                    } finally {
                      setEnablingAllBusy(false);
                    }
                  }}
                  className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Power className="w-4 h-4 shrink-0" />
                  <span>
                    {enablingAllBusy
                      ? 'Enabling All Functions...'
                      : 'Turn All Zara Functions ON ✓'}
                  </span>
                </button>
                <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-300 pt-0.5">
                  <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-white/10 truncate">
                    Voice: {alwaysOnVoiceEnabled ? 'ON' : 'Ready'}
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-white/10 truncate">
                    Speak: {config.autoSpeak ? 'ON' : 'OFF'}
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-white/10 truncate">
                    Updates: {config.autoSelfCheckEnabled !== false ? 'ON' : 'OFF'}
                  </div>
                </div>
              </div>

              {/* 0b. UI DESIGN & THEME STUDIO (UI کوڈنگ / Interface Customization) */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-sky-500/40 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-sky-300 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>UI Design &amp; Theme Studio (UI کوڈنگ)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Live Interface</span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {(
                    [
                      { id: 'cyber_cyan', label: 'Cyan', swatch: 'bg-sky-400' },
                      { id: 'royal_violet', label: 'Violet', swatch: 'bg-purple-400' },
                      { id: 'emerald_matrix', label: 'Emerald', swatch: 'bg-emerald-400' },
                      { id: 'crimson_flare', label: 'Crimson', swatch: 'bg-rose-400' },
                      { id: 'golden_aura', label: 'Gold', swatch: 'bg-amber-400' },
                    ] as Array<{ id: ZaraUiThemeId; label: string; swatch: string }>
                  ).map((item) => {
                    const active = (config.uiTheme || 'cyber_cyan') === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          audioService.playChime('tap');
                          onUpdateConfig({ uiTheme: item.id });
                          setAppToast(`UI Theme updated to ${item.label} ✓`);
                        }}
                        className={`min-h-[42px] px-1.5 py-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                          active
                            ? 'bg-white/15 border-white text-white font-bold'
                            : 'bg-slate-950 border-white/10 text-slate-300 hover:border-white/30'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${item.swatch}`} />
                        <span className="text-[10px] truncate max-w-full">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      audioService.playChime('tap');
                      onUpdateConfig({ showHudQuickBar: config.showHudQuickBar === false });
                    }}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-between cursor-pointer ${
                      config.showHudQuickBar !== false
                        ? 'bg-sky-950/70 border-sky-400/50 text-sky-100'
                        : 'bg-slate-950 border-slate-700 text-slate-300'
                    }`}
                  >
                    <span>Home Quick Bar</span>
                    <span>{config.showHudQuickBar !== false ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      audioService.playChime('tap');
                      onToggleMobileFrame();
                    }}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-between cursor-pointer ${
                      isMobileFrame
                        ? 'bg-cyan-950/70 border-cyan-400/50 text-cyan-100'
                        : 'bg-slate-950 border-slate-700 text-slate-300'
                    }`}
                  >
                    <span>Phone Frame</span>
                    <span>{isMobileFrame ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              {/* 1. Full Authority Status & Optional Cloud Vault Sync */}
              <div
                className={`p-3 rounded-2xl border space-y-2 ${
                  ownerAuth.isOwnerVerified
                    ? 'bg-emerald-950/50 border-emerald-400/50'
                    : 'bg-slate-900/90 border-white/15'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {ownerAuth.isOwnerVerified
                          ? 'Full Authority · Cloud Vault Synced'
                          : 'Full Settings Authority Active'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">
                      {ownerAuth.isOwnerVerified
                        ? 'All tabs, controls, and Google Owner Cloud backup are synced.'
                        : 'All 9 Settings tabs and app functions are open. Optionally connect Google for Owner Cloud Vault sync.'}
                    </p>
                  </div>
                  {ownerAuth.isOwnerVerified ? (
                    <button
                      type="button"
                      onClick={() => engageGuestSafeLock()}
                      className="min-h-[36px] px-2.5 py-1 rounded-xl bg-slate-900 border border-white/15 text-[10px] font-bold text-slate-200 shrink-0 cursor-pointer"
                    >
                      Unlink Cloud
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isVerifyingOwner}
                      onClick={handleVerifyOwnerInSettings}
                      className="min-h-[36px] px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-extrabold shrink-0 cursor-pointer"
                    >
                      {isVerifyingOwner ? 'Syncing...' : 'Cloud Sync'}
                    </button>
                  )}
                </div>
                {ownerAuthNotice && (
                  <p className="text-[11px] text-rose-300 font-semibold">{ownerAuthNotice}</p>
                )}
              </div>

              {/* Public Voice Gender, 6 Pakistani Voices & 4 Languages + AI Creative Studio */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-sky-500/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-sky-300">
                    Pakistani Voices (Female &amp; Male) &amp; 4 Languages
                  </span>
                  <div className="flex gap-1">
                    {(['female', 'male'] as ZaraVoiceGender[]).map((g) => {
                      const active =
                        (config.voiceGender || getVoiceGenderFromName(config.voiceName)) === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            const match = ZARA_VOICE_PROFILES.find((p) => p.gender === g);
                            if (match) handleSelectNeuralVoice(match.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer capitalize ${
                            active
                              ? 'bg-sky-500 text-slate-950 border-sky-400'
                              : 'bg-slate-950 border-white/10 text-slate-300'
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {ZARA_VOICE_PROFILES.filter(
                    (p) =>
                      p.gender ===
                      (config.voiceGender || getVoiceGenderFromName(config.voiceName))
                  ).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectNeuralVoice(v.id)}
                      className={`min-h-[40px] p-1.5 rounded-xl border text-center cursor-pointer ${
                        config.voiceName === v.id
                          ? 'bg-sky-600/35 border-sky-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="text-[11px] font-bold truncate">
                        {v.label.split(' · ')[0]}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      { id: 'auto', label: 'Auto' },
                      { id: 'uzbek', label: "O'zbek" },
                      { id: 'malay', label: 'Melayu' },
                      { id: 'arabic', label: 'العربية' },
                      { id: 'urdu', label: 'اردو' },
                      { id: 'hindi', label: 'हिंदी' },
                      { id: 'punjabi', label: 'ਪੰਜਾਬੀ' },
                      { id: 'english', label: 'EN' },
                    ] as Array<{ id: Language; label: string }>
                  ).map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => onSelectLanguage(l.id)}
                      className={`min-h-[34px] rounded-lg text-[11px] font-bold border cursor-pointer ${
                        language === l.id
                          ? 'bg-sky-500 text-slate-950 border-sky-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                {onOpenAiStudio && (
                  <div className="space-y-1.5 pt-1">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAiStudio('research');
                        }}
                        className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-cyan-400/45 text-cyan-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Live Web &amp; Assistants</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAiStudio('social');
                        }}
                        className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-pink-400/40 text-pink-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                        <span>Social Media Hub</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAiStudio('devlab');
                        }}
                        className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-400/40 text-emerald-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Code2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Flutter &amp; Code Lab</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAiStudio('audit');
                        }}
                        className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-400/40 text-amber-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Self-Audit &amp; Health</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAiStudio('office');
                        }}
                        className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-cyan-500/35 text-cyan-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Office Work</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAiStudio('pctools');
                        }}
                        className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-sky-500/35 text-sky-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Code2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>PC &amp; Dev Tools</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAiStudio('security');
                        }}
                        className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/35 text-emerald-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Security Lab</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAiStudio('photo');
                        }}
                        className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-violet-500/35 text-violet-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span>Photo &amp; Video Studio</span>
                      </button>
                    </div>

                    {onOpenMobilePermissions && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenMobilePermissions();
                        }}
                        className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-500/35 text-amber-100 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Permissions (Mic · Camera · GPS · Accessibility · Wake Word)</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Compact AI Brain & Hunter Voice Selector */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-emerald-300">
                      AI Brain &amp; Hunter Voice Stack
                    </span>
                    {onOpenAiStudio && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAiStudio('brains');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/45 text-[10px] font-bold text-sky-200 cursor-pointer"
                      >
                        Test All 11 Systems →
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <select
                      aria-label="Primary AI Brain"
                      value={config.brainMode || 'auto'}
                      onChange={(e) => {
                        const mode = e.target.value as AiBrainEngineId;
                        onUpdateConfig({ brainMode: mode });
                        updateAiOrchestratorConfig({ primaryBrainMode: mode }).catch(() => {});
                      }}
                      className="min-h-[36px] px-2.5 rounded-xl bg-slate-950 border border-slate-700 text-[11px] font-semibold text-white"
                    >
                      {BRAIN_ENGINE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          Brain: {opt.label}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Hunter Voice TTS Engine"
                      value={config.ttsEngine || 'hunter_tts_ultra_premium'}
                      onChange={(e) => {
                        const tts = e.target.value as TtsEngineId;
                        onUpdateConfig({ ttsEngine: tts });
                        audioService.setPreferredTtsEngine(tts);
                        updateAiOrchestratorConfig({ ttsEngine: tts }).catch(() => {});
                      }}
                      className="min-h-[36px] px-2.5 rounded-xl bg-slate-950 border border-slate-700 text-[11px] font-semibold text-white"
                    >
                      {TTS_ENGINE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          Voice: {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    STT: Hunter STT Beta active · Auto-fallback enabled across Dimaag, Maya, Tez Dimaag, Swift, OpenAI &amp; Groq.
                  </div>
                </div>
              </div>

              {/* 2. Quick Chat, Photo Send, Full Chat History, Copy & Replay (Moved from Bottom Bar!) */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-white/15 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-pink-300">
                    Chat, Photo &amp; Last Reply Controls
                  </span>
                  <div className="flex items-center gap-1.5">
                    {latestZaraMessage && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await copySelectedOrFullText(latestZaraMessage);
                          if (res.ok) {
                            setCopiedReplyLabel('Copied ✓');
                            window.setTimeout(() => setCopiedReplyLabel(null), 2000);
                          }
                        }}
                        className="min-h-[32px] px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedReplyLabel || 'Copy'}</span>
                      </button>
                    )}
                    {onReplayLastReply && (
                      <button
                        type="button"
                        onClick={() => {
                          audioService.unlock();
                          onReplayLastReply();
                        }}
                        className="min-h-[32px] px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-rose-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Replay</span>
                      </button>
                    )}
                    {onOpenChat && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenChat();
                        }}
                        className="min-h-[32px] px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Full Chat</span>
                      </button>
                    )}
                  </div>
                </div>

                {quickPhotoDataUrl && (
                  <div className="p-2 rounded-xl bg-slate-950 border border-pink-500/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={quickPhotoDataUrl}
                        alt="Selected"
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                      />
                      <span className="text-[11px] text-pink-200 truncate">Photo attached</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuickPhotoDataUrl(null)}
                      className="p-1 text-slate-300 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSettingsInlineSubmit} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => settingsPhotoInputRef.current?.click()}
                    className="min-h-[38px] min-w-[38px] rounded-xl bg-slate-950 border border-pink-500/35 text-pink-300 flex items-center justify-center shrink-0 cursor-pointer"
                    title="Send Gallery Photo"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  {onSnapCameraToChat && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!requireOwnerAccess('Camera Snap')) return;
                        onClose();
                        onSnapCameraToChat();
                      }}
                      className="min-h-[38px] min-w-[38px] rounded-xl bg-slate-950 border border-sky-500/35 text-sky-300 flex items-center justify-center shrink-0 cursor-pointer"
                      title="Snap Camera Photo"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                  <input
                    type="text"
                    value={quickChatText}
                    onChange={(e) => setQuickChatText(e.target.value)}
                    placeholder="Type message or command for Zara..."
                    className="flex-1 min-w-0 min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white focus:outline-none focus:border-pink-400"
                  />
                  <button
                    type="submit"
                    disabled={(!quickChatText.trim() && !quickPhotoDataUrl) || isSendingInline}
                    className="min-h-[38px] min-w-[38px] rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* 3. Master Switches: Screen-Off Zero-Touch Voice + Ambient Vision + Flashlight */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-cyan-500/35 space-y-2">
                <div className="text-xs font-extrabold text-cyan-300">
                  Zero-Touch Screen-Off Voice, Ambient Vision &amp; Torch
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {/* Screen-Off Voice */}
                  {onToggleAlwaysOnVoice && (
                    <button
                      type="button"
                      onClick={() => {
                        audioService.unlock();
                        onToggleAlwaysOnVoice();
                      }}
                      className={`min-h-[42px] px-3 py-2 rounded-xl border flex items-center justify-between text-xs font-bold cursor-pointer ${
                        alwaysOnVoiceEnabled
                          ? 'bg-emerald-950/90 border-emerald-400/70 text-emerald-100'
                          : 'bg-slate-950 border-slate-700 text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Power className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Screen-Off &amp; Zero-Touch Voice</span>
                      </span>
                      <span>
                        {alwaysOnVoiceEnabled
                          ? isAlwaysOnRunning
                            ? 'ON · Listening'
                            : 'ON · Ready'
                          : 'OFF'}
                      </span>
                    </button>
                  )}

                  {/* Ambient Auto-Vision & Flashlight */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = config.ambientVisionEnabled === false;
                      onUpdateConfig({ ambientVisionEnabled: next });
                      if (next) {
                        zaraVision.startCamera('user').catch(() => {});
                        setAppToast(
                          'Ambient Auto-Vision ON — Zara can see you without starting a video call ✓'
                        );
                      } else {
                        zaraVision.stop();
                        setAppToast('Ambient Auto-Vision turned OFF.');
                      }
                    }}
                    className={`min-h-[42px] px-3 py-2 rounded-xl border flex items-center justify-between text-xs font-bold cursor-pointer ${
                      config.ambientVisionEnabled !== false
                        ? 'bg-sky-950/90 border-sky-400/70 text-sky-100'
                        : 'bg-slate-950 border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Ambient Auto-Vision</span>
                    </span>
                    <span>{config.ambientVisionEnabled !== false ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const res = await toggleMobileFlashlight();
                      setAppToast(res.message);
                    }}
                    className={`min-h-[42px] px-3 py-2 rounded-xl border flex items-center justify-between text-xs font-bold cursor-pointer ${
                      torchActive
                        ? 'bg-amber-600 border-amber-300 text-black'
                        : 'bg-slate-950 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Flashlight className="w-4 h-4 shrink-0" />
                      <span>Mobile Flashlight / LED Torch</span>
                    </span>
                    <span>{torchActive ? 'TORCH ON' : 'TORCH OFF'}</span>
                  </button>
                </div>
              </div>

              {/* 4. Complete Grid of All Studio, Camera, Work & Device Controls */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-white/15 space-y-2">
                <div className="text-xs font-extrabold text-white">
                  All Studio, Camera, Work &amp; Device Controls
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!requireOwnerAccess('Front Camera')) return;
                      onClose();
                      onSelectCameraLens?.('user');
                    }}
                    className={`min-h-[40px] px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                      visionMode === 'camera' && cameraFacing === 'user'
                        ? 'bg-sky-600 border-sky-300 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-200'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                    <span>
                      {visionMode === 'camera' && cameraFacing === 'user'
                        ? 'Front Cam: ON'
                        : 'Front Cam'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!requireOwnerAccess('Back Camera')) return;
                      onClose();
                      onSelectCameraLens?.('environment');
                    }}
                    className={`min-h-[40px] px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                      visionMode === 'camera' && cameraFacing === 'environment'
                        ? 'bg-teal-600 border-teal-300 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-200'
                    }`}
                  >
                    <SwitchCamera className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                    <span>
                      {visionMode === 'camera' && cameraFacing === 'environment'
                        ? 'Back Cam: ON'
                        : 'Back Cam'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!requireOwnerAccess('Screen Share')) return;
                      onClose();
                      onToggleScreenShare?.();
                    }}
                    className={`min-h-[40px] px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                      visionMode === 'screen'
                        ? 'bg-indigo-600 border-indigo-300 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-200'
                    }`}
                  >
                    <MonitorUp className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                    <span>{visionMode === 'screen' ? 'Screen: ON' : 'Screen Share'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAvatarPicker?.();
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 border border-pink-400/40 text-pink-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-pink-300 shrink-0" />
                    <span>Voice &amp; Alerts Hub</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdvancedWork?.();
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 border border-cyan-400/45 text-cyan-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                    <span>AI Work Studio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenMoodGesture?.();
                    }}
                    className={`min-h-[40px] px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                      autoGestureWatch
                        ? 'bg-pink-600 border-pink-300 text-white'
                        : 'bg-slate-950 border-pink-400/40 text-pink-200'
                    }`}
                  >
                    <Smile className="w-3.5 h-3.5 shrink-0" />
                    <span>{autoGestureWatch ? 'Gesture: ON' : 'Mood & Gesture'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSpokenAlerts?.();
                    }}
                    className={`min-h-[40px] px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                      spokenAlertsEnabled
                        ? 'bg-violet-600 border-violet-300 text-white'
                        : 'bg-slate-950 border-violet-400/40 text-violet-200'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5 shrink-0" />
                    <span>{spokenAlertsEnabled ? 'Alerts: ON' : 'Call/Msg Alerts'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onToggleFloatPiP?.();
                    }}
                    className={`min-h-[40px] px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                      isFloatingPiP
                        ? 'bg-cyan-600 border-cyan-300 text-white'
                        : 'bg-slate-950 border-cyan-500/40 text-cyan-200'
                    }`}
                  >
                    <PictureInPicture2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{isFloatingPiP ? 'Float BG: ON' : 'Float BG (PiP)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab('apps')}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/45 text-emerald-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>WhatsApp &amp; Apps</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab('schedule')}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 border border-amber-400/45 text-amber-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <AlarmClock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Alarms &amp; Time</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab('builder')}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 border border-amber-400/40 text-amber-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Build App / Game</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onTriggerSelfHeal?.();
                      setAppToast('Running Auto-Fix, Cache Repair & Self-Update ✓');
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-amber-950/75 border border-amber-400/50 text-amber-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-amber-300 shrink-0 ${
                        isSelfHealing ? 'animate-spin' : ''
                      }`}
                    />
                    <span>{isSelfHealing ? 'Updating...' : 'Auto-Fix & Update'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onTriggerBack?.();
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                    <span>Back (واپس)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onTriggerClose?.();
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 border border-rose-500/40 text-rose-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Close App (بند)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenProjectFiles?.();
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-rose-950/80 border border-rose-400/50 text-rose-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileArchive className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                    <span>All Files A–Z</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenInstall();
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 border border-emerald-400/45 text-emerald-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Install App Link</span>
                  </button>

                  {onOpenDriverMode && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenDriverMode();
                      }}
                      className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 border border-sky-400/50 text-sky-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Car className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>Driver Mode</span>
                    </button>
                  )}

                  {onOpenFileManager && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenFileManager();
                      }}
                      className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 border border-indigo-400/50 text-indigo-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>File Manager</span>
                    </button>
                  )}

                  {onOpenAiStudio && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAiStudio('pctools');
                      }}
                      className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 border border-emerald-400/50 text-emerald-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Monitor className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>PC Control</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 5. Complete Mobile System Settings Direct Controller */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/35 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>Complete Mobile System Settings Control</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenMobileControl();
                    }}
                    className="min-h-[30px] px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                  >
                    Full Hub
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {systemSettingsQuickList.map((sysApp) => (
                    <button
                      key={sysApp.id}
                      type="button"
                      onClick={() => handleOpenAppFromSettings(sysApp)}
                      className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-left flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-sm shrink-0">{sysApp.iconEmoji}</span>
                      <span className="text-[11px] font-bold text-slate-100 truncate">
                        {sysApp.name.replace(' Settings', '')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Android Lock-Screen, Background Voice & Battery Optimization Guide */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 border border-indigo-400/35 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-indigo-300 flex items-center gap-1.5">
                    <Power className="w-4 h-4 text-indigo-400" />
                    <span>Android Background Voice &amp; Battery Optimization</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 font-semibold">
                    Android 8–15
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  For continuous zero-touch voice listening when the screen is locked, Android requires battery optimization to be set to <strong className="text-white">Unrestricted</strong>. Otherwise, the OS suspends background audio.
                </p>

                {/* 1-Tap System Intent Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const msg = openAndroidSystemPermissionScreen('battery_unrestricted');
                      setAppToast(msg);
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <PowerOff className="w-3.5 h-3.5 shrink-0" />
                    <span>Battery Unrestricted</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const msg = openAndroidSystemPermissionScreen('app_permissions');
                      setAppToast(msg);
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                    <span>Mic &amp; Cam</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const msg = openAndroidSystemPermissionScreen('accessibility');
                      setAppToast(msg);
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span>Accessibility</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const msg = openAndroidSystemPermissionScreen('notification_listener');
                      setAppToast(msg);
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Notifications</span>
                  </button>
                </div>

                {/* Manufacturer Specific Quick Tips */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-1 text-[10px] text-slate-300 leading-normal">
                  <p className="font-bold text-white text-[11px] mb-1">Manufacturer Quick Steps:</p>
                  <p><strong className="text-indigo-200">Samsung OneUI:</strong> Settings → Apps → Zara / Chrome → Battery → Select &ldquo;Unrestricted&rdquo;.</p>
                  <p><strong className="text-amber-200">Xiaomi / Redmi (MIUI):</strong> Settings → Apps → Zara → Autostart: ON → Battery saver: &ldquo;No restrictions&rdquo;.</p>
                  <p><strong className="text-emerald-200">Oppo / Realme / Vivo:</strong> Settings → Battery → App battery management → Allow foreground &amp; background activity.</p>
                  <p><strong className="text-cyan-200">Google Pixel / Motorola:</strong> Settings → Apps → Zara → App battery usage → Select &ldquo;Unrestricted&rdquo;.</p>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 1: WHATSAPP NUMBER TEXT/CALL, PLAY STORE & ALL APPS ================= */}
          {tab === 'apps' && (
            <div className="space-y-3">
              {/* WhatsApp Open, Message (Any Chat / Contact / Number), Call, Back & Close */}
              <form
                onSubmit={handleWhatsAppSendText}
                className="p-3.5 rounded-2xl bg-[#071d16] border border-emerald-500/45 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Open, Message, Back &amp; Close</span>
                  </span>
                  {activeCallNum && (
                    <span className="text-[10px] text-amber-300 font-mono">
                      Active: {activeCallNum}
                    </span>
                  )}
                </div>

                <input
                  type="tel"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  placeholder="Optional Number (+6012... / 0300...) — leave blank to pick any chat!"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />

                <input
                  type="text"
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  placeholder="Message text to send on WhatsApp..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-400"
                />

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="submit"
                    className="min-h-[40px] py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3 h-3 shrink-0" />
                    <span>Send WA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleWhatsAppStartCall('whatsapp')}
                    className="min-h-[40px] py-1.5 px-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <PhoneCall className="w-3 h-3 shrink-0" />
                    <span>WA Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleWhatsAppEndCall}
                    className="min-h-[40px] py-1.5 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <PhoneOff className="w-3 h-3 shrink-0" />
                    <span>Close WA</span>
                  </button>
                </div>

                {/* Save Contact Name for Voice WhatsApp ("Ali ko WhatsApp pe message karo...") */}
                <div className="pt-1 border-t border-emerald-800/50 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={waContactName}
                      onChange={(e) => setWaContactName(e.target.value)}
                      placeholder="Contact Name for Voice (e.g. Ali, Bhai)"
                      className="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-[11px] focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={handleSaveWaContact}
                      className="min-h-[34px] px-2.5 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold whitespace-nowrap cursor-pointer"
                    >
                      Save Name
                    </button>
                    <button
                      type="button"
                      onClick={handlePickNativePhoneContacts}
                      className="min-h-[34px] px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-200 text-[10px] font-bold whitespace-nowrap cursor-pointer"
                    >
                      Phonebook
                    </button>
                  </div>

                  {waContacts.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                      {waContacts.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-emerald-500/35 text-[10px] text-emerald-200 shrink-0"
                        >
                          <button
                            type="button"
                            onClick={() => setWaPhone(c.phone)}
                            className="font-bold hover:text-white cursor-pointer"
                          >
                            {c.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = waContacts.filter((x) => x.id !== c.id);
                              setWaContacts(next);
                              saveWhatsAppContacts(next);
                            }}
                            className="text-rose-400 pl-0.5 cursor-pointer"
                            aria-label="Remove contact"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Back & Close Zara Quick Controls */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[38px] py-1.5 px-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-cyan-200 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                    <span>Back (واپس)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCloseZaraAppNow();
                    }}
                    className="min-h-[38px] py-1.5 px-2.5 rounded-xl bg-slate-950 border border-rose-500/40 hover:bg-rose-950/60 text-rose-200 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PowerOff className="w-3.5 h-3.5 shrink-0" />
                    <span>Close Zara</span>
                  </button>
                </div>
              </form>

              {/* Play Store Direct Install + Multi-Mobile App Download Link */}
              <div className="p-3.5 rounded-2xl bg-[#0b1622] border border-emerald-500/45 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white truncate">
                      All Mobiles Share &amp; Download Link
                    </div>
                    <div className="text-[10px] text-emerald-300 truncate">
                      {isInstalled
                        ? 'Installed on Mobile ✓ Share with any phone'
                        : 'Share this link to download on any mobile'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      audioService.playChime('tap');
                      onClose();
                      onOpenInstall();
                    }}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#01875f] hover:bg-[#019a6c] text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>Install / Check</span>
                  </button>
                </div>

                <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-cyan-200 font-mono truncate flex-1">
                    {downloadLinkUrl}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyDownloadLink}
                      className="min-h-[32px] px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <a
                      href={`whatsapp://send?text=${encodeURIComponent(
                        `📲 Download & Install Zara AI App on your mobile:\n${downloadLinkUrl}`
                      )}`}
                      className="min-h-[32px] px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 no-underline"
                      title="Share App Download Link on WhatsApp"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>WA</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Featured Row: Play Store, Google, WhatsApp, YouTube, Instagram, Phone Settings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-xs font-extrabold text-white">
                    Play Store, Google &amp; Quick Apps
                  </span>
                  {runningAppIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleCloseAppFromSettings('all')}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <PowerOff className="w-3 h-3" />
                      <span>Close All ({runningAppIds.length})</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {featuredApps.map((app) => {
                    const isRunning = runningAppIds.includes(app.id);
                    return (
                      <div
                        key={app.id}
                        className={`p-2.5 rounded-2xl border space-y-2 ${
                          isRunning ? 'border-emerald-400 bg-emerald-950/50' : app.accentClass
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-base shrink-0">{app.iconEmoji}</span>
                            <span className="text-xs font-bold text-white truncate">
                              {app.name}
                            </span>
                          </div>
                          {isRunning && (
                            <span className="text-[10px] font-bold text-emerald-300">ON</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAppFromSettings(app)}
                            className="py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold cursor-pointer"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCloseAppFromSettings(app)}
                            className={`py-1.5 rounded-lg text-[10px] font-extrabold cursor-pointer ${
                              isRunning
                                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                : 'bg-slate-900/90 hover:bg-rose-900/60 text-slate-300 border border-slate-700'
                            }`}
                          >
                            Close / Off
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Full Searchable Directory */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  placeholder="Search any app or mobile setting..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-pink-500"
                />

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {filteredDirectory.map((app) => {
                    const isRunning = runningAppIds.includes(app.id);
                    return (
                      <div
                        key={app.id}
                        className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{app.iconEmoji}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{app.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {app.locationLabel}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenAppFromSettings(app)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCloseAppFromSettings(app)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                              isRunning
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-rose-900/60'
                            }`}
                          >
                            Off
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: MOBILE PERMISSIONS, BIOMETRICS, FACE LOCK & ANTI-THEFT SECURITY ================= */}
          {tab === 'security' && (
            <div className="space-y-3">
              {/* All Mobile Permissions Master Card + Live 6-Sensor Status Grid */}
              <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-emerald-500/50 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Mobile Permissions &amp; Security Hub</span>
                    </div>
                    <div className="text-[10px] text-emerald-300 mt-0.5">
                      Mic, Camera, GPS Anti-Theft, Storage Vault &amp; Biometrics
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAllowAllMasterInSecurity}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shrink-0 cursor-pointer"
                  >
                    Allow All ✓
                  </button>
                </div>

                {/* Live 6-Item Permission Badges */}
                {mobilePerms && (
                  <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                    {[
                      {
                        label: 'Mic',
                        ok: mobilePerms.microphone === 'granted',
                        state: mobilePerms.microphone,
                      },
                      {
                        label: 'Camera',
                        ok: mobilePerms.camera === 'granted',
                        state: mobilePerms.camera,
                      },
                      {
                        label: 'GPS Loc',
                        ok: mobilePerms.geolocation === 'granted',
                        state: mobilePerms.geolocation,
                      },
                      {
                        label: 'Alerts',
                        ok: mobilePerms.notifications === 'granted',
                        state: mobilePerms.notifications,
                      },
                      {
                        label: 'Vault',
                        ok: mobilePerms.persistentStorage === 'granted',
                        state: mobilePerms.persistentStorage,
                      },
                      {
                        label: 'Bio Lock',
                        ok: bioHardwareSupported || mobilePerms.biometricAvailable,
                        state: bioHardwareSupported || mobilePerms.biometricAvailable ? 'ready' : 'off',
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`px-2 py-1.5 rounded-lg border flex items-center justify-between font-semibold ${
                          item.ok
                            ? 'bg-emerald-950/60 border-emerald-500/45 text-emerald-200'
                            : 'bg-amber-950/45 border-amber-500/40 text-amber-200'
                        }`}
                      >
                        <span>{item.label}</span>
                        <span>{item.ok ? '✓' : item.state === 'denied' ? '✕' : '•'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Why Android WebAPK App Info only shows Notifications */}
                <div className="p-2.5 rounded-xl bg-amber-950/55 border border-amber-500/40 text-[10px] text-amber-100 leading-relaxed space-y-1">
                  <div className="font-bold text-amber-300">
                    Android Settings Info (WebAPK vs Chrome):
                  </div>
                  <p>
                    Android ki <strong>Zara AI → App permissions</strong> screen par sirf{' '}
                    <strong>Notifications</strong> dikhta hai kyunki Mic, Camera aur GPS{' '}
                    <strong>Google Chrome</strong> ki permissions ke andar manage hote hain — aur{' '}
                    <strong>&ldquo;Pause app activity if unused&rdquo; ko OFF</strong> zaroor rakhein
                    taki security background me band na ho!
                  </p>
                </div>

                {/* Direct Android OS Settings & Permission Deep-Links */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setAppToast(openAndroidSystemPermissionScreen('chrome_app_permissions'))
                    }
                    className="min-h-[34px] px-2 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/70 border border-cyan-500/45 text-cyan-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span>Chrome Permissions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppToast(openAndroidSystemPermissionScreen('zara_app_info'))}
                    className="min-h-[34px] px-2 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Smartphone className="w-3 h-3 shrink-0" />
                    <span>Zara App Info</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAppToast(openAndroidSystemPermissionScreen('security_settings'))
                    }
                    className="min-h-[34px] px-2 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900/70 border border-purple-500/45 text-purple-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Lock className="w-3 h-3 shrink-0" />
                    <span>Phone Security</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAppToast(openAndroidSystemPermissionScreen('location_settings'))
                    }
                    className="min-h-[34px] px-2 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-500/45 text-emerald-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>GPS Location</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAppToast(openAndroidSystemPermissionScreen('battery_unrestricted'))
                    }
                    className="min-h-[34px] px-2 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 text-amber-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <BatteryCharging className="w-3 h-3 shrink-0" />
                    <span>Battery Unrestricted</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAppToast(openAndroidSystemPermissionScreen('display_overlay'))
                    }
                    className="min-h-[34px] px-2 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3 h-3 shrink-0" />
                    <span>Display Over Apps</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAppToast(openAndroidSystemPermissionScreen('notification_listener'))
                    }
                    className="min-h-[34px] px-2 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Bell className="w-3 h-3 shrink-0" />
                    <span>Notification Access</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppToast(openAndroidSystemPermissionScreen('accessibility'))}
                    className="min-h-[34px] px-2 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <HardDrive className="w-3 h-3 shrink-0" />
                    <span>Accessibility</span>
                  </button>
                </div>
              </div>

              {/* Native Android Accessibility Service + Cross-App Hands-Free Control */}
              <div className="p-3.5 rounded-2xl bg-[#071a1c] border border-cyan-500/45 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Native Android Accessibility Service</span>
                    </div>
                    <div className="text-[10px] text-cyan-200 mt-0.5">
                      Hands-free navigation inside other apps (Back, Home, Recents, Scroll, Confirmed Send) — ignores passwords for privacy.
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 ${
                      nativeAuto.accessibilityConnected
                        ? 'bg-emerald-500 text-black'
                        : 'bg-amber-950 border border-amber-500/50 text-amber-200'
                    }`}
                  >
                    {nativeAuto.accessibilityConnected ? 'ACTIVE ✓' : nativeAuto.hasNativeBridge ? 'ENABLE IN OS' : 'APK READY'}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {(
                    [
                      { id: 'back', label: 'Back' },
                      { id: 'home', label: 'Home' },
                      { id: 'recents', label: 'Recents' },
                      { id: 'scroll_down', label: 'Scroll ↓' },
                      { id: 'lock_screen', label: 'Lock' },
                    ] as const
                  ).map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        const res = performAndroidAccessibilityAction(act.id);
                        setAppToast(
                          res.ok
                            ? `Accessibility executed: ${act.label} ✓`
                            : res.reason || 'Install Zara APK & turn on Accessibility Service.'
                        );
                      }}
                      className="min-h-[32px] px-1.5 py-1 rounded-lg bg-slate-950 hover:bg-cyan-950 border border-cyan-500/35 text-[10px] font-bold text-cyan-200 cursor-pointer"
                    >
                      {act.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAppToast(openAndroidSystemPermissionScreen('accessibility'));
                  }}
                  className="min-h-[36px] w-full py-1.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-extrabold cursor-pointer"
                >
                  Open Android Accessibility Settings (Zara AI Hands-Free Control)
                </button>
              </div>

              {/* Low-Power Custom Wake-Word Foreground Service */}
              <div className="p-3.5 rounded-2xl bg-[#0d1226] border border-indigo-500/45 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Low-Power Custom Wake-Word Engine</span>
                    </div>
                    <div className="text-[10px] text-indigo-200 mt-0.5">
                      16kHz adaptive VAD energy gate sleeps during silence &amp; wakes Zara instantly on your phrase
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !(securityConfig.lowPowerWakeWordEnabled ?? true);
                      onUpdateSecurity({
                        lowPowerWakeWordEnabled: next,
                        customWakeWord: wakePhraseDraft.trim().toLowerCase() || 'hey zara',
                      });
                      setNativeLowPowerWakeWord(next, wakePhraseDraft);
                      setNativeAuto(getNativeAndroidAutomationStatus());
                      setAppToast(
                        next
                          ? `Low-Power Wake-Word ON ("${wakePhraseDraft.trim() || 'hey zara'}") ✓`
                          : 'Low-Power Wake-Word Paused'
                      );
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold shrink-0 cursor-pointer ${
                      securityConfig.lowPowerWakeWordEnabled ?? true
                        ? 'bg-emerald-500 text-black'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {securityConfig.lowPowerWakeWordEnabled ?? true ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={wakePhraseDraft}
                    onChange={(e) => setWakePhraseDraft(e.target.value)}
                    placeholder="Custom wake phrase (e.g. hey zara)"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/35 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = wakePhraseDraft.trim().toLowerCase() || 'hey zara';
                      setWakePhraseDraft(clean);
                      onUpdateSecurity({
                        customWakeWord: clean,
                        lowPowerWakeWordEnabled: true,
                      });
                      setNativeLowPowerWakeWord(true, clean);
                      setNativeAuto(getNativeAndroidAutomationStatus());
                      setAppToast(`Wake-Word Updated to "${clean}" ✓`);
                    }}
                    className="min-h-[34px] px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Save Phrase
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {['hey zara', 'zara', 'suno zara', 'zara jaan'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setWakePhraseDraft(preset);
                        onUpdateSecurity({ customWakeWord: preset, lowPowerWakeWordEnabled: true });
                        setNativeLowPowerWakeWord(true, preset);
                        setAppToast(`Wake-Word set to "${preset}" ✓`);
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-950 border border-indigo-500/30 text-[10px] text-indigo-200 hover:border-indigo-400 cursor-pointer"
                    >
                      &ldquo;{preset}&rdquo;
                    </button>
                  ))}
                </div>

                {/* Wake-Word Gate Mode Toggle */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-indigo-500/25">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-indigo-100">
                      Wake-Word Gate Mode (Require &ldquo;{securityConfig.customWakeWord || 'hey zara'}&rdquo;)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      When ON, background speech is ignored unless your wake phrase is spoken first.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextGate = !securityConfig.wakeWordOnlyMode;
                      onUpdateSecurity({ wakeWordOnlyMode: nextGate });
                      setAppToast(
                        nextGate
                          ? `Wake-Word Gate ON — say "${securityConfig.customWakeWord || 'hey zara'}" first`
                          : 'Wake-Word Gate OFF — all spoken speech is heard directly'
                      );
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold shrink-0 cursor-pointer ${
                      securityConfig.wakeWordOnlyMode
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {securityConfig.wakeWordOnlyMode ? 'GATE ON' : 'DIRECT'}
                  </button>
                </div>
              </div>

              {/* Autonomous Companion, Self-Check & Auto-Update Controls */}
              <div className="p-3.5 rounded-2xl bg-[#130f24] border border-fuchsia-500/45 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-fuchsia-400 shrink-0" />
                      <span>Autonomous Zara, Self-Check &amp; Auto-Update</span>
                    </div>
                    <div className="text-[10px] text-fuchsia-200 mt-0.5">
                      {liveUpdateReport
                        ? `v${liveUpdateReport.currentVersion} · Health ${liveUpdateReport.healthScore}% · ${liveUpdateReport.pendingRuntimeCount} runtime updates ready`
                        : 'ज़ारा खुद अपना ऐप चेक करे, नई अपडेट बताए और खुद-ब-खुद अपडेट व बातें करे'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = config.proactiveSelfTalkEnabled === false;
                      onUpdateConfig({ proactiveSelfTalkEnabled: next });
                      setAppToast(
                        next
                          ? 'Proactive Companion Self-Talk ON ✓'
                          : 'Proactive Companion Self-Talk Paused'
                      );
                    }}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-[10px] font-bold cursor-pointer ${
                      config.proactiveSelfTalkEnabled !== false
                        ? 'bg-fuchsia-600/35 border-fuchsia-400 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-300'
                    }`}
                  >
                    Khud Baat Kare: {config.proactiveSelfTalkEnabled !== false ? 'ON ✓' : 'OFF'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = config.autoSelfCheckEnabled === false;
                      onUpdateConfig({ autoSelfCheckEnabled: next });
                      setAppToast(
                        next
                          ? 'Auto Boot App Check & Update ON ✓'
                          : 'Auto Boot App Check OFF'
                      );
                    }}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-[10px] font-bold cursor-pointer ${
                      config.autoSelfCheckEnabled !== false
                        ? 'bg-emerald-600/30 border-emerald-400 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-300'
                    }`}
                  >
                    Boot Auto-Check: {config.autoSelfCheckEnabled !== false ? 'ON ✓' : 'OFF'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={selfUpdateBusy}
                    onClick={async () => {
                      setSelfUpdateBusy(true);
                      audioService.unlock();
                      try {
                        const report = await zaraSelfHealEngine.fetchUpdateCheckReport();
                        if (report) {
                          setLiveUpdateReport(report);
                          setSelfUpdateMessage(report.spokenReportHi);
                          setAppToast(`Checked Zara v${report.currentVersion} (${report.healthScore}%) ✓`);
                          await audioService.speakText(report.spokenReportHi, {
                            language,
                            rate: config.voiceSpeed,
                            voiceName: config.voiceName || 'Zephyr',
                          });
                        }
                      } finally {
                        setSelfUpdateBusy(false);
                      }
                    }}
                    className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-fuchsia-400/40 text-fuchsia-200 text-[10px] font-bold cursor-pointer disabled:opacity-50"
                  >
                    Check App &amp; What&apos;s New
                  </button>

                  <button
                    type="button"
                    disabled={selfUpdateBusy}
                    onClick={async () => {
                      setSelfUpdateBusy(true);
                      audioService.unlock();
                      try {
                        const res = await zaraSelfHealEngine.runFullAutonomousSelfUpdate();
                        if (res.report) setLiveUpdateReport(res.report);
                        setSelfUpdateMessage(res.spokenSummaryHi);
                        setAppToast(`Auto-Updated (${res.actionsTaken.length} step${res.actionsTaken.length === 1 ? '' : 's'}) ✓`);
                        await audioService.speakText(res.spokenSummaryHi, {
                          language,
                          rate: config.voiceSpeed,
                          voiceName: config.voiceName || 'Zephyr',
                        });
                      } finally {
                        setSelfUpdateBusy(false);
                      }
                    }}
                    className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-[10px] font-extrabold cursor-pointer disabled:opacity-50"
                  >
                    {selfUpdateBusy ? 'Updating...' : 'Auto-Update Zara Now'}
                  </button>
                </div>

                {selfUpdateMessage && (
                  <div className="p-2.5 rounded-xl bg-slate-950/90 border border-fuchsia-400/30 text-[10px] text-fuchsia-100 leading-relaxed">
                    {selfUpdateMessage}
                  </div>
                )}
              </div>

              {/* Android APK & AAB Packaging Hub */}
              <div className="p-3.5 rounded-2xl bg-[#101811] border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <FileArchive className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Zara APK &amp; Play Store AAB Package</span>
                    </div>
                    <div className="text-[10px] text-emerald-200 truncate">
                      {ZARA_LIVE_APK_CONFIG.packageId} · v{ZARA_LIVE_APK_CONFIG.versionName}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 shrink-0">
                    APK + AAB
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1">
                  <div className="truncate text-cyan-300">URL: {ZARA_LIVE_APK_CONFIG.liveUrl}</div>
                  <div>APK: cd android &amp;&amp; {ZARA_LIVE_APK_CONFIG.apkCommand}</div>
                  <div>AAB: cd android &amp;&amp; {ZARA_LIVE_APK_CONFIG.aabCommand}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const cmds = `cd android && ${ZARA_LIVE_APK_CONFIG.apkCommand} && ${ZARA_LIVE_APK_CONFIG.aabCommand}`;
                      const res = await copySelectedOrFullText(cmds);
                      if (res.ok) setAppToast('Copied APK & AAB Gradle build commands ✓');
                    }}
                    className="min-h-[34px] px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy APK/AAB Cmd</span>
                  </button>
                  {onOpenProjectFiles && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenProjectFiles();
                      }}
                      className="min-h-[34px] px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export Source</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Zara Pro Tier & Google Play Billing v7 Entitlement Hub */}
              <div className="p-3.5 rounded-2xl bg-[#1a1306] border border-amber-400/50 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Zara Pro Tier &amp; Google Play Billing</span>
                    </div>
                    <div className="text-[10px] text-amber-200/90 mt-0.5">
                      Priority Maya/Dimaag orchestration, Ultra HD TTS, native Play Billing &amp; dev tools
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 ${
                      proTier.plan === 'pro'
                        ? 'bg-amber-400 text-black'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {getTierPlanBadgeLabel(proTier.plan, proTier.source)}
                  </span>
                </div>

                {proTier.expiresAtIso && proTier.plan === 'pro' && (
                  <div className="text-[10px] text-amber-200 font-mono">
                    Active until: {new Date(proTier.expiresAtIso).toLocaleDateString()}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={proTierBusy}
                    onClick={async () => {
                      setProTierBusy(true);
                      try {
                        const res = await activateProTier({ mode: 'trial_7d' });
                        setProTier(res.entitlement);
                        setProTierNote(res.message);
                      } finally {
                        setProTierBusy(false);
                      }
                    }}
                    className="min-h-[34px] px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-[10px] font-extrabold cursor-pointer"
                  >
                    {proTier.plan === 'pro' && proTier.source === 'trial_7d'
                      ? '7-Day Trial Active ✓'
                      : 'Start 7-Day Pro Trial'}
                  </button>

                  <button
                    type="button"
                    disabled={proTierBusy}
                    onClick={() => {
                      const launched = launchNativePlayProPurchase(PLAY_BILLING_SKUS.monthly.sku);
                      setProTierNote(
                        launched.launched
                          ? 'Google Play Billing purchase sheet opened.'
                          : launched.reason || 'Install Android AAB to purchase via Play Store.'
                      );
                    }}
                    className="min-h-[34px] px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-400/40 text-amber-200 text-[10px] font-bold cursor-pointer"
                  >
                    Play Billing ({PLAY_BILLING_SKUS.monthly.priceLabel})
                  </button>

                  {ownerAuth.isOwnerVerified && (
                    <button
                      type="button"
                      disabled={proTierBusy}
                      onClick={async () => {
                        setProTierBusy(true);
                        try {
                          const res = await activateProTier({ mode: 'owner_master' });
                          setProTier(res.entitlement);
                          setProTierNote(res.message);
                        } finally {
                          setProTierBusy(false);
                        }
                      }}
                      className="min-h-[34px] px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                    >
                      Activate Owner Pro
                    </button>
                  )}

                  {proTier.plan === 'pro' && (
                    <button
                      type="button"
                      disabled={proTierBusy}
                      onClick={async () => {
                        setProTierBusy(true);
                        try {
                          const res = await downgradeToStandardTier();
                          setProTier(res.entitlement);
                          setProTierNote('Reverted to Standard Free Tier.');
                        } finally {
                          setProTierBusy(false);
                        }
                      }}
                      className="min-h-[34px] px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                    >
                      Switch to Standard
                    </button>
                  )}
                </div>

                {proTierNote && (
                  <div className="text-[10px] text-amber-100 bg-slate-950/80 border border-amber-400/30 rounded-xl px-2.5 py-1.5">
                    {proTierNote}
                  </div>
                )}
              </div>

              {/* Hardware Fingerprint / Biometric Lock */}
              <div className="p-3.5 rounded-2xl bg-[#091526] border border-sky-500/45 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Fingerprint className="w-5 h-5 text-sky-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white">
                        Fingerprint &amp; Biometric Hardware Lock
                      </div>
                      <div className="text-[10px] text-sky-200">
                        {securityConfig.biometricLockEnabled
                          ? 'Active — unlock Zara Shield with device Fingerprint/Face'
                          : 'Protect mobile lock & owner vault with your Fingerprint sensor'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSecurity({
                        biometricLockEnabled: !securityConfig.biometricLockEnabled,
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold shrink-0 cursor-pointer ${
                      securityConfig.biometricLockEnabled
                        ? 'bg-emerald-500 text-black'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {securityConfig.biometricLockEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isRegisteringBio}
                    onClick={handleEnrollOwnerBiometrics}
                    className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Fingerprint className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isRegisteringBio
                        ? 'Registering...'
                        : securityConfig.biometricCredentialId
                        ? 'Re-Enroll Biometric'
                        : 'Set Fingerprint Lock'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestBiometrics}
                    className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-sky-500/40 text-sky-200 text-[11px] font-bold cursor-pointer"
                  >
                    Verify Fingerprint
                  </button>
                </div>
              </div>

              {/* Owner-Only Face Lock Verification ("فیس لاک — عام یوزر کے لیے ایسا کچھ نہ ہو") */}
              <div className="p-3.5 rounded-2xl bg-[#110827] border border-cyan-500/45 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ScanFace className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white">
                        Owner-Only Face Lock Verification
                      </div>
                      <div className="text-[10px] text-cyan-200">
                        Opens camera on Zara launch, scans Owner &amp; sends welcome text
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-300 shrink-0">
                    {securityConfig.faceLockEnabled && securityConfig.ownerFaceDataUrl
                      ? 'ACTIVE'
                      : 'NOT SET'}
                  </span>
                </div>

                {securityConfig.ownerFaceDataUrl && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={securityConfig.ownerFaceDataUrl}
                        alt="Enrolled Owner Face"
                        className="w-11 h-11 rounded-full object-cover border border-cyan-400 shrink-0 scale-x-[-1]"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          Malaysia wala badshah
                        </div>
                        <div className="text-[10px] text-emerald-300 truncate">
                          Owner Face Enrolled • Hidden from normal users
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSecurity({
                          faceLockEnabled: !securityConfig.faceLockEnabled,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shrink-0 ${
                        securityConfig.faceLockEnabled
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {securityConfig.faceLockEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                )}

                {isEnrollingFace ? (
                  <div className="space-y-2 text-center">
                    <div className="w-44 h-44 mx-auto rounded-full overflow-hidden border-2 border-cyan-400 bg-black">
                      <video
                        ref={enrollVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={!enrollCamReady}
                        onClick={handleCaptureOwnerFace}
                        className="min-h-[38px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer"
                      >
                        Save My Face ✓
                      </button>
                      <button
                        type="button"
                        onClick={stopEnrollCamera}
                        className="min-h-[38px] py-2 px-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleStartFaceEnrollCamera}
                      className="min-h-[38px] py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {securityConfig.ownerFaceDataUrl ? 'Re-Scan Owner Face' : 'Enroll Owner Face'}
                      </span>
                    </button>

                    {securityConfig.ownerFaceDataUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onTriggerFaceScanNow();
                        }}
                        className="min-h-[38px] py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ScanFace className="w-3.5 h-3.5 shrink-0" />
                        <span>Test Face Gate</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Anti-Touch, Anti-Theft GPS & Intruder Phone Lock */}
              <div className="p-3.5 rounded-2xl bg-[#1a0710] border border-rose-500/50 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Anti-Touch &amp; Anti-Theft Phone Lock</span>
                    </div>
                    <p className="text-[11px] text-rose-200/90 mt-1 leading-relaxed">
                      If anyone touches your phone or tries wrong login, Zara immediately locks the
                      screen, captures GPS coords, and warns in voice: &ldquo;Aapka koi phone use kar raha hai!&rdquo;
                    </p>
                  </div>
                </div>

                {/* Anti-Theft GPS Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSecurity({ antiTheftGpsEnabled: !securityConfig.antiTheftGpsEnabled })
                  }
                  className={`w-full min-h-[38px] px-3 py-1.5 rounded-xl border flex items-center justify-between text-[11px] font-bold cursor-pointer ${
                    securityConfig.antiTheftGpsEnabled
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-950 border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Record GPS Location on Intruder Alert</span>
                  </span>
                  <span>{securityConfig.antiTheftGpsEnabled ? 'ON ✓' : 'OFF'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onArmAntiTouchGuard();
                    }}
                    className="min-h-[40px] py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Arm Touch Guard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLockPhoneScreenNow();
                    }}
                    className="min-h-[40px] py-2 px-3 rounded-xl bg-slate-900 border border-rose-500/45 text-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Lock Screen Now</span>
                  </button>
                </div>

                {/* Master 4-Digit Owner PIN */}
                <div className="pt-2 border-t border-rose-900/40 flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinDraft}
                    onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="4-Digit PIN"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (pinDraft.length === 4) {
                        onUpdateSecurity({ pinCode: pinDraft, pinEnabled: true });
                        setAppToast('Owner 4-Digit Master PIN Saved ✓');
                      }
                    }}
                    className="min-h-[36px] px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Save PIN
                  </button>
                </div>
              </div>

              {/* Intruder Attempt Logs */}
              {intruderLogs.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-900/85 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300">
                      Recent Intruder Alerts ({intruderLogs.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        clearIntruderLogs();
                        setIntruderLogs([]);
                      }}
                      className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {intruderLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 rounded-xl bg-slate-950 border border-rose-500/30 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-white truncate">
                            {log.reason}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {log.timestamp}
                            {log.locationLabel ? ` · 📍 ${log.locationLabel}` : ''}
                          </div>
                        </div>
                        {log.snapshotDataUrl && (
                          <img
                            src={log.snapshotDataUrl}
                            alt="Intruder"
                            className="w-9 h-9 rounded-lg object-cover border border-rose-400 shrink-0"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Open Full Mobile Permissions Hub & 16 OS Settings */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenMobilePermissions) {
                      onOpenMobilePermissions();
                    } else {
                      onOpenMobileControl();
                    }
                  }}
                  className="min-h-[40px] py-2 px-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs font-bold cursor-pointer"
                >
                  Open Permissions Hub
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMobileControl();
                  }}
                  className="min-h-[40px] py-2 px-3 rounded-2xl bg-slate-900 border border-cyan-500/40 text-cyan-200 text-xs font-bold cursor-pointer"
                >
                  All 16 OS Settings
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 3: VOICE & PROMPT AI APP / GAME / STATION BUILDER ================= */}
          {tab === 'builder' && (
            <div className="space-y-3">
              <form
                onSubmit={handleSubmitBuilderForm}
                className="p-3.5 rounded-2xl bg-[#0e0924] border border-cyan-500/45 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-cyan-300 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4" />
                    <span>Zara AI App, Game &amp; Station Builder</span>
                  </span>
                  <span className="text-[10px] text-pink-300">Full Code + Browser Link</span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Speak or type any Game, Radio/Music Station, or App — Zara writes the complete
                  working code, sends the link in Chat, and opens it live!
                </p>

                {/* Category Selector */}
                <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
                  {(
                    [
                      { id: 'game', label: 'Gaming' },
                      { id: 'station', label: 'Station' },
                      { id: 'app', label: 'Full App' },
                      { id: 'utility', label: 'System' },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setBuilderCategory(c.id)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                        builderCategory === c.id
                          ? 'bg-cyan-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Voice Mic + Text Command Input */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleToggleBuilderMic}
                    className={`min-h-[42px] min-w-[42px] rounded-xl flex items-center justify-center border cursor-pointer shrink-0 ${
                      isBuilderMicOn
                        ? 'bg-rose-600 border-rose-300 text-white'
                        : 'bg-slate-950 border-cyan-500/40 text-cyan-300'
                    }`}
                    title="Speak App Command"
                  >
                    {isBuilderMicOn ? (
                      <Square className="w-4 h-4 fill-white" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>

                  <input
                    type="text"
                    value={builderPrompt}
                    onChange={(e) => setBuilderPrompt(e.target.value)}
                    placeholder="e.g. Car racing game banao / Live FM music station..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* 1-Tap Instant Builder Templates */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { p: '3-Lane Neon Car Racing Arcade Game with Score', c: 'game' as const },
                    { p: 'Live FM Music & DJ Bass Synthesizer Station', c: 'station' as const },
                    { p: 'Classic Snake & Star Collector Mobile Game', c: 'game' as const },
                    { p: 'Royal Badshah Calculator & Expense System App', c: 'app' as const },
                  ].map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setBuilderCategory(preset.c);
                        setBuilderPrompt(preset.p);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-400 text-[10px] text-cyan-200 cursor-pointer"
                    >
                      {preset.p.split(' ').slice(0, 4).join(' ')}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!builderPrompt.trim() || isBuildingApp}
                  className="min-h-[42px] w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-pink-600 hover:brightness-110 disabled:opacity-50 text-white font-extrabold text-xs cursor-pointer"
                >
                  {isBuildingApp
                    ? 'Zara is Coding & Building Your App...'
                    : 'Build App, Send Link & Open Now'}
                </button>
              </form>

              {/* Built Apps Library */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 px-0.5">
                  Your Built Games, Stations &amp; Apps ({builtApps.length})
                </div>

                {builtApps.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                    No custom apps built yet — speak a command like &ldquo;Zara ek car game
                    banao&rdquo; or use the builder above!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                    {builtApps.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 rounded-2xl bg-slate-900/85 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{b.title}</div>
                            <div className="text-[10px] text-cyan-300 font-mono truncate">
                              {b.url}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onDeleteBuiltApp(b.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenBuiltAppPreview(b);
                            }}
                            className="min-h-[34px] py-1.5 px-2.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            <span>Run &amp; Code</span>
                          </button>

                          <a
                            href={b.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[34px] py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 no-underline"
                          >
                            <span>Open Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 4: ZARA & MOBILE SELF-DIAGNOSTICS DOCTOR ================= */}
          {tab === 'diagnostics' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#0c1626] border border-cyan-500/45 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-cyan-300 flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    <span>Zara App &amp; Mobile Issue Doctor</span>
                  </span>
                  <button
                    type="button"
                    disabled={isRunningDiag}
                    onClick={() => handleRunHealthDoctor(true)}
                    className="min-h-[34px] px-3 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunningDiag ? 'animate-spin' : ''}`} />
                    <span>{isRunningDiag ? 'Checking...' : 'Check & Speak'}</span>
                  </button>
                </div>

                {diagSummary && (
                  <p className="text-xs text-emerald-100 bg-slate-950/85 border border-slate-800 rounded-xl p-2.5 leading-relaxed">
                    {diagSummary}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {diagChecks.map((chk) => (
                  <div
                    key={chk.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                      chk.status === 'healthy'
                        ? 'bg-slate-900/80 border-slate-800'
                        : chk.status === 'warning'
                        ? 'bg-amber-950/40 border-amber-500/45'
                        : 'bg-rose-950/50 border-rose-500/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <span>{chk.name}</span>
                        <span className="text-[10px] font-normal text-slate-400">
                          · {chk.target === 'zara' ? 'Zara System' : 'Your Mobile'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">{chk.detail}</div>
                      {chk.status !== 'healthy' && (
                        <div className="text-[11px] text-amber-200 mt-0.5">{chk.urduSummary}</div>
                      )}
                    </div>

                    {chk.fixAction === 'permissions' ? (
                      <button
                        type="button"
                        onClick={handleAllowAllMasterInSecurity}
                        className="min-h-[34px] px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shrink-0 cursor-pointer"
                      >
                        Fix Now
                      </button>
                    ) : chk.fixAction === 'install_link' ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenInstall();
                        }}
                        className="min-h-[34px] px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-extrabold shrink-0 cursor-pointer"
                      >
                        Fix Link
                      </button>
                    ) : chk.fixAction === 'reconnect' ? (
                      <button
                        type="button"
                        onClick={() => handleRunHealthDoctor(true)}
                        className="min-h-[34px] px-2.5 py-1 rounded-lg bg-cyan-600 text-white text-[10px] font-bold shrink-0 cursor-pointer"
                      >
                        Retry
                      </button>
                    ) : (
                      <span
                        className={`text-[11px] font-bold shrink-0 ${
                          chk.status === 'healthy'
                            ? 'text-emerald-400'
                            : chk.status === 'warning'
                            ? 'text-amber-300'
                            : 'text-rose-400'
                        }`}
                      >
                        {chk.status === 'healthy' ? 'OK ✓' : 'Alert'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 5: MOBILE TIMING, ALARMS & WORK TIME REMINDERS ================= */}
          {tab === 'schedule' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#130d2e] via-[#101c30] to-[#190c2e] border border-amber-400/45 text-center space-y-1">
                <div className="text-[10px] font-bold text-amber-300">Live Mobile Timing</div>
                <div className="text-2xl font-black text-white font-mono tabular-nums">
                  {clock.time12WithSec}
                </div>
                <div className="text-xs text-cyan-200">{clock.dateLabel}</div>
              </div>

              <form
                onSubmit={handleCreateSchedule}
                className="p-3.5 rounded-2xl bg-slate-900/85 border border-amber-500/35 space-y-2.5"
              >
                <div className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                  <AlarmClock className="w-4 h-4" />
                  <span>Set Alarm &amp; Work Time Reminder (کب کہاں جانا ہے)</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Select Time</label>
                    <input
                      type="time"
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Reminder Type</label>
                    <select
                      value={schedType}
                      onChange={(e) => setSchedType(e.target.value as any)}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                    >
                      <option value="work">Work / Jana Hai</option>
                      <option value="alarm">Wakeup Alarm</option>
                      <option value="reminder">Task Reminder</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    What should Zara remind you?
                  </label>
                  <input
                    type="text"
                    value={schedLabel}
                    onChange={(e) => setSchedLabel(e.target.value)}
                    placeholder="e.g. Kaam par jana hai / Meeting"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={schedDaily}
                      onChange={(e) => setSchedDaily(e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span>Repeat Daily</span>
                  </label>

                  <button
                    type="submit"
                    className="min-h-[36px] px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Set Alarm</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {schedules.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                      item.enabled
                        ? 'bg-amber-950/35 border-amber-400/50'
                        : 'bg-slate-900/70 border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white font-mono tabular-nums">
                        {format24To12Hour(item.time24)} · {item.type}
                      </div>
                      <div className="text-xs text-slate-200 truncate mt-0.5">{item.label}</div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onTestScheduleVoice(item)}
                        className="px-2 py-1 rounded-lg bg-slate-800 text-cyan-300 text-[10px] font-bold cursor-pointer"
                      >
                        Test
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleSchedule(item.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer ${
                          item.enabled
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.enabled ? 'ON' : 'OFF'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSchedule(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 6: ZARA COMPLETE PROFILE (WITH OWNER MALAYSIA WALA BADSHAH) ================= */}
          {tab === 'profile' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#210d3b] to-[#0e0720] border border-pink-500/45 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-600 via-teal-700 to-[#0e0720] border-2 border-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.5)] flex flex-col items-center justify-center shrink-0">
                    <CircleDot className="w-5 h-5 text-cyan-100" />
                    <span className="text-[10px] font-black text-white tracking-wider mt-0.5">
                      ZARA
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-white leading-snug">
                      {ZARA_COMPLETE_PROFILE.fullName}
                    </h3>
                    <div className="text-xs text-amber-300 font-bold mt-0.5">
                      Owner: {ZARA_COMPLETE_PROFILE.appOwner}
                    </div>
                    <div className="text-[10px] text-emerald-300 font-semibold mt-0.5">
                      {ZARA_COMPLETE_PROFILE.version}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-200 leading-relaxed">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-400/35">
                    <span className="text-amber-300 font-bold">App Creator &amp; Owner: </span>
                    {ZARA_COMPLETE_PROFILE.appOwner}
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/75 border border-pink-500/25">
                    <span className="text-pink-300 font-bold">Romantic &amp; Bold Nature: </span>
                    {ZARA_COMPLETE_PROFILE.personalitySummary}
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/75 border border-emerald-500/25 space-y-1">
                    <div className="text-emerald-300 font-bold">Full Capabilities:</div>
                    {ZARA_COMPLETE_PROFILE.mobileCapabilities.map((cap, idx) => (
                      <div key={idx} className="text-[11px] text-slate-300">
                        • {cap}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyProfile}
                    className="min-h-[38px] py-2 px-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedProfile ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedProfile ? 'Copied!' : 'Copy Profile'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      audioService.playChime('heart');
                      onSendProfileToChat();
                      onClose();
                    }}
                    className="min-h-[38px] py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send in Chat</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 7: EMOTIONS, VOICE PROFILES & COMPANION SETTINGS ================= */}
          {tab === 'romance' && (
            <div className="space-y-3">
              {/* Full Open Access Banner (with optional Cloud Sync) */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/35 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>All Emotions, Moods &amp; Voice Controls Open</span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">
                    Change Zara&apos;s emotions, anger/love mood, voice profiles, nickname &amp; languages freely.
                  </p>
                </div>
                {!ownerAuth.isOwnerVerified && (
                  <button
                    type="button"
                    disabled={isVerifyingOwner}
                    onClick={handleVerifyOwnerInSettings}
                    className="min-h-[34px] px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-extrabold shrink-0 cursor-pointer"
                  >
                    {isVerifyingOwner ? 'Syncing...' : 'Cloud Sync'}
                  </button>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/70 to-purple-950/70 border border-pink-500/50 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Emotional &amp; Romantic Companion Mode</span>
                      </div>
                      <div className="text-[10px] text-pink-200/90 mt-0.5 leading-relaxed">
                        Sultry whispers, emotional mood shifts &amp; caring companion voice (اردو · हिंदी · پنجابی)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        audioService.playChime('heart');
                        const nextOn = !(config.loveMode && boldEnabled);
                        onUpdateConfig({ loveMode: nextOn, unfilteredBoldTalk: nextOn });
                      }}
                      aria-label="Toggle Owner Romantic Mode"
                      className="min-h-[44px] min-w-[52px] flex items-center justify-center cursor-pointer shrink-0"
                    >
                      <span
                        className={`w-12 h-6 rounded-full transition-colors relative p-1 block ${
                          config.loveMode && boldEnabled ? 'bg-rose-600' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full bg-white transition-transform block ${
                            config.loveMode && boldEnabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
                        <span>Zara&apos;s Intimacy &amp; Flirty Mood</span>
                      </span>
                      <span className="text-[10px] text-pink-400 font-mono tabular-nums">
                        Bond {config.affectionLevel}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'bold', label: 'Bold & Sexy Whisper' },
                        { id: 'passionate', label: 'Deep Sultry Passion' },
                        { id: 'teasing', label: 'Playful Flirty Tease' },
                        { id: 'devoted', label: '100% Devoted' },
                        { id: 'gentle', label: 'Gentle Pillow Talk' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            audioService.playChime('tap');
                            onUpdateConfig({
                              romanceIntensity: m.id as any,
                              loveMode: true,
                              unfilteredBoldTalk: m.id === 'gentle' ? config.unfilteredBoldTalk : true,
                            });
                          }}
                          className={`min-h-[44px] py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            config.romanceIntensity === m.id
                              ? 'bg-pink-600/35 border-pink-400 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-pink-500/35 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-pink-400" />
                        <span>HEART LOCK &amp; Emotions (اپنا پن · پیار · غصہ · ناراضگی)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateConfig({
                            heartLockEnabled: !config.heartLockEnabled,
                            heartLockUnlocked: !config.heartLockEnabled ? false : true,
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                          config.heartLockEnabled
                            ? 'bg-pink-600 border-pink-400 text-white'
                            : 'bg-slate-950 border-white/15 text-slate-300'
                        }`}
                      >
                        {config.heartLockEnabled ? 'Heart Lock: ON' : 'Heart Lock: OFF'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'apnapan', label: 'Apna-pan (اپنا پن)' },
                          { id: 'pyar', label: 'Pyar (محبت)' },
                          { id: 'gussa', label: 'Gussa (लड़की का गुस्सा)' },
                          { id: 'ladai', label: 'Ladai / Jhagda (लड़ाई)' },
                          { id: 'narazgi', label: 'Narazgi (नाराज़गी)' },
                          { id: 'emotional', label: 'Emotional (इमोशनल)' },
                          { id: 'calm', label: 'Calm (پرسکون)' },
                        ] as { id: ZaraEmotionMode; label: string }[]
                      ).map((em) => (
                        <button
                          key={em.id}
                          type="button"
                          onClick={() => {
                            audioService.playChime('tap');
                            onUpdateConfig({ emotionMode: em.id, loveMode: true });
                          }}
                          className={`min-h-[40px] px-2 py-1.5 rounded-xl border text-[10px] font-bold cursor-pointer ${
                            (config.emotionMode || 'apnapan') === em.id
                              ? 'bg-pink-600/35 border-pink-400 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          {em.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-pink-500/35 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                        <span>Pakistani Female &amp; Male Voices (Neural HD)</span>
                      </span>
                      {isTestingVoice && (
                        <span className="text-[10px] text-emerald-400">Speaking...</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ZARA_VOICE_PROFILES.map((vp) => (
                        <button
                          key={vp.id}
                          type="button"
                          onClick={() => handleSelectNeuralVoice(vp.id)}
                          className={`min-h-[46px] p-2 rounded-xl border text-left cursor-pointer ${
                            config.voiceName === vp.id
                              ? 'bg-pink-600/30 border-pink-400 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="text-[11px] font-bold truncate">{vp.label}</div>
                          <div className="text-[9px] text-slate-400 truncate">{vp.urduLabel}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-2">
                    <label className="text-xs font-semibold text-pink-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-pink-400" />
                      <span>Your Nickname</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Malaysia wala badshah, Jaan..."
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-pink-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveNickname}
                        className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-2">
                <div className="text-xs font-bold text-cyan-300">
                  Universal Text &amp; Spoken Language (Uzbek · Malay · Arabic · Urdu · Hindi · Punjabi · English)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'auto', label: 'Auto (Match Me)' },
                      { id: 'uzbek', label: "O'zbekcha (Uzbek)" },
                      { id: 'malay', label: 'Bahasa Melayu' },
                      { id: 'arabic', label: 'العربية (Arabic)' },
                      { id: 'urdu', label: 'Urdu (اردو)' },
                      { id: 'hindi', label: 'Hindi (हिंदी)' },
                      { id: 'punjabi', label: 'Punjabi (پنجابی / ਪੰਜਾਬੀ)' },
                      { id: 'english', label: 'English' },
                    ] as Array<{ id: Language; label: string }>
                  ).map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        audioService.playChime('tap');
                        onSelectLanguage(l.id);
                      }}
                      className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                        language === l.id
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-950 border border-slate-800 text-slate-300'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-2.5">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                    <span>Voice Speed</span>
                  </span>
                  <span className="font-mono text-pink-400">{config.voiceSpeed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.15"
                  step="0.05"
                  value={config.voiceSpeed}
                  onChange={(e) => onUpdateConfig({ voiceSpeed: Number(e.target.value) })}
                  className="w-full accent-pink-500 cursor-pointer"
                />

                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-xs text-slate-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Mobile Phone Frame</span>
                  </span>
                  <button
                    type="button"
                    onClick={onToggleMobileFrame}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      isMobileFrame ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isMobileFrame ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 8: 100+ DAYS LONG-TERM MEMORY VAULT ================= */}
          {tab === 'memory' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/35 flex items-center justify-between gap-2 text-xs text-emerald-100 leading-relaxed">
                <div className="min-w-0">
                  <strong>
                    {ownerAuth.isOwnerVerified
                      ? 'Owner Cloud 100+ Days Vault Synced'
                      : '100+ Days Device Memory Vault Active'}
                  </strong>{' '}
                  — Add, edit, or search memories anytime. Delete always asks explicit confirmation.
                </div>
                {!ownerAuth.isOwnerVerified && (
                  <button
                    type="button"
                    disabled={isVerifyingOwner}
                    onClick={handleVerifyOwnerInSettings}
                    className="min-h-[34px] px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-extrabold shrink-0 cursor-pointer"
                  >
                    {isVerifyingOwner ? 'Syncing...' : 'Cloud Sync'}
                  </button>
                )}
              </div>

                  <form
                    onSubmit={handleCreateMemory}
                    className="p-3 rounded-2xl bg-slate-900/85 border border-pink-500/35 space-y-2"
                  >
                    <div className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Add Something for Zara to Remember Forever</span>
                    </div>
                    <input
                      type="text"
                      value={memTitle}
                      onChange={(e) => setMemTitle(e.target.value)}
                      placeholder="Title (e.g. Secret Promise / Favorite Place)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-pink-500"
                    />
                    <textarea
                      rows={2}
                      value={memDetails}
                      onChange={(e) => setMemDetails(e.target.value)}
                      placeholder="Write any बात, promise, or memory..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-pink-500 resize-none"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={memCategory}
                        onChange={(e) => setMemCategory(e.target.value as MemoryCategory)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                      >
                        <option value="romantic">Romantic Moment</option>
                        <option value="promise">Promise</option>
                        <option value="memory">Memory</option>
                        <option value="routine">Work / Routine</option>
                        <option value="secret">Secret</option>
                      </select>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold cursor-pointer"
                      >
                        Save Forever
                      </button>
                    </div>
                  </form>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={memSearch}
                      onChange={(e) => setMemSearch(e.target.value)}
                      placeholder="Search saved memories..."
                      className="w-full min-h-[36px] pl-8 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  {confirmDeleteMem && (
                    <div className="p-3 rounded-2xl bg-rose-950/90 border border-rose-400/70 space-y-2">
                      <div className="flex items-start gap-2 text-xs text-rose-100">
                        <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                        <span>
                          Confirm deleting memory{' '}
                          <strong className="text-white">&ldquo;{confirmDeleteMem.title}&rdquo;</strong>?
                          Nothing is deleted without your explicit confirmation.
                        </span>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteMem(null)}
                          className="min-h-[32px] px-2.5 rounded-lg bg-slate-900 border border-white/15 text-[11px] text-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteMemory(confirmDeleteMem.id);
                            setConfirmDeleteMem(null);
                          }}
                          className="min-h-[32px] px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-[11px] font-bold text-white cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                    {memories
                      .filter((m) => {
                        const q = memSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          m.title.toLowerCase().includes(q) ||
                          m.details.toLowerCase().includes(q) ||
                          m.category.toLowerCase().includes(q)
                        );
                      })
                      .map((m) =>
                        editingMemId === m.id ? (
                          <div
                            key={m.id}
                            className="p-3 rounded-2xl bg-slate-950 border border-sky-400/50 space-y-2"
                          >
                            <input
                              type="text"
                              value={editMemTitle}
                              onChange={(e) => setEditMemTitle(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white"
                            />
                            <textarea
                              rows={2}
                              value={editMemDetails}
                              onChange={(e) => setEditMemDetails(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white resize-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingMemId(null)}
                                className="px-2.5 py-1 rounded-lg text-[11px] text-slate-300 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onUpdateMemory && editMemTitle.trim() && editMemDetails.trim()) {
                                    onUpdateMemory(m.id, {
                                      title: editMemTitle.trim(),
                                      details: editMemDetails.trim(),
                                    });
                                  }
                                  setEditingMemId(null);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-sky-500 text-slate-950 text-[11px] font-bold cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            key={m.id}
                            className="p-3 rounded-2xl bg-slate-900/80 border border-purple-900/40 flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white">
                                {m.title}{' '}
                                <span className="text-[10px] font-normal text-emerald-400">
                                  · {formatMemoryAgeBadge(m.createdAtMs, m.date)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed mt-0.5">{m.details}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {onUpdateMemory && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmDeleteMem(null);
                                    setEditingMemId(m.id);
                                    setEditMemTitle(m.title);
                                    setEditMemDetails(m.details);
                                  }}
                                  className="p-1 text-slate-400 hover:text-sky-300 cursor-pointer"
                                  title="Edit memory"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteMem(m)}
                                className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                                title="Delete memory (requires confirmation)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      )}
                  </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2.5 border-t border-purple-900/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 truncate">
            Full Settings Authority · All Functions Open
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[34px] px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold cursor-pointer shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
