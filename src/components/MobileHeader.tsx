import React, { useEffect, useState } from 'react';
import { Menu, User, Crown, Sparkles, SquarePen } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { purposeLenses, PurposeLensKey } from '@/config/minimind';
import CreditBadge from '@/components/CreditBadge';

interface MobileHeaderProps {
  onMenuClick: () => void;
  onProfileClick: () => void;
  currentLens?: PurposeLensKey;
  onNewChat?: () => void;
  hasActiveChat?: boolean;
  onNavigateToSubscription?: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuClick, onProfileClick, currentLens = 'general', onNewChat, hasActiveChat = false, onNavigateToSubscription }) => {
  const { tier } = useSubscription();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const lensData = purposeLenses[currentLens];

  useEffect(() => {
    const fetchAvatar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }
      }
    };

    fetchAvatar();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchAvatar();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="mobile-header-enhanced">
      <motion.button
        className="icon-btn icon-btn-ghost"
        onClick={onMenuClick}
        whileTap={{ scale: 0.95 }}
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </motion.button>
      
      {/* Enhanced Logo Section */}
      <div className="flex items-center gap-2.5">
        <motion.div 
          className="logo-glow-container"
          animate={{ 
            boxShadow: [
              '0 0 8px hsl(221 83% 53% / 0.3)',
              '0 0 16px hsl(221 83% 53% / 0.5)',
              '0 0 8px hsl(221 83% 53% / 0.3)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <img 
            src="https://i.ibb.co/fGLH5Dxs/minimind-logo.png" 
            alt="MiniMind Logo" 
            className="w-9 h-9 object-contain"
          />
        </motion.div>
        <div className="flex flex-col items-start">
          <span className="logo-text-india">MiniMind</span>
          <span className="made-in-india-badge flex items-center gap-1">
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              {/* 12 spokes for Ashoka Chakra representation */}
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180;
                const x1 = 12 + 4 * Math.cos(angle);
                const y1 = 12 + 4 * Math.sin(angle);
                const x2 = 12 + 9 * Math.cos(angle);
                const y2 = 12 + 9 * Math.sin(angle);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
              })}
            </svg>
            Made in India
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Credit Badge */}
        <CreditBadge onNavigateToSubscription={onNavigateToSubscription} />

        {/* New Chat Button - only when chat is active */}
        {hasActiveChat && onNewChat && (
          <motion.button
            className="icon-btn icon-btn-ghost"
            onClick={onNewChat}
            whileTap={{ scale: 0.95 }}
            aria-label="New chat"
            title="Start new chat"
          >
            <SquarePen className="w-5 h-5 text-primary" />
          </motion.button>
        )}

        {/* Purpose Lens Badge */}
        {currentLens !== 'general' && (
          <motion.span
            className="text-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            title={`${lensData.name} mode`}
          >
            {lensData.icon}
          </motion.span>
        )}
        
        {/* Tier Badge */}
        {tier === 'pro' && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold">
            <Crown className="w-3 h-3" />
            PRO
          </span>
        )}
        {tier === 'plus' && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold">
            <Sparkles className="w-3 h-3" />
            PLUS
          </span>
        )}
        
        <motion.button
          className="icon-btn icon-btn-surface w-9 h-9 rounded-full overflow-hidden p-0 ring-2 ring-primary/20"
          onClick={onProfileClick}
          whileTap={{ scale: 0.95 }}
          aria-label="Profile"
        >
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5" />
          )}
        </motion.button>
      </div>
    </header>
  );
};

export default MobileHeader;
