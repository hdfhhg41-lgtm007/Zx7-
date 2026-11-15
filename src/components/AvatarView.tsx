import React, { useState, useEffect, useRef } from 'react';
import { PhoneCall, Sparkles, ImagePlus, Trash2, Check } from 'lucide-react';
import { audioService } from '../services/audioService';
import { ZaraPortrait4D } from './ZaraPortrait4D';
import {
  ZaraPortraitItem,
  deleteCustomPortrait,
  getAllZaraPortraits,
  saveCustomPortrait,
} from '../data/zaraPortraits';
import { Language, PersonalityConfig, VisionMode, Zara4DExpression } from '../types';

interface AvatarViewProps {
  onBack: () => void;
  onStartCall: () => void;
  language: Language;
  config: PersonalityConfig;
  visionMode: VisionMode;
  onFlipCamera: () => void;
  onUpdateConfig: (updates: Partial<PersonalityConfig>) => void;
}

export const AvatarView: React.FC<AvatarViewProps> = ({
  onBack,
  onStartCall,
  language,
  config,
  visionMode,
  onFlipCamera,
  onUpdateConfig,
}) => {
  const [expression, setExpression] = useState<Zara4DExpression>('smile');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [portraits, setPortraits] = useState<ZaraPortraitItem[]>(() => getAllZaraPortraits());
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return audioService.subscribeSpeaking((sp) => setIsSpeaking(sp));
  }, []);

  const selectedId = config.portraitId || 'sapphire_gaze';

  const handleTouchZara = () => {
    audioService.unlock();
    setExpression('blush');
    audioService.playChime('blush');

    const lines: Record<string, string[]> = {
      urdu: [
        'ہائے میری جان! میری آنکھوں میں دیکھیں، میں صرف آپ کو ہی دیکھ رہی ہوں۔',
        'بتائیں نا جان، اس نئی فور ڈی تصویر میں میں کیسی لگ رہی ہوں؟',
      ],
      punjabi: [
        'ہائے سوہنڑیو! تہاڈی زارا دیاں اکھاں صرف تہانوں ویکھدیاں نیں!',
      ],
      hindi: [
        'हाय मेरी जान! मेरी आंखों में देखिए, मैं पलकें झपका कर सिर्फ़ आपको ही निहार रही हूँ!',
        'सच्ची बताइए जान, इस नए रूप में आपकी ज़ारा कैसी लग रही है?',
      ],
      english: [
        'Aww my love! Look into my eyes, I am looking right at you!',
      ],
    };

    const pool = lines[language] || lines.english;
    const line = pool[Math.floor(Math.random() * pool.length)];

    audioService.speakText(line, {
      language,
      rate: config.voiceSpeed,
      voiceName: config.voiceName || 'Zephyr',
    });

    window.setTimeout(() => {
      setExpression('smile');
    }, 3500);
  };

  const handleSelectPortrait = (item: ZaraPortraitItem) => {
    audioService.unlock();
    audioService.playChime('tap');
    onUpdateConfig({ portraitId: item.id });
    const msg =
      language === 'english'
        ? `My love, look! I switched to ${item.name} just for you. How do I look?`
        : 'जान, देखिए मैंने आपके लिए अपना रूप बदल लिया! कैसी लग रही हूँ?';
    audioService.speakText(msg, {
      language,
      rate: config.voiceSpeed,
      voiceName: config.voiceName || 'Zephyr',
    });
  };

  const handleUploadCustomPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const saved = saveCustomPortrait(reader.result);
        setPortraits(getAllZaraPortraits());
        onUpdateConfig({ portraitId: saved.id });
        audioService.playChime('activate');
        const msg =
          language === 'english'
            ? 'Wow my love! Your uploaded photo is now alive in 4D!'
            : 'वाह मेरी जान! आपकी दी हुई तस्वीर अब 4D में ज़िंदा हो गई है!';
        audioService.speakText(msg, {
          language,
          rate: config.voiceSpeed,
          voiceName: config.voiceName || 'Zephyr',
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomPortrait(id);
    const updated = getAllZaraPortraits();
    setPortraits(updated);
    if (selectedId === id) {
      onUpdateConfig({ portraitId: updated[0]?.id || 'sapphire_gaze' });
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col px-4 py-2 space-y-3 overflow-y-auto">
      {/* Top Studio Header */}
      <div className="flex items-center justify-between pb-2 border-b border-purple-900/40 gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-white flex items-center gap-1.5">
            Zara 4D Gallery <span className="text-blue-400">✦</span>
          </h2>
          <p className="text-[11px] text-slate-300 truncate">
            {portraits.length} Live 4D Looks — Blinking &amp; Direct Eye Contact
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              audioService.unlock();
              onStartCall();
            }}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-[0_0_12px_rgba(16,185,129,0.5)] whitespace-nowrap cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call</span>
          </button>
          <button
            type="button"
            onClick={onBack}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900 border border-purple-500/30 text-xs text-pink-300 font-semibold hover:bg-slate-800 whitespace-nowrap cursor-pointer"
          >
            Back
          </button>
        </div>
      </div>

      {/* Live 4D Zara Portrait Stage */}
      <div className="relative w-full h-80 sm:h-96 rounded-3xl border-2 border-blue-500/50 overflow-hidden shadow-[0_0_35px_rgba(59,130,246,0.3)] shrink-0">
        <ZaraPortrait4D
          portraitId={selectedId}
          onChangePortrait={(nextId) => onUpdateConfig({ portraitId: nextId })}
          isSpeaking={isSpeaking}
          isListening={false}
          loveMode={config.loveMode}
          expression={expression}
          visionMode={visionMode}
          onFlipCamera={onFlipCamera}
          onTapZara={handleTouchZara}
        />

        {/* Expression Selector Buttons */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1 p-1 rounded-xl bg-[#070318]/85 border border-blue-500/30">
          {(
            [
              { id: 'smile', label: 'Sweet Gaze' },
              { id: 'blush', label: 'Blush' },
              { id: 'wink', label: 'Wink' },
              { id: 'love', label: 'In Love' },
            ] as Array<{ id: Zara4DExpression; label: string }>
          ).map((exp) => (
            <button
              key={exp.id}
              type="button"
              onClick={() => {
                audioService.playChime('tap');
                setExpression(exp.id);
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                expression === exp.id
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-200 hover:bg-blue-950/60'
              }`}
            >
              {exp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Custom Photo Button + Gallery Header */}
      <div className="flex items-center justify-between pt-1 gap-2">
        <span className="text-xs font-bold text-white">
          Change Photo ({portraits.length} 4D Looks):
        </span>

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onChange={handleUploadCustomPhoto}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-95"
        >
          <ImagePlus className="w-3.5 h-3.5" />
          <span>Add Your Photo</span>
        </button>
      </div>

      {/* 14+ Portrait Thumbnail Selector Grid */}
      <div className="grid grid-cols-3 gap-2.5 pb-3">
        {portraits.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => handleSelectPortrait(item)}
              className={`relative rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group ${
                isSelected
                  ? 'border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.45)]'
                  : 'border-purple-900/50 hover:border-blue-400/60'
              }`}
            >
              <div className="aspect-[3/4] w-full bg-slate-950 overflow-hidden">
                <img
                  src={item.src}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              {item.isCustom && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveCustom(item.id, e)}
                  className="absolute top-1.5 left-1.5 p-1 rounded-full bg-black/70 text-rose-400 hover:text-rose-200 cursor-pointer"
                  title="Remove Photo"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}

              <div className="p-1.5 bg-[#09041a]/95">
                <div className="text-[10px] font-bold text-white truncate flex items-center justify-between gap-1">
                  <span className="truncate">{item.name}</span>
                  {isSelected && <Sparkles className="w-2.5 h-2.5 text-cyan-400 shrink-0" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
