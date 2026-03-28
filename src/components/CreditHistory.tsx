import React, { useEffect, useState } from 'react';
import { CalendarDays, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription, CREDIT_LIMITS } from '@/contexts/SubscriptionContext';

interface DayUsage {
  date: string;
  queries: number;
}

const CreditHistory: React.FC = () => {
  const { tier, getCredits, subscription } = useSubscription();
  const [usage, setUsage] = useState<DayUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('usage_logs')
        .select('created_at, mode')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) { console.error('Usage fetch error:', error); setLoading(false); return; }

      // Group by day
      const grouped: Record<string, number> = {};
      (data || []).forEach((log) => {
        const day = new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        grouped[day] = (grouped[day] || 0) + 1;
      });

      setUsage(Object.entries(grouped).map(([date, queries]) => ({ date, queries })));
      setLoading(false);
    };

    fetchUsage();
  }, []);

  const credits = getCredits();
  const limits = CREDIT_LIMITS[tier];
  const totalUsedThisPeriod = usage.reduce((sum, d) => sum + d.queries, 0);

  const resetDate = subscription.currentPeriodEnd
    ? subscription.currentPeriodEnd
    : new Date(new Date().setHours(24, 0, 0, 0));

  const daysUntilReset = Math.max(0, Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Credit History
      </h3>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-muted/50 text-center">
          <p className="text-xl font-bold text-foreground">{totalUsedThisPeriod}</p>
          <p className="text-[10px] text-muted-foreground">Queries (30d)</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/50 text-center">
          <p className="text-xl font-bold text-foreground">{credits.total}</p>
          <p className="text-[10px] text-muted-foreground">Remaining</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/50 text-center flex flex-col items-center justify-center">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xl font-bold text-foreground">{daysUntilReset}</p>
          </div>
          <p className="text-[10px] text-muted-foreground">Days to refill</p>
        </div>
      </div>

      {/* Usage table */}
      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-4">Loading usage data...</div>
      ) : usage.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">No usage data yet. Start asking questions!</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  <CalendarDays className="w-3.5 h-3.5 inline mr-1" />Date
                </th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Queries</th>
              </tr>
            </thead>
            <tbody>
              {usage.slice(0, 14).map((day, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">{day.date}</td>
                  <td className="px-3 py-2 text-right text-foreground">{day.queries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CreditHistory;
