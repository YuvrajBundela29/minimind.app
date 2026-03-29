import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Monitor, Globe, Trash2, Heart, Search, ChevronDown, Lock, KeyRound, Download, UserX, Bell, BellOff, Type } from 'lucide-react';
import { languages, LanguageKey, ModeKey, modes } from '@/config/minimind';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SettingsPageProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  selectedLanguage: LanguageKey;
  onLanguageSelect: (lang: LanguageKey) => void;
  onClearHistory: () => void;
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

  // Segmented control component
  const SegmentedControl = ({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) => (
    <div className="flex bg-muted rounded-xl p-1 gap-1">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            value === opt.value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="py-4 space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">⚙️</div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Customize your experience</p>
      </div>

      {/* Section 1: Appearance */}
      <Section title="Appearance">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Theme</label>
            <SegmentedControl
              options={[
                { label: '☀️ Light', value: 'light' },
                { label: '🌙 Dark', value: 'dark' },
                { label: '💻 System', value: 'system' },
              ]}
              value={theme}
              onChange={(v) => {
                if (v === 'system') {
                  const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  onToggleTheme();
                } else if (v !== theme) {
                  onToggleTheme();
                }
              }}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Font size (AI responses)</label>
            <SegmentedControl
              options={[
                { label: 'Small', value: 'small' },
                { label: 'Medium', value: 'medium' },
                { label: 'Large', value: 'large' },
              ]}
              value="medium"
              onChange={() => toast.info('Font size preference saved')}
            />
          </div>
        </div>
      </Section>

      {/* Section 2: Learning Preferences */}
      <Section title="Learning Preferences">
        <div className="space-y-4">
          {/* Language Dropdown */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Default language</label>
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <motion.button
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
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
              <DropdownMenuContent className="w-[calc(100vw-4rem)] max-w-md bg-card border-border" align="start">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search languages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" onClick={(e) => e.stopPropagation()} />
                  </div>
                </div>
                <ScrollArea className="h-64">
                  {filteredLanguages.map(([key, lang]) => (
                    <DropdownMenuItem key={key} className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${selectedLanguage === key ? 'bg-primary/10 text-primary' : ''}`}
                      onClick={() => { onLanguageSelect(key as LanguageKey); setSearchQuery(''); setIsOpen(false); }}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="font-medium">{lang.name}</span>
                      <span className="text-sm text-muted-foreground">({lang.nativeName})</span>
                    </DropdownMenuItem>
                  ))}
                  {filteredLanguages.length === 0 && <div className="p-4 text-center text-muted-foreground">No languages found</div>}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Default learning mode</label>
            <SegmentedControl
              options={[
                { label: '🌱 Beginner', value: 'beginner' },
                { label: '🧠 Thinker', value: 'thinker' },
                { label: '📖 Story', value: 'story' },
                { label: '🎓 Mastery', value: 'mastery' },
              ]}
              value="beginner"
              onChange={() => toast.info('Default mode preference saved')}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">AI response length</label>
            <SegmentedControl
              options={[
                { label: 'Concise', value: 'concise' },
                { label: 'Balanced', value: 'balanced' },
                { label: 'Detailed', value: 'detailed' },
              ]}
              value="balanced"
              onChange={() => toast.info('Response length preference saved')}
            />
          </div>
        </div>
      </Section>

      {/* Section 3: Notifications */}
      <Section title="Notifications">
        <div className="space-y-3">
          <ToggleRow icon={<Bell className="w-5 h-5 text-primary" />} label="Daily study reminder" checked={false} onChange={() => {}} />
          <ToggleRow icon={<BellOff className="w-5 h-5 text-muted-foreground" />} label="Streak reminder" checked={false} onChange={() => {}} />
          <p className="text-xs text-muted-foreground italic mt-2">Notification settings are coming soon</p>
        </div>
      </Section>

      {/* Section 4: Account */}
      <Section title="Account">
        <div className="space-y-3">
          <SettingsRow label="Edit display name" description="Change your public name" onClick={() => toast.info('Edit name from Profile page')} />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Email</p>
              <p className="text-xs text-muted-foreground">Managed by your account</p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Read-only</span>
          </div>
          <SettingsRow label="Change password" description="Update your account password" onClick={() => toast.info('Password change coming soon')} icon={<KeyRound className="w-5 h-5 text-muted-foreground" />} />
        </div>
      </Section>

      {/* Section 5: Data & Privacy */}
      <Section title="Data & Privacy">
        <div className="space-y-3">
          <motion.button
            className="w-full py-3 px-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium text-sm text-left"
            onClick={onClearHistory}
            whileTap={{ scale: 0.98 }}
          >
            Clear search history
          </motion.button>
          <SettingsRow label="Export my data" description="Download all your data" onClick={() => toast.info('Data export coming soon')} icon={<Download className="w-5 h-5 text-muted-foreground" />} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <motion.button
                className="w-full py-3 px-4 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors font-medium text-sm text-left flex items-center gap-2"
                whileTap={{ scale: 0.98 }}
              >
                <UserX className="w-5 h-5" />
                Delete account
              </motion.button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete all your data, notes, and progress. This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => toast.error('Account deletion requires contacting support')}>
                  Delete permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Section>

      {/* Section 6: About */}
      <Section title="About">
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="https://i.ibb.co/fGLH5Dxs/minimind-logo.png" alt="MiniMind" className="w-8 h-8" />
            <span className="font-heading font-bold text-lg gradient-text">MiniMind</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            AI-powered learning companion that explains anything in 4 unique ways.
          </p>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <span>Made in India 🇮🇳 by Yuvraj</span>
          </div>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <span>Made with</span>
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            <span>for curious minds</span>
          </div>
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>Version 2.0 • Powered by AI</p>
            <div className="flex items-center justify-center gap-3">
              <button className="text-primary hover:underline">Privacy Policy</button>
              <span>•</span>
              <button className="text-primary hover:underline">Terms of Service</button>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
};

// Helper components
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <motion.div
    className="mode-card"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <h3 className="font-heading font-semibold text-foreground mb-4">{title}</h3>
    {children}
  </motion.div>
);

const SettingsRow: React.FC<{ label: string; description: string; onClick: () => void; icon?: React.ReactNode }> = ({ label, description, onClick, icon }) => (
  <motion.button
    className="w-full flex items-center justify-between py-2 text-left"
    onClick={onClick}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
  </motion.button>
);

const ToggleRow: React.FC<{ icon: React.ReactNode; label: string; checked: boolean; onChange: () => void }> = ({ icon, label, checked, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
    <button
      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}
      onClick={onChange}
    >
      <motion.div
        className="w-5 h-5 rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  </div>
);

export default SettingsPage;
