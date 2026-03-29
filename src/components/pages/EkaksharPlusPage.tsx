import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Zap, List, Network, ArrowRight, 
  Loader2, Copy, Check, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useSubscription, CREDIT_COSTS } from '@/contexts/SubscriptionContext';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import AIService from '@/services/aiService';

interface CompressionMode {
  id: string;
  label: string;
  description: string;
  icon: typeof Zap;
  color: string;
  credits: number;
}

const COMPRESSION_MODES: CompressionMode[] = [
...
const EkaksharPlusPage: React.FC = () => {
  const { getCredits, hasCredits, useCredits, showUpgradePrompt } = useSubscription();
  const [input, setInput] = useState('');
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-load from session storage (from other pages)
  useEffect(() => {
    const autoQuestion = sessionStorage.getItem('ekakshar-auto-question');
    if (autoQuestion) {
      setInput(autoQuestion);
      sessionStorage.removeItem('ekakshar-auto-question');
    }
  }, []);

  const handleCompress = useCallback(async (modeId: string) => {
    if (!input.trim()) {
      toast.error('Please enter something to compress');
      return;
    }

    const mode = COMPRESSION_MODES.find(m => m.id === modeId);
    if (!mode) return;

    if (!hasCredits(mode.credits)) {
      showUpgradePrompt('Ekakshar++');
      return;
    }

    setSelectedMode(modeId);
    setIsProcessing(true);
    setResult(null);

    try {
      const data = await AIService.invokeChat({
        prompt: input,
        type: modeId,
        language: 'en',
      });

      useCredits(mode.credits, `ekakshar_${modeId}`);
      setResult((data.response as string) || 'Unable to generate response. Please try again.');
    } catch (error) {
      console.error('Compression error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [input, hasCredits, useCredits, showUpgradePrompt]);

  const handleCopy = useCallback(() => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const handleReset = () => {
    setResult(null);
    setSelectedMode(null);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-300">Ekakshar++</span>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
          Compress Knowledge
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Transform any concept into its purest form
        </p>
      </motion.div>

      {/* Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter a topic, concept, or paste any text to compress..."
            className="min-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-muted-foreground">
              {input.length} characters
            </span>
            {input && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInput('')}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Compression Modes */}
      {!result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-medium text-muted-foreground">Choose compression level:</h3>
          <div className="grid grid-cols-2 gap-3">
            {COMPRESSION_MODES.map((mode, index) => {
              const Icon = mode.icon;
              const isActive = selectedMode === mode.id && isProcessing;
              return (
                <motion.button
                  key={mode.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCompress(mode.id)}
                  disabled={isProcessing || !input.trim()}
                  className={`relative p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'border-transparent bg-gradient-to-br ' + mode.color + ' text-white shadow-lg'
                      : 'border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {isActive ? (
                    <Loader2 className="w-6 h-6 mb-2 text-white animate-spin" />
                  ) : (
                    <Icon className={`w-6 h-6 mb-2 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                  )}
                  <p className={`font-medium text-sm ${isActive ? 'text-white' : 'text-foreground'}`}>
                    {mode.label}
                  </p>
                  <p className={`text-xs ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {mode.description}
                  </p>
                  <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {mode.credits}c
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Card className={`p-6 bg-gradient-to-br ${COMPRESSION_MODES.find(m => m.id === selectedMode)?.color} text-white`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {React.createElement(COMPRESSION_MODES.find(m => m.id === selectedMode)?.icon || Zap, {
                    className: 'w-5 h-5',
                  })}
                  <span className="font-medium">
                    {COMPRESSION_MODES.find(m => m.id === selectedMode)?.label}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="text-white/80 hover:text-white hover:bg-white/20"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              
              {selectedMode === 'oneword' ? (
                <p className="text-4xl font-bold text-center py-8">{result}</p>
              ) : selectedMode === 'oneline' ? (
                <p className="text-xl font-medium text-center py-4">{result}</p>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <MarkdownRenderer content={result} />
                </div>
              )}
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Another Mode
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setInput('');
                  handleReset();
                }}
                className="flex-1"
              >
                New Topic
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EkaksharPlusPage;
