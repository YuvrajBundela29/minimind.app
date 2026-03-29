import React, { useEffect, useState } from 'react';
import { Menu, User, SquarePen } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { PurposeLensKey } from '@/config/minimind';
import CreditBadge from '@/components/CreditBadge';

interface MobileHeaderProps {
  onMenuClick: () => void;
  onProfileClick: () => void;
  currentLens?: PurposeLensKey;
  onNewChat?: () => void;
  hasActiveChat?: boolean;
  onNavigateToSubscription?: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  onMenuClick,
  onProfileClick,
  currentLens = 'general',
  onNewChat,
  hasActiveChat = false,
  onNavigateToSubscription,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
    <header className="app-header">
      {/* Left: Menu + Logo */}
      <div className="flex items-center gap-2.5">
        <motion.button
          className="header-icon-btn lg:hidden"
          onClick={onMenuClick}
          whileTap={{ scale: 0.95 }}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </motion.button>

        <div className="flex items-center gap-2">
          <img src={minimindLogo} alt="MiniMind" className="w-7 h-7" width={28} height={28} />
          <span className="logo-text-premium text-lg">MiniMind</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* New Chat */}
        {hasActiveChat && onNewChat && (
          <motion.button
            className="header-icon-btn"
            onClick={onNewChat}
            whileTap={{ scale: 0.95 }}
            aria-label="New chat"
            title="Start new chat"
          >
            <SquarePen className="w-[18px] h-[18px]" />
          </motion.button>
        )}

        {/* Credits */}
        <CreditBadge onNavigateToSubscription={onNavigateToSubscription} />

        {/* Profile avatar */}
        <motion.button
          className="header-avatar"
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
            <User className="w-4 h-4 text-muted-foreground" />
          )}
        </motion.button>
      </div>
    </header>
  );
};

export default MobileHeader;
