// AI-to-AI Assistant Switching & Universal Multilingual Command Detector
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

  // 1. Disconnect / Back to Main Zara Assistant
  if (
    /\b(disconnect|end|leave|exit|close|stop)\s+(mother|sister|research|coding|business|other)?\s*assistant\b/i.test(lower) ||
    /\b(switch|go|come|return)\s*back\s*(to)?\s*(main\s*)?zara\b/i.test(lower) ||
    /\b(connect|talk|speak)\s*(with|to)\s*(main\s*)?zara\b/i.test(lower) ||
    /(مین\s*زارا\s*سے\s*بات|واپس\s*زارا|اسسٹنٹ\s*بند|असिस्टेंट\s*बंद|ज़ारा\s*से\s*बात)/i.test(txt)
  ) {
    return { type: 'switch_assistant', assistantId: 'zara' };
  }

  // 2. Connect to Mother Assistant
  if (
    /(connect|talk|speak|call|switch|put\s*me\s*through).{0,25}(mother|mom|mummy|ammi|amma)\s*(ai\s*)?(assistant)?/i.test(lower) ||
    /(mother|ammi|maa)\s*assistant/i.test(lower) ||
    /(امی|ماں)\s*(اسسٹنٹ|سے\s*بات)/i.test(txt) ||
    /(मम्मी|माँ)\s*असिस्टेंट/i.test(txt) ||
    /(ona|onam)\s*assistant/i.test(lower)
  ) {
    return { type: 'switch_assistant', assistantId: 'mother' };
  }

  // 3. Connect to Sister Assistant
  if (
    /(connect|talk|speak|call|switch|put\s*me\s*through).{0,25}(sister|behen|behna|baji|apa)\s*(ai\s*)?(assistant)?/i.test(lower) ||
    /(sister|behen)\s*assistant/i.test(lower) ||
    /(بہن|باجی)\s*(اسسٹنٹ|سے\s*بات)/i.test(txt) ||
    /(बहन|दीदी)\s*असिस्टेंट/i.test(txt) ||
    /(opa|singil)\s*assistant/i.test(lower)
  ) {
    return { type: 'switch_assistant', assistantId: 'sister' };
  }

  // 4. Connect to Research Assistant
  if (
    /(connect|talk|speak|call|switch).{0,25}(research|news|search|world)\s*(ai\s*)?(assistant)?/i.test(lower) ||
    /research\s*assistant/i.test(lower) ||
    /(ریسرچ|نیوز)\s*اسسٹنٹ/i.test(txt) ||
    /रिसर्च\s*असिस्टेंट/i.test(txt)
  ) {
    return { type: 'switch_assistant', assistantId: 'research' };
  }

  // 5. Connect to Coding Assistant
  if (
    /(connect|talk|speak|call|switch).{0,25}(coding|code|developer|programming|flutter|debug)\s*(ai\s*)?(assistant)?/i.test(lower) ||
    /coding\s*assistant/i.test(lower) ||
    /(کوڈنگ|پروگرامنگ)\s*اسسٹنٹ/i.test(txt) ||
    /कोडिंग\s*असिस्टेंट/i.test(txt)
  ) {
    return { type: 'switch_assistant', assistantId: 'coding' };
  }

  // 6. Connect to Business Assistant
  if (
    /(connect|talk|speak|call|switch).{0,25}(business|office|work|finance|management)\s*(ai\s*)?(assistant)?/i.test(lower) ||
    /business\s*assistant/i.test(lower) ||
    /(بزنس|آفس)\s*اسسٹنٹ/i.test(txt) ||
    /बिज़नेस\s*असिस्टेंट/i.test(txt)
  ) {
    return { type: 'switch_assistant', assistantId: 'business' };
  }

  // 7. Generic "I want to speak with another AI assistant" -> cycle or open assistant list prompt (defaults next/mother)
  if (
    /(speak|talk|connect).{0,20}(another|other|different)\s*(ai\s*)?assistant/i.test(lower) ||
    /(دوسرے|کسی\s*اور)\s*اے\s*آئی\s*اسسٹنٹ/i.test(txt)
  ) {
    return { type: 'switch_assistant', assistantId: 'mother' };
  }

  return null;
}

export function getAssistantProfile(id?: AiAssistantId) {
  return ZARA_AI_ASSISTANTS.find((a) => a.id === id) || ZARA_AI_ASSISTANTS[0];
}
