import { supabase } from '@/integrations/supabase/client';
import { ensureBadgeCertificate } from '@/services/certificateService';
import { AVATAR_FRAMES } from '@/components/AvatarCustomizer';

interface UnlockedAchievement {
  id: string;
  name: string;
  icon: string;
  description: string;
}

/**
 * Checks for newly unlockable achievements and auto-unlocks them.
 * Returns any newly unlocked achievements for celebration display.
 * Fire-and-forget safe — never throws.
 */
export async function checkAndUnlockAchievements(): Promise<UnlockedAchievement[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get actual question count
    const { count: totalQuestions } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data: streakRow } = await supabase
      .from('user_streaks')
      .select('current_streak')
      .eq('user_id', user.id)
      .single();

    const total = totalQuestions ?? 0;
    const streak = streakRow?.current_streak ?? 0;

    const { data: allAchievements } = await supabase.from('achievements').select('*');
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id);

    if (!allAchievements) return [];

    const unlockedIds = new Set((userAchievements ?? []).map(ua => ua.achievement_id));

    const toUnlock = allAchievements.filter((a) => {
      if (unlockedIds.has(a.id)) return false;
      if (['total_questions', 'questions'].includes(a.requirement_type)) return total >= a.requirement_value;
      if (['streak', 'streak_days'].includes(a.requirement_type)) return streak >= a.requirement_value;
      return false;
    });

    if (toUnlock.length === 0) return [];

    const unlockedAt = new Date().toISOString();
    const results = await Promise.allSettled(
      toUnlock.map((a) =>
        supabase.from('user_achievements').insert({
          user_id: user.id,
          achievement_id: a.id,
          unlocked_at: unlockedAt,
        })
      )
    );

    const newlyUnlocked = toUnlock.filter(
      (_, i) => results[i].status === 'fulfilled' && (results[i] as PromiseFulfilledResult<any>).value.error === null
    );

    if (newlyUnlocked.length === 0) return [];

    // Generate certificates
    await Promise.allSettled(
      newlyUnlocked.map((a) => ensureBadgeCertificate(user.id, a.id, a.name))
    );

    // Auto-apply best frame
    const bestFrame = [...AVATAR_FRAMES]
      .filter(f => {
        if (f.unlockType === 'default') return false;
        if (f.unlockType === 'questions') return total >= f.unlockValue;
        if (f.unlockType === 'streak') return streak >= f.unlockValue;
        return false;
      })
      .pop();

    if (bestFrame) {
      localStorage.setItem('minimind-avatar-frame', bestFrame.id);
      await supabase.from('profiles').update({ selected_frame: bestFrame.id }).eq('user_id', user.id);
    }

    return newlyUnlocked.map(a => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      description: a.description,
    }));
  } catch (err) {
    console.error('Achievement check failed:', err);
    return [];
  }
}
