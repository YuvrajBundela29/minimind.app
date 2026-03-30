import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type CoinReason =
  | 'daily_login'
  | 'arena_completion'
  | 'streak_7_day'
  | 'referral'
  | 'badge_earned'
  | 'learning_path_complete'
  | 'shop_purchase';

/**
 * Hook that provides coin award/spend operations.
 * All operations are atomic: upsert user_coins + insert transaction.
 */
export function useCoins() {
  const awardCoins = useCallback(async (amount: number, reason: CoinReason): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Upsert user_coins row
      const { data: existing } = await supabase
        .from('user_coins')
        .select('balance, total_earned')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_coins')
          .update({
            balance: (existing.balance ?? 0) + amount,
            total_earned: (existing.total_earned ?? 0) + amount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_coins')
          .insert({
            user_id: user.id,
            balance: amount,
            total_earned: amount,
          });
      }

      // Log transaction
      await supabase.from('coin_transactions').insert({
        user_id: user.id,
        amount,
        reason,
      });

      return true;
    } catch (err) {
      console.error('Failed to award coins:', err);
      return false;
    }
  }, []);

  const checkDailyLoginReward = useCallback(async (): Promise<number> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const key = `minimind_daily_coin_${user.id}`;
      const lastClaimed = localStorage.getItem(key);
      const today = new Date().toISOString().slice(0, 10);

      if (lastClaimed === today) return 0;

      const awarded = await awardCoins(5, 'daily_login');
      if (awarded) {
        localStorage.setItem(key, today);
        return 5;
      }
      return 0;
    } catch {
      return 0;
    }
  }, [awardCoins]);

  return { awardCoins, checkDailyLoginReward };
}
