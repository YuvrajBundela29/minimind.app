// MiniMind AI Service - Connects to Lovable AI via Edge Function
import { supabase } from "@/integrations/supabase/client";

export interface PurposeLensOptions {
  purposeLens?: string;
  customLensPrompt?: string;
}

export interface AIResponseWithCredits {
  response: string;
  credits_remaining: number | null;
  daily_remaining: number | null;
  monthly_remaining: number | null;
}

export class AIService {
  private static isAuthError(error: unknown): boolean {
    const candidate = error as { message?: string; status?: number; context?: { status?: number } };
    const status = candidate?.context?.status ?? candidate?.status;
    const message = (candidate?.message || '').toLowerCase();

    return (
      status === 401 ||
      message.includes('401') ||
      message.includes('authentication required') ||
      message.includes('invalid jwt') ||
      message.includes('bad_jwt')
    );
  }

  static async invokeChat(body: Record<string, unknown>): Promise<AIResponseWithCredits> {
    const invoke = () => supabase.functions.invoke('chat', { body });

    let { data, error } = await invoke();

    if (error && AIService.isAuthError(error)) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData.session) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            const retried = await invoke();
            data = retried.data;
            error = retried.error;
          }
        }
      } catch (refreshError) {
        console.error('Session refresh failed:', refreshError);
      }
    }

    if (error) {
      console.error('AI Service error:', error);
      if (AIService.isAuthError(error)) {
        throw new Error('Authentication required. Please sign in again.');
      }
      throw new Error(error.message || 'Failed to process request');
    }

    const result = (data ?? {}) as Record<string, unknown>;
    return {
      response: (result.response as string) || 'Unable to generate response. Please try again.',
      credits_remaining: (result.credits_remaining as number) ?? null,
      daily_remaining: (result.daily_remaining as number) ?? null,
      monthly_remaining: (result.monthly_remaining as number) ?? null,
    };
  }

  static async getExplanation(
    prompt: string,
    mode: string,
    language: string,
    lensOptions?: PurposeLensOptions
  ): Promise<AIResponseWithCredits> {
    return AIService.invokeChat({
      prompt,
      mode,
      language,
      type: 'explain',
      purposeLens: lensOptions?.purposeLens || 'general',
      customLensPrompt: lensOptions?.customLensPrompt,
    });
  }

  static async getEkaksharAnswer(prompt: string, language: string): Promise<AIResponseWithCredits> {
    return AIService.invokeChat({ prompt, language, type: 'ekakshar' });
  }

  static async getOneWordAnswer(prompt: string, language: string): Promise<AIResponseWithCredits> {
    return AIService.invokeChat({ prompt, language, type: 'oneword' });
  }

  static async refinePrompt(prompt: string, language: string): Promise<string> {
    const data = await AIService.invokeChat({ prompt, language, type: 'refine' });
    return data.response || prompt;
  }

  static async continueConversation(
    messages: Array<{ role: string; content: string }>,
    mode: string,
    language: string,
    lensOptions?: PurposeLensOptions
  ): Promise<AIResponseWithCredits> {
    return AIService.invokeChat({
      messages,
      mode,
      language,
      type: 'continue',
      purposeLens: lensOptions?.purposeLens || 'general',
      customLensPrompt: lensOptions?.customLensPrompt,
    });
  }
}

export default AIService;
