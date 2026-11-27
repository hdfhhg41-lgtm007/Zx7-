// Permanent 4-Layer Owner-Isolated Chat & Memory Vault
// (Owner-Scoped localStorage + IndexedDB + Authenticated Server Vault + Firestore OwnerVault)
// & Wakeup-Aware API Fetch Client with Zero-Trust Owner Auth Headers

import { ChatMessage, MemoryItem } from '../types';
import {
  getOwnerAuthHeaders,
  getOwnerAuthSnapshot,
  loadOwnerVaultFromFirestore,
  syncOwnerVaultToFirestore,
} from './ownerAuthService';

const VAULT_ID_STORAGE_KEY = 'zara_device_vault_id_v1';
const VAULT_ID_COOKIE_NAME = 'zara_vid';
const IDB_NAME = 'ZaraPermanentVaultDB';
const IDB_VERSION = 1;
const IDB_STORE = 'kv_vault';

const IDB_LEGACY_CHAT_KEY = 'chat_messages_v3';
const IDB_LEGACY_MEMORIES_KEY = 'memories_v3';
const IDB_DEVICE_ID_KEY = 'device_vault_id_v1';

const LEGACY_SHADOW_BACKUP_KEY = 'zara_chat_vault_backup_v3';

function getOwnerScopedShadowKey(uid: string): string {
  return `zara_owner_private_chat_shadow_v4_${uid}`;
}

function getOwnerScopedIdbChatKey(uid: string): string {
  return `owner_chat_v4_${uid}`;
}

function getOwnerScopedIdbMemoriesKey(uid: string): string {
  return `owner_memories_v4_${uid}`;
}

function readCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const parts = document.cookie.split(';');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith(`${name}=`)) {
        return decodeURIComponent(trimmed.slice(name.length + 1));
      }
    }
  } catch {}
  return null;
}

function writeVaultCookie(vaultId: string): void {
  if (typeof document === 'undefined' || !vaultId) return;
  try {
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${VAULT_ID_COOKIE_NAME}=${encodeURIComponent(
      vaultId
    )}; Path=/; Max-Age=34560000; SameSite=Lax${secureFlag}`;
  } catch {}
}

function generateSecureVaultId(): string {
  const parts: string[] = ['zv'];
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    parts.push(crypto.randomUUID().replace(/-/g, ''));
  } else {
    parts.push(
      `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}${Math.random()
        .toString(36)
        .slice(2, 14)}`
    );
  }
  return parts.join('_').slice(0, 64);
}

function openVaultIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openVaultIndexedDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as T) ?? null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openVaultIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openVaultIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

let cachedVaultId: string | null = null;

export async function getOrCreateDeviceVaultId(): Promise<string> {
  if (cachedVaultId && /^[a-zA-Z0-9_-]{24,80}$/.test(cachedVaultId)) {
    return cachedVaultId;
  }

  let candidate: string | null = null;
  try {
    candidate = localStorage.getItem(VAULT_ID_STORAGE_KEY);
  } catch {}

  if (!candidate || !/^[a-zA-Z0-9_-]{24,80}$/.test(candidate)) {
    const fromCookie = readCookieValue(VAULT_ID_COOKIE_NAME);
    if (fromCookie && /^[a-zA-Z0-9_-]{24,80}$/.test(fromCookie)) {
      candidate = fromCookie;
    }
  }

  if (!candidate || !/^[a-zA-Z0-9_-]{24,80}$/.test(candidate)) {
    const fromIdb = await idbGet<string>(IDB_DEVICE_ID_KEY);
    if (fromIdb && /^[a-zA-Z0-9_-]{24,80}$/.test(fromIdb)) {
      candidate = fromIdb;
    }
  }

  if (!candidate || !/^[a-zA-Z0-9_-]{24,80}$/.test(candidate)) {
    candidate = generateSecureVaultId();
  }

  cachedVaultId = candidate;
  try {
    localStorage.setItem(VAULT_ID_STORAGE_KEY, candidate);
  } catch {}
  writeVaultCookie(candidate);
  await idbSet(IDB_DEVICE_ID_KEY, candidate);

  return candidate;
}

export function saveShadowChatBackupSync(messages: ChatMessage[]): void {
  const snap = getOwnerAuthSnapshot();
  if (!snap.isOwnerVerified || !snap.signedInUid) return;
  try {
    const compact = messages.slice(-260).map((m) =>
      m.imageUrl ? { ...m, imageUrl: undefined } : m
    );
    localStorage.setItem(getOwnerScopedShadowKey(snap.signedInUid), JSON.stringify(compact));
  } catch {}
}

export function loadShadowChatBackupSync(): ChatMessage[] | null {
  const snap = getOwnerAuthSnapshot();
  if (!snap.isOwnerVerified || !snap.signedInUid) return null;
  try {
    const raw = localStorage.getItem(getOwnerScopedShadowKey(snap.signedInUid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return null;
}

let serverSyncTimer: number | null = null;
let latestCachedOwnerMemories: MemoryItem[] | undefined;

export function persistChatToDurableLayers(messages: ChatMessage[]): void {
  if (typeof window === 'undefined' || !Array.isArray(messages) || messages.length === 0) return;
  const snap = getOwnerAuthSnapshot();
  if (!snap.isOwnerVerified || !snap.signedInUid) return;

  // 1. Synchronous owner-scoped shadow backup in localStorage
  saveShadowChatBackupSync(messages);

  // 2. High-capacity owner-scoped IndexedDB mirror (keeps up to 1,000 messages)
  const idbCopy = messages.slice(-1000);
  let imgKept = 0;
  const idbOptimized: ChatMessage[] = new Array(idbCopy.length);
  for (let i = idbCopy.length - 1; i >= 0; i--) {
    const msg = idbCopy[i];
    if (msg.imageUrl) {
      imgKept++;
      idbOptimized[i] = imgKept <= 15 ? msg : { ...msg, imageUrl: undefined };
    } else {
      idbOptimized[i] = msg;
    }
  }
  idbSet(getOwnerScopedIdbChatKey(snap.signedInUid), idbOptimized).catch(() => {});

  // 3. Debounced authenticated Server Vault + Firestore OwnerVault sync
  if (serverSyncTimer) {
    window.clearTimeout(serverSyncTimer);
  }
  serverSyncTimer = window.setTimeout(() => {
    syncVaultToServerNow(messages, latestCachedOwnerMemories).catch(() => {});
  }, 1800);
}

export function persistMemoriesToDurableLayers(memories: MemoryItem[]): void {
  if (typeof window === 'undefined' || !Array.isArray(memories)) return;
  const snap = getOwnerAuthSnapshot();
  if (!snap.isOwnerVerified || !snap.signedInUid) return;

  latestCachedOwnerMemories = memories.slice(0, 500);
  idbSet(getOwnerScopedIdbMemoriesKey(snap.signedInUid), latestCachedOwnerMemories).catch(
    () => {}
  );
}

async function syncVaultToServerNow(
  messages: ChatMessage[],
  memories?: MemoryItem[]
): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const snap = getOwnerAuthSnapshot();
  if (!snap.isOwnerVerified || !snap.signedInUid) return;

  try {
    const [vaultId, authHeaders] = await Promise.all([
      getOrCreateDeviceVaultId(),
      getOwnerAuthHeaders(),
    ]);
    if (!authHeaders.Authorization) return;

    const cleanMessages = messages.slice(-500).map((m) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp,
      createdAtMs: m.createdAtMs,
      language: m.language,
    }));

    await Promise.allSettled([
      fetch('/api/vault/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          vaultId,
          messages: cleanMessages,
          ...(memories ? { memories: memories.slice(0, 300) } : {}),
        }),
      }),
      syncOwnerVaultToFirestore(cleanMessages, memories || []),
    ]);
  } catch {}
}

export function mergeChatMessageHistories(
  ...lists: Array<ChatMessage[] | null | undefined>
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const m of list) {
      if (!m || !m.id || typeof m.text !== 'string' || !m.text.trim()) continue;
      const existing = byId.get(m.id);
      if (!existing) {
        byId.set(m.id, m);
      } else if (!existing.imageUrl && m.imageUrl) {
        byId.set(m.id, { ...existing, imageUrl: m.imageUrl });
      }
    }
  }

  const all = Array.from(byId.values());
  all.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
  return all.slice(-1000);
}

export function mergeMemoryLists(
  ...lists: Array<MemoryItem[] | null | undefined>
): MemoryItem[] {
  const byId = new Map<string, MemoryItem>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || !item.id || !item.details) continue;
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }
  }
  const all = Array.from(byId.values());
  all.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  return all.slice(0, 500);
}

/**
 * Reconciles Owner-scoped localStorage + IndexedDB + Authenticated Server Vault + Firestore OwnerVault
 * EXCLUSIVELY when the verified App Owner (hdfhhg41@gmail.com) is authenticated and unlocked.
 * Returns empty results immediately for any Guest / non-owner session.
 */
export async function reconcileDurableChatVault(
  currentMessages: ChatMessage[],
  currentMemories: MemoryItem[]
): Promise<{
  mergedMessages: ChatMessage[];
  mergedMemories: MemoryItem[];
  restoredCount: number;
}> {
  const snap = getOwnerAuthSnapshot();
  if (!snap.isOwnerVerified || !snap.signedInUid) {
    return {
      mergedMessages: [],
      mergedMemories: [],
      restoredCount: 0,
    };
  }

  const uid = snap.signedInUid;
  const shadowMsgs = loadShadowChatBackupSync();

  // One-time migration of any legacy pre-v4 owner data on the owner's device, then scrub legacy unscoped keys
  let legacyLocalMsgs: ChatMessage[] | null = null;
  let legacyLocalMems: MemoryItem[] | null = null;
  try {
    const rawLegacyChat =
      localStorage.getItem('zara_100day_chat_history_v2') ||
      localStorage.getItem('zara_long_term_chat_v2') ||
      localStorage.getItem(LEGACY_SHADOW_BACKUP_KEY);
    if (rawLegacyChat) {
      const parsed = JSON.parse(rawLegacyChat);
      if (Array.isArray(parsed)) legacyLocalMsgs = parsed;
    }
    const rawLegacyMem = localStorage.getItem('zara_100day_memories_v2');
    if (rawLegacyMem) {
      const parsed = JSON.parse(rawLegacyMem);
      if (Array.isArray(parsed)) legacyLocalMems = parsed;
    }
    localStorage.removeItem('zara_100day_chat_history_v2');
    localStorage.removeItem('zara_long_term_chat_v2');
    localStorage.removeItem(LEGACY_SHADOW_BACKUP_KEY);
    localStorage.removeItem('zara_100day_memories_v2');
  } catch {}

  const [idbMsgs, idbMems, legacyIdbMsgs, legacyIdbMems, vaultId, authHeaders, firestoreVault] =
    await Promise.all([
      idbGet<ChatMessage[]>(getOwnerScopedIdbChatKey(uid)),
      idbGet<MemoryItem[]>(getOwnerScopedIdbMemoriesKey(uid)),
      idbGet<ChatMessage[]>(IDB_LEGACY_CHAT_KEY),
      idbGet<MemoryItem[]>(IDB_LEGACY_MEMORIES_KEY),
      getOrCreateDeviceVaultId(),
      getOwnerAuthHeaders(),
      loadOwnerVaultFromFirestore(),
    ]);

  if (legacyIdbMsgs) {
    await idbDelete(IDB_LEGACY_CHAT_KEY);
  }
  if (legacyIdbMems) {
    await idbDelete(IDB_LEGACY_MEMORIES_KEY);
  }

  let serverMsgs: ChatMessage[] | null = null;
  let serverMems: MemoryItem[] | null = null;

  if (authHeaders.Authorization) {
    try {
      const res = await fetch(`/api/vault/restore?vaultId=${encodeURIComponent(vaultId)}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        headers: authHeaders,
      });
      if (res.ok && res.headers.get('x-zara-app') === 'ready') {
        const data = await res.json();
        if (Array.isArray(data.messages)) serverMsgs = data.messages;
        if (Array.isArray(data.memories)) serverMems = data.memories;
      }
    } catch {}
  }

  const mergedMessages = mergeChatMessageHistories(
    currentMessages,
    shadowMsgs,
    idbMsgs,
    legacyLocalMsgs,
    legacyIdbMsgs,
    firestoreVault?.messages,
    serverMsgs
  );
  const mergedMemories = mergeMemoryLists(
    currentMemories,
    idbMems,
    legacyLocalMems,
    legacyIdbMems,
    firestoreVault?.memories,
    serverMems
  );
  const restoredCount = Math.max(0, mergedMessages.length - currentMessages.length);

  if (mergedMessages.length > 0) {
    saveShadowChatBackupSync(mergedMessages);
    await idbSet(getOwnerScopedIdbChatKey(uid), mergedMessages.slice(-1000));
    latestCachedOwnerMemories = mergedMemories;
    syncVaultToServerNow(mergedMessages, mergedMemories).catch(() => {});
  }
  if (mergedMemories.length > 0) {
    latestCachedOwnerMemories = mergedMemories;
    await idbSet(getOwnerScopedIdbMemoriesKey(uid), mergedMemories);
  }

  return {
    mergedMessages,
    mergedMemories,
    restoredCount,
  };
}

// ======================== WAKEUP-AWARE API CLIENT (WITH AUTOMATIC OWNER AUTH HEADERS) ========================

function isWarmupOrGatewayResponse(res: Response): boolean {
  if (res.status === 502 || res.status === 503 || res.status === 504) return true;
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const isZaraBackend = res.headers.get('x-zara-app') === 'ready';
  if (!isZaraBackend && contentType.includes('text/html')) {
    return true;
  }
  return false;
}

export async function waitUntilServerAwake(maxPolls = 5, intervalMs = 1500): Promise<boolean> {
  for (let i = 0; i < maxPolls; i++) {
    try {
      const probe = await fetch(`/api/health?_wake=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });
      if (probe.status === 200) {
        if (probe.headers.get('x-zara-app') === 'ready') {
          return true;
        }
        try {
          const data = await probe.json();
          if (data && (data.service === 'zara' || data.ok === true)) {
            return true;
          }
        } catch {}
      }
    } catch {}
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

/**
 * Wraps fetch() for /api/* calls:
 * 1. Automatically attaches cryptographic Firebase Owner Bearer token (when verified & unlocked)
 *    or X-Zara-Guest-Lock: 1 (when Guest-Safe Lock is active).
 * 2. Rides through Cloud Run container cold-starts seamlessly without page reloads.
 */
export async function fetchWithContainerWakeup(
  input: string,
  init?: RequestInit,
  options?: {
    maxWakeRetries?: number;
    onWakingUp?: () => void;
  }
): Promise<Response> {
  const maxRetries = options?.maxWakeRetries ?? 3;
  let lastErr: unknown = null;

  const ownerHeaders = await getOwnerAuthHeaders();
  const mergedHeaders: Record<string, string> = {
    ...ownerHeaders,
  };
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => {
        mergedHeaders[k] = v;
      });
    } else if (Array.isArray(init.headers)) {
      for (const [k, v] of init.headers) {
        mergedHeaders[k] = v;
      }
    } else {
      Object.assign(mergedHeaders, init.headers as Record<string, string>);
    }
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(input, {
        ...init,
        headers: mergedHeaders,
        credentials: init?.credentials || 'include',
      });

      if (!isWarmupOrGatewayResponse(res)) {
        return res;
      }

      if (attempt < maxRetries) {
        options?.onWakingUp?.();
        await waitUntilServerAwake(3, 1400 + attempt * 500);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        options?.onWakingUp?.();
        await new Promise((r) => setTimeout(r, 1400 + attempt * 700));
        await waitUntilServerAwake(2, 1200);
        continue;
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Network request failed during wakeup');
}
