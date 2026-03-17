import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, BarChart3, Zap, History, Settings, Sun, Moon, HelpCircle, User, BookOpen, Crown, FileSearch, Sparkles, MessageCircle, LayoutDashboard, MessageSquareHeart, Target, SquarePen, Cpu } from 'lucide-react';

import { navigationItems, NavigationId } from '@/config/minimind';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  Home,
  User,
  BarChart3,
  Zap,
  History,
  Cog: Settings,
  BookOpen,
  Crown,
  FileSearch,
  Sparkles,
  MessageCircle,
  LayoutDashboard,
  Target,
};

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: NavigationId;
  onNavigate: (page: NavigationId) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onShowGuide?: () => void;
  onNewChat?: () => void;
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
}) => {
  const { tier, subscription, getCredits } = useSubscription();
  const credits = getCredits();
  

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-card border-r border-border overflow-y-auto"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <img 
                  src="https://i.ibb.co/fGLH5Dxs/minimind-logo.png" 
                  alt="MiniMind" 
                  className="w-8 h-8"
                />
                <span className="logo-text">MiniMind</span>
                {tier === 'pro' && (
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold">
                    PRO
                  </span>
                )}
                {tier === 'plus' && (
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold">
                    PLUS
                  </span>
                )}
              </div>
              <motion.button
                className="icon-btn icon-btn-ghost"
                onClick={onClose}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Credits Display */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {tier === 'free' ? 'Free' : tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {`${credits.total} credits`}
                </span>
              </div>
            </div>
            
            {/* New Chat Button */}
            {onNewChat && (
              <div className="p-4 pb-2">
                <motion.button
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-primary text-primary font-semibold hover:bg-primary/10 transition-colors"
                  onClick={() => {
                    onNewChat();
                    onClose();
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <SquarePen className="w-5 h-5" />
                  <span>New Chat</span>
                </motion.button>
              </div>
            )}

            <nav className="p-4">
              {/* Learn Section */}
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">Learn</p>
              <div className="space-y-1 mb-4">
                {navigationItems.slice(0, 5).map((item) => {
                  const Icon = iconMap[item.icon] || Home;
                  const isActive = currentPage === item.id;
                  
                  return (
                    <TooltipProvider key={item.id} delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.button
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors touch-target ${
                              isActive 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-muted text-foreground'
                            }`}
                            onClick={() => {
                              onNavigate(item.id);
                              onClose();
                            }}
                            whileTap={{ scale: 0.98 }}
                            aria-label={item.label}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                          </motion.button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[200px]">
                          <p className="text-xs">{item.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>

              {/* Account Section */}
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">Account</p>
              <div className="space-y-1">
                {navigationItems.slice(5).map((item) => {
                  const Icon = iconMap[item.icon] || Home;
                  const isActive = currentPage === item.id;
                  
                  return (
                    <TooltipProvider key={item.id} delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.button
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors touch-target ${
                              isActive 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-muted text-foreground'
                            }`}
                            onClick={() => {
                              onNavigate(item.id);
                              onClose();
                            }}
                            whileTap={{ scale: 0.98 }}
                            aria-label={item.label}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                          </motion.button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[200px]">
                          <p className="text-xs">{item.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </nav>
            
            {/* Offline AI Link */}
            <div className="px-4 pb-2">
              <motion.button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-foreground"
                onClick={() => {
                  window.location.href = '/offline-ai';
                  onClose();
                }}
                whileTap={{ scale: 0.98 }}
              >
                <Cpu className="w-5 h-5" />
                <span className="font-medium">Offline AI</span>
                <span className="ml-auto px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">NEW</span>
              </motion.button>
            </div>

            <div className="mx-4 h-px bg-border" />
            
            <div className="p-4 space-y-1">
              <motion.button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors"
                onClick={onToggleTheme}
                whileTap={{ scale: 0.98 }}
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="w-5 h-5" />
                    <span className="font-medium">Dark Mode</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-5 h-5" />
                    <span className="font-medium">Light Mode</span>
                  </>
                )}
              </motion.button>
              
              {onShowGuide && (
                <motion.button
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-primary"
                  onClick={() => {
                    onShowGuide();
                    onClose();
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <HelpCircle className="w-5 h-5" />
                  <span className="font-medium">App Guide</span>
                </motion.button>
              )}
              
              {/* Send Feedback */}
              <motion.a
                href="mailto:feedback@minimind.app?subject=MiniMind Feedback"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                whileTap={{ scale: 0.98 }}
              >
                <MessageSquareHeart className="w-5 h-5" />
                <span className="font-medium">Send Feedback</span>
              </motion.a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SideMenu;
