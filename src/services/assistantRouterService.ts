// Universal Multilingual Language Command & Zara Profile Helper
import { AiAssistantId, Language, ZARA_AI_ASSISTANTS } from '../types';

export interface AssistantSwitchCommand {
  type: 'switch_assistant' | 'disconnect_assistant' | 'language_switch';
  assistantId?: AiAssistantId;
  targetLanguage?: Language;
  remainderText?: string;
}

export function detectAssistantOrLanguageCommand(rawText: string): AssistantSwitchCommand | null {
  const txt = (rawText || '').trim();
  if (!txt) return null;
  const lower = txt.toLowerCase();

  if (
    /\b(switch|change|set|use|talk|speak|reply|write)\s*(to|in)?\s*roman\s*(urdu|style|desi)?\b/i.test(lower) ||
    /\broman\s*(urdu|style)\s*(lagao|kardo|karo|on|enable)\b/i.test(lower) ||
    /(رومن\s*(اردو|سٹائل|اسٹائل)|roman\s*style)/i.test(txt)
  ) {
    return { type: 'language_switch', targetLanguage: 'roman_urdu' };
  }

  return null;
}

export function getAssistantProfile(_id?: AiAssistantId) {
  return ZARA_AI_ASSISTANTS[0];
}
