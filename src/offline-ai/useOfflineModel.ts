import { useState, useRef, useCallback, useEffect } from 'react';

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'generating' | 'error' | 'unsupported';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useOfflineModel() {
  const [status, setStatus] = useState<ModelStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [progressFile, setProgressFile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const workerRef = useRef<Worker | null>(null);

  // Device capability check
  const checkDevice = useCallback((): boolean => {
    const cores = navigator.hardwareConcurrency || 2;
    const memory = (navigator as any).deviceMemory || 4;
    if (cores < 4 || memory < 3) {
      setStatus('unsupported');
      setError(`Your device may be too weak for offline AI (${cores} cores, ${memory}GB RAM). Try on a more powerful device.`);
      return false;
    }
    return true;
  }, []);

  const initWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

    worker.addEventListener('message', (e) => {
      const { type, status: s, progress: p, file, text, error: err } = e.data;

      if (type === 'status') {
        setStatus(s);
        if (p !== undefined) setProgress(p);
        if (file) setProgressFile(file);
      }
      if (type === 'result') {
        setStatus('ready');
        setMessages((prev) => [...prev, { role: 'assistant', content: text }]);
      }
      if (type === 'error') {
        setStatus('error');
        setError(err);
      }
    });

    workerRef.current = worker;
    return worker;
  }, []);

  const loadModel = useCallback(() => {
    if (!checkDevice()) return;
    setError(null);
    setProgress(0);
    const worker = initWorker();
    worker.postMessage({ type: 'load' });
  }, [checkDevice, initWorker]);

  const generate = useCallback((prompt: string) => {
    if (!workerRef.current || status !== 'ready') return;
    setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    workerRef.current.postMessage({
      type: 'generate',
      payload: { prompt, maxTokens: 256 },
    });
  }, [status]);

  const clearChat = useCallback(() => setMessages([]), []);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return { status, progress, progressFile, error, messages, loadModel, generate, clearChat };
}
