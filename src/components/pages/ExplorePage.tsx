import React from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, ShoppingBag, Award, Target, 
  MessageCircle, Zap, GraduationCap, Compass, ChevronRight
} from 'lucide-react';

interface ExplorePageProps {
  onNavigate: (page: string) => void;
}

const EXPLORE_ITEMS = [
  { id: 'progressdashboard', label: 'Progress Dashboard', description: 'AI brain analysis & learning stats', icon: Target, gradient: 'from-indigo-500 to-blue-500', emoji: '📊' },
  { id: 'arena', label: 'Arena', description: 'Daily challenge — compete & win coins', icon: Trophy, gradient: 'from-amber-500 to-orange-500', emoji: '🏆' },
  { id: 'shop', label: 'Shop', description: 'Spend coins on themes & power-ups', icon: ShoppingBag, gradient: 'from-emerald-500 to-green-500', emoji: '🛍️' },
  { id: 'certificates', label: 'Certificates', description: 'Download your earned certificates', icon: Award, gradient: 'from-blue-500 to-cyan-500', emoji: '🎓' },
  { id: 'learningpath', label: 'Learning Paths', description: 'AI-powered structured learning paths', icon: GraduationCap, gradient: 'from-violet-500 to-purple-500', emoji: '📚' },
  { id: 'purposelens', label: 'Identity', description: 'Set context: JEE, NEET, School & more', icon: Target, gradient: 'from-pink-500 to-rose-500', emoji: '🎯' },
  { id: 'explainback', label: 'Test Yourself', description: 'Explain concepts to check understanding', icon: MessageCircle, gradient: 'from-teal-500 to-cyan-500', emoji: '🧠' },
  { id: 'ekakshar', label: 'Compress Any Idea', description: 'Flashcard-style one-word summaries', icon: Zap, gradient: 'from-yellow-500 to-amber-500', emoji: '⚡' },
];

const ExplorePage: React.FC<ExplorePageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="text-center pt-2"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20 mb-3">
          <Compass className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-primary">Explore</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">Discover Features</h1>
        <p className="text-xs text-muted-foreground mt-1">All your learning tools in one place</p>
      </motion.div>

      {/* Featured: Arena */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="w-full relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-orange-500 text-white text-left group"
        onClick={() => onNavigate('arena')}
        whileTap={{ scale: 0.98 }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏆</span>
            <span className="text-lg font-bold">Arena</span>
          </div>
          <p className="text-sm opacity-90">Daily challenge — compete with learners, win coins!</p>
        </div>
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute right-8 -top-4 w-16 h-16 rounded-full bg-white/5" />
      </motion.button>

      {/* Grid Items */}
      <div className="grid grid-cols-2 gap-3">
        {EXPLORE_ITEMS.slice(1).map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.04 }}
            className="relative overflow-hidden p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all text-left group active:scale-[0.98]"
            onClick={() => onNavigate(item.id)}
            whileTap={{ scale: 0.97 }}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-xl mb-2.5 shadow-md`}>
              {item.emoji}
            </div>
            <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
              {item.label}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ExplorePage;
