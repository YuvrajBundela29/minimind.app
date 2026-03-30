import React, { useState, useEffect } from 'react';
import { Coins, ShoppingBag, Check, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  cost_coins: number;
  item_type: string;
  is_active: boolean;
}

const ITEM_ICONS: Record<string, string> = {
  theme: '🎨',
  font: '✏️',
  badge: '🏅',
  frame: '✨',
  flame: '🔥',
};

const ShopPage: React.FC = () => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [coinBalance, setCoinBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: shopItems } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_active', true);

      if (shopItems) setItems(shopItems as ShopItem[]);

      if (user) {
        const { data: coins } = await supabase
          .from('user_coins')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        setCoinBalance(coins?.balance ?? 0);

        const { data: purchases } = await supabase
          .from('user_purchases')
          .select('item_id')
          .eq('user_id', user.id);

        if (purchases) {
          setPurchased(new Set(purchases.map(p => p.item_id)));
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const handlePurchase = async (item: ShopItem) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Please sign in'); return; }

    if (coinBalance < item.cost_coins) {
      toast.error('Not enough coins!');
      return;
    }

    // Deduct coins
    await supabase
      .from('user_coins')
      .update({
        balance: coinBalance - item.cost_coins,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Record transaction
    await supabase.from('coin_transactions').insert({
      user_id: user.id,
      amount: -item.cost_coins,
      reason: `Purchased: ${item.name}`,
    });

    // Record purchase
    await supabase.from('user_purchases').insert({
      user_id: user.id,
      item_id: item.id,
    });

    setCoinBalance(prev => prev - item.cost_coins);
    setPurchased(prev => new Set([...prev, item.id]));
    toast.success(`🎉 ${item.name} unlocked!`);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">Loading shop...</div>;
  }

  const grouped = items.reduce<Record<string, ShopItem[]>>((acc, item) => {
    const type = item.item_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const typeLabels: Record<string, string> = {
    theme: 'Profile Themes',
    font: 'AI Response Fonts',
    badge: 'Nameplate Badges',
    frame: 'Avatar Borders',
    flame: 'Streak Flames',
  };

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      <div className="text-center space-y-1 pt-2">
        <div className="flex items-center justify-center gap-2">
          <ShoppingBag className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold text-foreground font-[var(--font-heading)]">MiniMind Shop</h1>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-amber-600 dark:text-amber-400">{coinBalance.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">coins</span>
        </div>
      </div>

      {Object.entries(grouped).map(([type, typeItems]) => (
        <div key={type} className="space-y-2">
          <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5 px-1">
            <span>{ITEM_ICONS[type] || '🎁'}</span>
            {typeLabels[type] || type}
          </h2>

          <div className="grid grid-cols-2 gap-2">
            {typeItems.map(item => {
              const owned = purchased.has(item.id);
              return (
                <Card key={item.id} className={`p-3 space-y-2 ${owned ? 'border-primary/30 bg-primary/5' : ''}`}>
                  <p className="font-medium text-sm text-foreground">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-amber-500" />
                      <span className="text-xs font-semibold">{item.cost_coins}</span>
                    </div>
                    {owned ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs">
                        <Check className="w-3 h-3 mr-0.5" />
                        Owned
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2"
                        onClick={() => handlePurchase(item)}
                        disabled={coinBalance < item.cost_coins}
                      >
                        Buy
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* How to earn coins */}
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          How to earn coins
        </h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between"><span>Daily login</span><span className="text-amber-500 font-semibold">+5</span></div>
          <div className="flex justify-between"><span>Complete Arena</span><span className="text-amber-500 font-semibold">+10-50</span></div>
          <div className="flex justify-between"><span>7-day streak</span><span className="text-amber-500 font-semibold">+100</span></div>
          <div className="flex justify-between"><span>Refer a friend</span><span className="text-amber-500 font-semibold">+200</span></div>
          <div className="flex justify-between"><span>Earn a badge</span><span className="text-amber-500 font-semibold">+50</span></div>
          <div className="flex justify-between"><span>Complete learning path</span><span className="text-amber-500 font-semibold">+500</span></div>
        </div>
      </Card>
    </div>
  );
};

export default ShopPage;
