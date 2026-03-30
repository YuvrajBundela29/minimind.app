import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, Clock, Users, Lightbulb, Send, Share2, ChevronDown, ChevronUp, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import AIService from '@/services/aiService';

interface ArenaChallenge {
  id: string;
  date: string;
  topic: string;
  subject: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  explanation: string;
  hint: string | null;
}

interface LeaderboardEntry {
  id: string;
  display_name: string;
  score: number;
  submitted_at: string;
  user_id: string;
}

const ArenaPage: React.FC = () => {
  const [challenge, setChallenge] = useState<ArenaChallenge | null>(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [creditsEarned, setCreditsEarned] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [participantCount, setParticipantCount] = useState(847);
  const [countdown, setCountdown] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Countdown to next 6AM IST
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60000);
      const tomorrow6AM = new Date(istNow);
      tomorrow6AM.setDate(tomorrow6AM.getDate() + (istNow.getHours() >= 6 ? 1 : 0));
      tomorrow6AM.setHours(6, 0, 0, 0);
      const diff = tomorrow6AM.getTime() - istNow.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fake participant count
  useEffect(() => {
    const interval = setInterval(() => {
      setParticipantCount(prev => prev + Math.floor(Math.random() * 5) - 2);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load challenge
  useEffect(() => {
    const loadChallenge = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      // Get today's day of week (0=Sun, 1=Mon...) and map to challenge
      const today = new Date().toISOString().split('T')[0];
      
      const { data: challenges } = await supabase
        .from('arena_challenges')
        .select('*')
        .eq('active', true)
        .order('date', { ascending: true })
        .limit(7);

      if (challenges && challenges.length > 0) {
        // Pick challenge by day index
        const dayIndex = new Date().getDay(); // 0=Sun
        const ch = challenges[dayIndex % challenges.length];
        setChallenge(ch as ArenaChallenge);

        // Check if already submitted
        if (user) {
          const { data: existing } = await supabase
            .from('arena_submissions')
            .select('*')
            .eq('user_id', user.id)
            .eq('challenge_id', ch.id)
            .maybeSingle();

          if (existing) {
            setSubmitted(true);
            setScore(existing.score ?? 0);
            setHintUsed(existing.used_hint ?? false);
          }
        }

        // Load leaderboard
        const { data: lb } = await supabase
          .from('arena_leaderboard')
          .select('*')
          .eq('challenge_id', ch.id)
          .order('score', { ascending: false })
          .limit(50);

        if (lb) setLeaderboard(lb as LeaderboardEntry[]);
      }
    };
    loadChallenge();
    startTimeRef.current = Date.now();
  }, []);

  const handleUseHint = () => {
    setShowHint(true);
    setHintUsed(true);
  };

  const handleSubmit = useCallback(async () => {
    if (!challenge || !answer.trim() || !currentUserId) {
      if (!currentUserId) toast.error('Please sign in to participate');
      return;
    }

    setSubmitting(true);
    try {
      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);

      // AI evaluation
      const result = await AIService.invokeChat({
        prompt: answer,
        type: 'arena_evaluate',
        language: 'English',
        mode: 'arena',
        system_prompt: `You are an examiner. Score this answer to the question "${challenge.question}" out of 100. The ideal answer is "${challenge.correct_answer}". Give a score, one sentence of feedback, and show where they went wrong if at all. Format exactly: SCORE:[0-100]\nFEEDBACK:[text]\nCORRECT:[text]`,
      });

      // Parse response
      const responseText = result.response || '';
      const scoreMatch = responseText.match(/SCORE:\s*(\d+)/);
      const feedbackMatch = responseText.match(/FEEDBACK:\s*(.+)/);
      const correctMatch = responseText.match(/CORRECT:\s*(.+)/);

      let rawScore = scoreMatch ? parseInt(scoreMatch[1]) : 50;
      if (hintUsed) rawScore = Math.max(0, rawScore - 5);
      rawScore = Math.min(100, Math.max(0, rawScore));

      const earnedCredits = Math.round(rawScore / 10);

      setScore(rawScore);
      setFeedback(feedbackMatch ? feedbackMatch[1].trim() : 'Good attempt!');
      setCorrectAnswer(correctMatch ? correctMatch[1].trim() : challenge.correct_answer);
      setCreditsEarned(earnedCredits);
      setSubmitted(true);

      // Get display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', currentUserId)
        .maybeSingle();

      const displayName = profile?.display_name || 'Student';

      // Save submission
      await supabase.from('arena_submissions').insert({
        user_id: currentUserId,
        challenge_id: challenge.id,
        user_answer: answer,
        score: rawScore,
        time_taken_seconds: timeTaken,
        used_hint: hintUsed,
      });

      // Save to leaderboard
      await supabase.from('arena_leaderboard').insert({
        user_id: currentUserId,
        challenge_id: challenge.id,
        score: rawScore,
        display_name: displayName,
      });

      // Award credits via refund (negative deduction = credit addition)
      if (earnedCredits > 0) {
        await supabase.rpc('refund_user_credit', {
          p_user_id: currentUserId,
          p_cost: earnedCredits,
        });
      }

      toast.success(`🏆 You earned ${earnedCredits} credits!`);
    } catch (error) {
      console.error('Arena submission error:', error);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [challenge, answer, currentUserId, hintUsed]);

  const handleShare = () => {
    const text = `I scored ${score}/100 on today's MiniMind Arena! 🏆\nCan you beat me? minimind.app/arena`;
    if (navigator.share) {
      navigator.share({ title: 'MiniMind Arena', text });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const difficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
      case 'medium': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
      case 'hard': return 'bg-destructive/15 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const scoreColor = (s: number) => {
    if (s >= 80) return 'text-emerald-500';
    if (s >= 50) return 'text-amber-500';
    return 'text-destructive';
  };

  if (!challenge) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading today's challenge...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 pt-2">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold text-foreground font-[var(--font-heading)]">MiniMind Arena</h1>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Resets in {countdown}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {participantCount} competing today
          </span>
        </div>
      </div>

      {/* Challenge Card */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{challenge.subject}</Badge>
          <Badge className={`text-xs ${difficultyColor(challenge.difficulty || 'medium')}`}>
            {challenge.difficulty || 'medium'}
          </Badge>
        </div>

        <p className="text-lg font-semibold text-foreground leading-relaxed">
          {challenge.question}
        </p>

        {!submitted ? (
          <>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="min-h-[120px] resize-none"
              maxLength={1000}
            />

            <div className="flex items-center gap-2">
              {challenge.hint && !showHint && (
                <Button variant="outline" size="sm" onClick={handleUseHint} className="text-xs">
                  <Lightbulb className="w-3.5 h-3.5 mr-1" />
                  Use hint (-5 pts)
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!answer.trim() || submitting}
                className="ml-auto"
                size="sm"
              >
                {submitting ? 'Evaluating...' : 'Submit Answer'}
                <Send className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <AnimatePresence>
              {showHint && challenge.hint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3"
                >
                  💡 <strong>Hint:</strong> {challenge.hint}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Score */}
            <div className="text-center space-y-1">
              <p className={`text-5xl font-bold ${scoreColor(score)}`}>{score}</p>
              <p className="text-sm text-muted-foreground">out of 100</p>
              <Progress value={score} className="h-2 mt-2" />
            </div>

            {/* Feedback */}
            {feedback && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground">
                <strong>Feedback:</strong> {feedback}
              </div>
            )}

            {/* Correct answer */}
            {correctAnswer && (
              <div className="bg-emerald-500/10 rounded-lg p-3 text-sm text-foreground">
                <strong>Model Answer:</strong> {correctAnswer}
              </div>
            )}

            {/* Credits earned */}
            {creditsEarned > 0 && (
              <div className="text-center bg-primary/10 rounded-lg p-3">
                <p className="text-sm font-semibold text-primary">
                  🎉 You earned {creditsEarned} credits for today's Arena!
                </p>
              </div>
            )}

            {/* Share */}
            <Button variant="outline" className="w-full" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share on WhatsApp
            </Button>
          </motion.div>
        )}
      </Card>

      {/* Leaderboard */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-500" />
          Today's Leaderboard
        </h2>

        {leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No submissions yet. Be the first!
          </p>
        ) : (
          <div className="space-y-1">
            {leaderboard.slice(0, showFullLeaderboard ? 50 : 10).map((entry, idx) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                  entry.user_id === currentUserId ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-muted-foreground w-6 text-center">
                    {idx + 1}
                  </span>
                  <span className="text-foreground font-medium">
                    {entry.display_name || 'Student'}
                  </span>
                </div>
                <span className={`font-semibold ${scoreColor(entry.score)}`}>
                  {entry.score}/100
                </span>
              </div>
            ))}
          </div>
        )}

        {leaderboard.length > 10 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowFullLeaderboard(!showFullLeaderboard)}
          >
            {showFullLeaderboard ? (
              <>Show less <ChevronUp className="w-3 h-3 ml-1" /></>
            ) : (
              <>See full leaderboard <ChevronDown className="w-3 h-3 ml-1" /></>
            )}
          </Button>
        )}
      </Card>
    </div>
  );
};

export default ArenaPage;
