import { AuthorizedFileFolder, AuthorizedFileItem, Language, MemoryItem } from '../types';
import { getOwnerAuthHeaders } from './ownerAuthService';

const DB_NAME = 'zara_authorized_files_db_v1';
const STORE_NAME = 'authorized_files';

function openFilesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open files DB'));
  });
}

export async function loadAuthorizedFiles(): Promise<AuthorizedFileItem[]> {
  try {
    const db = await openFilesDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = Array.isArray(req.result) ? (req.result as AuthorizedFileItem[]) : [];
        items.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
        resolve(items);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveAuthorizedFile(item: AuthorizedFileItem): Promise<void> {
  const db = await openFilesDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed saving file'));
  });
}

export async function deleteAuthorizedFileById(id: string): Promise<void> {
  const db = await openFilesDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed deleting file'));
  });
}

export function inferFolderForFile(name: string, mimeType: string): AuthorizedFileFolder {
  const lower = name.toLowerCase();
  if (/\.(ts|tsx|js|jsx|py|kt|java|html|css|sql|sh|json|yml|yaml|xml)$/.test(lower)) {
    return 'Code';
  }
  if (/\.(png|jpg|jpeg|webp|gif|mp3|wav|mp4|webm)$/.test(lower) || mimeType.startsWith('image/') || mimeType.startsWith('audio/')) {
    return 'Media';
  }
  if (/\.(md|txt|note)$/.test(lower)) {
    return 'Notes';
  }
  if (/\.(pdf|doc|docx|csv|xlsx|xls|ppt|pptx|rtf)$/.test(lower)) {
    return 'Documents';
  }
  return 'Work';
}

export async function ingestBrowserFileToAuthorizedVault(
  file: File,
  folderOverride?: AuthorizedFileFolder
): Promise<AuthorizedFileItem> {
  const mimeType = file.type || 'application/octet-stream';
  const isTextLike =
    mimeType.startsWith('text/') ||
    /\.(txt|md|json|csv|ts|tsx|js|jsx|py|kt|java|html|css|xml|yaml|yml|log|env|sh|sql)$/i.test(
      file.name
    );
  const isImage = mimeType.startsWith('image/');

  let textContent: string | undefined;
  let imagePreviewDataUrl: string | undefined;

  if (isTextLike && file.size <= 512_000) {
    textContent = await file.text();
  } else if (isImage && file.size <= 4_500_000) {
    imagePreviewDataUrl = await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });
  } else if (!isImage) {
    textContent = `[Binary / Document File: ${file.name} (${mimeType}, ${formatBytes(file.size)}). Upload text/markdown/code/CSV/image for full inline reading, or inspect via connected PC Companion.]`;
  }

  const now = Date.now();
  const item: AuthorizedFileItem = {
    id: `file-${now}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    folder: folderOverride || inferFolderForFile(file.name, mimeType),
    mimeType,
    sizeBytes: file.size,
    textContent: textContent?.slice(0, 60_000),
    imagePreviewDataUrl,
    sourceKind: 'picker',
    addedAtMs: now,
    updatedAtMs: now,
  };
  await saveAuthorizedFile(item);
  return item;
}

export async function importDirectoryWithFileSystemApi(): Promise<{
  supported: boolean;
  added: AuthorizedFileItem[];
  cancelled?: boolean;
  error?: string;
}> {
  const pickerFn = (window as any).showDirectoryPicker;
  if (typeof pickerFn !== 'function') {
    return {
      supported: false,
      added: [],
      error: 'Directory Picker API is unavailable in this browser — use "Add Authorized Files" instead.',
    };
  }
  try {
    const dirHandle = await pickerFn({ mode: 'read' });
    const added: AuthorizedFileItem[] = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && added.length < 30) {
        const f = await entry.getFile();
        if (f.size <= 5_000_000) {
          const item = await ingestBrowserFileToAuthorizedVault(f);
          item.sourceKind = 'fs_handle';
          await saveAuthorizedFile(item);
          added.push(item);
        }
      }
    }
    return { supported: true, added };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { supported: true, added: [], cancelled: true };
    }
    return { supported: true, added: [], error: err?.message || 'Folder authorization failed.' };
  }
}

export async function getRealStorageQuotaSummary(): Promise<{
  usedBytes: number;
  quotaBytes: number;
  persisted: boolean;
}> {
  let usedBytes = 0;
  let quotaBytes = 0;
  let persisted = false;
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      usedBytes = est.usage || 0;
      quotaBytes = est.quota || 0;
    }
    if (navigator.storage?.persisted) {
      persisted = await navigator.storage.persisted();
    }
  } catch {}
  return { usedBytes, quotaBytes, persisted };
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export interface UnifiedSearchHit {
  kind: 'file' | 'memory';
  id: string;
  title: string;
  subtitle: string;
  snippet: string;
  score: number;
}

export function searchAuthorizedFilesAndMemories(
  query: string,
  files: AuthorizedFileItem[],
  memories: MemoryItem[]
): UnifiedSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  const hits: UnifiedSearchHit[] = [];

  for (const f of files) {
    const hay = `${f.name} ${f.folder} ${f.textContent || ''} ${f.aiSummary || ''}`.toLowerCase();
    let score = 0;
    if (f.name.toLowerCase().includes(q)) score += 6;
    if (hay.includes(q)) score += 4;
    for (const t of tokens) {
      if (hay.includes(t)) score += 1;
    }
    if (score > 0) {
      hits.push({
        kind: 'file',
        id: f.id,
        title: f.name,
        subtitle: `File · ${f.folder} · ${formatBytes(f.sizeBytes)}`,
        snippet: (f.aiSummary || f.textContent || f.mimeType).slice(0, 140),
        score,
      });
    }
  }

  for (const m of memories) {
    const hay = `${m.title} ${m.details} ${m.category}`.toLowerCase();
    let score = 0;
    if (hay.includes(q)) score += 5;
    for (const t of tokens) {
      if (hay.includes(t)) score += 1;
    }
    if (score > 0) {
      hits.push({
        kind: 'memory',
        id: m.id,
        title: m.title,
        subtitle: `Memory · ${m.category} · ${m.date}`,
        snippet: m.details.slice(0, 140),
        score,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits;
}

export async function explainAuthorizedFileWithZara(
  file: AuthorizedFileItem,
  language: Language = 'auto',
  customQuestion?: string
): Promise<{ ok: boolean; explanation: string }> {
  try {
    const authHeaders = await getOwnerAuthHeaders();
    let imageBase64: string | undefined;
    if (file.imagePreviewDataUrl) {
      const idx = file.imagePreviewDataUrl.indexOf(',');
      imageBase64 = idx >= 0 ? file.imagePreviewDataUrl.slice(idx + 1) : file.imagePreviewDataUrl;
    }
    const res = await fetch('/api/files/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        textContent: file.textContent || '',
        imageBase64,
        language,
        question: customQuestion || '',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        explanation: data.error || `Failed to explain file (HTTP ${res.status}).`,
      };
    }
    return {
      ok: true,
      explanation: data.explanation || 'No explanation returned.',
    };
  } catch (err: any) {
    return {
      ok: false,
      explanation: err?.message || 'Offline or server unavailable — cannot run AI explanation right now.',
    };
  }
}
