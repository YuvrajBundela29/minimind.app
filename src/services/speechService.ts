// Speech Service - Google Cloud TTS with browser fallback
import { LanguageKey } from '@/config/minimind';

type SpeakOptions = {
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
};

type TtsResponse = {
  audioContent?: string;
  audioChunks?: string[];
};

class SpeechService {
  private currentAudio: HTMLAudioElement | null = null;
  private isSpeakingState: boolean = false;
  private playbackToken: number = 0;

  isSupported(): boolean {
    return true; // Always supported via cloud TTS
  }

  async speak(
    text: string,
    language: LanguageKey,
    options?: SpeakOptions
  ): Promise<void> {
    // Stop any current playback
    this.stop();
    const token = this.playbackToken;

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

      const data: TtsResponse = await response.json();
      const audioChunks = Array.isArray(data.audioChunks) && data.audioChunks.length > 0
        ? data.audioChunks
        : data.audioContent
          ? [data.audioContent]
          : [];

      if (!audioChunks.length) {
        throw new Error('No audio content received');
      }

      await this.playAudioChunks(audioChunks, token, options);
    } catch (error) {
      console.warn('Google Cloud TTS failed, falling back to browser:', error);
      // Fallback to browser speech synthesis
      this.speakWithBrowser(cleanText, language, options);
    }
  }

  private async playAudioChunks(chunks: string[], token: number, options?: SpeakOptions): Promise<void> {
    this.isSpeakingState = true;
    options?.onStart?.();

    try {
      for (const chunk of chunks) {
        if (token !== this.playbackToken) return;
        await this.playSingleChunk(chunk, token, options?.volume);
      }

      if (token === this.playbackToken) {
        this.isSpeakingState = false;
        this.currentAudio = null;
        options?.onEnd?.();
      }
    } catch (error) {
      if (token !== this.playbackToken) return;
      this.isSpeakingState = false;
      this.currentAudio = null;
      throw error instanceof Error ? error : new Error('Audio playback error');
    }
  }

  private playSingleChunk(base64Audio: string, token: number, volume?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (token !== this.playbackToken) {
        resolve();
        return;
      }

      const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`);
      this.currentAudio = audio;

      if (volume !== undefined) {
        audio.volume = volume;
      }

      const cleanup = () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
      };

      audio.onended = () => {
        cleanup();
        resolve();
      };

      audio.onpause = () => {
        if (token !== this.playbackToken && audio.currentTime === 0) {
          cleanup();
          resolve();
        }
      };

      audio.onerror = () => {
        cleanup();
        reject(new Error('Audio playback error'));
      };

      audio.play().catch((err) => {
        cleanup();
        reject(err instanceof Error ? err : new Error('Audio playback failed'));
      });
    });
  }

  private speakWithBrowser(
    text: string,
    language: LanguageKey,
    options?: SpeakOptions
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
    this.playbackToken += 1;

    if (this.currentAudio) {
      this.currentAudio.currentTime = 0;
      this.currentAudio.pause();
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
      this.currentAudio.play().catch(() => {
        // ignore resume failures to avoid uncaught promise errors
      });
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
