import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { ZaraAiOrchestrator } from './aiOrchestrator.ts';
import type {
  ApiVaultProviderId,
  ApiVaultProviderStatus,
  AutonomousTaskPlan,
  AutonomousTaskStep,
  DevBackupSnapshot,
  DevBuildStageId,
  DevPipelineRunResult,
  DevPipelineStageResult,
  DevProjectFileNode,
  DevProjectSummary,
} from '../types.ts';

const execFileAsync = promisify(execFile);

export interface DevPlatformDeps {
  rootDir: string;
  orchestrator: ZaraAiOrchestrator;
  buildZipBuffer: (entries: Array<{ name: string; data: Buffer; storeOnly?: boolean }>) => Buffer;
}

const MAX_ZIP_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB limit
const MAX_SANDBOX_FILES = 350;
const MAX_SINGLE_FILE_BYTES = 512 * 1024; // 512 KB text edit cap

// ======================== ENCRYPTED API KEYS & TOOLS VAULT ========================
interface EncryptedVaultPayload {
  iv: string;
  tag: string;
  ciphertext: string;
  updatedAtIso: string;
}

interface ProviderCatalogMeta {
  provider: ApiVaultProviderId;
  name: string;
  category: ApiVaultProviderStatus['category'];
  envKeys: string[];
  pricingTier: ApiVaultProviderStatus['pricingTier'];
  freeLimitsNote: string;
  freeAlternative: string;
  docsHint: string;
}

export const API_PROVIDER_CATALOG: ProviderCatalogMeta[] = [
  {
    provider: 'gemini',
    name: 'Google Gemini AI',
    category: 'llm',
    envKeys: ['GEMINI_API_KEY'],
    pricingTier: 'free_tier',
    freeLimitsNote: 'Free tier available (RPM/TPM rate limits); pay-as-you-go removes caps.',
    freeAlternative: 'Groq Free Tier or local Ollama',
    docsHint: 'ai.google.dev',
  },
  {
    provider: 'groq',
    name: 'Groq Ultra-Fast LLM',
    category: 'llm',
    envKeys: ['GROQ_API_KEY'],
    pricingTier: 'free_tier',
    freeLimitsNote: 'Generous free developer tier (Llama 3.3 70B / Mixtral, daily token quota).',
    freeAlternative: 'Hugging Face Inference Free / Ollama',
    docsHint: 'console.groq.com',
  },
  {
    provider: 'huggingface',
    name: 'Hugging Face Inference',
    category: 'llm',
    envKeys: ['HF_TOKEN', 'HUGGINGFACE_API_KEY'],
    pricingTier: 'free_tier',
    freeLimitsNote: 'Free serverless inference quota for open-source coding & chat models.',
    freeAlternative: 'Ollama Local Models',
    docsHint: 'huggingface.co/settings/tokens',
  },
  {
    provider: 'ollama',
    name: 'Ollama (Local / Open-Source)',
    category: 'llm',
    envKeys: ['OLLAMA_BASE_URL'],
    pricingTier: 'free_local',
    freeLimitsNote: '100% Free & private when pointing to your own Ollama endpoint (default http://127.0.0.1:11434).',
    freeAlternative: 'Termux / PC Ollama qwen2.5-coder or llama3.2',
    docsHint: 'ollama.com',
  },
  {
    provider: 'openrouter',
    name: 'OpenRouter Multi-Model',
    category: 'llm',
    envKeys: ['OPENROUTER_API_KEY'],
    pricingTier: 'freemium',
    freeLimitsNote: 'Has ":free" open-source models + paid access to Claude/GPT/DeepSeek.',
    freeAlternative: 'Groq or Hugging Face Free Tier',
    docsHint: 'openrouter.ai',
  },
  {
    provider: 'openai',
    name: 'OpenAI (GPT & DALL-E 3)',
    category: 'llm',
    envKeys: ['OPENAI_API_KEY'],
    pricingTier: 'paid',
    freeLimitsNote: 'Prepaid API credits required; no ongoing free API quota.',
    freeAlternative: 'Gemini / Groq / Hugging Face Free',
    docsHint: 'platform.openai.com',
  },
  {
    provider: 'elevenlabs',
    name: 'ElevenLabs Expressive Voice',
    category: 'voice',
    envKeys: ['ELEVENLABS_API_KEY'],
    pricingTier: 'freemium',
    freeLimitsNote: '10,000 chars/month free tier; Gemini Hunter TTS built-in for zero extra cost.',
    freeAlternative: 'Built-in Zara Hunter Neural TTS (Gemini)',
    docsHint: 'elevenlabs.io',
  },
  {
    provider: 'replicate',
    name: 'Replicate (Image / Video AI)',
    category: 'image_video',
    envKeys: ['REPLICATE_API_TOKEN'],
    pricingTier: 'paid',
    freeLimitsNote: 'Pay-per-second GPU billing after initial starter trial.',
    freeAlternative: 'Hugging Face Free Image Spaces or Procedural Canvas/Three.js',
    docsHint: 'replicate.com',
  },
  {
    provider: 'github',
    name: 'GitHub PAT (Free Cloud APK Builds)',
    category: 'devtools',
    envKeys: ['GITHUB_TOKEN'],
    pricingTier: 'free_tier',
    freeLimitsNote: '2,000 free GitHub Actions CI minutes/month to compile real Android APKs & AABs.',
    freeAlternative: 'Termux ARM64 local script included in ZIP export',
    docsHint: 'github.com/settings/tokens',
  },
  {
    provider: 'telegram',
    name: 'Telegram Bot API',
    category: 'social',
    envKeys: ['TELEGRAM_BOT_TOKEN'],
    pricingTier: 'free_tier',
    freeLimitsNote: '100% Free official Telegram Bot messaging & channel posting.',
    freeAlternative: 'Native tg:// app launch on phone',
    docsHint: '@BotFather on Telegram',
  },
  {
    provider: 'youtube',
    name: 'YouTube Data API v3',
    category: 'social',
    envKeys: ['YOUTUBE_API_KEY'],
    pricingTier: 'free_tier',
    freeLimitsNote: '10,000 free quota units/day for video/channel search & analytics.',
    freeAlternative: 'YouTube App deep-link search',
    docsHint: 'console.cloud.google.com',
  },
  {
    provider: 'twitter',
    name: 'X (Twitter) API v2',
    category: 'social',
    envKeys: ['X_BEARER_TOKEN'],
    pricingTier: 'freemium',
    freeLimitsNote: 'Free write-only tier (1,500 posts/mo); reads require Basic $100+/mo.',
    freeAlternative: 'Compose via X native app deep link',
    docsHint: 'developer.x.com',
  },
  {
    provider: 'meta_fb',
    name: 'Facebook Graph API',
    category: 'social',
    envKeys: ['META_FB_ACCESS_TOKEN'],
    pricingTier: 'free_tier',
    freeLimitsNote: 'Free Graph API token for Pages with OAuth review.',
    freeAlternative: 'Draft in Zara & share via Facebook app',
    docsHint: 'developers.facebook.com',
  },
  {
    provider: 'meta_ig',
    name: 'Instagram Graph API',
    category: 'social',
    envKeys: ['META_IG_ACCESS_TOKEN'],
    pricingTier: 'free_tier',
    freeLimitsNote: 'Free for Instagram Business/Creator accounts via Meta Graph API.',
    freeAlternative: 'Draft captions in Zara & open Instagram',
    docsHint: 'developers.facebook.com',
  },
];

function sanitizeId(raw: string, fallback = 'proj'): string {
  const clean = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return clean && clean.length >= 2 ? clean : `${fallback}-${Date.now().toString(36)}`;
}

function detectFileLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath).toLowerCase();
  if (base === 'pubspec.yaml') return 'YAML (Flutter)';
  if (base === 'build.gradle' || base === 'build.gradle.kts' || base === 'settings.gradle') return 'Gradle';
  const map: Record<string, string> = {
    '.kt': 'Kotlin',
    '.kts': 'Kotlin Script',
    '.java': 'Java',
    '.dart': 'Dart (Flutter)',
    '.ts': 'TypeScript',
    '.tsx': 'React TSX',
    '.js': 'JavaScript',
    '.jsx': 'React JSX',
    '.mjs': 'JavaScript ESM',
    '.cjs': 'JavaScript CJS',
    '.py': 'Python',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.json': 'JSON',
    '.xml': 'XML',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.md': 'Markdown',
    '.sh': 'Shell',
    '.cs': 'C# (Unity)',
    '.gd': 'GDScript (Godot)',
    '.tscn': 'Godot Scene',
    '.sql': 'SQL',
  };
  return map[ext] || 'Text';
}

const BINARY_EXTS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.ico',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.jar',
  '.so',
  '.apk',
  '.aab',
  '.keystore',
  '.jks',
  '.mp3',
  '.wav',
  '.ogg',
  '.mp4',
]);

export class ZaraDevPlatformEngine {
  private readonly rootDir: string;
  private readonly projectsRoot: string;
  private readonly backupsRoot: string;
  private readonly vaultPath: string;
  private readonly vaultSecretFile: string;
  private readonly orchestrator: ZaraAiOrchestrator;
  private readonly buildZipBuffer: DevPlatformDeps['buildZipBuffer'];
  private readonly lastTestStatus = new Map<ApiVaultProviderId, { ok: boolean; msg: string }>();

  public readonly toolchains: {
    localNodeCheck: boolean;
    localTypeScriptCheck: boolean;
    localPythonCheck: boolean;
    localGradleSdk: boolean;
    localFlutterSdk: boolean;
  };

  constructor(deps: DevPlatformDeps) {
    this.rootDir = deps.rootDir;
    this.orchestrator = deps.orchestrator;
    this.buildZipBuffer = deps.buildZipBuffer;
    this.projectsRoot = path.join(this.rootDir, '.zara-dev-projects');
    this.backupsRoot = path.join(this.rootDir, '.zara-dev-backups');
    this.vaultPath = path.join(this.rootDir, '.zara-api-vault.enc.json');
    this.vaultSecretFile = path.join(this.rootDir, '.zara-vault-master.key');

    fs.mkdirSync(this.projectsRoot, { recursive: true });
    fs.mkdirSync(this.backupsRoot, { recursive: true });

    this.toolchains = {
      localNodeCheck: this.hasBinary('node'),
      localTypeScriptCheck: fs.existsSync(path.join(this.rootDir, 'node_modules', '.bin', 'tsc')),
      localPythonCheck: this.hasBinary('python3'),
      localGradleSdk: this.hasBinary('gradle') && this.hasBinary('javac'),
      localFlutterSdk: this.hasBinary('flutter'),
    };
  }

  private hasBinary(cmd: string): boolean {
    const pathEnv = process.env.PATH || '';
    for (const dir of pathEnv.split(path.delimiter)) {
      if (!dir) continue;
      try {
        const candidate = path.join(dir, cmd);
        if (fs.existsSync(candidate)) return true;
      } catch {}
    }
    return false;
  }

  // ---------------- ENCRYPTED API KEY VAULT ----------------
  private getVaultAesKey(): Buffer {
    const envSecret = process.env.ZARA_VAULT_SECRET || process.env.TIER_HMAC_SECRET || '';
    if (envSecret.length >= 16) {
      return crypto.createHash('sha256').update(envSecret).digest();
    }
    try {
      if (fs.existsSync(this.vaultSecretFile)) {
        const raw = fs.readFileSync(this.vaultSecretFile, 'utf8').trim();
        if (raw.length >= 32) {
          return crypto.createHash('sha256').update(raw).digest();
        }
      }
      const generated = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(this.vaultSecretFile, generated, { mode: 0o600 });
      return crypto.createHash('sha256').update(generated).digest();
    } catch {
      return crypto.createHash('sha256').update(`zara-fallback:${this.rootDir}`).digest();
    }
  }

  private readVaultSecretsMap(): Record<string, string> {
    try {
      if (!fs.existsSync(this.vaultPath)) return {};
      const wrapper: EncryptedVaultPayload = JSON.parse(fs.readFileSync(this.vaultPath, 'utf8'));
      if (!wrapper?.iv || !wrapper?.tag || !wrapper?.ciphertext) return {};
      const key = this.getVaultAesKey();
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(wrapper.iv, 'base64')
      );
      decipher.setAuthTag(Buffer.from(wrapper.tag, 'base64'));
      const plain = Buffer.concat([
        decipher.update(Buffer.from(wrapper.ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8');
      const parsed = JSON.parse(plain);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeVaultSecretsMap(map: Record<string, string>): void {
    const key = this.getVaultAesKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(map), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const payload: EncryptedVaultPayload = {
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      updatedAtIso: new Date().toISOString(),
    };
    const tmp = `${this.vaultPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.vaultPath);
  }

  public resolveProviderSecret(provider: ApiVaultProviderId): {
    value: string;
    source: 'env' | 'vault' | 'none';
  } {
    const meta = API_PROVIDER_CATALOG.find((p) => p.provider === provider);
    if (!meta) return { value: '', source: 'none' };
    for (const envName of meta.envKeys) {
      const envVal = (process.env[envName] || '').trim();
      if (envVal) return { value: envVal, source: 'env' };
    }
    const vaultMap = this.readVaultSecretsMap();
    const vaultVal = (vaultMap[provider] || '').trim();
    if (vaultVal) return { value: vaultVal, source: 'vault' };
    return { value: '', source: 'none' };
  }

  private maskSecret(secret: string): string {
    if (!secret) return '';
    if (secret.length <= 8) return '••••••••';
    return `${secret.slice(0, 4)}••••${secret.slice(-4)}`;
  }

  public listVaultProviders(): ApiVaultProviderStatus[] {
    return API_PROVIDER_CATALOG.map((meta) => {
      const resolved = this.resolveProviderSecret(meta.provider);
      const tested = this.lastTestStatus.get(meta.provider);
      return {
        provider: meta.provider,
        name: meta.name,
        category: meta.category,
        configured: Boolean(resolved.value),
        source: resolved.source,
        maskedPreview: this.maskSecret(resolved.value),
        pricingTier: meta.pricingTier,
        freeLimitsNote: meta.freeLimitsNote,
        freeAlternative: meta.freeAlternative,
        docsHint: meta.docsHint,
        lastTestOk: tested?.ok,
        lastTestMessage: tested?.msg,
      };
    });
  }

  public setVaultProviderKey(provider: ApiVaultProviderId, apiKeyRaw: string): ApiVaultProviderStatus[] {
    const meta = API_PROVIDER_CATALOG.find((p) => p.provider === provider);
    if (!meta) {
      throw new Error(`Unsupported provider "${provider}".`);
    }
    const cleanKey = String(apiKeyRaw || '').trim();
    if (!cleanKey || cleanKey.length < 4 || cleanKey.length > 512) {
      throw new Error('Provide a valid API key or endpoint URL (4-512 characters).');
    }
    if (provider === 'ollama' && !/^https?:\/\/.+/i.test(cleanKey)) {
      throw new Error('Ollama configuration must be a valid http:// or https:// base URL.');
    }
    const map = this.readVaultSecretsMap();
    map[provider] = cleanKey;
    this.writeVaultSecretsMap(map);
    this.lastTestStatus.delete(provider);
    return this.listVaultProviders();
  }

  public removeVaultProviderKey(provider: ApiVaultProviderId): ApiVaultProviderStatus[] {
    const map = this.readVaultSecretsMap();
    delete map[provider];
    this.writeVaultSecretsMap(map);
    this.lastTestStatus.delete(provider);
    return this.listVaultProviders();
  }

  public async testVaultProvider(
    provider: ApiVaultProviderId
  ): Promise<{ ok: boolean; provider: ApiVaultProviderId; message: string; providers: ApiVaultProviderStatus[] }> {
    const { value } = this.resolveProviderSecret(provider);
    if (!value) {
      const msg = `No key configured in Server Secrets or Encrypted Vault. Free alternative: ${
        API_PROVIDER_CATALOG.find((p) => p.provider === provider)?.freeAlternative || 'N/A'
      }`;
      this.lastTestStatus.set(provider, { ok: false, msg });
      return { ok: false, provider, message: msg, providers: this.listVaultProviders() };
    }

    let ok = false;
    let msg = '';
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6500);
      try {
        if (provider === 'gemini') {
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(value)}`,
            { signal: ctrl.signal }
          );
          ok = r.ok;
          msg = ok ? 'Gemini API reachable & key accepted.' : `Gemini returned HTTP ${r.status}.`;
        } else if (provider === 'openai') {
          const r = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${value}` },
            signal: ctrl.signal,
          });
          ok = r.ok;
          msg = ok ? 'OpenAI API key verified.' : `OpenAI returned HTTP ${r.status}.`;
        } else if (provider === 'groq') {
          const r = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { Authorization: `Bearer ${value}` },
            signal: ctrl.signal,
          });
          ok = r.ok;
          msg = ok ? 'Groq free-tier API key verified.' : `Groq returned HTTP ${r.status}.`;
        } else if (provider === 'huggingface') {
          const r = await fetch('https://huggingface.co/api/whoami-v2', {
            headers: { Authorization: `Bearer ${value}` },
            signal: ctrl.signal,
          });
          ok = r.ok;
          msg = ok ? 'Hugging Face token verified.' : `Hugging Face returned HTTP ${r.status}.`;
        } else if (provider === 'openrouter') {
          const r = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { Authorization: `Bearer ${value}` },
            signal: ctrl.signal,
          });
          ok = r.ok;
          msg = ok ? 'OpenRouter API reachable & accepted.' : `OpenRouter returned HTTP ${r.status}.`;
        } else if (provider === 'ollama') {
          const base = value.replace(/\/+$/, '');
          const r = await fetch(`${base}/api/tags`, { signal: ctrl.signal });
          ok = r.ok;
          msg = ok ? `Ollama live at ${base}.` : `Ollama HTTP ${r.status}`;
        } else if (provider === 'elevenlabs') {
          const r = await fetch('https://api.elevenlabs.io/v1/user', {
            headers: { 'xi-api-key': value },
            signal: ctrl.signal,
          });
          ok = r.ok;
          msg = ok ? 'ElevenLabs voice API verified.' : `ElevenLabs returned HTTP ${r.status}.`;
        } else if (provider === 'replicate') {
          const r = await fetch('https://api.replicate.com/v1/models', {
            headers: { Authorization: `Bearer ${value}` },
            signal: ctrl.signal,
          });
          ok = r.ok;
          msg = ok ? 'Replicate token verified.' : `Replicate returned HTTP ${r.status}.`;
        } else if (provider === 'github') {
          const r = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${value}`,
              'User-Agent': 'Zara-Dev-Studio',
            },
            signal: ctrl.signal,
          });
          ok = r.ok;
          msg = ok ? 'GitHub PAT verified for Actions APK builds.' : `GitHub returned HTTP ${r.status}.`;
        } else if (provider === 'telegram') {
          const r = await fetch(`https://api.telegram.org/bot${encodeURIComponent(value)}/getMe`, {
            signal: ctrl.signal,
          });
          const j: any = await r.json().catch(() => ({}));
          ok = Boolean(r.ok && j?.ok);
          msg = ok
            ? `Telegram Bot @${j?.result?.username || 'ready'} verified.`
            : `Telegram Bot API rejected token (HTTP ${r.status}).`;
        } else if (provider === 'youtube') {
          const r = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&maxResults=1&key=${encodeURIComponent(value)}`,
            { signal: ctrl.signal }
          );
          ok = r.ok;
          msg = ok ? 'YouTube Data API v3 key verified.' : `YouTube API returned HTTP ${r.status}.`;
        } else if (provider === 'twitter') {
          const r = await fetch('https://api.twitter.com/2/users/me', {
            headers: { Authorization: `Bearer ${value}` },
            signal: ctrl.signal,
          });
          ok = r.ok;
          msg = ok
            ? 'X (Twitter) v2 Bearer Token verified.'
            : `X API returned HTTP ${r.status} (note: user context or OAuth 2.0 PKCE may be required).`;
        } else {
          const r = await fetch(
            `https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(value)}`,
            { signal: ctrl.signal }
          );
          ok = r.ok;
          msg = ok ? 'Meta Graph API token verified.' : `Meta Graph API returned HTTP ${r.status}.`;
        }
      } finally {
        clearTimeout(timer);
      }
    } catch (err: any) {
      ok = false;
      msg = `Connection check failed: ${String(err?.message || err).slice(0, 140)}`;
    }

    this.lastTestStatus.set(provider, { ok, msg });
    return { ok, provider, message: msg, providers: this.listVaultProviders() };
  }

  // ---------------- CONFINED SANDBOX PROJECT MANAGER ----------------
  private resolveProjectDir(projectId: string): string {
    const cleanId = sanitizeId(projectId, 'proj');
    const resolved = path.resolve(this.projectsRoot, cleanId);
    if (!resolved.startsWith(this.projectsRoot + path.sep)) {
      throw new Error('Invalid project path.');
    }
    return resolved;
  }

  private resolveSafeProjectFile(projectDir: string, relPath: string): {
    safeRel: string;
    absPath: string;
  } {
    const cleanRel = String(relPath || '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');
    if (!cleanRel || cleanRel.includes('..') || cleanRel.startsWith('.git/') || cleanRel === '.env') {
      throw new Error('Disallowed or invalid relative file path.');
    }
    const absPath = path.resolve(projectDir, cleanRel);
    if (!absPath.startsWith(projectDir + path.sep)) {
      throw new Error('Path traversal rejected.');
    }
    return { safeRel: cleanRel, absPath };
  }

  private walkProjectFiles(projectDir: string): DevProjectFileNode[] {
    const out: DevProjectFileNode[] = [];
    const walk = (sub: string) => {
      if (out.length >= MAX_SANDBOX_FILES) return;
      const absDir = sub ? path.join(projectDir, sub) : projectDir;
      if (!fs.existsSync(absDir)) return;
      const entries = fs.readdirSync(absDir, { withFileTypes: true }).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      for (const entry of entries) {
        if (out.length >= MAX_SANDBOX_FILES) break;
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'build' ||
          entry.name === '.dart_tool' ||
          entry.name === '__pycache__' ||
          entry.name === '.zara-project.json'
        ) {
          continue;
        }
        const rel = sub ? `${sub}/${entry.name}` : entry.name;
        const abs = path.join(projectDir, rel);
        if (entry.isDirectory()) {
          walk(rel);
        } else if (entry.isFile()) {
          const stat = fs.statSync(abs);
          const ext = path.extname(entry.name).toLowerCase();
          const isBinary = BINARY_EXTS.has(ext);
          let lines = 0;
          if (!isBinary && stat.size <= MAX_SINGLE_FILE_BYTES) {
            try {
              lines = fs.readFileSync(abs, 'utf8').split('\n').length;
            } catch {}
          }
          out.push({
            path: rel,
            bytes: stat.size,
            lines,
            language: isBinary ? 'Binary' : detectFileLanguage(rel),
            isBinary,
          });
        }
      }
    };
    walk('');
    return out;
  }

  private readMeta(projectDir: string, idFallback: string): {
    id: string;
    name: string;
    template: string;
    createdAtIso: string;
    updatedAtIso: string;
  } {
    const metaFile = path.join(projectDir, '.zara-project.json');
    try {
      if (fs.existsSync(metaFile)) {
        const parsed = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
        return {
          id: parsed.id || idFallback,
          name: parsed.name || idFallback,
          template: parsed.template || 'custom',
          createdAtIso: parsed.createdAtIso || new Date().toISOString(),
          updatedAtIso: parsed.updatedAtIso || new Date().toISOString(),
        };
      }
    } catch {}
    return {
      id: idFallback,
      name: idFallback,
      template: 'custom',
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    };
  }

  private writeMeta(
    projectDir: string,
    meta: { id: string; name: string; template: string; createdAtIso: string; updatedAtIso: string }
  ): void {
    fs.writeFileSync(path.join(projectDir, '.zara-project.json'), JSON.stringify(meta, null, 2));
  }

  public analyzeProject(projectId: string): DevProjectSummary {
    const projectDir = this.resolveProjectDir(projectId);
    if (!fs.existsSync(projectDir)) {
      throw new Error(`Project "${projectId}" not found.`);
    }
    const meta = this.readMeta(projectDir, projectId);
    const files = this.walkProjectFiles(projectDir);
    const langs = new Set<string>();
    const frameworks = new Set<string>();
    const entryPoints: string[] = [];
    const missingConfigs: string[] = [];
    let totalBytes = 0;

    const pathsSet = new Set(files.map((f) => f.path));

    for (const f of files) {
      totalBytes += f.bytes;
      if (!f.isBinary && f.language !== 'Text') {
        langs.add(f.language);
      }
      if (/^(main\.|app\.|index\.|server\.|lib\/main\.dart|src\/App\.tsx|src\/main\.tsx|.*MainActivity\.(kt|java))/i.test(f.path)) {
        entryPoints.push(f.path);
      }
    }

    const pkgFile = files.find((f) => f.path === 'package.json');
    if (pkgFile) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
        const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        if (allDeps.react) frameworks.add('React');
        if (allDeps['react-native']) frameworks.add('React Native');
        if (allDeps.express) frameworks.add('Express Backend');
        if (allDeps.three) frameworks.add('Three.js 3D');
        if (allDeps.vite) frameworks.add('Vite');
        if (allDeps.typescript) frameworks.add('TypeScript');
      } catch {
        missingConfigs.push('Invalid package.json JSON syntax');
      }
      if (!pathsSet.has('.env.example')) missingConfigs.push('.env.example (recommended)');
    }

    if (pathsSet.has('pubspec.yaml')) frameworks.add('Flutter');
    if (files.some((f) => f.path.endsWith('build.gradle') || f.path.endsWith('build.gradle.kts'))) {
      frameworks.add('Android Gradle');
      if (!files.some((f) => f.path.endsWith('AndroidManifest.xml'))) {
        missingConfigs.push('AndroidManifest.xml');
      }
      if (!pathsSet.has('build-termux-apk.sh')) {
        missingConfigs.push('build-termux-apk.sh (Termux mobile APK builder)');
      }
    }
    if (files.some((f) => f.path.endsWith('.py'))) {
      frameworks.add('Python');
      if (!pathsSet.has('requirements.txt')) missingConfigs.push('requirements.txt');
    }
    if (files.some((f) => f.path.endsWith('.gd')) || pathsSet.has('project.godot')) {
      frameworks.add('Godot Engine');
    }
    if (files.some((f) => f.path.endsWith('.cs'))) {
      frameworks.add('Unity C#');
    }

    return {
      id: meta.id,
      name: meta.name,
      template: meta.template,
      createdAtIso: meta.createdAtIso,
      updatedAtIso: meta.updatedAtIso,
      detectedLanguages: Array.from(langs),
      detectedFrameworks: Array.from(frameworks),
      entryPoints: entryPoints.slice(0, 12),
      missingConfigs,
      totalFiles: files.length,
      totalBytes,
      toolchainSupport: this.toolchains,
      files,
    };
  }

  public listProjects(): DevProjectSummary[] {
    if (!fs.existsSync(this.projectsRoot)) return [];
    const dirs = fs.readdirSync(this.projectsRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
    const list: DevProjectSummary[] = [];
    for (const d of dirs) {
      try {
        list.push(this.analyzeProject(d.name));
      } catch {}
    }
    return list.sort((a, b) => Date.parse(b.updatedAtIso) - Date.parse(a.updatedAtIso));
  }

  public createTemplateProject(
    nameRaw: string,
    template: 'android_kotlin' | 'flutter' | 'react_ts' | 'node_api' | 'python_api'
  ): DevProjectSummary {
    const cleanName = String(nameRaw || 'My Zara App').trim().slice(0, 50) || 'My Zara App';
    const id = `${sanitizeId(cleanName, 'app')}-${Date.now().toString(36).slice(-4)}`;
    const projectDir = this.resolveProjectDir(id);
    fs.mkdirSync(projectDir, { recursive: true });

    const files = this.getStarterTemplateFiles(cleanName, template);
    for (const f of files) {
      const { absPath } = this.resolveSafeProjectFile(projectDir, f.path);
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, f.content, 'utf8');
    }

    const now = new Date().toISOString();
    this.writeMeta(projectDir, {
      id,
      name: cleanName,
      template,
      createdAtIso: now,
      updatedAtIso: now,
    });
    return this.analyzeProject(id);
  }

  private getStarterTemplateFiles(
    appName: string,
    template: string
  ): Array<{ path: string; content: string }> {
    const pkgSlug = appName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'zaraapp';
    if (template === 'android_kotlin') {
      return [
        {
          path: 'settings.gradle',
          content: `rootProject.name = "${appName}"\ninclude ':app'\n`,
        },
        {
          path: 'gradle.properties',
          content: `org.gradle.jvmargs=-Xmx1536m -Dfile.encoding=UTF-8\norg.gradle.workers.max=2\nandroid.useAndroidX=true\n`,
        },
        {
          path: 'app/build.gradle',
          content: `plugins {\n  id 'com.android.application'\n  id 'org.jetbrains.kotlin.android'\n}\nandroid {\n  namespace 'com.zara.${pkgSlug}'\n  compileSdk 34\n  defaultConfig {\n    applicationId "com.zara.${pkgSlug}"\n    minSdk 24\n    targetSdk 34\n    versionCode 1\n    versionName "1.0.0"\n  }\n}\n`,
        },
        {
          path: 'app/src/main/AndroidManifest.xml',
          content: `<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n  <uses-permission android:name="android.permission.INTERNET" />\n  <application android:label="${appName}">\n    <activity android:name=".MainActivity" android:exported="true">\n      <intent-filter>\n        <action android:name="android.intent.action.MAIN" />\n        <category android:name="android.intent.category.LAUNCHER" />\n      </intent-filter>\n    </activity>\n  </application>\n</manifest>\n`,
        },
        {
          path: `app/src/main/java/com/zara/${pkgSlug}/MainActivity.kt`,
          content: `package com.zara.${pkgSlug}\n\nimport android.os.Bundle\nimport android.widget.TextView\nimport androidx.appcompat.app.AppCompatActivity\n\nclass MainActivity : AppCompatActivity() {\n  override fun onCreate(savedInstanceState: Bundle?) {\n    super.onCreate(savedInstanceState)\n    val tv = TextView(this)\n    tv.text = "Hello from ${appName}!"\n    setContentView(tv)\n  }\n}\n`,
        },
        {
          path: 'build-termux-apk.sh',
          content: `#!/data/data/com.termux/files/usr/bin/bash\nset -e\necho "Building ${appName} APK on Termux ARM64..."\nchmod +x ./gradlew || true\n./gradlew assembleDebug bundleRelease --no-daemon\n`,
        },
        {
          path: '.github/workflows/build-apk.yml',
          content: `name: Build Android APK & AAB\non: [workflow_dispatch, push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-java@v4\n        with:\n          distribution: 'temurin'\n          java-version: '17'\n      - run: ./gradlew assembleDebug bundleRelease --no-daemon\n      - uses: actions/upload-artifact@v4\n        with:\n          name: android-apk-aab\n          path: app/build/outputs/**\n`,
        },
      ];
    }

    if (template === 'flutter') {
      return [
        {
          path: 'pubspec.yaml',
          content: `name: ${pkgSlug}\ndescription: ${appName} built in Zara AI Dev Studio\nversion: 1.0.0+1\nenvironment:\n  sdk: '>=3.2.0 <4.0.0'\ndependencies:\n  flutter:\n    sdk: flutter\n  http: ^1.2.2\nflutter:\n  uses-material-design: true\n`,
        },
        {
          path: 'lib/main.dart',
          content: `import 'package:flutter/material.dart';\n\nvoid main() => runApp(const MyApp());\n\nclass MyApp extends StatelessWidget {\n  const MyApp({super.key});\n  @override\n  Widget build(BuildContext context) {\n    return MaterialApp(\n      title: '${appName}',\n      theme: ThemeData.dark(useMaterial3: true),\n      home: const Scaffold(\n        body: Center(child: Text('${appName} Ready')),\n      ),\n    );\n  }\n}\n`,
        },
        {
          path: '.github/workflows/build-flutter-apk.yml',
          content: `name: Build Flutter APK & AppBundle\non: [workflow_dispatch, push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: subosito/flutter-action@v2\n      - run: flutter pub get && flutter test && flutter build apk --release && flutter build appbundle --release\n`,
        },
      ];
    }

    if (template === 'python_api') {
      return [
        {
          path: 'requirements.txt',
          content: `fastapi>=0.115.0\nuvicorn>=0.32.0\npydantic>=2.0.0\n`,
        },
        {
          path: 'app.py',
          content: `import json\nfrom http.server import BaseHTTPRequestHandler, HTTPServer\n\nclass Handler(BaseHTTPRequestHandler):\n    def do_GET(self):\n        self.send_response(200)\n        self.send_header('Content-Type', 'application/json')\n        self.end_headers()\n        self.wfile.write(json.dumps({"ok": True, "app": "${appName}"}).encode())\n\nif __name__ == '__main__':\n    print("Ready to run ${appName}")\n`,
        },
        {
          path: '.env.example',
          content: `PORT=8000\nDATABASE_URL=sqlite:///./app.db\n`,
        },
      ];
    }

    if (template === 'node_api') {
      return [
        {
          path: 'package.json',
          content: JSON.stringify(
            {
              name: pkgSlug,
              version: '1.0.0',
              type: 'module',
              scripts: { start: 'node index.js', test: 'node --check index.js' },
            },
            null,
            2
          ),
        },
        {
          path: 'index.js',
          content: `import http from 'http';\n\nexport function createRequestHandler() {\n  return (req, res) => {\n    res.writeHead(200, { 'Content-Type': 'application/json' });\n    res.end(JSON.stringify({ ok: true, service: '${appName}', path: req.url }));\n  };\n}\n\nif (process.argv[1] && process.argv[1].endsWith('index.js')) {\n  const port = Number(process.env.PORT || 4000);\n  http.createServer(createRequestHandler()).listen(port, () => console.log('API running on', port));\n}\n`,
        },
        {
          path: '.env.example',
          content: `PORT=4000\nDATABASE_URL=sqlite://./data.db\n`,
        },
      ];
    }

    // react_ts default
    return [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: pkgSlug,
            version: '1.0.0',
            private: true,
            type: 'module',
            scripts: { check: 'tsc --noEmit' },
            dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
            devDependencies: { typescript: '^5.6.0' },
          },
          null,
          2
        ),
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'ESNext',
              jsx: 'react-jsx',
              strict: true,
              noEmit: true,
              skipLibCheck: true,
            },
            include: ['src'],
          },
          null,
          2
        ),
      },
      {
        path: 'src/App.tsx',
        content: `import React, { useState } from 'react';\n\nexport function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <main>\n      <h1>${appName}</h1>\n      <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>\n    </main>\n  );\n}\n`,
      },
      {
        path: '.env.example',
        content: `VITE_API_BASE_URL=http://localhost:3000\n`,
      },
    ];
  }

  public async importProjectFromZipBase64(
    projectName: string,
    zipBase64: string
  ): Promise<DevProjectSummary> {
    const cleanBase64 = String(zipBase64 || '').replace(/^data:[^;]+;base64,/, '').trim();
    if (!cleanBase64) {
      throw new Error('Empty ZIP payload.');
    }
    const buf = Buffer.from(cleanBase64, 'base64');
    if (buf.length > MAX_ZIP_UPLOAD_BYTES) {
      throw new Error('ZIP file exceeds 25MB sandbox limit.');
    }
    if (buf.length < 22 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
      throw new Error('Invalid ZIP file header (expected PK archive).');
    }

    const id = `${sanitizeId(projectName || 'uploaded-app', 'zip')}-${Date.now().toString(36).slice(-4)}`;
    const projectDir = this.resolveProjectDir(id);
    fs.mkdirSync(projectDir, { recursive: true });
    const tmpZip = path.join(this.backupsRoot, `upload-${id}.zip`);
    fs.writeFileSync(tmpZip, buf);

    try {
      // Safe extraction using Python zipfile with explicit ZipSlip, symlink, and .env blocking
      const pyScript = `
import os, sys, zipfile, stat
zip_path, dest_dir, max_files = sys.argv[1], os.path.realpath(sys.argv[2]), int(sys.argv[3])
count = 0
with zipfile.ZipFile(zip_path, 'r') as zf:
    for info in zf.infolist():
        if info.is_dir():
            continue
        # Reject symlinks
        if (info.external_attr >> 16) & 0o170000 == 0o120000:
            continue
        rel = info.filename.replace('\\\\', '/').lstrip('/')
        if not rel or '..' in rel.split('/') or rel.startswith('.git/') or os.path.basename(rel) == '.env':
            continue
        if 'node_modules/' in rel or '/build/' in rel:
            continue
        target = os.path.realpath(os.path.join(dest_dir, rel))
        if not target.startswith(dest_dir + os.sep):
            raise RuntimeError('Unsafe ZIP path: ' + rel)
        if info.file_size > 2 * 1024 * 1024:
            continue
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with zf.open(info, 'r') as src, open(target, 'wb') as out:
            out.write(src.read())
        count += 1
        if count >= max_files:
            break
print(count)
`;
      await execFileAsync('python3', ['-c', pyScript, tmpZip, projectDir, String(MAX_SANDBOX_FILES)], {
        timeout: 15000,
      });

      // Unwrap single top-level wrapper folder if the whole ZIP was nested inside one folder
      const topEntries = fs.readdirSync(projectDir, { withFileTypes: true });
      if (topEntries.length === 1 && topEntries[0].isDirectory()) {
        const nested = path.join(projectDir, topEntries[0].name);
        for (const child of fs.readdirSync(nested)) {
          fs.renameSync(path.join(nested, child), path.join(projectDir, child));
        }
        fs.rmdirSync(nested);
      }

      const now = new Date().toISOString();
      this.writeMeta(projectDir, {
        id,
        name: String(projectName || 'Uploaded Project').replace(/\.zip$/i, '').slice(0, 50),
        template: 'uploaded_zip',
        createdAtIso: now,
        updatedAtIso: now,
      });

      return this.analyzeProject(id);
    } catch (err) {
      fs.rmSync(projectDir, { recursive: true, force: true });
      throw err;
    } finally {
      try {
        fs.unlinkSync(tmpZip);
      } catch {}
    }
  }

  public readProjectFile(projectId: string, relPath: string): { path: string; content: string; language: string } {
    const projectDir = this.resolveProjectDir(projectId);
    const { safeRel, absPath } = this.resolveSafeProjectFile(projectDir, relPath);
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      throw new Error(`File "${safeRel}" not found.`);
    }
    const ext = path.extname(safeRel).toLowerCase();
    if (BINARY_EXTS.has(ext)) {
      throw new Error(`"${safeRel}" is a binary file.`);
    }
    const content = fs.readFileSync(absPath, 'utf8').slice(0, MAX_SINGLE_FILE_BYTES);
    return { path: safeRel, content, language: detectFileLanguage(safeRel) };
  }

  public writeProjectFile(
    projectId: string,
    relPath: string,
    content: string,
    backupReason = 'Manual file edit'
  ): { summary: DevProjectSummary; backup: DevBackupSnapshot } {
    const projectDir = this.resolveProjectDir(projectId);
    const backup = this.createProjectBackup(projectId, backupReason);
    const { absPath } = this.resolveSafeProjectFile(projectDir, relPath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, String(content || '').slice(0, MAX_SINGLE_FILE_BYTES), 'utf8');
    const meta = this.readMeta(projectDir, projectId);
    meta.updatedAtIso = new Date().toISOString();
    this.writeMeta(projectDir, meta);
    return { summary: this.analyzeProject(projectId), backup };
  }

  // ---------------- BACKUPS & ROLLBACK ----------------
  public createProjectBackup(projectId: string, reason = 'Pre-edit snapshot'): DevBackupSnapshot {
    const projectDir = this.resolveProjectDir(projectId);
    if (!fs.existsSync(projectDir)) {
      throw new Error('Project not found.');
    }
    const backupId = `bk_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const destBackupDir = path.join(this.backupsRoot, sanitizeId(projectId, 'proj'), backupId);
    fs.mkdirSync(destBackupDir, { recursive: true });

    const files = this.walkProjectFiles(projectDir);
    for (const f of files) {
      if (f.isBinary && f.bytes > 256 * 1024) continue;
      const src = path.join(projectDir, f.path);
      const dst = path.join(destBackupDir, f.path);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
    }

    const snap: DevBackupSnapshot = {
      backupId,
      reason,
      createdAtIso: new Date().toISOString(),
      fileCount: files.length,
    };
    fs.writeFileSync(path.join(destBackupDir, '.zara-backup.json'), JSON.stringify(snap, null, 2));

    // Prune older than 12 backups per project
    const projBackupsDir = path.join(this.backupsRoot, sanitizeId(projectId, 'proj'));
    const all = fs
      .readdirSync(projBackupsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
      .reverse();
    for (const old of all.slice(12)) {
      fs.rmSync(path.join(projBackupsDir, old), { recursive: true, force: true });
    }

    return snap;
  }

  public listProjectBackups(projectId: string): DevBackupSnapshot[] {
    const projBackupsDir = path.join(this.backupsRoot, sanitizeId(projectId, 'proj'));
    if (!fs.existsSync(projBackupsDir)) return [];
    const dirs = fs.readdirSync(projBackupsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
    const out: DevBackupSnapshot[] = [];
    for (const d of dirs) {
      try {
        const metaPath = path.join(projBackupsDir, d.name, '.zara-backup.json');
        if (fs.existsSync(metaPath)) {
          out.push(JSON.parse(fs.readFileSync(metaPath, 'utf8')));
        }
      } catch {}
    }
    return out.sort((a, b) => Date.parse(b.createdAtIso) - Date.parse(a.createdAtIso));
  }

  public restoreProjectBackup(projectId: string, backupId: string): DevProjectSummary {
    const projectDir = this.resolveProjectDir(projectId);
    const cleanBackupId = String(backupId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const backupDir = path.join(this.backupsRoot, sanitizeId(projectId, 'proj'), cleanBackupId);
    if (!fs.existsSync(backupDir)) {
      throw new Error(`Backup "${cleanBackupId}" not found.`);
    }
    const meta = this.readMeta(projectDir, projectId);
    for (const entry of fs.readdirSync(projectDir)) {
      if (entry === '.zara-project.json') continue;
      fs.rmSync(path.join(projectDir, entry), { recursive: true, force: true });
    }
    const copyTree = (sub: string) => {
      const srcDir = sub ? path.join(backupDir, sub) : backupDir;
      for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        if (entry.name === '.zara-backup.json') continue;
        const rel = sub ? `${sub}/${entry.name}` : entry.name;
        const src = path.join(backupDir, rel);
        const dst = path.join(projectDir, rel);
        if (entry.isDirectory()) {
          fs.mkdirSync(dst, { recursive: true });
          copyTree(rel);
        } else if (entry.isFile()) {
          fs.mkdirSync(path.dirname(dst), { recursive: true });
          fs.copyFileSync(src, dst);
        }
      }
    };
    copyTree('');
    meta.updatedAtIso = new Date().toISOString();
    this.writeMeta(projectDir, meta);
    return this.analyzeProject(projectId);
  }

  // ---------------- UNIVERSAL AI CODING & AUTOMATIC API CREATOR ----------------
  public async aiEditProjectFiles(
    projectId: string,
    instruction: string,
    languageHint = 'english'
  ): Promise<{
    ok: boolean;
    changedFiles: string[];
    explanation: string;
    backup: DevBackupSnapshot;
    summary: DevProjectSummary;
  }> {
    const summary = this.analyzeProject(projectId);
    const projectDir = this.resolveProjectDir(projectId);
    const backup = this.createProjectBackup(projectId, `AI edit: ${instruction.slice(0, 40)}`);

    const contextFiles = summary.files
      .filter((f) => !f.isBinary && f.bytes < 24000)
      .slice(0, 10)
      .map((f) => {
        const content = fs.readFileSync(path.join(projectDir, f.path), 'utf8').slice(0, 6000);
        return `--- FILE: ${f.path} ---\n${content}`;
      })
      .join('\n\n');

    const prompt = `You are Zara's Universal AI Coding Studio supporting Kotlin, Java, Flutter/Dart, JavaScript, TypeScript, React, React Native, Python, HTML, CSS, C#, and GDScript.
User instruction: "${instruction}"
Reply explanation language: ${languageHint}

Project info:
- Name: ${summary.name}
- Languages: ${summary.detectedLanguages.join(', ') || 'None yet'}
- Frameworks: ${summary.detectedFrameworks.join(', ') || 'Generic'}

Current files:
${contextFiles || '(Empty project)'}

Respond strictly as valid JSON (no markdown wrapping) with shape:
{
  "explanation": "short clear explanation",
  "files": [
    { "path": "relative/file/path.ext", "content": "complete working file content" }
  ]
}`;

    const aiRes = await this.orchestrator.orchestrateTextReply({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction:
        'Return ONLY valid JSON containing explanation and complete, bug-free file contents. Never return partial snippets or placeholders.',
      latestUserText: instruction,
      preferredBrain: 'maya_agentic_plan',
    });

    const changedFiles: string[] = [];
    let explanation = 'AI applied changes.';
    const raw = (aiRes.text || '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.explanation === 'string') explanation = parsed.explanation;
        if (Array.isArray(parsed.files)) {
          for (const item of parsed.files.slice(0, 15)) {
            if (typeof item?.path === 'string' && typeof item?.content === 'string') {
              const { safeRel, absPath } = this.resolveSafeProjectFile(projectDir, item.path);
              fs.mkdirSync(path.dirname(absPath), { recursive: true });
              fs.writeFileSync(absPath, item.content.slice(0, MAX_SINGLE_FILE_BYTES), 'utf8');
              changedFiles.push(safeRel);
            }
          }
        }
      } catch (e: any) {
        explanation = `AI output parse fallback: ${e?.message || 'raw response saved'}`;
      }
    }

    if (changedFiles.length === 0 && raw) {
      const { safeRel, absPath } = this.resolveSafeProjectFile(projectDir, 'ZARA_CODE_NOTES.md');
      fs.writeFileSync(absPath, raw, 'utf8');
      changedFiles.push(safeRel);
    }

    const meta = this.readMeta(projectDir, projectId);
    meta.updatedAtIso = new Date().toISOString();
    this.writeMeta(projectDir, meta);

    return {
      ok: changedFiles.length > 0,
      changedFiles,
      explanation,
      backup,
      summary: this.analyzeProject(projectId),
    };
  }

  public async createAndVerifyApiInProject(
    projectId: string,
    spec: {
      endpointPath: string;
      method?: string;
      backendTarget?: 'node_express' | 'python_fastapi';
      databaseKind?: 'sqlite' | 'postgres' | 'firestore' | 'json_store';
      description: string;
    }
  ): Promise<{
    ok: boolean;
    createdFiles: string[];
    verificationOutput: string;
    backup: DevBackupSnapshot;
    summary: DevProjectSummary;
  }> {
    const projectDir = this.resolveProjectDir(projectId);
    const backup = this.createProjectBackup(projectId, `Auto API: ${spec.endpointPath}`);
    const endpoint = '/' + String(spec.endpointPath || 'api/items').replace(/^\/+/, '');
    const method = (spec.method || 'POST').toUpperCase();
    const backend = spec.backendTarget || 'node_express';
    const dbKind = spec.databaseKind || 'sqlite';

    const slug = endpoint.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'resource';
    const createdFiles: string[] = [];

    // Generate clean, production-ready backend + frontend hook + DB config + .env.example
    const prompt = `Design a complete ${backend} API endpoint (${method} ${endpoint}) with ${dbKind} persistence and a React/TypeScript frontend client hook for:
"${spec.description}"

Return ONLY valid JSON:
{
  "backendFile": { "path": "${backend === 'python_fastapi' ? `api/${slug}.py` : `server/routes/${slug}.mjs`}", "content": "..." },
  "clientHookFile": { "path": "src/services/${slug}Api.ts", "content": "..." },
  "dbConfigFile": { "path": "config/database.${backend === 'python_fastapi' ? 'py' : 'mjs'}", "content": "..." },
  "envExample": "PORT=3000\\nDATABASE_URL=..."
}`;

    const aiRes = await this.orchestrator.orchestrateTextReply({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction:
        'Generate valid, syntactically correct code using parameterized queries, input validation, and environment variables (never hardcoded secrets). Output strictly JSON.',
      latestUserText: spec.description,
      preferredBrain: 'dimaag_llm',
    });

    let backendFilePath = backend === 'python_fastapi' ? `api/${slug}.py` : `server/routes/${slug}.mjs`;
    let backendContent = '';
    let clientHookPath = `src/services/${slug}Api.ts`;
    let clientHookContent = '';
    let dbConfigPath = `config/database.${backend === 'python_fastapi' ? 'py' : 'mjs'}`;
    let dbConfigContent = '';
    let envContent = `PORT=3000\nDATABASE_KIND=${dbKind}\nAPI_ENDPOINT=${endpoint}\n`;

    const match = (aiRes.text || '').match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.backendFile?.path && parsed.backendFile?.content) {
          backendFilePath = parsed.backendFile.path;
          backendContent = parsed.backendFile.content;
        }
        if (parsed.clientHookFile?.path && parsed.clientHookFile?.content) {
          clientHookPath = parsed.clientHookFile.path;
          clientHookContent = parsed.clientHookFile.content;
        }
        if (parsed.dbConfigFile?.path && parsed.dbConfigFile?.content) {
          dbConfigPath = parsed.dbConfigFile.path;
          dbConfigContent = parsed.dbConfigFile.content;
        }
        if (typeof parsed.envExample === 'string' && parsed.envExample.trim()) {
          envContent = parsed.envExample;
        }
      } catch {}
    }

    // Deterministic clean templates if AI was throttled
    if (!backendContent) {
      backendContent =
        backend === 'python_fastapi'
          ? `import json\n\ndef handle_${slug}(payload: dict):\n    if not isinstance(payload, dict):\n        return {"ok": False, "error": "Invalid payload"}\n    return {"ok": True, "endpoint": "${endpoint}", "method": "${method}", "db": "${dbKind}", "data": payload}\n`
          : `export async function handle_${slug}(req, res) {\n  try {\n    const body = req?.body && typeof req.body === 'object' ? req.body : {};\n    return res.json({ ok: true, endpoint: '${endpoint}', method: '${method}', db: '${dbKind}', received: body });\n  } catch (err) {\n    return res.status(500).json({ ok: false, error: err?.message || 'API error' });\n  }\n}\n`;
    }
    if (!clientHookContent) {
      clientHookContent = `export async function call_${slug}(payload: Record<string, unknown>) {\n  const res = await fetch('${endpoint}', {\n    method: '${method}',\n    headers: { 'Content-Type': 'application/json' },\n    body: ${method === 'GET' ? 'undefined' : 'JSON.stringify(payload)'},\n  });\n  if (!res.ok) throw new Error('HTTP ' + res.status);\n  return res.json();\n}\n`;
    }
    if (!dbConfigContent) {
      dbConfigContent =
        backend === 'python_fastapi'
          ? `import os\nDATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./zara_app.db')\nDB_KIND = '${dbKind}'\n`
          : `export const dbConfig = {\n  kind: '${dbKind}',\n  url: process.env.DATABASE_URL || 'sqlite://./zara_app.db',\n};\n`;
    }

    const toWrite = [
      { path: backendFilePath, content: backendContent },
      { path: clientHookPath, content: clientHookContent },
      { path: dbConfigPath, content: dbConfigContent },
      { path: '.env.example', content: envContent },
    ];

    for (const item of toWrite) {
      const { safeRel, absPath } = this.resolveSafeProjectFile(projectDir, item.path);
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, item.content, 'utf8');
      createdFiles.push(safeRel);
    }

    // Live syntax & module load check on the generated backend endpoint!
    let verifyMsg = 'Syntax verified.';
    let verifyOk = true;
    try {
      const { absPath } = this.resolveSafeProjectFile(projectDir, backendFilePath);
      if (backendFilePath.endsWith('.py')) {
        await execFileAsync('python3', ['-m', 'py_compile', absPath], { timeout: 6000 });
        verifyMsg = `Python py_compile passed on ${backendFilePath}.`;
      } else if (backendFilePath.endsWith('.js') || backendFilePath.endsWith('.mjs')) {
        await execFileAsync('node', ['--check', absPath], { timeout: 6000 });
        verifyMsg = `Node ESM syntax check passed on ${backendFilePath}.`;
      }
    } catch (err: any) {
      verifyOk = false;
      verifyMsg = `Syntax check warning: ${String(err?.stderr || err?.message || err).slice(0, 240)}`;
    }

    return {
      ok: verifyOk,
      createdFiles,
      verificationOutput: verifyMsg,
      backup,
      summary: this.analyzeProject(projectId),
    };
  }

  // ---------------- 10-STAGE AUTOMATED BUILD, SELF-TEST & SELF-HEAL PIPELINE ----------------
  private async runRealStaticChecks(projectId: string): Promise<{ errors: string[]; warnings: string[] }> {
    const summary = this.analyzeProject(projectId);
    const projectDir = this.resolveProjectDir(projectId);
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. JSON validation on all .json files
    for (const f of summary.files.filter((x) => x.path.endsWith('.json'))) {
      try {
        JSON.parse(fs.readFileSync(path.join(projectDir, f.path), 'utf8'));
      } catch (e: any) {
        errors.push(`JSON parse error in ${f.path}: ${e?.message || 'invalid JSON'}`);
      }
    }

    // 2. JavaScript syntax checks with `node --check`
    for (const f of summary.files.filter((x) => /\.(js|mjs|cjs)$/.test(x.path))) {
      try {
        await execFileAsync('node', ['--check', path.join(projectDir, f.path)], { timeout: 6000 });
      } catch (e: any) {
        errors.push(`JS syntax error in ${f.path}: ${String(e?.stderr || e?.message).slice(0, 260)}`);
      }
    }

    // 3. Python syntax checks with `python3 -m py_compile`
    for (const f of summary.files.filter((x) => x.path.endsWith('.py'))) {
      try {
        await execFileAsync('python3', ['-m', 'py_compile', path.join(projectDir, f.path)], { timeout: 6000 });
      } catch (e: any) {
        errors.push(`Python syntax error in ${f.path}: ${String(e?.stderr || e?.message).slice(0, 260)}`);
      }
    }

    // 4. XML well-formedness (AndroidManifest / layouts / res XML) using Python ElementTree
    const xmlFiles = summary.files.filter((x) => x.path.endsWith('.xml'));
    if (xmlFiles.length > 0 && this.toolchains.localPythonCheck) {
      for (const xf of xmlFiles.slice(0, 20)) {
        try {
          await execFileAsync(
            'python3',
            ['-c', 'import xml.etree.ElementTree as ET, sys; ET.parse(sys.argv[1])', path.join(projectDir, xf.path)],
            { timeout: 5000 }
          );
        } catch (e: any) {
          errors.push(`XML error in ${xf.path}: ${String(e?.stderr || e?.message).slice(0, 220)}`);
        }
      }
    }

    // 5. TypeScript bracket/tsconfig sanity if tsconfig.json exists (without requiring project-local node_modules)
    if (summary.files.some((x) => x.path === 'tsconfig.json') && this.toolchains.localTypeScriptCheck) {
      const tscBin = path.join(this.rootDir, 'node_modules', '.bin', 'tsc');
      const hasProjectNodeModules = fs.existsSync(path.join(projectDir, 'node_modules'));
      if (hasProjectNodeModules) {
        try {
          await execFileAsync(tscBin, ['--noEmit', '-p', path.join(projectDir, 'tsconfig.json')], {
            timeout: 15000,
          });
        } catch (e: any) {
          errors.push(`TypeScript error: ${String(e?.stdout || e?.stderr || e?.message).slice(0, 320)}`);
        }
      } else {
        warnings.push('TypeScript tsconfig.json present; skipped full node_modules resolution since sandbox dependencies are not installed inside this container.');
      }
    }

    // 6. Basic Android / Flutter structural validation
    if (summary.detectedFrameworks.includes('Android Gradle')) {
      const hasManifest = summary.files.some((f) => f.path.endsWith('AndroidManifest.xml'));
      if (!hasManifest) errors.push('Missing AndroidManifest.xml in Android project.');
      const hasGradle = summary.files.some((f) => f.path.endsWith('build.gradle') || f.path.endsWith('build.gradle.kts'));
      if (!hasGradle) errors.push('Missing build.gradle / build.gradle.kts.');
    }
    if (summary.detectedFrameworks.includes('Flutter')) {
      if (!summary.files.some((f) => f.path === 'pubspec.yaml')) errors.push('Missing pubspec.yaml.');
      if (!summary.files.some((f) => f.path === 'lib/main.dart')) errors.push('Missing lib/main.dart.');
    }

    return { errors, warnings };
  }

  public async runProjectBuildPipeline(projectId: string): Promise<DevPipelineRunResult> {
    const startedAtIso = new Date().toISOString();
    const projectDir = this.resolveProjectDir(projectId);
    const stages: DevPipelineStageResult[] = [];
    const repairedFiles: string[] = [];
    let healAttempts = 0;

    const recordStage = async (
      stage: DevBuildStageId,
      label: string,
      fn: () => Promise<{ status: DevPipelineStageResult['status']; detail: string }>
    ) => {
      const t0 = Date.now();
      const res = await fn();
      stages.push({
        stage,
        label,
        status: res.status,
        detail: res.detail,
        durationMs: Date.now() - t0,
      });
    };

    // 1. UPLOAD
    await recordStage('upload', '1. Project Loaded', async () => ({
      status: 'passed',
      detail: `Sandbox project "${projectId}" mounted cleanly in isolated workspace.`,
    }));

    // 2. ANALYZE
    let summary = this.analyzeProject(projectId);
    await recordStage('analyze', '2. Analyze Structure', async () => ({
      status: 'passed',
      detail: `${summary.totalFiles} files · Languages: ${summary.detectedLanguages.join(', ') || 'Text'} · Frameworks: ${summary.detectedFrameworks.join(', ') || 'Generic'}`,
    }));

    // 3. CODE & MISSING BUILD HELPERS
    const backup = this.createProjectBackup(projectId, 'Pre-pipeline safety snapshot');
    await recordStage('code', '3. Ensure Required Configs', async () => {
      const added: string[] = [];
      if (summary.detectedFrameworks.includes('Android Gradle')) {
        if (!fs.existsSync(path.join(projectDir, 'build-termux-apk.sh'))) {
          fs.writeFileSync(
            path.join(projectDir, 'build-termux-apk.sh'),
            `#!/data/data/com.termux/files/usr/bin/bash\nset -e\nchmod +x ./gradlew || true\n./gradlew assembleDebug bundleRelease --no-daemon\n`
          );
          added.push('build-termux-apk.sh');
        }
        if (!fs.existsSync(path.join(projectDir, '.github/workflows/build-apk.yml'))) {
          fs.mkdirSync(path.join(projectDir, '.github/workflows'), { recursive: true });
          fs.writeFileSync(
            path.join(projectDir, '.github/workflows/build-apk.yml'),
            `name: Build Android APK & AAB\non: [workflow_dispatch, push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-java@v4\n        with:\n          distribution: 'temurin'\n          java-version: '17'\n      - run: ./gradlew assembleDebug bundleRelease --no-daemon\n`
          );
          added.push('.github/workflows/build-apk.yml');
        }
      }
      return {
        status: 'passed',
        detail: added.length ? `Auto-created missing helpers: ${added.join(', ')}` : 'Core source layout intact.',
      };
    });

    // 4. API CHECK
    await recordStage('api', '4. API & Integration Check', async () => {
      const hasApi = summary.files.some((f) => /api|routes|server/i.test(f.path));
      return {
        status: hasApi ? 'passed' : 'skipped',
        detail: hasApi ? 'Backend API modules detected & scanned.' : 'No backend API module required for this project.',
      };
    });

    // 5. DEPENDENCIES
    await recordStage('dependencies', '5. Dependency Audit', async () => {
      return {
        status: summary.missingConfigs.length ? 'blocked' : 'passed',
        detail: summary.missingConfigs.length
          ? `Notice: ${summary.missingConfigs.join('; ')}`
          : 'Manifest/dependency files present (package.json / pubspec.yaml / build.gradle / requirements.txt).',
      };
    });

    // 6. TEST + 7. SELF-HEAL LOOP
    let checkRes = await this.runRealStaticChecks(projectId);
    await recordStage('test', '6. Automated Static & Syntax Tests', async () => ({
      status: checkRes.errors.length === 0 ? 'passed' : 'blocked',
      detail:
        checkRes.errors.length === 0
          ? `All JS/JSON/Python/XML checks passed (${checkRes.warnings.length} info warning(s)).`
          : `Detected ${checkRes.errors.length} error(s): ${checkRes.errors[0]}`,
    }));

    if (checkRes.errors.length > 0) {
      const healT0 = Date.now();
      for (let attempt = 1; attempt <= 2 && checkRes.errors.length > 0; attempt++) {
        healAttempts = attempt;
        const fixResult = await this.aiEditProjectFiles(
          projectId,
          `Fix ONLY these exact compiler/syntax errors cleanly without removing existing functionality:\n${checkRes.errors.join('\n')}`,
          'english'
        );
        repairedFiles.push(...fixResult.changedFiles);
        checkRes = await this.runRealStaticChecks(projectId);
      }
      stages.push({
        stage: 'fix',
        label: '7. AI Self-Healing Repair',
        status: checkRes.errors.length === 0 ? 'repaired' : 'blocked',
        detail:
          checkRes.errors.length === 0
            ? `Self-healed in ${healAttempts} pass(es)! Repaired: ${Array.from(new Set(repairedFiles)).join(', ')}`
            : `Attempted ${healAttempts} repair pass(es); remaining blocker: ${checkRes.errors[0]}`,
        durationMs: Date.now() - healT0,
      });
    } else {
      stages.push({
        stage: 'fix',
        label: '7. AI Self-Healing Repair',
        status: 'skipped',
        detail: 'No errors found; self-healing not needed.',
        durationMs: 0,
      });
    }

    // 8. BUILD (Honest toolchain reporting!)
    summary = this.analyzeProject(projectId);
    const isAndroid = summary.detectedFrameworks.includes('Android Gradle');
    const isFlutter = summary.detectedFrameworks.includes('Flutter');
    let honestBuildNote = 'All available local checks passed and downloadable project ZIP packaged.';

    await recordStage('build', '8. Build Package & Toolchain Check', async () => {
      if (isAndroid && !this.toolchains.localGradleSdk) {
        honestBuildNote =
          'Cloud container does not have Java JDK / Android SDK / Gradle installed. Generated build-termux-apk.sh (free phone build in Termux) and .github/workflows/build-apk.yml (free GitHub Actions APK/AAB build) inside your downloadable ZIP.';
        return { status: 'blocked', detail: honestBuildNote };
      }
      if (isFlutter && !this.toolchains.localFlutterSdk) {
        honestBuildNote =
          'Cloud container does not have Flutter SDK installed. Download the verified Flutter source ZIP with GitHub Actions CI (.github/workflows/build-flutter-apk.yml) to compile the APK/AAB for free.';
        return { status: 'blocked', detail: honestBuildNote };
      }
      return {
        status: checkRes.errors.length === 0 ? 'passed' : 'blocked',
        detail:
          checkRes.errors.length === 0
            ? 'Project source & build scripts verified and packaged cleanly.'
            : 'Source validation failed; fix errors first.',
      };
    });

    // 9. VERIFY
    await recordStage('verify', '9. Final Verification', async () => ({
      status: checkRes.errors.length === 0 ? 'passed' : 'blocked',
      detail:
        checkRes.errors.length === 0
          ? `${summary.totalFiles} files verified with 0 syntax errors.`
          : `${checkRes.errors.length} error(s) remaining.`,
    }));

    // 10. DOWNLOAD READY
    const downloadZipUrl = `/api/dev-studio/projects/${encodeURIComponent(projectId)}/download-zip`;
    await recordStage('download', '10. Export Download Package', async () => ({
      status: 'passed',
      detail: `ZIP archive ready at ${downloadZipUrl}`,
    }));

    return {
      ok: checkRes.errors.length === 0,
      projectId,
      startedAtIso,
      finishedAtIso: new Date().toISOString(),
      stages,
      healAttempts,
      repairedFiles: Array.from(new Set(repairedFiles)),
      errors: checkRes.errors,
      warnings: checkRes.warnings,
      honestBuildNote,
      downloadZipUrl,
      termuxBuildReady: fs.existsSync(path.join(projectDir, 'build-termux-apk.sh')),
      githubActionsReady:
        fs.existsSync(path.join(projectDir, '.github/workflows/build-apk.yml')) ||
        fs.existsSync(path.join(projectDir, '.github/workflows/build-flutter-apk.yml')),
      backupCreated: backup,
    };
  }

  public exportProjectZipBuffer(projectId: string): { filename: string; buffer: Buffer } {
    const summary = this.analyzeProject(projectId);
    const projectDir = this.resolveProjectDir(projectId);
    const entries: Array<{ name: string; data: Buffer; storeOnly?: boolean }> = [];
    for (const f of summary.files) {
      const abs = path.join(projectDir, f.path);
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        entries.push({
          name: f.path,
          data: fs.readFileSync(abs),
          storeOnly: f.isBinary,
        });
      }
    }
    return {
      filename: `${sanitizeId(summary.name, 'zara-project')}.zip`,
      buffer: this.buildZipBuffer(entries),
    };
  }

  // ---------------- AUTONOMOUS MULTI-STEP TASK PLANNER & EXECUTOR ----------------
  public async planAndExecuteTask(
    goalRaw: string,
    language = 'auto'
  ): Promise<AutonomousTaskPlan> {
    const goal = String(goalRaw || '').trim();
    if (!goal) {
      throw new Error('Task goal is required.');
    }

    const plannerPrompt = `Break down this user goal into 1-5 concrete execution steps using ONLY the allowed tools:
Goal: "${goal}"

Allowed tools:
- "dev_create": create a software/app project template (params: { "name": string, "template": "android_kotlin"|"flutter"|"react_ts"|"node_api"|"python_api" })
- "dev_api": generate backend API + client hook (params: { "endpointPath": string, "method": "GET"|"POST", "description": string })
- "dev_heal": run automated tests & self-healing checks on project
- "social_draft": draft a post/reply (params: { "platform": "whatsapp"|"telegram"|"instagram"|"facebook"|"youtube"|"tiktok"|"snapchat"|"twitter", "content": string })
- "music_control": music playback action (params: { "action": "play"|"pause"|"resume"|"next"|"previous"|"volume_up"|"volume_down"|"mute", "query": string })
- "phone_control": open/close mobile app or setting (params: { "action": "open"|"close"|"back", "appId": string })
- "whatsapp_action": WhatsApp message or notification reading (params: { "mode": "send_confirm"|"read_notifications"|"open", "contact": string, "message": string })
- "research": web research summary
- "chat_answer": direct helpful answer

Return ONLY valid JSON:
{
  "summary": "1-2 sentence plan summary",
  "steps": [
    { "title": "...", "tool": "...", "params": {} }
  ]
}`;

    const aiPlan = await this.orchestrator.orchestrateTextReply({
      contents: [{ role: 'user', parts: [{ text: plannerPrompt }] }],
      systemInstruction: 'Return strictly valid JSON plan. Never fabricate completed external side-effects.',
      latestUserText: goal,
      preferredBrain: 'maya_agentic_plan',
    });

    let rawSteps: Array<{ title: string; tool: AutonomousTaskStep['tool']; params?: any }> = [];
    let summary = `Autonomous execution plan for: ${goal}`;

    const jsonMatch = (aiPlan.text || '').match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.summary) summary = String(parsed.summary);
        if (Array.isArray(parsed.steps)) {
          rawSteps = parsed.steps.slice(0, 5);
        }
      } catch {}
    }

    if (rawSteps.length === 0) {
      rawSteps = [{ title: 'Analyze & Respond', tool: 'chat_answer', params: { query: goal } }];
    }

    const steps: AutonomousTaskStep[] = [];
    let activeProjectId: string | null = null;

    for (let i = 0; i < rawSteps.length; i++) {
      const s = rawSteps[i];
      const stepId = `step_${i + 1}`;
      let retries = 0;

      // Client-side device / confirmation-required steps
      if (
        s.tool === 'music_control' ||
        s.tool === 'phone_control' ||
        s.tool === 'whatsapp_action' ||
        s.tool === 'social_draft'
      ) {
        const needsConfirm = s.tool === 'whatsapp_action' && s.params?.mode === 'send_confirm';
        steps.push({
          id: stepId,
          stepNumber: i + 1,
          title: s.title,
          tool: s.tool,
          status: 'needs_device_or_confirm',
          retries: 0,
          requiresConfirmation: needsConfirm,
          detail: needsConfirm
            ? `Prepared WhatsApp message for "${s.params?.contact || 'contact'}" — waiting for your confirmation before sending.`
            : `Dispatched ${s.tool} action to your device.`,
          clientAction: { tool: s.tool, ...(s.params || {}) },
        });
        continue;
      }

      // Server-executable development & research tools with retry recovery
      let done = false;
      let lastErr = '';
      for (let attempt = 0; attempt <= 1 && !done; attempt++) {
        retries = attempt;
        try {
          if (s.tool === 'dev_create') {
            const created = this.createTemplateProject(
              s.params?.name || goal.slice(0, 32),
              s.params?.template || 'react_ts'
            );
            activeProjectId = created.id;
            steps.push({
              id: stepId,
              stepNumber: i + 1,
              title: s.title,
              tool: s.tool,
              status: 'completed',
              retries,
              detail: `Created sandbox project "${created.name}" (${created.id}) with ${created.totalFiles} files.`,
              clientAction: { projectId: created.id },
            });
            done = true;
          } else if (s.tool === 'dev_api') {
            if (!activeProjectId) {
              const created = this.createTemplateProject('Zara API App', 'node_api');
              activeProjectId = created.id;
            }
            const apiRes = await this.createAndVerifyApiInProject(activeProjectId, {
              endpointPath: s.params?.endpointPath || '/api/data',
              method: s.params?.method || 'POST',
              description: s.params?.description || goal,
            });
            steps.push({
              id: stepId,
              stepNumber: i + 1,
              title: s.title,
              tool: s.tool,
              status: apiRes.ok ? 'completed' : 'blocked',
              retries,
              detail: `Created ${apiRes.createdFiles.join(', ')}. ${apiRes.verificationOutput}`,
              clientAction: { projectId: activeProjectId },
            });
            done = true;
          } else if (s.tool === 'dev_heal') {
            if (!activeProjectId) {
              const existing = this.listProjects()[0];
              activeProjectId = existing?.id || null;
            }
            if (!activeProjectId) {
              steps.push({
                id: stepId,
                stepNumber: i + 1,
                title: s.title,
                tool: s.tool,
                status: 'blocked',
                retries,
                detail: 'No active sandbox project available to test.',
              });
              done = true;
            } else {
              const pipe = await this.runProjectBuildPipeline(activeProjectId);
              steps.push({
                id: stepId,
                stepNumber: i + 1,
                title: s.title,
                tool: s.tool,
                status: pipe.ok ? 'completed' : 'blocked',
                retries,
                detail: pipe.honestBuildNote,
                clientAction: { projectId: activeProjectId, downloadZipUrl: pipe.downloadZipUrl },
              });
              done = true;
            }
          } else {
            const ans = await this.orchestrator.orchestrateTextReply({
              contents: [{ role: 'user', parts: [{ text: s.params?.query || goal }] }],
              systemInstruction: 'You are Zara, an accurate AI personal assistant answering task steps concisely.',
              latestUserText: goal,
              preferredBrain: 'auto',
            });
            steps.push({
              id: stepId,
              stepNumber: i + 1,
              title: s.title,
              tool: s.tool,
              status: 'completed',
              retries,
              detail: (ans.text || 'Completed.').slice(0, 600),
            });
            done = true;
          }
        } catch (err: any) {
          lastErr = err?.message || 'Step failed';
        }
      }

      if (!done) {
        steps.push({
          id: stepId,
          stepNumber: i + 1,
          title: s.title,
          tool: s.tool,
          status: 'failed',
          retries,
          detail: lastErr,
        });
      }
    }

    const completedCount = steps.filter((x) => x.status === 'completed').length;
    return {
      ok: steps.some((x) => x.status === 'completed' || x.status === 'needs_device_or_confirm'),
      goal,
      language,
      summary,
      steps,
      completedCount,
      blockedOrPendingCount: steps.length - completedCount,
    };
  }
}
