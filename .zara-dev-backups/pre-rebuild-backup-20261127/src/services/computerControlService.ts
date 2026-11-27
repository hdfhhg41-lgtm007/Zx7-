import { getOwnerAuthHeaders } from './ownerAuthService';
import { PcCommandResult, PcCompanionStatus } from '../types';

export type PcAllowedAction =
  | 'system_info'
  | 'list_dir'
  | 'read_file'
  | 'open_url'
  | 'open_app'
  | 'media_play_pause'
  | 'volume_up'
  | 'volume_down'
  | 'lock_screen';

export async function fetchPcCompanionStatus(): Promise<PcCompanionStatus> {
  try {
    const headers = await getOwnerAuthHeaders();
    const res = await fetch('/api/computer/status', {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    if (!res.ok) {
      return { connected: false };
    }
    return await res.json();
  } catch {
    return { connected: false };
  }
}

export async function rotatePcPairingToken(): Promise<{ ok: boolean; token?: string; error?: string }> {
  try {
    const authHeaders = await getOwnerAuthHeaders();
    const res = await fetch('/api/computer/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Owner authentication required.' };
    }
    return { ok: true, token: data.token };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to rotate PC pairing token.' };
  }
}

export async function downloadPcCompanionAgentScript(): Promise<{
  ok: boolean;
  filename?: string;
  error?: string;
}> {
  try {
    const authHeaders = await getOwnerAuthHeaders();
    const res = await fetch('/api/computer/agent-script', {
      method: 'GET',
      headers: authHeaders,
      credentials: 'include',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: errData.error || 'Owner authentication required to download paired PC Agent.',
      };
    }
    const scriptText = await res.text();
    const blob = new Blob([scriptText], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zara-pc-agent.mjs';
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 500);
    return { ok: true, filename: 'zara-pc-agent.mjs' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Download failed.' };
  }
}

export async function executeAuthorizedPcCommand(
  action: PcAllowedAction,
  params: Record<string, any> = {},
  explicitConfirm = false
): Promise<PcCommandResult> {
  try {
    const authHeaders = await getOwnerAuthHeaders();
    const res = await fetch('/api/computer/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      credentials: 'include',
      body: JSON.stringify({
        action,
        params,
        explicitConfirm,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        connected: Boolean(data.connected),
        action,
        error: data.error || `HTTP ${res.status}`,
        executedAtMs: Date.now(),
      };
    }
    return {
      ok: Boolean(data.ok),
      connected: Boolean(data.connected ?? true),
      action,
      output: data.output || '',
      data: data.data,
      error: data.error,
      executedAtMs: Date.now(),
    };
  } catch (err: any) {
    return {
      ok: false,
      connected: false,
      action,
      error: err?.message || 'Network error contacting PC bridge.',
      executedAtMs: Date.now(),
    };
  }
}

export interface DetectedPcVoiceCommand {
  action: PcAllowedAction;
  params: Record<string, any>;
  requiresConfirm: boolean;
  label: string;
}

export function detectPcVoiceCommand(rawText: string): DetectedPcVoiceCommand | null {
  if (!rawText) return null;
  const lower = rawText.toLowerCase().trim();
  const mentionsPc =
    /\b(pc|computer|laptop|desktop|windows|mac|کمپیوٹر|لیپ\s*ٹاپ|پی\s*سی|कंप्यूटर|लैपटॉप|पीसी)\b/i.test(
      lower
    );
  if (!mentionsPc) return null;

  if (/\b(lock|band|لا[کق]|लॉक)\b/i.test(lower)) {
    return {
      action: 'lock_screen',
      params: {},
      requiresConfirm: true,
      label: 'Lock Computer Screen',
    };
  }
  if (/\b(status|info|health|ram|cpu|battery|check|حالت|اسٹیٹس|स्टेटस)\b/i.test(lower)) {
    return {
      action: 'system_info',
      params: {},
      requiresConfirm: false,
      label: 'Check Computer System Info',
    };
  }
  if (/\b(files|folder|dir|list|فائل|فولڈر|फ़ाइल|फोल्डर)\b/i.test(lower)) {
    return {
      action: 'list_dir',
      params: { subpath: '' },
      requiresConfirm: false,
      label: 'List Authorized PC Folder',
    };
  }
  if (/\b(pause|play|mute|volume\s*up|volume\s*down|awaz)\b/i.test(lower)) {
    const action: PcAllowedAction = /up|zyada|tez|بڑھا|बढ़ा/i.test(lower)
      ? 'volume_up'
      : /down|kam|halki|کم|कम/i.test(lower)
      ? 'volume_down'
      : 'media_play_pause';
    return {
      action,
      params: {},
      requiresConfirm: false,
      label: `PC Media (${action})`,
    };
  }
  if (/\b(open|launch|kholo|کھولو|खोलो)\b/i.test(lower)) {
    if (/youtube/i.test(lower)) {
      return {
        action: 'open_url',
        params: { url: 'https://www.youtube.com' },
        requiresConfirm: false,
        label: 'Open YouTube on PC',
      };
    }
    if (/google|browser|chrome/i.test(lower)) {
      return {
        action: 'open_url',
        params: { url: 'https://www.google.com' },
        requiresConfirm: false,
        label: 'Open Browser on PC',
      };
    }
    const appMatch = lower.match(/\b(?:open|launch|kholo)\s+([a-z0-9._-]{2,24})/i);
    const appName = appMatch?.[1] && !/pc|computer|laptop/i.test(appMatch[1]) ? appMatch[1] : 'notepad';
    return {
      action: 'open_app',
      params: { app: appName },
      requiresConfirm: false,
      label: `Open "${appName}" on PC`,
    };
  }

  return null;
}
