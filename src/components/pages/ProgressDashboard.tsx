import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, TrendingUp, BookOpen, Brain, Sparkles, 
  ChevronRight, Flame, Trophy, Zap, Loader2, RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  useWeeklyActivity,
  useLanguageBreakdown,
  useModeDistribution,
  useLearningStreak,
  useTotalLogCount,
} from '@/hooks/useUsageStats';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { ModeKey, modes } from '@/config/minimind';

interface LearningTopic {
  id: string;
  name: string;
  progress: number;
  lastAccessed: Date;
  questionsAsked: number;
}

interface DashboardStats {
  totalQuestions: number;
  streak: number;
  longestStreak: number;
  topicsExplored: number;
  learningPathsActive: number;
  learningPathsCompleted: number;
}

interface BrainAnalysis {
  summary: string;
  strengths: string[];
  growthAreas: string[];
  brainType: string;
  brainEmoji: string;
  tip: string;
  modeInsights: { mode: string; insight: string }[];
}

const ProgressDashboard: React.FC = () => {
  const { getCredits, tier } = useSubscription();
  const [stats, setStats] = useState<DashboardStats>({
    totalQuestions: 0,
    streak: 0,
    longestStreak: 0,
    topicsExplored: 0,
    learningPathsActive: 0,
    learningPathsCompleted: 0,
  });
  const [activeTopics, setActiveTopics] = useState<LearningTopic[]>([]);
  const [brainAnalysis, setBrainAnalysis] = useState<BrainAnalysis | null>(null);
  const [analyzingBrain, setAnalyzingBrain] = useState(false);

  // Usage analytics hooks
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklyActivity();
  const { data: langData, isLoading: langLoading } = useLanguageBreakdown();
  const { data: modeData, isLoading: modeLoading } = useModeDistribution();
  const { data: streakCount = 0, isLoading: streakLoading } = useLearningStreak();
  const { data: totalLogs = 0 } = useTotalLogCount();

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#8b5cf6'];

  useEffect(() => {
    const savedStats = localStorage.getItem('minimind-stats');
    const savedHistory = localStorage.getItem('minimind-history');
    const savedPaths = localStorage.getItem('minimind-learning-paths');

    if (savedStats) {
      try {
        const parsed = JSON.parse(savedStats);
        setStats(prev => ({
          ...prev,
          totalQuestions: parsed.totalQuestions || 0,
          streak: parsed.streak || 0,
          longestStreak: parsed.longestStreak || 0,
        }));
      } catch (e) {}
    }

    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        const topicMap = new Map<string, LearningTopic>();
        history.forEach((item: any) => {
          const key = item.question.slice(0, 50).toLowerCase();
          if (topicMap.has(key)) {
            topicMap.get(key)!.questionsAsked++;
          } else {
            topicMap.set(key, {
              id: item.id,
              name: item.question.slice(0, 40) + (item.question.length > 40 ? '...' : ''),
              progress: Math.min(100, 30 + Math.random() * 50),
              lastAccessed: new Date(item.timestamp),
              questionsAsked: 1,
            });
          }
        });
        setActiveTopics(Array.from(topicMap.values()).slice(0, 5));
        setStats(prev => ({ ...prev, topicsExplored: topicMap.size }));
      } catch (e) {}
    }

    if (savedPaths) {
      try {
        const paths = JSON.parse(savedPaths);
        const active = paths.filter((p: any) => p.progress < 100).length;
        const completed = paths.filter((p: any) => p.progress >= 100).length;
        setStats(prev => ({
          ...prev,
          learningPathsActive: active,
          learningPathsCompleted: completed,
        }));
      } catch (e) {}
    }

    // Load cached brain analysis
    const cached = localStorage.getItem('minimind-brain-analysis');
    if (cached) {
      try { setBrainAnalysis(JSON.parse(cached)); } catch (e) {}
    }
  }, []);

  const runBrainAnalysis = async () => {
    setAnalyzingBrain(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      // Fetch recent usage logs for analysis
      const { data: recentLogs } = await supabase
        .from('usage_logs')
        .select('query_text, mode, language, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: streakRow } = await supabase
        .from('user_streaks')
        .select('current_streak, longest_streak, xp, level')
        .eq('user_id', user.id)
        .single();

      // Build context for AI
      const modeBreakdown: Record<string, number> = {};
      const topics: string[] = [];
      const languages: Record<string, number> = {};
      
      (recentLogs || []).forEach(log => {
        if (log.mode) modeBreakdown[log.mode] = (modeBreakdown[log.mode] || 0) + 1;
        if (log.query_text) topics.push(log.query_text.slice(0, 80));
        if (log.language) languages[log.language] = (languages[log.language] || 0) + 1;
      });

      const prompt = `Analyze this student's learning data and provide a detailed brain profile. Be encouraging but honest.

Data:
- Total questions: ${totalLogs}
- Current streak: ${streakRow?.current_streak || 0} days
- Longest streak: ${streakRow?.longest_streak || 0} days
- XP: ${streakRow?.xp || 0}, Level: ${streakRow?.level || 1}
- Mode usage: ${JSON.stringify(modeBreakdown)}
- Languages used: ${JSON.stringify(languages)}
- Recent topics (last 50): ${topics.slice(0, 20).join(' | ')}

Return a JSON with these exact keys:
{
  "summary": "2-3 sentence personalized summary of their learning brain",
  "strengths": ["strength1", "strength2", "strength3"],
  "growthAreas": ["area1", "area2"],
  "brainType": "Creative Explorer / Analytical Thinker / Balanced Learner / Deep Diver / etc",
  "brainEmoji": "🧠 or relevant emoji",
  "tip": "One personalized actionable tip",
  "modeInsights": [{"mode": "beginner", "insight": "..."}, ...]
}`;

      const response = await supabase.functions.invoke('chat', {
        body: {
          messages: [
            { role: 'system', content: 'You are a learning analytics AI. Respond ONLY with valid JSON, no markdown.' },
            { role: 'user', content: prompt }
          ]
        }
      });

      if (response.error) throw new Error('AI analysis failed');

      // Parse streaming response
      const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response');

      const analysis: BrainAnalysis = JSON.parse(jsonMatch[0]);
      setBrainAnalysis(analysis);
      localStorage.setItem('minimind-brain-analysis', JSON.stringify(analysis));
      toast.success('Brain analysis complete! 🧠');
    } catch (error) {
      console.error('Brain analysis error:', error);
      toast.error('Could not analyze your brain right now. Try again later.');
    } finally {
      setAnalyzingBrain(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-emerald-500" />;
    if (trend === 'down') return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
    return <div className="w-3 h-0.5 bg-muted-foreground" />;
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Learning Journey</span>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Your Progress
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your learning journey and growth
        </p>
      </motion.div>

      {/* Key Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-3"
      >
        <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
          <Flame className="w-6 h-6 text-amber-500 mb-2" />
          {streakLoading ? (
            <Skeleton className="h-8 w-12 mb-1" />
          ) : (
            <p className="text-2xl font-bold text-foreground">{streakCount}</p>
          )}
          <p className="text-xs text-muted-foreground">Day Streak</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <Brain className="w-6 h-6 text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{totalLogs}</p>
          <p className="text-xs text-muted-foreground">Questions Asked</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
          <BookOpen className="w-6 h-6 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.topicsExplored}</p>
          <p className="text-xs text-muted-foreground">Topics Explored</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
          <Trophy className="w-6 h-6 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.learningPathsCompleted}</p>
          <p className="text-xs text-muted-foreground">Paths Completed</p>
        </Card>
      </motion.div>

      {/* 🧠 AI Brain Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" />
            Your Brain Profile
          </h3>
          {brainAnalysis && (
            <button
              onClick={runBrainAnalysis}
              disabled={analyzingBrain}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${analyzingBrain ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>

        {brainAnalysis ? (
          <div className="space-y-3">
            {/* Brain Type Card */}
            <Card className="p-5 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-violet-500/10 border-purple-500/20">
              <div className="flex items-start gap-3">
                <div className="text-4xl">{brainAnalysis.brainEmoji}</div>
                <div className="flex-1">
                  <p className="font-bold text-foreground text-lg">{brainAnalysis.brainType}</p>
                  <p className="text-sm text-muted-foreground mt-1">{brainAnalysis.summary}</p>
                </div>
              </div>
            </Card>

            {/* Strengths & Growth */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 border-emerald-500/20">
                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                  💪 Strengths
                </h4>
                <ul className="space-y-1.5">
                  {brainAnalysis.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-4 border-amber-500/20">
                <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                  🌱 Growth Areas
                </h4>
                <ul className="space-y-1.5">
                  {brainAnalysis.growthAreas.map((g, i) => (
                    <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                      <span className="text-amber-500 mt-0.5">→</span>
                      {g}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Mode Insights */}
            {brainAnalysis.modeInsights && brainAnalysis.modeInsights.length > 0 && (
              <Card className="p-4 border-border/50">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Mode Insights
                </h4>
                <div className="space-y-2.5">
                  {brainAnalysis.modeInsights.map((mi, i) => {
                    const modeConfig = modes[mi.mode as ModeKey];
                    return (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="text-lg">{modeConfig?.icon || '📊'}</span>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{modeConfig?.name || mi.mode}</p>
                          <p className="text-xs text-muted-foreground">{mi.insight}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Personalized Tip */}
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">AI Tip For You</p>
                  <p className="text-sm text-foreground">{brainAnalysis.tip}</p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="p-6 text-center space-y-3">
            <Brain className="w-10 h-10 mx-auto text-purple-500/50" />
            <div>
              <p className="text-sm font-medium text-foreground">Discover Your Brain Type</p>
              <p className="text-xs text-muted-foreground mt-1">
                AI analyzes your learning patterns, topics, and modes to create a detailed brain profile.
              </p>
            </div>
            <Button
              onClick={runBrainAnalysis}
              disabled={analyzingBrain || totalLogs < 3}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              size="sm"
            >
              {analyzingBrain ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze My Brain
                </>
              )}
            </Button>
            {totalLogs < 3 && (
              <p className="text-[10px] text-muted-foreground">Ask at least 3 questions to unlock brain analysis</p>
            )}
          </Card>
        )}
      </motion.div>

      {/* Enhanced Mode Usage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">What I'm Learning</h3>
          <span className="text-xs text-muted-foreground">{activeTopics.length} active</span>
        </div>
        <Card className="divide-y divide-border bg-card/50 backdrop-blur-sm border-border/50">
          {activeTopics.length === 0 ? (
            <div className="p-6 text-center">
              <Sparkles className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Start asking questions to track your learning!
              </p>
            </div>
          ) : (
            activeTopics.map((topic, index) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="p-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{topic.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={topic.progress} className="h-1 flex-1" />
                    <span className="text-xs text-muted-foreground">{Math.round(topic.progress)}%</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            ))
          )}
        </Card>
      </motion.div>

      {/* Learning Path Progress */}
      {stats.learningPathsActive > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-sm font-medium text-foreground mb-3">Active Learning Paths</h3>
          <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {stats.learningPathsActive} Path{stats.learningPathsActive > 1 ? 's' : ''} in Progress
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.learningPathsCompleted} completed total
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Analytics from usage_logs ── */}
      {totalLogs < 3 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="p-6 text-center">
            <Sparkles className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Not enough data yet. Keep asking questions to unlock analytics!</p>
          </Card>
        </motion.div>
      ) : (
        <>
          {/* Streak from usage_logs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="p-5 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Flame className="w-7 h-7 text-white" />
                </div>
                <div>
                  {streakLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : streakCount > 0 ? (
                    <>
                      <p className="text-3xl font-bold text-foreground">{streakCount}</p>
                      <p className="text-sm text-muted-foreground">day streak</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground font-medium">Start your streak today!</p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Weekly Activity Bar Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <h3 className="text-sm font-medium text-foreground mb-3">Weekly Activity</h3>
            <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
              {weeklyLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </motion.div>

          {/* Language Breakdown Donut */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <h3 className="text-sm font-medium text-foreground mb-3">Languages Used</h3>
            <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
              {langLoading ? (
                <Skeleton className="h-44 w-full" />
              ) : langData && langData.length > 0 ? (
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={langData}
                        dataKey="count"
                        nameKey="language"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {langData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2">
                    {langData.map((item, i) => {
                      const total = langData.reduce((s, l) => s + l.count, 0);
                      const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                      return (
                        <span key={item.language} className="flex items-center gap-1.5 text-xs text-foreground">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          {item.language} ({pct}%)
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              )}
            </Card>
          </motion.div>

          {/* Mode Distribution Horizontal Bar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <h3 className="text-sm font-medium text-foreground mb-3">Learning Mode Usage</h3>
            <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
              {modeLoading ? (
                <Skeleton className="h-36 w-full" />
              ) : modeData && modeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={modeData.length * 36 + 10}>
                  <BarChart data={modeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis dataKey="mode" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={70} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              )}
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default ProgressDashboard;
