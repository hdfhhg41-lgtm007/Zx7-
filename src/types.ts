export type Language =
  | 'urdu'
  | 'roman_urdu'
  | 'punjabi'
  | 'hindi'
  | 'english'
  | 'uzbek'
  | 'malay'
  | 'arabic'
  | 'auto';

export type AiAssistantId = 'zara';

export interface AiAssistantProfile {
  id: AiAssistantId;
  name: string;
  shortLabel: string;
  tagline: string;
  description: string;
  defaultVoice: ZaraVoiceName;
  accentColor: string;
  isAiPersona: true;
  disclosureText: string;
}

export const ZARA_AI_ASSISTANTS: AiAssistantProfile[] = [
  {
    id: 'zara',
    name: 'Zara AI Assistant',
    shortLabel: 'Zara',
    tagline: 'Personal Voice, Phone, Social & Music OS',
    description: 'Natural voice assistant for phone control, YouTube songs, WhatsApp messaging & social apps.',
    defaultVoice: 'Zephyr',
    accentColor: 'rose',
    isAiPersona: true,
    disclosureText: 'Zara Personal AI Assistant',
  },
];

export type CameraFacing = 'user' | 'environment';

export interface ResearchSourceCitation {
  title: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'zara';
  text: string;
  timestamp: string;
  createdAtMs?: number;
  language?: Language;
  assistantId?: AiAssistantId;
  assistantLabel?: string;
  detectedLanguage?: string;
  sources?: ResearchSourceCitation[];
  audioUrl?: string;
  imageUrl?: string;
  isFavorite?: boolean;
  actionTriggered?: string;
}

export type MemoryCategory =
  | 'promise'
  | 'memory'
  | 'preference'
  | 'secret'
  | 'romantic'
  | 'routine';

export interface MemoryItem {
  id: string;
  title: string;
  date: string;
  details: string;
  category: MemoryCategory;
  createdAtMs?: number;
}

export interface AlarmScheduleItem {
  id: string;
  time24: string; // "HH:MM" in 24-hour format
  label: string; // e.g., "Kaam par jana hai", "Office Meeting", "Wake Up Alarm"
  type: 'alarm' | 'work' | 'reminder';
  repeatDaily: boolean;
  enabled: boolean;
  lastTriggeredDate?: string; // "YYYY-MM-DD"
  createdAtMs: number;
}

export interface GiftItem {
  id: string;
  name: string;
  nameUrdu: string;
  icon: string;
  coins: number;
  affectionBonus: number;
  reactionUrdu: string;
  reactionPunjabi: string;
  reactionEnglish: string;
}

export type ZaraVoiceGender = 'female' | 'male';

export type ZaraVoiceName = 'Zephyr' | 'Kore' | 'Aoede' | 'Fenrir' | 'Charon' | 'Orus';

export interface ZaraVoiceProfile {
  id: ZaraVoiceName;
  gender: ZaraVoiceGender;
  label: string;
  urduLabel: string;
  style: string;
}

export const ZARA_VOICE_PROFILES: ZaraVoiceProfile[] = [
  {
    id: 'Zephyr',
    gender: 'female',
    label: 'Zara · Soft & Caring (Female)',
    urduLabel: 'نرم اور اپنائیت بھری پاکستانی لڑکی کی آواز',
    style: 'Warm, caring Pakistani female voice',
  },
  {
    id: 'Kore',
    gender: 'female',
    label: 'Hina · Lively & Expressive (Female)',
    urduLabel: 'شوخ، واضح اور پرجوش لڑکی کی آواز',
    style: 'Lively, articulate Pakistani female voice',
  },
  {
    id: 'Aoede',
    gender: 'female',
    label: 'Noor · Calm & Melodic (Female)',
    urduLabel: 'پرسکون اور سریلی آواز',
    style: 'Smooth melodic female voice',
  },
  {
    id: 'Fenrir',
    gender: 'male',
    label: 'Aryan · Deep & Confident (Male)',
    urduLabel: 'باوقار اور گہری پاکستانی مردانہ آواز',
    style: 'Deep, warm Pakistani male voice',
  },
  {
    id: 'Charon',
    gender: 'male',
    label: 'Zain · Calm & Gentle (Male)',
    urduLabel: 'نرم اور مطمئن مردانہ آواز',
    style: 'Steady calm Pakistani male voice',
  },
  {
    id: 'Orus',
    gender: 'male',
    label: 'Hamza · Expressive & Warm (Male)',
    urduLabel: 'پرجوش اور واضح مردانہ آواز',
    style: 'Rich expressive male voice',
  },
];

export function getVoiceGenderFromName(voiceName?: string): ZaraVoiceGender {
  return voiceName === 'Fenrir' || voiceName === 'Charon' || voiceName === 'Orus'
    ? 'male'
    : 'female';
}

export type ZaraEmotionMode =
  | 'apnapan'
  | 'pyar'
  | 'khushi'
  | 'masti'
  | 'udaas'
  | 'gussa'
  | 'narazgi'
  | 'ladai'
  | 'emotional'
  | 'calm';

export type ZaraOutfitId = 'royal_crimson' | 'cyber_rose' | 'emerald_queen' | 'midnight_silk';

export type Zara4DExpression = 'smile' | 'blush' | 'wink' | 'love';

export type VisionMode = 'off' | 'camera' | 'screen';

export interface SecurityAndControlConfig {
  pinEnabled: boolean;
  pinCode: string;
  autoAppLaunch: boolean;
  voiceControlEnabled: boolean;
  privacyGuard: boolean;
  allPermissionsGranted: boolean;
  faceLockEnabled?: boolean;
  ownerFaceDataUrl?: string;
  ownerEnrolledAt?: string;
  antiTouchGuardArmed?: boolean;
  autoLockOnIntruder?: boolean;
  ownerName?: string;
  biometricLockEnabled?: boolean;
  biometricCredentialId?: string;
  antiTheftGpsEnabled?: boolean;
  customWakeWord?: string;
  lowPowerWakeWordEnabled?: boolean;
  wakeWordOnlyMode?: boolean;
  accessibilityAutomationEnabled?: boolean;
}

export interface IntruderAlertEvent {
  id: string;
  timestamp: string;
  reason: string;
  snapshotDataUrl?: string;
  locationLabel?: string;
}

export interface DiagnosticCheckItem {
  id: string;
  target: 'zara' | 'mobile';
  name: string;
  status: 'healthy' | 'warning' | 'issue';
  detail: string;
  urduSummary: string;
  fixAction?: 'permissions' | 'audio' | 'reconnect' | 'battery' | 'install_link' | 'none';
}

export interface WhatsAppContactItem {
  id: string;
  name: string;
  phone: string;
}

export type RomanceIntensityMode = 'gentle' | 'passionate' | 'teasing' | 'devoted' | 'bold';

export type SettingsTabId =
  | 'controls'
  | 'apps'
  | 'security'
  | 'diagnostics'
  | 'schedule'
  | 'profile'
  | 'romance'
  | 'memory';

export type ZaraUiThemeId =
  | 'cyber_cyan'
  | 'royal_violet'
  | 'emerald_matrix'
  | 'crimson_flare'
  | 'golden_aura';

export interface StudioTaskActivity {
  id: string;
  title: string;
  detail: string;
  assignedTo: 'aryan' | 'noor' | 'both';
  status: 'working' | 'completed';
  isOffline?: boolean;
  updatedAt: number;
}

export interface PersonalityConfig {
  loveMode: boolean;
  affectionLevel: number; // 0 to 100
  obedienceLevel: number; // 0 to 100
  romanceIntensity: RomanceIntensityMode;
  emotionMode?: ZaraEmotionMode;
  uiTheme?: ZaraUiThemeId;
  showHudQuickBar?: boolean;
  heartLockEnabled?: boolean;
  heartLockUnlocked?: boolean;
  heartLockPin?: string;
  unfilteredBoldTalk?: boolean;
  ownerOnlyRomance?: boolean;
  isOwnerSessionUnlocked?: boolean;
  ambientVisionEnabled?: boolean;
  voicePitch: number;
  voiceSpeed: number;
  voiceGender?: ZaraVoiceGender;
  voiceName: ZaraVoiceName;
  avatarOutfit: ZaraOutfitId;
  portraitId?: string;
  userNickname: string;
  wakeWordEnabled: boolean;
  autoSpeak: boolean;
  activeAssistantId?: AiAssistantId;
  preferredReplyLanguage?: Language;
  proactiveSelfTalkEnabled?: boolean;
  proactiveIntervalMinutes?: 2 | 5 | 10 | 15;
  proactiveContinueLastTopic?: boolean;
  proactiveAllowInHandsFree?: boolean;
  busyQuietMode?: boolean;
  backgroundCameraAwarenessEnabled?: boolean;
  autoSelfCheckEnabled?: boolean;
  brainMode?: AiBrainEngineId;
  sttEngine?: SttEngineId;
  ttsEngine?: TtsEngineId;
  enabledAiEngines?: Record<string, boolean>;
}

export type MessagingAppTarget =
  | 'whatsapp'
  | 'whatsapp_business'
  | 'sms'
  | 'telegram'
  | 'messenger';

export interface PendingCallOrMessageAction {
  id: string;
  kind: 'phone_call' | 'whatsapp_call' | 'message';
  contactName: string;
  phone: string;
  messagingApp: MessagingAppTarget;
  messageBody?: string;
  createdAtMs: number;
}

export interface IncomingNotificationItem {
  id: string;
  type: 'incoming_call' | 'message' | 'system';
  appName: string;
  sender: string;
  body: string;
  timestamp: string;
  createdAtMs: number;
  isSensitiveMasked?: boolean;
  conversationTitle?: string;
  isGroup?: boolean;
}

export interface SpokenNotificationConfig {
  enabled: boolean;
  announceCalls: boolean;
  announceMessages: boolean;
  readMessageContent: boolean;
  maskSensitiveCodes: boolean;
}

export type AzanCityId = 'lahore' | 'karachi' | 'islamabad' | 'auto_gps';

export interface AzanRamadanConfig {
  enabled: boolean;
  city: AzanCityId;
  latitude?: number;
  longitude?: number;
  cityName?: string;
  azanAudioAlert: boolean;
  sehriAlert: boolean;
  sehriMinutesBefore: number;
  iftarAlert: boolean;
  prayerTimeMute: boolean;
  lastTriggeredKeys: Record<string, string>;
}

export interface SurroundingsSnapshot {
  locationLabel: string;
  tempC: number | null;
  weatherCondition: string;
  humidity?: number;
  batteryPct: number | null;
  batteryTempC: number | null;
  isCharging: boolean | null;
  networkType?: string;
  online: boolean;
  cameraSummary?: string;
  localTimeStr?: string;
  localDateStr?: string;
  timezone?: string;
  capturedAtIso: string;
}

export type AiBrainEngineId =
  | 'auto'
  | 'dimaag_llm'
  | 'maya_agentic_plan'
  | 'maya_mind'
  | 'openai'
  | 'groq'
  | 'normal_mode'
  | 'normal_swift_mode'
  | 'tez_dimaag';

export type SttEngineId = 'hunter_stt_beta';

export type TtsEngineId = 'hunter_tts_ultra_premium' | 'custom_hunter_tts';

export type AllAiSystemId =
  | 'dimaag_llm'
  | 'maya_agentic_plan'
  | 'maya_mind'
  | 'openai'
  | 'groq'
  | 'hunter_stt_beta'
  | 'custom_hunter_tts'
  | 'hunter_tts_ultra_premium'
  | 'normal_mode'
  | 'normal_swift_mode'
  | 'tez_dimaag';

export interface AiSystemNodeStatus {
  id: AllAiSystemId;
  name: string;
  role: 'llm' | 'stt' | 'tts';
  description: string;
  provider: 'gemini' | 'openai' | 'groq' | 'hybrid';
  modelId: string;
  enabled: boolean;
  configured: boolean;
  healthy: boolean;
  requiresExternalKey?: string;
  lastLatencyMs?: number;
  lastUsedAtMs?: number;
  lastError?: string;
  totalCalls: number;
  totalFallbacks: number;
}

export interface AiOrchestratorSnapshot {
  ok: boolean;
  primaryBrainMode: AiBrainEngineId;
  sttEngine: SttEngineId;
  ttsEngine: TtsEngineId;
  autoFallbackEnabled: boolean;
  providerKeys: {
    gemini: boolean;
    openai: boolean;
    groq: boolean;
    hunterCustom: boolean;
    dimaagCustom: boolean;
    mayaCustom: boolean;
  };
  systems: AiSystemNodeStatus[];
  checkedAt: string;
}

export interface AiOrchestratorTestResult {
  id: AllAiSystemId;
  name: string;
  role: 'llm' | 'stt' | 'tts';
  ok: boolean;
  configured: boolean;
  status: 'passed' | 'fallback_passed' | 'unconfigured' | 'failed';
  providerUsed: string;
  modelIdUsed: string;
  latencyMs: number;
  detail: string;
  sampleOutput?: string;
  audioBytes?: number;
}

export type SocialPlatformId =
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'snapchat'
  | 'whatsapp'
  | 'telegram'
  | 'youtube'
  | 'twitter';

export interface SocialAccountStatus {
  platform: SocialPlatformId;
  name: string;
  connected: boolean;
  connectionSource: 'official_api_token' | 'vault_token' | 'deep_link_ready' | 'unconfigured';
  requiredEnvVars: string[];
  capabilities: string[];
  detail: string;
  profileHandle?: string;
}

export interface SocialDraftItem {
  id: string;
  platform: SocialPlatformId;
  actionType: 'post' | 'reply' | 'caption';
  title: string;
  content: string;
  hashtags?: string[];
  mediaNote?: string;
  status: 'pending_approval' | 'approved' | 'published' | 'failed';
  createdAtIso: string;
  publishResult?: string;
}

export interface SelfImproveCapabilityCheck {
  id: string;
  name: string;
  status: 'working' | 'partial' | 'needs_key_or_permission';
  detail: string;
  recommendation?: string;
}

export interface SelfImproveAuditReport {
  auditedAt: string;
  overallScore: number;
  capabilities: SelfImproveCapabilityCheck[];
  detectedErrors: string[];
  recommendedUpgrades: Array<{
    id: string;
    title: string;
    reason: string;
    suggestedPrompt: string;
  }>;
}

export interface ZaraUpdateItem {
  id: string;
  version: string;
  title: string;
  summaryHi: string;
  category: 'autonomous' | 'emotion' | 'ai_brain' | 'voice' | 'android' | 'social';
  status: 'installed' | 'available_runtime' | 'requires_build_or_secret';
  canAutoApplyRuntime?: boolean;
  appliedAtIso?: string;
}

export interface ZaraUpdateReport {
  checkedAt: string;
  currentVersion: string;
  healthScore: number;
  cooledDownModels: number;
  pendingRuntimeCount: number;
  whatsNewInZara: ZaraUpdateItem[];
  pendingRuntimeUpdates: ZaraUpdateItem[];
  appliedRuntimeUpdates: ZaraUpdateItem[];
  recommendedNextUpdates: Array<{
    id: string;
    title: string;
    reason: string;
    canAutoApplyRuntime: boolean;
    suggestedPrompt: string;
  }>;
  spokenReportHi: string;
}

export type MusicControlAction =
  | 'play'
  | 'pause'
  | 'resume'
  | 'next'
  | 'previous'
  | 'volume_up'
  | 'volume_down'
  | 'mute';

export interface MusicControlCommand {
  action: MusicControlAction;
  query?: string;
  provider?: 'yt_music' | 'spotify' | 'youtube' | 'system';
}
