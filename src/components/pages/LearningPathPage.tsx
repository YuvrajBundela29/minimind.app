import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, ChevronRight, Sparkles, Clock, Target, 
  CheckCircle2, Circle, Play, Lock, Zap, ArrowLeft,
  GraduationCap, Rocket, Star, TrendingUp, ChevronDown, Award
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription, CREDIT_COSTS } from '@/contexts/SubscriptionContext';
import { useCoins } from '@/hooks/useCoins';
import { useEarlyAccess } from '@/contexts/EarlyAccessContext';
import { ModeKey, modes } from '@/config/minimind';
import AIService from '@/services/aiService';
import { ensureLearningPathCertificate } from '@/services/certificateService';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import SkeletonLoader from '@/components/SkeletonLoader';
import TrustFooter from '@/components/TrustFooter';
import FeedbackPrompt from '@/components/FeedbackPrompt';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Topic {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  explanations?: Partial<Record<ModeKey, string>>;
  loading?: boolean;
}

interface LearningPath {
  id: string;
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  topics: Topic[];
  currentIndex: number;
  createdAt: Date;
  icon?: string;
}

const SUBJECTS = [
  { id: 'ai', name: 'Artificial Intelligence', icon: '🤖', gradient: 'from-violet-500 to-purple-600' },
  { id: 'physics', name: 'Physics', icon: '⚛️', gradient: 'from-blue-500 to-cyan-500' },
  { id: 'philosophy', name: 'Philosophy', icon: '🧘', gradient: 'from-amber-500 to-orange-500' },
  { id: 'finance', name: 'Finance & Investing', icon: '💰', gradient: 'from-emerald-500 to-green-500' },
  { id: 'biology', name: 'Biology', icon: '🧬', gradient: 'from-pink-500 to-rose-500' },
  { id: 'history', name: 'World History', icon: '📜', gradient: 'from-yellow-500 to-amber-500' },
  { id: 'psychology', name: 'Psychology', icon: '🧠', gradient: 'from-fuchsia-500 to-pink-500' },
  { id: 'programming', name: 'Programming', icon: '💻', gradient: 'from-teal-500 to-cyan-500' },
];

const LEVELS = [
  { id: 'beginner', name: 'Beginner', description: 'Start from basics', icon: '🌱' },
  { id: 'intermediate', name: 'Intermediate', description: 'Build on fundamentals', icon: '🌿' },
  { id: 'advanced', name: 'Advanced', description: 'Deep expertise', icon: '🌳' },
];

const LearningPathPage: React.FC = () => {
  const { tier, hasCredits, useCredits, getCredits, showUpgradePrompt } = useSubscription();
  const { isEarlyAccess } = useEarlyAccess();
  const { awardCoins } = useCoins();
  const [step, setStep] = useState<'select' | 'path' | 'topic'>('select');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<LearningPath | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedMode, setSelectedMode] = useState<ModeKey>('beginner');
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedPaths, setSavedPaths] = useState<LearningPath[]>(() => {
    const saved = localStorage.getItem('minimind-learning-paths');
    return saved ? JSON.parse(saved) : [];
  });

  const generatePath = useCallback(async () => {
    if (!selectedSubject || !selectedLevel) return;
    
    const cost = CREDIT_COSTS.learningPath || 5;
    if (!hasCredits(cost)) {
      showUpgradePrompt('Learning Path Generation');
      return;
    }

    setIsGenerating(true);
    
    try {
      const subject = SUBJECTS.find(s => s.id === selectedSubject);
      const prompt = `Generate a learning path for ${subject?.name} at ${selectedLevel} level. Return ONLY a JSON array of 5-7 topics, each with "title" and "description" fields. Format: [{"title": "Topic 1", "description": "Brief description"}, ...]`;
      
      const result = await AIService.getExplanation(prompt, 'thinker', 'en');
      
      const jsonMatch = result.response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Failed to parse topics');
      
      const topicsData = JSON.parse(jsonMatch[0]);
      
      const topics: Topic[] = topicsData.map((t: any, i: number) => ({
        id: `topic-${i}`,
        title: t.title,
        description: t.description,
        completed: false,
      }));

      const newPath: LearningPath = {
        id: `path-${Date.now()}`,
        subject: subject?.name || selectedSubject,
        level: selectedLevel as any,
        topics,
        currentIndex: 0,
        createdAt: new Date(),
        icon: subject?.icon,
      };

      await useCredits(cost, 'learningPath');
      setCurrentPath(newPath);
      setSavedPaths(prev => {
        const updated = [newPath, ...prev.slice(0, 9)];
        localStorage.setItem('minimind-learning-paths', JSON.stringify(updated));
        return updated;
      });
      setStep('path');
      toast.success('Learning path created!');
    } catch (error) {
      console.error('Failed to generate path:', error);
      toast.error('Failed to generate learning path');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedSubject, selectedLevel, hasCredits, useCredits, showUpgradePrompt, isEarlyAccess]);

  const loadTopicExplanation = useCallback(async (topic: Topic, mode: ModeKey) => {
    if (topic.explanations?.[mode]) return;

    const cost = CREDIT_COSTS.learningPathTopic || 2;
    if (!hasCredits(cost)) {
      showUpgradePrompt('Topic Explanation');
      return;
    }

    setSelectedTopic(prev => prev ? { ...prev, loading: true } : null);
    
    try {
      const prompt = `Explain "${topic.title}" in the context of ${currentPath?.subject}. ${topic.description}`;
      const result = await AIService.getExplanation(prompt, mode, 'en');
      
      await useCredits(cost, 'learningPathTopic');
      
      setSelectedTopic(prev => {
        if (!prev) return null;
        return { ...prev, loading: false, explanations: { ...prev.explanations, [mode]: result.response } };
      });

      setCurrentPath(prev => {
        if (!prev) return null;
        const updatedTopics = prev.topics.map(t => 
          t.id === topic.id ? { ...t, explanations: { ...t.explanations, [mode]: result.response } } : t
        );
        return { ...prev, topics: updatedTopics };
      });
    } catch (error) {
      console.error('Failed to load explanation:', error);
      toast.error('Failed to load explanation');
      setSelectedTopic(prev => prev ? { ...prev, loading: false } : null);
    }
  }, [currentPath, hasCredits, useCredits, showUpgradePrompt, isEarlyAccess]);

  const issueCertificateForPath = useCallback(async (path: LearningPath) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to earn certificates.');
        return;
      }

      const completedTopics = path.topics.filter(t => t.completed).length;
      const masteryScore = Math.round((completedTopics / path.topics.length) * 100);

      const certResult = await ensureLearningPathCertificate(
        user.id,
        path.id,
        path.subject,
        masteryScore,
      );

      if (certResult.created) {
        toast.success('🎓 Certificate earned! Check your certificates page.');
      } else if (certResult.certificateCode) {
        toast.info('Certificate already exists for this path.');
      } else if (certResult.error) {
        console.error('Failed to issue certificate:', certResult.error);
        toast.error('Certificate creation failed. Please try again.');
      }
    } catch (err) {
      console.error('Failed to issue certificate:', err);
      toast.error('Certificate creation failed. Please try again.');
    }
  }, []);

  const markTopicComplete = useCallback(async (topicId: string) => {
    let updatedPath: LearningPath | null = null;

    setCurrentPath(prev => {
      if (!prev) return null;
      const updatedTopics = prev.topics.map(t => t.id === topicId ? { ...t, completed: true } : t);
      const newIndex = Math.min(prev.currentIndex + 1, updatedTopics.length - 1);
      const updated = { ...prev, topics: updatedTopics, currentIndex: newIndex };
      updatedPath = updated;

      setSavedPaths(paths => {
        const newPaths = paths.map(p => p.id === updated.id ? updated : p);
        localStorage.setItem('minimind-learning-paths', JSON.stringify(newPaths));
        return newPaths;
      });
      return updated;
    });

    toast.success('Topic completed! 🎉');

    // Use setTimeout to ensure state setter has run
    setTimeout(async () => {
      if (!updatedPath) return;
      const allDone = updatedPath.topics.every(t => t.completed);
      if (allDone) {
        await awardCoins(500, 'learning_path_complete');
        toast.success('🪙 +500 coins for completing your learning path!');
        await issueCertificateForPath(updatedPath);
      }
    }, 100);
  }, [awardCoins, issueCertificateForPath]);

  // Selection Step
  if (step === 'select') {
    return (
      <div className="space-y-6 pb-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 mb-4"
            whileHover={{ scale: 1.02 }}
          >
            <Rocket className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Learning Paths</span>
          </motion.div>
          <h1 className="text-2xl font-heading font-bold text-foreground">What do you want to master?</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-powered structured learning journeys</p>
        </motion.div>

        {/* Saved Paths */}
        {savedPaths.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Continue Learning</h2>
            </div>
            <div className="flex flex-col gap-3">
              {savedPaths.slice(0, 3).map((path, i) => {
                const progress = (path.topics.filter(t => t.completed).length / path.topics.length) * 100;
                return (
                  <motion.button
                    key={path.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all text-left group"
                    onClick={() => { setCurrentPath(path); setStep('path'); }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{path.icon || '📚'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{path.subject}</p>
                        <p className="text-xs text-muted-foreground capitalize">{path.level}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-2 w-16" />
                        <span className="text-xs font-medium text-primary">{Math.round(progress)}%</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Subject Selection */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Choose Subject</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SUBJECTS.map((subject, index) => (
              <motion.button
                key={subject.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * index }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-4 rounded-2xl border-2 transition-all text-left overflow-hidden ${
                  selectedSubject === subject.id
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-border bg-card hover:border-primary/30 hover:shadow-md'
                }`}
                onClick={() => setSelectedSubject(subject.id)}
              >
                {selectedSubject === subject.id && (
                  <motion.div layoutId="selectedSubject" className={`absolute inset-0 bg-gradient-to-br ${subject.gradient} opacity-5`} />
                )}
                <div className="relative">
                  <span className="text-3xl mb-2 block">{subject.icon}</span>
                  <p className="font-semibold text-foreground text-sm">{subject.name}</p>
                </div>
                {selectedSubject === subject.id && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Level Selection */}
        <AnimatePresence>
          {selectedSubject && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Choose Level</h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map((level, index) => (
                  <motion.button
                    key={level.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * index }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      selectedLevel === level.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                    }`}
                    onClick={() => setSelectedLevel(level.id)}
                  >
                    <span className="text-2xl mb-1 block">{level.icon}</span>
                    <p className="font-semibold text-foreground text-xs">{level.name}</p>
                    <p className="text-[10px] text-muted-foreground">{level.description}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate Button */}
        <AnimatePresence>
          {selectedSubject && selectedLevel && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <Button
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary via-primary to-accent text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25"
                onClick={generatePath}
                disabled={isGenerating || !hasCredits(CREDIT_COSTS.learningPath || 5)}
              >
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.span key={i} className="w-2 h-2 bg-white rounded-full" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 * i }} />
                        ))}
                      </div>
                      <span>Thinking deeply...</span>
                    </div>
                    <span className="text-xs opacity-70">~10 seconds</span>
                  </div>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Learning Path
                    {tier === 'free' && (
                      <span className="ml-2 px-2.5 py-1 rounded-full bg-white/20 text-xs">
                        1 use
                      </span>
                    )}
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skeleton loader during generation */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6"
          >
            <SkeletonLoader 
              variant="learning-path" 
              message="Thinking deeply... ~10 seconds"
            />
          </motion.div>
        )}
      </div>
    );
  }

  // Path View
  if (step === 'path' && currentPath) {
    const completedCount = currentPath.topics.filter(t => t.completed).length;
    const progress = (completedCount / currentPath.topics.length) * 100;

    return (
      <div className="space-y-6 pb-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep('select')} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentPath.icon}</span>
              <h1 className="text-xl font-heading font-bold text-foreground">{currentPath.subject}</h1>
            </div>
            <p className="text-sm text-muted-foreground capitalize">{currentPath.level} Level</p>
          </div>
        </motion.div>

        {/* Progress */}
        <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{completedCount} of {currentPath.topics.length} topics</span>
            <span className="text-sm font-semibold text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </Card>

        {/* Topics */}
        <div className="space-y-3">
          {currentPath.topics.map((topic, index) => {
            const isUnlocked = index === 0 || currentPath.topics[index - 1].completed;
            const isCurrent = index === currentPath.currentIndex;
            
            return (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <Card
                  className={`p-4 cursor-pointer transition-all ${
                    topic.completed
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : isCurrent
                      ? 'bg-primary/10 border-primary/30 shadow-md'
                      : isUnlocked
                      ? 'bg-card hover:border-primary/30 hover:shadow-md'
                      : 'bg-muted/50 opacity-60'
                  }`}
                  onClick={() => isUnlocked && (setSelectedTopic(topic), setStep('topic'))}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      topic.completed ? 'bg-emerald-500' : isCurrent ? 'bg-primary' : 'bg-muted'
                    }`}>
                      {topic.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : !isUnlocked ? (
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <span className="text-sm font-bold text-foreground">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${topic.completed ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>
                        {topic.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{topic.description}</p>
                    </div>
                    {isUnlocked && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // Topic View
  if (step === 'topic' && selectedTopic && currentPath) {
    const explanation = selectedTopic.explanations?.[selectedMode];
    
    return (
      <div className="space-y-6 pb-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep('path')} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-heading font-bold text-foreground">{selectedTopic.title}</h1>
            <p className="text-sm text-muted-foreground">{currentPath.subject}</p>
          </div>
        </motion.div>

        {/* Mode Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 custom-scrollbar">
          {(Object.keys(modes) as ModeKey[]).map((modeKey) => (
            <Button
              key={modeKey}
              variant={selectedMode === modeKey ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedMode(modeKey);
                if (!selectedTopic.explanations?.[modeKey]) {
                  loadTopicExplanation(selectedTopic, modeKey);
                }
              }}
              className="flex-shrink-0 rounded-xl"
            >
              <span className="mr-1.5">{modes[modeKey].icon}</span>
              {modes[modeKey].name}
            </Button>
          ))}
        </div>

        {/* Content */}
        <Card className="p-5 bg-card/80 backdrop-blur-sm border-border/50">
          {selectedTopic.loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading explanation...</p>
            </div>
          ) : explanation ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownRenderer content={explanation} />
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Ready to learn about this topic?</p>
              <Button onClick={() => loadTopicExplanation(selectedTopic, selectedMode)}>
                <Play className="w-4 h-4 mr-2" />
                Load Explanation
              </Button>
            </div>
          )}
        </Card>

        {/* Complete Button */}
        {!selectedTopic.completed && explanation && (
          <Button
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold"
            onClick={() => {
              markTopicComplete(selectedTopic.id);
              setStep('path');
            }}
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Mark as Complete
          </Button>
        )}
      </div>
    );
  }

  return null;
};

export default LearningPathPage;
