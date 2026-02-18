// Speech Service - Language-specific voice synthesis
import { LanguageKey } from '@/config/minimind';

// BCP-47 language codes for speech synthesis
const languageVoiceCodes: Record<LanguageKey, string[]> = {
  en: ['en-US', 'en-GB', 'en-AU'],
  hi: ['hi-IN'],
  hinglish: ['hi-IN', 'en-IN'],
  bn: ['bn-IN', 'bn-BD'],
  te: ['te-IN'],
  mr: ['mr-IN'],
  ta: ['ta-IN'],
  gu: ['gu-IN'],
  kn: ['kn-IN'],
  ml: ['ml-IN'],
  or: ['or-IN'],
  pa: ['pa-IN'],
  as: ['as-IN', 'bn-IN'], // Fallback to Bengali
  mai: ['hi-IN'], // Fallback to Hindi
  ur: ['ur-PK', 'ur-IN'],
  sa: ['hi-IN', 'sa-IN'], // Fallback to Hindi
  ne: ['ne-NP', 'hi-IN'],
  sd: ['sd-PK', 'ur-PK'],
  ks: ['ks-IN', 'hi-IN'],
  kok: ['kok-IN', 'hi-IN'],
  mni: ['mni-IN', 'bn-IN'],
  doi: ['doi-IN', 'hi-IN'],
  sat: ['sat-IN', 'hi-IN'],
  bho: ['bho-IN', 'hi-IN'],
  raj: ['raj-IN', 'hi-IN'],
  es: ['es-ES', 'es-MX', 'es-US'],
  fr: ['fr-FR', 'fr-CA'],
  'hi-roman': ['en-IN', 'hi-IN'],
  'ta-roman': ['en-IN', 'ta-IN'],
  'te-roman': ['en-IN', 'te-IN'],
  'bn-roman': ['en-IN', 'bn-IN'],
  'gu-roman': ['en-IN', 'gu-IN'],
  'kn-roman': ['en-IN', 'kn-IN'],
  'ml-roman': ['en-IN', 'ml-IN'],
  'mr-roman': ['en-IN', 'mr-IN'],
  'pa-roman': ['en-IN', 'pa-IN'],
  'ur-roman': ['en-IN', 'ur-IN'],
  'sa-roman': ['en-IN', 'hi-IN'],
};

// Voice quality preferences - prefer Google/Microsoft premium voices for natural sound
const preferredVoiceNames: Partial<Record<string, string[]>> = {
  'en-US': ['Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Samantha', 'Ava', 'Allison', 'Alex', 'Zira', 'David'],
  'en-GB': ['Google UK English Female', 'Google UK English Male', 'Microsoft Sonia', 'Daniel', 'Kate', 'Serena'],
  'en-AU': ['Karen', 'Lee', 'Microsoft Natasha'],
  'en-IN': ['Google हिंदी', 'Microsoft Neerja', 'Veena', 'Rishi'],
  'hi-IN': ['Google हिंदी', 'Microsoft Swara', 'Microsoft Kalpana', 'Microsoft Hemant', 'Lekha'],
  'bn-IN': ['Google বাংলা', 'Microsoft Tanishaa', 'Microsoft Bashkar'],
  'bn-BD': ['Google বাংলা', 'Microsoft Nabanita'],
  'ta-IN': ['Google தமிழ்', 'Microsoft Pallavi', 'Microsoft Valluvar'],
  'te-IN': ['Google తెలుగు', 'Microsoft Shruti', 'Microsoft Chitra', 'Microsoft Mohan'],
  'mr-IN': ['Google मराठी', 'Microsoft Aarohi'],
  'gu-IN': ['Google ગુજરાતી', 'Microsoft Dhwani', 'Microsoft Niranjan'],
  'kn-IN': ['Google ಕನ್ನಡ', 'Microsoft Sapna', 'Microsoft Gagan'],
  'ml-IN': ['Google മലയാളം', 'Microsoft Sobhana', 'Microsoft Midhun'],
  'pa-IN': ['Google ਪੰਜਾਬੀ'],
  'or-IN': ['Microsoft Subhasini'],
  'ur-PK': ['Google اردو', 'Microsoft Asad', 'Microsoft Uzma'],
  'ur-IN': ['Google اردو', 'Microsoft Salman', 'Microsoft Gul'],
  'ne-NP': ['Google नेपाली', 'Microsoft Hemkala', 'Microsoft Sagar'],
  'es-ES': ['Google español', 'Microsoft Elvira', 'Monica', 'Jorge'],
  'es-MX': ['Google español de Estados Unidos', 'Microsoft Dalia', 'Paulina', 'Juan'],
  'fr-FR': ['Google français', 'Microsoft Denise', 'Thomas', 'Amelie'],
  'sa-IN': ['Google हिंदी'],
};

interface VoiceSelection {
  voice: SpeechSynthesisVoice | null;
  lang: string;
}

class SpeechService {
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;
  private isCancelling: boolean = false;

  constructor() {
    this.loadVoices();
  }

  private loadVoices(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise((resolve) => {
      // Check if speech synthesis is available
      if (typeof speechSynthesis === 'undefined') {
        console.warn('Speech synthesis not supported');
        resolve();
        return;
      }

      const setVoices = () => {
        try {
          this.voices = speechSynthesis.getVoices();
          this.voicesLoaded = this.voices.length > 0;
          console.log(`Loaded ${this.voices.length} voices`);
        } catch (e) {
          console.warn('Error loading voices:', e);
        }
        resolve();
      };

      // Try loading immediately
      setVoices();

      // If no voices, wait for the event
      if (!this.voicesLoaded) {
        if (speechSynthesis.onvoiceschanged !== undefined) {
          speechSynthesis.onvoiceschanged = setVoices;
        }
        // Fallback timeout
        setTimeout(setVoices, 1000);
      }
    });

    return this.loadPromise;
  }

  async getVoiceForLanguage(language: LanguageKey): Promise<VoiceSelection> {
    await this.loadVoices();

    const langCodes = languageVoiceCodes[language] || ['en-US'];
    
    if (this.voices.length === 0) {
      return { voice: null, lang: langCodes[0] };
    }
    
    // Try each language code in order of preference
    for (const langCode of langCodes) {
      // First, try to find preferred premium voices (Google/Microsoft tend to be best)
      const preferredNames = preferredVoiceNames[langCode] || [];
      for (const preferredName of preferredNames) {
        const voice = this.voices.find(
          v => v.name.toLowerCase().includes(preferredName.toLowerCase()) && 
               v.lang.startsWith(langCode.split('-')[0])
        );
        if (voice) {
          return { voice, lang: voice.lang };
        }
      }

      // Prefer Google voices (they're generally the most natural)
      const googleVoice = this.voices.find(
        v => v.name.toLowerCase().includes('google') && v.lang.startsWith(langCode.split('-')[0])
      );
      if (googleVoice) {
        return { voice: googleVoice, lang: googleVoice.lang };
      }

      // Then prefer Microsoft voices
      const msVoice = this.voices.find(
        v => v.name.toLowerCase().includes('microsoft') && v.lang.startsWith(langCode.split('-')[0])
      );
      if (msVoice) {
        return { voice: msVoice, lang: msVoice.lang };
      }

      // Then try exact lang match
      const exactMatch = this.voices.find(v => v.lang === langCode);
      if (exactMatch) {
        return { voice: exactMatch, lang: exactMatch.lang };
      }

      // Then try language prefix match
      const langPrefix = langCode.split('-')[0];
      const prefixMatch = this.voices.find(v => v.lang.startsWith(langPrefix));
      if (prefixMatch) {
        return { voice: prefixMatch, lang: prefixMatch.lang };
      }
    }

    // Fallback to best English voice
    const googleEn = this.voices.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith('en'));
    const defaultVoice = googleEn || this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
    return { voice: defaultVoice || null, lang: defaultVoice?.lang || 'en-US' };
  }


  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  getVoicesForLanguage(language: LanguageKey): SpeechSynthesisVoice[] {
    const langCodes = languageVoiceCodes[language] || ['en-US'];
    return this.voices.filter(voice => {
      const langPrefix = voice.lang.split('-')[0];
      return langCodes.some(code => {
        const codePrefix = code.split('-')[0];
        return langPrefix === codePrefix || voice.lang === code;
      });
    });
  }

  isSupported(): boolean {
    return typeof speechSynthesis !== 'undefined' && 'speak' in speechSynthesis;
  }

  async speak(
    text: string,
    language: LanguageKey,
    options?: {
      rate?: number;
      pitch?: number;
      volume?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    }
  ): Promise<SpeechSynthesisUtterance | null> {
    if (!this.isSupported()) {
      console.warn('Speech synthesis not supported in this browser');
      options?.onError?.(new Error('Speech synthesis not supported'));
      return null;
    }

    // Cancel any ongoing speech without triggering callbacks
    this.isCancelling = true;
    try {
      speechSynthesis.cancel();
    } catch (e) {
      console.warn('Error cancelling speech:', e);
    }

    // Wait for cancel to settle
    await new Promise(resolve => setTimeout(resolve, 200));
    this.isCancelling = false;

    const { voice, lang } = await this.getVoiceForLanguage(language);
    
    // Clean up text - remove markdown, special characters, and math symbols for natural speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\$\$[\s\S]*?\$\$/g, '')
      .replace(/\$[^$]*?\$/g, '')
      .replace(/[#*_`~^]/g, '')
      .replace(/\\\w+/g, '')
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱᵃᵇᶜᵈᵉᶠᵍʰᵏˡᵐᵒᵖʳˢᵗᵘᵛʷˣʸᶻ]/g, '')
      .replace(/[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\.\s*\./g, '.')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      console.warn('No text to speak');
      return null;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    if (voice) {
      utterance.voice = voice;
      console.log(`Using voice: ${voice.name} (${voice.lang})`);
    }
    utterance.lang = lang;
    const isIndicLanguage = ['hi', 'bn', 'te', 'ta', 'mr', 'gu', 'kn', 'ml', 'or', 'pa', 'ur', 'ne', 'sa'].includes(language.split('-')[0]);
    utterance.rate = options?.rate ?? (isIndicLanguage ? 0.85 : 0.92);
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1;

    utterance.onstart = () => {
      console.log('Speech started');
      options?.onStart?.();
    };
    
    utterance.onend = () => {
      console.log('Speech ended');
      if (!this.isCancelling) {
        options?.onEnd?.();
      }
    };
    
    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') {
        console.log(`Speech ${event.error}`);
        // Don't call onEnd for interruptions caused by our own cancel
        return;
      }
      console.error('Speech error:', event.error);
      options?.onError?.(new Error(`Speech synthesis error: ${event.error}`));
    };

    try {
      speechSynthesis.speak(utterance);
      
      if (speechSynthesis.paused) {
        speechSynthesis.resume();
      }
    } catch (e) {
      console.error('Error starting speech:', e);
      options?.onError?.(new Error('Failed to start speech synthesis'));
      return null;
    }

    return utterance;
  }

  stop(): void {
    try {
      speechSynthesis.cancel();
    } catch (e) {
      console.warn('Error stopping speech:', e);
    }
  }

  pause(): void {
    try {
      speechSynthesis.pause();
    } catch (e) {
      console.warn('Error pausing speech:', e);
    }
  }

  resume(): void {
    try {
      speechSynthesis.resume();
    } catch (e) {
      console.warn('Error resuming speech:', e);
    }
  }

  isSpeaking(): boolean {
    try {
      return speechSynthesis.speaking;
    } catch (e) {
      return false;
    }
  }

  isPaused(): boolean {
    try {
      return speechSynthesis.paused;
    } catch (e) {
      return false;
    }
  }
}

export const speechService = new SpeechService();
export default speechService;
