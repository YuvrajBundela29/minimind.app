import React, { useState } from 'react';
import { Zap, Crown, Sparkles, Brain, CalendarClock, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSubscription, CREDIT_LIMITS } from '@/contexts/SubscriptionContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface CreditBadgeProps {
  onNavigateToSubscription?: () => void;
}

const CreditBadge: React.FC<CreditBadgeProps> = ({ onNavigateToSubscription }) => {
  const { tier, getCredits, subscription } = useSubscription();
  const [open, setOpen] = useState(false);
  const credits = getCredits();
  const limits = CREDIT_LIMITS[tier];
  const totalLimit = limits.daily + limits.monthly;
  const percentage = totalLimit > 0 ? (credits.total / totalLimit) * 100 : 0;

  const isLow = percentage > 0 && percentage <= 20;
  const isZero = credits.total <= 0;

  const badgeColor = isZero
    ? 'bg-destructive/15 text-destructive border-destructive/30'
    : isLow
    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';

  const iconColor = isZero ? 'text-destructive' : isLow ? 'text-amber-500' : 'text-emerald-500';

  const resetDate = subscription.currentPeriodEnd
    ? subscription.currentPeriodEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : 'Tomorrow';

  const tierLabel = tier === 'pro' ? 'Pro' : tier === 'plus' ? 'Plus' : 'Free';
  const TierIcon = tier === 'pro' ? Crown : tier === 'plus' ? Sparkles : Brain;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.button
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors ${badgeColor}`}
          whileTap={{ scale: 0.95 }}
          animate={isLow && !isZero ? { scale: [1, 1.05, 1] } : undefined}
          transition={isLow && !isZero ? { duration: 2, repeat: Infinity } : undefined}
          aria-label={`${credits.total} credits remaining`}
        >
          <Zap className={`w-3.5 h-3.5 ${iconColor}`} />
          <span className="hidden sm:inline">{credits.total}</span>
        </motion.button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        <div className="space-y-3">
          {/* Plan header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TierIcon className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">MiniMind {tierLabel}</span>
            </div>
            <span className="text-xs text-muted-foreground">{credits.total} credits</span>
          </div>

          {/* Progress bar */}
          <Progress value={Math.min(percentage, 100)} className="h-2" />

          {/* Breakdown */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Daily</span>
              <span>{credits.daily} / {limits.daily}</span>
            </div>
            {limits.monthly > 0 && (
              <div className="flex justify-between">
                <span>Monthly</span>
                <span>{credits.monthly} / {limits.monthly}</span>
              </div>
            )}
          </div>

          {/* Reset info */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>
              {tier === 'free'
                ? 'Daily credits reset at midnight'
                : `Credits refill on ${resetDate}`}
            </span>
          </div>

          {/* Upgrade CTA */}
          {tier !== 'pro' && onNavigateToSubscription && (
            <Button
              size="sm"
              className="w-full mt-1"
              onClick={() => {
                setOpen(false);
                onNavigateToSubscription();
              }}
            >
              Upgrade Plan
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CreditBadge;
