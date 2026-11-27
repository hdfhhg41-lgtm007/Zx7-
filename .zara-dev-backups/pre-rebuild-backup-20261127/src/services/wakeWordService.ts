// Client + Native Wake-Word Matching & Gate Service
// Supports custom wake phrases across English, Urdu, Hindi, Punjabi, Uzbek, Malay & Arabic

export interface WakeWordMatchResult {
  matched: boolean;
  wakePhraseMatched: string;
  remainingCommand: string;
}

const DEFAULT_ALIASES = ['hey zara', 'zara', 'hi zara', 'ok zara', 'suno zara', 'sun zara'];

function normalizeWakeText(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .replace(/[.,!?،؟'"`~;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildWakeCandidates(customWakeWord?: string): string[] {
  const customParts = (customWakeWord || 'hey zara')
    .split(/[,|/]/)
    .map((p) => normalizeWakeText(p))
    .filter((p) => p.length >= 2);

  const aliases = new Set<string>([
    ...customParts,
    'hey zara',
    'hi zara',
    'ok zara',
    'salom zara',
    'suno zara',
    'sun zara',
    'zara',
    'zarah',
    'ہائے زارا',
    'زارا',
    'سنو زارا',
    'हे ज़ारा',
    'ज़ारा',
    'सुनो ज़ारा',
    'ਹੇ ਜ਼ਾਰਾ',
    'ਜ਼ਾਰਾ',
    'салом зара',
    'зара',
  ]);

  if (customParts.length === 0) {
    DEFAULT_ALIASES.forEach((a) => aliases.add(a));
  }

  // Match longer multi-word phrases before short aliases so remainingCommand strips cleanly
  return Array.from(aliases).sort((a, b) => b.length - a.length);
}

export function matchWakeWordAndExtractCommand(
  spokenText: string,
  customWakeWord = 'hey zara'
): WakeWordMatchResult {
  const raw = (spokenText || '').trim();
  const normalized = normalizeWakeText(raw);
  if (!normalized) {
    return { matched: false, wakePhraseMatched: '', remainingCommand: '' };
  }

  const candidates = buildWakeCandidates(customWakeWord);
  for (const phrase of candidates) {
    if (normalized === phrase) {
      return { matched: true, wakePhraseMatched: phrase, remainingCommand: '' };
    }
    if (normalized.startsWith(`${phrase} `)) {
      const idx = raw.toLowerCase().indexOf(phrase);
      const sliced =
        idx >= 0
          ? raw
              .slice(idx + phrase.length)
              .replace(/^[\s,.:;!?،-]+/, '')
              .trim()
          : normalized.slice(phrase.length).trim();
      return {
        matched: true,
        wakePhraseMatched: phrase,
        remainingCommand: sliced,
      };
    }
    const midIdx = normalized.indexOf(` ${phrase}`);
    if (midIdx >= 0) {
      const after = normalized.slice(midIdx + phrase.length + 1).trim();
      return {
        matched: true,
        wakePhraseMatched: phrase,
        remainingCommand: after,
      };
    }
  }

  return { matched: false, wakePhraseMatched: '', remainingCommand: raw };
}

class ZaraWebWakeWordGate {
  private awakeUntilMs = 0;
  private wakeWindowMs = 20_000;

  isAwakeWindowActive(): boolean {
    return Date.now() < this.awakeUntilMs;
  }

  markAwake(durationMs = 20_000): void {
    this.wakeWindowMs = durationMs;
    this.awakeUntilMs = Date.now() + this.wakeWindowMs;
  }

  clearAwake(): void {
    this.awakeUntilMs = 0;
  }
}

export const webWakeWordGate = new ZaraWebWakeWordGate();
