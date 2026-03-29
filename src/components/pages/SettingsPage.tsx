import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Globe, Trash2, Info, Heart, Search, ChevronDown, FileText, Shield, ReceiptText, ChevronRight } from 'lucide-react';
import { languages, LanguageKey, ModeKey } from '@/config/minimind';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingsPageProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  selectedLanguage: LanguageKey;
  onLanguageSelect: (lang: LanguageKey) => void;
  onClearHistory: () => void;
  onNavigateToLegal?: (page: 'terms' | 'privacy' | 'refund') => void;
  stats: {
    totalQuestions: number;
    todayQuestions: number;
    favoriteMode: ModeKey;
    streak: number;
  };
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  theme,
  onToggleTheme,
  selectedLanguage,
  onLanguageSelect,
  onClearHistory,
  onNavigateToLegal,
  stats,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredLanguages = useMemo(() => {
    return Object.entries(languages).filter(([key, lang]) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const currentLang = languages[selectedLanguage];

  return (
    <div className="py-4 space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">⚙️</div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Customize your experience</p>
      </div>

      {/* Theme Toggle */}
      <motion.div
        className="mode-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'light' ? (
              <Sun className="w-6 h-6 text-amber-500" />
            ) : (
              <Moon className="w-6 h-6 text-blue-400" />
            )}
            <div>
              <h3 className="font-medium text-foreground">Appearance</h3>
              <p className="text-xs text-muted-foreground">
                {theme === 'light' ? 'Light mode' : 'Dark mode'}
              </p>
            </div>
          </div>
          
          <motion.button
            className="w-14 h-8 rounded-full p-1 transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
            }}
            onClick={onToggleTheme}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="w-6 h-6 rounded-full bg-white shadow-md"
              animate={{ x: theme === 'dark' ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>
      </motion.div>

      {/* Language Selection - Dropdown with Search */}
      <motion.div
        className="mode-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-medium text-foreground">Language</h3>
            <p className="text-xs text-muted-foreground">Select your preferred language</p>
          </div>
        </div>
        
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <motion.button
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-border bg-background hover:bg-muted transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{currentLang.flag}</span>
                <span className="font-medium text-foreground">{currentLang.name}</span>
                <span className="text-sm text-muted-foreground">({currentLang.nativeName})</span>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="w-[calc(100vw-4rem)] max-w-md bg-card border-border"
            align="start"
          >
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search languages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <ScrollArea className="h-64">
              {filteredLanguages.map(([key, lang]) => (
                <DropdownMenuItem
                  key={key}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                    selectedLanguage === key ? 'bg-primary/10 text-primary' : ''
                  }`}
                  onClick={() => {
                    onLanguageSelect(key as LanguageKey);
                    setSearchQuery('');
                    setIsOpen(false);
                  }}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                  <span className="text-sm text-muted-foreground">({lang.nativeName})</span>
                </DropdownMenuItem>
              ))}
              {filteredLanguages.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">
                  No languages found
                </div>
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Clear Data */}
      <motion.div
        className="mode-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="w-6 h-6 text-destructive" />
          <div>
            <h3 className="font-medium text-foreground">Clear Data</h3>
            <p className="text-xs text-muted-foreground">Delete all saved history</p>
          </div>
        </div>
        
        <motion.button
          className="w-full py-3 px-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
          onClick={onClearHistory}
          whileTap={{ scale: 0.98 }}
        >
          Clear History
        </motion.button>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="mode-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Info className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-medium text-foreground">Your Stats</h3>
            <p className="text-xs text-muted-foreground">Learning activity summary</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted rounded-xl">
            <div className="text-2xl font-bold text-foreground">{stats.totalQuestions}</div>
            <div className="text-xs text-muted-foreground">Total Questions</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-xl">
            <div className="text-2xl font-bold text-foreground">{stats.todayQuestions}</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </div>
        </div>
      </motion.div>

      {/* Legal & Policies */}
      <motion.div
        className="mode-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-medium text-foreground">Legal & Policies</h3>
            <p className="text-xs text-muted-foreground">Terms, privacy & refund policies</p>
          </div>
        </div>
        
        <div className="space-y-2">
          {[
            { key: 'terms' as const, label: 'Terms of Service', icon: FileText },
            { key: 'privacy' as const, label: 'Privacy Policy', icon: Shield },
            { key: 'refund' as const, label: 'Refund & Cancellation Policy', icon: ReceiptText },
          ].map((item) => (
            <motion.button
              key={item.key}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
              onClick={() => onNavigateToLegal?.(item.key)}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* About */}
      <motion.div
        className="mode-card bg-gradient-to-br from-primary/5 to-accent/5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img 
              src="https://i.ibb.co/fGLH5Dxs/minimind-logo.png" 
              alt="MiniMind" 
              className="w-8 h-8"
            />
            <span className="font-heading font-bold text-lg gradient-text">MiniMind</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            AI-powered learning companion that explains anything in 4 unique ways.
          </p>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <span>Made with</span>
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            <span>for curious minds</span>
          </div>
        </div>
      </motion.div>

      {/* Version */}
      <div className="text-center text-xs text-muted-foreground">
        <p>Version 2.0 • Powered by AI</p>
      </div>
    </div>
  );
};

export default SettingsPage;
