import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Mic, Sparkles, Download, Share2, Copy, Check,
  List, Network, Loader2, RefreshCw, Brain
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LanguageKey } from '@/config/minimind';
import MarkdownRenderer from '../MarkdownRenderer';
import TrustFooter from '../TrustFooter';
import FeedbackPrompt from '../FeedbackPrompt';
import SkeletonLoader from '../SkeletonLoader';
import { downloadPDF, sharePDF } from '@/utils/pdfGenerator';
import { useEarlyAccess } from '@/contexts/EarlyAccessContext';
import { useSubscription, CREDIT_COSTS } from '@/contexts/SubscriptionContext';
import AIService from '@/services/aiService';

interface EkaksharPageProps {
  language: LanguageKey;
}

const EkaksharPage: React.FC<EkaksharPageProps> = ({ language }) => {
  const { isEarlyAccess } = useEarlyAccess();
  const { hasCredits, useCredits, getCredits, showUpgradePrompt } = useSubscription();
  const [input, setInput] = useState('');
  const [results, setResults] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFeedback, setShowFeedback] = useState(true);

  useEffect(() => {
    const autoQuestion = sessionStorage.getItem('ekakshar-auto-question');
    if (autoQuestion) {
      sessionStorage.removeItem('ekakshar-auto-question');
      setInput(autoQuestion);
      handleQuickCompress(autoQuestion);
    }
  }, [language]);

  const handleQuickCompress = async (question?: string) => {
    const q = question || input;
    if (!q.trim() || isProcessing) return;

    // Check credits (3 for quick recall)
    const cost = CREDIT_COSTS.ekakshar_quick || 3;
    if (!hasCredits(cost)) {
      showUpgradePrompt('Quick Recall');
      return;
    }

    setIsProcessing(true);
    
    try {
      const modes = ['oneword', 'oneline', 'bullets'];
      const promises = modes.map(async (modeId) => {
        const data = await AIService.invokeChat({
          prompt: q,
          type: modeId,
          language,
        });

        return {
          modeId,
          response: (data.response as string) || 'Unable to generate response. Please try again.',
        };
      });

      const responses = await Promise.all(promises);
      const newResults: Record<string, string> = {};
      responses.forEach(({ modeId, response }) => {
        newResults[modeId] = response;
      });
      
      // Deduct credits after success
      await useCredits(cost, 'ekakshar_quick');
      const remaining = getCredits();
      if (remaining.total > 0 && remaining.total <= 5) {
        toast.warning(`⚡ Running low on credits! ${remaining.total} remaining`);
      }
      
      setResults(newResults);
      if (!question) setInput('');
    } catch (error) {
      console.error('Error getting answer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to compress. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateMindMap = useCallback(async () => {
    if (!input.trim() && !Object.keys(results).length) {
      toast.error('Please enter something to compress first');
      return;
    }

    setIsProcessing(true);

    try {
      const data = await AIService.invokeChat({
        prompt: input || 'Generate mind map for the previous topic',
        type: 'visual_map',
        language,
      });

      setResults(prev => ({
        ...prev,
        visual_map: (data.response as string) || 'Unable to generate visual map. Please try again.',
      }));
    } catch (error) {
      console.error('Mind map error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate mind map.');
    } finally {
      setIsProcessing(false);
    }
  }, [input, results, language]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleDownload = (text: string) => {
    downloadPDF(text, 'beginner', input);
    toast.success('PDF downloaded!');
  };

  const handleShare = async (text: string) => {
    await sharePDF(text, 'beginner', input);
  };

  const handleReset = () => {
    setResults({});
    setInput('');
    setShowFeedback(true);
  };

  const handleVoiceInput = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'en' ? 'en-US' : `${language}-IN`;
      recognition.onstart = () => toast.info('🎤 Listening...');
      recognition.onresult = (event: any) => {
        setInput(event.results[0][0].transcript);
        toast.success('✅ Got it!');
      };
      recognition.onerror = (event: any) => toast.error(`Error: ${event.error}`);
      recognition.start();
    } else {
      toast.error('Voice input not supported');
    }
  }, [language]);

  const hasResults = Object.keys(results).length > 0;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/20 mb-4">
          <Zap className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Ekakshar
          </span>
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary">
            3 credits
          </span>
        </div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Compress Any Idea
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          From paragraphs to essence — pure knowledge compression
        </p>
      </motion.div>

      {/* Input Card */}
      <Card className="p-4 bg-card border-border shadow-sm">
        <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-1.5">
          <button
            type="button"
            className="p-2.5 rounded-lg hover:bg-background transition-colors flex-shrink-0"
            onClick={handleVoiceInput}
          >
            <Mic className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter any topic or concept..."
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-foreground text-base placeholder:text-muted-foreground py-2"
            disabled={isProcessing}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickCompress()}
          />
          
          <Button
            onClick={() => handleQuickCompress()}
            size="icon"
            className="h-10 w-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white flex-shrink-0"
            disabled={!input.trim() || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
          </Button>
        </div>
      </Card>

      {/* Loading State */}
      {isProcessing && !hasResults && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <SkeletonLoader variant="card" lines={2} message="Compressing knowledge..." />
          <SkeletonLoader variant="card" lines={1} />
          <SkeletonLoader variant="card" lines={3} />
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {hasResults && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* One Word Result - Hero Card */}
            {results.oneword && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="p-6 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg overflow-hidden relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        <span className="font-semibold text-sm">One Word</span>
                      </div>
                      <button
                        onClick={() => handleCopy(results.oneword)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    <motion.p 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', delay: 0.2 }}
                      className="text-4xl md:text-5xl font-bold text-center py-6"
                    >
                      {results.oneword}
                    </motion.p>
                    
                    <p className="text-center text-white/70 text-sm">
                      The purest essence of your concept
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* One Sentence Result */}
            {results.oneline && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="p-5 bg-card border-violet-500/20 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                      <Sparkles className="w-4 h-4 text-violet-500" />
                    </div>
                    <span className="font-semibold text-foreground text-sm">One Sentence</span>
                  </div>
                  <p className="text-lg font-medium text-foreground leading-relaxed">
                    {results.oneline}
                  </p>
                </Card>
              </motion.div>
            )}

            {/* Key Insights */}
            {results.bullets && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="p-5 bg-card border-cyan-500/20 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <List className="w-4 h-4 text-cyan-500" />
                    </div>
                    <span className="font-semibold text-foreground text-sm">Key Insights</span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <MarkdownRenderer content={results.bullets} />
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Mind Map Section */}
            {!results.visual_map ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  onClick={handleGenerateMindMap}
                  disabled={isProcessing}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all flex items-center justify-center gap-3"
                >
                  <Network className="w-5 h-5 text-emerald-500" />
                  <span className="font-medium text-foreground">Generate Mind Map</span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-5 bg-card border-emerald-500/20 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <Network className="w-4 h-4 text-emerald-500" />
                      </div>
                      <span className="font-semibold text-foreground text-sm">Mind Map</span>
                    </div>
                    <button
                      onClick={() => handleCopy(results.visual_map)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <pre className="whitespace-pre-wrap text-sm font-mono text-foreground overflow-x-auto">
                      {results.visual_map}
                    </pre>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Trust Footer & Feedback */}
            <div className="space-y-3 pt-2">
              <TrustFooter 
                creditCost={0}
                confidence="high"
                sourceType="reasoning"
              />
              
              {isEarlyAccess && showFeedback && (
                <FeedbackPrompt 
                  onFeedback={(type, comment) => {
                    console.log('Ekakshar Feedback:', { type, comment });
                    setShowFeedback(false);
                  }}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleReset} className="flex-1 h-12 rounded-xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                New Topic
              </Button>
              <Button 
                variant="outline" 
                className="h-12 w-12 rounded-xl"
                onClick={() => results.oneword && handleDownload(Object.values(results).join('\n\n'))}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline"
                className="h-12 w-12 rounded-xl"
                onClick={() => results.oneword && handleShare(Object.values(results).join('\n\n'))}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!hasResults && !isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-amber-500/50" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Compress Any Idea</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
            Enter any topic above and watch it transform into pure understanding
          </p>
          
          {/* Quick Examples */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Try these:</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm mx-auto">
              {['Quantum Computing', 'Blockchain', 'Machine Learning', 'Photosynthesis'].map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setInput(example);
                    handleQuickCompress(example);
                  }}
                  className="px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EkaksharPage;
