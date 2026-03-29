import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Three-tier subscription model
export type SubscriptionTier = 'free' | 'plus' | 'pro';
export type PlanType = 'monthly' | 'yearly';

// Feature access per tier
export interface TierFeatures {
  unlimitedQuestions: boolean;
  purposeLens: boolean;
  explainBack: boolean;
  learningHistory: boolean;
  priorityResponses: boolean;
  deeperMastery: boolean;
  advancedLearningPaths: boolean;
  earlyAccess: boolean;
}

const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  free: {
    unlimitedQuestions: false,
    purposeLens: false,
    explainBack: false,
    learningHistory: false,
    priorityResponses: false,
    deeperMastery: false,
    advancedLearningPaths: false,
    earlyAccess: false,
  },
  plus: {
    unlimitedQuestions: true,
    purposeLens: true,
    explainBack: true,
    learningHistory: true,
    priorityResponses: false,
    deeperMastery: false,
    advancedLearningPaths: false,
    earlyAccess: false,
  },
  pro: {
    unlimitedQuestions: true,
    purposeLens: true,
    explainBack: true,
    learningHistory: true,
    priorityResponses: true,
    deeperMastery: true,
    advancedLearningPaths: true,
    earlyAccess: true,
  },
};

// Pricing in INR
export const PRICING = {
  plus: {
    monthly: 149,
    yearly: 1188, // ₹99/mo × 12
    yearlyMonthly: 99, // per month when billed yearly
  },
  pro: {
    monthly: 299,
    yearly: 2388, // ₹199/mo × 12
    yearlyMonthly: 199, // per month when billed yearly
  },
};

// Credit limits per tier (daily)
export const CREDIT_LIMITS: Record<SubscriptionTier, { daily: number; monthly: number }> = {
  free: { daily: 15, monthly: 0 }, // 15 daily credits, no monthly pool
  plus: { daily: 50, monthly: 500 }, // 50 daily + 500 monthly bonus
  pro: { daily: 100, monthly: 1000 }, // 100 daily + 1000 monthly bonus
};

// Credit costs per mode
export const CREDIT_COSTS: Record<string, number> = {
  beginner: 1,
  thinker: 2,
  story: 3,
  mastery: 4,
  ekakshar: 5,
  ekakshar_quick: 3,
  learningPath: 5,
  learningPathTopic: 2,
  explainBack: 2,
};

// Top-up products
export const TOP_UP_PRODUCTS = {
  packs: [
    { id: 'pack_25', name: '25 Credits', credits: 25, price: 49, popular: false },
    { id: 'pack_60', name: '60 Credits', credits: 60, price: 99, popular: true, badge: 'BEST VALUE' },
    { id: 'pack_150', name: '150 Credits', credits: 150, price: 199, popular: false },
  ],
  boosters: [
    { id: 'booster_weekly', name: 'Weekly Booster', credits: 20, price: 29, duration: 'week', description: '+20 daily credits for 7 days' },
  ],
};

// Free tier daily limit (backward compat)
export const FREE_DAILY_LIMIT = CREDIT_LIMITS.free.daily;

interface CreditState {
  dailyUsed: number;
  monthlyUsed: number;
  bonusCredits: number; // From top-ups
  lastDailyReset: Date | null;
  lastMonthlyReset: Date | null;
}

interface SubscriptionState {
  tier: SubscriptionTier;
  planType: PlanType | null;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  currentPeriodEnd: Date | null;
  dailyQuestionsUsed: number;
  isInGracePeriod: boolean;
  credits: CreditState;
}

interface SubscriptionContextType {
  // State
  tier: SubscriptionTier;
  features: TierFeatures;
  subscription: SubscriptionState;
  isLoading: boolean;
  
  // Credit checks
  hasFeature: (feature: keyof TierFeatures) => boolean;
  canAskQuestion: () => boolean;
  getRemainingQuestions: () => number | 'unlimited';
  getCredits: () => { daily: number; monthly: number; bonus: number; total: number };
  hasCredits: (cost: number) => boolean;
  
  // Actions
  useQuestion: () => Promise<boolean>;
  useCredits: (cost: number, mode: string) => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  syncCreditsFromServer: (creditsRemaining: number, dailyRemaining: number | null, monthlyRemaining: number | null) => void;
  
  // Upgrade flow
  isUpgradeModalOpen: boolean;
  setUpgradeModalOpen: (open: boolean) => void;
  upgradeFeature: string;
  showUpgradePrompt: (feature: string) => void;
  
  // Checkout
  initiateCheckout: (tier: 'plus' | 'pro', planType: PlanType) => Promise<void>;
  initiateTopUp: (productId: string) => Promise<void>;
  isCheckoutLoading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');
  
  const [subscription, setSubscription] = useState<SubscriptionState>({
    tier: 'free',
    planType: null,
    status: 'active',
    currentPeriodEnd: null,
    dailyQuestionsUsed: 0,
    isInGracePeriod: false,
    credits: {
      dailyUsed: 0,
      monthlyUsed: 0,
      bonusCredits: 0,
      lastDailyReset: null,
      lastMonthlyReset: null,
    },
  });

  const tier = subscription.tier;
  const features = TIER_FEATURES[tier];

  // Ref to track credits synchronously across rapid calls
  const creditsRef = useRef(subscription.credits);
  useEffect(() => {
    creditsRef.current = subscription.credits;
  }, [subscription.credits]);

  // Load subscription from database
  const refreshSubscription = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Load guest credit usage from localStorage
        const now = new Date();
        const saved = localStorage.getItem('minimind_guest_credits');
        let dailyUsed = 0;
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.date === now.toISOString().split('T')[0]) {
              dailyUsed = parsed.dailyUsed || 0;
            }
          } catch {}
        }
        setSubscription({
          tier: 'free',
          planType: null,
          status: 'active',
          currentPeriodEnd: null,
          dailyQuestionsUsed: 0,
          isInGracePeriod: false,
          credits: {
            dailyUsed,
            monthlyUsed: 0,
            bonusCredits: 0,
            lastDailyReset: null,
            lastMonthlyReset: null,
          },
        });
        setIsLoading(false);
        return;
      }

      // Query the view instead of base table to avoid exposing payment IDs
      const { data, error } = await supabase
        .from('user_subscription_view')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null;

      // Trust database values directly — the server's deduct_user_credit function
      // handles daily/monthly resets atomically. Do NOT do client-side reset logic.
      const dbDailyUsed = data.credits_daily_used || 0;
      const dbMonthlyUsed = data.credits_monthly_used || 0;
      const lastDailyReset = data.credits_last_daily_reset ? new Date(data.credits_last_daily_reset + 'T00:00:00') : null;
      const lastMonthlyReset = data.credits_last_monthly_reset ? new Date(data.credits_last_monthly_reset + 'T00:00:00') : null;

      setSubscription({
        tier: (data.tier as SubscriptionTier) || 'free',
        planType: data.plan_type as PlanType | null,
        status: data.status as 'active' | 'cancelled' | 'expired' | 'pending',
        currentPeriodEnd: periodEnd,
        dailyQuestionsUsed: 0,
        isInGracePeriod: false,
        credits: {
          dailyUsed: dbDailyUsed,
          monthlyUsed: dbMonthlyUsed,
          bonusCredits: 0,
          lastDailyReset,
          lastMonthlyReset,
        },
      });
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount and auth changes
  useEffect(() => {
    refreshSubscription();
    
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => {
      refreshSubscription();
    });

    return () => authSub.unsubscribe();
  }, [refreshSubscription]);

  const hasFeature = useCallback((feature: keyof TierFeatures) => {
    return features[feature];
  }, [features]);

  // Get available credits
  const getCredits = useCallback(() => {
    const limits = CREDIT_LIMITS[tier];
    const creds = creditsRef.current;
    const dailyRemaining = Math.max(0, limits.daily - creds.dailyUsed);
    const monthlyRemaining = Math.max(0, limits.monthly - creds.monthlyUsed);
    const bonus = creds.bonusCredits;
    
    return {
      daily: dailyRemaining,
      monthly: monthlyRemaining,
      bonus,
      total: dailyRemaining + monthlyRemaining + bonus,
    };
  }, [tier]);

  // Check if user has enough credits
  const hasCredits = useCallback((cost: number) => {
    const available = getCredits();
    return available.total >= cost;
  }, [getCredits]);

  const canAskQuestion = useCallback(() => {
    // For simple question check, use 1 credit cost
    return hasCredits(1);
  }, [hasCredits]);

  const getRemainingQuestions = useCallback(() => {
    if (tier === 'plus' || tier === 'pro') {
      const credits = getCredits();
      return credits.total; // Show total available
    }
    return getCredits().daily; // Free tier shows daily only
  }, [tier, getCredits]);

  const showUpgradePrompt = useCallback((feature: string) => {
    setUpgradeFeature(feature);
    setUpgradeModalOpen(true);
  }, []);

  // Use credits for an action
  const useCredits = useCallback(async (cost: number, mode: string) => {
    const available = getCredits();
    
    if (available.total < cost) {
      showUpgradePrompt(`More Credits for ${mode}`);
      return false;
    }

    // Optimistic UI update only — server deducts via deduct_user_credit atomically
    const currentCredits = creditsRef.current;
    
    let remainingCost = cost;
    let newDailyUsed = currentCredits.dailyUsed;
    let newMonthlyUsed = currentCredits.monthlyUsed;
    
    const dailyAvailable = CREDIT_LIMITS[tier].daily - currentCredits.dailyUsed;
    const fromDaily = Math.min(remainingCost, dailyAvailable);
    newDailyUsed += fromDaily;
    remainingCost -= fromDaily;
    
    if (remainingCost > 0) {
      const monthlyAvailable = CREDIT_LIMITS[tier].monthly - currentCredits.monthlyUsed;
      const fromMonthly = Math.min(remainingCost, monthlyAvailable);
      newMonthlyUsed += fromMonthly;
    }

    // Update ref immediately for rapid-call accuracy
    creditsRef.current = {
      ...currentCredits,
      dailyUsed: newDailyUsed,
      monthlyUsed: newMonthlyUsed,
    };

    setSubscription(prev => ({
      ...prev,
      dailyQuestionsUsed: prev.dailyQuestionsUsed + 1,
      credits: {
        ...prev.credits,
        dailyUsed: newDailyUsed,
        monthlyUsed: newMonthlyUsed,
      },
    }));

    // For guest users, persist to localStorage
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('minimind_guest_credits', JSON.stringify({
          date: today,
          dailyUsed: newDailyUsed,
        }));
      }
      // For authenticated users: do NOT call update_user_credits here.
      // The chat edge function already calls deduct_user_credit atomically.
      // syncCreditsFromServer will update the UI with the server's response.
    } catch (error) {
      console.error('Error in useCredits:', error);
    }
    
    return true;
  }, [tier, getCredits, showUpgradePrompt]);

  // Sync credits from server response (source of truth)
  const syncCreditsFromServer = useCallback((creditsRemaining: number, dailyRemaining: number | null, monthlyRemaining: number | null) => {
    const limits = CREDIT_LIMITS[tier];
    const newDailyUsed = dailyRemaining !== null ? limits.daily - dailyRemaining : creditsRef.current.dailyUsed;
    const newMonthlyUsed = monthlyRemaining !== null ? limits.monthly - monthlyRemaining : creditsRef.current.monthlyUsed;
    
    creditsRef.current = {
      ...creditsRef.current,
      dailyUsed: Math.max(0, newDailyUsed),
      monthlyUsed: Math.max(0, newMonthlyUsed),
    };
    
    setSubscription(prev => ({
      ...prev,
      credits: { ...prev.credits, dailyUsed: creditsRef.current.dailyUsed, monthlyUsed: creditsRef.current.monthlyUsed },
    }));
  }, [tier]);

  const useQuestion = useCallback(async () => {
    return useCredits(1, 'question');
  }, [useCredits]);

  const initiateCheckout = useCallback(async (checkoutTier: 'plus' | 'pro', planType: PlanType) => {
    setIsCheckoutLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to subscribe');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: { tier: checkoutTier, planType }
      });

      if (error) throw error;

      // Load Razorpay SDK if not loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }

      const options = {
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: 'INR',
        name: 'MiniMind',
        description: `MiniMind ${checkoutTier.charAt(0).toUpperCase() + checkoutTier.slice(1)} - ${planType}`,
        handler: async function(response: any) {
          const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
            body: {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              tier: checkoutTier,
              planType
            }
          });

          if (verifyError) {
            toast.error('Payment verification failed. Please contact support.');
            return;
          }

          toast.success(`🎉 Welcome to MiniMind ${checkoutTier.charAt(0).toUpperCase() + checkoutTier.slice(1)}!`);
          refreshSubscription();
          setUpgradeModalOpen(false);
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#8B5CF6'
        },
        modal: {
          ondismiss: function() {
            setIsCheckoutLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to initiate checkout. Please try again.');
    } finally {
      setIsCheckoutLoading(false);
    }
  }, [refreshSubscription]);

  // Top-up purchase
  const initiateTopUp = useCallback(async (productId: string) => {
    setIsCheckoutLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to purchase credits');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-topup-order', {
        body: { productId }
      });

      if (error) throw error;

      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }

      const product = [...TOP_UP_PRODUCTS.packs, ...TOP_UP_PRODUCTS.boosters].find(p => p.id === productId);

      const options = {
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: 'INR',
        name: 'MiniMind',
        description: product ? `${product.name} - ${product.credits} credits` : 'Credit Top-up',
        handler: async function(response: any) {
          const { error: verifyError } = await supabase.functions.invoke('verify-topup-payment', {
            body: {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              productId
            }
          });

          if (verifyError) {
            toast.error('Payment verification failed. Please contact support.');
            return;
          }

          toast.success(`🎉 ${product?.credits || ''} credits added!`);
          refreshSubscription();
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#8B5CF6'
        },
        modal: {
          ondismiss: function() {
            setIsCheckoutLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Top-up error:', error);
      toast.error('Failed to initiate purchase. Please try again.');
    } finally {
      setIsCheckoutLoading(false);
    }
  }, [refreshSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        features,
        subscription,
        isLoading,
        hasFeature,
        canAskQuestion,
        getRemainingQuestions,
        getCredits,
        hasCredits,
        useQuestion,
        useCredits,
        refreshSubscription,
        syncCreditsFromServer,
        isUpgradeModalOpen,
        setUpgradeModalOpen,
        upgradeFeature,
        showUpgradePrompt,
        initiateCheckout,
        initiateTopUp,
        isCheckoutLoading,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

// Type augmentation for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}
