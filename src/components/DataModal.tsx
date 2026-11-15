import React from 'react';
import { X, Globe2, Check } from 'lucide-react';
import { Language } from '../types';
import { audioService } from '../services/audioService';

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: Language;
  onSelectLanguage: (lang: Language) => void;
}

export const DataModal: React.FC<DataModalProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  onSelectLanguage,
}) => {
  if (!isOpen) return null;

  const languages: Array<{
    id: Language;
    title: string;
    badge: string;
    description: string;
    sampleVoice: string;
    accent: string;
  }> = [
    {
      id: 'auto',
      title: 'Auto-Detect (7 Languages)',
      badge: 'Recommended',
      description:
        'Automatically replies in whatever language you speak: Uzbek, Urdu, Hindi, Punjabi, English, Malay, Arabic — including mid-sentence switching.',
      sampleVoice: 'Speak to me in Uzbek, Urdu, Hindi, Punjabi, Malay, Arabic, or English!',
      accent: 'Adapts automatically to your voice',
    },
    {
      id: 'uzbek',
      title: "O'zbekcha (Uzbek)",
      badge: 'Spoken Uzbek',
      description: "Tabiiy va samimiy o'zbek tilida suhbat va ovozli yordam.",
      sampleVoice: "Salom! Men Zara — sizga o'zbek tilida yordam berishga tayyorman.",
      accent: "Toshkent / O'zbek tili",
    },
    {
      id: 'malay',
      title: 'Bahasa Melayu (Malay)',
      badge: 'Spoken Malay',
      description: 'Perbualan Bahasa Melayu yang mesra, jelas dan semula jadi.',
      sampleVoice: 'Hai! Saya Zara — saya sedia membantu anda dalam Bahasa Melayu.',
      accent: 'Malaysian Natural Voice',
    },
    {
      id: 'arabic',
      title: 'العربية (Arabic)',
      badge: 'Spoken Arabic',
      description: 'محادثة طبيعية وواضحة باللغة العربية مع فهم تلقائي.',
      sampleVoice: 'مرحباً! أنا زارا — يسعدني التحدث معك ومساعدتك اليوم.',
      accent: 'Clear Modern Arabic',
    },
    {
      id: 'english',
      title: 'English',
      badge: 'Global English',
      description: 'Clear & natural English conversation and voice commands.',
      sampleVoice: 'Hello! Zara is listening and ready to help.',
      accent: 'Natural English Voice',
    },
    {
      id: 'hindi',
      title: 'Hindi',
      badge: 'Spoken Hindi',
      description: 'Warm, expressive spoken Hindi voice responses.',
      sampleVoice: 'नमस्ते! बताइए आज मैं आपकी क्या मदद कर सकती हूँ?',
      accent: 'Natural Conversational Hindi',
    },
    {
      id: 'urdu',
      title: 'Urdu',
      badge: 'Spoken Urdu',
      description: 'Natural Pakistani Urdu spoken voice & responses.',
      sampleVoice: 'السلام علیکم! بتائیے آج میں آپ کے کس کام آ سکتی ہوں؟',
      accent: 'Natural Pakistani Urdu Tone',
    },
    {
      id: 'punjabi',
      title: 'Punjabi',
      badge: 'Spoken Punjabi',
      description: 'Warm, lively Punjabi spoken dialect.',
      sampleVoice: 'ست سری اکال! دسو آج میں تہاڈی کی مدد کراں؟',
      accent: 'Warm Punjabi Dialect',
    },
  ];

  const handleSelect = (lang: Language, sample: string) => {
    audioService.unlock();
    audioService.playChime('tap');
    onSelectLanguage(lang);
    audioService.speakText(sample, { language: lang });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-gradient-to-b from-[#140b2e] to-[#090517] border border-cyan-500/40 rounded-3xl p-5 shadow-[0_0_40px_rgba(6,182,212,0.3)] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-900/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5 font-cyber">
                Voice Language <span className="text-cyan-400 text-xs font-normal">• Speech</span>
              </h2>
              <p className="text-xs text-slate-400">Choose how Zara speaks out loud to you</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Options */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {languages.map((l) => {
            const isSelected = selectedLanguage === l.id;
            return (
              <div
                key={l.id}
                onClick={() => handleSelect(l.id, l.sampleVoice)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-900/60 border-purple-900/40 hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white font-tech">{l.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/50 text-pink-300">
                      {l.badge}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-black shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{l.description}</p>
                <div className="text-[10px] text-cyan-400/80 font-mono mt-1">
                  Accent: {l.accent} (Tap to preview voice)
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-purple-900/50 flex items-center justify-between">
          <span className="text-xs text-cyan-300 flex items-center gap-1 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            MULTILINGUAL VOICE READY
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-bold whitespace-nowrap cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
