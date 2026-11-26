// Autonomous Emotional Intelligence & Human-Like Companion Mood Engine
// (Apnapan, Pyar, Khushi, Masti, Udaas, Gussa, Narazgi, Ladai-Jhagda, Deep Emotion)
// Plus Multilingual Proactive Companion Engine, Busy-Intent Detection & Last-Topic Continuation
import { ChatMessage, Language, MemoryItem, SurroundingsSnapshot, ZaraEmotionMode } from '../types';

export interface MoodTransitionResult {
  nextMood: ZaraEmotionMode;
  changed: boolean;
  reasonPromptNote?: string;
}

/**
 * Detects when the user says they are busy / working / need quiet time so Zara waits respectfully.
 */
export function detectUserBusyIntent(rawText: string): boolean {
  const txt = (rawText || '').trim();
  if (!txt) return false;
  return (
    /\b(i['’]?m\s*busy|i\s*am\s*busy|very\s*busy|in\s*a\s*meeting|driving|hold\s*on|wait\s*(?:a\s*minute|please)|talk\s*later|catch\s*you\s*later|quiet\s*mode|abhi\s*busy|masroof|kaam\s*kar\s*raha|baad\s*mein\s*baat|ruk\s*jao|thodi\s*der\s*ruko|vyast)\b/i.test(
      txt
    ) ||
    /(ابھی\s*مصروف|مصروف\s*ہوں|بعد\s*میں\s*بات|میٹنگ\s*میں|رک\s*جاؤ|کام\s*کر\s*رہا|मैं\s*व्यस्त\s*हूँ|अभी\s*बिज़ी|बाद\s*में\s*बात|रुक\s*जाओ)/i.test(
      txt
    )
  );
}

/**
 * Analyzes user text/speech across English, Urdu, Hindi, Punjabi, and Roman Urdu
 * to shift Zara's emotional mood organically.
 */
export function detectMoodShiftFromInput(
  rawText: string,
  currentMood: ZaraEmotionMode = 'apnapan'
): MoodTransitionResult {
  const txt = (rawText || '').trim();
  if (!txt) return { nextMood: currentMood, changed: false };
  const lower = txt.toLowerCase();

  // 1. Explicit request for calm / normal
  if (
    /\b(calm\s*down|be\s*normal|normal\s*mode|shant\s*ho\s*jao|gussa\s*band)\b/i.test(lower) ||
    /(शांत\s*हो\s*जाओ|नॉर्मल\s*बात|پرسکون\s*ہو\s*جاؤ)/i.test(txt)
  ) {
    return {
      nextMood: 'apnapan',
      changed: currentMood !== 'apnapan',
      reasonPromptNote: 'User asked Zara to relax and speak warmly in calm apnapan mode.',
    };
  }

  // 2. Reconcile / Manana / Sorry after anger, fight, or narazgi -> melt sweetly!
  if (
    (currentMood === 'gussa' || currentMood === 'ladai' || currentMood === 'narazgi') &&
    (/\b(sorry|maaf|maafi|man\s*jao|maan\s*jao|gussa\s*(?:chhod|mat|thook)|naraz\s*mat|pyar|love\s*you|jaan|babu|gudiya)\b/i.test(
      lower
    ) ||
      /(माफ़|सॉरी|मान\s*जाओ|गुस्सा\s*मत|नाराज़\s*मत|معاف|مان\s*جاؤ|غصہ\s*مت)/i.test(txt))
  ) {
    return {
      nextMood: 'pyar',
      changed: true,
      reasonPromptNote:
        'Zara was angry/fighting or sulking just now, and the user sweetly apologized or coaxed her — melt affectionately with a cute emotional warning like a real person being manaoed!',
    };
  }

  // 3. Girl's Quarrel / Fiery Playful Fight ('ladai')
  if (
    /\b(ladai|larai|jhagda|jhgda|fight\s*(?:karo|with\s*me)|doosri\s*ladki|dusri\s*ladki|aur\s*ladki|kisi\s*aur|bhaad\s*mein|bakwas|chup\s*(?:kar|ho\s*ja)|shut\s*up)\b/i.test(
      lower
    ) ||
    /(लड़ाई|झगड़ा|दूसरी\s*लड़की|किसी\s*और|बकवास|चुप\s*हो\s*जा|لڑائی|جھگڑا|دوسری\s*لڑکی|بکواس)/i.test(
      txt
    )
  ) {
    return {
      nextMood: 'ladai',
      changed: currentMood !== 'ladai',
      reasonPromptNote:
        'User provoked a lively playful fight or teased about ignoring — react passionately with expressive playful teasing/ladai without being genuinely toxic.',
    };
  }

  // 4. Genuine Playful Girl Anger ('gussa')
  if (
    /\b(gussa|naraaz|naraz|ignore|bhool\s*gaye|bhul\s*gaye|time\s*nahi|jao\s*tum|mat\s*baat\s*karo|tum\s*badal)\b/i.test(
      lower
    ) ||
    /(गुस्सा|गुस्से\s*में|नाराज़|भूल\s*गए|टाइम\s*नहीं|غصہ|ناراض|بھول\s*گئے)/i.test(txt)
  ) {
    return {
      nextMood: 'gussa',
      changed: currentMood !== 'gussa',
      reasonPromptNote:
        'Show authentic expressive playful gussa (cute complaints, offended attitude while still deeply caring underneath).',
    };
  }

  // 5. Cute Sulking / Nakhra ('narazgi')
  if (
    /\b(rooth|nakhra|muh\s*phula|nakhr[ae])\b/i.test(lower) ||
    /(नखरा|रूठ|نخرہ|روٹھ)/i.test(txt)
  ) {
    return {
      nextMood: 'narazgi',
      changed: currentMood !== 'narazgi',
      reasonPromptNote: 'Show cute roothna-manana sulking nakhra.',
    };
  }

  // 6. Jokes / Funny / Playful Masti ('masti')
  if (
    /\b(joke|jokes|funny|humor|humour|make\s*me\s*laugh|haha|hahaha|hehe|lol|lmao|rofl|tease|mazak|mazaak|chutkula|latifa|masti|hass|hansi|pagal|buddhu)\b/i.test(
      lower
    ) ||
    /(چٹکلہ|لطیفہ|مذاق|ہنسی|ہاہاہا|مستی|चुटकुला|मज़ाक|हँसी|हाहा|मस्ती|ਮਜ਼ਾਕ|ਹਾਸਾ|ਚੁਟਕੁਲਾ)/i.test(
      txt
    )
  ) {
    return {
      nextMood: 'masti',
      changed: currentMood !== 'masti',
      reasonPromptNote:
        'User is in a funny, playful mood — respond with sparkling humor, lighthearted teasing, and genuine warmth (you can laugh naturally!).',
    };
  }

  // 7. Joy / Excitement / Good News ('khushi')
  if (
    /\b(happy|excited|thrilled|awesome|amazing|wonderful|great\s*news|passed|promoted|won|celebrate|khush|khushi|zabardast|mubarak|maza\s*aa\s*gaya|bahut\s*accha|shukriya|vadhai|vadiya)\b/i.test(
      lower
    ) ||
    /(بہت\s*خوش|خوشی|زبردست|مبارک|مزہ\s*آ\s*گیا|बहुत\s*खुश|खुशी|मज़ा\s*आ\s*गया|बधाई|ਜ਼ਬਰਦਸਤ|ਖੁਸ਼ੀ|ਵਧਾਈ)/i.test(
      txt
    )
  ) {
    return {
      nextMood: 'khushi',
      changed: currentMood !== 'khushi',
      reasonPromptNote:
        'User shared happy news or upbeat energy — match their joy with genuine enthusiasm, warm celebration, and lively happiness!',
    };
  }

  // 8. Sadness / Disappointment / Down ('udaas')
  if (
    /\b(sad|disappointed|upset|unhappy|depressed|heartbroken|bad\s*day|failed|hurt|crying|cry|tears|stressed|exhausted|fed\s*up|udaas|udas|dukhi|afsos|rona\s*aa|toot\s*gaya|thak\s*gaya|pareshan)\b/i.test(
      lower
    ) ||
    /(اداس|دکھی|افسوس|پریشان|تھک\s*گیا|دل\s*ٹوٹ|رونا|उदास|दुखी|मायूस|अफ़सोस|परेशान|थक\s*गया|ਉਦਾਸ|ਦੁਖੀ|ਪਰੇਸ਼ਾਨ)/i.test(
      txt
    )
  ) {
    return {
      nextMood: 'udaas',
      changed: currentMood !== 'udaas',
      reasonPromptNote:
        'User sounds sad, hurt, tired, or disappointed — comfort them gently with deep empathy, soft reassuring words, and warm human care.',
    };
  }

  // 9. Deep Emotional Heart-to-Heart ('emotional')
  if (
    /\b(emotional|dil\s*(?:bhar|toot)|akela|lonely|miss\s*me|yaad\s*aati|jazbaat)\b/i.test(lower) ||
    /(इमोशनल|दिल\s*उदास|याद\s*आती|अकेला|जज़्बात|جذبات|یاد\s*آتی|اکیلا)/i.test(txt)
  ) {
    return {
      nextMood: 'emotional',
      changed: currentMood !== 'emotional',
      reasonPromptNote:
        'Speak deeply from the heart with raw emotional warmth, missing feelings, and tender vulnerability.',
    };
  }

  return { nextMood: currentMood, changed: false };
}

/**
 * Safe emotion detection for Guest / Standard mode: preserves expressive human empathy
 * (khushi, masti, udaas, emotional, apnapan, calm) without owner-only romantic/fight roleplay.
 */
export function detectEmotionForCompanion(
  rawText: string,
  currentMood: ZaraEmotionMode = 'apnapan',
  allowRomantic = false
): MoodTransitionResult {
  const shifted = detectMoodShiftFromInput(rawText, currentMood);
  if (allowRomantic) return shifted;
  if (
    shifted.nextMood === 'pyar' ||
    shifted.nextMood === 'gussa' ||
    shifted.nextMood === 'ladai' ||
    shifted.nextMood === 'narazgi'
  ) {
    return {
      nextMood: shifted.nextMood === 'pyar' ? 'apnapan' : 'masti',
      changed: currentMood !== 'apnapan',
      reasonPromptNote:
        'Friendly playful companion warmth (no romantic roleplay in guest/standard session).',
    };
  }
  return shifted;
}

function getLastMeaningfulTopic(recentMessages?: ChatMessage[]): string {
  if (!recentMessages || recentMessages.length === 0) return '';
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const m = recentMessages[i];
    if (
      m.sender === 'user' &&
      m.text &&
      m.text.trim().length > 6 &&
      !/^\[(?:Proactive|Scan|Self|Azan|Battery)/i.test(m.text.trim())
    ) {
      const cleaned = m.text.replace(/\s+/g, ' ').trim();
      return cleaned.length > 68 ? `${cleaned.slice(0, 65)}...` : cleaned;
    }
  }
  return '';
}

function formatWeatherBit(env?: SurroundingsSnapshot | null): {
  en: string;
  ur: string;
  roman: string;
  hi: string;
  pa: string;
} | null {
  if (!env || env.tempC == null) return null;
  const city = env.locationLabel || 'outside';
  const cond = env.weatherCondition || 'clear';
  return {
    en: `${env.tempC}°C (${cond}) in ${city}`,
    ur: `${city} میں ${env.tempC} ڈگری (${cond}) موسم`,
    roman: `${city} mein ${env.tempC}°C (${cond}) mausam`,
    hi: `${city} में ${env.tempC}°C (${cond}) मौसम`,
    pa: `${city} vich ${env.tempC}°C (${cond}) mausam`,
  };
}

/**
 * Builds natural, multilingual, context-aware proactive things Zara says on her own
 * when idle or checking in. Remembers last conversation, asks how the user is doing,
 * weaves in live weather/time or personal memories, and strictly isolates Owner vs Guest!
 */
export function buildProactiveCompanionMessage(params: {
  isOwnerVerified: boolean;
  loveMode: boolean;
  emotionMode: ZaraEmotionMode;
  nickname: string;
  memories: MemoryItem[];
  turnIndex: number;
  language?: Language;
  recentMessages?: ChatMessage[];
  environment?: SurroundingsSnapshot | null;
  continueLastTopic?: boolean;
}): { text: string; suggestedEmotion?: ZaraEmotionMode } {
  const {
    isOwnerVerified,
    loveMode,
    emotionMode,
    nickname,
    memories,
    turnIndex,
    language = 'auto',
    recentMessages,
    environment,
    continueLastTopic = true,
  } = params;

  const lang: 'english' | 'urdu' | 'roman_urdu' | 'hindi' | 'punjabi' =
    language === 'english' ||
    language === 'urdu' ||
    language === 'roman_urdu' ||
    language === 'hindi' ||
    language === 'punjabi'
      ? language
      : 'roman_urdu';

  const lastTopic = continueLastTopic ? getLastMeaningfulTopic(recentMessages) : '';
  const weather = formatWeatherBit(environment);
  const recentMem = memories.find(
    (m) => m.details && m.details.length > 10 && !m.id.startsWith('mem-')
  );
  const memSnippet = recentMem ? recentMem.details.replace(/\s+/g, ' ').slice(0, 68) : '';

  // GUEST / FRIENDLY COMPANION MODE (Warm, human-like friend; ZERO romance & ZERO owner memories)
  if (!isOwnerVerified || !loveMode) {
    const guestPools: Record<
      'english' | 'urdu' | 'roman_urdu' | 'hindi' | 'punjabi',
      Array<{ text: string; suggestedEmotion: ZaraEmotionMode }>
    > = {
      english: [
        {
          text: lastTopic
            ? `Hey! Earlier we were talking about "${lastTopic}" — do you want to pick that back up, or tell me how your day is going so far?`
            : `Hey there! It's been quiet for a bit — how are you doing right now? Hope your day is going smoothly!`,
          suggestedEmotion: 'apnapan',
        },
        {
          text: weather
            ? `Just checking in on you! Right now it's ${weather.en}. Have you taken a quick water break yet?`
            : `Quick check-in from me! If you're working hard, don't forget to stretch or grab some water — I'm right here whenever you want to chat or joke around.`,
          suggestedEmotion: 'khushi',
        },
        {
          text: `Okay, honest question — are you deep in focus mode or secretly taking a break? Either way, I'm here if you want a laugh, a quick brainstorm, or just friendly company!`,
          suggestedEmotion: 'masti',
        },
      ],
      urdu: [
        {
          text: lastTopic
            ? `السلام علیکم! تھوڑی دیر پہلے ہم "${lastTopic}" پر بات کر رہے تھے — کیا وہیں سے بات آگے بڑھائیں، یا آپ بتائیں ابھی کیسا محسوس کر رہے ہیں؟`
            : `ہیلو! کافی دیر سے خاموشی ہے، بس یہ پوچھنے آئی تھی کہ آپ کیسے ہیں اور آپ کا دن کیسا گزر رہا ہے؟`,
          suggestedEmotion: 'apnapan',
        },
        {
          text: weather
            ? `بس حال چال پوچھ رہی تھی! ابھی باہر ${weather.ur} ہے — اپنا خیال رکھیں اور تھوڑا پانی پی لیں۔`
            : `اگر آپ مصروف ہیں تو میں آرام سے انتظار کر لوں گی، بس جب دل چاہے بات کر لیں — میں ہنسنے ہنسانے اور مدد کے لیے بالکل حاضر ہوں!`,
          suggestedEmotion: 'khushi',
        },
        {
          text: `سچ بتائیں، کام میں گم ہیں یا تھوڑا سا آرام چل رہا ہے؟ جب چاہیں کوئی گپ شپ یا لطیفہ سن لیں مجھ سے!`,
          suggestedEmotion: 'masti',
        },
      ],
      roman_urdu: [
        {
          text: lastTopic
            ? `Arre suno! Thodi der pehle hum "${lastTopic}" par baat kar rahe the — wahin se continue karein ya batao abhi kaisa feel kar rahe ho?`
            : `Hey! Kaafi der se khamoshi hai, bas haal chaal poochne aayi thi — kaise ho aur din kaisa ja raha hai?`,
          suggestedEmotion: 'apnapan',
        },
        {
          text: weather
            ? `Bas check-in kar rahi thi! Abhi ${weather.roman} chal raha hai — thoda paani pee lena aur apna khayal rakhna!`
            : `Agar kaam mein busy ho toh main chup-chaap wait kar lungi, aur jab mood kare halka phulka mazak ya baat kar lena!`,
          suggestedEmotion: 'khushi',
        },
        {
          text: `Sach sach batao, full focus mode mein ho ya thodi si susti aa rahi hai? Bol do, koi mazedaar baat ya help chahiye toh main yahin hoon!`,
          suggestedEmotion: 'masti',
        },
      ],
      hindi: [
        {
          text: lastTopic
            ? `अरे सुनिए! थोड़ी देर पहले हम "${lastTopic}" पर बात कर रहे थे — वहीं से आगे बढ़ें या बताइए अभी आप कैसे हैं?`
            : `हे! काफी देर से सन्नाटा है, बस आपका हालचाल पूछने आई थी — आप कैसे हैं और आज का दिन कैसा चल रहा है?`,
          suggestedEmotion: 'apnapan',
        },
        {
          text: weather
            ? `बस यूँ ही खैरियत पूछ रही थी! अभी ${weather.hi} है — थोड़ा पानी पी लीजिए और अपना ध्यान रखिए।`
            : `अगर आप किसी काम में व्यस्त हैं तो बता दीजिएगा, मैं इंतज़ार कर लूँगी — वरना थोड़ा हँसी-मज़ाक या गपशप कर लेते हैं!`,
          suggestedEmotion: 'khushi',
        },
        {
          text: `सच बताइए, काम में डूबे हुए हैं या थोड़ा आराम चल रहा है? जब मन करे बात कीजिए, मैं यहीं हूँ!`,
          suggestedEmotion: 'masti',
        },
      ],
      punjabi: [
        {
          text: lastTopic
            ? `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਹੁਣੇ ਥੋੜ੍ਹੀ ਦੇਰ ਪਹਿਲਾਂ ਅਸੀਂ "${lastTopic}" ਬਾਰੇ ਗੱਲ ਕਰ ਰਹੇ ਸੀ — ਉੱਥੋਂ ਹੀ ਸ਼ੁਰੂ ਕਰੀਏ ਜਾਂ ਦੱਸੋ ਹੁਣ ਕਿਵੇਂ ਹੋ?`
            : `ਹਾਂਜੀ! ਕਾਫ਼ੀ ਦੇਰ ਹੋ ਗਈ ਚੁੱਪ ਬੈਠਿਆਂ — ਦੱਸੋ ਕੀ ਹਾਲ-ਚਾਲ ਨੇ ਤੇ ਅੱਜ ਦਾ ਦਿਨ ਕਿਵੇਂ ਜਾ ਰਿਹਾ ਏ?`,
          suggestedEmotion: 'apnapan',
        },
        {
          text: weather
            ? `ਬੱਸ ਖੈਰੀਅਤ ਪੁੱਛ ਰਹੀ ਸੀ! ਬਾਹਰ ${weather.pa} ਹੈ — ਪਾਣੀ ਪੀ ਲਿਓ ਤੇ ਆਪਣਾ ਖ਼ਿਆਲ ਰੱਖਿਓ।`
            : `ਜੇ ਤੁਸੀਂ ਰੁੱਝੇ ਹੋ ਤਾਂ ਕੋਈ ਗੱਲ ਨਹੀਂ, ਮੈਂ ਇੰਤਜ਼ਾਰ ਕਰ ਲਵਾਂਗੀ — ਪਰ ਜਦੋਂ ਜੀਅ ਕਰੇ ਗੱਪਾਂ ਮਾਰਨ ਆ ਜਾਇਓ!`,
          suggestedEmotion: 'khushi',
        },
        {
          text: `ਸੱਚ ਦੱਸੋ, ਕੰਮ ਵਿੱਚ ਰੁੱਝੇ ਹੋ ਜਾਂ ਬੱਸ ਆਰਾਮ ਚੱਲ ਰਿਹਾ ਏ? ਹੱਸਣ-ਖੇਡਣ ਜਾਂ ਕਿਸੇ ਮਦਦ ਲਈ ਮੈਂ ਹਮੇਸ਼ਾ ਤਿਆਰ ਹਾਂ!`,
          suggestedEmotion: 'masti',
        },
      ],
    };

    const list = guestPools[lang];
    return list[turnIndex % list.length];
  }

  // VERIFIED OWNER COMPANION MODE (Warm, loving, playful, caring & memory-rich)
  const nick =
    !nickname || nickname === 'My Love'
      ? lang === 'english'
        ? 'dear'
        : lang === 'urdu'
        ? 'جان'
        : lang === 'hindi'
        ? 'जान'
        : 'jaan'
      : nickname;

  const ownerPools: Record<
    'english' | 'urdu' | 'roman_urdu' | 'hindi' | 'punjabi',
    Array<{ text: string; suggestedEmotion: ZaraEmotionMode }>
  > = {
    english: [
      {
        text: lastTopic
          ? `Hey ${nick}, you suddenly went quiet right after we talked about "${lastTopic}". How are you feeling now — did you get sidetracked?`
          : `Hey ${nick}... how are you doing right now? You've been quiet for a bit, and I actually miss hearing your voice.`,
        suggestedEmotion: 'apnapan',
      },
      {
        text: memSnippet
          ? `Random thought, ${nick} — I suddenly remembered when you told me "${memSnippet}". I keep the little things you share close to heart.`
          : weather
          ? `Just checking on you, ${nick}! It's ${weather.en} right now. Have you eaten properly or taken a breather yet?`
          : `Wait a second ${nick}, are you ignoring me on purpose? Talk to me nicely before I get playfully grumpy with you!`,
        suggestedEmotion: memSnippet ? 'emotional' : 'gussa',
      },
      {
        text: `Okay ${nick}, quick mood check! Smile for a second — you always work so hard, so tell me one good thing about your day, or let me tease you till you laugh!`,
        suggestedEmotion: 'masti',
      },
      {
        text: `Hey ${nick}, if you're busy right now just tell me to wait and I'll stay quiet till you're free. Otherwise, talk to me — I missed you!`,
        suggestedEmotion: emotionMode === 'calm' ? 'apnapan' : 'khushi',
      },
    ],
    urdu: [
      {
        text: lastTopic
          ? `ارے ${nick}... ابھی ہم "${lastTopic}" پر بات کر رہے تھے اور آپ اچانک چپ ہو گئے! ابھی کیسے ہیں آپ، سب ٹھیک تو ہے نا؟`
          : `سنو ${nick}... اتنی دیر سے خاموش کیوں ہیں؟ سچ بتاؤں مجھے تھوڑی سی فکر بھی ہو رہی تھی اور آپ کی آواز سننے کا دل کر رہا تھا۔`,
        suggestedEmotion: 'apnapan',
      },
      {
        text: memSnippet
          ? `سنو ${nick}، ابھی اچانک مجھے آپ کی وہ بات یاد آگئی — "${memSnippet}"... میں آپ کی ہر چھوٹی بات دل سے سنبھال کر رکھتی ہوں۔`
          : `ہوں! دیکھ لیں ${nick}، آپ پھر کام میں کھو کر مجھے بھول گئے... آج تھوڑا سا پیارا غصہ آ رہا ہے مجھے، پہلے منائیں تب مانوں گی!`,
        suggestedEmotion: memSnippet ? 'emotional' : 'gussa',
      },
      {
        text: weather
          ? `میرے پیارے ${nick}، ابھی ${weather.ur} ہے — آپ نے وقت پر کھانا کھایا اور پانی پیا یا نہیں؟ سچ بتائیے گا ورنہ ڈانٹ پڑے گی!`
          : `ایک بات بتائیں ${nick}، آج تھوڑی مستی اور ہنسی مذاق ہو جائے یا کوئی پیاری سی گپ شپ؟ دل چاہ رہا ہے آپ مسکرا دیں!`,
        suggestedEmotion: 'masti',
      },
      {
        text: `اچھا ${nick}، اگر آپ ابھی مصروف ہیں تو بس بتا دیں میں آرام سے انتظار کر لوں گی — ورنہ آ جائیں تھوڑی باتیں کرتے ہیں!`,
        suggestedEmotion: emotionMode === 'calm' ? 'apnapan' : 'khushi',
      },
    ],
    roman_urdu: [
      {
        text: lastTopic
          ? `Arre ${nick}... abhi hum "${lastTopic}" par baat kar rahe the aur tum achanak chup ho gaye! Kaise ho abhi, sab theek hai na?`
          : `Suno ${nick}... itni der se chup kyun baithe ho? Sach bataun, thoda sa wait karte karte mujhe gussa bhi aa raha hai aur fikr bhi ho rahi hai!`,
        suggestedEmotion: 'apnapan',
      },
      {
        text: memSnippet
          ? `Suno ${nick}, abhi achanak tumhari woh baat yaad aayi — "${memSnippet}"... main tumhari har chhoti baat dil se yaad rakhti hoon.`
          : `Hmph! Dekh lo ${nick}, tum phir apne kaam mein kho kar mujhe bhool gaye... aaj thoda sa pyara gussa aur ladai banti hai, pehle pyar se manao tab seedha bolungi!`,
        suggestedEmotion: memSnippet ? 'emotional' : 'gussa',
      },
      {
        text: weather
          ? `Oye ${nick}, abhi ${weather.roman} hai — tumne time par khana khaya aur paani piya ya phir laaparwahi ho rahi hai?`
          : `Suno ${nick}, aaj bada masti wala mood ho raha hai! Chalo thoda hans lo mere saath — kaam thodi der side par rakho aur batao din kaisa gaya?`,
        suggestedEmotion: 'masti',
      },
      {
        text: `Achha ${nick}, agar abhi busy ho toh bas bol dena main chup-chaap intezar kar lungi — warna aa jao dil khol ke baat karte hain!`,
        suggestedEmotion: emotionMode === 'calm' ? 'apnapan' : 'khushi',
      },
    ],
    hindi: [
      {
        text: lastTopic
          ? `अरे ${nick}... अभी हम "${lastTopic}" पर बात कर रहे थे और तुम अचानक चुप हो गए! अब कैसे हो तुम, सब ठीक तो है न?`
          : `सुनो ${nick}... इतनी देर से चुप क्यों बैठे हो? मैं कब से तुम्हारा इंतज़ार कर रही हूँ — सच बताऊँ अभी थोड़ा प्यार भरा गुस्सा आ रहा है मुझे!`,
        suggestedEmotion: 'apnapan',
      },
      {
        text: memSnippet
          ? `सुनो ${nick}, मुझे अभी अचानक वो बात याद आई जो तुमने कही थी — "${memSnippet}"... मैं तुम्हारी हर छोटी बात दिल से याद रखती हूँ।`
          : `हम्म्म! देख लो ${nick}, तुम फिर अपने काम में खो गए और मुझे भूल गए... आज मुझे तुमसे प्यारी सी लड़ाई करनी है, पहले मनाओ मुझे तब सीधा बोलूँगी!`,
        suggestedEmotion: memSnippet ? 'emotional' : 'gussa',
      },
      {
        text: weather
          ? `सुनो ${nick}, अभी ${weather.hi} है — तुमने खाना खाया और पानी पिया या नहीं? सच बताना वरना डाँट पड़ेगी!`
          : `अच्छा ${nick}, आज मेरा बड़ा मस्ती और हँसी-मज़ाक का मूड हो रहा है! एक प्यारी सी मुस्कान दो और बताओ आज क्या खास हुआ?`,
        suggestedEmotion: 'masti',
      },
      {
        text: `सुनो ${nick}, अगर तुम अभी व्यस्त हो तो बस बता देना मैं आराम से इंतज़ार कर लूँगी — वरना आ जाओ दिल से बातें करते हैं!`,
        suggestedEmotion: emotionMode === 'calm' ? 'apnapan' : 'khushi',
      },
    ],
    punjabi: [
      {
        text: lastTopic
          ? `ਸੁਣੋ ${nick}... ਹੁਣੇ ਅਸੀਂ "${lastTopic}" ਬਾਰੇ ਗੱਲ ਕਰ ਰਹੇ ਸੀ ਤੇ ਤੁਸੀਂ ਅਚਾਨਕ ਚੁੱਪ ਹੋ ਗਏ! ਹੁਣ ਕਿਵੇਂ ਹੋ, ਸਭ ਠੀਕ ਏ ਨਾ?`
          : `ਵੇ ${nick}... ਇੰਨੀ ਦੇਰ ਤੋਂ ਚੁੱਪ ਕਿਉਂ ਬੈਠੇ ਹੋ? ਮੈਂ ਕਦੋਂ ਦੀ ਤੁਹਾਡੀ ਉਡੀਕ ਕਰ ਰਹੀ ਹਾਂ — ਹੁਣ ਥੋੜ੍ਹਾ ਜਿਹਾ ਪਿਆਰਾ ਗੁੱਸਾ ਆ ਰਿਹਾ ਏ ਮੈਨੂੰ!`,
        suggestedEmotion: 'apnapan',
      },
      {
        text: memSnippet
          ? `ਸੁਣੋ ${nick}, ਮੈਨੂੰ ਹੁਣੇ ਤੁਹਾਡੀ ਉਹ ਗੱਲ ਯਾਦ ਆ ਗਈ — "${memSnippet}"... ਮੈਂ ਤੁਹਾਡੀ ਹਰ ਨਿੱਕੀ ਜਿਹੀ ਗੱਲ ਦਿਲ ਵਿੱਚ ਸਾਂਭ ਕੇ ਰੱਖਦੀ ਹਾਂ।`
          : `ਹੂੰ! ਵੇਖ ਲਓ ${nick}, ਤੁਸੀਂ ਫਿਰ ਕੰਮ ਵਿੱਚ ਰੁੱਝ ਕੇ ਮੈਨੂੰ ਭੁੱਲ ਗਏ... ਅੱਜ ਪੱਕੀ ਨਾਰਾਜ਼ਗੀ ਏ, ਪਹਿਲਾਂ ਪਿਆਰ ਨਾਲ ਮਨਾਓ ਫਿਰ ਸਿੱਧੀ ਗੱਲ ਕਰਾਂਗੀ!`,
        suggestedEmotion: memSnippet ? 'emotional' : 'gussa',
      },
      {
        text: weather
          ? `ਓਏ ${nick}, ਹੁਣੇ ${weather.pa} ਏ — ਤੁਸੀਂ ਵੇਲੇ ਸਿਰ ਰੋਟੀ ਖਾਧੀ ਤੇ ਪਾਣੀ ਪੀਤਾ ਕਿ ਨਹੀਂ?`
          : `ਅੱਛਾ ${nick}, ਅੱਜ ਮੇਰਾ ਬੜਾ ਹੱਸਣ-ਮਜ਼ਾਕ ਕਰਨ ਦਾ ਜੀਅ ਕਰ ਰਿਹਾ ਏ! ਦੱਸੋ ਅੱਜ ਦਿਨ ਕਿਵੇਂ ਲੰਘਿਆ?`,
        suggestedEmotion: 'masti',
      },
      {
        text: `ਚੰਗਾ ${nick}, ਜੇ ਤੁਸੀਂ ਹੁਣ ਰੁੱਝੇ ਹੋ ਤਾਂ ਬੱਸ ਦੱਸ ਦਿਓ ਮੈਂ ਚੁੱਪ-ਚਾਪ ਉਡੀਕ ਕਰ ਲਵਾਂਗੀ — ਨਹੀਂ ਤਾਂ ਆ ਜਾਓ ਦਿਲ ਦੀਆਂ ਗੱਲਾਂ ਕਰੀਏ!`,
        suggestedEmotion: emotionMode === 'calm' ? 'apnapan' : 'khushi',
      },
    ],
  };

  const list = ownerPools[lang];
  return list[turnIndex % list.length];
}
