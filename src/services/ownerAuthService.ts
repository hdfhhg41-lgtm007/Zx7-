import type { FirebaseApp } from 'firebase/app';
import type { Auth, GoogleAuthProvider as GoogleAuthProviderType, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ChatMessage, MemoryItem } from '../types';

export const AUTHORIZED_OWNER_EMAIL = 'hdfhhg41@gmail.com';
const GUEST_SAFE_LOCK_STORAGE_KEY = 'zara_guest_safe_lock_v2';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface OwnerAuthSnapshot {
  authReady: boolean;
  signedInEmail: string | null;
  signedInUid: string | null;
  isGoogleOwnerAccount: boolean;
  guestSafeLockActive: boolean;
  isOwnerVerified: boolean;
}

type OwnerAuthListener = (snapshot: OwnerAuthSnapshot) => void;

function readGuestSafeLockFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(GUEST_SAFE_LOCK_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeGuestSafeLockFlag(locked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (locked) {
      localStorage.setItem(GUEST_SAFE_LOCK_STORAGE_KEY, '1');
    } else {
      localStorage.removeItem(GUEST_SAFE_LOCK_STORAGE_KEY);
    }
  } catch {}
}

function isUserSoleOwner(user: User | null): boolean {
  if (!user || !user.email || !user.emailVerified) return false;
  return user.email.trim().toLowerCase() === AUTHORIZED_OWNER_EMAIL;
}

let cachedFirebaseApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedGoogleProvider: GoogleAuthProviderType | null = null;
let cachedSignInWithPopup: typeof import('firebase/auth').signInWithPopup | null = null;
let cachedSignOut: typeof import('firebase/auth').signOut | null = null;
let authInitPromise: Promise<void> | null = null;

let cachedDb: Firestore | null = null;
let cachedFirestoreFns: {
  doc: typeof import('firebase/firestore').doc;
  getDoc: typeof import('firebase/firestore').getDoc;
  getDocFromServer: typeof import('firebase/firestore').getDocFromServer;
  setDoc: typeof import('firebase/firestore').setDoc;
} | null = null;
let firestoreInitPromise: Promise<void> | null = null;

let authReadyState = false;
let currentFirebaseUser: User | null = null;
let manualGuestLock = readGuestSafeLockFlag();
const listeners = new Set<OwnerAuthListener>();

function computeSnapshot(): OwnerAuthSnapshot {
  const isGoogleOwnerAccount = isUserSoleOwner(currentFirebaseUser);
  const guestSafeLockActive = !isGoogleOwnerAccount || manualGuestLock;
  const isOwnerVerified = isGoogleOwnerAccount && !manualGuestLock;

  return {
    authReady: authReadyState,
    signedInEmail: isGoogleOwnerAccount ? currentFirebaseUser?.email || null : null,
    signedInUid: isGoogleOwnerAccount ? currentFirebaseUser?.uid || null : null,
    isGoogleOwnerAccount,
    guestSafeLockActive,
    isOwnerVerified,
  };
}

function notifyListeners(): void {
  const snap = computeSnapshot();
  listeners.forEach((fn) => {
    try {
      fn(snap);
    } catch {}
  });
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentFirebaseUser?.uid ?? null,
      email: currentFirebaseUser?.email ?? null,
      emailVerified: currentFirebaseUser?.emailVerified ?? null,
      isAnonymous: currentFirebaseUser?.isAnonymous ?? null,
      tenantId: currentFirebaseUser?.tenantId ?? null,
      providerInfo:
        currentFirebaseUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function ensureFirebaseAuthLoaded(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (cachedAuth && cachedGoogleProvider && cachedSignInWithPopup && cachedSignOut) return;
  if (authInitPromise) return authInitPromise;

  authInitPromise = (async () => {
    try {
      const [{ initializeApp }, authMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
      ]);

      if (!cachedFirebaseApp) {
        cachedFirebaseApp = initializeApp(firebaseConfig);
      }
      cachedAuth = authMod.getAuth(cachedFirebaseApp);
      const provider = new authMod.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      cachedGoogleProvider = provider;
      cachedSignInWithPopup = authMod.signInWithPopup;
      cachedSignOut = authMod.signOut;

      authMod.onAuthStateChanged(cachedAuth, (user) => {
        currentFirebaseUser = user;
        authReadyState = true;
        // If a non-owner Google account was signed in, keep session strictly in Guest-Safe Lock
        if (user && !isUserSoleOwner(user)) {
          authMod.signOut(cachedAuth!).catch(() => {});
          currentFirebaseUser = null;
        }
        notifyListeners();
        if (currentFirebaseUser && isUserSoleOwner(currentFirebaseUser)) {
          void ensureFirebaseFirestoreLoaded();
        }
      });
    } catch (err) {
      // Offline or restricted network — stay safely in Guest-Safe mode without blocking app UI
      authReadyState = true;
      notifyListeners();
      authInitPromise = null;
      console.warn('[OwnerAuth] Background Auth init deferred (offline/network):', err);
    }
  })();

  return authInitPromise;
}

async function ensureFirebaseFirestoreLoaded(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (cachedDb && cachedFirestoreFns) return;
  if (firestoreInitPromise) return firestoreInitPromise;

  firestoreInitPromise = (async () => {
    try {
      await ensureFirebaseAuthLoaded();
      if (!cachedFirebaseApp) {
        const { initializeApp } = await import('firebase/app');
        cachedFirebaseApp = initializeApp(firebaseConfig);
      }
      const fsMod = await import('firebase/firestore');
      cachedDb = fsMod.getFirestore(cachedFirebaseApp, firebaseConfig.firestoreDatabaseId);
      cachedFirestoreFns = {
        doc: fsMod.doc,
        getDoc: fsMod.getDoc,
        getDocFromServer: fsMod.getDocFromServer,
        setDoc: fsMod.setDoc,
      };

      // Validate connection quietly in background per Firebase guidelines
      try {
        if (navigator.onLine !== false) {
          await fsMod.getDocFromServer(fsMod.doc(cachedDb, 'test', 'connection'));
        }
      } catch (connErr) {
        if (connErr instanceof Error && connErr.message.includes('the client is offline')) {
          console.warn('[OwnerVault] Firestore currently offline — local vault active.');
        }
      }
    } catch (err) {
      firestoreInitPromise = null;
      console.warn('[OwnerVault] Firestore lazy load deferred:', err);
    }
  })();

  return firestoreInitPromise;
}

// Warm up Firebase Auth asynchronously right after Zara's main screen paints (non-blocking boot!)
if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    void ensureFirebaseAuthLoaded();
  }, 80);
}

export function getOwnerAuthSnapshot(): OwnerAuthSnapshot {
  return computeSnapshot();
}

export function subscribeOwnerAuth(listener: OwnerAuthListener): () => void {
  listeners.add(listener);
  listener(computeSnapshot());
  if (typeof window !== 'undefined' && !cachedAuth && !authInitPromise) {
    void ensureFirebaseAuthLoaded();
  }
  return () => {
    listeners.delete(listener);
  };
}

export async function signInOwnerWithGoogle(): Promise<{
  ok: boolean;
  error?: string;
  snapshot: OwnerAuthSnapshot;
}> {
  try {
    // Call signInWithPopup synchronously when already warmed up so mobile popup blockers never interfere
    if (!cachedAuth || !cachedGoogleProvider || !cachedSignInWithPopup || !cachedSignOut) {
      await ensureFirebaseAuthLoaded();
    }
    if (!cachedAuth || !cachedGoogleProvider || !cachedSignInWithPopup || !cachedSignOut) {
      return {
        ok: false,
        error: 'Internet connection is required to verify Owner Google account.',
        snapshot: computeSnapshot(),
      };
    }

    const cred = await cachedSignInWithPopup(cachedAuth, cachedGoogleProvider);
    const user = cred.user;
    if (!isUserSoleOwner(user)) {
      await cachedSignOut(cachedAuth).catch(() => {});
      currentFirebaseUser = null;
      notifyListeners();
      return {
        ok: false,
        error:
          'Guest-Safe Lock Active: Only the verified App Owner Google account can unlock Owner Mode.',
        snapshot: computeSnapshot(),
      };
    }

    currentFirebaseUser = user;
    authReadyState = true;
    manualGuestLock = false;
    writeGuestSafeLockFlag(false);
    notifyListeners();
    void ensureFirebaseFirestoreLoaded();
    return {
      ok: true,
      snapshot: computeSnapshot(),
    };
  } catch (err: any) {
    const code = String(err?.code || '');
    const friendly =
      code === 'auth/popup-closed-by-user'
        ? 'Google sign-in popup was closed before completion.'
        : code === 'auth/popup-blocked'
        ? 'Popup blocked by browser — please allow popups for this site and tap again.'
        : 'Owner verification could not be completed. Session remains in Guest-Safe Mode.';
    return {
      ok: false,
      error: friendly,
      snapshot: computeSnapshot(),
    };
  }
}

export async function signOutOwnerAccount(): Promise<void> {
  manualGuestLock = true;
  writeGuestSafeLockFlag(true);
  try {
    if (cachedAuth && cachedSignOut) {
      await cachedSignOut(cachedAuth);
    }
  } catch {}
  currentFirebaseUser = null;
  notifyListeners();
}

export function engageGuestSafeLock(): OwnerAuthSnapshot {
  manualGuestLock = true;
  writeGuestSafeLockFlag(true);
  notifyListeners();
  return computeSnapshot();
}

export function unlockGuestSafeLockWithPin(
  enteredPin: string,
  expectedPin: string
): { ok: boolean; reason?: string; snapshot: OwnerAuthSnapshot } {
  if (!isUserSoleOwner(currentFirebaseUser)) {
    return {
      ok: false,
      reason: 'Sign in with the verified Owner Google account first.',
      snapshot: computeSnapshot(),
    };
  }

  const cleanEntered = (enteredPin || '').trim();
  const cleanExpected = (expectedPin || '1234').trim() || '1234';
  if (!cleanEntered || cleanEntered !== cleanExpected) {
    return {
      ok: false,
      reason: 'Incorrect Owner PIN.',
      snapshot: computeSnapshot(),
    };
  }

  manualGuestLock = false;
  writeGuestSafeLockFlag(false);
  notifyListeners();
  return {
    ok: true,
    snapshot: computeSnapshot(),
  };
}

export async function getOwnerIdTokenOrNull(): Promise<string | null> {
  const snap = computeSnapshot();
  if (!snap.isOwnerVerified || !currentFirebaseUser) {
    return null;
  }
  try {
    return await currentFirebaseUser.getIdToken();
  } catch {
    return null;
  }
}

export async function getOwnerAuthHeaders(): Promise<Record<string, string>> {
  const snap = computeSnapshot();
  if (!snap.isOwnerVerified || !currentFirebaseUser) {
    return {
      'X-Zara-Guest-Lock': '1',
    };
  }
  try {
    const token = await currentFirebaseUser.getIdToken();
    if (!token) {
      return { 'X-Zara-Guest-Lock': '1' };
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  } catch {
    return {
      'X-Zara-Guest-Lock': '1',
    };
  }
}

function serializeBoundedArray<T>(items: T[], maxChars: number, keepTail: boolean): string {
  let slice = items.slice();
  let json = JSON.stringify(slice);
  while (json.length > maxChars && slice.length > 1) {
    const nextLen = Math.max(1, Math.floor(slice.length * 0.75));
    slice = keepTail ? slice.slice(-nextLen) : slice.slice(0, nextLen);
    json = JSON.stringify(slice);
  }
  if (json.length > maxChars) {
    return '[]';
  }
  return json;
}

export async function syncOwnerVaultToFirestore(
  messages: ChatMessage[],
  memories: MemoryItem[]
): Promise<void> {
  const snap = computeSnapshot();
  if (!snap.isOwnerVerified || !currentFirebaseUser || !snap.signedInUid) return;

  await ensureFirebaseFirestoreLoaded();
  if (!cachedDb || !cachedFirestoreFns) return;

  const compactMsgs = (Array.isArray(messages) ? messages : []).slice(-450).map((m) => ({
    id: String(m.id || '').slice(0, 64),
    sender: m.sender === 'user' ? 'user' : 'zara',
    text: String(m.text || '').slice(0, 10000),
    timestamp: String(m.timestamp || '').slice(0, 32),
    createdAtMs: Number(m.createdAtMs) || Date.now(),
    language: m.language,
    builtApp: m.builtApp,
  }));

  const compactMems = (Array.isArray(memories) ? memories : []).slice(0, 300).map((item) => ({
    id: String(item.id || '').slice(0, 64),
    title: String(item.title || 'Saved Memory').slice(0, 140),
    date: String(item.date || '').slice(0, 48),
    details: String(item.details || '').slice(0, 2000),
    category: item.category || 'memory',
    createdAtMs: Number(item.createdAtMs) || Date.now(),
  }));

  const messagesJson = serializeBoundedArray(compactMsgs, 580000, true);
  const memoriesJson = serializeBoundedArray(compactMems, 240000, false);
  const path = `ownerVault/${snap.signedInUid}`;

  try {
    await cachedFirestoreFns.setDoc(
      cachedFirestoreFns.doc(cachedDb, 'ownerVault', snap.signedInUid),
      {
        ownerUid: snap.signedInUid,
        ownerEmail: AUTHORIZED_OWNER_EMAIL,
        updatedAt: new Date().toISOString().slice(0, 40),
        messagesJson,
        memoriesJson,
      }
    );
  } catch (error: any) {
    const msg = String(error?.message || error || '');
    if (msg.includes('Missing or insufficient permissions') || msg.includes('PERMISSION_DENIED')) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    console.warn('[OwnerVault] Firestore sync skipped:', msg);
  }
}

export async function loadOwnerVaultFromFirestore(): Promise<{
  messages: ChatMessage[];
  memories: MemoryItem[];
} | null> {
  const snap = computeSnapshot();
  if (!snap.isOwnerVerified || !currentFirebaseUser || !snap.signedInUid) return null;

  await ensureFirebaseFirestoreLoaded();
  if (!cachedDb || !cachedFirestoreFns) return null;

  const path = `ownerVault/${snap.signedInUid}`;
  try {
    const docSnap = await cachedFirestoreFns.getDoc(
      cachedFirestoreFns.doc(cachedDb, 'ownerVault', snap.signedInUid)
    );
    if (!docSnap.exists()) {
      return { messages: [], memories: [] };
    }
    const data = docSnap.data();
    let messages: ChatMessage[] = [];
    let memories: MemoryItem[] = [];
    if (typeof data?.messagesJson === 'string') {
      try {
        const parsed = JSON.parse(data.messagesJson);
        if (Array.isArray(parsed)) messages = parsed;
      } catch {}
    }
    if (typeof data?.memoriesJson === 'string') {
      try {
        const parsed = JSON.parse(data.memoriesJson);
        if (Array.isArray(parsed)) memories = parsed;
      } catch {}
    }
    return { messages, memories };
  } catch (error: any) {
    const msg = String(error?.message || error || '');
    if (msg.includes('Missing or insufficient permissions') || msg.includes('PERMISSION_DENIED')) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    console.warn('[OwnerVault] Firestore restore skipped:', msg);
    return null;
  }
}
