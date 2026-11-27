// Zara AI Pro Tier & Play Billing Entitlement Service

import { ProTierEntitlement, ZaraTierPlan } from '../types';
import { fetchWithContainerWakeup } from './chatVaultPersistence';
import { getOwnerAuthHeaders } from './ownerAuthService';

const TIER_TOKEN_STORAGE_KEY = 'zara_pro_tier_token_v1';
const TIER_SNAPSHOT_STORAGE_KEY = 'zara_pro_tier_snapshot_v1';

export const PLAY_BILLING_SKUS = {
  monthly: {
    sku: 'zara_pro_monthly',
    title: 'Zara Pro Monthly',
    priceLabel: '$9.99 / month',
  },
  yearly: {
    sku: 'zara_pro_yearly',
    title: 'Zara Pro Yearly',
    priceLabel: '$79.99 / year (Save 33%)',
  },
} as const;

const DEFAULT_STANDARD_ENTITLEMENT: ProTierEntitlement = {
  plan: 'standard',
  source: 'standard',
  active: true,
  features: {
    priorityBrains: false,
    ultraPremiumTts: false,
    androidAutomation: false,
    customWakeWordNative: false,
    unlimitedResearchAndDev: false,
  },
};

export function getSavedTierToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TIER_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getCachedTierEntitlement(): ProTierEntitlement {
  if (typeof window === 'undefined') return DEFAULT_STANDARD_ENTITLEMENT;
  try {
    const raw = localStorage.getItem(TIER_SNAPSHOT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as ProTierEntitlement;
    }
  } catch {}
  return DEFAULT_STANDARD_ENTITLEMENT;
}

function saveTierState(entitlement: ProTierEntitlement, signedToken?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TIER_SNAPSHOT_STORAGE_KEY, JSON.stringify(entitlement));
    if (signedToken) {
      localStorage.setItem(TIER_TOKEN_STORAGE_KEY, signedToken);
    } else if (signedToken === '') {
      localStorage.removeItem(TIER_TOKEN_STORAGE_KEY);
    }
  } catch {}
}

export function getTierRequestHeaders(): Record<string, string> {
  const token = getSavedTierToken();
  return token ? { 'X-Zara-Tier-Token': token } : {};
}

export async function fetchProTierStatus(): Promise<ProTierEntitlement> {
  try {
    const authHeaders = await getOwnerAuthHeaders();
    const tierHeaders = getTierRequestHeaders();
    const res = await fetchWithContainerWakeup('/api/tier/status', {
      headers: { ...authHeaders, ...tierHeaders },
    });
    if (!res.ok) return getCachedTierEntitlement();
    const data = await res.json();
    if (data?.entitlement) {
      saveTierState(data.entitlement, data.tierToken ?? data.signedToken);
      return data.entitlement as ProTierEntitlement;
    }
  } catch {}
  return getCachedTierEntitlement();
}

export async function activateProTier(params: {
  mode: 'trial_7d' | 'play_billing' | 'owner_master';
  sku?: string;
  purchaseToken?: string;
}): Promise<{ ok: boolean; entitlement: ProTierEntitlement; message: string }> {
  const authHeaders = await getOwnerAuthHeaders();
  const res = await fetchWithContainerWakeup('/api/tier/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      ...params,
      source: params.mode,
    }),
  });
  const data = await res.json();
  if (res.ok && data?.entitlement) {
    saveTierState(data.entitlement, data.tierToken ?? data.signedToken);
    return {
      ok: true,
      entitlement: data.entitlement as ProTierEntitlement,
      message: data.message || 'Zara Pro Tier activated.',
    };
  }
  return {
    ok: false,
    entitlement: getCachedTierEntitlement(),
    message: data?.error || 'Could not activate Pro Tier.',
  };
}

export async function downgradeToStandardTier(): Promise<{
  ok: boolean;
  entitlement: ProTierEntitlement;
}> {
  const authHeaders = await getOwnerAuthHeaders();
  const tierHeaders = getTierRequestHeaders();
  try {
    const res = await fetchWithContainerWakeup('/api/tier/downgrade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...tierHeaders,
      },
    });
    const data = await res.json();
    if (res.ok && data?.entitlement) {
      saveTierState(data.entitlement, data.tierToken ?? data.signedToken ?? '');
      return { ok: true, entitlement: data.entitlement as ProTierEntitlement };
    }
  } catch {}
  saveTierState(DEFAULT_STANDARD_ENTITLEMENT, '');
  return { ok: false, entitlement: DEFAULT_STANDARD_ENTITLEMENT };
}

export function launchNativePlayProPurchase(
  sku: string = PLAY_BILLING_SKUS.monthly.sku
): { launched: boolean; reason?: string } {
  if (typeof window === 'undefined' || !window.ZaraAndroidBridge?.launchPlayBillingPurchase) {
    return {
      launched: false,
      reason:
        'Google Play Billing sheet requires the Zara Native Android app (.aab). You can activate a 7-Day Pro Trial on web right now.',
    };
  }
  const ok = Boolean(window.ZaraAndroidBridge.launchPlayBillingPurchase(sku));
  return {
    launched: ok,
    reason: ok ? undefined : 'Play Billing is still initializing; please retry in a moment.',
  };
}

export function getTierPlanBadgeLabel(plan: ZaraTierPlan, source?: string): string {
  if (plan === 'pro') {
    if (source === 'owner_master') return 'PRO MASTER';
    if (source === 'trial_7d') return 'PRO TRIAL';
    if (source === 'play_billing') return 'PRO PLAY';
    return 'PRO';
  }
  return 'STANDARD';
}
