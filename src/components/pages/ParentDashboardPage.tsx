import React, { useState, useEffect } from 'react';
import { Users, BarChart3, Flame, BookOpen, Award, Clock, Link2, Copy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChildData {
  user_id: string;
  nickname: string | null;
  streak: number;
  totalQuestions: number;
  todayActive: boolean;
  recentTopics: string[];
  badges: number;
}

const ParentDashboardPage: React.FC = () => {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [linkCode, setLinkCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: links } = await supabase
      .from('parent_child_links')
      .select('*')
      .eq('parent_user_id', user.id);

    if (links && links.length > 0) {
      const childrenData: ChildData[] = [];
      for (const link of links) {
        // Get child stats
        const { data: stats } = await supabase
          .from('user_statistics')
          .select('*')
          .eq('user_id', link.child_user_id)
          .maybeSingle();

        const { data: streaks } = await supabase
          .from('user_streaks')
          .select('current_streak')
          .eq('user_id', link.child_user_id)
          .maybeSingle();

        const { data: recentLogs } = await supabase
          .from('usage_logs')
          .select('query_text, created_at')
          .eq('user_id', link.child_user_id)
          .order('created_at', { ascending: false })
          .limit(10);

        const { count: badgeCount } = await supabase
          .from('user_achievements')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', link.child_user_id);

        const today = new Date().toISOString().split('T')[0];
        const todayActive = recentLogs?.some(l => l.created_at.startsWith(today)) ?? false;
        const topics = [...new Set(recentLogs?.map(l => l.query_text?.slice(0, 30)).filter(Boolean) || [])].slice(0, 5);

        childrenData.push({
          user_id: link.child_user_id,
          nickname: link.child_nickname,
          streak: streaks?.current_streak ?? 0,
          totalQuestions: stats?.total_questions ?? 0,
          todayActive,
          recentTopics: topics as string[],
          badges: badgeCount ?? 0,
        });
      }
      setChildren(childrenData);
    }
    setLoading(false);
  };

  const handleLinkChild = async () => {
    if (!linkCode.trim() || linkCode.length !== 6) {
      toast.error('Enter a valid 6-digit code');
      return;
    }

    setLinking(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLinking(false); return; }

    const { data: link } = await supabase
      .from('parent_child_links')
      .select('*')
      .eq('link_code', linkCode.toUpperCase())
      .gt('code_expires_at', new Date().toISOString())
      .maybeSingle();

    if (!link) {
      toast.error('Invalid or expired code');
      setLinking(false);
      return;
    }

    await supabase
      .from('parent_child_links')
      .update({ parent_user_id: user.id })
      .eq('id', link.id);

    toast.success('Child linked successfully!');
    setLinkCode('');
    setLinking(false);
    loadData();
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      <div className="text-center space-y-1 pt-2">
        <div className="flex items-center justify-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground font-[var(--font-heading)]">Parent Dashboard</h1>
        </div>
        <p className="text-xs text-muted-foreground">Monitor your child's learning progress</p>
      </div>

      {/* Link a child */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
          <Link2 className="w-4 h-4" />
          Link a child's account
        </h3>
        <div className="flex gap-2">
          <Input
            value={linkCode}
            onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-digit code"
            maxLength={6}
            className="text-center font-mono tracking-widest"
          />
          <Button onClick={handleLinkChild} disabled={linking} size="sm">
            {linking ? 'Linking...' : 'Link'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Ask your child to go to Profile → "Share with parent" to get a code.
        </p>
      </Card>

      {/* Children cards */}
      {children.length === 0 ? (
        <Card className="p-6 text-center space-y-2">
          <Users className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm text-muted-foreground">No children linked yet</p>
        </Card>
      ) : (
        children.map(child => (
          <Card key={child.user_id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{child.nickname || 'Child'}</h3>
              <Badge className={child.todayActive
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground'
              }>
                {child.todayActive ? '✅ Active today' : '⏸️ Not active'}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <Flame className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{child.streak}</p>
                <p className="text-xs text-muted-foreground">Streak</p>
              </div>
              <div className="text-center">
                <BarChart3 className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{child.totalQuestions}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div className="text-center">
                <Award className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{child.badges}</p>
                <p className="text-xs text-muted-foreground">Badges</p>
              </div>
            </div>

            {child.recentTopics.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Recent topics:</p>
                <div className="flex flex-wrap gap-1">
                  {child.recentTopics.map((topic, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{topic}</Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
};

export default ParentDashboardPage;
