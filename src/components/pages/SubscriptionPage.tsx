import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Sparkles, Zap, Brain, BookOpen, Rocket, Shield, Clock, X, Coins, Gift } from 'lucide-react';
import { useSubscription, PRICING, FREE_DAILY_LIMIT, CREDIT_LIMITS, TOP_UP_PRODUCTS } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import CreditHistory from '@/components/CreditHistory';

const SubscriptionPage: React.FC = () => {
  const { tier, subscription, initiateCheckout, initiateTopUp, isCheckoutLoading, getCredits } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [showTopUp, setShowTopUp] = useState(false);

  const credits = getCredits();

  const tiers = [
    {
      id: 'free' as const,
      name: 'Free',
      description: 'Explore with limits',
      monthlyPrice: 0,
      yearlyPrice: 0,
      creditInfo: `${CREDIT_LIMITS.free.daily} credits/day`,
      features: [
        `${CREDIT_LIMITS.free.daily} daily credits`,
        'All 4 learning modes',
        'Basic explanations',
      ],
      limitations: [
        'No monthly bonus credits',
        'No learning history',
        'Standard response time',
      ],
      cta: tier === 'free' ? 'Current Plan' : null,
      current: tier === 'free',
    },
    {
      id: 'plus' as const,
      name: 'MiniMind Plus',
      description: 'Enhanced learning',
      monthlyPrice: PRICING.plus.monthly,
      yearlyPrice: PRICING.plus.yearly,
      yearlyMonthly: PRICING.plus.yearlyMonthly,
      creditInfo: `${CREDIT_LIMITS.plus.daily}/day + ${CREDIT_LIMITS.plus.monthly}/mo`,
      features: [
        `${CREDIT_LIMITS.plus.daily} daily credits`,
        `${CREDIT_LIMITS.plus.monthly} monthly bonus credits`,
        'Purpose Lens personalization',
        'Explain-it-back feedback',
        'Full learning history',
      ],
      limitations: [],
      cta: tier === 'plus' ? 'Current Plan' : 'Get Plus',
      current: tier === 'plus',
      highlighted: true,
      popular: true,
    },
    {
      id: 'pro' as const,
      name: 'MiniMind Pro',
      description: 'Maximum depth',
      monthlyPrice: PRICING.pro.monthly,
      yearlyPrice: PRICING.pro.yearly,
      yearlyMonthly: PRICING.pro.yearlyMonthly,
      creditInfo: `${CREDIT_LIMITS.pro.daily}/day + ${CREDIT_LIMITS.pro.monthly}/mo`,
      features: [
        `${CREDIT_LIMITS.pro.daily} daily credits`,
        `${CREDIT_LIMITS.pro.monthly} monthly bonus credits`,
        'Everything in Plus',
        'Priority AI responses',
        'Deeper mastery explanations',
        'Advanced learning paths',
        'Early feature access',
      ],
      limitations: [],
      cta: tier === 'pro' ? 'Current Plan' : 'Get Pro',
      current: tier === 'pro',
    },
  ];

  const handleSubscribe = (tierId: 'plus' | 'pro') => {
    initiateCheckout(tierId, selectedPlan);
  };

  const handleTopUp = (productId: string) => {
    initiateTopUp(productId);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 text-violet-400 mb-4"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Invest in understanding</span>
        </motion.div>
        
        <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
          Choose Your Journey
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          MiniMind uses a credit system. Different modes cost different credits. Top up anytime!
        </p>
      </div>

      {/* Current Credits Display */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Your Credits</h3>
              <p className="text-sm text-muted-foreground">
                {credits.daily} daily • {credits.monthly > 0 ? `${credits.monthly} monthly • ` : ''}{credits.bonus > 0 ? `${credits.bonus} bonus` : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{credits.total}</p>
            <p className="text-xs text-muted-foreground">total available</p>
          </div>
        </div>
      </motion.div>

      {/* Plan Toggle */}
      <div className="flex justify-center">
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              selectedPlan === 'monthly'
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              selectedPlan === 'yearly'
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Yearly
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full">
              SAVE 33%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {tiers.map((tierInfo, index) => (
          <motion.div
            key={tierInfo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.1 }}
            className={`relative bg-card rounded-2xl border-2 p-6 ${
              tierInfo.highlighted 
                ? 'border-violet-500 shadow-lg shadow-violet-500/10' 
                : 'border-border'
            } ${tierInfo.current ? 'ring-2 ring-emerald-500/30' : ''}`}
          >
            {tierInfo.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold">
                MOST POPULAR
              </div>
            )}

            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  {tierInfo.id === 'pro' ? (
                    <Crown className="w-5 h-5 text-amber-500" />
                  ) : tierInfo.id === 'plus' ? (
                    <Sparkles className="w-5 h-5 text-violet-500" />
                  ) : (
                    <Brain className="w-5 h-5 text-muted-foreground" />
                  )}
                  <h3 className="text-xl font-bold text-foreground">{tierInfo.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{tierInfo.description}</p>
              </div>
              
              {tierInfo.current && (
                <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">
                  Active
                </span>
              )}
            </div>

            <div className="mb-4">
              {tierInfo.id === 'free' ? (
                <div className="text-3xl font-bold text-foreground">Free</div>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      ₹{selectedPlan === 'yearly' ? tierInfo.yearlyMonthly : tierInfo.monthlyPrice}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  {selectedPlan === 'yearly' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed ₹{tierInfo.yearlyPrice}/year
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Credit Info Badge */}
            <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Coins className="w-3 h-3" />
              {tierInfo.creditInfo}
            </div>

            <ul className="space-y-2 mb-6">
              {tierInfo.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
              {tierInfo.limitations.map((limitation, i) => (
                <li key={`limit-${i}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <X className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>

            {tierInfo.id !== 'free' && !tierInfo.current && (
              <Button
                onClick={() => handleSubscribe(tierInfo.id as 'plus' | 'pro')}
                disabled={isCheckoutLoading}
                className={`w-full py-3 font-medium rounded-xl ${
                  tierInfo.highlighted
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                {isCheckoutLoading ? 'Processing...' : tierInfo.cta}
              </Button>
            )}

            {tierInfo.current && (
              <div className="w-full py-3 text-center font-medium text-muted-foreground bg-muted rounded-xl">
                Current Plan
              </div>
            )}

            {tierInfo.id === 'free' && !tierInfo.current && (
              <div className="w-full py-3 text-center text-sm text-muted-foreground">
                Included by default
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Top-Up Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={() => setShowTopUp(!showTopUp)}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Need More Credits?</h3>
                <p className="text-sm text-muted-foreground">Top up anytime with credit packs or weekly boosters</p>
              </div>
            </div>
            <Zap className={`w-5 h-5 text-amber-500 transition-transform ${showTopUp ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {showTopUp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-4"
          >
            {/* Credit Packs */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                Credit Packs (One-time)
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {TOP_UP_PRODUCTS.packs.map((pack) => (
                  <Card
                    key={pack.id}
                    className={`p-4 cursor-pointer hover:border-amber-500/50 transition-all relative ${
                      pack.popular ? 'border-amber-500 shadow-md shadow-amber-500/10' : ''
                    }`}
                    onClick={() => handleTopUp(pack.id)}
                  >
                    {pack.badge && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full whitespace-nowrap">
                        {pack.badge}
                      </span>
                    )}
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{pack.credits}</p>
                      <p className="text-xs text-muted-foreground mb-2">credits</p>
                      <p className="text-lg font-semibold text-primary">₹{pack.price}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Weekly Booster */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Rocket className="w-4 h-4 text-violet-500" />
                Weekly Booster
              </h4>
              {TOP_UP_PRODUCTS.boosters.map((booster) => (
                <Card
                  key={booster.id}
                  className="p-4 cursor-pointer hover:border-violet-500/50 transition-all"
                  onClick={() => handleTopUp(booster.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{booster.name}</p>
                      <p className="text-sm text-muted-foreground">{booster.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">₹{booster.price}</p>
                      <p className="text-xs text-muted-foreground">per week</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Credit History Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <CreditHistory />
      </motion.div>

      {/* Early Learner Advantage */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-5 rounded-2xl bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-pink-500/10 border border-violet-500/20"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Early Learner Advantage</h3>
            <p className="text-sm text-muted-foreground">
              Join now and lock in this pricing forever. We believe in rewarding early believers with honest, stable pricing — no surprise hikes.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Trust Signals */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-3 gap-4 text-center"
      >
        <div className="p-4 rounded-xl bg-muted/30">
          <Shield className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
          <p className="text-xs font-medium text-foreground">No Hidden Fees</p>
          <p className="text-[10px] text-muted-foreground mt-1">What you see is what you pay</p>
        </div>
        <div className="p-4 rounded-xl bg-muted/30">
          <Zap className="w-6 h-6 mx-auto mb-2 text-violet-500" />
          <p className="text-xs font-medium text-foreground">Cancel Anytime</p>
          <p className="text-[10px] text-muted-foreground mt-1">No questions asked</p>
        </div>
        <div className="p-4 rounded-xl bg-muted/30">
          <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-500" />
          <p className="text-xs font-medium text-foreground">Secure Payments</p>
          <p className="text-[10px] text-muted-foreground mt-1">Powered by Razorpay</p>
        </div>
      </motion.div>

      {/* Subscription Status */}
      {subscription.currentPeriodEnd && tier !== 'free' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-xl bg-muted/50 text-center"
        >
          <p className="text-sm text-muted-foreground">
            {subscription.status === 'cancelled' 
              ? `Your subscription ends on ${subscription.currentPeriodEnd.toLocaleDateString()}`
              : `Next billing date: ${subscription.currentPeriodEnd.toLocaleDateString()}`
            }
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default SubscriptionPage;
