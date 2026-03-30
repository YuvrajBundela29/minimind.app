import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, SquarePen, Sun, Moon, HelpCircle, MessageSquareHeart, 
  Zap, Clock, User, Settings, BookOpen, Crown, FileText, 
  Compass, ChevronRight
} from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import minimindLogo from '@/assets/minimind-logo.png';

interface HistoryEntry {
  id: string;
  question: string;
  timestamp: Date;
}

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onShowGuide?: () => void;
  onNewChat?: () => void;
  history?: HistoryEntry[];
  onLoadHistoryItem?: (item: HistoryEntry) => void;
}

const SideMenu: React.FC<SideMenuProps> = ({
  isOpen,
  onClose,
  currentPage,
  onNavigate,
  theme,
  onToggleTheme,
  onShowGuide,
  onNewChat,
  history = [],
  onLoadHistoryItem,
}) => {
  const { tier, getCredits } = useSubscription();
  const credits = getCredits();

  // Group history by date
  const today = new Date();
  const todayStr = today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const grouped: { label: string; items: HistoryEntry[] }[] = [];
  const todayItems: HistoryEntry[] = [];
  const yesterdayItems: HistoryEntry[] = [];
  const olderItems: HistoryEntry[] = [];

  history.forEach(h => {
    const d = new Date(h.timestamp).toDateString();
    if (d === todayStr) todayItems.push(h);
    else if (d === yesterdayStr) yesterdayItems.push(h);
    else olderItems.push(h);
  });

  if (todayItems.length > 0) grouped.push({ label: 'Today', items: todayItems });
  if (yesterdayItems.length > 0) grouped.push({ label: 'Yesterday', items: yesterdayItems });
  if (olderItems.length > 0) grouped.push({ label: 'Previous', items: olderItems.slice(0, 20) });

  const tierLabel = tier === 'free' ? 'Free' : tier === 'plus' ? 'Plus' : 'Pro';
  const tierGradient = tier === 'pro' 
    ? 'from-amber-500 to-orange-500' 
    : tier === 'plus' 
    ? 'from-violet-500 to-purple-500' 
    : 'from-slate-400 to-slate-500';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            className="fixed left-0 top-0 bottom-0 z-50 w-[280px] flex flex-col overflow-hidden"
            style={{
              background: theme === 'dark' 
                ? 'linear-gradient(180deg, hsl(220 14% 8%) 0%, hsl(220 14% 6%) 100%)' 
                : 'linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(220 14% 97%) 100%)',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            {/* ── Header: Logo + New Chat ── */}
            <div className="px-3 pt-4 pb-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img src={minimindLogo} alt="MiniMind" className="w-6 h-6" width={24} height={24} />
                  <span className="logo-text-premium text-base">MiniMind</span>
                  {tier !== 'free' && (
                    <span className={`px-1.5 py-0.5 rounded-md bg-gradient-to-r ${tierGradient} text-white text-[10px] font-bold uppercase tracking-wide`}>
                      {tierLabel}
                    </span>
                  )}
                </div>
                <motion.button
                  className="p-1.5 rounded-lg hover:bg-muted/80 transition-colors"
                  onClick={onClose}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              </div>

              {/* New Chat Button */}
              {onNewChat && (
                <motion.button
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm text-foreground text-sm font-medium hover:bg-muted/60 hover:border-primary/30 transition-all group"
                  onClick={() => { onNewChat(); onClose(); }}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -1 }}
                >
                  <SquarePen className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>New Chat</span>
                </motion.button>
              )}
            </div>

            {/* ── Explore Button ── */}
            <div className="px-3 py-1">
              <motion.button
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  currentPage === 'explore' 
                    ? 'bg-gradient-to-r from-primary/15 to-accent/10 text-primary border border-primary/20 shadow-sm' 
                    : 'hover:bg-muted/60 text-foreground'
                }`}
                onClick={() => { onNavigate('explore'); onClose(); }}
                whileTap={{ scale: 0.97 }}
              >
                <Compass className="w-4 h-4" />
                <span>Explore</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
              </motion.button>
            </div>

            {/* ── Divider ── */}
            <div className="mx-4 my-1.5 h-px bg-border/50" />

            {/* ── Chat History (scrollable) ── */}
            <div className="flex-1 overflow-y-auto px-3 py-1 custom-scrollbar min-h-0">
              {grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-50">
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Your conversations<br />will appear here
                  </p>
                </div>
              ) : (
                grouped.map(group => (
                  <div key={group.label} className="mb-2.5">
                    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-2 mb-1">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map(item => (
                        <motion.button
                          key={item.id}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-[13px] text-foreground/80 hover:bg-muted/60 hover:text-foreground transition-all truncate"
                          onClick={() => { onLoadHistoryItem?.(item); onClose(); }}
                          whileTap={{ scale: 0.98 }}
                          title={item.question}
                        >
                          {item.question.length > 38 ? item.question.slice(0, 38) + '…' : item.question}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ── Bottom: Account section ── */}
            <div className="border-t border-border/50 p-2.5 space-y-1">
              {/* Credits pill */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${tierGradient} flex items-center justify-center`}>
                    <Zap className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">{tierLabel}</span>
                </div>
                <span className={`text-xs font-semibold ${
                  credits.total <= 5 ? 'text-destructive' : credits.total <= 20 ? 'text-amber-500' : 'text-primary'
                }`}>
                  {credits.total} credits
                </span>
              </div>

              {/* Account button */}
              <motion.button
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  currentPage === 'account'
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-muted/60 text-foreground font-medium'
                }`}
                onClick={() => { onNavigate('account'); onClose(); }}
                whileTap={{ scale: 0.97 }}
              >
                <User className="w-4 h-4" />
                <span>Account</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
              </motion.button>

              {/* Quick actions row */}
              <div className="flex gap-0.5 pt-0.5">
                <motion.button
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg hover:bg-muted/60 text-muted-foreground text-[11px] font-medium transition-colors"
                  onClick={onToggleTheme}
                  whileTap={{ scale: 0.95 }}
                >
                  {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
                </motion.button>
                {onShowGuide && (
                  <motion.button
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg hover:bg-muted/60 text-muted-foreground text-[11px] font-medium transition-colors"
                    onClick={() => { onShowGuide(); onClose(); }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Guide</span>
                  </motion.button>
                )}
                <motion.a
                  href="mailto:feedback@minimind.app?subject=MiniMind Feedback"
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg hover:bg-muted/60 text-muted-foreground text-[11px] font-medium transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  <MessageSquareHeart className="w-3.5 h-3.5" />
                  <span>Feedback</span>
                </motion.a>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SideMenu;
