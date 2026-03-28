import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Zap, ArrowRight, Clock } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface CreditExhaustionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToSubscription: () => void;
}

const SESSION_KEY = 'minimind-credit-exhaustion-shown';

const CreditExhaustionModal: React.FC<CreditExhaustionModalProps> = ({
  open,
  onOpenChange,
  onNavigateToSubscription,
}) => {
  const { tier, subscription } = useSubscription();
  const [shouldShow, setShouldShow] = useState(true);

  useEffect(() => {
    if (open) {
      const alreadyShown = sessionStorage.getItem(SESSION_KEY);
      if (alreadyShown) {
        setShouldShow(false);
        onOpenChange(false);
      } else {
        setShouldShow(true);
        sessionStorage.setItem(SESSION_KEY, 'true');
      }
    }
  }, [open, onOpenChange]);

  if (!shouldShow) return null;

  const resetDate = subscription.currentPeriodEnd
    ? subscription.currentPeriodEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'tomorrow';

  const isFree = tier === 'free';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isFree
              ? "You've used all your free credits today"
              : "You've used all your Plus credits"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-1">
            {isFree
              ? 'Free plan includes 15 daily credits. Upgrade to Pro for 100 daily + 1000 monthly credits.'
              : 'Upgrade to Pro for 100 daily + 1000 monthly credits and unlock priority responses.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Progress at 0% */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Credits used</span>
              <span>0 remaining</span>
            </div>
            <Progress value={100} className="h-2" />
          </div>

          {/* CTA */}
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              onOpenChange(false);
              onNavigateToSubscription();
            }}
          >
            <Zap className="w-4 h-4 mr-2" />
            Upgrade to Pro — ₹299/month
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          {/* Secondary */}
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            <Clock className="w-4 h-4 mr-2" />
            {isFree ? 'Come back tomorrow for free credits' : `Wait for reset on ${resetDate}`}
          </Button>

          {/* Social proof */}
          <p className="text-[11px] text-center text-muted-foreground pt-1">
            Trusted by learners preparing for JEE, NEET, and UPSC
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditExhaustionModal;
