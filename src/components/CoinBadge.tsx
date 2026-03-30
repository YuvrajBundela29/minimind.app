import React, { useState, useEffect } from 'react';
import { Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface CoinBadgeProps {
  onNavigateToShop?: () => void;
}

const CoinBadge: React.FC<CoinBadgeProps> = ({ onNavigateToShop }) => {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) setBalance(data.balance);
    };
    load();
  }, []);

  return (
    <motion.button
      className="flex items-center gap-1 px-2 py-1 rounded-full border bg-amber-500/10 border-amber-500/30 text-xs font-semibold text-amber-600 dark:text-amber-400"
      whileTap={{ scale: 0.95 }}
      onClick={onNavigateToShop}
      aria-label={`${balance} coins`}
    >
      <Coins className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{balance.toLocaleString()}</span>
    </motion.button>
  );
};

export default CoinBadge;
