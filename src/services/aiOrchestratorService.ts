import type {
  AiBrainEngineId,
  AiOrchestratorSnapshot,
  AiOrchestratorTestResult,
  AllAiSystemId,
  SttEngineId,
  TtsEngineId,
} from '../types';
import { fetchWithContainerWakeup } from './chatVaultPersistence';

export const BRAIN_ENGINE_OPTIONS: Array<{
  id: AiBrainEngineId;
  label: string;
  shortDesc: string;
}> = [
  {
    id: 'auto',
    label: 'Auto Smart Orchestrator',
    shortDesc: 'Picks best model per task with auto-fallback',
  },
  {
    id: 'dimaag_llm',
    label: 'Dimaag LLM',
    shortDesc: 'Primary deep reasoning brain (EN/UR/HI/PA)',
  },
  {
    id: 'maya_agentic_plan',
    label: 'Maya Agentic Plan',
    shortDesc: 'Multi-step planning, office & device tasks',
  },
  {
    id: 'maya_mind',
    label: 'Maya Mind',
    shortDesc: 'High-EQ empathy & long-term memory recall',
  },
  {
    id: 'tez_dimaag',
    label: 'Tez Dimaag',
    shortDesc: 'High-speed sharp reasoning engine',
  },
  {
    id: 'normal_mode',
    label: 'Normal Mode',
    shortDesc: 'Balanced daily conversational assistant',
  },
  {
    id: 'normal_swift_mode',
    label: 'Normal Swift Mode',
    shortDesc: 'Ultra-low-latency instant response brain',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    shortDesc: 'GPT adapter (auto-fallbacks if key unset)',
  },
  {
    id: 'groq',
    label: 'Groq',
    shortDesc: 'Groq LPU adapter (auto-fallbacks if key unset)',
  },
];

export const TTS_ENGINE_OPTIONS: Array<{
  id: TtsEngineId;
  label: string;
  shortDesc: string;
}> = [
  {
    id: 'hunter_tts_ultra_premium',
    label: 'Hunter TTS Ultra Premium',
    shortDesc: 'Flagship warm natural human-like female voice',
  },
  {
    id: 'custom_hunter_tts',
    label: 'Custom Hunter TTS',
    shortDesc: 'Adaptive custom speaker & speed voice engine',
  },
];

export async function fetchAiOrchestratorSnapshot(): Promise<AiOrchestratorSnapshot | null> {
  try {
    const res = await fetchWithContainerWakeup('/api/ai/orchestrator', {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as AiOrchestratorSnapshot;
  } catch {
    return null;
  }
}

export async function updateAiOrchestratorConfig(updates: {
  primaryBrainMode?: AiBrainEngineId;
  sttEngine?: SttEngineId;
  ttsEngine?: TtsEngineId;
  autoFallbackEnabled?: boolean;
  enabledEngines?: Record<string, boolean>;
}): Promise<{ ok: boolean; snapshot?: AiOrchestratorSnapshot }> {
  try {
    const res = await fetchWithContainerWakeup('/api/ai/orchestrator/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: Boolean(data.ok), snapshot: data.snapshot };
  } catch {
    return { ok: false };
  }
}

export async function testAiOrchestratorEngine(
  engineId: AllAiSystemId
): Promise<{
  ok: boolean;
  result?: AiOrchestratorTestResult;
  snapshot?: AiOrchestratorSnapshot;
}> {
  try {
    const res = await fetchWithContainerWakeup('/api/ai/orchestrator/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engineId }),
    });
    const data = await res.json();
    return {
      ok: Boolean(data.ok),
      result: data.result,
      snapshot: data.snapshot,
    };
  } catch {
    return { ok: false };
  }
}

export async function testAllAiOrchestratorSystems(): Promise<{
  ok: boolean;
  results: AiOrchestratorTestResult[];
  snapshot?: AiOrchestratorSnapshot;
}> {
  try {
    const res = await fetchWithContainerWakeup('/api/ai/orchestrator/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engineId: 'all' }),
    });
    const data = await res.json();
    return {
      ok: Boolean(data.ok),
      results: Array.isArray(data.results) ? data.results : [],
      snapshot: data.snapshot,
    };
  } catch {
    return { ok: false, results: [] };
  }
}

export async function testAiFallbackRouting(): Promise<{
  ok: boolean;
  selectedBrain?: string;
  actualBrainUsed?: string;
  providerUsed?: string;
  modelIdUsed?: string;
  fallbackTriggered?: boolean;
  latencyMs?: number;
  sampleOutput?: string;
}> {
  try {
    const res = await fetchWithContainerWakeup('/api/ai/orchestrator/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testFallback: true }),
    });
    return await res.json();
  } catch {
    return { ok: false };
  }
}
