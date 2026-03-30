import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Gift, Sparkles, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AVATAR_FRAMES } from '@/components/AvatarCustomizer';

interface UnlockedAchievement {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface AchievementCelebrationProps {
  achievements: UnlockedAchievement[];
  onClose: () => void;
  onClaimFrame?: (frameId: string) => void;
  totalQuestions: number;
  currentStreak: number;
}

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96E6A1', '#DDA0DD', '#F7DC6F'];

const ConfettiPiece: React.FC<{ index: number }> = ({ index }) => {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 0.5;
  const duration = 1.5 + Math.random();
  const rotation = Math.random() * 360;
  const size = 6 + Math.random() * 6;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${left}%`,
        top: -10,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: index % 3 === 0 ? '50%' : '2px',
      }}
      initial={{ y: -20, rotate: 0, opacity: 1 }}
      animate={{
        y: 500,
        rotate: rotation + 720,
        opacity: [1, 1, 0],
        x: [0, (Math.random() - 0.5) * 100],
      }}
      transition={{
        duration,
        delay,
        ease: 'easeOut',
      }}
    />
  );
};

const AchievementCelebration: React.FC<AchievementCelebrationProps> = ({
  achievements,
  onClose,
  onClaimFrame,
  totalQuestions,
  currentStreak,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());

  if (achievements.length === 0) return null;

  const current = achievements[currentIndex];

  // Find a giftable frame for this achievement
  const getGiftFrame = () => {
    const eligibleFrames = AVATAR_FRAMES.filter(f => {
      if (f.unlockType === 'default') return false;
      if (f.unlockType === 'questions') return totalQuestions >= f.unlockValue;
      if (f.unlockType === 'streak') return currentStreak >= f.unlockValue;
      return false;
    });
    // Return the highest unlocked frame not yet claimed
    return eligibleFrames.length > 0 ? eligibleFrames[eligibleFrames.length - 1] : null;
  };

  const giftFrame = getGiftFrame();

  const handleClaim = () => {
    if (giftFrame && onClaimFrame) {
      onClaimFrame(giftFrame.id);
      setClaimed(prev => new Set(prev).add(current.id));
    }
  };

  const handleNext = () => {
    if (currentIndex < achievements.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiPiece key={i} index={i} />
          ))}
        </div>

        <motion.div
          className="relative w-full max-w-sm bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
          initial={{ scale: 0.5, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-muted/80 hover:bg-muted z-10"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Glowing header */}
          <div className="relative bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-orange-500/20 px-6 pt-8 pb-6 text-center">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-transparent to-amber-400/10"
              animate={{ x: [-200, 200] }}
              transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
            />
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.3 }}
              className="text-6xl mb-3"
            >
              {current.icon}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-bold tracking-widest uppercase text-amber-600 dark:text-amber-400">
                  Achievement Unlocked!
                </span>
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground">{current.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{current.description}</p>
            </motion.div>
          </div>

          {/* Gift section */}
          <div className="px-6 py-5 space-y-4">
            {/* Certificate notification */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20"
            >
              <Award className="w-8 h-8 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Certificate Earned! 🎓</p>
                <p className="text-xs text-muted-foreground">
                  A certificate has been auto-generated. View it in your Certificates section.
                </p>
              </div>
            </motion.div>

            {/* Frame gift */}
            {giftFrame && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
                className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Gift className="w-6 h-6 text-amber-500" />
                  <div>
                    <p className="text-sm font-bold text-foreground">🎁 Frame Gift!</p>
                    <p className="text-xs text-muted-foreground">
                      You've unlocked the <span className="font-semibold text-amber-600 dark:text-amber-400">{giftFrame.name}</span> avatar frame!
                    </p>
                  </div>
                </div>

                {/* Frame preview */}
                <div className="flex items-center justify-center mb-3">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${giftFrame.gradient} p-[3px]`}>
                    <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-2xl">
                      🧑‍🎓
                    </div>
                  </div>
                </div>

                {claimed.has(current.id) ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-emerald-500 font-medium">
                    <Check className="w-4 h-4" />
                    Frame Applied!
                  </div>
                ) : (
                  <Button
                    onClick={handleClaim}
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold"
                    size="sm"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Claim Frame
                  </Button>
                )}
              </motion.div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              {achievements.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1} of {achievements.length}
                </span>
              )}
              <Button
                onClick={handleNext}
                variant="outline"
                size="sm"
                className="ml-auto"
              >
                {currentIndex < achievements.length - 1 ? 'Next' : 'Done'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AchievementCelebration;
