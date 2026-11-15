import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Check,
  Copy,
  Download,
  EyeOff,
  ImagePlus,
  MessageSquare,
  Mic,
  PhoneIncoming,
  Repeat,
  ShieldCheck,
  Smartphone,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { audioService } from '../services/audioService';
import {
  deleteCustomPortrait,
  getAllZaraPortraits,
  saveCustomPortrait,
  ZaraPortraitItem,
} from '../data/zaraPortraits';
import {
  buildSpokenNotificationAnnouncement,
  copyTextToClipboard,
  hasNativeAndroidCompanionBridge,
  maskSensitiveNotificationText,
  NATIVE_ANDROID_COMPANION_GUIDE_TEXT,
  openAndroidSystemPermissionScreen,
} from '../services/androidAssistantBridgeService';
import { compressImageToJpeg } from '../services/selfHealAndMacroService';
import {
  IncomingNotificationItem,
  Language,
  SpokenNotificationConfig,
  ZaraVoiceName,
} from '../types';

export type AssistantControlHubTab = 'alerts' | 'avatar' | 'android';

interface NotificationsModalProps {
  isOpen: boolean;
  initialTab?: AssistantControlHubTab;
  onClose: () => void;
  language: Language;
  voiceName?: ZaraVoiceName;
  spokenConfig: SpokenNotificationConfig;
  onUpdateSpokenConfig: (updates: Partial<SpokenNotificationConfig>) => void;
  notifications: IncomingNotificationItem[];
  onSimulateIncomingAlert: (item: Omit<IncomingNotificationItem, 'id' | 'timestamp' | 'createdAtMs'>) => void;
  onClearNotifications: () => void;
  onRepeatLastNotification: () => void;
  alwaysOnVoiceEnabled: boolean;
  onToggleAlwaysOnVoice: () => void;
  selectedPortraitId?: string;
  onSelectPortrait: (portraitId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  initialTab = 'alerts',
  onClose,
  language,
  voiceName = 'Zephyr',
  spokenConfig,
  onUpdateSpokenConfig,
  notifications,
  onSimulateIncomingAlert,
  onClearNotifications,
  onRepeatLastNotification,
  alwaysOnVoiceEnabled,
  onToggleAlwaysOnVoice,
  selectedPortraitId,
  onSelectPortrait,
}) => {
  const [activeTab, setActiveTab] = useState<AssistantControlHubTab>(initialTab);
  const [portraits, setPortraits] = useState<ZaraPortraitItem[]>(() => getAllZaraPortraits());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedKotlin, setCopiedKotlin] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const bgUploadRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setPortraits(getAllZaraPortraits());
      setStatusNote(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleUploadCustomBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageToJpeg(file, 1080, 0.85);
      const saved = saveCustomPortrait(compressed.dataUrl);
      const refreshed = getAllZaraPortraits();
      setPortraits(refreshed);
      onSelectPortrait(saved.id);
      setStatusNote('Custom full-screen background saved and applied.');
    } catch {
      setStatusNote('Could not read selected image — please choose a standard JPEG or PNG.');
    }
  };

  const handleDownloadKotlinGuide = () => {
    const blob = new Blob([NATIVE_ANDROID_COMPANION_GUIDE_TEXT], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Zara-Android-Native-Companion-Kotlin.txt';
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 500);
    setStatusNote('Downloaded Native Android Kotlin Companion setup file.');
  };

  const nativeBridgeActive = hasNativeAndroidCompanionBridge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <input
        ref={bgUploadRef}
        type="file"
        accept="image/*"
        onChange={handleUploadCustomBackground}
        className="hidden"
      />

      <div className="w-full max-w-lg max-h-[90vh] bg-slate-950 border border-white/15 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-white truncate">
              Spoken Alerts, HD Avatar &amp; Android Permissions
            </h2>
            <p className="text-xs text-slate-400 truncate">
              Incoming Call/Message Reader · Change Background · Privacy &amp; OS Controls
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Filter Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 mt-3 rounded-2xl bg-slate-900 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap truncate cursor-pointer transition-colors ${
              activeTab === 'alerts'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Spoken Alerts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('avatar')}
            className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap truncate cursor-pointer transition-colors ${
              activeTab === 'avatar'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            HD Avatar BG
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap truncate cursor-pointer transition-colors ${
              activeTab === 'android'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Permissions &amp; OS
          </button>
        </div>

        {statusNote && (
          <div className="mt-2.5 px-3 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-xs text-emerald-200">
            {statusNote}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-0.5">
          {/* TAB 1: INCOMING CALL & MESSAGE NOTIFICATIONS */}
          {activeTab === 'alerts' && (
            <>
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">
                      Announce Incoming Calls &amp; Messages Aloud
                    </div>
                    <div className="text-xs text-slate-400">
                      Requires your explicit consent. Turn off anytime for silence.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      audioService.unlock();
                      const next = !spokenConfig.enabled;
                      if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
                        Notification.requestPermission().catch(() => {});
                      }
                      onUpdateSpokenConfig({ enabled: next });
                    }}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      spokenConfig.enabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {spokenConfig.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSpokenConfig({ announceCalls: !spokenConfig.announceCalls })
                    }
                    className={`min-h-[42px] px-3 py-2 rounded-xl border text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                      spokenConfig.announceCalls
                        ? 'bg-slate-800/90 border-emerald-400/50 text-emerald-200'
                        : 'bg-slate-950 border-white/10 text-slate-400'
                    }`}
                  >
                    <span>Incoming Call Caller ID</span>
                    <span className="font-bold">{spokenConfig.announceCalls ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSpokenConfig({ announceMessages: !spokenConfig.announceMessages })
                    }
                    className={`min-h-[42px] px-3 py-2 rounded-xl border text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                      spokenConfig.announceMessages
                        ? 'bg-slate-800/90 border-emerald-400/50 text-emerald-200'
                        : 'bg-slate-950 border-white/10 text-slate-400'
                    }`}
                  >
                    <span>WhatsApp / SMS Sender</span>
                    <span className="font-bold">{spokenConfig.announceMessages ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSpokenConfig({ readMessageContent: !spokenConfig.readMessageContent })
                    }
                    className={`min-h-[42px] px-3 py-2 rounded-xl border text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                      spokenConfig.readMessageContent
                        ? 'bg-amber-950/70 border-amber-400/60 text-amber-200'
                        : 'bg-slate-950 border-white/10 text-slate-300'
                    }`}
                  >
                    <span>Read Message Body Aloud</span>
                    <span className="font-bold">
                      {spokenConfig.readMessageContent ? 'ON' : 'Private'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSpokenConfig({ maskSensitiveCodes: !spokenConfig.maskSensitiveCodes })
                    }
                    className={`min-h-[42px] px-3 py-2 rounded-xl border text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                      spokenConfig.maskSensitiveCodes
                        ? 'bg-slate-800/90 border-cyan-400/50 text-cyan-200'
                        : 'bg-slate-950 border-white/10 text-slate-400'
                    }`}
                  >
                    <span>Hide OTP &amp; Bank Codes</span>
                    <span className="font-bold">
                      {spokenConfig.maskSensitiveCodes ? 'Protected' : 'OFF'}
                    </span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      audioService.unlock();
                      onRepeatLastNotification();
                    }}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Repeat className="w-3.5 h-3.5 shrink-0" />
                    <span>Repeat Last Notification</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const msg = openAndroidSystemPermissionScreen('notification_listener');
                      setStatusNote(msg);
                    }}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Android Notification Access</span>
                  </button>
                </div>
              </div>

              {/* Live Test Simulator for Call, WhatsApp & Private OTP */}
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 space-y-2.5">
                <div className="text-xs font-semibold text-slate-200">
                  Test Spoken Call, Message &amp; Private OTP Protection
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      audioService.unlock();
                      onSimulateIncomingAlert({
                        type: 'incoming_call',
                        appName: 'Phone Call',
                        sender: 'Ali Khan',
                        body: 'Incoming mobile voice call',
                      });
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-[11px] font-semibold flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <PhoneIncoming className="w-3.5 h-3.5 shrink-0" />
                    <span>Test Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      audioService.unlock();
                      onSimulateIncomingAlert({
                        type: 'message',
                        appName: 'WhatsApp',
                        sender: 'Ahmed',
                        body: 'اسلام علیکم بھائی، میں شام 7 بجے ملاقات کے لیے آ رہا ہوں۔',
                      });
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-sky-950/90 hover:bg-sky-900 border border-sky-500/40 text-sky-200 text-[11px] font-semibold flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span>Test Msg</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      audioService.unlock();
                      onSimulateIncomingAlert({
                        type: 'message',
                        appName: 'SMS',
                        sender: 'Bank Alert',
                        body: 'Your private bank verification OTP code is 482910. Do not share.',
                      });
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-amber-950/90 hover:bg-amber-900 border border-amber-500/40 text-amber-200 text-[11px] font-semibold flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5 shrink-0" />
                    <span>Test OTP</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Voice command supported anytime: say <strong>&ldquo;Zara repeat last notification&rdquo;</strong> or <strong>&ldquo;آخری نوٹیفکیشن سناؤ&rdquo;</strong>.
                </p>
              </div>

              {/* Recent Incoming Notifications List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Recent Notifications ({notifications.length})
                  </span>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearNotifications}
                      className="text-xs text-rose-300 hover:text-rose-200 cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {notifications.map((n) => {
                  const masked = spokenConfig.maskSensitiveCodes
                    ? maskSensitiveNotificationText(n.body)
                    : { maskedText: n.body, wasMasked: false };
                  const displayBody = !spokenConfig.readMessageContent && n.type === 'message'
                    ? 'Message content hidden (enable "Read Message Body Aloud" above to view/hear).'
                    : masked.maskedText;

                  return (
                    <div
                      key={n.id}
                      className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-white truncate">
                          {n.appName} · {n.sender}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono tabular-nums shrink-0">
                          {n.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{displayBody}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            audioService.unlock();
                            const speech = buildSpokenNotificationAnnouncement(n, spokenConfig);
                            audioService.speakText(speech, {
                              language: language === 'auto' ? 'urdu' : language,
                              voiceName,
                            });
                          }}
                          className="min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-pink-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Read Aloud</span>
                        </button>

                        {!masked.wasMasked && spokenConfig.readMessageContent && (
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await copyTextToClipboard(`${n.sender}: ${n.body}`);
                              if (ok) {
                                setCopiedId(n.id);
                                window.setTimeout(() => setCopiedId(null), 2000);
                              }
                            }}
                            className="min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === n.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* TAB 2: FULL-SCREEN HD FEMALE AVATAR & CUSTOM BACKGROUND PICKER */}
          {activeTab === 'avatar' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">
                    Upload Custom Background Image
                  </div>
                  <div className="text-xs text-slate-400">
                    Choose any photo from your phone gallery or pick a 3D-style HD avatar below.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => bgUploadRef.current?.click()}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ImagePlus className="w-4 h-4 shrink-0" />
                  <span>Upload Image</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {portraits.map((p) => {
                  const isSelected =
                    (selectedPortraitId || portraits[0]?.id) === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        audioService.playChime('tap');
                        onSelectPortrait(p.id);
                        setStatusNote(`Applied full-screen background: ${p.name}`);
                      }}
                      className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-transform active:scale-[0.98] ${
                        isSelected
                          ? 'border-pink-400 ring-2 ring-pink-500/50'
                          : 'border-white/15 hover:border-white/35'
                      }`}
                    >
                      <div className="aspect-[3/4] w-full bg-slate-900 relative">
                        <img
                          src={p.src}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          style={p.colorFilter ? { filter: p.colorFilter } : undefined}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/55 to-transparent">
                          <div className="text-xs font-semibold text-white truncate">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-slate-300 truncate">
                            {p.isCustom ? 'Custom Background' : 'Blink & Lip-Sync HD'}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-pink-600 text-white text-[10px] font-bold">
                            Active
                          </div>
                        )}

                        {p.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCustomPortrait(p.id);
                              const refreshed = getAllZaraPortraits();
                              setPortraits(refreshed);
                              if (isSelected && refreshed[0]) {
                                onSelectPortrait(refreshed[0].id);
                              }
                            }}
                            className="absolute top-2 right-2 min-h-[30px] min-w-[30px] rounded-lg bg-black/75 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer"
                            title="Delete custom background"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY, ANDROID OS PERMISSIONS & NATIVE COMPANION */}
          {activeTab === 'android' && (
            <div className="space-y-3">
              {/* Instant Privacy Kill-Switches */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2.5">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Privacy &amp; Background Listening Controls</span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100">
                      Background &amp; Lock-Screen Voice Listening
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Persistent notification &amp; MediaSession mic stream
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleAlwaysOnVoice}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                      alwaysOnVoiceEnabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {alwaysOnVoiceEnabled ? 'Active (Disable)' : 'Disabled (Enable)'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100">
                      Spoken Call &amp; Message Notification Reader
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Reads incoming alerts only when you enable this switch
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSpokenConfig({ enabled: !spokenConfig.enabled })}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                      spokenConfig.enabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {spokenConfig.enabled ? 'Active (Disable)' : 'Disabled (Enable)'}
                  </button>
                </div>
              </div>

              {/* Manual Android Settings Deep-Links & Instructions */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2.5">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>How to Enable Required Android Permissions</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setStatusNote(openAndroidSystemPermissionScreen('app_permissions'))
                    }
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>1. Mic, Camera &amp; Notifications</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStatusNote(openAndroidSystemPermissionScreen('battery_unrestricted'))
                    }
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>2. Unrestricted Battery (Lock-Screen)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStatusNote(openAndroidSystemPermissionScreen('notification_listener'))
                    }
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-pink-300 shrink-0" />
                    <span>3. Notification Access (Call/Msg)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStatusNote(openAndroidSystemPermissionScreen('accessibility'))
                    }
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                    <span>4. Accessibility Service</span>
                  </button>
                </div>

                <ul className="text-[11px] text-slate-300 space-y-1 leading-relaxed pt-1">
                  <li>
                    • <strong>Microphone &amp; Camera</strong>: Tap Allow when prompted in Chrome/Zara. Camera never activates unless you tap Front Cam / Back Cam or ask Zara to open it.
                  </li>
                  <li>
                    • <strong>Lock-Screen Voice</strong>: Install Zara to Home Screen and set Battery usage for Chrome/Zara to <em>Unrestricted</em>. Note: Android 12+ may pause browser mics after prolonged deep sleep unless the Native Kotlin Foreground Service is installed.
                  </li>
                  <li>
                    • <strong>Incoming Call/SMS Reading &amp; Auto-Send</strong>: Android sandboxes web apps from reading other apps&apos; notifications or pressing Send inside WhatsApp automatically. In Web/PWA mode, Zara prepares the call/message with recipient confirmation and opens the dialer/messaging app; full silent reading &amp; ForegroundService use the Native Kotlin Companion below ({nativeBridgeActive ? 'Connected' : 'Web/PWA Mode'}).
                  </li>
                </ul>
              </div>

              {/* Ready-to-Compile Kotlin Native Companion Module */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/35 space-y-2.5">
                <div className="text-xs font-semibold text-cyan-200">
                  Native Android Kotlin Companion (ForegroundService + NotificationListener)
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Includes complete <code className="text-cyan-300">AndroidManifest.xml</code>,{' '}
                  <code className="text-cyan-300">ZaraVoiceForegroundService.kt</code>, and{' '}
                  <code className="text-cyan-300">ZaraNotificationListenerService.kt</code> wired to{' '}
                  <code className="text-cyan-300">window.ZaraAndroidBridge</code>.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadKotlinGuide}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>Download Kotlin Module</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyTextToClipboard(NATIVE_ANDROID_COMPANION_GUIDE_TEXT);
                      if (ok) {
                        setCopiedKotlin(true);
                        window.setTimeout(() => setCopiedKotlin(false), 2200);
                      }
                    }}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    {copiedKotlin ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied Kotlin Code!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Kotlin Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
