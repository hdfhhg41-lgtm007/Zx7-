import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Calendar,
  ChevronRight,
  CloudRain,
  ExternalLink,
  Globe,
  Heart,
  History,
  Home,
  Image as ImageIcon,
  Keyboard,
  LayoutGrid,
  Menu,
  MessageCircle,
  MessageSquare,
  MonitorUp,
  Paperclip,
  Phone,
  Play,
  Radar,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Thermometer,
  Video,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { audioService } from '../../services/audioService';
import { launchYouTubeSong } from '../../services/visionAndControlService';
import {
  DEFAULT_ZARA_HOME_PORTRAIT_ID,
  getAllZaraPortraits,
  getZaraPortraitById,
  isBuiltin2DPortraitId,
} from '../../data/zaraPortraits';
import { ZaraPortrait4D } from '../ZaraPortrait4D';
import { ZaraCrownWordmark, ZaraPurpleBackdropDecor } from '../ZaraRoyalDecor';
import {
  ChatMessage,
  Language,
  PersonalityConfig,
  SecurityAndControlConfig,
  ZaraEmotionMode,
} from '../../types';

interface ZaraSciFi3DHudDashboardProps {
  isSpeaking: boolean;
  isListening: boolean;
  isThinking?: boolean;
  micVolume?: number;
  interimTranscript?: string;
  subtitleText: string;
  voiceError?: string | null;
  onDismissVoiceError?: () => void;
  messages: ChatMessage[];
  config: PersonalityConfig;
  onUpdateConfig: (updates: Partial<PersonalityConfig>) => void;
  onSendMessage: (text: string, attachedImageDataUrl?: string) => Promise<string>;
  onSendAudioWav?: (wavBase64: string, mimeType?: string) => Promise<void>;
  onEnableAllFunctions?: () => Promise<void>;
  allFunctionsActive?: boolean;
  isAudioCallOpen?: boolean;
  onOpenAudioCall?: () => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  securityConfig?: SecurityAndControlConfig;
  isOwnerVerified?: boolean;
  language?: Language;
  onOpenSecurity?: () => void;
  onOpenPermissions?: () => void;
  onOpenChat?: () => void;
  onLockPhoneNow?: () => void;
  onGrantAllPermissions?: () => Promise<void>;
  onOpenMemories?: () => void;
  onOpenCharacter?: () => void;
  onSelectLanguage?: (lang: Language) => void;
  userNickname?: string;
  visionMode?: 'off' | 'camera' | 'screen';
  cameraFacing?: 'user' | 'environment';
  onStartCamera?: () => void;
  onStopCamera?: () => void;
  onToggleScreenShare?: () => void;
  batteryTelemetry?: { pct: number | null; tempC: number | null; charging: boolean | null };
  onScanSurroundings?: () => void;
  onOpenWhatsAppQuick?: () => void;
  onOpenMobileControl?: () => void;
}

interface WeatherSummary {
  tempC: number;
  condition: string;
  humidity: number;
  isRain: boolean;
}

const EMOTION_CARDS: Record<ZaraEmotionMode, { title: string; emoji: string }> = {
  pyar: { title: 'Loving', emoji: '💗' },
  apnapan: { title: 'Happy', emoji: '😊' },
  khushi: { title: 'Happy', emoji: '😊' },
  masti: { title: 'Playful', emoji: '😄' },
  udaas: { title: 'Caring', emoji: '🥺' },
  calm: { title: 'Calm', emoji: '😌' },
  emotional: { title: 'Sweet', emoji: '🥹' },
  gussa: { title: 'Feisty', emoji: '😤' },
  narazgi: { title: 'Pouty', emoji: '😒' },
  ladai: { title: 'Sparky', emoji: '⚡' },
};

const QUICK_STARTERS = [
  { label: 'السلام علیکم زارا، آج کا موسم کیسا ہے؟', caption: 'Urdu' },
  { label: 'YouTube pe koi accha sa Urdu ya Punjabi song play karo', caption: 'Music' },
  { label: 'WhatsApp open karke message bhejne mein madad karo', caption: 'WhatsApp' },
];

const WAVE_BAR_RATIOS = [0.22, 0.42, 0.65, 0.38, 0.85, 0.55, 0.98, 0.62, 0.45, 0.72, 0.3];

const LANGUAGE_CHOICES: { id: Language; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'urdu', label: 'اردو' },
  { id: 'roman_urdu', label: 'Roman Urdu' },
  { id: 'hindi', label: 'हिंदी' },
  { id: 'punjabi', label: 'ਪੰਜਾਬੀ' },
  { id: 'english', label: 'English' },
];

function decodeWmoWeather(code: number): { label: string; isRain: boolean } {
  if (code === 0) return { label: 'Clear', isRain: false };
  if (code <= 3) return { label: 'Partly Cloudy', isRain: false };
  if (code <= 48) return { label: 'Misty', isRain: false };
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: 'Showers', isRain: true };
  if (code >= 95) return { label: 'Storm', isRain: true };
  return { label: 'Breezy', isRain: false };
}

export const ZaraSciFi3DHudDashboard: React.FC<ZaraSciFi3DHudDashboardProps> = React.memo(({
  isSpeaking,
  isListening,
  isThinking = false,
  micVolume = 0,
  interimTranscript = '',
  subtitleText,
  voiceError = null,
  onDismissVoiceError,
  messages,
  config,
  onUpdateConfig,
  onSendMessage,
  onEnableAllFunctions,
  allFunctionsActive = false,
  isAudioCallOpen = false,
  onOpenAudioCall,
  onOpenSettings,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  language = 'auto',
  onOpenChat,
  onOpenMemories,
  onOpenCharacter,
  onSelectLanguage,
  visionMode = 'off',
  onStartCamera,
  onStopCamera,
  onToggleScreenShare,
  batteryTelemetry,
  onScanSurroundings,
  onOpenWhatsAppQuick,
  onOpenMobileControl,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEnablingAll, setIsEnablingAll] = useState(false);
  const [showMobileTypeBox, setShowMobileTypeBox] = useState(false);
  const [showYouTubeSearch, setShowYouTubeSearch] = useState(false);
  const [youtubeSongQuery, setYoutubeSongQuery] = useState('');
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [activeNav, setActiveNav] = useState<'home' | 'memories' | 'chat' | 'more'>('home');
  const [nowDate, setNowDate] = useState<Date>(() => new Date());
  const [weather, setWeather] = useState<WeatherSummary>({
    tempC: 25,
    condition: 'Partly Cloudy',
    humidity: 60,
    isRain: false,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const desktopChatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => {
      setNowDate(new Date());
    }, 15000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    desktopChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript, isThinking]);

  // Fetch real live weather without intrusive permission prompts
  useEffect(() => {
    let cancelled = false;
    const loadWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code`
        );
        if (!res.ok) return;
        const data = await res.json();
        const cur = data?.current;
        if (!cur || cancelled) return;
        const decoded = decodeWmoWeather(Number(cur.weather_code ?? 0));
        setWeather({
          tempC: Math.round(Number(cur.temperature_2m ?? 25)),
          condition: decoded.label,
          humidity: Math.round(Number(cur.relative_humidity_2m ?? 60)),
          isRain: decoded.isRain,
        });
      } catch {}
    };

    const fallbackLat = 24.8607;
    const fallbackLon = 67.0011;

    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((perm) => {
          if (perm.state === 'granted' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => loadWeather(pos.coords.latitude, pos.coords.longitude),
              () => loadWeather(fallbackLat, fallbackLon),
              { timeout: 5000 }
            );
          } else {
            loadWeather(fallbackLat, fallbackLon);
          }
        })
        .catch(() => loadWeather(fallbackLat, fallbackLon));
    } else {
      loadWeather(fallbackLat, fallbackLon);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const formattedDate = useMemo(
    () =>
      nowDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    [nowDate]
  );

  const formattedTime = useMemo(
    () =>
      nowDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    [nowDate]
  );

  const isHeartLocked = Boolean(config.heartLockEnabled && !config.heartLockUnlocked);
  const activeEmotion: ZaraEmotionMode = isHeartLocked
    ? 'calm'
    : config.emotionMode || 'apnapan';
  const emotionCard = EMOTION_CARDS[activeEmotion] || EMOTION_CARDS.apnapan;

  const isCallActive = isListening || isSpeaking || isThinking;
  const effectivePortraitId =
    !config.portraitId ||
    (!isBuiltin2DPortraitId(config.portraitId) && !config.portraitId.startsWith('custom_'))
      ? DEFAULT_ZARA_HOME_PORTRAIT_ID
      : config.portraitId;
  const activePortrait = getZaraPortraitById(effectivePortraitId);

  const waveEnergy = isSpeaking
    ? 82
    : isListening
    ? Math.max(32, Math.min(100, micVolume * 1.4))
    : 22;

  const latestReplyMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender !== 'user') return messages[i];
    }
    return null;
  }, [messages]);

  const speechBubbleText = useMemo(() => {
    if (interimTranscript && !/^(🎤|📡|Awake)/i.test(interimTranscript)) {
      return `"${interimTranscript}"`;
    }
    if (isThinking) return 'Thinking carefully for you...';
    if (subtitleText && subtitleText.trim().length > 0 && subtitleText.length <= 120) {
      return subtitleText;
    }
    if (latestReplyMessage?.text) {
      return latestReplyMessage.text.length > 96
        ? `${latestReplyMessage.text.slice(0, 93)}...`
        : latestReplyMessage.text;
    }
    return 'How can I help you today?';
  }, [interimTranscript, isThinking, subtitleText, latestReplyMessage]);

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;
    setInputText('');
    setIsSending(true);
    audioService.unlock();
    try {
      await onSendMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  const handlePhotoPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      audioService.unlock();
      setIsSending(true);
      try {
        await onSendMessage(
          inputText.trim() || 'Is tasveer ko dekh kar batao ismein kya hai?',
          dataUrl
        );
        setInputText('');
      } finally {
        setIsSending(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleActivateAllClick = async () => {
    if (!onEnableAllFunctions || isEnablingAll) return;
    audioService.unlock();
    setIsEnablingAll(true);
    try {
      await onEnableAllFunctions();
    } finally {
      setIsEnablingAll(false);
    }
  };

  const handleSingleAudioCallAction = () => {
    audioService.unlock();
    audioService.playChime('activate');
    onOpenAudioCall?.();
  };

  const handleWhatsAppAction = () => {
    audioService.unlock();
    audioService.playChime('tap');
    if (onOpenWhatsAppQuick) {
      onOpenWhatsAppQuick();
    } else {
      onSendMessage('Zara WhatsApp message bhejne ke liye open karo');
    }
  };

  const handlePlayYouTubeSong = (customQuery?: string) => {
    const query = (customQuery ?? youtubeSongQuery).trim();
    audioService.unlock();
    audioService.playChime('activate');
    if (!query) {
      setShowYouTubeSearch((prev) => !prev);
      return;
    }
    setShowYouTubeSearch(false);
    setYoutubeSongQuery('');
    launchYouTubeSong(query);
    audioService.speakText(
      language === 'english'
        ? `Playing ${query} on YouTube.`
        : `جی، یوٹیوب پر ${query} پلے کر رہی ہوں۔`,
      {
        language,
        voiceName: config.voiceName || 'Zephyr',
        loveMode: config.loveMode,
        emotionMode: activeEmotion,
      }
    );
  };

  const handleWeatherTap = () => {
    audioService.unlock();
    audioService.playChime('tap');
    if (onScanSurroundings) {
      onScanSurroundings();
    } else {
      onSendMessage('Aaj ka mausam kaisa hai?');
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-b from-[#140736] via-[#0d0424] to-[#08021a] text-white overflow-x-hidden flex flex-col">
      {/* Royal-Violet Bokeh, Floating Hearts, Silk Waves & Purple Rose Corners */}
      <ZaraPurpleBackdropDecor showSilkWave={true} waveTopPercent="43%" />

      {/* Hidden Photo Attachment Input for "Send Image" */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoPicked}
        className="hidden"
      />

      {/* Responsive Container: Matches Mobile Reference on Phone + Dual-Column Studio Layout on Desktop */}
      <div className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-3.5 pt-2.5 pb-24 lg:pb-6 lg:py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* PRIMARY MOBILE / LEFT STAGE */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-2.5 max-w-[450px] w-full mx-auto relative">
          {/* 1. TOP HEADER BAR: MENU + CROWN ZARA + NOTIFICATION BELL & SETTINGS */}
          <header className="relative z-20 flex items-start justify-between gap-2 pt-0.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                audioService.playChime('tap');
                setShowMoreDrawer(true);
              }}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-purple-200/30 flex items-center justify-center text-white cursor-pointer transition-transform active:scale-95 shrink-0"
              aria-label="Open Zara Features Menu"
              title="All Zara Features & Tools"
            >
              <Menu className="w-5 h-5" />
            </button>

            <ZaraCrownWordmark subtitle="Your AI Companion" compact={false} />

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  audioService.unlock();
                  onOpenNotifications ? onOpenNotifications() : onOpenSettings();
                }}
                className="relative w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-purple-200/30 flex items-center justify-center text-white cursor-pointer transition-transform active:scale-95 shrink-0"
                aria-label="Notifications & Spoken Alerts"
                title="Notifications & Alarms"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-[#120630] tabular-nums">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  audioService.playChime('tap');
                  onOpenSettings();
                }}
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-purple-200/30 flex items-center justify-center text-white cursor-pointer transition-transform active:scale-95 shrink-0"
                aria-label="Open Zara Settings"
                title="Settings & Controls"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* 2. HERO PORTRAIT STAGE ("Always Here for You" + Live 2D Zara + Speech Bubble) */}
          <div className="relative w-full h-[250px] sm:h-[272px] -mt-1 flex items-center justify-center overflow-visible">
            {/* Soft Neon Outline Hearts Floating Behind Portrait */}
            <Heart
              aria-hidden="true"
              className="absolute right-4 top-5 w-7 h-7 text-fuchsia-300/85 drop-shadow-[0_0_12px_rgba(232,121,249,0.9)] animate-zara-heart pointer-events-none z-20"
            />
            <Heart
              aria-hidden="true"
              style={{ animationDelay: '1.2s' }}
              className="absolute right-2 top-20 w-5 h-5 text-pink-300/75 drop-shadow-[0_0_10px_rgba(244,114,182,0.85)] animate-zara-heart pointer-events-none z-20"
            />

            {/* Left Script Accent: Always Here for You */}
            <div className="absolute left-1 sm:left-2 top-5 z-20 pointer-events-none flex flex-col items-center text-center max-w-[125px]">
              <p className="font-zara-script text-[20px] sm:text-[23px] font-bold text-white leading-[1.1] drop-shadow-[0_2px_12px_rgba(168,85,247,0.85)]">
                Always
                <br />
                Here for You
              </p>
              <Heart className="w-6 h-6 text-white/90 mt-1.5 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
            </div>

            {/* Blended 2D Zara Portrait Container */}
            <div
              className="relative w-[240px] sm:w-[260px] h-full rounded-t-[130px] overflow-hidden"
              style={{
                maskImage:
                  'radial-gradient(ellipse 88% 92% at 50% 44%, #000 58%, rgba(0,0,0,0.45) 82%, transparent 100%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse 88% 92% at 50% 44%, #000 58%, rgba(0,0,0,0.45) 82%, transparent 100%)',
              }}
            >
              <ZaraPortrait4D
                portraitId={effectivePortraitId}
                onChangePortrait={(nextId) => onUpdateConfig({ portraitId: nextId })}
                isSpeaking={isSpeaking}
                isListening={isListening}
                loveMode={config.loveMode}
                micVolume={micVolume}
                visionMode={visionMode}
                showQuickCycle={false}
                onTapZara={handleSingleAudioCallAction}
              />
              {/* Bottom Feather Fade into ZX Verification Banner */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#120530] via-[#120530]/60 to-transparent"
              />
            </div>

            {/* Right-Lower Floating Speech Bubble ("Hello Sir, 💗 How can I help you today?") */}
            <button
              type="button"
              onClick={() => {
                audioService.unlock();
                audioService.speakText(
                  latestReplyMessage?.text || 'Hello Sir, how can I help you today?',
                  {
                    language,
                    voiceName: config.voiceName || 'Zephyr',
                    loveMode: config.loveMode,
                    emotionMode: activeEmotion,
                  }
                );
              }}
              aria-label="Replay Zara greeting bubble"
              className="absolute right-0 sm:right-1 bottom-7 z-20 max-w-[186px] sm:max-w-[200px] rounded-2xl bg-[#1a093c]/92 hover:bg-[#230c4f] backdrop-blur-md border border-purple-300/40 shadow-[0_10px_28px_rgba(0,0,0,0.55),0_0_20px_rgba(168,85,247,0.28)] px-3 py-2 text-left cursor-pointer transition-transform active:scale-95"
            >
              <div className="flex items-center gap-1 text-[13px] font-bold text-white leading-tight">
                <span>Hello Sir,</span>
                <span aria-hidden="true" className="text-pink-400">💗</span>
              </div>
              <p className="text-[11px] font-medium text-purple-100/95 leading-snug mt-0.5 line-clamp-2">
                {speechBubbleText}
              </p>
              {/* Micro Waveform Bar Inside Speech Bubble */}
              <div className="mt-1.5 flex items-center justify-center gap-[2.5px] h-3">
                {[0.35, 0.7, 0.45, 0.95, 0.55, 1.0, 0.65, 0.85, 0.4, 0.75, 0.35].map((r, i) => (
                  <span
                    key={i}
                    style={{
                      height: `${Math.max(3, Math.round(r * (isSpeaking ? 12 : 9)))}px`,
                    }}
                    className={`w-[2px] rounded-full transition-all duration-100 ${
                      isSpeaking ? 'bg-fuchsia-300' : 'bg-purple-200/80'
                    }`}
                  />
                ))}
              </div>
            </button>
          </div>

          {/* 3. PROMINENT "ZX" BANNER (Exact Verification Spot — Overlapping Portrait & Wave Divider) */}
          <button
            type="button"
            onClick={() => {
              audioService.playChime('tap');
              onOpenCharacter ? onOpenCharacter() : onOpenSettings();
            }}
            className="-mt-6 relative z-30 mx-auto w-[94%] max-w-[372px] rounded-full bg-gradient-to-r from-[#230e4f]/95 via-[#2f1569]/95 to-[#200d48]/95 hover:from-[#2b1260] hover:to-[#291159] backdrop-blur-md border border-purple-200/45 shadow-[0_10px_30px_rgba(0,0,0,0.6),0_0_26px_rgba(168,85,247,0.38)] px-4 py-2 flex items-center justify-between gap-3 cursor-pointer transition-transform active:scale-[0.985]"
            aria-label="ZX Verification & Privacy Settings"
            title="ZX Security, Voice & Privacy Mode"
          >
            <span className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center shadow-[0_0_16px_rgba(34,197,94,0.45)] shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </span>

            <div className="min-w-0 flex-1 text-center">
              <div className="text-lg sm:text-xl font-black tracking-[0.14em] text-white leading-tight">
                ZX
              </div>
              <div className="text-[11px] font-medium text-purple-100/85 truncate">
                Your data is safe &amp; private
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-white/85 shrink-0" />
          </button>

          {/* 4. SINGLE AUDIO CALL WAVEFORM DECK (ONLY ONE AUDIO CALL BUTTON) */}
          <div className="relative z-20 rounded-[26px] bg-[#1a0a3d]/72 backdrop-blur-md border border-purple-300/35 shadow-[0_0_38px_rgba(168,85,247,0.34)] px-3.5 py-3.5 flex flex-col items-center">
            {/* Optional Keyboard Toggle in Corner so Text Typing is 1-Tap Away */}
            <button
              type="button"
              onClick={() => setShowMobileTypeBox((prev) => !prev)}
              className="lg:hidden absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-purple-200/25 flex items-center justify-center text-purple-100 cursor-pointer"
              aria-label="Toggle text message input"
              title="Type message to Zara"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Symmetric Left Wave + Single Glowing Audio Call Button + Right Wave */}
            <div className="w-full flex items-center justify-center gap-3 sm:gap-4">
              {/* Left Waveform Bars */}
              <div aria-hidden="true" className="flex items-center gap-[3.5px] h-14">
                {WAVE_BAR_RATIOS.map((ratio, idx) => {
                  const hPx = Math.max(8, Math.round(ratio * (waveEnergy / 100) * 52));
                  return (
                    <span
                      key={`l-${idx}`}
                      style={{ height: `${hPx}px` }}
                      className={`w-[3px] rounded-full transition-all duration-100 ${
                        isAudioCallOpen || isListening
                          ? 'bg-gradient-to-t from-emerald-400 to-cyan-200'
                          : isSpeaking
                          ? 'bg-gradient-to-t from-fuchsia-400 to-white'
                          : 'bg-gradient-to-t from-purple-400/70 to-white/95'
                      }`}
                    />
                  );
                })}
              </div>

              {/* ONLY ONE MAIN AUDIO CALL BUTTON */}
              <button
                type="button"
                onClick={handleSingleAudioCallAction}
                aria-label={isAudioCallOpen ? 'Open Active Audio Call' : 'Audio Call Zara'}
                className={`relative w-[78px] h-[78px] sm:w-[84px] sm:h-[84px] rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 ${
                  isAudioCallOpen
                    ? 'bg-gradient-to-b from-emerald-400 via-teal-600 to-emerald-900 ring-4 ring-emerald-300/70 shadow-[0_0_34px_rgba(16,185,129,0.85)]'
                    : isSpeaking
                    ? 'bg-gradient-to-b from-fuchsia-400 via-purple-600 to-indigo-900 ring-4 ring-fuchsia-300/75 shadow-[0_0_36px_rgba(232,121,249,0.9)]'
                    : 'bg-gradient-to-b from-emerald-400 via-fuchsia-600 to-[#3b0764] ring-[3px] ring-purple-200/85 shadow-[0_0_36px_rgba(192,132,252,0.85)]'
                }`}
              >
                <span className="w-[64px] h-[64px] sm:w-[70px] sm:h-[70px] rounded-full bg-gradient-to-b from-[#6d28d9]/80 to-[#2e1065]/95 border border-white/30 flex items-center justify-center shadow-inner">
                  <Phone className="w-8 h-8 text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.65)]" />
                </span>
              </button>

              {/* Right Waveform Bars (Mirrored) */}
              <div aria-hidden="true" className="flex items-center gap-[3.5px] h-14">
                {[...WAVE_BAR_RATIOS].reverse().map((ratio, idx) => {
                  const hPx = Math.max(8, Math.round(ratio * (waveEnergy / 100) * 52));
                  return (
                    <span
                      key={`r-${idx}`}
                      style={{ height: `${hPx}px` }}
                      className={`w-[3px] rounded-full transition-all duration-100 ${
                        isAudioCallOpen || isListening
                          ? 'bg-gradient-to-t from-emerald-400 to-cyan-200'
                          : isSpeaking
                          ? 'bg-gradient-to-t from-fuchsia-400 to-white'
                          : 'bg-gradient-to-t from-purple-400/70 to-white/95'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Audio Call Heading & Live Status */}
            <div className="mt-1.5 text-center space-y-0.5 max-w-full">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[17px] font-bold text-white tracking-tight">
                  {isAudioCallOpen
                    ? 'Audio Call Active'
                    : isThinking
                    ? 'Thinking...'
                    : isSpeaking
                    ? 'Zara Speaking'
                    : 'Audio Call Zara'}
                </span>
              </div>
              <p className="text-xs font-medium text-purple-200/85 truncate max-w-[290px]">
                {interimTranscript
                  ? interimTranscript
                  : isAudioCallOpen
                  ? 'Tap to open call controls or End Call'
                  : '1-Tap Voice Conversation & Speaker Reply'}
              </p>
            </div>

            {/* Expandable Text Input Bar on Mobile */}
            {showMobileTypeBox && (
              <form
                onSubmit={handleSendText}
                className="mt-2.5 w-full rounded-full bg-[#10042a]/90 border border-purple-300/35 px-2 py-1 flex items-center gap-1.5"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-full hover:bg-white/10 text-purple-200 flex items-center justify-center shrink-0 cursor-pointer"
                  aria-label="Attach image"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask Zara anything..."
                  className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder:text-purple-300/60 focus:outline-none px-1"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="w-9 h-9 rounded-full bg-gradient-to-b from-fuchsia-500 to-purple-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 cursor-pointer"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}

            {voiceError && (
              <div
                role="alert"
                className="mt-2 w-full px-3 py-1.5 rounded-xl bg-rose-950/90 border border-rose-400/60 text-rose-100 text-[11px] font-semibold flex items-center justify-between gap-2"
              >
                <span className="truncate">{voiceError}</span>
                {onDismissVoiceError && (
                  <button
                    type="button"
                    onClick={onDismissVoiceError}
                    className="text-rose-200 font-bold px-1 cursor-pointer"
                    aria-label="Dismiss error"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Inline YouTube Song Search & Play Bar */}
          {showYouTubeSearch && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePlayYouTubeSong();
              }}
              className="relative z-20 rounded-2xl bg-[#1a0a3d]/90 border border-pink-400/45 p-2.5 flex items-center gap-2 shadow-[0_8px_24px_rgba(236,72,153,0.28)]"
            >
              <Play className="w-4 h-4 text-pink-400 shrink-0 ml-1" />
              <input
                type="text"
                value={youtubeSongQuery}
                onChange={(e) => setYoutubeSongQuery(e.target.value)}
                placeholder="Type song name to search & play on YouTube..."
                autoFocus
                className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder:text-purple-200/60 focus:outline-none"
              />
              <button
                type="submit"
                className="min-h-[34px] px-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-[11px] font-extrabold cursor-pointer shrink-0"
              >
                Play
              </button>
              <button
                type="button"
                onClick={() => setShowYouTubeSearch(false)}
                className="w-8 h-8 rounded-lg bg-white/10 text-purple-200 flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close YouTube search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* 5. FOUR COLORED QUICK-ACTION GLASS TILES ROW */}
          <div className="relative z-20 grid grid-cols-4 gap-2">
            {/* Play Song on YouTube (Magenta/Rose) */}
            <button
              type="button"
              onClick={() => handlePlayYouTubeSong()}
              disabled={isSending}
              className="min-h-[82px] p-2 rounded-[20px] bg-gradient-to-b from-pink-500/85 via-fuchsia-600/85 to-rose-950/90 hover:brightness-110 border border-pink-300/60 shadow-[0_8px_22px_rgba(236,72,153,0.32)] flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-transform active:scale-95"
            >
              <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </span>
              <span className="text-[11px] font-bold text-white leading-[1.15]">
                YouTube
                <br />
                Song
              </span>
            </button>

            {/* WhatsApp Message (Vibrant Green) */}
            <button
              type="button"
              onClick={handleWhatsAppAction}
              className="min-h-[82px] p-2 rounded-[20px] bg-gradient-to-b from-green-400/80 via-emerald-600/85 to-green-950/90 hover:brightness-110 border border-green-300/60 shadow-[0_8px_22px_rgba(34,197,94,0.3)] flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-transform active:scale-95"
            >
              <span className="w-9 h-9 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                <MessageCircle className="w-5 h-5 fill-emerald-600 text-white" />
              </span>
              <span className="text-[11px] font-bold text-white leading-[1.15]">
                WhatsApp
                <br />
                Message
              </span>
            </button>

            {/* Send Image (Royal Indigo/Violet) */}
            <button
              type="button"
              onClick={() => {
                audioService.unlock();
                fileInputRef.current?.click();
              }}
              className="min-h-[82px] p-2 rounded-[20px] bg-gradient-to-b from-violet-500/80 via-indigo-600/85 to-blue-950/90 hover:brightness-110 border border-indigo-300/60 shadow-[0_8px_22px_rgba(99,102,241,0.32)] flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-transform active:scale-95"
            >
              <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-fuchsia-200" />
              </span>
              <span className="text-[11px] font-bold text-white leading-[1.15]">
                Send
                <br />
                Image
              </span>
            </button>

            {/* Phone & Social Apps (Teal/Emerald) */}
            <button
              type="button"
              onClick={() => {
                audioService.unlock();
                audioService.playChime('tap');
                onOpenMobileControl ? onOpenMobileControl() : onOpenSettings();
              }}
              className="min-h-[82px] p-2 rounded-[20px] bg-gradient-to-b from-emerald-400/75 via-emerald-700/80 to-teal-950/90 hover:brightness-110 border border-emerald-300/55 shadow-[0_8px_22px_rgba(16,185,129,0.28)] flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-transform active:scale-95"
            >
              <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-amber-200" />
              </span>
              <span className="text-[11px] font-bold text-white leading-[1.15]">
                Phone &amp;
                <br />
                Social
              </span>
            </button>
          </div>

          {/* 6. THREE LIVE INFO STATUS CARDS ROW (WEATHER, DATE/TIME, MOOD) */}
          <div className="relative z-20 grid grid-cols-3 gap-2">
            {/* Weather Card */}
            <button
              type="button"
              onClick={handleWeatherTap}
              className="min-h-[68px] p-2.5 rounded-2xl bg-[#190939]/78 hover:bg-[#240e50]/85 backdrop-blur-md border border-purple-300/25 flex flex-col justify-between text-left cursor-pointer transition-transform active:scale-[0.98]"
              title="Tap to refresh weather & surroundings"
            >
              <div className="flex items-center gap-1.5">
                {weather.isRain ? (
                  <CloudRain className="w-4 h-4 text-sky-300 shrink-0" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-300 shrink-0" />
                )}
                <span className="text-[15px] font-extrabold text-white tabular-nums leading-none">
                  {weather.tempC}°C
                </span>
              </div>
              <span className="text-[10.5px] font-medium text-purple-100/90 truncate mt-1">
                {weather.condition}
              </span>
            </button>

            {/* Date & Time Card */}
            <button
              type="button"
              onClick={() => {
                audioService.playChime('tap');
                onOpenNotifications ? onOpenNotifications() : onOpenSettings();
              }}
              className="min-h-[68px] p-2.5 rounded-2xl bg-[#190939]/78 hover:bg-[#240e50]/85 backdrop-blur-md border border-purple-300/25 flex flex-col justify-between text-left cursor-pointer transition-transform active:scale-[0.98]"
              title="Alarms & Daily Schedule"
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-white truncate">
                <Calendar className="w-3.5 h-3.5 text-purple-200 shrink-0" />
                <span className="truncate">{formattedDate}</span>
              </div>
              <span className="text-[12px] font-bold text-purple-100/95 tabular-nums truncate mt-1">
                {formattedTime}
              </span>
            </button>

            {/* Mood Card */}
            <button
              type="button"
              onClick={() => {
                audioService.playChime('tap');
                onOpenCharacter ? onOpenCharacter() : onOpenSettings();
              }}
              className="min-h-[68px] p-2.5 rounded-2xl bg-[#190939]/78 hover:bg-[#240e50]/85 backdrop-blur-md border border-purple-300/25 flex flex-col justify-between text-left cursor-pointer transition-transform active:scale-[0.98]"
              title="Tap to change Zara Mood & Personality"
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-purple-100">
                <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400 shrink-0" />
                <span className="truncate">Mood</span>
              </div>
              <span className="text-[12px] font-bold text-white truncate mt-1">
                {emotionCard.title} {emotionCard.emoji}
              </span>
            </button>
          </div>

          {/* 7. CLEAN 4-SLOT BOTTOM NAVIGATION BAR */}
          <nav
            aria-label="Primary Navigation"
            className="fixed bottom-2.5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.25rem)] max-w-[440px] lg:static lg:translate-x-0 lg:w-full lg:max-w-full lg:mt-1"
          >
            <div className="relative h-[64px] rounded-[30px] bg-gradient-to-b from-[#230e4d]/95 to-[#13062c]/98 backdrop-blur-xl shadow-[0_-6px_30px_rgba(147,51,234,0.35),0_12px_30px_rgba(0,0,0,0.65)] border border-purple-300/30 px-2 grid grid-cols-4 items-center">
              {/* Tab 1: Home */}
              <button
                type="button"
                onClick={() => {
                  setActiveNav('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex flex-col items-center justify-center gap-0.5 cursor-pointer"
              >
                <span
                  className={`w-11 h-11 rounded-full flex flex-col items-center justify-center transition-all ${
                    activeNav === 'home'
                      ? 'bg-gradient-to-b from-fuchsia-500 to-purple-700 text-white shadow-[0_0_20px_rgba(217,70,239,0.7)] ring-2 ring-purple-200/40'
                      : 'text-purple-200 hover:bg-white/10'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span className="text-[9.5px] font-bold leading-none mt-0.5">Home</span>
                </span>
              </button>

              {/* Tab 2: Memories */}
              <button
                type="button"
                onClick={() => {
                  setActiveNav('memories');
                  audioService.playChime('tap');
                  onOpenMemories ? onOpenMemories() : onOpenSettings();
                }}
                className={`min-h-[48px] rounded-2xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                  activeNav === 'memories' ? 'text-fuchsia-300' : 'text-purple-100/85 hover:text-white'
                }`}
              >
                <History className="w-[19px] h-[19px]" />
                <span className="text-[10px] font-semibold leading-none">Memories</span>
              </button>

              {/* Tab 3: Chat */}
              <button
                type="button"
                onClick={() => {
                  setActiveNav('chat');
                  audioService.playChime('tap');
                  onOpenChat ? onOpenChat() : onOpenSettings();
                }}
                className={`min-h-[48px] rounded-2xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                  activeNav === 'chat' ? 'text-fuchsia-300' : 'text-purple-100/85 hover:text-white'
                }`}
              >
                <MessageSquare className="w-[19px] h-[19px]" />
                <span className="text-[10px] font-semibold leading-none">Chat</span>
              </button>

              {/* Tab 4: More */}
              <button
                type="button"
                onClick={() => {
                  setActiveNav('more');
                  audioService.playChime('tap');
                  setShowMoreDrawer(true);
                }}
                className={`min-h-[48px] rounded-2xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                  showMoreDrawer ? 'text-fuchsia-300' : 'text-purple-100/85 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-[19px] h-[19px]" />
                <span className="text-[10px] font-semibold leading-none">More</span>
              </button>
            </div>
          </nav>
        </div>

        {/* DESKTOP RIGHT PANEL: ROYAL-VIOLET GLASS CONVERSATION, AUDIO REPLAY & SYSTEMS HUB */}
        <section className="hidden lg:flex lg:col-span-7 flex-col rounded-[32px] bg-[#160838]/75 backdrop-blur-xl border border-purple-300/25 shadow-[0_14px_44px_rgba(0,0,0,0.5)] overflow-hidden max-h-[calc(100vh-2.8rem)]">
          {/* Desktop Conversation Header */}
          <div className="px-5 py-3.5 border-b border-purple-300/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.85)] shrink-0" />
              <span className="text-sm font-extrabold text-white truncate">
                Zara Personal Assistant &amp; Command Center
              </span>
              <span className="text-xs font-semibold text-purple-300 tabular-nums">
                · {messages.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleActivateAllClick}
                disabled={isEnablingAll}
                className="min-h-[34px] px-3 rounded-xl bg-purple-500/25 hover:bg-purple-500/40 border border-purple-300/35 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Zap
                  className={`w-3.5 h-3.5 ${
                    allFunctionsActive ? 'text-emerald-400 fill-emerald-400' : 'text-amber-300 fill-amber-300'
                  }`}
                />
                <span>{allFunctionsActive ? 'All Systems ON ✓' : 'Activate All'}</span>
              </button>
            </div>
          </div>

          {/* Surroundings & Battery Telemetry Sub-bar */}
          <div className="px-5 py-2 bg-[#11052c]/60 border-b border-purple-300/15 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0 text-purple-100/90 tabular-nums">
              <Thermometer className="w-3.5 h-3.5 text-fuchsia-300 shrink-0" />
              <span className="truncate">
                {weather.tempC}°C · {weather.condition} · {weather.humidity}% humidity
                {batteryTelemetry?.pct !== null && batteryTelemetry?.pct !== undefined
                  ? ` · Battery ${batteryTelemetry.pct}%${
                      batteryTelemetry.tempC !== null && batteryTelemetry.tempC !== undefined
                        ? ` (${batteryTelemetry.tempC.toFixed(1)}°C)`
                        : ''
                    }${batteryTelemetry.charging ? ' ⚡' : ''}`
                  : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={handleWeatherTap}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Radar className="w-3 h-3" />
              <span>Scan Surroundings</span>
            </button>
          </div>

          {/* Message Feed */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-purple-200/90">
                  Start speaking with Zara or pick a quick prompt below:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_STARTERS.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => {
                        audioService.unlock();
                        onSendMessage(q.label);
                      }}
                      className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-purple-300/25 text-xs text-white cursor-pointer text-left"
                    >
                      <span className="font-bold text-fuchsia-300 mr-1.5">{q.caption}:</span>
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                      isUser
                        ? 'bg-gradient-to-br from-fuchsia-500 to-purple-700 text-white rounded-br-sm shadow-md'
                        : 'bg-[#220e4f]/85 border border-purple-300/25 text-purple-50 rounded-bl-sm shadow-md'
                    }`}
                  >
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        alt="Message attachment"
                        referrerPolicy="no-referrer"
                        className="w-full max-h-52 object-cover rounded-xl mb-2"
                      />
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed text-sm">{m.text}</p>
                    {Array.isArray(m.sources) && m.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-purple-300/20 flex flex-wrap gap-2">
                        {m.sources.slice(0, 3).map((src, idx) => (
                          <a
                            key={`${m.id}-src-${idx}`}
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-fuchsia-300 hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[180px]">{src.title || 'Source'}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 px-1 text-[11px] text-purple-300/80">
                    <span>{isUser ? 'You' : m.assistantLabel || 'Zara'}</span>
                    <span>·</span>
                    <span className="tabular-nums">{m.timestamp}</span>
                    {!isUser && (
                      <>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => {
                            audioService.unlock();
                            audioService.speakText(m.text, {
                              language,
                              voiceName: config.voiceName,
                              loveMode: config.loveMode,
                              emotionMode: activeEmotion,
                            });
                          }}
                          className="text-fuchsia-300 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Listen</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {isThinking && (
              <div className="flex items-start">
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-[#220e4f]/85 border border-purple-300/25 text-xs font-medium text-purple-200">
                  Zara is thinking...
                </div>
              </div>
            )}

            <div ref={desktopChatEndRef} />
          </div>

          {/* Desktop Input Bar */}
          <form
            onSubmit={handleSendText}
            className="p-3.5 border-t border-purple-300/20 bg-[#12052d]/70 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-purple-100 flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Send Image"
              title="Send Image to Zara"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Zara anything in Urdu, Roman Urdu, Hindi, Punjabi, or English..."
              className="flex-1 min-w-0 h-10 px-4 rounded-full bg-[#0c0321] border border-purple-300/25 text-sm text-white placeholder:text-purple-300/50 focus:outline-none focus:border-fuchsia-400"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="w-10 h-10 rounded-full bg-gradient-to-b from-fuchsia-500 to-purple-700 hover:brightness-110 disabled:opacity-40 text-white flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      </div>

      {/* MORE HUB & ALL-TOOLS DRAWER (Accessible from Top-Left Menu OR Bottom-Right "More" Tab) */}
      {showMoreDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowMoreDrawer(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-gradient-to-b from-[#1f0a4d] via-[#130630] to-[#0a021d] border border-purple-300/35 shadow-[0_0_60px_rgba(147,51,234,0.5)] p-5 max-h-[86vh] flex flex-col gap-4"
          >
            {/* Grab Handle + Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-purple-500/25 border border-purple-300/40 flex items-center justify-center text-fuchsia-300">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-white">Zara All Tools &amp; Hub</h2>
                  <p className="text-[11px] text-purple-200/80">
                    ZX Companion, Studios, Device &amp; AI Controls
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreDrawer(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Activate All Systems Boost */}
              <button
                type="button"
                onClick={() => {
                  handleActivateAllClick();
                }}
                disabled={isEnablingAll}
                className="w-full min-h-[52px] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-600/80 to-purple-700/85 border border-purple-200/40 flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <Zap
                    className={`w-5 h-5 shrink-0 ${
                      allFunctionsActive ? 'text-emerald-300 fill-emerald-300' : 'text-amber-300 fill-amber-300'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-extrabold text-white">
                      {allFunctionsActive ? 'All Zara Systems ON ✓' : 'Activate All Zara Systems'}
                    </div>
                    <div className="text-[10.5px] text-purple-100/80">
                      Always-On Voice, Auto-Speak, Self-Heal &amp; Mobile Controls
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white shrink-0" />
              </button>

              {/* Quick Language Switcher */}
              {onSelectLanguage && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-purple-200 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-fuchsia-300" />
                    <span>Voice &amp; Reply Language</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {LANGUAGE_CHOICES.map((lc) => (
                      <button
                        key={lc.id}
                        type="button"
                        onClick={() => {
                          audioService.playChime('tap');
                          onSelectLanguage(lc.id);
                        }}
                        className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-bold border cursor-pointer ${
                          language === lc.id
                            ? 'bg-fuchsia-600 border-fuchsia-300 text-white'
                            : 'bg-white/5 border-purple-300/25 text-purple-100 hover:bg-white/10'
                        }`}
                      >
                        {lc.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Portrait Look Switcher */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-purple-200">
                  <span>Zara Portrait Look ({activePortrait.name})</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {getAllZaraPortraits().slice(0, 8).map((p) => {
                    const selected = p.id === effectivePortraitId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          audioService.playChime('tap');
                          onUpdateConfig({ portraitId: p.id });
                        }}
                        className={`w-12 h-14 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer ${
                          selected
                            ? 'border-fuchsia-400 shadow-[0_0_12px_rgba(232,121,249,0.8)]'
                            : 'border-purple-300/25 opacity-75 hover:opacity-100'
                        }`}
                        title={p.name}
                      >
                        <img src={p.src} alt={p.name} className="w-full h-full object-cover object-top" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Core Assistant Shortcuts Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreDrawer(false);
                    visionMode === 'camera' ? onStopCamera?.() : onStartCamera?.();
                  }}
                  className="min-h-[56px] p-3 rounded-2xl bg-white/8 hover:bg-white/15 border border-purple-300/25 text-left flex items-center gap-2.5 cursor-pointer"
                >
                  <Video className="w-5 h-5 text-emerald-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {visionMode === 'camera' ? 'Stop Camera' : 'Camera Vision'}
                    </div>
                    <div className="text-[10px] text-purple-200/75 truncate">See Surroundings</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreDrawer(false);
                    onToggleScreenShare?.();
                  }}
                  className="min-h-[56px] p-3 rounded-2xl bg-white/8 hover:bg-white/15 border border-purple-300/25 text-left flex items-center gap-2.5 cursor-pointer"
                >
                  <MonitorUp className="w-5 h-5 text-cyan-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">Screen Share</div>
                    <div className="text-[10px] text-purple-200/75 truncate">Zara Reads Screen</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreDrawer(false);
                    onOpenMobileControl?.();
                  }}
                  className="min-h-[56px] p-3 rounded-2xl bg-white/8 hover:bg-white/15 border border-purple-300/25 text-left flex items-center gap-2.5 cursor-pointer"
                >
                  <Smartphone className="w-5 h-5 text-purple-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">Phone &amp; Social</div>
                    <div className="text-[10px] text-purple-200/75 truncate">Apps &amp; Permissions</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreDrawer(false);
                    onOpenMemories ? onOpenMemories() : onOpenSettings();
                  }}
                  className="min-h-[56px] p-3 rounded-2xl bg-white/8 hover:bg-white/15 border border-purple-300/25 text-left flex items-center gap-2.5 cursor-pointer"
                >
                  <History className="w-5 h-5 text-fuchsia-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">Memories</div>
                    <div className="text-[10px] text-purple-200/75 truncate">Saved Personal Info</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreDrawer(false);
                    handleWhatsAppAction();
                  }}
                  className="min-h-[56px] p-3 rounded-2xl bg-white/8 hover:bg-white/15 border border-purple-300/25 text-left flex items-center gap-2.5 cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">WhatsApp</div>
                    <div className="text-[10px] text-purple-200/75 truncate">Message &amp; Call</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreDrawer(false);
                    onOpenSettings();
                  }}
                  className="min-h-[56px] p-3 rounded-2xl bg-white/8 hover:bg-white/15 border border-purple-300/25 text-left flex items-center gap-2.5 cursor-pointer"
                >
                  <Globe className="w-5 h-5 text-sky-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">Voice &amp; Settings</div>
                    <div className="text-[10px] text-purple-200/75 truncate">Wake-Word &amp; Speaker</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
