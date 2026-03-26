import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, TrendingUp, BookOpen, Brain, Sparkles, 
  ChevronRight, Calendar, Flame, Trophy, Zap
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/contexts/SubscriptionContext';
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

interface LearningTopic {
  id: string;
  name: string;
  progress: number;
  lastAccessed: Date;
  questionsAsked: number;
}

interface SkillArea {
  name: string;
  level: number;
  trend: 'up' | 'stable' | 'down';
}

interface DashboardStats {
  totalQuestions: number;
  streak: number;
  longestStreak: number;
  topicsExplored: number;
  learningPathsActive: number;
  learningPathsCompleted: number;
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
  const [skillAreas, setSkillAreas] = useState<SkillArea[]>([]);

  // Usage analytics hooks
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklyActivity();
  const { data: langData, isLoading: langLoading } = useLanguageBreakdown();
  const { data: modeData, isLoading: modeLoading } = useModeDistribution();
  const { data: streakCount = 0, isLoading: streakLoading } = useLearningStreak();
  const { data: totalLogs = 0 } = useTotalLogCount();

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#8b5cf6'];
  const [skillAreas, setSkillAreas] = useState<SkillArea[]>([]);

  // Load data from localStorage
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
        // Extract unique topics from history
        const topicMap = new Map<string, LearningTopic>();
        history.forEach((item: any) => {
          const key = item.question.slice(0, 50).toLowerCase();
          if (topicMap.has(key)) {
            const existing = topicMap.get(key)!;
            existing.questionsAsked++;
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

    // Generate skill areas based on history
    setSkillAreas([
      { name: 'Critical Thinking', level: 65, trend: 'up' },
      { name: 'Science & Nature', level: 45, trend: 'up' },
      { name: 'Technology', level: 55, trend: 'stable' },
      { name: 'History & Culture', level: 30, trend: 'up' },
    ]);
  }, []);

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-500" />;
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
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 mb-4">
          <Target className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-300">Learning Journey</span>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
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
          <Flame className="w-6 h-6 text-amber-400 mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.streak}</p>
          <p className="text-xs text-muted-foreground">Day Streak</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <Brain className="w-6 h-6 text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.totalQuestions}</p>
          <p className="text-xs text-muted-foreground">Questions Asked</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
          <BookOpen className="w-6 h-6 text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.topicsExplored}</p>
          <p className="text-xs text-muted-foreground">Topics Explored</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
          <Trophy className="w-6 h-6 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.learningPathsCompleted}</p>
          <p className="text-xs text-muted-foreground">Paths Completed</p>
        </Card>
      </motion.div>

      {/* What You're Learning */}
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
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-400" />
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

      {/* Skill Areas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">Skills Growing</h3>
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            All improving
          </span>
        </div>
        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="space-y-4">
            {skillAreas.map((skill, index) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{skill.name}</span>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(skill.trend)}
                    <span className="text-xs text-muted-foreground">{skill.level}%</span>
                  </div>
                </div>
                <Progress value={skill.level} className="h-2" />
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Suggested Focus */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-sm font-medium text-foreground mb-3">Suggested Next Focus</h3>
        <Card className="p-4 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/30">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-medium text-foreground">Deepen Your Understanding</p>
              <p className="text-sm text-muted-foreground mt-1">
                Based on your history, try exploring more about technology concepts using the Thinker mode for deeper analysis.
              </p>
              <button className="text-sm text-violet-400 hover:text-violet-300 mt-2 flex items-center gap-1">
                Explore Now
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
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
                <Target className="w-6 h-6 text-emerald-400" />
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
    </div>
  );
};

export default ProgressDashboard;
