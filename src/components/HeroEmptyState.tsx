import React from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';

interface HeroEmptyStateProps {
  onPromptClick: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  {
    emoji: '🧬',
    text: 'Explain DNA replication step by step',
    tag: 'Class 12 Biology',
    tagColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  },
  {
    emoji: '⚗️',
    text: 'Why do atoms form chemical bonds?',
    tag: 'Chemistry',
    tagColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  },
  {
    emoji: '📐',
    text: 'Prove Pythagoras theorem with examples',
    tag: 'Class 10 Math',
    tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
  {
    emoji: '💡',
    text: 'How does an electric motor work?',
    tag: 'Physics',
    tagColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  {
    emoji: '🧮',
    text: 'What is integration and why do we need it?',
    tag: 'JEE Math',
    tagColor: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  },
  {
    emoji: '🫀',
    text: 'Explain the human circulatory system',
    tag: 'NEET Biology',
    tagColor: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  },
];

const HeroEmptyState: React.FC<HeroEmptyStateProps> = ({ onPromptClick }) => {
  return (
    <div className="flex flex-col items-center justify-center py-10 md:py-16 lg:py-20 animate-in fade-in duration-300 max-w-2xl mx-auto w-full">
      {/* Hero Text */}
      <div className="text-center mb-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 border border-primary/15 mb-5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-primary tracking-wide">MiniMind AI</span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-foreground mb-3 leading-tight">
          What do you want to
          <br />
          <span className="gradient-text">learn today?</span>
        </h1>

        <p className="text-muted-foreground text-sm sm:text-base max-w-sm mx-auto leading-relaxed">
          4 AI tutors explain any topic your way — from ELI5 to expert.
        </p>
      </div>

      {/* Prompt Grid */}
      <div className="w-full animate-in slide-in-from-bottom-6 duration-700 delay-150">
        <p className="text-xs font-medium text-muted-foreground mb-3 text-center tracking-wide uppercase">
          Popular topics
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-1">
          {SUGGESTED_PROMPTS.map((prompt, index) => (
            <button
              key={prompt.text}
              onClick={() => onPromptClick(prompt.text)}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200 text-left active:scale-[0.98]"
              aria-label={`Ask: ${prompt.text}`}
            >
              <span className="text-xl flex-shrink-0" role="img" aria-hidden="true">
                {prompt.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {prompt.text}
                </p>
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${prompt.tagColor}`}>
                  {prompt.tag}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Trust signal */}
      <p className="text-[10px] text-muted-foreground/50 mt-6 text-center tracking-wide">
        Trusted by 10,000+ students • 4 explanation styles • Exam-focused
      </p>
    </div>
  );
};

export default HeroEmptyState;
