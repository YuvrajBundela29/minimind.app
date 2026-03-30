import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Share2, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WrappedStats {
  totalQuestions: number;
  topSubjects: string[];
  topLanguage: string;
  longestStreak: number;
  totalCreditsUsed: number;
  favoriteMode: string;
  timeSavedMinutes: number;
  badgesEarned: number;
}

const PANELS = [
  { key: 'intro', bg: 'bg-[hsl(263,70%,20%)]' },
  { key: 'questions', bg: 'bg-[hsl(221,83%,25%)]' },
  { key: 'subjects', bg: 'bg-[hsl(189,94%,20%)]' },
  { key: 'streak', bg: 'bg-[hsl(32,95%,25%)]' },
  { key: 'mode', bg: 'bg-[hsl(160,84%,20%)]' },
  { key: 'time', bg: 'bg-[hsl(0,84%,25%)]' },
  { key: 'outro', bg: 'bg-[hsl(263,70%,20%)]' },
];

const WrappedPage: React.FC = () => {
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const year = new Date().getFullYear();
      const startDate = `${year}-01-01`;

      const { data: logs } = await supabase
        .from('usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      const { data: streaks } = await supabase
        .from('user_streaks')
        .select('longest_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      const { count: badgeCount } = await supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const totalQ = logs?.length ?? 0;

      // Count modes
      const modeCounts: Record<string, number> = {};
      const langCounts: Record<string, number> = {};
      const topicWords: Record<string, number> = {};

      logs?.forEach(log => {
        if (log.mode) modeCounts[log.mode] = (modeCounts[log.mode] || 0) + 1;
        if (log.language) langCounts[log.language] = (langCounts[log.language] || 0) + 1;
        if (log.query_text) {
          const words = log.query_text.split(' ').slice(0, 3).join(' ');
          topicWords[words] = (topicWords[words] || 0) + 1;
        }
      });

      const topMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'beginner';
      const topLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'English';
      const topSubjects = Object.entries(topicWords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(e => e[0]);

      setStats({
        totalQuestions: totalQ,
        topSubjects,
        topLanguage: topLang,
        longestStreak: streaks?.longest_streak ?? 0,
        totalCreditsUsed: totalQ, // approximate 1 credit per query
        favoriteMode: topMode,
        timeSavedMinutes: totalQ * 8, // 8 min saved per query
        badgesEarned: badgeCount ?? 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const handleShare = async () => {
    if (!stats) return;
    const text = `My MiniMind ${new Date().getFullYear()} Wrapped 🎉\n\n📊 ${stats.totalQuestions} questions asked\n🔥 ${stats.longestStreak}-day streak\n⏰ ${Math.round(stats.timeSavedMinutes / 60)} hours saved\n🏅 ${stats.badgesEarned} badges earned\n\nGet MiniMind: minimind.app`;

    if (navigator.share) {
      await navigator.share({ title: 'MiniMind Wrapped', text });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Preparing your Wrapped...</div>;
  }

  if (!stats) {
    return <div className="text-center py-20 text-muted-foreground">Sign in to see your Wrapped!</div>;
  }

  return (
    <div
      ref={scrollRef}
      className="h-[calc(100vh-120px)] overflow-y-auto snap-y snap-mandatory"
    >
      {/* Intro */}
      <div className="snap-start h-full flex items-center justify-center bg-[hsl(263,70%,20%)] rounded-2xl mb-2 p-8">
        <div className="text-center space-y-4">
          <Sparkles className="w-12 h-12 text-white/80 mx-auto" />
          <h1 className="text-3xl font-bold text-white font-[var(--font-heading)]">
            Your {new Date().getFullYear()} MiniMind Wrapped
          </h1>
          <p className="text-white/60 text-sm">Scroll down to see your year in review</p>
          <ChevronDown className="w-6 h-6 text-white/40 mx-auto animate-bounce" />
        </div>
      </div>

      {/* Questions */}
      <div className="snap-start h-full flex items-center justify-center bg-[hsl(221,83%,25%)] rounded-2xl mb-2 p-8">
        <div className="text-center space-y-3">
          <p className="text-white/60 text-sm uppercase tracking-widest">You asked</p>
          <p className="text-7xl font-bold text-white">{stats.totalQuestions}</p>
          <p className="text-white/60 text-lg">questions this year</p>
        </div>
      </div>

      {/* Top subjects */}
      <div className="snap-start h-full flex items-center justify-center bg-[hsl(189,94%,20%)] rounded-2xl mb-2 p-8">
        <div className="text-center space-y-4">
          <p className="text-white/60 text-sm uppercase tracking-widest">Top topics</p>
          {stats.topSubjects.map((s, i) => (
            <p key={i} className={`font-bold text-white ${i === 0 ? 'text-3xl' : i === 1 ? 'text-2xl' : 'text-xl'}`}>
              {i + 1}. {s}
            </p>
          ))}
          {stats.topSubjects.length === 0 && (
            <p className="text-white/60">Start asking to build your stats!</p>
          )}
        </div>
      </div>

      {/* Streak */}
      <div className="snap-start h-full flex items-center justify-center bg-[hsl(32,95%,25%)] rounded-2xl mb-2 p-8">
        <div className="text-center space-y-3">
          <p className="text-white/60 text-sm uppercase tracking-widest">Longest streak</p>
          <p className="text-7xl font-bold text-white">🔥 {stats.longestStreak}</p>
          <p className="text-white/60 text-lg">days in a row</p>
        </div>
      </div>

      {/* Favorite mode */}
      <div className="snap-start h-full flex items-center justify-center bg-[hsl(160,84%,20%)] rounded-2xl mb-2 p-8">
        <div className="text-center space-y-3">
          <p className="text-white/60 text-sm uppercase tracking-widest">Favorite mode</p>
          <p className="text-4xl font-bold text-white capitalize">{stats.favoriteMode}</p>
          <p className="text-white/60">was your go-to learning style</p>
        </div>
      </div>

      {/* Time saved */}
      <div className="snap-start h-full flex items-center justify-center bg-[hsl(0,84%,25%)] rounded-2xl mb-2 p-8">
        <div className="text-center space-y-3">
          <p className="text-white/60 text-sm uppercase tracking-widest">Time saved</p>
          <p className="text-6xl font-bold text-white">{Math.round(stats.timeSavedMinutes / 60)}h</p>
          <p className="text-white/60 text-lg">vs reading textbooks</p>
          <p className="text-white/40 text-xs">Estimated 8 min saved per query</p>
        </div>
      </div>

      {/* Outro + Share */}
      <div className="snap-start h-full flex items-center justify-center bg-[hsl(263,70%,20%)] rounded-2xl p-8">
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-white">That's a wrap! 🎉</h2>
          <p className="text-white/60 text-sm">Share your stats with friends</p>
          <Button onClick={handleShare} className="bg-white text-[hsl(263,70%,20%)] hover:bg-white/90">
            <Share2 className="w-4 h-4 mr-2" />
            Share on WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WrappedPage;
