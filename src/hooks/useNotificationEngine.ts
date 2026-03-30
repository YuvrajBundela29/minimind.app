import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_PREFIX = 'minimind-notif-';

function wasShownThisWeek(key: string): boolean {
  const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
  if (!stored) return false;
  const diff = Date.now() - parseInt(stored, 10);
  return diff < 7 * 24 * 60 * 60 * 1000;
}

function markShown(key: string): void {
  localStorage.setItem(`${STORAGE_PREFIX}${key}`, Date.now().toString());
}

export function useNotificationEngine() {
  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const hours = now.getHours();
      const month = now.getMonth() + 1;

      // Update last active
      const lastActive = localStorage.getItem('minimind_last_active');
      localStorage.setItem('minimind_last_active', Date.now().toString());

      // Trigger 1: Comeback (24+ hours inactive)
      if (lastActive && !wasShownThisWeek('comeback')) {
        const diff = Date.now() - parseInt(lastActive, 10);
        if (diff > 24 * 60 * 60 * 1000) {
          markShown('comeback');
          toast('Welcome back! Your streak is at risk. Ask one question to keep it alive. 🔥', {
            duration: 8000,
            action: { label: 'Ask now', onClick: () => {} },
          });
          return;
        }
      }

      // Trigger 2: Morning motivation (6-9 AM)
      if (hours >= 6 && hours < 9 && !wasShownThisWeek('morning')) {
        const todayKey = `minimind-first-open-${now.toISOString().split('T')[0]}`;
        if (!localStorage.getItem(todayKey)) {
          localStorage.setItem(todayKey, 'true');
          markShown('morning');
          toast("Good morning! ☀️ Today's Arena challenge is live. Students are already competing!", {
            duration: 6000,
          });
          return;
        }
      }

      // Trigger 3: Exam season (Mar, Apr, Oct, Nov)
      if ([3, 4, 10, 11].includes(month) && !wasShownThisWeek('exam-season')) {
        markShown('exam-season');
        toast('📚 Exam season alert! Students using MiniMind 30 min/day report 40% better concept retention.', {
          duration: 8000,
        });
        return;
      }

      // Trigger 5: Referral reminder (7+ days active, 0 referrals)
      if (!wasShownThisWeek('referral-remind')) {
        const firstUsed = localStorage.getItem('minimind-first-use');
        if (firstUsed) {
          const daysSinceFirst = (Date.now() - parseInt(firstUsed, 10)) / (24 * 60 * 60 * 1000);
          if (daysSinceFirst >= 7) {
            const { count } = await supabase
              .from('referrals')
              .select('*', { count: 'exact', head: true })
              .eq('referrer_id', user.id);

            if (count === 0) {
              markShown('referral-remind');
              toast("You've been learning for 7 days! 🎉 Share MiniMind with a friend and earn bonus credits.", {
                duration: 8000,
              });
            }
          }
        } else {
          localStorage.setItem('minimind-first-use', Date.now().toString());
        }
      }
    };

    const timer = setTimeout(run, 2000);
    return () => clearTimeout(timer);
  }, []);
}
