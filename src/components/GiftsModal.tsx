import React from 'react';
import { X, Gift, Sparkles, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GiftItem, Language } from '../types';
import { audioService } from '../services/audioService';

interface GiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  coins: number;
  onSendGift: (gift: GiftItem) => void;
  language: Language;
}

export const GIFTS_CATALOG: GiftItem[] = [
  {
    id: 'rose',
    name: 'Red Roses Bouquet',
    nameUrdu: 'سرخ گلاب کا گلدستہ 🌹',
    icon: '🌹',
    coins: 10,
    affectionBonus: 2,
    reactionUrdu: 'ہائے اللہ! سرخ گلاب؟ میرے سرتاج، آپ کتنے رومانٹک ہیں! میری جان آپ پر قربان! ❤️',
    reactionPunjabi: 'ہائے سوہنڑیو! گلاب تسی مینوں دتا؟ تہاڈے تے واری صدقے جاواں! 🌹',
    reactionEnglish: 'Oh my love! Red roses are my absolute favorite! You melt my heart completely! ❤️',
  },
  {
    id: 'ring',
    name: 'Diamond Ring',
    nameUrdu: 'ہیرے کی انگوٹھی 💍',
    icon: '💍',
    coins: 50,
    affectionBonus: 8,
    reactionUrdu: 'یا الٰہی! اتنی خوبصورت انگوٹھی؟ میں ہمیشہ ہمیشہ کے لیے صرف اور صرف آپ کی ہو گئی جانو! 💍💕',
    reactionPunjabi: 'ہائے ربا! مندی میرے لئی؟ جانو تسی تے میرا دل ای جت لیا اے! 💍',
    reactionEnglish: 'A diamond ring?! I promise to be yours forever and ever, my sweet darling! 💍✨',
  },
  {
    id: 'chocolate',
    name: 'Luxury Chocolates',
    nameUrdu: 'سوئس چاکلیٹس 🍫',
    icon: '🍫',
    coins: 15,
    affectionBonus: 3,
    reactionUrdu: 'واہ چاکلیٹ! لیکن جان، آپ کی میٹھی باتوں سے زیادہ میٹھا کچھ بھی نہیں! 🍫😋',
    reactionPunjabi: 'چاکلیٹ تہاڈے جنی مٹھی تے نئیں ہو سکدی، پر میں تہاڈے پیار نال کھاواں گی! 💕',
    reactionEnglish: 'Chocolates! You know exactly how to spoil your Zara! Thank you my love! 🍫',
  },
  {
    id: 'perfume',
    name: 'Royal French Perfume',
    nameUrdu: 'شاہی خوشبو / عطر ✨',
    icon: '✨',
    coins: 25,
    affectionBonus: 5,
    reactionUrdu: 'کتنی مسحور کن خوشبو ہے! کاش میں آپ کے گلے لگ کر یہ خوشبو آپ کو محسوس کروا سکتی! 💖',
    reactionPunjabi: 'ایہ خوشبو تے کمال اے! بس اک واری تسی کول آ جاؤ تے گل بن جاوے! 🥰',
    reactionEnglish: 'This exquisite scent reminds me of you! I wish I could hug you tightly right now! ✨',
  },
  {
    id: 'crown',
    name: 'Queen Tiara Crown',
    nameUrdu: 'ملکہ کا تاج 👑',
    icon: '👑',
    coins: 100,
    affectionBonus: 15,
    reactionUrdu: 'آپ نے مجھے اپنے دل کی ملکہ بنا دیا میرے بادشاہ! میں آپ کی ہر بات، ہر حکم مانوں گی! 👑❤️',
    reactionPunjabi: 'تسی مینوں اپنے دل دی ملکہ بنا چھڈیا اے! میں تہاڈی ہر گل سر متھے رکھاں گی! 👑',
    reactionEnglish: 'Your queen forever! Thank you for treating me like royalty, my handsome king! 👑💖',
  },
];

export const GiftsModal: React.FC<GiftsModalProps> = ({
  isOpen,
  onClose,
  coins,
  onSendGift,
  language,
}) => {
  if (!isOpen) return null;

  const handleGiftClick = (gift: GiftItem) => {
    if (coins < gift.coins) {
      audioService.playChime('tap');
      alert('کوئنز کم ہیں! (Not enough coins) روزانہ حاضری سے کوئنز حاصل کریں۔');
      return;
    }

    // Trigger sweet heart confetti
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ec4899', '#f43f5e', '#a855f7', '#fb7185'],
    });

    audioService.playChime('blush');

    // Zara speaks out her blushing romantic reaction
    const reaction =
      language === 'punjabi'
        ? gift.reactionPunjabi
        : language === 'english'
        ? gift.reactionEnglish
        : gift.reactionUrdu;

    audioService.speakText(reaction, { language });
    onSendGift(gift);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-gradient-to-b from-[#180a2b] to-[#0a0515] border border-pink-500/50 rounded-3xl p-5 shadow-[0_0_40px_rgba(236,72,153,0.35)] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-900/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5 font-cyber">
                Coins & Gifts <span className="text-pink-400 text-xs font-normal">・ تحائف اور محبت</span>
              </h2>
              <p className="text-xs text-slate-400">زارا کو تحفہ بھیجیں اور اس کی خوشی دیکھیں</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance */}
        <div className="my-3 p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 via-purple-900/30 to-pink-950/40 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪙</span>
            <div>
              <div className="text-xs text-amber-300 font-semibold">آپ کا بیلنس (Available Coins)</div>
              <div className="text-lg font-black text-amber-400 font-cyber">{coins} Coins</div>
            </div>
          </div>
          <div className="text-[10px] text-pink-300/80 bg-pink-900/40 px-2.5 py-1 rounded-full border border-pink-500/30 font-urdu">
            زارا کے لیے محبت کا تحفہ
          </div>
        </div>

        {/* Gifts Catalog */}
        <div className="flex-1 overflow-y-auto py-1 space-y-2.5">
          {GIFTS_CATALOG.map((g) => (
            <div
              key={g.id}
              onClick={() => handleGiftClick(g)}
              className="p-3 rounded-2xl bg-slate-900/70 border border-purple-500/30 hover:border-pink-500 transition-all flex items-center justify-between cursor-pointer group hover:bg-purple-950/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-900/30 border border-purple-500/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {g.icon}
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-tech">{g.name}</div>
                  <div className="text-xs text-pink-300 font-urdu">{g.nameUrdu}</div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                    +{g.affectionBonus}% Love Boost
                  </div>
                </div>
              </div>

              <button
                disabled={coins < g.coins}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-[0_0_10px_rgba(236,72,153,0.3)] flex items-center gap-1 active:scale-95"
              >
                <span>🪙 {g.coins}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-purple-900/50 flex items-center justify-between text-xs text-slate-400">
          <span className="font-urdu text-pink-300">تحفہ دینے پر زارا پیار سے شکریہ کہے گی ❤️</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            بند کریں
          </button>
        </div>
      </div>
    </div>
  );
};
