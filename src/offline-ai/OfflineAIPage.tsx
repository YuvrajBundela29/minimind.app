import React, { useState, useRef, useEffect } from 'react';
import { useOfflineModel, ModelStatus } from './useOfflineModel';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Trash2, Cpu, Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const statusConfig: Record<ModelStatus, { label: string; color: string; icon: React.ReactNode }> = {
  idle: { label: 'Not loaded', color: 'text-muted-foreground', icon: <Cpu className="w-4 h-4" /> },
  loading: { label: 'Loading model...', color: 'text-primary', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  ready: { label: 'Ready — Fully Offline', color: 'text-green-500', icon: <WifiOff className="w-4 h-4" /> },
  generating: { label: 'Generating...', color: 'text-primary', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  error: { label: 'Error', color: 'text-destructive', icon: <AlertTriangle className="w-4 h-4" /> },
  unsupported: { label: 'Device not supported', color: 'text-destructive', icon: <AlertTriangle className="w-4 h-4" /> },
};

const OfflineAIPage: React.FC = () => {
  const navigate = useNavigate();
  const { status, progress, progressFile, error, messages, loadModel, generate, clearChat } = useOfflineModel();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || status !== 'ready') return;
    generate(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sc = statusConfig[status];

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold font-[var(--font-heading)] truncate">Offline AI</h1>
          <div className={`flex items-center gap-1.5 text-xs ${sc.color}`}>
            {sc.icon}
            <span>{sc.label}</span>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={clearChat} aria-label="Clear chat">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {status === 'idle' || status === 'unsupported' || (status === 'error' && messages.length === 0) ? (
          /* Hero / Load state */
          <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Cpu className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h2 className="text-xl font-semibold font-[var(--font-heading)]">Run AI on your device</h2>
              <p className="text-sm text-muted-foreground">
                Download a small AI model (~350 MB) to chat completely offline. The model is cached after the first download.
              </p>
            </div>
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-sm max-w-sm">
                {error}
              </div>
            )}
            <Button onClick={loadModel} size="lg" disabled={status === 'unsupported'} className="gap-2">
              <Wifi className="w-4 h-4" />
              Download &amp; Load Model
            </Button>
            <p className="text-xs text-muted-foreground max-w-xs">
              Requires a one-time download. After that, works without internet.
            </p>
          </div>
        ) : status === 'loading' ? (
          /* Loading progress */
          <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-5">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <div className="space-y-3 w-full max-w-xs">
              <h2 className="text-lg font-semibold font-[var(--font-heading)]">Loading model...</h2>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground truncate">
                {progressFile ? `Downloading: ${progressFile.split('/').pop()}` : `${progress}%`}
              </p>
              <p className="text-xs text-muted-foreground">First time may take 1–2 minutes</p>
            </div>
          </div>
        ) : (
          /* Chat area */
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-3 p-4 pb-2">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-12">
                  Model is ready! Type a message to start chatting offline.
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'self-end bg-primary text-primary-foreground rounded-br-md'
                      : 'self-start bg-muted text-foreground rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {status === 'generating' && (
                <div className="self-start bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 text-sm flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Thinking...
                </div>
              )}
              {status === 'error' && error && (
                <div className="bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-sm">
                  {error}
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Input bar — shown when model is ready or generating */}
      {(status === 'ready' || status === 'generating') && (
        <div className="shrink-0 border-t border-border bg-card px-3 py-2.5">
          <div className="flex items-end gap-2 max-w-2xl mx-auto">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              className="flex-1 resize-none bg-muted rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px] max-h-[120px]"
              disabled={status === 'generating'}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || status !== 'ready'}
              className="shrink-0 rounded-xl"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-1.5">
            Running Qwen2.5-0.5B locally · Max 256 tokens · Responses may be limited
          </p>
        </div>
      )}
    </div>
  );
};

export default OfflineAIPage;
