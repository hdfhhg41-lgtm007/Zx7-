import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  MessageSquareText,
  Image as ImageIcon,
  Film,
  Sparkles,
  Volume2,
  Download,
  Copy,
  Check,
  Upload,
  Camera,
  RotateCw,
  Wand2,
  Play,
  Scissors,
  Sliders,
  Loader2,
  VolumeX,
  Briefcase,
  Terminal,
  ShieldAlert,
  KeyRound,
  Globe,
  FileText,
  Hash,
  Search,
  Monitor,
  FolderOpen,
  RefreshCw,
  Lock,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Zap,
  Mic,
  Share2,
  Code2,
  Activity,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Users,
  Send,
} from 'lucide-react';
import { UnifiedAppBuilderPanel } from './studio/UnifiedAppBuilderPanel';
import { audioService } from '../services/audioService';
import { fetchWithContainerWakeup } from '../services/chatVaultPersistence';
import { getOwnerAuthHeaders } from '../services/ownerAuthService';
import { getTierRequestHeaders } from '../services/proTierService';
import {
  downloadPcCompanionAgentScript,
  executeAuthorizedPcCommand,
  fetchPcCompanionStatus,
  rotatePcPairingToken,
} from '../services/computerControlService';
import {
  BRAIN_ENGINE_OPTIONS,
  TTS_ENGINE_OPTIONS,
  fetchAiOrchestratorSnapshot,
  testAiFallbackRouting,
  testAiOrchestratorEngine,
  testAllAiOrchestratorSystems,
  updateAiOrchestratorConfig,
} from '../services/aiOrchestratorService';
import {
  AiBrainEngineId,
  AiOrchestratorSnapshot,
  AiOrchestratorTestResult,
  AllAiSystemId,
  Language,
  PcCompanionStatus,
  PersonalityConfig,
  ResearchSourceCitation,
  SelfImproveAuditReport,
  SocialAccountStatus,
  SocialDraftItem,
  SocialPlatformId,
  TtsEngineId,
  ZARA_AI_ASSISTANTS,
  ZARA_VOICE_PROFILES,
  ZaraUpdateReport,
  ZaraVoiceGender,
  ZaraVoiceName,
  getVoiceGenderFromName,
} from '../types';
import { zaraSelfHealEngine } from '../services/selfHealAndMacroService';

export type AiStudioTab =
  | 'brains'
  | 'research'
  | 'social'
  | 'devlab'
  | 'audit'
  | 'office'
  | 'pctools'
  | 'security'
  | 'messages'
  | 'photo'
  | 'video';

interface AdvancedAiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AiStudioTab;
  config: PersonalityConfig;
  onUpdateConfig: (updates: Partial<PersonalityConfig>) => void;
  language: Language;
  isOwnerVerified: boolean;
  onSendToChat?: (text: string) => void;
}

type PhotoFilterId = 'none' | 'warm' | 'cool' | 'bw' | 'vintage';

const PHOTO_FILTERS: { id: PhotoFilterId; label: string; css: string }[] = [
  { id: 'none', label: 'Original', css: 'none' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.28) saturate(1.25) contrast(1.06)' },
  { id: 'cool', label: 'Cool', css: 'hue-rotate(175deg) saturate(1.1) contrast(1.06)' },
  { id: 'bw', label: 'B&W', css: 'grayscale(1) contrast(1.18)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.45) contrast(1.12) brightness(0.95)' },
];

const VIDEO_FILTERS: { id: string; label: string; css: string }[] = [
  { id: 'none', label: 'Original', css: 'none' },
  { id: 'vivid', label: 'Vivid HD', css: 'contrast(1.18) saturate(1.25)' },
  { id: 'warm', label: 'Warm Cinema', css: 'sepia(0.32) saturate(1.25) contrast(1.08)' },
  { id: 'cool', label: 'Cool Night', css: 'hue-rotate(175deg) contrast(1.08) saturate(1.1)' },
  { id: 'noir', label: 'Noir B&W', css: 'grayscale(1) contrast(1.2)' },
];

export const AdvancedAiStudioModal: React.FC<AdvancedAiStudioModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'messages',
  config,
  onUpdateConfig,
  language,
  isOwnerVerified,
  onSendToChat,
}) => {
  const [activeTab, setActiveTab] = useState<AiStudioTab>(initialTab);

  // Sync tab when reopened from shortcuts
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // =================== 1. MESSAGES & VOICE STATE ===================
  const [msgText, setMsgText] = useState('');
  const [msgPrompt, setMsgPrompt] = useState('');
  const [msgLang, setMsgLang] = useState<Language>(language);
  const [voiceGender, setVoiceGender] = useState<ZaraVoiceGender>(
    config.voiceGender || getVoiceGenderFromName(config.voiceName)
  );
  const [isDraftingMsg, setIsDraftingMsg] = useState(false);
  const [isConvertingWav, setIsConvertingWav] = useState(false);
  const [wavAudioUrl, setWavAudioUrl] = useState<string | null>(null);
  const [wavFilename, setWavFilename] = useState<string>('zara-voice.wav');
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [msgStatus, setMsgStatus] = useState<string | null>(null);

  // =================== 2. PHOTO ANALYZER & EDITOR STATE ===================
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [photoFilter, setPhotoFilter] = useState<PhotoFilterId>('none');
  const [rotationDeg, setRotationDeg] = useState(0);
  const [captionText, setCaptionText] = useState('');
  const [captionColor, setCaptionColor] = useState('#ffffff');
  const [photoQuestion, setPhotoQuestion] = useState('');
  const [photoAnalysis, setPhotoAnalysis] = useState('');
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const photoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // =================== 3. VIDEO EDITOR STATE ===================
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [videoFilter, setVideoFilter] = useState('none');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [muteVideoAudio, setMuteVideoAudio] = useState(false);
  const [videoTitleOverlay, setVideoTitleOverlay] = useState('');
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // =================== 4. OFFICE WORK SUITE STATE ===================
  const [officeTaskType, setOfficeTaskType] = useState<
    'email' | 'mom' | 'excel' | 'proposal' | 'translate'
  >('email');
  const [officePrompt, setOfficePrompt] = useState('');
  const [officeOutput, setOfficeOutput] = useState('');
  const [isRunningOffice, setIsRunningOffice] = useState(false);
  const [copiedOffice, setCopiedOffice] = useState(false);

  // =================== 5. PC & DEVELOPER AI TOOLS STATE ===================
  const [pcPrompt, setPcPrompt] = useState('');
  const [pcCategory, setPcCategory] = useState<'code' | 'powershell' | 'bash' | 'sql'>('code');
  const [pcAiOutput, setPcAiOutput] = useState('');
  const [isRunningPcAi, setIsRunningPcAi] = useState(false);
  const [pcToolMode, setPcToolMode] = useState<'json' | 'regex' | 'crypto'>('json');
  const [jsonInput, setJsonInput] = useState('{"assistant":"Zara AI","mode":"professional","status":"ready"}');
  const [jsonResult, setJsonResult] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [regexPattern, setRegexPattern] = useState('\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b');
  const [regexFlags, setRegexFlags] = useState('g');
  const [regexSample, setRegexSample] = useState('Contact: security@example.com, admin@zara.ai');
  const [cryptoInput, setCryptoInput] = useState('Zara AI Security Check');
  const [cryptoOutput, setCryptoOutput] = useState('');

  // Authorized PC Companion Control Bridge state
  const [pcStatus, setPcStatus] = useState<PcCompanionStatus>({ connected: false });
  const [pcBridgeLog, setPcBridgeLog] = useState('');
  const [isRunningPcCmd, setIsRunningPcCmd] = useState(false);
  const [confirmLockPc, setConfirmLockPc] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'pctools' && isOwnerVerified) {
      fetchPcCompanionStatus().then(setPcStatus).catch(() => {});
    }
  }, [isOpen, activeTab, isOwnerVerified]);

  // =================== AI BRAIN & VOICE ORCHESTRATOR STATE ===================
  const [orchSnapshot, setOrchSnapshot] = useState<AiOrchestratorSnapshot | null>(null);
  const [orchLoading, setOrchLoading] = useState(false);
  const [testingEngineId, setTestingEngineId] = useState<string | null>(null);
  const [orchTestResults, setOrchTestResults] = useState<Record<string, AiOrchestratorTestResult>>({});
  const [fallbackVerifyNote, setFallbackVerifyNote] = useState<string | null>(null);

  const loadOrchestratorSnapshot = useCallback(async () => {
    setOrchLoading(true);
    try {
      const snap = await fetchAiOrchestratorSnapshot();
      if (snap) setOrchSnapshot(snap);
    } finally {
      setOrchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'brains') {
      loadOrchestratorSnapshot();
    }
  }, [isOpen, activeTab, loadOrchestratorSnapshot]);

  // =================== 6. ETHICAL SECURITY LAB STATE ===================
  const [secTargetDomain, setSecTargetDomain] = useState('example.com');
  const [isInspectingHeaders, setIsInspectingHeaders] = useState(false);
  const [headerAuditResult, setHeaderAuditResult] = useState<{
    url: string;
    statusCode: number;
    serverHeader: string;
    score: number;
    headers: { name: string; present: boolean; value: string }[];
  } | null>(null);
  const [isRunningDns, setIsRunningDns] = useState(false);
  const [dnsResult, setDnsResult] = useState<{
    domain: string;
    records: { A: string[]; AAAA: string[]; MX: string[]; TXT: string[]; NS: string[] };
  } | null>(null);
  const [secNetError, setSecNetError] = useState<string | null>(null);
  const [pwdTestInput, setPwdTestInput] = useState('');
  const [jwtInput, setJwtInput] = useState('');
  const [cidrInput, setCidrInput] = useState('192.168.1.0/24');
  const [secAiQuery, setSecAiQuery] = useState('');
  const [secAiOutput, setSecAiOutput] = useState('');
  const [isRunningSecAi, setIsRunningSecAi] = useState(false);

  // =================== 7. LIVE INTERNET RESEARCH & NEWS STATE ===================
  const [researchQuery, setResearchQuery] = useState('Latest technology, AI, Pakistan and Malaysia top news today');
  const [researchRegion, setResearchRegion] = useState('Global · Pakistan · Malaysia');
  const [isSearchingResearch, setIsSearchingResearch] = useState(false);
  const [researchResult, setResearchResult] = useState<{
    text: string;
    grounded: boolean;
    sources: ResearchSourceCitation[];
    searchQueries: string[];
    modelIdUsed: string;
    note?: string;
  } | null>(null);

  // =================== 8. SOCIAL MEDIA ACCOUNT HUB STATE ===================
  const [socialStatuses, setSocialStatuses] = useState<SocialAccountStatus[]>([]);
  const [socialDrafts, setSocialDrafts] = useState<SocialDraftItem[]>([]);
  const [socialPlatform, setSocialPlatform] = useState<SocialPlatformId>('whatsapp');
  const [socialTopic, setSocialTopic] = useState('');
  const [socialCaption, setSocialCaption] = useState('');
  const [socialBusy, setSocialBusy] = useState(false);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [confirmPublishDraft, setConfirmPublishDraft] = useState<SocialDraftItem | null>(null);
  const [confirmDeleteDraftId, setConfirmDeleteDraftId] = useState<string | null>(null);
  const [activeDevProjectId, setActiveDevProjectId] = useState<string>('');

  // =================== 9. MULTI-STACK DEV LAB & WORKSPACE INSPECTOR STATE ===================
  const [devStack, setDevStack] = useState<'flutter' | 'kotlin' | 'typescript' | 'javascript' | 'python' | 'html_css'>('flutter');
  const [devPrompt, setDevPrompt] = useState('');
  const [devOutput, setDevOutput] = useState('');
  const [isGeneratingDev, setIsGeneratingDev] = useState(false);
  const [workspaceSummary, setWorkspaceSummary] = useState<{
    totalFiles: number;
    byArea: Record<string, number>;
    files: { path: string; lines?: number; bytes?: number }[];
  } | null>(null);
  const [inspectFilePath, setInspectFilePath] = useState('server.ts');
  const [inspectQuestion, setInspectQuestion] = useState('Explain architecture and check for issues');
  const [inspectAnalysis, setInspectAnalysis] = useState('');
  const [isInspectingWorkspace, setIsInspectingWorkspace] = useState(false);

  // =================== 10. SELF-IMPROVEMENT AUDIT & LIVE UPDATE CHECKER STATE ===================
  const [auditReport, setAuditReport] = useState<SelfImproveAuditReport | null>(null);
  const [updateReport, setUpdateReport] = useState<ZaraUpdateReport | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [isUpdatingSelf, setIsUpdatingSelf] = useState(false);
  const [autoUpdateLog, setAutoUpdateLog] = useState<string | null>(null);

  // =================== 11. AI IMAGE GEN & VIDEO SUMMARIZER STATE ===================
  const [imgGenPrompt, setImgGenPrompt] = useState('');
  const [imgGenAspect, setImgGenAspect] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [imgGenUrl, setImgGenUrl] = useState<string | null>(null);
  const [imgGenError, setImgGenError] = useState<string | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  const [videoSummaryPrompt, setVideoSummaryPrompt] = useState('Summarize the events, people, objects, and audio context shown in this video.');
  const [videoSummaryOutput, setVideoSummaryOutput] = useState('');
  const [isSummarizingVideo, setIsSummarizingVideo] = useState(false);

  const loadSocialState = useCallback(async () => {
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetch('/api/social/status', { headers: { ...authHeaders } });
      if (res.ok) {
        const data = await res.json();
        const accounts = Array.isArray(data.accounts) ? data.accounts : data.platforms;
        if (Array.isArray(accounts)) setSocialStatuses(accounts);
        if (Array.isArray(data.drafts)) setSocialDrafts(data.drafts);
      }
    } catch {}
  }, []);

  const loadWorkspaceFiles = useCallback(async () => {
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetch('/api/dev/analyze-workspace', { headers: { ...authHeaders } });
      if (res.ok) {
        const data = await res.json();
        setWorkspaceSummary({
          totalFiles: Number(data.totalFiles || 0),
          byArea: data.categories || data.byArea || {},
          files: Array.isArray(data.sampleFiles) ? data.sampleFiles : data.files || [],
        });
      }
    } catch {}
  }, []);

  const runSelfAudit = useCallback(async () => {
    setIsRunningAudit(true);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const [auditRes, updReport] = await Promise.all([
        fetch('/api/self-improve/audit', { headers: { ...authHeaders } }),
        zaraSelfHealEngine.fetchUpdateCheckReport(),
      ]);
      if (auditRes.ok) {
        const data = await auditRes.json();
        if (data?.report || data?.capabilities) {
          setAuditReport(data.report || data);
        }
      }
      if (updReport) {
        setUpdateReport(updReport);
      }
    } catch {} finally {
      setIsRunningAudit(false);
    }
  }, []);

  useEffect(() => {
    const onUpd = (e: Event) => {
      const detail = (e as CustomEvent<ZaraUpdateReport>).detail;
      if (detail) setUpdateReport(detail);
    };
    window.addEventListener('zara-update-report', onUpd);
    return () => window.removeEventListener('zara-update-report', onUpd);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'social') loadSocialState();
    if (activeTab === 'devlab') loadWorkspaceFiles();
    if (activeTab === 'audit') runSelfAudit();
  }, [isOpen, activeTab, loadSocialState, loadWorkspaceFiles, runSelfAudit]);

  const handleRunResearchSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? researchQuery).trim();
    if (!q || isSearchingResearch) return;
    if (overrideQuery) setResearchQuery(overrideQuery);
    setIsSearchingResearch(true);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup('/api/research/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders, ...getTierRequestHeaders() },
        body: JSON.stringify({ query: q, topic: researchRegion, language: msgLang }),
      });
      const data = await res.json().catch(() => ({}));
      setResearchResult({
        text: data.summary || data.text || data.error || 'No live search response received.',
        grounded: Boolean(data.grounded),
        sources: Array.isArray(data.sources) ? data.sources : [],
        searchQueries: Array.isArray(data.searchQueries) ? data.searchQueries : [],
        modelIdUsed: data.modelIdUsed || '',
        note: data.error,
      });
    } catch {
      setResearchResult({
        text: 'Network error while reaching live search endpoint.',
        grounded: false,
        sources: [],
        searchQueries: [],
        modelIdUsed: '',
      });
    } finally {
      setIsSearchingResearch(false);
    }
  };

  const handleCreateSocialDraft = async () => {
    if ((!socialTopic.trim() && !socialCaption.trim()) || socialBusy) return;
    setSocialBusy(true);
    setSocialNotice(null);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetch('/api/social/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          platform: socialPlatform,
          actionType: 'post',
          title: socialTopic.trim(),
          content: socialCaption.trim(),
          prompt: socialCaption.trim() ? '' : socialTopic.trim(),
          language: msgLang,
        }),
      });
      const data = await res.json();
      if (res.ok && data.draft) {
        setSocialDrafts((prev) => [data.draft, ...prev]);
        setSocialTopic('');
        setSocialCaption('');
        setSocialNotice(`Draft created for ${socialPlatform.toUpperCase()}. Owner approval required to publish.`);
      } else {
        setSocialNotice(data.error || 'Could not create draft.');
      }
    } catch {
      setSocialNotice('Network error while saving draft.');
    } finally {
      setSocialBusy(false);
    }
  };

  const handleConfirmPublishSocial = async (draft: SocialDraftItem) => {
    setSocialBusy(true);
    setSocialNotice(null);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ draftId: draft.id, confirmedByOwner: true }),
      });
      const data = await res.json();
      setConfirmPublishDraft(null);
      if (data.draft) {
        setSocialDrafts((prev) => prev.map((d) => (d.id === draft.id ? data.draft : d)));
      }
      setSocialNotice(data.draft?.publishResult || data.message || data.error || 'Publish attempt complete.');
    } catch {
      setSocialNotice('Publish failed due to network error.');
    } finally {
      setSocialBusy(false);
    }
  };

  const handleDeleteSocialDraft = async (id: string) => {
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetch(`/api/social/drafts/${encodeURIComponent(id)}?confirmed=true`, {
        method: 'DELETE',
        headers: { ...authHeaders },
      });
      if (res.ok) {
        setSocialDrafts((prev) => prev.filter((d) => d.id !== id));
        setConfirmDeleteDraftId(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setSocialNotice(data.error || 'Failed to delete draft.');
      }
    } catch {
      setSocialNotice('Network error while deleting draft.');
    }
  };

  const handleGenerateDevCode = async () => {
    if (!devPrompt.trim() || isGeneratingDev) return;
    setIsGeneratingDev(true);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup('/api/dev/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders, ...getTierRequestHeaders() },
        body: JSON.stringify({ targetStack: devStack, prompt: devPrompt.trim(), language: msgLang }),
      });
      const data = await res.json();
      setDevOutput(data.codeAndGuide || data.code || data.error || 'No code generated.');
    } catch {
      setDevOutput('Dev lab endpoint unavailable right now.');
    } finally {
      setIsGeneratingDev(false);
    }
  };

  const handleInspectWorkspaceFile = async () => {
    if (!inspectFilePath.trim() || isInspectingWorkspace) return;
    setIsInspectingWorkspace(true);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup('/api/dev/analyze-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ relPath: inspectFilePath.trim(), question: inspectQuestion.trim() }),
      });
      const data = await res.json();
      setInspectAnalysis(data.analysis || data.error || 'Unable to inspect file.');
    } catch {
      setInspectAnalysis('File inspection failed.');
    } finally {
      setIsInspectingWorkspace(false);
    }
  };

  const handleGenerateAiImage = async () => {
    if (!imgGenPrompt.trim() || isGeneratingImg) return;
    setIsGeneratingImg(true);
    setImgGenError(null);
    setImgGenUrl(null);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup('/api/media/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ prompt: imgGenPrompt.trim(), aspectRatio: imgGenAspect }),
      });
      const data = await res.json();
      if (data.ok && (data.imageDataUrl || data.imageBase64)) {
        setImgGenUrl(data.imageDataUrl || `data:${data.mimeType || 'image/png'};base64,${data.imageBase64}`);
      } else {
        setImgGenError(data.error || 'Image generation requires a configured DALL-E or paid Gemini Image API key.');
      }
    } catch {
      setImgGenError('Network error while generating image.');
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleSummarizeVideoFrames = async () => {
    const vid = sourceVideoRef.current;
    if (!vid || isSummarizingVideo) return;
    setIsSummarizingVideo(true);
    setVideoSummaryOutput('');
    try {
      const frames: string[] = [];
      const dur = Math.max(0.5, vid.duration || 1);
      const sampleCount = Math.min(5, Math.max(2, Math.floor(dur)));
      const canvas = document.createElement('canvas');
      const w = 480;
      const h = Math.max(240, Math.round(((vid.videoHeight || 360) / Math.max(1, vid.videoWidth || 640)) * 480));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      const origTime = vid.currentTime;
      for (let i = 0; i < sampleCount; i++) {
        const t = Math.min(dur - 0.05, (dur * i) / sampleCount + 0.1);
        vid.currentTime = t;
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            vid.removeEventListener('seeked', onSeeked);
            resolve();
          };
          vid.addEventListener('seeked', onSeeked);
          window.setTimeout(resolve, 700);
        });
        if (ctx) {
          ctx.drawImage(vid, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          frames.push(dataUrl.split(',')[1] || '');
        }
      }
      vid.currentTime = origTime;
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup('/api/media/summarize-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          frames: frames.filter(Boolean).map((data) => ({ mimeType: 'image/jpeg', data })),
          prompt: videoSummaryPrompt.trim(),
          language: msgLang,
        }),
      });
      const data = await res.json();
      setVideoSummaryOutput(data.summary || data.error || 'Could not summarize video.');
    } catch {
      setVideoSummaryOutput('Failed to sample video frames for AI summary.');
    } finally {
      setIsSummarizingVideo(false);
    }
  };

  // Cleanup camera stream or object URLs when closed
  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setCameraOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (wavAudioUrl) URL.revokeObjectURL(wavAudioUrl);
      if (exportedVideoUrl) URL.revokeObjectURL(exportedVideoUrl);
    };
  }, [stopCamera, wavAudioUrl, exportedVideoUrl]);

  // =================== PHOTO CANVAS RENDER ===================
  const renderPhotoCanvas = useCallback(() => {
    const canvas = photoCanvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const quarterTurns = ((rotationDeg % 360) + 360) % 360;
    const swapDims = quarterTurns === 90 || quarterTurns === 270;
    const rawW = swapDims ? img.naturalHeight : img.naturalWidth;
    const rawH = swapDims ? img.naturalWidth : img.naturalHeight;
    const maxDim = 1080;
    const scale = Math.min(1, maxDim / Math.max(rawW || 1, rawH || 1));
    canvas.width = Math.max(1, Math.round(rawW * scale));
    canvas.height = Math.max(1, Math.round(rawH * scale));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    const presetCss = PHOTO_FILTERS.find((f) => f.id === photoFilter)?.css || 'none';
    const customCss = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.filter = presetCss === 'none' ? customCss : `${customCss} ${presetCss}`;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((quarterTurns * Math.PI) / 180);

    const drawW = Math.round(img.naturalWidth * scale);
    const drawH = Math.round(img.naturalHeight * scale);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    if (captionText.trim()) {
      const fontSize = Math.max(20, Math.round(canvas.width * 0.048));
      ctx.save();
      ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const padY = Math.round(canvas.height * 0.045);
      const metrics = ctx.measureText(captionText.trim());
      const boxW = Math.min(canvas.width - 24, metrics.width + 28);
      ctx.fillRect(
        (canvas.width - boxW) / 2,
        canvas.height - padY - fontSize - 10,
        boxW,
        fontSize + 14
      );
      ctx.fillStyle = captionColor;
      ctx.fillText(captionText.trim(), canvas.width / 2, canvas.height - padY);
      ctx.restore();
    }
  }, [brightness, contrast, saturation, photoFilter, rotationDeg, captionText, captionColor]);

  useEffect(() => {
    if (!photoSrc) return;
    const img = new Image();
    img.onload = () => {
      loadedImageRef.current = img;
      renderPhotoCanvas();
    };
    img.src = photoSrc;
  }, [photoSrc, renderPhotoCanvas]);

  useEffect(() => {
    renderPhotoCanvas();
  }, [renderPhotoCanvas]);

  // =================== MESSAGE HANDLERS ===================
  const filteredVoiceProfiles = ZARA_VOICE_PROFILES.filter((p) => p.gender === voiceGender);

  const handleSelectVoiceGender = (g: ZaraVoiceGender) => {
    setVoiceGender(g);
    const currentProfile = ZARA_VOICE_PROFILES.find((p) => p.id === config.voiceName);
    if (!currentProfile || currentProfile.gender !== g) {
      const firstOfGender = ZARA_VOICE_PROFILES.find((p) => p.gender === g);
      if (firstOfGender) {
        onUpdateConfig({ voiceGender: g, voiceName: firstOfGender.id });
      }
    } else {
      onUpdateConfig({ voiceGender: g });
    }
  };

  const handleAiDraftMessage = async () => {
    const prompt =
      msgPrompt.trim() ||
      (msgText.trim()
        ? `Rewrite and polish this message clearly and warmly in ${msgLang}: "${msgText.trim()}"`
        : `Write a thoughtful, natural greeting message in ${msgLang}.`);

    setIsDraftingMsg(true);
    setMsgStatus(null);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            message: prompt,
            language: msgLang,
            loveMode: isOwnerVerified ? config.loveMode : false,
            romanceIntensity: isOwnerVerified ? config.romanceIntensity : 'calm',
            emotionMode: isOwnerVerified ? config.emotionMode || 'apnapan' : 'calm',
            voiceName: config.voiceName,
            userNickname: isOwnerVerified ? config.userNickname : 'Friend',
            skipAudio: true,
            brainMode: config.brainMode || 'auto',
          }),
        },
        { maxWakeRetries: 1 }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setMsgText(data.text);
          setMsgStatus('Message ready — tap Read Aloud or Convert to Voice Audio.');
        }
      } else {
        setMsgStatus('Could not reach AI writer right now.');
      }
    } catch {
      setMsgStatus('Network offline — type your message manually above.');
    } finally {
      setIsDraftingMsg(false);
    }
  };

  const handleReadMessageAloud = async () => {
    const clean = msgText.trim();
    if (!clean) return;
    audioService.unlock();
    setMsgStatus('Reading aloud...');
    await audioService.speakText(clean, {
      language: msgLang,
      rate: config.voiceSpeed,
      voiceName: config.voiceName,
      loveMode: isOwnerVerified ? config.loveMode : false,
      romanceIntensity: isOwnerVerified ? config.romanceIntensity : 'calm',
      emotionMode: isOwnerVerified ? config.emotionMode || 'apnapan' : 'calm',
    });
    setMsgStatus(null);
  };

  const handleConvertMessageToAudio = async () => {
    const clean = msgText.trim();
    if (!clean) return;
    audioService.unlock();
    setIsConvertingWav(true);
    setMsgStatus(null);
    try {
      const result = await audioService.synthesizeVoiceAudio(clean, {
        language: msgLang,
        voiceName: config.voiceName,
        loveMode: isOwnerVerified ? config.loveMode : false,
        romanceIntensity: isOwnerVerified ? config.romanceIntensity : 'calm',
        emotionMode: isOwnerVerified ? config.emotionMode || 'apnapan' : 'calm',
      });
      if (result) {
        if (wavAudioUrl) URL.revokeObjectURL(wavAudioUrl);
        setWavAudioUrl(result.blobUrl);
        setWavFilename(result.filename);
        setMsgStatus('Voice audio (.wav) generated — play or download below.');
      } else {
        setMsgStatus('Voice studio audio requires server connection; try Read Aloud for offline voice.');
      }
    } finally {
      setIsConvertingWav(false);
    }
  };

  const handleCopyMessage = async () => {
    if (!msgText.trim()) return;
    try {
      await navigator.clipboard.writeText(msgText.trim());
      setCopiedMsg(true);
      window.setTimeout(() => setCopiedMsg(false), 1800);
    } catch {}
  };

  // =================== PHOTO HANDLERS ===================
  const handlePickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoSrc(reader.result);
        setPhotoAnalysis('');
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setPhotoFilter('none');
        setRotationDeg(0);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleOpenCameraSnap = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      window.setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setPhotoAnalysis('Camera permission is required to take a photo directly.');
    }
  };

  const handleCaptureCameraFrame = () => {
    const vid = cameraVideoRef.current;
    if (!vid || !vid.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = vid.videoWidth;
    c.height = vid.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(vid, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/jpeg', 0.9);
    setPhotoSrc(dataUrl);
    setPhotoAnalysis('');
    stopCamera();
  };

  const handleDownloadEditedPhoto = () => {
    const canvas = photoCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `zara-photo-${Date.now()}.png`;
    link.click();
  };

  const handleUnderstandPhoto = async () => {
    const canvas = photoCanvasRef.current;
    if (!canvas && !photoSrc) return;
    setIsAnalyzingPhoto(true);
    setPhotoAnalysis('');

    try {
      const dataUrl = canvas ? canvas.toDataURL('image/jpeg', 0.82) : photoSrc!;
      const b64 = dataUrl.split(',')[1] || '';
      const prompt =
        photoQuestion.trim() ||
        'Look closely at this photo and describe clearly what is in it, key details, text if any, and helpful insights in the user language.';

      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            message: prompt,
            imageBase64: b64,
            imageMimeType: 'image/jpeg',
            visionSource: 'photo_studio',
            language: msgLang,
            loveMode: isOwnerVerified ? config.loveMode : false,
            romanceIntensity: isOwnerVerified ? config.romanceIntensity : 'calm',
            emotionMode: isOwnerVerified ? config.emotionMode || 'apnapan' : 'calm',
            voiceName: config.voiceName,
            userNickname: isOwnerVerified ? config.userNickname : 'Friend',
            skipAudio: true,
            brainMode: config.brainMode || 'auto',
          }),
        },
        { maxWakeRetries: 1 }
      );
      if (res.ok) {
        const data = await res.json();
        setPhotoAnalysis(data.text || 'Could not analyze this image.');
      } else {
        setPhotoAnalysis('Photo understanding service returned an error. Please try again.');
      }
    } catch {
      setPhotoAnalysis('Unable to connect for photo understanding right now.');
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // =================== VIDEO EDITOR HANDLERS ===================
  const handlePickVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    if (exportedVideoUrl) {
      URL.revokeObjectURL(exportedVideoUrl);
      setExportedVideoUrl(null);
    }
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoError(null);
    setExportProgress(0);
    e.target.value = '';
  };

  const handleVideoLoadedMetadata = () => {
    const vid = sourceVideoRef.current;
    if (!vid || !Number.isFinite(vid.duration)) return;
    const dur = Math.max(0.5, Number(vid.duration.toFixed(1)));
    setVideoDuration(dur);
    setTrimStart(0);
    setTrimEnd(dur);
  };

  const activeVideoFilterCss =
    VIDEO_FILTERS.find((f) => f.id === videoFilter)?.css || 'none';

  const handleExportEditedVideo = async () => {
    const vid = sourceVideoRef.current;
    const canvas = videoCanvasRef.current;
    if (!vid || !canvas || !videoSrc) return;

    const endSec = Math.max(trimStart + 0.3, trimEnd || vid.duration);
    if (typeof MediaRecorder === 'undefined') {
      setVideoError('Video export MediaRecorder is not supported on this browser.');
      return;
    }

    setIsExportingVideo(true);
    setVideoError(null);
    setExportProgress(1);

    try {
      const vw = vid.videoWidth || 640;
      const vh = vid.videoHeight || 360;
      const scale = Math.min(1, 720 / Math.max(vw, vh));
      canvas.width = Math.max(2, Math.round(vw * scale));
      canvas.height = Math.max(2, Math.round(vh * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      const canvasStream = canvas.captureStream(30);
      const vidAny = vid as any;
      if (!muteVideoAudio && typeof vidAny.captureStream === 'function') {
        try {
          const mediaStream: MediaStream = vidAny.captureStream();
          mediaStream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
        } catch {}
      }

      const preferredTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const mimeType =
        preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || 'video/webm';

      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(canvasStream, { mimeType });
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const completedPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType }));
        };
      });

      vid.pause();
      vid.currentTime = trimStart;
      vid.muted = muteVideoAudio;
      vid.playbackRate = playbackSpeed;

      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          vid.removeEventListener('seeked', onSeeked);
          resolve();
        };
        vid.addEventListener('seeked', onSeeked);
      });

      recorder.start(200);
      await vid.play();

      let stopped = false;
      const drawLoop = () => {
        if (stopped) return;
        ctx.save();
        ctx.filter = activeVideoFilterCss;
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        if (videoTitleOverlay.trim()) {
          const fontSize = Math.max(18, Math.round(canvas.height * 0.065));
          ctx.save();
          ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(0, canvas.height - fontSize - 22, canvas.width, fontSize + 22);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(videoTitleOverlay.trim(), canvas.width / 2, canvas.height - 10);
          ctx.restore();
        }

        const span = Math.max(0.1, endSec - trimStart);
        const pct = Math.min(99, Math.max(1, Math.round(((vid.currentTime - trimStart) / span) * 100)));
        setExportProgress(pct);

        if (vid.currentTime >= endSec || vid.ended) {
          stopped = true;
          vid.pause();
          if (recorder.state !== 'inactive') recorder.stop();
          return;
        }
        requestAnimationFrame(drawLoop);
      };
      requestAnimationFrame(drawLoop);

      const blob = await completedPromise;
      if (exportedVideoUrl) URL.revokeObjectURL(exportedVideoUrl);
      const outUrl = URL.createObjectURL(blob);
      setExportedVideoUrl(outUrl);
      setExportProgress(100);
    } catch (err: any) {
      setVideoError(err?.message || 'Could not export edited video.');
    } finally {
      setIsExportingVideo(false);
    }
  };

  // =================== OFFICE WORK HANDLERS ===================
  const handleRunOfficeAssistant = async () => {
    const clean = officePrompt.trim();
    if (!clean || isRunningOffice) return;
    setIsRunningOffice(true);
    const taskMap: Record<string, string> = {
      email: 'Draft a clear, polished professional business email',
      mom: 'Structure clean Meeting Minutes (Attendees summary, Key Decisions, Action Items with Owners)',
      excel: 'Provide the exact Excel / Google Sheets formula with step-by-step usage example',
      proposal: 'Write a structured executive project proposal / SOP document',
      translate: 'Provide an accurate, natural professional translation',
    };
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            message: `[OFFICE WORK ASSISTANT] Task: ${taskMap[officeTaskType]}. Output language: ${msgLang}. User request:\n${clean}`,
            language: msgLang,
            loveMode: false,
            romanceIntensity: 'calm',
            emotionMode: 'calm',
            voiceName: config.voiceName,
            userNickname: isOwnerVerified ? config.userNickname : 'Friend',
            skipServerTts: true,
            brainMode: config.brainMode || 'auto',
          }),
        },
        { maxWakeRetries: 1 }
      );
      if (res.ok) {
        const data = await res.json();
        setOfficeOutput(data.text || '');
      } else {
        setOfficeOutput('Unable to reach AI office engine. Check connection and retry.');
      }
    } catch {
      setOfficeOutput('Network unavailable — check internet connection.');
    } finally {
      setIsRunningOffice(false);
    }
  };

  const handleDownloadOfficeDoc = () => {
    if (!officeOutput.trim()) return;
    const blob = new Blob([officeOutput], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zara-office-${officeTaskType}-${Date.now()}.md`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // =================== PC & DEV AI TOOLS HANDLERS ===================
  const handleRunPcAssistant = async () => {
    const clean = pcPrompt.trim();
    if (!clean || isRunningPcAi) return;
    setIsRunningPcAi(true);
    const kindLabel: Record<string, string> = {
      code: 'Software Code / Debugging (Python, TypeScript, JS, React)',
      powershell: 'Windows PowerShell / PC Automation Command',
      bash: 'Linux Bash / Terminal / Docker Command',
      sql: 'PostgreSQL / SQL Query & Schema Optimization',
    };
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            message: `[PC & DEVELOPER ASSISTANT — ${kindLabel[pcCategory]}] Provide accurate, ready-to-run commands or clean code with concise explanation:\n${clean}`,
            language: msgLang,
            loveMode: false,
            romanceIntensity: 'calm',
            emotionMode: 'calm',
            voiceName: config.voiceName,
            userNickname: isOwnerVerified ? config.userNickname : 'Friend',
            skipServerTts: true,
            brainMode: config.brainMode || 'auto',
          }),
        },
        { maxWakeRetries: 1 }
      );
      if (res.ok) {
        const data = await res.json();
        setPcAiOutput(data.text || '');
      } else {
        setPcAiOutput('Could not reach AI developer engine.');
      }
    } catch {
      setPcAiOutput('Network unavailable right now.');
    } finally {
      setIsRunningPcAi(false);
    }
  };

  const handleFormatJson = (minify: boolean) => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonResult(JSON.stringify(parsed, null, minify ? 0 : 2));
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e?.message || 'Invalid JSON syntax');
      setJsonResult('');
    }
  };

  const regexEval = React.useMemo(() => {
    if (!regexPattern) return { matches: [] as string[], error: null as string | null };
    try {
      const safeFlags = regexFlags.includes('g') ? regexFlags : `${regexFlags}g`;
      const re = new RegExp(regexPattern, safeFlags);
      const found = Array.from(regexSample.matchAll(re)).map((m) => m[0]);
      return { matches: found, error: null };
    } catch (e: any) {
      return { matches: [] as string[], error: e?.message || 'Invalid Regular Expression' };
    }
  }, [regexPattern, regexFlags, regexSample]);

  const handleWebCryptoTransform = async (mode: 'sha256' | 'sha512' | 'b64enc' | 'b64dec' | 'urlenc' | 'urldec') => {
    try {
      if (mode === 'sha256' || mode === 'sha512') {
        const data = new TextEncoder().encode(cryptoInput);
        const digest = await crypto.subtle.digest(mode === 'sha256' ? 'SHA-256' : 'SHA-512', data);
        const hex = Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        setCryptoOutput(hex);
      } else if (mode === 'b64enc') {
        setCryptoOutput(btoa(unescape(encodeURIComponent(cryptoInput))));
      } else if (mode === 'b64dec') {
        setCryptoOutput(decodeURIComponent(escape(atob(cryptoInput.trim()))));
      } else if (mode === 'urlenc') {
        setCryptoOutput(encodeURIComponent(cryptoInput));
      } else {
        setCryptoOutput(decodeURIComponent(cryptoInput));
      }
    } catch (e: any) {
      setCryptoOutput(`Error: ${e?.message || 'Transform failed'}`);
    }
  };

  // =================== ETHICAL SECURITY LAB HANDLERS ===================
  const handleInspectSecurityHeaders = async () => {
    const clean = secTargetDomain.trim();
    if (!clean || isInspectingHeaders) return;
    setIsInspectingHeaders(true);
    setSecNetError(null);
    try {
      const res = await fetch('/api/security/inspect-headers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Header audit failed');
      setHeaderAuditResult(data);
    } catch (e: any) {
      setSecNetError(e?.message || 'Header inspection error');
    } finally {
      setIsInspectingHeaders(false);
    }
  };

  const handleDnsLookup = async () => {
    const clean = secTargetDomain.trim();
    if (!clean || isRunningDns) return;
    setIsRunningDns(true);
    setSecNetError(null);
    try {
      const res = await fetch('/api/security/dns-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'DNS query failed');
      setDnsResult(data);
    } catch (e: any) {
      setSecNetError(e?.message || 'DNS lookup failed');
    } finally {
      setIsRunningDns(false);
    }
  };

  const passwordMetrics = React.useMemo(() => {
    if (!pwdTestInput) return null;
    let pool = 0;
    const hasLower = /[a-z]/.test(pwdTestInput);
    const hasUpper = /[A-Z]/.test(pwdTestInput);
    const hasDigit = /\d/.test(pwdTestInput);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pwdTestInput);
    if (hasLower) pool += 26;
    if (hasUpper) pool += 26;
    if (hasDigit) pool += 10;
    if (hasSymbol) pool += 32;
    const entropy = pool > 0 ? Math.round(pwdTestInput.length * Math.log2(pool)) : 0;
    const strength =
      entropy >= 80 ? 'Very Strong' : entropy >= 60 ? 'Strong' : entropy >= 40 ? 'Moderate' : 'Weak';
    return { entropy, strength, hasLower, hasUpper, hasDigit, hasSymbol, length: pwdTestInput.length };
  }, [pwdTestInput]);

  const handleGenerateStrongPassword = () => {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_+=';
    const arr = new Uint32Array(20);
    crypto.getRandomValues(arr);
    const pwd = Array.from(arr, (n) => charset[n % charset.length]).join('');
    setPwdTestInput(pwd);
  };

  const jwtDecoded = React.useMemo(() => {
    const raw = jwtInput.trim();
    if (!raw) return null;
    const parts = raw.split('.');
    if (parts.length < 2) return { error: 'JWT must have header.payload[.signature] segments' };
    try {
      const decodeB64Url = (s: string) => {
        const norm = s.replace(/-/g, '+').replace(/_/g, '/');
        const padded = norm + '='.repeat((4 - (norm.length % 4)) % 4);
        return JSON.parse(decodeURIComponent(escape(atob(padded))));
      };
      const header = decodeB64Url(parts[0]);
      const payload = decodeB64Url(parts[1]);
      const expMs = typeof payload.exp === 'number' ? payload.exp * 1000 : null;
      return {
        header,
        payload,
        algWarning: String(header.alg || '').toLowerCase() === 'none',
        expired: expMs ? Date.now() > expMs : false,
        expiresAt: expMs ? new Date(expMs).toISOString() : null,
      };
    } catch {
      return { error: 'Invalid Base64URL or JSON in token' };
    }
  }, [jwtInput]);

  const cidrResult = React.useMemo(() => {
    const match = cidrInput.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
    if (!match) return null;
    const octets = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
    const prefix = Number(match[5]);
    if (octets.some((o) => o < 0 || o > 255) || prefix < 0 || prefix > 32) return null;
    const ipInt = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
    const maskInt = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const netInt = (ipInt & maskInt) >>> 0;
    const bcastInt = (netInt | (~maskInt >>> 0)) >>> 0;
    const toIp = (v: number) =>
      `${(v >>> 24) & 255}.${(v >>> 16) & 255}.${(v >>> 8) & 255}.${v & 255}`;
    const total = Math.pow(2, 32 - prefix);
    const usable = prefix >= 31 ? (prefix === 32 ? 1 : 2) : Math.max(0, total - 2);
    return {
      network: toIp(netInt),
      broadcast: toIp(bcastInt),
      mask: toIp(maskInt),
      wildcard: toIp(~maskInt >>> 0),
      firstHost: prefix >= 31 ? toIp(netInt) : toIp(netInt + 1),
      lastHost: prefix >= 31 ? toIp(bcastInt) : toIp(bcastInt - 1),
      usable,
    };
  }, [cidrInput]);

  const handleRunSecurityAi = async () => {
    const clean = secAiQuery.trim();
    if (!clean || isRunningSecAi) return;
    setIsRunningSecAi(true);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            message: `[AUTHORIZED ETHICAL CYBERSECURITY & DEFENSIVE HARDENING ADVISOR] Assist with defensive security auditing, OWASP hardening, network diagnostics (Nmap/Wireshark educational syntax), or server firewall best practices strictly for authorized testing:\n${clean}`,
            language: msgLang,
            loveMode: false,
            romanceIntensity: 'calm',
            emotionMode: 'calm',
            voiceName: config.voiceName,
            userNickname: isOwnerVerified ? config.userNickname : 'Friend',
            skipServerTts: true,
            brainMode: config.brainMode || 'auto',
          }),
        },
        { maxWakeRetries: 1 }
      );
      if (res.ok) {
        const data = await res.json();
        setSecAiOutput(data.text || '');
      } else {
        setSecAiOutput('Security AI assistant unavailable right now.');
      }
    } catch {
      setSecAiOutput('Network offline — local security utilities above continue working offline.');
    } finally {
      setIsRunningSecAi(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-4xl max-h-[94vh] bg-[#070b14] border border-sky-500/30 rounded-3xl shadow-[0_24px_80px_rgba(2,132,199,0.28)] flex flex-col overflow-hidden text-slate-100">
        {/* Clean Studio Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-slate-950/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                Zara Professional AI Workspace
              </h2>
              <p className="text-[11px] text-slate-400">
                Office Work · PC Dev Tools · Ethical Security · Voice, Photo &amp; Video
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
            aria-label="Close AI Studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Tool Professional Navigation Bar */}
        <div className="flex flex-wrap gap-1.5 px-4 sm:px-6 py-3 border-b border-white/10 bg-slate-950/60">
          {[
            { id: 'brains' as AiStudioTab, label: 'AI Brains', icon: Cpu },
            { id: 'research' as AiStudioTab, label: 'Live Web & AIs', icon: Globe },
            { id: 'social' as AiStudioTab, label: 'Social Hub (8)', icon: Share2 },
            { id: 'devlab' as AiStudioTab, label: 'App Builder & APIs', icon: Code2 },
            { id: 'audit' as AiStudioTab, label: 'Self Audit', icon: Activity },
            { id: 'office' as AiStudioTab, label: 'Office Work', icon: Briefcase },
            { id: 'pctools' as AiStudioTab, label: 'PC & Dev', icon: Terminal },
            { id: 'security' as AiStudioTab, label: 'Security Lab', icon: ShieldAlert },
            { id: 'messages' as AiStudioTab, label: 'Voice / Text', icon: MessageSquareText },
            { id: 'photo' as AiStudioTab, label: 'Photo & Gen', icon: ImageIcon },
            { id: 'video' as AiStudioTab, label: 'Video & AI', icon: Film },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                  active
                    ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                    : 'bg-slate-900/90 text-slate-300 border-white/10 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Studio Workspace Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ================= TAB 0: AI BRAIN & HUNTER VOICE ORCHESTRATOR ================= */}
          {activeTab === 'brains' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/85 border border-sky-500/35 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-sky-400" />
                      <span>Zara Multi-Brain &amp; Hunter Voice Orchestrator (11 Systems)</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Real multi-model routing with automatic fallback across English, Urdu, Hindi &amp; Punjabi.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={testingEngineId !== null}
                      onClick={async () => {
                        setTestingEngineId('fallback');
                        setFallbackVerifyNote(null);
                        const fb = await testAiFallbackRouting();
                        setFallbackVerifyNote(
                          fb.ok
                            ? `Fallback verified ✓ Requested "${fb.selectedBrain}" → auto-routed cleanly to "${fb.actualBrainUsed}" (${fb.providerUsed} · ${fb.modelIdUsed}) in ${fb.latencyMs}ms.`
                            : 'Fallback test failed.'
                        );
                        setTestingEngineId(null);
                        loadOrchestratorSnapshot();
                      }}
                      className="min-h-[38px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-amber-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>{testingEngineId === 'fallback' ? 'Testing...' : 'Verify Fallback'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={testingEngineId !== null}
                      onClick={async () => {
                        setTestingEngineId('all');
                        const res = await testAllAiOrchestratorSystems();
                        const map: Record<string, AiOrchestratorTestResult> = {};
                        for (const r of res.results) map[r.id] = r;
                        setOrchTestResults(map);
                        if (res.snapshot) setOrchSnapshot(res.snapshot);
                        setTestingEngineId(null);
                      }}
                      className="min-h-[38px] px-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {testingEngineId === 'all' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      <span>{testingEngineId === 'all' ? 'Testing All 11...' : 'Run Live Test (All 11)'}</span>
                    </button>
                  </div>
                </div>

                {/* Primary Brain + Hunter TTS Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-slate-950/90 border border-white/10 space-y-1.5">
                    <label className="text-[11px] font-bold text-sky-300 block">
                      Primary AI Brain Selection
                    </label>
                    <select
                      value={config.brainMode || orchSnapshot?.primaryBrainMode || 'auto'}
                      onChange={async (e) => {
                        const mode = e.target.value as AiBrainEngineId;
                        onUpdateConfig({ brainMode: mode });
                        const upd = await updateAiOrchestratorConfig({ primaryBrainMode: mode });
                        if (upd.snapshot) setOrchSnapshot(upd.snapshot);
                      }}
                      className="w-full min-h-[40px] px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white"
                    >
                      {BRAIN_ENGINE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label} — {opt.shortDesc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/90 border border-white/10 space-y-1.5">
                    <label className="text-[11px] font-bold text-emerald-300 block">
                      Voice Synthesis &amp; Recognition
                    </label>
                    <select
                      value={config.ttsEngine || orchSnapshot?.ttsEngine || 'hunter_tts_ultra_premium'}
                      onChange={async (e) => {
                        const tts = e.target.value as TtsEngineId;
                        onUpdateConfig({ ttsEngine: tts });
                        audioService.setPreferredTtsEngine(tts);
                        const upd = await updateAiOrchestratorConfig({ ttsEngine: tts });
                        if (upd.snapshot) setOrchSnapshot(upd.snapshot);
                      }}
                      className="w-full min-h-[40px] px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white"
                    >
                      {TTS_ENGINE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] text-emerald-300 flex items-center gap-1 pt-0.5">
                      <Mic className="w-3 h-3" />
                      <span>Active STT: Hunter STT Beta (EN / UR / HI / PA)</span>
                    </div>
                  </div>
                </div>

                {fallbackVerifyNote && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-100">
                    {fallbackVerifyNote}
                  </div>
                )}
              </div>

              {/* All 11 Systems Live Matrix */}
              {orchLoading && !orchSnapshot ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading live AI orchestrator status...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(orchSnapshot?.systems || []).map((sys) => {
                    const testRes = orchTestResults[sys.id];
                    const enabled =
                      config.enabledAiEngines?.[sys.id] ?? sys.enabled;
                    return (
                      <div
                        key={sys.id}
                        className="p-3.5 rounded-2xl bg-slate-900/85 border border-white/10 flex flex-col justify-between gap-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-bold text-white">{sys.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-semibold uppercase">
                                {sys.role}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                  sys.configured
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-amber-500/20 text-amber-200'
                                }`}
                              >
                                {sys.configured ? 'Live Ready' : `Needs ${sys.requiresExternalKey || 'Key'}`}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                              {sys.description}
                            </p>
                            <div className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                              Provider: {sys.provider} · Model: {sys.modelId}
                              {sys.lastLatencyMs !== undefined ? ` · ${sys.lastLatencyMs}ms` : ''}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              const nextVal = !enabled;
                              const nextMap = { ...(config.enabledAiEngines || {}), [sys.id]: nextVal };
                              onUpdateConfig({ enabledAiEngines: nextMap });
                              const upd = await updateAiOrchestratorConfig({
                                enabledEngines: { [sys.id]: nextVal },
                              });
                              if (upd.snapshot) setOrchSnapshot(upd.snapshot);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer ${
                              enabled
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {enabled ? 'ON' : 'OFF'}
                          </button>
                        </div>

                        {testRes && (
                          <div
                            className={`p-2 rounded-xl text-[11px] border ${
                              testRes.ok
                                ? 'bg-emerald-950/45 border-emerald-500/35 text-emerald-100'
                                : testRes.status === 'unconfigured'
                                ? 'bg-amber-950/40 border-amber-500/35 text-amber-100'
                                : 'bg-rose-950/45 border-rose-500/35 text-rose-100'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-semibold">
                              {testRes.ok ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                              <span>
                                {testRes.status === 'passed'
                                  ? `Passed (${testRes.latencyMs}ms)`
                                  : testRes.status === 'unconfigured'
                                  ? 'Key Not Configured (Fallback Active)'
                                  : testRes.status === 'fallback_passed'
                                  ? `Fallback Passed (${testRes.latencyMs}ms)`
                                  : 'Failed'}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[10px] opacity-90">{testRes.detail}</div>
                            {testRes.sampleOutput && (
                              <div className="mt-1 text-[10px] text-white/90 italic">
                                “{testRes.sampleOutput}”
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[10px] text-slate-400">
                            Calls: {sys.totalCalls} · Fallbacks: {sys.totalFallbacks}
                          </span>
                          <button
                            type="button"
                            disabled={testingEngineId !== null}
                            onClick={async () => {
                              setTestingEngineId(sys.id);
                              const res = await testAiOrchestratorEngine(sys.id as AllAiSystemId);
                              if (res.result) {
                                setOrchTestResults((prev) => ({
                                  ...prev,
                                  [sys.id]: res.result!,
                                }));
                              }
                              if (res.snapshot) setOrchSnapshot(res.snapshot);
                              setTestingEngineId(null);
                            }}
                            className="min-h-[32px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-[11px] font-semibold text-sky-300 cursor-pointer"
                          >
                            {testingEngineId === sys.id ? 'Testing...' : 'Live Test'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB: LIVE INTERNET RESEARCH & 6 AI ASSISTANTS ================= */}
          {activeTab === 'research' && (
            <div className="space-y-4">
              {/* 6 Specialized AI Assistants Quick Switcher */}
              <div className="p-4 rounded-2xl bg-slate-900/85 border border-pink-500/35 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-pink-400" />
                      <span>Six Specialized AI Assistants (AI-to-AI Switching)</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Each assistant has its own personality, context, and voice. Simulated AI personas — never real humans.
                    </p>
                  </div>
                  {(config.activeAssistantId || 'zara') !== 'zara' && (
                    <button
                      type="button"
                      onClick={() => onUpdateConfig({ activeAssistantId: 'zara' })}
                      className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold cursor-pointer"
                    >
                      Disconnect · Back to Zara
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {ZARA_AI_ASSISTANTS.map((a) => {
                    const active = (config.activeAssistantId || 'zara') === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => onUpdateConfig({ activeAssistantId: a.id })}
                        className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-pink-600/25 border-pink-400 text-white'
                            : 'bg-slate-950 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold">{a.name}</span>
                          {active && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[9px] font-extrabold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-cyan-300 mt-0.5">{a.tagline}</div>
                        <div className="text-[10px] text-slate-400 mt-1 leading-snug">{a.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real-Time Google Search & Verified Citations */}
              <div className="p-4 rounded-2xl bg-slate-900/85 border border-cyan-500/35 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-cyan-400" />
                      <span>Real-Time Internet Search, News &amp; Global Research</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Live Google Search grounding with verified citations for Pakistan, Malaysia, Politics, Tech, Sports &amp; World News.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Pakistan News', q: 'Latest breaking Pakistan news today' },
                    { label: 'Malaysia News', q: 'Latest breaking Malaysia news today' },
                    { label: 'World Politics', q: 'Top global politics headlines today' },
                    { label: 'Tech & AI', q: 'Latest artificial intelligence and technology news today' },
                    { label: 'Sports', q: 'Latest international cricket and football sports results today' },
                    { label: 'Business', q: 'Global business markets USD MYR PKR exchange news today' },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleRunResearchSearch(chip.q)}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-cyan-500/30 text-[11px] font-semibold text-cyan-200 cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={researchQuery}
                    onChange={(e) => setResearchQuery(e.target.value)}
                    placeholder="Ask anything requiring live web facts or news..."
                    className="flex-1 min-w-[200px] min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    disabled={isSearchingResearch}
                    onClick={() => handleRunResearchSearch()}
                    className="min-h-[42px] px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSearchingResearch ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>Search Live Web</span>
                  </button>
                </div>

                {researchResult && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-3">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={researchResult.grounded ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>
                        {researchResult.grounded
                          ? `Verified Live Search (${researchResult.modelIdUsed})`
                          : researchResult.note || 'Fallback Answer (Web Search Offline)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                      {researchResult.text}
                    </p>
                    {researchResult.sources?.length > 0 && (
                      <div className="pt-2 border-t border-white/10 space-y-1">
                        <div className="text-[10px] font-bold text-cyan-300">Verified Sources:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {researchResult.sources.map((s, idx) => (
                            <a
                              key={idx}
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-[11px] text-cyan-200"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[200px]">{s.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB: SOCIAL MEDIA ACCOUNT MANAGEMENT HUB ================= */}
          {activeTab === 'social' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/85 border border-pink-500/35 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-pink-400" />
                      <span>Authorized Social Media Management (Drafts &amp; Owner-Confirmed Publishing)</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Uses official OAuth tokens in server environment variables — Zara never asks for or stores social passwords.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadSocialState}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {socialStatuses.map((st) => (
                    <div
                      key={st.platform}
                      className="p-2.5 rounded-xl bg-slate-950 border border-white/10 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{st.name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            st.connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200'
                          }`}
                        >
                          {st.connected ? 'Connected' : 'Token Unset'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 leading-snug">{st.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Draft Generator */}
              <div className="p-4 rounded-2xl bg-slate-900/85 border border-white/10 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'whatsapp', label: 'WhatsApp' },
                      { id: 'telegram', label: 'Telegram' },
                      { id: 'instagram', label: 'Instagram' },
                      { id: 'facebook', label: 'Facebook' },
                      { id: 'youtube', label: 'YouTube' },
                      { id: 'tiktok', label: 'TikTok' },
                      { id: 'snapchat', label: 'Snapchat' },
                      { id: 'twitter', label: 'X (Twitter)' },
                    ] as Array<{ id: SocialPlatformId; label: string }>
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSocialPlatform(p.id)}
                      className={`min-h-[34px] px-3 rounded-lg text-xs font-bold border cursor-pointer ${
                        socialPlatform === p.id
                          ? 'bg-pink-500 text-white border-pink-400'
                          : 'bg-slate-950 border-white/10 text-slate-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={socialTopic}
                  onChange={(e) => setSocialTopic(e.target.value)}
                  placeholder="Topic for AI caption generation (e.g. Morning workout motivation in Urdu/English)..."
                  className="w-full min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
                />
                <textarea
                  rows={3}
                  value={socialCaption}
                  onChange={(e) => setSocialCaption(e.target.value)}
                  placeholder="Or write/edit caption directly before saving draft..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
                />
                <button
                  type="button"
                  disabled={socialBusy}
                  onClick={handleCreateSocialDraft}
                  className="min-h-[40px] px-4 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{socialCaption.trim() ? 'Save Draft' : 'Generate AI Caption Draft'}</span>
                </button>

                {socialNotice && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-pink-500/35 text-xs text-pink-200">
                    {socialNotice}
                  </div>
                )}
              </div>

              {confirmPublishDraft && (
                <div className="p-3.5 rounded-2xl bg-rose-950/90 border border-rose-400 space-y-2">
                  <div className="flex items-start gap-2 text-xs text-rose-100">
                    <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                    <span>
                      Confirm publishing to <strong>{confirmPublishDraft.platform.toUpperCase()}</strong>? Nothing is ever posted without your explicit confirmation.
                    </span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmPublishDraft(null)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={socialBusy}
                      onClick={() => handleConfirmPublishSocial(confirmPublishDraft)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer"
                    >
                      Confirm &amp; Publish
                    </button>
                  </div>
                </div>
              )}

              {/* Saved Drafts */}
              <div className="space-y-2">
                {socialDrafts.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-pink-300 uppercase">
                        {d.platform} · {d.status}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isOwnerVerified && d.status !== 'published' && (
                          <button
                            type="button"
                            onClick={() => setConfirmPublishDraft(d)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Approve &amp; Post</span>
                          </button>
                        )}
                        {confirmDeleteDraftId === d.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteSocialDraft(d.id)}
                              className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteDraftId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteDraftId(d.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                            title="Delete draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {d.title && <div className="text-[11px] font-bold text-white">{d.title}</div>}
                    <p className="text-xs text-slate-200 whitespace-pre-wrap">{d.content}</p>
                    {d.publishResult && (
                      <div className="text-[10px] text-amber-200 font-mono">{d.publishResult}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB: UNIFIED AI APP BUILDER, API CREATOR, KEY VAULT & TASK ENGINE ================= */}
          {activeTab === 'devlab' && (
            <UnifiedAppBuilderPanel
              isOwnerVerified={isOwnerVerified}
              language={msgLang}
              onSyncExternalProjectId={(pid) => setActiveDevProjectId(pid)}
            />
          )}

          {/* ================= TAB: SELF-IMPROVEMENT SYSTEM AUDIT ================= */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              {/* Live What's New & Autonomous Self-Update Card */}
              <div className="p-4 rounded-2xl bg-[#150e26] border border-fuchsia-500/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-fuchsia-400" />
                      <span>
                        Zara What&apos;s New &amp; Autonomous Self-Updater
                        {updateReport ? ` · v${updateReport.currentVersion}` : ''}
                      </span>
                    </h3>
                    <p className="text-[11px] text-fuchsia-200/90 mt-0.5">
                      ज़ारा खुद अपना ऐप चेक करती है, नई अपडेट बताती है और सुरक्षित लाइव अपडेट खुद लगाती है (कभी बिना परमिशन फाइलें या चैट डिलीट नहीं करती)।
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isRunningAudit || isUpdatingSelf}
                      onClick={async () => {
                        await runSelfAudit();
                        const rep = await zaraSelfHealEngine.fetchUpdateCheckReport();
                        if (rep) {
                          setUpdateReport(rep);
                          audioService.unlock();
                          await audioService.speakText(rep.spokenReportHi, {
                            language: msgLang,
                            rate: config.voiceSpeed,
                            voiceName: config.voiceName || 'Zephyr',
                          });
                        }
                      }}
                      className="min-h-[36px] px-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-fuchsia-400/40 text-fuchsia-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Check &amp; Speak Updates</span>
                    </button>
                    <button
                      type="button"
                      disabled={isUpdatingSelf}
                      onClick={async () => {
                        setIsUpdatingSelf(true);
                        audioService.unlock();
                        try {
                          const res = await zaraSelfHealEngine.runFullAutonomousSelfUpdate();
                          if (res.report) setUpdateReport(res.report);
                          setAutoUpdateLog(res.spokenSummaryHi);
                          await audioService.speakText(res.spokenSummaryHi, {
                            language: msgLang,
                            rate: config.voiceSpeed,
                            voiceName: config.voiceName || 'Zephyr',
                          });
                        } finally {
                          setIsUpdatingSelf(false);
                        }
                      }}
                      className="min-h-[36px] px-3.5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingSelf ? 'animate-spin' : ''}`} />
                      <span>{isUpdatingSelf ? 'Auto-Updating...' : 'Auto-Update Zara Now'}</span>
                    </button>
                  </div>
                </div>

                {autoUpdateLog && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/35 text-[11px] text-emerald-200">
                    {autoUpdateLog}
                  </div>
                )}

                {updateReport && (
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold text-fuchsia-300">
                      मेरे अंदर ये नई अपडेट आई है (v{updateReport.currentVersion} · Health {updateReport.healthScore}%):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {updateReport.whatsNewInZara.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-slate-950 border border-white/10 space-y-1"
                        >
                          <div className="text-xs font-bold text-white">{item.title}</div>
                          <div className="text-[10px] text-slate-300">{item.summaryHi}</div>
                        </div>
                      ))}
                    </div>

                    {(updateReport.pendingRuntimeUpdates.length > 0 ||
                      updateReport.appliedRuntimeUpdates.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {updateReport.pendingRuntimeUpdates.map((p) => (
                          <span
                            key={p.id}
                            className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-bold"
                          >
                            Pending Runtime: {p.title}
                          </span>
                        ))}
                        {updateReport.appliedRuntimeUpdates.map((p) => (
                          <span
                            key={p.id}
                            className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold"
                          >
                            ✓ {p.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/85 border border-amber-500/35 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" />
                      <span>Zara Self-Improvement &amp; Health Audit</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Detects missing Secrets keys, Android build steps, and safe runtime self-optimizations honestly.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isRunningAudit}
                    onClick={runSelfAudit}
                    className="min-h-[38px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunningAudit ? 'animate-spin' : ''}`} />
                    <span>Re-Run Audit</span>
                  </button>
                </div>

                {auditReport && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-amber-400/35 flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Overall System Readiness</span>
                      <span className="text-lg font-black text-emerald-400 font-mono">{auditReport.overallScore}%</span>
                    </div>

                    <div className="space-y-1.5">
                      {auditReport.capabilities.map((cap) => (
                        <div
                          key={cap.id}
                          className="p-2.5 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white">{cap.name}</div>
                            <div className="text-[10px] text-slate-400">{cap.detail}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              cap.status === 'working'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : cap.status === 'partial'
                                ? 'bg-sky-500/20 text-sky-300'
                                : 'bg-amber-500/20 text-amber-200'
                            }`}
                          >
                            {cap.status === 'working'
                              ? 'Working'
                              : cap.status === 'partial'
                              ? 'Partial'
                              : 'Needs Key/OS'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {auditReport.recommendedUpgrades?.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="text-xs font-bold text-amber-300">Recommended Upgrades (Approve to Send to Chat):</div>
                        {auditReport.recommendedUpgrades.map((up) => (
                          <div
                            key={up.id}
                            className="p-3 rounded-xl bg-slate-950 border border-amber-500/25 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white">{up.title}</div>
                              <div className="text-[10px] text-slate-400">{up.reason}</div>
                            </div>
                            {onSendToChat && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSendToChat(up.suggestedPrompt);
                                  onClose();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-sky-500 text-slate-950 text-[10px] font-bold shrink-0 cursor-pointer"
                              >
                                Ask Zara
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB A: OFFICE WORK SUITE ================= */}
          {activeTab === 'office' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-sky-400" />
                    <span>Office Document, Email, Excel &amp; Meeting Assistant</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'email', label: 'Email' },
                        { id: 'mom', label: 'Meeting Notes' },
                        { id: 'excel', label: 'Excel Formula' },
                        { id: 'proposal', label: 'Proposal' },
                        { id: 'translate', label: 'Translate' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setOfficeTaskType(t.id)}
                        className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                          officeTaskType === t.id
                            ? 'bg-sky-500 text-slate-950 border-sky-400'
                            : 'bg-slate-950 border-white/10 text-slate-300'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={officePrompt}
                  onChange={(e) => setOfficePrompt(e.target.value)}
                  placeholder="Describe your office task (e.g., Write an official leave / client follow-up email, convert meeting notes into action items, or write an Excel XLOOKUP formula)..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!officePrompt.trim() || isRunningOffice}
                    onClick={handleRunOfficeAssistant}
                    className="min-h-[44px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-45 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                  >
                    {isRunningOffice ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    <span>Generate Office Document</span>
                  </button>
                  {officeOutput.trim() && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(officeOutput).catch(() => {});
                          setCopiedOffice(true);
                          window.setTimeout(() => setCopiedOffice(false), 1600);
                        }}
                        className="min-h-[44px] px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedOffice ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedOffice ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadOfficeDoc}
                        className="min-h-[44px] px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export .md</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          audioService.unlock();
                          audioService.speakText(officeOutput.slice(0, 800), {
                            language: msgLang,
                            voiceName: config.voiceName,
                          });
                        }}
                        className="min-h-[44px] px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-sky-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>Read Aloud</span>
                      </button>
                    </>
                  )}
                </div>

                {officeOutput && (
                  <textarea
                    rows={10}
                    value={officeOutput}
                    onChange={(e) => setOfficeOutput(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-slate-950 border border-sky-500/30 text-xs sm:text-sm text-slate-100 leading-relaxed font-sans"
                  />
                )}
              </div>
            </div>
          )}

          {/* ================= TAB B: PC & DEVELOPER AI TOOLS ================= */}
          {activeTab === 'pctools' && (
            <div className="space-y-4">
              {/* Authorized Computer Control (PC Companion Bridge) */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-sky-500/35 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white">
                      Authorized Computer Control (PC Companion Bridge)
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      pcStatus.connected
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-950 border-white/15 text-slate-300'
                    }`}
                  >
                    {pcStatus.connected
                      ? `Connected · ${pcStatus.hostname} (${pcStatus.platform})`
                      : 'Companion Offline'}
                  </span>
                </div>

                {!isOwnerVerified ? (
                  <p className="text-xs text-amber-300">
                    Sign in with Verified Owner Google Account in Settings to pair and control your
                    personal computer.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Run the signed Node.js companion script (<code className="text-sky-300">zara-pc-agent.mjs</code>)
                      on your Windows, macOS, or Linux PC inside an authorized folder. All commands
                      report honest execution status.
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await downloadPcCompanionAgentScript();
                          setPcBridgeLog(
                            res.ok
                              ? 'Downloaded zara-pc-agent.mjs. Run in terminal: node zara-pc-agent.mjs --root "$HOME/Documents"'
                              : res.error || 'Download failed.'
                          );
                        }}
                        className="min-h-[38px] px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PC Agent</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const st = await fetchPcCompanionStatus();
                          setPcStatus(st);
                          setPcBridgeLog(
                            st.connected
                              ? `Connected to ${st.hostname} (${st.platform}/${st.arch}) · Authorized Root: ${st.authorizedRoot}`
                              : st.error || 'PC Companion Agent is currently offline.'
                          );
                        }}
                        className="min-h-[38px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                        <span>Refresh Status</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const res = await rotatePcPairingToken();
                          setPcBridgeLog(
                            res.ok
                              ? 'Pairing token rotated. Download a fresh zara-pc-agent.mjs before reconnecting.'
                              : res.error || 'Failed to rotate token.'
                          );
                          fetchPcCompanionStatus().then(setPcStatus).catch(() => {});
                        }}
                        className="min-h-[38px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-amber-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Rotate Token</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={isRunningPcCmd}
                        onClick={async () => {
                          setIsRunningPcCmd(true);
                          const r = await executeAuthorizedPcCommand('system_info');
                          setPcBridgeLog(r.ok ? r.output || 'OK' : `Failed: ${r.error}`);
                          setIsRunningPcCmd(false);
                        }}
                        className="min-h-[36px] px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/15 text-xs font-semibold text-slate-200 cursor-pointer"
                      >
                        PC System Info
                      </button>
                      <button
                        type="button"
                        disabled={isRunningPcCmd}
                        onClick={async () => {
                          setIsRunningPcCmd(true);
                          const r = await executeAuthorizedPcCommand('list_dir', { subpath: '' });
                          setPcBridgeLog(r.ok ? r.output || '(empty)' : `Failed: ${r.error}`);
                          setIsRunningPcCmd(false);
                        }}
                        className="min-h-[36px] px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/15 text-xs font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                        <span>List Authorized Folder</span>
                      </button>
                      <button
                        type="button"
                        disabled={isRunningPcCmd}
                        onClick={async () => {
                          setIsRunningPcCmd(true);
                          const r = await executeAuthorizedPcCommand('open_url', {
                            url: 'https://www.google.com',
                          });
                          setPcBridgeLog(r.ok ? r.output || 'Opened URL on PC.' : `Failed: ${r.error}`);
                          setIsRunningPcCmd(false);
                        }}
                        className="min-h-[36px] px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/15 text-xs font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Open Browser</span>
                      </button>
                      <button
                        type="button"
                        disabled={isRunningPcCmd}
                        onClick={() => setConfirmLockPc(true)}
                        className="min-h-[36px] px-3 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-xs font-semibold text-rose-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Lock PC</span>
                      </button>
                    </div>

                    {confirmLockPc && (
                      <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-400/70 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-100">
                        <span>Confirm locking your connected computer screen now?</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmLockPc(false)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/15 text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setConfirmLockPc(false);
                              setIsRunningPcCmd(true);
                              const r = await executeAuthorizedPcCommand('lock_screen', {}, true);
                              setPcBridgeLog(
                                r.ok ? 'Computer screen locked.' : `Failed: ${r.error}`
                              );
                              setIsRunningPcCmd(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 font-bold text-white cursor-pointer"
                          >
                            Confirm Lock PC
                          </button>
                        </div>
                      </div>
                    )}

                    {pcBridgeLog && (
                      <pre className="p-3 rounded-xl bg-slate-950 border border-white/10 text-[11px] text-slate-200 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                        {pcBridgeLog}
                      </pre>
                    )}
                  </>
                )}
              </div>

              {/* AI Code / Terminal Assistant */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>PC Code, Terminal (PowerShell / Bash) &amp; SQL Assistant</span>
                  </span>
                  <div className="flex gap-1.5">
                    {(
                      [
                        { id: 'code', label: 'Code / Script' },
                        { id: 'powershell', label: 'PowerShell' },
                        { id: 'bash', label: 'Linux Bash' },
                        { id: 'sql', label: 'SQL' },
                      ] as const
                    ).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPcCategory(cat.id)}
                        className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                          pcCategory === cat.id
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-950 border-white/10 text-slate-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pcPrompt}
                    onChange={(e) => setPcPrompt(e.target.value)}
                    placeholder="Ask for a Python script, PowerShell automation, Linux command, or bug fix..."
                    className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    disabled={!pcPrompt.trim() || isRunningPcAi}
                    onClick={handleRunPcAssistant}
                    className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {isRunningPcAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                    <span>Generate</span>
                  </button>
                </div>

                {pcAiOutput && (
                  <pre className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs text-slate-100 whitespace-pre-wrap overflow-x-auto select-text font-mono">
                    {pcAiOutput}
                  </pre>
                )}
              </div>

              {/* Built-In Instant PC Utilities */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Hash className="w-4 h-4 text-sky-400" />
                    <span>Offline PC Utilities (JSON · Regex · SHA-256 &amp; Base64)</span>
                  </span>
                  <div className="flex gap-1.5">
                    {(
                      [
                        { id: 'json', label: 'JSON Formatter' },
                        { id: 'regex', label: 'Regex Tester' },
                        { id: 'crypto', label: 'Hash / Base64' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPcToolMode(m.id)}
                        className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                          pcToolMode === m.id
                            ? 'bg-sky-500 text-slate-950 border-sky-400'
                            : 'bg-slate-950 border-white/10 text-slate-300'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {pcToolMode === 'json' && (
                  <div className="space-y-2.5">
                    <textarea
                      rows={4}
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-white"
                      placeholder="Paste raw JSON..."
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleFormatJson(false)}
                        className="min-h-[38px] px-3.5 rounded-xl bg-sky-500 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        Validate &amp; Format
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormatJson(true)}
                        className="min-h-[38px] px-3.5 rounded-xl bg-slate-800 border border-white/15 text-white font-semibold text-xs cursor-pointer"
                      >
                        Minify JSON
                      </button>
                    </div>
                    {jsonError && <p className="text-xs text-rose-400 font-mono">{jsonError}</p>}
                    {jsonResult && (
                      <pre className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs font-mono text-emerald-200 overflow-x-auto select-text">
                        {jsonResult}
                      </pre>
                    )}
                  </div>
                )}

                {pcToolMode === 'regex' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={regexPattern}
                        onChange={(e) => setRegexPattern(e.target.value)}
                        placeholder="Pattern"
                        className="col-span-3 min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-white"
                      />
                      <input
                        type="text"
                        value={regexFlags}
                        onChange={(e) => setRegexFlags(e.target.value)}
                        placeholder="Flags (gi)"
                        className="col-span-1 min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-white"
                      />
                    </div>
                    <textarea
                      rows={3}
                      value={regexSample}
                      onChange={(e) => setRegexSample(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-white"
                    />
                    {regexEval.error ? (
                      <p className="text-xs text-rose-400 font-mono">{regexEval.error}</p>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-sky-200">
                        Matches ({regexEval.matches.length}): {regexEval.matches.join(' | ') || 'None'}
                      </div>
                    )}
                  </div>
                )}

                {pcToolMode === 'crypto' && (
                  <div className="space-y-2.5">
                    <textarea
                      rows={2}
                      value={cryptoInput}
                      onChange={(e) => setCryptoInput(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-white"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { id: 'sha256', label: 'SHA-256' },
                          { id: 'sha512', label: 'SHA-512' },
                          { id: 'b64enc', label: 'Base64 Encode' },
                          { id: 'b64dec', label: 'Base64 Decode' },
                          { id: 'urlenc', label: 'URL Encode' },
                          { id: 'urldec', label: 'URL Decode' },
                        ] as const
                      ).map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => handleWebCryptoTransform(op.id)}
                          className="min-h-[36px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-white cursor-pointer"
                        >
                          {op.label}
                        </button>
                      ))}
                    </div>
                    {cryptoOutput && (
                      <pre className="p-3 rounded-xl bg-slate-950 border border-sky-500/30 text-xs font-mono text-emerald-200 break-all whitespace-pre-wrap select-text">
                        {cryptoOutput}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB C: ETHICAL HACKING & DEFENSIVE SECURITY LAB ================= */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              {/* Live Domain Security Header & DNS Recon */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-amber-400" />
                    <span>Authorized HTTP Security Headers &amp; DNS Recon</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Defensive Audit</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={secTargetDomain}
                    onChange={(e) => setSecTargetDomain(e.target.value)}
                    placeholder="example.com or https://your-domain.com"
                    className="flex-1 min-w-[200px] min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-white"
                  />
                  <button
                    type="button"
                    disabled={isInspectingHeaders}
                    onClick={handleInspectSecurityHeaders}
                    className="min-h-[42px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-45 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isInspectingHeaders ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    <span>Audit Headers</span>
                  </button>
                  <button
                    type="button"
                    disabled={isRunningDns}
                    onClick={handleDnsLookup}
                    className="min-h-[42px] px-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-45 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isRunningDns ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>DNS Lookup</span>
                  </button>
                </div>

                {secNetError && <p className="text-xs text-rose-400">{secNetError}</p>}

                {headerAuditResult && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-white/10 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                      <span className="text-white font-mono">
                        {headerAuditResult.url} · HTTP {headerAuditResult.statusCode}
                      </span>
                      <span className="text-amber-300 tabular-nums">
                        Hardening Score: {headerAuditResult.score}%
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {headerAuditResult.headers.map((hd) => (
                        <div
                          key={hd.name}
                          className={`p-2 rounded-lg border ${
                            hd.present
                              ? 'bg-emerald-950/35 border-emerald-500/35 text-emerald-200'
                              : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                          }`}
                        >
                          <div className="font-bold text-[11px]">{hd.name}</div>
                          <div className="text-[10px] opacity-85 truncate font-mono">{hd.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dnsResult && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-sky-500/30 space-y-1.5 text-xs font-mono">
                    <div className="text-sky-300 font-bold">DNS Records: {dnsResult.domain}</div>
                    <div>A: {dnsResult.records.A.join(', ') || 'None'}</div>
                    <div>AAAA: {dnsResult.records.AAAA.join(', ') || 'None'}</div>
                    <div>MX: {dnsResult.records.MX.join(', ') || 'None'}</div>
                    <div>NS: {dnsResult.records.NS.join(', ') || 'None'}</div>
                    <div className="break-all">TXT: {dnsResult.records.TXT.join(' | ') || 'None'}</div>
                  </div>
                )}
              </div>

              {/* Password Strength + JWT Inspector + CIDR Subnet Calculator */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Password Entropy & Crypto Generator */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-emerald-400" />
                      <span>Password Entropy &amp; Generator</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerateStrongPassword}
                      className="min-h-[32px] px-2.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] cursor-pointer"
                    >
                      Generate Strong
                    </button>
                  </div>
                  <input
                    type="text"
                    value={pwdTestInput}
                    onChange={(e) => setPwdTestInput(e.target.value)}
                    placeholder="Test or generate password..."
                    className="w-full min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-white"
                  />
                  {passwordMetrics && (
                    <div className="text-[11px] text-slate-300 space-y-0.5 tabular-nums">
                      <div>
                        Strength: <strong className="text-emerald-300">{passwordMetrics.strength}</strong> ·{' '}
                        {passwordMetrics.entropy} bits · {passwordMetrics.length} chars
                      </div>
                      <div className="text-slate-400">
                        Lower: {passwordMetrics.hasLower ? 'Yes' : 'No'} · Upper:{' '}
                        {passwordMetrics.hasUpper ? 'Yes' : 'No'} · Digits:{' '}
                        {passwordMetrics.hasDigit ? 'Yes' : 'No'} · Symbols:{' '}
                        {passwordMetrics.hasSymbol ? 'Yes' : 'No'}
                      </div>
                    </div>
                  )}
                </div>

                {/* IPv4 CIDR / Subnet Calculator */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5">
                  <span className="text-xs font-bold text-white block">
                    IPv4 CIDR / Subnet Calculator
                  </span>
                  <input
                    type="text"
                    value={cidrInput}
                    onChange={(e) => setCidrInput(e.target.value)}
                    placeholder="e.g. 192.168.1.0/24"
                    className="w-full min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-white"
                  />
                  {cidrResult ? (
                    <div className="text-[11px] font-mono text-slate-300 space-y-0.5">
                      <div>Network: {cidrResult.network} · Broadcast: {cidrResult.broadcast}</div>
                      <div>Mask: {cidrResult.mask} · Usable Hosts: {cidrResult.usable}</div>
                      <div>Range: {cidrResult.firstHost} – {cidrResult.lastHost}</div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-rose-400">Enter valid CIDR (e.g. 10.0.0.0/16)</p>
                  )}
                </div>
              </div>

              {/* JWT Token Decoder */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5">
                <span className="text-xs font-bold text-white block">
                  JWT Token Claims Decoder &amp; Algorithm Check (Local)
                </span>
                <textarea
                  rows={2}
                  value={jwtInput}
                  onChange={(e) => setJwtInput(e.target.value)}
                  placeholder="Paste JWT token (header.payload.signature) to inspect claims locally..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-white"
                />
                {jwtDecoded && (
                  <pre className="p-3 rounded-xl bg-slate-950 border border-white/10 text-[11px] font-mono text-sky-200 overflow-x-auto select-text">
                    {JSON.stringify(jwtDecoded, null, 2)}
                  </pre>
                )}
              </div>

              {/* AI Defensive Pentest & Hardening Advisor */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5">
                <span className="text-xs font-bold text-white block">
                  AI Defensive Pentest, Nmap / Wireshark &amp; OWASP Advisor
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={secAiQuery}
                    onChange={(e) => setSecAiQuery(e.target.value)}
                    placeholder="Ask Nmap flags, Wireshark filters, Linux UFW firewall setup, or OWASP fixes..."
                    className="flex-1 min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
                  />
                  <button
                    type="button"
                    disabled={!secAiQuery.trim() || isRunningSecAi}
                    onClick={handleRunSecurityAi}
                    className="min-h-[42px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-45 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                  >
                    {isRunningSecAi ? 'Analyzing...' : 'Ask Advisor'}
                  </button>
                </div>
                {secAiOutput && (
                  <pre className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-slate-100 whitespace-pre-wrap font-mono select-text">
                    {secAiOutput}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 1: MESSAGES & VOICE ================= */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              {/* Language & Voice Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Voice Style (Pakistani Female / Male)
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectVoiceGender('female')}
                        className={`min-h-[36px] px-3 rounded-lg text-xs font-bold border cursor-pointer ${
                          voiceGender === 'female'
                            ? 'bg-pink-500/20 border-pink-400 text-pink-200'
                            : 'bg-slate-950 border-white/10 text-slate-400'
                        }`}
                      >
                        Female
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectVoiceGender('male')}
                        className={`min-h-[36px] px-3 rounded-lg text-xs font-bold border cursor-pointer ${
                          voiceGender === 'male'
                            ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                            : 'bg-slate-950 border-white/10 text-slate-400'
                        }`}
                      >
                        Male
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {filteredVoiceProfiles.map((profile) => {
                      const active = config.voiceName === profile.id;
                      return (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() =>
                            onUpdateConfig({
                              voiceName: profile.id as ZaraVoiceName,
                              voiceGender: profile.gender,
                            })
                          }
                          className={`min-h-[42px] px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-sky-500/15 border-sky-400 text-white'
                              : 'bg-slate-950/80 border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          <div className="text-xs font-bold">{profile.label}</div>
                          <div className="text-[11px] text-slate-400">{profile.urduLabel}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language & AI Composer Prompt */}
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block mb-2">
                      Language
                    </span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(
                        [
                          { id: 'auto', label: 'Auto' },
                          { id: 'urdu', label: 'اردو' },
                          { id: 'hindi', label: 'हिंदी' },
                          { id: 'punjabi', label: 'ਪੰਜਾਬੀ' },
                          { id: 'english', label: 'EN' },
                        ] as { id: Language; label: string }[]
                      ).map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setMsgLang(l.id)}
                          className={`min-h-[38px] rounded-lg text-xs font-semibold border cursor-pointer ${
                            msgLang === l.id
                              ? 'bg-sky-500 text-slate-950 border-sky-400'
                              : 'bg-slate-950 border-white/10 text-slate-300'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Ask AI to Write / Rewrite a Message
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={msgPrompt}
                        onChange={(e) => setMsgPrompt(e.target.value)}
                        placeholder="e.g. Write a polite birthday wish in Urdu..."
                        className="flex-1 min-h-[44px] px-3 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                      />
                      <button
                        type="button"
                        disabled={isDraftingMsg}
                        onClick={handleAiDraftMessage}
                        className="min-h-[44px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {isDraftingMsg ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4" />
                        )}
                        <span>AI Write</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Composer Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Message Text (Type, Edit, Read Aloud or Convert to Voice)
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    disabled={!msgText.trim()}
                    className="text-xs text-sky-300 hover:text-sky-200 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedMsg ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMsg ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Write your message here in Urdu, Hindi, Punjabi, or English..."
                  className="w-full p-3.5 rounded-2xl bg-slate-950 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 leading-relaxed"
                />
              </div>

              {/* Action Buttons: Read Aloud, Convert to Voice (.wav), Send to Chat */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={!msgText.trim()}
                  onClick={handleReadMessageAloud}
                  className="min-h-[46px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Read Message Aloud</span>
                </button>

                <button
                  type="button"
                  disabled={!msgText.trim() || isConvertingWav}
                  onClick={handleConvertMessageToAudio}
                  className="min-h-[46px] px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-45 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                >
                  {isConvertingWav ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Convert Message to Voice (.wav)</span>
                </button>

                {onSendToChat && (
                  <button
                    type="button"
                    disabled={!msgText.trim()}
                    onClick={() => {
                      const txt = msgText.trim();
                      if (!txt) return;
                      onSendToChat(txt);
                      onClose();
                    }}
                    className="min-h-[46px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-45 border border-white/15 text-white font-semibold text-xs sm:text-sm cursor-pointer"
                  >
                    Send to Zara Chat
                  </button>
                )}
              </div>

              {msgStatus && (
                <p className="text-xs text-sky-300 bg-sky-950/40 border border-sky-500/30 rounded-xl px-3 py-2">
                  {msgStatus}
                </p>
              )}

              {wavAudioUrl && (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3">
                  <audio controls src={wavAudioUrl} className="flex-1 min-w-[220px]" />
                  <a
                    href={wavAudioUrl}
                    download={wavFilename}
                    className="min-h-[42px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Audio</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: PHOTO ANALYZE & EDITOR ================= */}
          {activeTab === 'photo' && (
            <div className="space-y-4">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePickPhoto}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="min-h-[44px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Photo</span>
                </button>

                <button
                  type="button"
                  onClick={cameraOpen ? stopCamera : handleOpenCameraSnap}
                  className="min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>{cameraOpen ? 'Close Camera' : 'Camera Snap'}</span>
                </button>

                {photoSrc && (
                  <>
                    <button
                      type="button"
                      onClick={() => setRotationDeg((d) => (d + 90) % 360)}
                      className="min-h-[44px] px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Rotate 90°</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadEditedPhoto}
                      className="min-h-[44px] px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Save PNG</span>
                    </button>
                  </>
                )}
              </div>

              {cameraOpen && (
                <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-2.5">
                  <video
                    ref={cameraVideoRef}
                    playsInline
                    muted
                    className="w-full max-h-64 rounded-xl bg-black object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleCaptureCameraFrame}
                    className="w-full min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer"
                  >
                    Capture Photo Now
                  </button>
                </div>
              )}

              {photoSrc ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Edited Canvas Preview */}
                  <div className="lg:col-span-7 p-3 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center min-h-[260px]">
                    <canvas
                      ref={photoCanvasRef}
                      className="max-w-full max-h-[360px] rounded-xl object-contain"
                    />
                  </div>

                  {/* Real Adjustment Controls */}
                  <div className="lg:col-span-5 p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <Sliders className="w-4 h-4 text-sky-400" />
                      <span>Photo Adjustments &amp; Caption</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <label className="block">
                        <span className="flex justify-between text-slate-300 mb-1">
                          <span>Brightness</span>
                          <span>{brightness}%</span>
                        </span>
                        <input
                          type="range"
                          min={50}
                          max={150}
                          value={brightness}
                          onChange={(e) => setBrightness(Number(e.target.value))}
                          className="w-full accent-sky-400"
                        />
                      </label>

                      <label className="block">
                        <span className="flex justify-between text-slate-300 mb-1">
                          <span>Contrast</span>
                          <span>{contrast}%</span>
                        </span>
                        <input
                          type="range"
                          min={50}
                          max={150}
                          value={contrast}
                          onChange={(e) => setContrast(Number(e.target.value))}
                          className="w-full accent-sky-400"
                        />
                      </label>

                      <label className="block">
                        <span className="flex justify-between text-slate-300 mb-1">
                          <span>Saturation</span>
                          <span>{saturation}%</span>
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          value={saturation}
                          onChange={(e) => setSaturation(Number(e.target.value))}
                          className="w-full accent-sky-400"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {PHOTO_FILTERS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setPhotoFilter(f.id)}
                          className={`min-h-[36px] px-2.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                            photoFilter === f.id
                              ? 'bg-sky-500 text-slate-950 border-sky-400'
                              : 'bg-slate-950 border-white/10 text-slate-300'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        placeholder="Add caption text on photo..."
                        className="flex-1 min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500"
                      />
                      <input
                        type="color"
                        value={captionColor}
                        onChange={(e) => setCaptionColor(e.target.value)}
                        className="w-10 h-10 rounded-xl bg-slate-950 border border-white/15 cursor-pointer"
                        title="Caption text color"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-900/50 border border-dashed border-white/15 text-center text-sm text-slate-400">
                  Upload any photo or snap from Camera to analyze it with AI and edit brightness, filters, rotation, or captions.
                </div>
              )}

              {/* AI Understand Photo Bar */}
              {photoSrc && (
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-sky-500/25 space-y-2.5">
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={photoQuestion}
                      onChange={(e) => setPhotoQuestion(e.target.value)}
                      placeholder="Ask Zara anything about this photo (or leave empty to describe all details)..."
                      className="flex-1 min-w-[200px] min-h-[44px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs sm:text-sm text-white placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      disabled={isAnalyzingPhoto}
                      onClick={handleUnderstandPhoto}
                      className="min-h-[44px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                    >
                      {isAnalyzingPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>Understand Photo</span>
                    </button>
                  </div>

                  {photoAnalysis && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-white/10 space-y-2">
                      <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {photoAnalysis}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          audioService.speakText(photoAnalysis, {
                            language: msgLang,
                            voiceName: config.voiceName,
                            loveMode: isOwnerVerified ? config.loveMode : false,
                            emotionMode: isOwnerVerified ? config.emotionMode || 'apnapan' : 'calm',
                          })
                        }
                        className="min-h-[38px] px-3 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Read Description Aloud</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* AI Image Generator Card (DALL-E 3 / Paid Gemini Image — Honest Key Status) */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-violet-500/35 space-y-2.5">
                <div className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Image Generator (OpenAI DALL-E 3 / Gemini Image)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={imgGenPrompt}
                    onChange={(e) => setImgGenPrompt(e.target.value)}
                    placeholder="Describe an image to generate..."
                    className="flex-1 min-w-[200px] min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
                  />
                  <select
                    value={imgGenAspect}
                    onChange={(e) => setImgGenAspect(e.target.value as any)}
                    className="min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
                  >
                    <option value="1:1">1:1 Square</option>
                    <option value="16:9">16:9 Wide</option>
                    <option value="9:16">9:16 Portrait</option>
                  </select>
                  <button
                    type="button"
                    disabled={isGeneratingImg}
                    onClick={handleGenerateAiImage}
                    className="min-h-[40px] px-4 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isGeneratingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    <span>Generate Image</span>
                  </button>
                </div>
                {imgGenError && (
                  <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-400/40 text-xs text-amber-200">
                    {imgGenError}
                  </div>
                )}
                {imgGenUrl && (
                  <div className="p-2 rounded-xl bg-slate-950 border border-white/10 space-y-2">
                    <img src={imgGenUrl} alt="AI generated result" className="max-h-72 rounded-lg mx-auto" />
                    <a
                      href={imgGenUrl}
                      download={`zara-ai-${Date.now()}.png`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Image</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 3: VIDEO EDITOR ================= */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handlePickVideo}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="min-h-[44px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Select Video File</span>
                </button>

                {videoSrc && (
                  <button
                    type="button"
                    disabled={isExportingVideo}
                    onClick={handleExportEditedVideo}
                    className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                  >
                    {isExportingVideo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>
                      {isExportingVideo
                        ? `Rendering (${exportProgress}%)...`
                        : 'Render & Export Video (.webm)'}
                    </span>
                  </button>
                )}
              </div>

              {videoSrc ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Source Video Player */}
                  <div className="lg:col-span-7 p-3 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                    <video
                      ref={sourceVideoRef}
                      src={videoSrc}
                      controls
                      muted={muteVideoAudio}
                      onLoadedMetadata={handleVideoLoadedMetadata}
                      style={{ filter: activeVideoFilterCss }}
                      className="w-full max-h-[320px] rounded-xl bg-black"
                    />
                    <canvas ref={videoCanvasRef} className="hidden" />
                    <p className="text-[11px] text-slate-400">
                      Duration: {videoDuration.toFixed(1)}s · Trim Window:{' '}
                      {trimStart.toFixed(1)}s to {trimEnd.toFixed(1)}s · Speed: {playbackSpeed}x
                    </p>
                  </div>

                  {/* Real Video Editing Controls */}
                  <div className="lg:col-span-5 p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <Scissors className="w-4 h-4 text-sky-400" />
                      <span>Trim, Filter, Speed &amp; Title</span>
                    </div>

                    <label className="block text-xs">
                      <span className="flex justify-between text-slate-300 mb-1">
                        <span>Trim Start</span>
                        <span>{trimStart.toFixed(1)}s</span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(0.1, trimEnd - 0.3)}
                        step={0.1}
                        value={trimStart}
                        onChange={(e) => setTrimStart(Number(e.target.value))}
                        className="w-full accent-sky-400"
                      />
                    </label>

                    <label className="block text-xs">
                      <span className="flex justify-between text-slate-300 mb-1">
                        <span>Trim End</span>
                        <span>{trimEnd.toFixed(1)}s</span>
                      </span>
                      <input
                        type="range"
                        min={Math.min(videoDuration, trimStart + 0.3)}
                        max={Math.max(0.5, videoDuration)}
                        step={0.1}
                        value={trimEnd}
                        onChange={(e) => setTrimEnd(Number(e.target.value))}
                        className="w-full accent-sky-400"
                      />
                    </label>

                    <div>
                      <span className="text-xs text-slate-300 block mb-1.5">Color Filter</span>
                      <div className="flex flex-wrap gap-1.5">
                        {VIDEO_FILTERS.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setVideoFilter(f.id)}
                            className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                              videoFilter === f.id
                                ? 'bg-sky-500 text-slate-950 border-sky-400'
                                : 'bg-slate-950 border-white/10 text-slate-300'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {[0.5, 1, 1.25, 1.5, 2].map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => {
                              setPlaybackSpeed(spd);
                              if (sourceVideoRef.current) {
                                sourceVideoRef.current.playbackRate = spd;
                              }
                            }}
                            className={`min-h-[34px] px-2 rounded-lg text-xs font-bold border cursor-pointer ${
                              playbackSpeed === spd
                                ? 'bg-sky-500 text-slate-950 border-sky-400'
                                : 'bg-slate-950 border-white/10 text-slate-300'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setMuteVideoAudio((m) => !m)}
                        className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer ${
                          muteVideoAudio
                            ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                            : 'bg-slate-950 border-white/10 text-slate-300'
                        }`}
                      >
                        {muteVideoAudio ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>{muteVideoAudio ? 'Muted' : 'Audio On'}</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      value={videoTitleOverlay}
                      onChange={(e) => setVideoTitleOverlay(e.target.value)}
                      placeholder="Optional watermark / title text on video..."
                      className="w-full min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-900/50 border border-dashed border-white/15 text-center text-sm text-slate-400">
                  Choose any MP4 / WebM video from your device to trim, change playback speed, apply color filters, mute audio, add a title overlay, and export as an edited video file.
                </div>
              )}

              {videoError && (
                <p className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/30 rounded-xl px-3 py-2">
                  {videoError}
                </p>
              )}

              {exportedVideoUrl && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">
                      Edited Video Ready
                    </span>
                    <a
                      href={exportedVideoUrl}
                      download={`zara-edited-${Date.now()}.webm`}
                      className="min-h-[40px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Edited Video (.webm)</span>
                    </a>
                  </div>
                  <video
                    controls
                    src={exportedVideoUrl}
                    className="w-full max-h-[260px] rounded-xl bg-black"
                  />
                </div>
              )}

              {/* AI Video Understanding & Keyframe Summarizer */}
              {videoSrc && (
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-sky-500/35 space-y-2.5">
                  <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Video Summarizer (Multimodal Keyframe Understanding)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={videoSummaryPrompt}
                      onChange={(e) => setVideoSummaryPrompt(e.target.value)}
                      className="flex-1 min-w-[200px] min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
                    />
                    <button
                      type="button"
                      disabled={isSummarizingVideo}
                      onClick={handleSummarizeVideoFrames}
                      className="min-h-[40px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSummarizingVideo ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>Summarize Video with AI</span>
                    </button>
                  </div>
                  {videoSummaryOutput && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {videoSummaryOutput}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
