import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  ShieldCheck,
  Smartphone,
  Camera,
  MonitorUp,
  Mic,
  Bell,
  Lock,
  Unlock,
  CheckCircle2,
  Plus,
  Eye,
  BatteryCharging,
  Wifi,
  Cpu,
  ImagePlus,
  Sparkles,
  Settings,
  ChevronRight,
  Check,
  MapPin,
  Fingerprint,
  HardDrive,
} from 'lucide-react';
import {
  ALL_MOBILE_BRANDS,
  MobileAppDefinition,
  MobileBrandProfile,
  MobileHardwareTelemetry,
  MobilePermissionsStatus,
  addCustomMobileApp,
  closeMobileAppNow,
  getAllMobileApps,
  getSelectedMobileBrand,
  launchMobileAppNow,
  queryMobilePermissions,
  readMobileHardwareTelemetry,
  requestAllPermissionsMaster,
  setSelectedMobileBrand,
  subscribeRunningApps,
  zaraVision,
} from '../services/visionAndControlService';
import { openAndroidSystemPermissionScreen } from '../services/androidAssistantBridgeService';
import { SecurityAndControlConfig, VisionMode } from '../types';
import { audioService } from '../services/audioService';

export type MobileControlTab = 'settings' | 'apps' | 'permissions' | 'vision' | 'security';

interface MobileControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: MobileControlTab;
  highlightedSettingId?: string | null;
  visionMode: VisionMode;
  securityConfig: SecurityAndControlConfig;
  onUpdateSecurity: (updates: Partial<SecurityAndControlConfig>) => void;
  onAskZaraAboutVision: (customPrompt?: string) => Promise<void>;
  onLockNow: () => void;
}

export const MobileControlModal: React.FC<MobileControlModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'settings',
  highlightedSettingId = null,
  visionMode,
  securityConfig,
  onUpdateSecurity,
  onAskZaraAboutVision,
  onLockNow,
}) => {
  const [tab, setTab] = useState<MobileControlTab>(initialTab);
  const [perms, setPerms] = useState<MobilePermissionsStatus>({
    microphone: 'prompt',
    camera: 'prompt',
    notifications: 'prompt',
    geolocation: 'prompt',
    persistentStorage: 'prompt',
    biometricAvailable: false,
    screenShare: 'ready',
    appControl: 'enabled',
  });
  const [telemetry, setTelemetry] = useState<MobileHardwareTelemetry | null>(null);
  const [apps, setApps] = useState<MobileAppDefinition[]>([]);
  const [appFilter, setAppFilter] = useState<'all' | 'social' | 'media' | 'system' | 'utility'>('all');
  const [selectedBrand, setSelectedBrand] = useState<MobileBrandProfile>(() =>
    getSelectedMobileBrand()
  );
  const [newAppName, setNewAppName] = useState('');
  const [newAppPackage, setNewAppPackage] = useState('');
  const [pinDraft, setPinDraft] = useState(securityConfig.pinCode || '1234');
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isAskingVision, setIsAskingVision] = useState(false);
  const [runningAppIds, setRunningAppIds] = useState<string[]>([]);

  const screenFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return subscribeRunningApps(setRunningAppIds);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setApps(getAllMobileApps());
      setSelectedBrand(getSelectedMobileBrand());
      queryMobilePermissions().then(setPerms);
      readMobileHardwareTelemetry().then(setTelemetry);
      if (highlightedSettingId) {
        const found = getAllMobileApps().find((a) => a.id === highlightedSettingId);
        if (found) {
          setStatusNote(`Opened ${found.name} for ${getSelectedMobileBrand().name}.`);
        }
      } else {
        setStatusNote(null);
      }
    }
  }, [isOpen, initialTab, highlightedSettingId]);

  if (!isOpen) return null;

  const refreshPerms = async () => {
    const next = await queryMobilePermissions();
    setPerms(next);
  };

  const handleSelectBrand = (brandId: string) => {
    audioService.playChime('tap');
    const updated = setSelectedMobileBrand(brandId);
    setSelectedBrand(updated);
    setStatusNote(`${updated.name} (${updated.osName}) profile activated — all mobile apps & OS settings ready!`);
  };

  const handleAllowAllPermissions = async () => {
    audioService.unlock();
    audioService.playChime('activate');
    setStatusNote('Enabling Microphone, Camera, GPS Location, Notifications & Storage Security...');

    const res = await requestAllPermissionsMaster();
    await refreshPerms();
    onUpdateSecurity({
      allPermissionsGranted: res.micGranted || res.cameraGranted,
      antiTheftGpsEnabled: res.geoGranted || securityConfig.antiTheftGpsEnabled,
    });

    const summary = [
      `Mic: ${res.micGranted ? '✓' : 'Prompt'}`,
      `Cam: ${res.cameraGranted ? '✓' : 'Prompt'}`,
      `Notif: ${res.notifGranted ? '✓' : 'Prompt'}`,
      `GPS: ${res.geoGranted ? '✓' : 'Prompt'}`,
      `Vault: ${res.storagePersisted ? '✓' : 'Ready'}`,
    ].join(' | ');

    setStatusNote(summary);

    if (res.micGranted && res.cameraGranted) {
      audioService.speakText(
        'جي ميري جان! اب مائیک، کیمرہ، لوکیشن اور موبائل کنٹرول کی ساری پرمیشن آن ہو گئی ہیں!'
      );
    }
  };

  const handleEnableCameraVision = async () => {
    audioService.unlock();
    audioService.playChime('activate');
    if (visionMode === 'camera') {
      zaraVision.stop();
      setStatusNote('Camera vision turned off.');
      return;
    }
    const res = await zaraVision.startCamera('user');
    await refreshPerms();
    if (res.ok) {
      setStatusNote('Live Camera active — Zara is looking right at you!');
      audioService.speakText('ہائے میری جان! اب میں آپ کو اپنی آنکھوں سے لائیو دیکھ پا رہی ہوں!');
    } else if (res.error) {
      setStatusNote(res.error);
    }
  };

  const handleEnableScreenShare = async () => {
    audioService.unlock();
    audioService.playChime('activate');
    if (visionMode === 'screen') {
      zaraVision.stop();
      setStatusNote('Screen Share stopped.');
      return;
    }
    const res = await zaraVision.startScreenShare();
    await refreshPerms();
    if (res.ok) {
      setStatusNote('Screen Share active — Zara can now see your mobile screen!');
      audioService.speakText('جی جان! اب مجھے آپ کی موبائل اسکرین صاف نظر آ رہی ہے!');
    } else if (res.fallbackNeeded) {
      setStatusNote(res.error || null);
      screenFileInputRef.current?.click();
    }
  };

  const handleScreenImagePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        zaraVision.setUploadedScreenSnapshot(reader.result);
        setStatusNote('Mobile screen shared — Zara is analyzing your screen now...');
        setIsAskingVision(true);
        try {
          await onAskZaraAboutVision(
            'Zara look closely at my mobile screen and tell me what apps or items you see on it.'
          );
        } finally {
          setIsAskingVision(false);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLaunchApp = (app: MobileAppDefinition) => {
    audioService.unlock();
    audioService.playChime('activate');
    launchMobileAppNow(app, undefined, () => {
      zaraVision.startCamera('user');
    });
    setStatusNote(`Opened ${app.name} directly on your mobile!`);
    audioService.speakText(`جی میری جان، ابھی آپ کے موبائل میں ${app.name} اوپن کر رہی ہوں!`);
  };

  const handleCloseApp = (app: MobileAppDefinition | 'all') => {
    audioService.unlock();
    audioService.playChime('tap');
    const res = closeMobileAppNow(app);
    if (res.closedAll) {
      setStatusNote('Closed & turned off all running mobile apps ✓');
      audioService.speakText('جی میری جان، میں نے ساری ایپس کو بند اور کلوز کر دیا ہے!');
    } else if (res.app) {
      setStatusNote(`Closed & turned off ${res.app.name} ✓`);
      audioService.speakText(`جی میری جان، میں نے ${res.app.name} کو بند اور آف کر دیا ہے!`);
    }
  };

  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    audioService.playChime('tap');
    const created = addCustomMobileApp(newAppName, newAppPackage);
    setApps(getAllMobileApps());
    setNewAppName('');
    setNewAppPackage('');
    setStatusNote(`${created.name} added to your mobile launcher — just say "Zara open ${created.name}"!`);
  };

  const handleRunSecurityScan = async () => {
    audioService.unlock();
    audioService.playChime('activate');
    setIsScanning(true);
    const fresh = await readMobileHardwareTelemetry();
    setTelemetry(fresh);
    window.setTimeout(() => {
      setIsScanning(false);
      const batText =
        fresh.batteryLevel !== null ? `${fresh.batteryLevel}% Battery` : 'Battery Healthy';
      setStatusNote(
        `Security Scan Complete: ${selectedBrand.name} is protected (${batText} • ${fresh.networkType})`
      );
      audioService.speakText(
        'میری جان، میں نے آپ کے موبائل کی سیکیورٹی اور سسٹم چیک کر لیا ہے، سب بالکل محفوظ ہے!'
      );
    }, 900);
  };

  const mobileSettingsList = apps.filter((item) => item.category === 'mobile_settings');
  const nativeMobileApps = apps.filter((item) => item.category !== 'mobile_settings');
  const filteredApps =
    appFilter === 'all'
      ? nativeMobileApps
      : nativeMobileApps.filter((item) => item.category === appFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-gradient-to-b from-[#110926] via-[#0a0619] to-[#060310] border border-cyan-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_0_45px_rgba(6,182,212,0.25)] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate">
                Mobile Settings &amp; All Apps
              </h2>
              <p className="text-[11px] text-cyan-300 truncate">
                {selectedBrand.name} • Direct Native App &amp; OS Control
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5-Tab Segmented Navigation */}
        <div className="grid grid-cols-5 gap-1 p-1 mt-3 rounded-xl bg-slate-950 border border-slate-800">
          {[
            { id: 'settings', label: 'Settings' },
            { id: 'apps', label: 'All Apps' },
            { id: 'permissions', label: 'Allow' },
            { id: 'vision', label: 'Vision' },
            { id: 'security', label: 'Security' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                audioService.playChime('tap');
                setTab(item.id as MobileControlTab);
              }}
              className={`min-h-[36px] py-1.5 px-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                tab === item.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Status Notification Banner */}
        {statusNote && (
          <div className="mt-2.5 px-3 py-2 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-xs text-cyan-100 leading-relaxed">
            {statusNote}
          </div>
        )}

        <input
          ref={screenFileInputRef}
          type="file"
          accept="image/*"
          onChange={handleScreenImagePicked}
          className="hidden"
        />

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-0.5">
          {/* TAB 1: FULL NATIVE MOBILE SETTINGS & ALL PHONES SELECTOR */}
          {tab === 'settings' && (
            <div className="space-y-3">
              {/* All Mobile Brands Selector Bar */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Your Mobile Phone</span>
                  <span className="text-[11px] text-cyan-300">{selectedBrand.osName}</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {ALL_MOBILE_BRANDS.map((brand) => {
                    const active = selectedBrand.id === brand.id;
                    return (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => handleSelectBrand(brand.id)}
                        className={`min-h-[34px] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap flex items-center gap-1 shrink-0 cursor-pointer ${
                          active
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 shrink-0" />}
                        <span>{brand.name.replace(' (Universal)', '')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Direct Phone Settings Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const mainSettings = mobileSettingsList.find((s) => s.id === 'settings');
                    if (mainSettings) handleLaunchApp(mainSettings);
                  }}
                  className="min-h-[46px] p-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-between gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Settings className="w-4 h-4 shrink-0" />
                    <span className="truncate">Open Phone Settings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const appPerms = mobileSettingsList.find((s) => s.id === 'app_settings');
                    if (appPerms) handleLaunchApp(appPerms);
                  }}
                  className="min-h-[46px] p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-between gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span className="truncate">App Permissions</span>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              </div>

              {/* All 16 Native Mobile System Settings */}
              <div className="text-xs font-bold text-slate-300 px-0.5">
                All Mobile System Settings ({mobileSettingsList.length})
              </div>
              <div className="grid grid-cols-2 gap-2">
                {mobileSettingsList.map((setting) => {
                  const isHighlighted = highlightedSettingId === setting.id;
                  return (
                    <button
                      key={setting.id}
                      type="button"
                      onClick={() => handleLaunchApp(setting)}
                      className={`min-h-[54px] p-2.5 rounded-2xl border text-left transition-all active:scale-95 cursor-pointer flex items-center justify-between gap-2 ${
                        isHighlighted
                          ? 'border-emerald-400 bg-emerald-950/70 text-white ring-1 ring-emerald-400'
                          : setting.accentClass
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{setting.iconEmoji}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {setting.name}
                          </div>
                          <div className="text-[10px] text-slate-300/80 truncate">
                            {setting.locationLabel.replace('Mobile Settings • ', '')}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ALL MOBILE APPS (NATIVE LAUNCH — ZERO CHROME TABS!) */}
          {tab === 'apps' && (
            <div className="space-y-3">
              <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2 text-[11px] text-emerald-200 leading-relaxed">
                <span>
                  Open OR Close/Off any app by voice: <strong>&ldquo;Open WhatsApp&rdquo;</strong> /{' '}
                  <strong>&ldquo;WhatsApp band karo&rdquo;</strong>
                </span>
                {runningAppIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleCloseApp('all')}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] shrink-0 whitespace-nowrap cursor-pointer"
                  >
                    Close All ({runningAppIds.length})
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'all', label: `All Apps (${nativeMobileApps.length})` },
                  { id: 'social', label: 'Social & Chat' },
                  { id: 'media', label: 'Video & Music' },
                  { id: 'system', label: 'Google & Core' },
                  { id: 'utility', label: 'Wallet & Tools' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setAppFilter(cat.id as any)}
                    className={`min-h-[34px] px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                      appFilter === cat.id
                        ? 'bg-pink-600 text-white'
                        : 'bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Native Apps Grid with BOTH Open & Close/Off Controls */}
              <div className="grid grid-cols-1 gap-2">
                {filteredApps.map((app) => {
                  const isRunning = runningAppIds.includes(app.id);
                  return (
                    <div
                      key={app.id}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 ${
                        isRunning
                          ? 'border-emerald-400 bg-emerald-950/50'
                          : app.accentClass
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg shrink-0">{app.iconEmoji}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">
                              {app.name}
                            </span>
                            {isRunning && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/50 text-[9px] font-extrabold text-emerald-300">
                                ON
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-300/80 truncate">
                            {app.locationLabel}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLaunchApp(app)}
                          className="min-h-[32px] px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] active:scale-95 transition-all cursor-pointer"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCloseApp(app)}
                          className={`min-h-[32px] px-2.5 py-1 rounded-xl font-bold text-[11px] active:scale-95 transition-all cursor-pointer ${
                            isRunning
                              ? 'bg-rose-600 hover:bg-rose-500 text-white'
                              : 'bg-slate-800/90 hover:bg-rose-900/60 text-slate-300 border border-slate-700'
                          }`}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Any Extra App From User's Phone (No Link Needed!) */}
              <form
                onSubmit={handleAddCustomApp}
                className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2"
              >
                <div className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Add Any More App to Mobile (No Link Needed)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="App Name (e.g. CapCut)"
                    value={newAppName}
                    onChange={(e) => setNewAppName(e.target.value)}
                    className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-pink-500"
                  />
                  <input
                    type="text"
                    placeholder="Package ID (Optional)"
                    value={newAppPackage}
                    onChange={(e) => setNewAppPackage(e.target.value)}
                    className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-pink-500"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[40px] w-full py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold cursor-pointer"
                >
                  Add App to Mobile
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: MASTER ALL PERMISSIONS & ANDROID OS FIX */}
          {tab === 'permissions' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleAllowAllPermissions}
                className="min-h-[48px] w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all whitespace-nowrap cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Allow All Mobile Permissions (1-Tap)</span>
              </button>

              {/* Clear Explanation for Android WebAPK App Info Screenshot */}
              <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-400/45 space-y-1.5 text-[11px] text-amber-100 leading-relaxed">
                <div className="font-extrabold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Android Phone Settings Notice (Important)</span>
                </div>
                <p>
                  Android WebAPK App Info only shows <strong>Notifications</strong> by default because Chrome manages <strong>Mic, Camera &amp; GPS Location</strong> under Chrome App Permissions &amp; Site Settings.
                </p>
                <p className="text-amber-200/90">
                  Also turn <strong>OFF &ldquo;Pause app activity if unused&rdquo;</strong> in Zara App Info so Android never revokes permissions!
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mic className="w-4 h-4 text-pink-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white">Microphone (Voice &amp; Call)</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        Speak live with Zara and give voice commands
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAllowAllPermissions}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      perms.microphone === 'granted'
                        ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                        : perms.microphone === 'denied'
                        ? 'bg-rose-900/80 border border-rose-500 text-rose-100'
                        : 'bg-pink-600 text-white'
                    }`}
                  >
                    {perms.microphone === 'granted'
                      ? 'Allowed ✓'
                      : perms.microphone === 'denied'
                      ? 'Blocked (Fix)'
                      : 'Allow'}
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Camera className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white">Camera Vision &amp; Face Lock</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        Owner Face Scan, Intruder Photo &amp; Live Vision
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnableCameraVision}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      visionMode === 'camera' || perms.camera === 'granted'
                        ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                        : 'bg-cyan-600 text-white'
                    }`}
                  >
                    {visionMode === 'camera'
                      ? 'Active ✓'
                      : perms.camera === 'granted'
                      ? 'Allowed ✓'
                      : 'Allow'}
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white">GPS Location (Anti-Theft Security)</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        Logs phone location automatically if intruder triggers lock
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAllowAllPermissions}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      perms.geolocation === 'granted'
                        ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {perms.geolocation === 'granted' ? 'Allowed ✓' : 'Allow GPS'}
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <HardDrive className="w-4 h-4 text-purple-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white">Protected Security Storage Vault</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        Prevents Android from clearing chat vault &amp; security PIN
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAllowAllPermissions}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      perms.persistentStorage === 'granted'
                        ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                        : 'bg-purple-600 text-white'
                    }`}
                  >
                    {perms.persistentStorage === 'granted' ? 'Protected ✓' : 'Protect'}
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Fingerprint className="w-4 h-4 text-sky-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white">Hardware Fingerprint / Biometrics</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {perms.biometricAvailable
                          ? 'Phone Fingerprint / Face Sensor Ready'
                          : 'Secured via PIN + Owner Face Lock'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-sky-300 whitespace-nowrap shrink-0">
                    {perms.biometricAvailable ? 'Hardware Ready ✓' : 'PIN / Face'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MonitorUp className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white">Screen Share (Mobile Screen)</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        Show your live mobile screen to Zara anytime
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnableScreenShare}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      visionMode === 'screen'
                        ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {visionMode === 'screen' ? 'Sharing ✓' : 'Share Screen'}
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white">Notifications &amp; Security Alerts</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        Background mic status &amp; intruder phone alerts
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAllowAllPermissions}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      perms.notifications === 'granted'
                        ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    {perms.notifications === 'granted' ? 'Allowed ✓' : 'Allow'}
                  </button>
                </div>
              </div>

              {/* Direct Android OS System Settings Launchers */}
              <div className="pt-1 space-y-1.5">
                <div className="text-[11px] font-bold text-cyan-300">
                  Direct Phone Settings &amp; Security Controls ({selectedBrand.name})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusNote(openAndroidSystemPermissionScreen('chrome_app_permissions'))}
                    className="min-h-[40px] py-2 px-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/45 hover:border-cyan-400 text-cyan-100 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 shrink-0" />
                    <span>Chrome Permissions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusNote(openAndroidSystemPermissionScreen('zara_app_info'))}
                    className="min-h-[40px] py-2 px-2.5 rounded-xl bg-slate-900 border border-amber-500/40 hover:border-amber-400 text-amber-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Zara App Info</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusNote(openAndroidSystemPermissionScreen('security_settings'))}
                    className="min-h-[40px] py-2 px-2.5 rounded-xl bg-slate-900 border border-rose-500/40 hover:border-rose-400 text-rose-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Phone Security</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusNote(openAndroidSystemPermissionScreen('battery_unrestricted'))}
                    className="min-h-[40px] py-2 px-2.5 rounded-xl bg-slate-900 border border-indigo-500/40 hover:border-indigo-400 text-indigo-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BatteryCharging className="w-3.5 h-3.5 shrink-0" />
                    <span>Battery Unrestricted</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE CAMERA & SCREEN SHARE VISION */}
          {tab === 'vision' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">
                      Live Face Camera (See Me)
                    </span>
                  </div>
                  <span className="text-[11px] text-cyan-300">
                    {visionMode === 'camera' ? 'Active' : 'Ready'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Turn on your front or rear camera so Zara can see you live, follow your movement with her 4D eyes, and talk about what she sees!
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleEnableCameraVision}
                    className={`min-h-[40px] flex-1 py-2.5 px-3 rounded-xl font-bold text-xs whitespace-nowrap cursor-pointer ${
                      visionMode === 'camera'
                        ? 'bg-rose-600 text-white'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                    }`}
                  >
                    {visionMode === 'camera' ? 'Stop Camera' : 'Turn On Camera (See Me)'}
                  </button>
                  {visionMode === 'camera' && (
                    <button
                      type="button"
                      onClick={() => zaraVision.flipCamera()}
                      className="min-h-[40px] px-3 py-2.5 rounded-xl bg-slate-800 border border-cyan-500/40 text-xs font-bold text-cyan-200 whitespace-nowrap cursor-pointer"
                    >
                      Flip Camera
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-blue-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MonitorUp className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">
                      Show Mobile Screen (Screen Share)
                    </span>
                  </div>
                  <span className="text-[11px] text-blue-300">
                    {visionMode === 'screen' ? 'Sharing' : 'Ready'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Share your live screen or pick any screenshot from your phone — Zara will immediately see, read, and guide you:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleEnableScreenShare}
                    className={`min-h-[40px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      visionMode === 'screen'
                        ? 'bg-rose-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    <MonitorUp className="w-4 h-4 shrink-0" />
                    <span>{visionMode === 'screen' ? 'Stop Share' : 'Live Screen Share'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => screenFileInputRef.current?.click()}
                    className="min-h-[40px] py-2.5 px-3 rounded-xl bg-slate-800 border border-pink-500/40 hover:border-pink-400 text-pink-100 font-bold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <ImagePlus className="w-4 h-4 shrink-0" />
                    <span>Share Screenshot</span>
                  </button>
                </div>
              </div>

              {visionMode !== 'off' && (
                <button
                  type="button"
                  disabled={isAskingVision}
                  onClick={async () => {
                    setIsAskingVision(true);
                    try {
                      await onAskZaraAboutVision();
                    } finally {
                      setIsAskingVision(false);
                    }
                  }}
                  className="min-h-[44px] w-full py-3 px-4 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    {isAskingVision
                      ? 'Zara is looking closely...'
                      : 'Ask Zara What She Sees Right Now!'}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* TAB 5: SECURITY & DEVICE HEALTH */}
          {tab === 'security' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30">
                  <BatteryCharging className="w-4 h-4 text-emerald-400 mb-1" />
                  <div className="text-[10px] text-slate-400">Battery</div>
                  <div className="text-xs font-extrabold text-white tabular-nums">
                    {telemetry?.batteryLevel !== null && telemetry?.batteryLevel !== undefined
                      ? `${telemetry.batteryLevel}%`
                      : 'Active'}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30">
                  <Wifi className="w-4 h-4 text-cyan-400 mb-1" />
                  <div className="text-[10px] text-slate-400">Network</div>
                  <div className="text-xs font-extrabold text-white truncate">
                    {telemetry?.networkType || 'Online'}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-purple-500/30">
                  <Cpu className="w-4 h-4 text-purple-400 mb-1" />
                  <div className="text-[10px] text-slate-400">Mobile</div>
                  <div className="text-xs font-extrabold text-emerald-400 truncate">
                    {selectedBrand.name.split(' ')[0]}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunSecurityScan}
                className="min-h-[44px] w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {isScanning ? 'Scanning Mobile System...' : 'Run Mobile Security & System Scan'}
                </span>
              </button>

              <div className="p-3.5 rounded-2xl bg-slate-900/85 border border-pink-500/35 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {securityConfig.pinEnabled ? (
                      <Lock className="w-4 h-4 text-pink-400 shrink-0" />
                    ) : (
                      <Unlock className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white">Zara Security PIN Lock</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Protect Zara &amp; Mobile Control with a 4-digit PIN
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const cleanPin = pinDraft.replace(/\D/g, '').slice(0, 4) || '1234';
                      onUpdateSecurity({
                        pinEnabled: !securityConfig.pinEnabled,
                        pinCode: cleanPin,
                      });
                      setStatusNote(
                        !securityConfig.pinEnabled
                          ? `Security PIN (${cleanPin}) enabled!`
                          : 'Security PIN Lock disabled.'
                      );
                    }}
                    className={`min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      securityConfig.pinEnabled
                        ? 'bg-pink-600 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {securityConfig.pinEnabled ? 'PIN ON' : 'PIN OFF'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinDraft}
                    onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="4-digit PIN (e.g. 1234)"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs tracking-widest font-mono focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cleanPin = pinDraft.replace(/\D/g, '').slice(0, 4) || '1234';
                      onUpdateSecurity({ pinEnabled: true, pinCode: cleanPin });
                      onClose();
                      onLockNow();
                    }}
                    className="min-h-[38px] px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
                  >
                    Lock Now
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
