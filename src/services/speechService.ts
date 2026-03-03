// Speech Service - Google Cloud TTS with browser fallback
import { LanguageKey } from '@/config/minimind';

class SpeechService {
  private currentAudio: HTMLAudioElement | null = null;
  private isSpeakingState: boolean = false;

  isSupported(): boolean {
    return true; // Always supported via cloud TTS
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
  ): Promise<void> {
    // Stop any current playback
    this.stop();

    // Clean text for speech
    const cleanText = text
      .replace(/[#*_`~]/g, '')
      .replace(/\$\$?[^$]+\$\$?/g, '')
      .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      console.warn('No text to speak');
      return;
    }

    try {
      // Try Google Cloud TTS first
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/google-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey,
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            text: cleanText,
            language,
            rate: options?.rate ?? 0.95,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.audioContent) {
        throw new Error('No audio content received');
      }

      // Play base64 audio using data URI
      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;
      
      if (options?.volume !== undefined) {
        audio.volume = options.volume;
      }

      audio.onplay = () => {
        this.isSpeakingState = true;
        options?.onStart?.();
      };

      audio.onended = () => {
        this.isSpeakingState = false;
        this.currentAudio = null;
        options?.onEnd?.();
      };

      audio.onerror = () => {
        this.isSpeakingState = false;
        this.currentAudio = null;
        options?.onError?.(new Error('Audio playback error'));
      };

      await audio.play();
    } catch (error) {
      console.warn('Google Cloud TTS failed, falling back to browser:', error);
      // Fallback to browser speech synthesis
      this.speakWithBrowser(cleanText, language, options);
    }
  }

  private speakWithBrowser(
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
  ): void {
    if (typeof speechSynthesis === 'undefined') {
      options?.onError?.(new Error('Speech synthesis not supported'));
      return;
    }

    try { speechSynthesis.cancel(); } catch (e) { /* ignore */ }

    const langCodeMap: Partial<Record<LanguageKey, string>> = {
      en: 'en-US', hi: 'hi-IN', hinglish: 'hi-IN', bn: 'bn-IN',
      te: 'te-IN', mr: 'mr-IN', ta: 'ta-IN', gu: 'gu-IN',
      kn: 'kn-IN', ml: 'ml-IN', or: 'or-IN', pa: 'pa-IN',
      es: 'es-ES', fr: 'fr-FR', ur: 'ur-PK', ne: 'ne-NP',
    };

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCodeMap[language] || 'en-US';
    utterance.rate = options?.rate ?? 0.9;
    utterance.pitch = options?.pitch ?? 1;
    utterance.volume = options?.volume ?? 1;

    utterance.onstart = () => {
      this.isSpeakingState = true;
      options?.onStart?.();
    };
    utterance.onend = () => {
      this.isSpeakingState = false;
      options?.onEnd?.();
    };
    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') {
        options?.onEnd?.();
        return;
      }
      this.isSpeakingState = false;
      options?.onError?.(new Error(`Speech error: ${event.error}`));
    };

    speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.isSpeakingState = false;
    try { speechSynthesis?.cancel(); } catch (e) { /* ignore */ }
  }

  pause(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
    } else {
      try { speechSynthesis?.pause(); } catch (e) { /* ignore */ }
    }
  }

  resume(): void {
    if (this.currentAudio) {
      this.currentAudio.play();
    } else {
      try { speechSynthesis?.resume(); } catch (e) { /* ignore */ }
    }
  }

  isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  isPaused(): boolean {
    if (this.currentAudio) {
      return this.currentAudio.paused && this.currentAudio.currentTime > 0;
    }
    try { return speechSynthesis?.paused || false; } catch (e) { return false; }
  }
}

export const speechService = new SpeechService();
export default speechService;
