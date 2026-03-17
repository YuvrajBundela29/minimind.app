// Web Worker for offline AI inference — runs in a separate thread to prevent UI freezing
import { pipeline, TextGenerationPipeline, env } from '@huggingface/transformers';

// Configure transformers.js for browser
env.allowLocalModels = false;
env.useBrowserCache = true;

let generator: TextGenerationPipeline | null = null;
const MODEL_ID = 'Xenova/Qwen2.5-0.5B-Instruct';

interface WorkerMessage {
  type: 'load' | 'generate' | 'abort';
  payload?: {
    prompt?: string;
    maxTokens?: number;
  };
}

self.addEventListener('message', async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  if (type === 'load') {
    try {
      self.postMessage({ type: 'status', status: 'loading', progress: 0 });

      generator = (await pipeline('text-generation', MODEL_ID, {
        dtype: 'q4',
        progress_callback: (progress: any) => {
          if (progress.status === 'progress' && progress.total) {
            const pct = Math.round((progress.loaded / progress.total) * 100);
            self.postMessage({ type: 'status', status: 'loading', progress: pct, file: progress.file });
          } else if (progress.status === 'done') {
            self.postMessage({ type: 'status', status: 'loading', progress: 100, file: progress.file });
          }
        },
      })) as TextGenerationPipeline;

      self.postMessage({ type: 'status', status: 'ready' });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message || 'Failed to load model' });
    }
  }

  if (type === 'generate') {
    if (!generator) {
      self.postMessage({ type: 'error', error: 'Model not loaded' });
      return;
    }

    const prompt = payload?.prompt || '';
    const maxTokens = payload?.maxTokens || 256;

    try {
      self.postMessage({ type: 'status', status: 'generating' });

      const messages = [
        { role: 'system', content: 'You are a helpful, concise assistant. Keep answers brief and clear.' },
        { role: 'user', content: prompt },
      ];

      const result = await generator(messages as any, {
        max_new_tokens: maxTokens,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
      });

      // Extract generated text
      const output = result as any;
      let text = '';
      if (Array.isArray(output) && output[0]?.generated_text) {
        const generated = output[0].generated_text;
        if (Array.isArray(generated)) {
          // Chat format — get the last assistant message
          const assistantMsg = generated.filter((m: any) => m.role === 'assistant').pop();
          text = assistantMsg?.content || '';
        } else {
          text = typeof generated === 'string' ? generated : JSON.stringify(generated);
        }
      }

      self.postMessage({ type: 'result', text });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message || 'Inference failed' });
    }
  }
});
