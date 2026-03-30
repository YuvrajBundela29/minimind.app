import React, { useState, useCallback, useEffect, Suspense, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import MobileHeader from '@/components/MobileHeader';
import BottomInputBar from '@/components/BottomInputBar';
import ModeCard from '@/components/ModeCard';
import SideMenu from '@/components/SideMenu';
import RefinePromptDialog from '@/components/RefinePromptDialog';
import QuestionLimitBanner from '@/components/QuestionLimitBanner';
import EarlyAccessGate from '@/components/EarlyAccessGate';
import HeroEmptyState from '@/components/HeroEmptyState';
import PageLoadingFallback from '@/components/PageLoadingFallback';
import PurposeLensOnboarding from '@/components/PurposeLensOnboarding';
import { modes, ModeKey, LanguageKey, NavigationId, PurposeLensKey } from '@/config/minimind';
import AIService from '@/services/aiService';
import { apiCache } from '@/services/apiCache';
import speechService from '@/services/speechService';
import { downloadPDF, sharePDF, SharePlatform } from '@/utils/pdfGenerator';
import { supabase } from '@/integrations/supabase/client';
import { logUsage } from '@/services/usageLogger';
import CreditExhaustionModal from '@/components/CreditExhaustionModal';
// Session persistence key
const SESSION_STORAGE_KEY = 'minimind-current-session';
import { useSubscription, CREDIT_COSTS, CREDIT_LIMITS } from '@/contexts/SubscriptionContext';
import { useEarlyAccess } from '@/contexts/EarlyAccessContext';
import { useNotificationEngine } from '@/hooks/useNotificationEngine';
import StudyBuddy from '@/components/StudyBuddy';
import CoinBadge from '@/components/CoinBadge';
import { useCoins } from '@/hooks/useCoins';

// Lazy load heavy page components
const EkaksharPage = React.lazy(() => import('@/components/pages/EkaksharPage'));
const HistoryPage = React.lazy(() => import('@/components/pages/HistoryPage'));
const SettingsPage = React.lazy(() => import('@/components/pages/SettingsPage'));
const AuthPage = React.lazy(() => import('@/components/pages/AuthPage'));
const ProfilePage = React.lazy(() => import('@/components/pages/ProfilePage'));
const SubscriptionPage = React.lazy(() => import('@/components/pages/SubscriptionPage'));
const LearningPathPage = React.lazy(() => import('@/components/pages/LearningPathPage'));
const ExplainBackPage = React.lazy(() => import('@/components/pages/ExplainBackPage'));
const FullscreenMode = React.lazy(() => import('@/components/FullscreenMode'));
const OnboardingGuide = React.lazy(() => import('@/components/OnboardingGuide'));
const PurposeLensPage = React.lazy(() => import('@/components/pages/PurposeLensPage'));
const NotesPage = React.lazy(() => import('@/components/pages/NotesPage'));
const TermsOfServicePage = React.lazy(() => import('@/components/pages/TermsOfServicePage'));
const PrivacyPolicyPage = React.lazy(() => import('@/components/pages/PrivacyPolicyPage'));
const RefundPolicyPage = React.lazy(() => import('@/components/pages/RefundPolicyPage'));
const ArenaPage = React.lazy(() => import('@/components/pages/ArenaPage'));
const ShopPage = React.lazy(() => import('@/components/pages/ShopPage'));
const CertificatePage = React.lazy(() => import('@/components/pages/CertificatePage'));
const GuruDashboardPage = React.lazy(() => import('@/components/pages/GuruDashboardPage'));
const ExplorePage = React.lazy(() => import('@/components/pages/ExplorePage'));

// Types for history
export interface HistoryItem {
  id: string;
  question: string;
  answers: Record<ModeKey, string>;
  timestamp: Date;
  language: LanguageKey;
}

// Default welcome messages for each mode
const defaultAnswers: Record<ModeKey, string | null> = {
  beginner: null,
  thinker: null,
  story: null,
  mastery: null,
};

// Memoized ModeCard to prevent unnecessary re-renders
const MemoizedModeCard = memo(ModeCard, (prev, next) => {
  return (
    prev.answer === next.answer &&
    prev.isLoading === next.isLoading &&
    prev.modeKey === next.modeKey &&
    prev.isSpeaking === next.isSpeaking &&
    prev.chatInputValue === next.chatInputValue &&
    prev.currentQuestion === next.currentQuestion
  );
});

// Priority order for staggered API loading
const MODE_PRIORITY: ModeKey[] = ['beginner', 'thinker', 'story', 'mastery'];
const STAGGER_DELAY = 300; // ms between API calls

const Index = () => {
  const { isEarlyAccess } = useEarlyAccess();
  useNotificationEngine();
  const { checkDailyLoginReward } = useCoins();
  
  // Award daily login coins
  useEffect(() => {
    checkDailyLoginReward().then(coins => {
      if (coins > 0) {
        toast.success(`🪙 +${coins} coins for daily login!`);
      }
    });
  }, [checkDailyLoginReward]);
  
  // AbortController for cancelling pending requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // State Management
  const [currentPage, setCurrentPage] = useState<NavigationId | 'auth' | 'terms' | 'privacy' | 'refund' | 'arena' | 'shop' | 'certificates' | 'gurudashboard' | 'explore'>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey>('en');
  const [hasAskedQuestion, setHasAskedQuestion] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Question & Answers
  const [question, setQuestion] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [answers, setAnswers] = useState<Record<ModeKey, string | null>>(defaultAnswers);
  const [loadingModes, setLoadingModes] = useState<Record<ModeKey, boolean>>({
    beginner: false, thinker: false, story: false, mastery: false,
  });
  
  // Refining state
  const [isRefining, setIsRefining] = useState(false);
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [refinedPrompt, setRefinedPrompt] = useState('');
  
  // Fullscreen state
  const [fullscreenMode, setFullscreenMode] = useState<ModeKey | null>(null);
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPurposeLensOnboarding, setShowPurposeLensOnboarding] = useState(false);
  
  // Purpose Lens state
  const [purposeLens, setPurposeLens] = useState<PurposeLensKey>('general');
  const [customLensPrompt, setCustomLensPrompt] = useState('');
  
  // Chat inputs per mode
  const [chatInputs, setChatInputs] = useState<Record<ModeKey, string>>({
    beginner: '', thinker: '', story: '', mastery: '',
  });
  
  // Chat history per mode
  const [chatHistories, setChatHistories] = useState<Record<ModeKey, Array<{ role: 'user' | 'assistant'; content: string }>>>({
    beginner: [], thinker: [], story: [], mastery: [],
  });
  
  // Speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState<SpeechSynthesisUtterance | null>(null);
  
  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Progress stats
  const [stats, setStats] = useState({
    totalQuestions: 0, todayQuestions: 0, favoriteMode: 'beginner' as ModeKey, streak: 0,
  });
  
  // Credit exhaustion modal
  const [showCreditExhaustion, setShowCreditExhaustion] = useState(false);
  
  // Back button handler ref
  const backPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canExitRef = useRef(false);
  
  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);
  
  // Register service worker in production only.
  // In dev, unregister stale workers to prevent cached Vite deps causing duplicate-React hook errors.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (import.meta.env.DEV) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {
          // SW cleanup failed silently
        });
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed silently
    });
  }, []);
  
  // Load saved data and auth
  useEffect(() => {
    const savedTheme = localStorage.getItem('minimind-theme') as 'light' | 'dark' || 'light';
    const savedLanguage = localStorage.getItem('minimind-language') as LanguageKey || 'en';
    const savedHistory = localStorage.getItem('minimind-history');
    const savedStats = localStorage.getItem('minimind-stats');
    const hasSeenOnboarding = localStorage.getItem('minimind-onboarding-seen');
    const savedPurposeLens = localStorage.getItem('minimind-purpose-lens') as PurposeLensKey;
    const savedCustomLensPrompt = localStorage.getItem('minimind-custom-lens-prompt');
    
    setTheme(savedTheme);
    setSelectedLanguage(savedLanguage);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    
    // Load purpose lens
    if (savedPurposeLens) {
      setPurposeLens(savedPurposeLens);
      if (savedCustomLensPrompt) {
        setCustomLensPrompt(savedCustomLensPrompt);
      }
    } else {
      // Show purpose lens onboarding for first-time users
      setShowPurposeLensOnboarding(true);
    }
    
    // Show app onboarding for first-time users
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
    
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed.map((item: any) => ({ ...item, timestamp: new Date(item.timestamp) })));
      } catch (e) { console.error('Error parsing history:', e); }
    }
    
    if (savedStats) {
      try { setStats(JSON.parse(savedStats)); } catch (e) { console.error('Error parsing stats:', e); }
    }
    
    // Restore session from localStorage (persistence on refresh)
    const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        // Only restore if session is less than 24 hours old
        if (session.timestamp && Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
          if (session.currentQuestion) setCurrentQuestion(session.currentQuestion);
          if (session.answers) setAnswers(session.answers);
          if (session.hasAskedQuestion) setHasAskedQuestion(session.hasAskedQuestion);
          if (session.chatHistories) setChatHistories(session.chatHistories);
        } else {
          // Session expired, clear it
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } catch (e) { console.error('Error restoring session:', e); }
    }

    // Auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setIsCheckingAuth(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsCheckingAuth(false);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  const handleCloseOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem('minimind-onboarding-seen', 'true');
  }, []);
  
  useEffect(() => { if (history.length > 0) localStorage.setItem('minimind-history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('minimind-stats', JSON.stringify(stats)); }, [stats]);
  useEffect(() => { localStorage.setItem('minimind-language', selectedLanguage); }, [selectedLanguage]);
  
  // Persist session state to localStorage
  useEffect(() => {
    if (hasAskedQuestion && currentQuestion) {
      const sessionData = {
        currentQuestion,
        answers,
        hasAskedQuestion,
        chatHistories,
        timestamp: Date.now(),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    }
  }, [currentQuestion, answers, hasAskedQuestion, chatHistories]);
  
  // Hardware back button handler (double-back to exit)
  useEffect(() => {
    // Push initial history state
    if (window.history.state === null) {
      window.history.pushState({ page: 'home' }, '');
    }
    
    const handlePopState = (event: PopStateEvent) => {
      // If on a subpage, navigate back to home
      if (currentPage !== 'home') {
        event.preventDefault();
        window.history.pushState({ page: 'home' }, '');
        setCurrentPage('home');
        return;
      }
      
      // If has answers, clear them first
      if (hasAskedQuestion) {
        event.preventDefault();
        window.history.pushState({ page: 'home' }, '');
        setAnswers(defaultAnswers);
        setCurrentQuestion('');
        setHasAskedQuestion(false);
        setChatHistories({
          beginner: [], thinker: [], story: [], mastery: [],
        });
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }
      
      // On home with no answers - implement double-back to exit
      if (canExitRef.current) {
        // Allow exit - don't prevent default
        return;
      }
      
      // First back press - show toast and wait for second
      event.preventDefault();
      window.history.pushState({ page: 'home' }, '');
      toast.info('Press back again to exit', { duration: 2000 });
      canExitRef.current = true;
      
      // Reset after 2 seconds
      if (backPressTimeoutRef.current) {
        clearTimeout(backPressTimeoutRef.current);
      }
      backPressTimeoutRef.current = setTimeout(() => {
        canExitRef.current = false;
      }, 2000);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (backPressTimeoutRef.current) {
        clearTimeout(backPressTimeoutRef.current);
      }
    };
  }, [currentPage, hasAskedQuestion]);
  
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('minimind-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }, [theme]);
  
  // Handle prompt refining with dialog
  const handleRefinePrompt = useCallback(async () => {
    if (!question.trim() || isRefining) return;
    
    setOriginalPrompt(question);
    setIsRefining(true);
    try {
      const refined = await AIService.refinePrompt(question, selectedLanguage);
      setRefinedPrompt(refined);
      setShowRefineDialog(true);
    } catch (error) {
      console.error('Error refining prompt:', error);
      toast.error('Failed to refine prompt');
    } finally {
      setIsRefining(false);
    }
  }, [question, selectedLanguage, isRefining]);

  const handleAcceptRefinedPrompt = () => {
    setQuestion(refinedPrompt);
    setShowRefineDialog(false);
    toast.success('✨ Using refined prompt!');
  };

  const handleReRefine = async () => {
    setIsRefining(true);
    try {
      const refined = await AIService.refinePrompt(refinedPrompt, selectedLanguage);
      setRefinedPrompt(refined);
    } catch (error) {
      toast.error('Failed to re-refine prompt');
    } finally {
      setIsRefining(false);
    }
  };
  
  // Staggered API loading with caching and purpose lens
  const fetchModeExplanation = useCallback(async (
    questionText: string,
    modeKey: ModeKey,
    language: LanguageKey
  ): Promise<{ text: string; credits_remaining: number | null; daily_remaining: number | null; monthly_remaining: number | null }> => {
    // Check cache first (include purpose lens in cache key)
    const cacheKey = apiCache.generateKey(questionText, modeKey, `${language}-${purposeLens}`);
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return { text: cached, credits_remaining: null, daily_remaining: null, monthly_remaining: null };
    }
    
    // Fetch from API with purpose lens
    const result = await AIService.getExplanation(questionText, modeKey, language, {
      purposeLens,
      customLensPrompt: purposeLens === 'custom' ? customLensPrompt : undefined
    });
    
    // Cache the response text
    apiCache.set(cacheKey, result.response);
    
    return { text: result.response, credits_remaining: result.credits_remaining, daily_remaining: result.daily_remaining, monthly_remaining: result.monthly_remaining };
  }, [purposeLens, customLensPrompt]);
  
  // Handle question submission with staggered loading
  const { useCredits, hasCredits, getCredits, showUpgradePrompt, tier, syncCreditsFromServer } = useSubscription();

  const handleSubmit = useCallback(async () => {
    if (!question.trim()) return;
    
    // Check if user has at least 1 credit (beginner mode cost)
    if (!hasCredits(1)) {
      setShowCreditExhaustion(true);
      return;
    }
    
    // Cancel any pending requests
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    const questionText = question;
    setCurrentQuestion(questionText);
    setHasAskedQuestion(true);
    setAnswers({ beginner: null, thinker: null, story: null, mastery: null });
    setLoadingModes({ beginner: true, thinker: true, story: true, mastery: true });
    
    setChatHistories({
      beginner: [{ role: 'user', content: questionText }],
      thinker: [{ role: 'user', content: questionText }],
      story: [{ role: 'user', content: questionText }],
      mastery: [{ role: 'user', content: questionText }],
    });
    
    const newAnswers: Record<ModeKey, string> = {} as Record<ModeKey, string>;
    
    // Staggered loading - load modes in priority order
    for (let i = 0; i < MODE_PRIORITY.length; i++) {
      const modeKey = MODE_PRIORITY[i];
      const cost = CREDIT_COSTS[modeKey] || 1;
      
      // Check credits before each mode
      if (!hasCredits(cost)) {
        const skipMsg = `⚠️ Not enough credits for ${modeKey} mode (needs ${cost} credits). Top up to unlock!`;
        setAnswers(prev => ({ ...prev, [modeKey]: skipMsg }));
        newAnswers[modeKey] = skipMsg;
        setLoadingModes(prev => ({ ...prev, [modeKey]: false }));
        // Show exhaustion modal on first skip
        setShowCreditExhaustion(true);
        continue;
      }
      
      // Start this mode
      try {
        const result = await fetchModeExplanation(questionText, modeKey, selectedLanguage);
        
        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) return;
        
        // Sync credits from server response (server already deducted)
        if (result.credits_remaining !== null) {
          syncCreditsFromServer(result.credits_remaining, result.daily_remaining, result.monthly_remaining);
        }
        
        // Check milestone notifications
        const remaining = getCredits();
        const limits = CREDIT_LIMITS[tier];
        const totalLimit = limits.daily + limits.monthly;
        if (totalLimit > 0 && remaining.total > 0) {
          const pct = (remaining.total / totalLimit) * 100;
          const milestones = JSON.parse(sessionStorage.getItem('minimind-credit-milestones') || '{}');
          
          if (pct <= 10 && !milestones['10']) {
            toast.warning(`⚡ Only ${remaining.total} credits left this period`, { duration: 5000, action: { label: 'Upgrade', onClick: () => setCurrentPage('subscription') } });
            milestones['10'] = true;
            sessionStorage.setItem('minimind-credit-milestones', JSON.stringify(milestones));
          } else if (pct <= 20 && !milestones['20']) {
            toast.warning(`⚡ Running low — ${remaining.total} credits left`, { duration: 5000, action: { label: 'View plans', onClick: () => setCurrentPage('subscription') } });
            milestones['20'] = true;
            sessionStorage.setItem('minimind-credit-milestones', JSON.stringify(milestones));
          } else if (pct <= 50 && !milestones['50']) {
            toast.info(`⚡ Halfway through your credits this period`, { duration: 3000 });
            milestones['50'] = true;
            sessionStorage.setItem('minimind-credit-milestones', JSON.stringify(milestones));
          }
        }
        
        setAnswers(prev => ({ ...prev, [modeKey]: result.text }));
        newAnswers[modeKey] = result.text;
        setChatHistories(prev => ({
          ...prev,
          [modeKey]: [...prev[modeKey], { role: 'assistant', content: result.text }]
        }));
        
        // Fire-and-forget usage log
        logUsage({
          queryText: questionText,
          mode: modeKey,
          language: selectedLanguage,
          responseLength: result.text.length,
        });
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        const errorMsg = 'Sorry, something went wrong. Please try again.';
        setAnswers(prev => ({ ...prev, [modeKey]: errorMsg }));
        newAnswers[modeKey] = errorMsg;
      } finally {
        setLoadingModes(prev => ({ ...prev, [modeKey]: false }));
      }
      
      // Small delay before next mode (except for last one)
      if (i < MODE_PRIORITY.length - 1) {
        await new Promise(resolve => setTimeout(resolve, STAGGER_DELAY));
      }
    }
    
    // Save to history
    const historyItem: HistoryItem = {
      id: Date.now().toString(),
      question: questionText,
      answers: newAnswers,
      timestamp: new Date(),
      language: selectedLanguage
    };
    setHistory(prev => [historyItem, ...prev.slice(0, 49)]);
    setStats(prev => ({
      ...prev,
      totalQuestions: prev.totalQuestions + 1,
      todayQuestions: prev.todayQuestions + 1
    }));
    setQuestion('');
  }, [question, selectedLanguage, fetchModeExplanation, hasCredits, useCredits, getCredits, showUpgradePrompt]);
  
  const handleVoiceInput = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedLanguage === 'en' ? 'en-US' : `${selectedLanguage}-IN`;
      recognition.onstart = () => { toast.info('🎤 Listening... Speak now!'); };
      recognition.onresult = (event: any) => { setQuestion(event.results[0][0].transcript); toast.success('✅ Voice input captured!'); };
      recognition.onerror = (event: any) => { toast.error(`Voice input error: ${event.error}`); };
      recognition.start();
    } else { toast.error('Voice input not supported in your browser'); }
  }, [selectedLanguage]);
  
  const handleSpeak = useCallback(async (text: string, mode: string) => {
    if (!text || text.includes('Ready to explain')) {
      toast.error('No content to speak');
      return;
    }

    if (isSpeaking && currentSpeech) {
      speechService.stop();
      setIsSpeaking(false);
      setCurrentSpeech(null);
      return;
    }
    
    try {
      const utterance = await speechService.speak(text, selectedLanguage, {
        rate: 0.9,
        pitch: 1,
        onStart: () => setIsSpeaking(true),
        onEnd: () => {
          setIsSpeaking(false);
          setCurrentSpeech(null);
        },
        onError: (error) => {
          setIsSpeaking(false);
          setCurrentSpeech(null);
          console.error('Speech error:', error);
          toast.error('Speech not available. Try a different browser.');
        },
      });
      if (utterance) {
        setCurrentSpeech(utterance);
      }
    } catch (error) {
      console.error('Speech error:', error);
      toast.error('Speech synthesis not available');
    }
  }, [isSpeaking, currentSpeech, selectedLanguage]);
  
  const handleCopy = useCallback((text: string) => { navigator.clipboard.writeText(text); toast.success('Copied to clipboard!'); }, []);
  
  const handleDownload = useCallback((text: string, mode: string, q: string) => {
    downloadPDF(text, mode as ModeKey, q || currentQuestion);
    toast.success('PDF downloaded!');
  }, [currentQuestion]);
  
  const handleShare = useCallback(async (text: string, mode: string, q: string, platform: SharePlatform = 'native') => {
    const shared = await sharePDF(text, mode as ModeKey, q || currentQuestion, platform);
    if (shared) {
      const messages: Record<SharePlatform, string> = {
        whatsapp: 'Opening WhatsApp...',
        email: 'Opening email...',
        copy: 'Copied to clipboard!',
        download: 'PDF downloaded!',
        native: 'Shared successfully!',
      };
      toast.success(messages[platform]);
    }
  }, [currentQuestion]);
  
  const handleGetOneWord = useCallback(async (mode: string) => {
    const answer = answers[mode as ModeKey];
    if (!answer) return;
    setCurrentPage('ekakshar');
    sessionStorage.setItem('ekakshar-auto-question', currentQuestion);
  }, [answers, currentQuestion]);
  
  const handleChatSubmit = useCallback(async (message: string, mode: string) => {
    const modeKey = mode as ModeKey;
    if (!message.trim()) return;
    
    const cost = CREDIT_COSTS[modeKey] || 1;
    if (!hasCredits(cost)) {
      setShowCreditExhaustion(true);
      return;
    }
    
    setChatHistories(prev => ({ ...prev, [modeKey]: [...prev[modeKey], { role: 'user', content: message }] }));
    setLoadingModes(prev => ({ ...prev, [modeKey]: true }));
    try {
      const result = await AIService.continueConversation(
        [...chatHistories[modeKey], { role: 'user', content: message }], 
        modeKey, 
        selectedLanguage,
        { purposeLens, customLensPrompt: purposeLens === 'custom' ? customLensPrompt : undefined }
      );
      
      // Sync credits from server (server already deducted)
      if (result.credits_remaining !== null) {
        syncCreditsFromServer(result.credits_remaining, result.daily_remaining, result.monthly_remaining);
      }
      
      const remaining = getCredits();
      if (remaining.total > 0 && remaining.total <= 5) {
        toast.warning(`⚡ Running low on credits! ${remaining.total} remaining`);
      }
      
      setAnswers(prev => ({ ...prev, [modeKey]: result.response }));
      setChatHistories(prev => ({ ...prev, [modeKey]: [...prev[modeKey], { role: 'assistant', content: result.response }] }));
    } catch (error) { toast.error('Failed to get response'); }
    finally { setLoadingModes(prev => ({ ...prev, [modeKey]: false })); }
    setChatInputs(prev => ({ ...prev, [modeKey]: '' }));
  }, [chatHistories, selectedLanguage, purposeLens, customLensPrompt, hasCredits, useCredits, getCredits, showUpgradePrompt]);
  
  const handleChatInputChange = useCallback((mode: string, value: string) => { setChatInputs(prev => ({ ...prev, [mode as ModeKey]: value })); }, []);
  const handleLoadHistory = useCallback((item: HistoryItem) => { setAnswers(item.answers); setCurrentQuestion(item.question); setHasAskedQuestion(true); setCurrentPage('home'); toast.success('Loaded from history!'); }, []);
  const handleClearHistory = useCallback(() => { setHistory([]); localStorage.removeItem('minimind-history'); toast.success('History cleared!'); }, []);
  const handleFullscreen = useCallback((mode: string) => { setFullscreenMode(mode as ModeKey); }, []);
  const handleSignOut = async () => { 
    await supabase.auth.signOut(); 
    setUser(null); 
    // Clear all localStorage data on logout for security
    const keysToRemove = [
      'minimind-history', 'minimind-stats', 'minimind-learning-paths',
      'minimind-purpose-lens', 'minimind-custom-lens-prompt',
      'minimind-ekakshar-history', 'minimind-explainback-history'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    toast.success('Signed out!'); 
  };
  
  // Purpose Lens handlers
  const handlePurposeLensSelect = useCallback(async (lens: PurposeLensKey, customPrompt?: string) => {
    setPurposeLens(lens);
    localStorage.setItem('minimind-purpose-lens', lens);
    
    if (customPrompt) {
      setCustomLensPrompt(customPrompt);
      localStorage.setItem('minimind-custom-lens-prompt', customPrompt);
    } else {
      setCustomLensPrompt('');
      localStorage.removeItem('minimind-custom-lens-prompt');
    }
    
    // Save to database if user is logged in
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await supabase
        .from('user_settings')
        .update({ 
          purpose_lens: lens, 
          custom_lens_prompt: customPrompt || null 
        })
        .eq('user_id', currentUser.id);
    }
    
    setShowPurposeLensOnboarding(false);
    toast.success(`Switched to ${lens === 'custom' ? 'Custom' : lens.charAt(0).toUpperCase() + lens.slice(1)} mode!`);
  }, []);

  // New Chat handler - reset everything to fresh home screen
  const handleNewChat = useCallback(() => {
    abortControllerRef.current?.abort();
    speechService.stop();
    setIsSpeaking(false);
    setCurrentSpeech(null);
    setAnswers(defaultAnswers);
    setCurrentQuestion('');
    setHasAskedQuestion(false);
    setChatHistories({ beginner: [], thinker: [], story: [], mastery: [] });
    setChatInputs({ beginner: '', thinker: '', story: '', mastery: '' });
    setLoadingModes({ beginner: false, thinker: false, story: false, mastery: false });
    setQuestion('');
    setCurrentPage('home');
    localStorage.removeItem(SESSION_STORAGE_KEY);
    toast.success('✨ Starting fresh!');
  }, []);

  const isAnyLoading = Object.values(loadingModes).some(l => l);

  // Staggered prompt click handler
  const handlePromptClick = useCallback(async (prompt: string) => {
    // Cancel any pending requests
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    setQuestion('');
    setCurrentQuestion(prompt);
    setHasAskedQuestion(true);
    setAnswers({ beginner: null, thinker: null, story: null, mastery: null });
    setLoadingModes({ beginner: true, thinker: true, story: true, mastery: true });
    
    setChatHistories({
      beginner: [{ role: 'user', content: prompt }],
      thinker: [{ role: 'user', content: prompt }],
      story: [{ role: 'user', content: prompt }],
      mastery: [{ role: 'user', content: prompt }],
    });
    
    const newAnswers: Record<ModeKey, string> = {} as Record<ModeKey, string>;
    
    // Staggered loading
    for (let i = 0; i < MODE_PRIORITY.length; i++) {
      const modeKey = MODE_PRIORITY[i];
      
      try {
        const result = await fetchModeExplanation(prompt, modeKey, selectedLanguage);
        
        if (abortControllerRef.current?.signal.aborted) return;

        // Sync credits from server response (server already deducted)
        if (result.credits_remaining !== null) {
          syncCreditsFromServer(result.credits_remaining, result.daily_remaining, result.monthly_remaining);

          const remaining = getCredits();
          if (remaining.total > 0 && remaining.total <= 5) {
            toast.warning(`⚡ Running low on credits! ${remaining.total} remaining`);
          }
        }
        
        setAnswers(prev => ({ ...prev, [modeKey]: result.text }));
        newAnswers[modeKey] = result.text;
        setChatHistories(prev => ({
          ...prev,
          [modeKey]: [...prev[modeKey], { role: 'assistant', content: result.text }]
        }));
        
        logUsage({
          queryText: prompt,
          mode: modeKey,
          language: selectedLanguage,
          responseLength: result.text.length,
        });
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        const errorMsg = 'Sorry, something went wrong. Please try again.';
        setAnswers(prev => ({ ...prev, [modeKey]: errorMsg }));
        newAnswers[modeKey] = errorMsg;
      } finally {
        setLoadingModes(prev => ({ ...prev, [modeKey]: false }));
      }
      
      if (i < MODE_PRIORITY.length - 1) {
        await new Promise(resolve => setTimeout(resolve, STAGGER_DELAY));
      }
    }
    
    const historyItem: HistoryItem = {
      id: Date.now().toString(),
      question: prompt,
      answers: newAnswers,
      timestamp: new Date(),
      language: selectedLanguage
    };
    setHistory(prev => [historyItem, ...prev.slice(0, 49)]);
    setStats(prev => ({
      ...prev,
      totalQuestions: prev.totalQuestions + 1,
      todayQuestions: prev.todayQuestions + 1
    }));
  }, [selectedLanguage, fetchModeExplanation, syncCreditsFromServer, getCredits]);

  // Mandatory sign-in gate for early access
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-2">
          <img src="https://i.ibb.co/fGLH5Dxs/minimind-logo.png" alt="MiniMind" className="w-10 h-10" width={40} height={40} />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Auth page takes priority when navigating to it
  if (currentPage === 'auth') {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <AuthPage onBack={() => setCurrentPage('home')} onAuthSuccess={() => setCurrentPage('home')} />
      </Suspense>
    );
  }

  // Show early access gate only if not logged in and not navigating to auth
  if (!user && isEarlyAccess) {
    return <EarlyAccessGate onSignIn={() => setCurrentPage('auth')} />;
  }

  return (
    <div className="app-container">
      <MobileHeader onMenuClick={() => setIsMenuOpen(true)} onProfileClick={() => user ? setCurrentPage('profile') : setCurrentPage('auth')} currentLens={purposeLens} onNewChat={handleNewChat} hasActiveChat={hasAskedQuestion} onNavigateToSubscription={() => setCurrentPage('subscription')} onNavigateToShop={() => setCurrentPage('shop')} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} currentPage={currentPage} onNavigate={(page: string) => setCurrentPage(page as typeof currentPage)} theme={theme} onToggleTheme={toggleTheme} onShowGuide={() => setShowOnboarding(true)} onNewChat={handleNewChat} />
      
      <main className="page-content px-4 custom-scrollbar">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Hero Empty State when no question asked */}
              {!hasAskedQuestion && !isAnyLoading && (
                <HeroEmptyState onPromptClick={handlePromptClick} />
              )}
              
              {/* Mode Cards - shown when loading or has answers */}
              {(hasAskedQuestion || isAnyLoading) && (Object.keys(modes) as ModeKey[]).map((modeKey, index) => (
                <motion.div key={modeKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.2 }}>
                  <MemoizedModeCard modeKey={modeKey} answer={answers[modeKey]} isLoading={loadingModes[modeKey]} onSpeak={handleSpeak} onCopy={handleCopy} onDownload={handleDownload} onShare={handleShare} onGetOneWord={handleGetOneWord} onChatSubmit={handleChatSubmit} onFullscreen={handleFullscreen} isSpeaking={isSpeaking} chatInputValue={chatInputs[modeKey]} onChatInputChange={handleChatInputChange} currentQuestion={currentQuestion} />
                </motion.div>
              ))}
            </motion.div>
          )}
          
          {currentPage === 'profile' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProfilePage onSignOut={handleSignOut} />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'ekakshar' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="ekakshar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EkaksharPage language={selectedLanguage} />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'history' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <HistoryPage history={history} onLoadItem={handleLoadHistory} onClearHistory={handleClearHistory} />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'settings' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SettingsPage theme={theme} onToggleTheme={toggleTheme} selectedLanguage={selectedLanguage} onLanguageSelect={setSelectedLanguage} onClearHistory={handleClearHistory} onNavigateToLegal={(page) => setCurrentPage(page)} stats={stats} />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'subscription' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="subscription" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SubscriptionPage />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'learningpath' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="learningpath" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LearningPathPage />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'explainback' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="explainback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ExplainBackPage />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'purposelens' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="purposelens" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PurposeLensPage 
                  currentLens={purposeLens} 
                  customPrompt={customLensPrompt}
                  onLensChange={handlePurposeLensSelect}
                />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'notes' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <NotesPage />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'terms' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="terms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <TermsOfServicePage onBack={() => setCurrentPage('settings')} />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'privacy' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="privacy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PrivacyPolicyPage onBack={() => setCurrentPage('settings')} />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'refund' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="refund" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <RefundPolicyPage onBack={() => setCurrentPage('settings')} />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'arena' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ArenaPage />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'shop' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="shop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ShopPage />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'certificates' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="certificates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CertificatePage />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'parentdashboard' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="parentdashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ParentDashboardPage />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'gurudashboard' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="gurudashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <GuruDashboardPage />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'wrapped' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="wrapped" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <WrappedPage />
              </motion.div>
            </Suspense>
          )}
        </AnimatePresence>
      </main>
      
      <QuestionLimitBanner />
      
      {currentPage === 'home' && <BottomInputBar value={question} onChange={setQuestion} onSubmit={handleSubmit} onVoiceInput={handleVoiceInput} onRefinePrompt={handleRefinePrompt} placeholder="Ask anything... MiniMind explains it 4 ways!" isLoading={isAnyLoading} isRefining={isRefining} />}
      
      {fullscreenMode && (
        <Suspense fallback={<PageLoadingFallback />}>
          <FullscreenMode 
            isOpen={!!fullscreenMode} 
            modeKey={fullscreenMode} 
            answer={answers[fullscreenMode]} 
            chatHistory={chatHistories[fullscreenMode]}
            isLoading={loadingModes[fullscreenMode]}
            onClose={() => setFullscreenMode(null)} 
            onSpeak={handleSpeak} 
            onCopy={handleCopy} 
            onDownload={handleDownload} 
            onShare={handleShare} 
            onChatSubmit={handleChatSubmit} 
            isSpeaking={isSpeaking} 
            chatInputValue={chatInputs[fullscreenMode]} 
            onChatInputChange={handleChatInputChange} 
            currentQuestion={currentQuestion} 
          />
        </Suspense>
      )}
      
      <RefinePromptDialog isOpen={showRefineDialog} originalPrompt={originalPrompt} refinedPrompt={refinedPrompt} onAccept={handleAcceptRefinedPrompt} onReject={() => setShowRefineDialog(false)} onReRefine={handleReRefine} isRefining={isRefining} />
      
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingGuide isOpen={showOnboarding} onClose={handleCloseOnboarding} />
        </Suspense>
      )}
      
      {/* Purpose Lens Onboarding - shown on first launch */}
      {showPurposeLensOnboarding && !showOnboarding && (
        <PurposeLensOnboarding 
          isOpen={showPurposeLensOnboarding} 
          onSelect={handlePurposeLensSelect}
        />
      )}
      
      {/* Study Buddy */}
      <StudyBuddy />
      
      {/* Credit Exhaustion Modal */}
      <CreditExhaustionModal
        open={showCreditExhaustion}
        onOpenChange={setShowCreditExhaustion}
        onNavigateToSubscription={() => setCurrentPage('subscription')}
      />
    </div>
  );
};

export default Index;
