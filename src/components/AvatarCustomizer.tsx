import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, X, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// Preset avatar emojis
const PRESET_AVATARS = [
  '🧑‍🎓', '👩‍🔬', '👨‍💻', '🧑‍🚀', '👩‍🏫', '🧙‍♂️',
  '🦊', '🐱', '🦁', '🐼', '🦉', '🐸',
  '🌟', '🔥', '💎', '🎯', '⚡', '🌈',
  '🤖', '👾', '🎮', '🏆', '🎨', '📚',
];

// Avatar frames with unlock requirements
export interface AvatarFrame {
  id: string;
  name: string;
  gradient: string;
  borderStyle: string;
  ringColor: string;
  unlockType: 'level' | 'streak' | 'questions' | 'default';
  unlockValue: number;
  description: string;
}

export const AVATAR_FRAMES: AvatarFrame[] = [
  {
    id: 'default',
    name: 'Default',
    gradient: 'from-primary to-accent',
    borderStyle: 'border-2 border-primary/30',
    ringColor: 'ring-primary/20',
    unlockType: 'default',
    unlockValue: 0,
    description: 'Available to everyone',
  },
  {
    id: 'bronze',
    name: 'Bronze',
    gradient: 'from-amber-700 to-yellow-600',
    borderStyle: 'border-[3px] border-amber-600/60',
    ringColor: 'ring-amber-500/30',
    unlockType: 'questions',
    unlockValue: 5,
    description: 'Ask 5 questions',
  },
  {
    id: 'silver',
    name: 'Silver',
    gradient: 'from-gray-400 to-slate-300',
    borderStyle: 'border-[3px] border-slate-400/60',
    ringColor: 'ring-slate-400/30',
    unlockType: 'questions',
    unlockValue: 25,
    description: 'Ask 25 questions',
  },
  {
    id: 'gold',
    name: 'Gold',
    gradient: 'from-yellow-500 to-amber-400',
    borderStyle: 'border-[3px] border-yellow-500/60',
    ringColor: 'ring-yellow-400/40',
    unlockType: 'questions',
    unlockValue: 50,
    description: 'Ask 50 questions',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    gradient: 'from-emerald-500 to-teal-400',
    borderStyle: 'border-[3px] border-emerald-500/60',
    ringColor: 'ring-emerald-400/30',
    unlockType: 'streak',
    unlockValue: 3,
    description: '3-day streak',
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    gradient: 'from-blue-500 to-cyan-400',
    borderStyle: 'border-[3px] border-blue-500/60',
    ringColor: 'ring-blue-400/30',
    unlockType: 'streak',
    unlockValue: 7,
    description: '7-day streak',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    gradient: 'from-red-500 to-rose-400',
    borderStyle: 'border-[3px] border-red-500/60',
    ringColor: 'ring-red-400/30',
    unlockType: 'streak',
    unlockValue: 14,
    description: '14-day streak',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    gradient: 'from-violet-400 via-pink-300 to-cyan-300',
    borderStyle: 'border-[3px] border-violet-400/60',
    ringColor: 'ring-violet-300/40',
    unlockType: 'streak',
    unlockValue: 30,
    description: '30-day streak',
  },
  {
    id: 'cosmic',
    name: 'Cosmic',
    gradient: 'from-purple-600 via-pink-500 to-orange-400',
    borderStyle: 'border-[3px] border-purple-500/60',
    ringColor: 'ring-purple-400/40',
    unlockType: 'questions',
    unlockValue: 100,
    description: 'Ask 100 questions',
  },
  {
    id: 'legendary',
    name: 'Legendary',
    gradient: 'from-yellow-300 via-amber-500 to-orange-600',
    borderStyle: 'border-4 border-yellow-400/70',
    ringColor: 'ring-yellow-300/50',
    unlockType: 'questions',
    unlockValue: 500,
    description: 'Ask 500 questions',
  },
];

interface AvatarCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl: string | null;
  currentFrameId: string;
  currentPresetAvatar: string | null;
  totalQuestions: number;
  currentStreak: number;
  onSelectFrame: (frameId: string) => void;
  onSelectPresetAvatar: (emoji: string) => void;
  onUploadClick: () => void;
}

export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  currentFrameId,
  currentPresetAvatar,
  totalQuestions,
  currentStreak,
  onSelectFrame,
  onSelectPresetAvatar,
  onUploadClick,
}) => {
  const [tab, setTab] = useState<'frames' | 'avatars'>('frames');

  const isFrameUnlocked = (frame: AvatarFrame) => {
    if (frame.unlockType === 'default') return true;
    if (frame.unlockType === 'questions') return totalQuestions >= frame.unlockValue;
    if (frame.unlockType === 'streak') return currentStreak >= frame.unlockValue;
    return false;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-card rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[80vh]"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-bold text-foreground">Customize Avatar</h3>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Preview */}
            <div className="flex justify-center py-5 bg-muted/30">
              <AvatarWithFrame
                avatarUrl={currentAvatarUrl}
                presetAvatar={currentPresetAvatar}
                frameId={currentFrameId}
                size="lg"
              />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium transition-colors',
                  tab === 'frames'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setTab('frames')}
              >
                Frames
              </button>
              <button
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium transition-colors',
                  tab === 'avatars'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setTab('avatars')}
              >
                Avatars
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[40vh]">
              {tab === 'frames' ? (
                <div className="grid grid-cols-5 gap-3">
                  {AVATAR_FRAMES.map((frame) => {
                    const unlocked = isFrameUnlocked(frame);
                    const selected = currentFrameId === frame.id;
                    return (
                      <motion.button
                        key={frame.id}
                        onClick={() => unlocked && onSelectFrame(frame.id)}
                        className={cn(
                          'relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all',
                          unlocked ? 'hover:bg-muted/80 cursor-pointer' : 'opacity-50 cursor-not-allowed',
                          selected && 'bg-primary/10 ring-2 ring-primary/40'
                        )}
                        whileTap={unlocked ? { scale: 0.95 } : undefined}
                      >
                        <div className={cn(
                          'w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center relative',
                          frame.gradient,
                          frame.borderStyle,
                        )}>
                          <div className="w-7 h-7 rounded-full bg-card flex items-center justify-center">
                            {!unlocked ? (
                              <Lock className="w-3 h-3 text-muted-foreground" />
                            ) : selected ? (
                              <Check className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-muted" />
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-1">
                          {frame.name}
                        </span>
                        {!unlocked && (
                          <span className="text-[8px] text-muted-foreground/60 text-center leading-tight">
                            {frame.description}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Upload option */}
                  <button
                    onClick={onUploadClick}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-primary/30 text-sm text-primary font-medium hover:bg-primary/5 transition-colors"
                  >
                    Upload Custom Photo
                  </button>
                  
                  {/* Preset grid */}
                  <div className="grid grid-cols-6 gap-2.5">
                    {PRESET_AVATARS.map((emoji) => {
                      const selected = currentPresetAvatar === emoji;
                      return (
                        <motion.button
                          key={emoji}
                          onClick={() => onSelectPresetAvatar(emoji)}
                          className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all hover:bg-muted/80',
                            selected
                              ? 'bg-primary/15 ring-2 ring-primary/40 scale-110'
                              : 'bg-muted/40'
                          )}
                          whileTap={{ scale: 0.9 }}
                        >
                          {emoji}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Reusable avatar display component with frame
interface AvatarWithFrameProps {
  avatarUrl: string | null;
  presetAvatar: string | null;
  frameId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({
  avatarUrl,
  presetAvatar,
  frameId,
  size = 'md',
  className,
}) => {
  const frame = AVATAR_FRAMES.find(f => f.id === frameId) || AVATAR_FRAMES[0];

  const sizeClasses = {
    sm: { outer: 'w-10 h-10', inner: 'w-8 h-8', icon: 'w-4 h-4', emoji: 'text-lg', ring: 'ring-2' },
    md: { outer: 'w-16 h-16', inner: 'w-[52px] h-[52px]', icon: 'w-6 h-6', emoji: 'text-2xl', ring: 'ring-[3px]' },
    lg: { outer: 'w-24 h-24', inner: 'w-[78px] h-[78px]', icon: 'w-10 h-10', emoji: 'text-4xl', ring: 'ring-4' },
  };

  const s = sizeClasses[size];

  return (
    <div className={cn('relative', className)}>
      {/* Outer glow for non-default frames */}
      {frameId !== 'default' && (
        <div className={cn(
          'absolute inset-0 rounded-full bg-gradient-to-br opacity-30 blur-md',
          frame.gradient
        )} />
      )}
      {/* Frame ring */}
      <div className={cn(
        'relative rounded-full bg-gradient-to-br p-[3px] shadow-lg',
        frame.gradient,
        s.outer,
        size === 'lg' && 'p-1',
      )}>
        {/* Inner avatar */}
        <div className={cn(
          'w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden'
        )}>
          {avatarUrl && !presetAvatar ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : presetAvatar ? (
            <span className={s.emoji}>{presetAvatar}</span>
          ) : (
            <div className={cn('w-full h-full rounded-full bg-gradient-to-br flex items-center justify-center', frame.gradient)}>
              <User className="text-white" style={{ width: size === 'lg' ? '2.5rem' : size === 'md' ? '1.5rem' : '1rem', height: size === 'lg' ? '2.5rem' : size === 'md' ? '1.5rem' : '1rem' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarCustomizer;
