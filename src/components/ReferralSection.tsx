import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Copy, Check, Gift, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReferralData {
  code: string | null;
  referralCount: number;
  loading: boolean;
}

const MILESTONES = [
  { count: 5, reward: '+200 bonus credits', icon: Gift },
  { count: 20, reward: '1 month Pro free!', icon: Crown },
];

const ReferralSection: React.FC = () => {
  const [data, setData] = useState<ReferralData>({ code: null, referralCount: 0, loading: true });
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState('');
  const [applying, setApplying] = useState(false);

  const loadReferralData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setData(d => ({ ...d, loading: false })); return; }

      // Get or create referral code
      const { data: codeResult } = await supabase.rpc('get_or_create_referral_code');
      
      // Get referral count
      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

      setData({
        code: codeResult as string | null,
        referralCount: count || 0,
        loading: false,
      });
    } catch {
      setData(d => ({ ...d, loading: false }));
    }
  }, []);

  useEffect(() => { loadReferralData(); }, [loadReferralData]);

  const handleCopy = async () => {
    if (!data.code) return;
    const shareText = `Join MiniMind and get 50 bonus credits! Use my referral code: ${data.code}\n\nhttps://minimind.app`;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!data.code) return;
    const shareText = `Join MiniMind and get 50 bonus credits! Use my referral code: ${data.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'MiniMind Referral', text: shareText, url: 'https://minimind.app' });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const handleApply = async () => {
    const code = applyCode.trim().toUpperCase();
    if (!code) return;
    setApplying(true);
    try {
      const { data: result, error } = await supabase.rpc('apply_referral_code', { p_code: code });
      if (error) throw error;
      
      const res = result as any;
      if (res.success) {
        toast.success(`🎉 +${res.reward_credits} credits! Welcome aboard!`);
        if (res.milestone_bonus === -1) {
          toast.success('🏆 Your referrer just unlocked Pro for free!');
        }
        setApplyCode('');
        loadReferralData();
      } else {
        const messages: Record<string, string> = {
          invalid_code: 'Invalid referral code',
          self_referral: "You can't use your own code",
          already_referred: "You've already used a referral code",
          not_authenticated: 'Please sign in first',
        };
        toast.error(messages[res.error] || 'Something went wrong');
      }
    } catch {
      toast.error('Failed to apply code');
    } finally {
      setApplying(false);
    }
  };

  if (data.loading) return null;

  const nextMilestone = MILESTONES.find(m => data.referralCount < m.count);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-violet-500" />
        <h3 className="text-lg font-semibold text-foreground">Refer & Earn</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Invite friends and both of you get <span className="font-semibold text-emerald-500">+50 credits</span>!
      </p>

      {/* Your Code */}
      {data.code && (
        <Card className="p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your referral code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 rounded-xl bg-muted font-mono text-lg font-bold text-foreground tracking-widest text-center">
              {data.code}
            </div>
            <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <Button onClick={handleShare} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white">
            <Users className="w-4 h-4 mr-2" />
            Share with Friends
          </Button>
        </Card>
      )}

      {/* Apply Code */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Have a referral code?</p>
        <div className="flex items-center gap-2">
          <Input
            value={applyCode}
            onChange={e => setApplyCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            maxLength={8}
            className="font-mono tracking-widest uppercase"
          />
          <Button onClick={handleApply} disabled={applying || !applyCode.trim()} variant="secondary">
            {applying ? '...' : 'Apply'}
          </Button>
        </div>
      </Card>

      {/* Stats & Milestones */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Successful referrals</span>
          <span className="text-xl font-bold text-foreground">{data.referralCount}</span>
        </div>

        <div className="space-y-2">
          {MILESTONES.map(m => {
            const achieved = data.referralCount >= m.count;
            const Icon = m.icon;
            return (
              <div
                key={m.count}
                className={`flex items-center gap-3 p-2.5 rounded-xl text-sm ${
                  achieved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted/50 text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{m.count} referrals → {m.reward}</span>
                {achieved && <Check className="w-4 h-4" />}
                {!achieved && (
                  <span className="text-xs">{data.referralCount}/{m.count}</span>
                )}
              </div>
            );
          })}
        </div>

        {nextMilestone && (
          <div className="mt-3">
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                style={{ width: `${Math.min(100, (data.referralCount / nextMilestone.count) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 text-center">
              {nextMilestone.count - data.referralCount} more to unlock {nextMilestone.reward}
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default ReferralSection;
