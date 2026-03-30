import React from 'react';
import { motion } from 'framer-motion';
import { 
  User, Clock, FileText, Crown, Settings, 
  ChevronRight, LogOut
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface AccountPageProps {
  onNavigate: (page: string) => void;
  onSignOut: () => void;
}

const ACCOUNT_ITEMS = [
  { id: 'profile', label: 'Profile', description: 'Your account & achievements', icon: User, emoji: '👤' },
  { id: 'history', label: 'History', description: 'Past questions & answers', icon: Clock, emoji: '🕐' },
  { id: 'notes', label: 'Saved Notes', description: 'Your bookmarked AI responses', icon: FileText, emoji: '📝' },
  { id: 'subscription', label: 'Subscription', description: 'Manage your plan & credits', icon: Crown, emoji: '👑' },
  { id: 'settings', label: 'Settings', description: 'Language, theme & preferences', icon: Settings, emoji: '⚙️' },
];

const AccountPage: React.FC<AccountPageProps> = ({ onNavigate, onSignOut }) => {
  const { tier } = useSubscription();
  const tierLabel = tier === 'free' ? 'Free Plan' : tier === 'plus' ? 'Plus Plan' : 'Pro Plan';
  const tierGradient = tier === 'pro'
    ? 'from-amber-500 to-orange-500'
    : tier === 'plus'
    ? 'from-violet-500 to-purple-500'
    : 'from-slate-400 to-slate-500';

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-2"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20 mb-3">
          <User className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-primary">Account</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">Your Account</h1>
        <p className="text-xs text-muted-foreground mt-1">Manage your profile and preferences</p>
      </motion.div>

      {/* Current Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${tierGradient} text-white`}
      >
        <div className="relative z-10">
          <p className="text-xs font-medium opacity-80">Current Plan</p>
          <p className="text-lg font-bold mt-0.5">{tierLabel}</p>
          {tier === 'free' && (
            <motion.button
              className="mt-2 px-4 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-xs font-semibold hover:bg-white/30 transition-colors"
              onClick={() => onNavigate('subscription')}
              whileTap={{ scale: 0.97 }}
            >
              Upgrade for more credits →
            </motion.button>
          )}
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/5" />
      </motion.div>

      {/* Nav Items */}
      <div className="space-y-2">
        {ACCOUNT_ITEMS.map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 + index * 0.04 }}
            className="w-full flex items-center gap-3.5 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all text-left group active:scale-[0.98]"
            onClick={() => onNavigate(item.id)}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-xl shrink-0 group-hover:bg-primary/10 transition-colors">
              {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
          </motion.button>
        ))}
      </div>

      {/* Sign Out */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-destructive/20 text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium"
        onClick={onSignOut}
        whileTap={{ scale: 0.98 }}
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out</span>
      </motion.button>
    </div>
  );
};

export default AccountPage;
