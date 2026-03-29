import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Brain, Lightbulb,
  ArrowRight, Loader2, RefreshCw, Trophy, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useEarlyAccess } from '@/contexts/EarlyAccessContext';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import SkeletonLoader from '@/components/SkeletonLoader';
import AIService from '@/services/aiService';

interface EvaluationResult {
  score: number;
  feedback: string;
}

const SAMPLE_TOPICS = [
  'What is photosynthesis?',
  'How does the internet work?',
  'What causes earthquakes?',
  'How do vaccines protect us?',
  'What is artificial intelligence?',
  'How does memory work?',
];

const ExplainBackPage: React.FC = () => {
  const { hasCredits, useCredits, showUpgradePrompt } = useSubscription();
  const { isEarlyAccess } = useEarlyAccess();
  const [step, setStep] = useState<'topic' | 'learn' | 'explain' | 'feedback'>('topic');
  const [topic, setTopic] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [userExplanation, setUserExplanation] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGetExplanation = useCallback(async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    if (!hasCredits(2)) {
      showUpgradePrompt('Explain-It-Back');
      return;
    }

    setIsLoading(true);
    try {
      const response = await AIService.getExplanation(
        `Explain this concept clearly and thoroughly so that someone could learn and then explain it back: ${topic}`,
        'thinker',
        'en'
      );
      
      useCredits(2, 'explain_back_learn');
      setAiExplanation(result.response);
      setStep('learn');
    } catch (error) {
      console.error('Error getting explanation:', error);
      toast.error('Failed to get explanation');
    } finally {
      setIsLoading(false);
    }
  }, [topic, hasCredits, useCredits, showUpgradePrompt, isEarlyAccess]);

  const handleEvaluate = useCallback(async () => {
    if (!userExplanation.trim()) {
      toast.error('Please write your explanation');
      return;
    }

    if (!hasCredits(3)) {
      showUpgradePrompt('Explain-It-Back Evaluation');
      return;
    }

    setIsLoading(true);
    try {
      const data = await AIService.invokeChat({
        type: 'explain_back_evaluate',
        prompt: userExplanation,
        originalConcept: aiExplanation,
        language: 'en',
      });

      useCredits(3, 'explain_back_evaluate');
      
      const responseText = (data.response as string) || 'Unable to evaluate right now. Please try again.';
      const scoreMatch = responseText.match(/(\d+)\s*\/\s*10/);
      const score = scoreMatch ? parseInt(scoreMatch[1]) * 10 : 70;

      setEvaluation({
        score,
        feedback: responseText,
      });
      
      setStep('feedback');
    } catch (error) {
      console.error('Error evaluating:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to evaluate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [userExplanation, aiExplanation, hasCredits, useCredits, showUpgradePrompt, isEarlyAccess]);

  const handleReset = () => {
    setStep('topic');
    setTopic('');
    setAiExplanation('');
    setUserExplanation('');
    setEvaluation(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-teal-500';
    if (score >= 60) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent!';
    if (score >= 80) return 'Great job!';
    if (score >= 70) return 'Good understanding';
    if (score >= 60) return 'Getting there';
    return 'Keep learning';
  };

  const steps = ['topic', 'learn', 'explain', 'feedback'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 mb-4">
          <Brain className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Explain-It-Back
          </span>
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary">
            2 credits
          </span>
        </div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Test Your Understanding
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Learn a concept, then explain it back for AI feedback
        </p>
      </motion.div>

      {/* Progress Steps */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center gap-1"
      >
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              step === s 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25' 
                : currentStepIndex > i
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            {i < 3 && (
              <div className={`w-8 h-1 rounded-full transition-all ${
                currentStepIndex > i
                  ? 'bg-emerald-500'
                  : 'bg-muted'
              }`} />
            )}
          </React.Fragment>
        ))}
      </motion.div>

      {/* Step Labels */}
      <div className="flex justify-center gap-6 text-xs text-muted-foreground">
        <span className={step === 'topic' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>Choose</span>
        <span className={step === 'learn' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>Learn</span>
        <span className={step === 'explain' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>Explain</span>
        <span className={step === 'feedback' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>Feedback</span>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Topic Selection */}
        {step === 'topic' && (
          <motion.div
            key="topic"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <Card className="p-5 bg-card border-border shadow-sm">
              <label className="block text-sm font-medium text-foreground mb-3">
                What do you want to learn?
              </label>
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic or question..."
                className="min-h-[100px] resize-none bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
            </Card>

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Or try one of these:</p>
              <div className="flex flex-col gap-2">
                {SAMPLE_TOPICS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={`px-4 py-3 text-left text-sm rounded-xl transition-all ${
                      topic === t 
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-foreground' 
                        : 'bg-muted/50 hover:bg-muted text-foreground border border-transparent'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {isLoading && (
              <SkeletonLoader variant="card" lines={4} message="Preparing explanation..." />
            )}

            <Button
              onClick={handleGetExplanation}
              disabled={isLoading || !topic.trim()}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-base shadow-lg shadow-emerald-500/25"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Preparing...</span>
                </div>
              ) : (
                <>
                  Start Learning
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Step 2: Learn */}
        {step === 'learn' && (
          <motion.div
            key="learn"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <Card className="p-5 bg-card border-emerald-500/20 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10">
                  <Lightbulb className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <span className="font-semibold text-foreground">Learn this concept</span>
                  <p className="text-xs text-muted-foreground">Take your time to understand</p>
                </div>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none max-h-[350px] overflow-y-auto custom-scrollbar">
                <MarkdownRenderer content={aiExplanation} />
              </div>
            </Card>

            <Card className="p-4 bg-amber-500/5 border-amber-500/20">
              <p className="text-sm text-foreground flex items-start gap-2">
                <span className="text-lg">📚</span>
                <span>Read carefully! When ready, you'll explain this concept in your own words.</span>
              </p>
            </Card>

            <Button
              onClick={() => setStep('explain')}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-base"
            >
              I'm Ready to Explain
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* Step 3: User Explanation */}
        {step === 'explain' && (
          <motion.div
            key="explain"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center mb-3">
                <MessageSquare className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Your turn!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Explain "{topic}" in your own words
              </p>
            </div>

            <Card className="p-5 bg-card border-border shadow-sm">
              <Textarea
                value={userExplanation}
                onChange={(e) => setUserExplanation(e.target.value)}
                placeholder="Write your explanation here... Don't look back! Use your own understanding."
                className="min-h-[200px] resize-none bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {userExplanation.length} characters
                </span>
                <span className="text-xs text-muted-foreground">
                  Tip: Be thorough, use your own words
                </span>
              </div>
            </Card>

            {isLoading && (
              <SkeletonLoader variant="card" lines={3} message="Analyzing your explanation..." />
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('learn')}
                className="flex-1 h-12 rounded-xl"
              >
                Review Again
              </Button>
              <Button
                onClick={handleEvaluate}
                disabled={isLoading || !userExplanation.trim()}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Get Feedback
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Feedback */}
        {step === 'feedback' && evaluation && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            {/* Score Card */}
            <Card className="p-6 text-center bg-card border-border shadow-sm">
              <div className="relative w-28 h-28 mx-auto mb-4">
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <motion.circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={301.6}
                    initial={{ strokeDashoffset: 301.6 }}
                    animate={{ strokeDashoffset: 301.6 - (301.6 * evaluation.score) / 100 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={getScoreColor(evaluation.score)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className={`text-3xl font-bold ${getScoreColor(evaluation.score)}`}
                  >
                    {evaluation.score}%
                  </motion.span>
                </div>
              </div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className={`text-xl font-semibold bg-gradient-to-r ${getScoreGradient(evaluation.score)} bg-clip-text text-transparent`}
              >
                {getScoreLabel(evaluation.score)}
              </motion.p>
              {evaluation.score >= 80 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1, type: 'spring' }}
                >
                  <Trophy className="w-10 h-10 mx-auto mt-3 text-amber-400" />
                </motion.div>
              )}
            </Card>

            {/* Detailed Feedback */}
            <Card className="p-5 bg-card border-border shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <span className="font-semibold text-foreground">Detailed Feedback</span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer content={evaluation.feedback} />
              </div>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('learn')}
                className="flex-1 h-12 rounded-xl"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={handleReset}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
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

export default ExplainBackPage;
