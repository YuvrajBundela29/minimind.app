import React, { useState, useCallback, useEffect, Suspense, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import TopNavBar from '@/components/TopNavBar';
import BottomTabBar from '@/components/BottomTabBar';
import BottomInputBar from '@/components/BottomInputBar';
import ModeCard from '@/components/ModeCard';
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
const SESSION_STORAGE_KEY = 'minimind-current-session';
import { useSubscription, CREDIT_COSTS, CREDIT_LIMITS } from '@/contexts/SubscriptionContext';
import { useEarlyAccess } from '@/contexts/EarlyAccessContext';

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

export interface HistoryItem {
  id: string;
  question: string;
  answers: Record<ModeKey, string>;
  timestamp: Date;
  language: LanguageKey;
}

const defaultAnswers: Record<ModeKey, string | null> = {
  beginner: null, thinker: null, story: null, mastery: null,
};

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

const MODE_PRIORITY: ModeKey[] = ['beginner', 'thinker', 'story', 'mastery'];
const STAGGER_DELAY = 300;

// Page transition variant
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const Index = () => {
  const { isEarlyAccess } = useEarlyAccess();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [currentPage, setCurrentPage] = useState<NavigationId | 'auth' | 'settings'>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey>('en');
  const [hasAskedQuestion, setHasAskedQuestion] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [question, setQuestion] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [answers, setAnswers] = useState<Record<ModeKey, string | null>>(defaultAnswers);
  const [loadingModes, setLoadingModes] = useState<Record<ModeKey, boolean>>({
    beginner: false, thinker: false, story: false, mastery: false,
  });
  
  const [isRefining, setIsRefining] = useState(false);
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [refinedPrompt, setRefinedPrompt] = useState('');
  const [fullscreenMode, setFullscreenMode] = useState<ModeKey | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPurposeLensOnboarding, setShowPurposeLensOnboarding] = useState(false);
  const [purposeLens, setPurposeLens] = useState<PurposeLensKey>('general');
  const [customLensPrompt, setCustomLensPrompt] = useState('');
  const [chatInputs, setChatInputs] = useState<Record<ModeKey, string>>({
    beginner: '', thinker: '', story: '', mastery: '',
  });
  const [chatHistories, setChatHistories] = useState<Record<ModeKey, Array<{ role: 'user' | 'assistant'; content: string }>>>({
    beginner: [], thinker: [], story: [], mastery: [],
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState<SpeechSynthesisUtterance | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({
    totalQuestions: 0, todayQuestions: 0, favoriteMode: 'beginner' as ModeKey, streak: 0,
  });
  const [showCreditExhaustion, setShowCreditExhaustion] = useState(false);
  const backPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canExitRef = useRef(false);
  
  useEffect(() => { return () => { abortControllerRef.current?.abort(); }; }, []);
  
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((r) => Promise.all(r.map((reg) => reg.unregister()))).catch(() => {});
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  
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
    
    if (savedPurposeLens) {
      setPurposeLens(savedPurposeLens);
      if (savedCustomLensPrompt) setCustomLensPrompt(savedCustomLensPrompt);
    } else {
      setShowPurposeLensOnboarding(true);
    }
    
    if (!hasSeenOnboarding) setShowOnboarding(true);
    
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed.map((item: any) => ({ ...item, timestamp: new Date(item.timestamp) })));
      } catch (e) { console.error('Error parsing history:', e); }
    }
    if (savedStats) {
      try { setStats(JSON.parse(savedStats)); } catch (e) { console.error('Error parsing stats:', e); }
    }
    
    const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.timestamp && Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
          if (session.currentQuestion) setCurrentQuestion(session.currentQuestion);
          if (session.answers) setAnswers(session.answers);
          if (session.hasAskedQuestion) setHasAskedQuestion(session.hasAskedQuestion);
          if (session.chatHistories) setChatHistories(session.chatHistories);
        } else {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } catch (e) { console.error('Error restoring session:', e); }
    }

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
  
  useEffect(() => {
    if (hasAskedQuestion && currentQuestion) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        currentQuestion, answers, hasAskedQuestion, chatHistories, timestamp: Date.now(),
      }));
    }
  }, [currentQuestion, answers, hasAskedQuestion, chatHistories]);
  
  // Back button handler
  useEffect(() => {
    if (window.history.state === null) window.history.pushState({ page: 'home' }, '');
    
    const handlePopState = (event: PopStateEvent) => {
      if (currentPage !== 'home') {
        event.preventDefault();
        window.history.pushState({ page: 'home' }, '');
        setCurrentPage('home');
        return;
      }
      if (hasAskedQuestion) {
        event.preventDefault();
        window.history.pushState({ page: 'home' }, '');
        setAnswers(defaultAnswers);
        setCurrentQuestion('');
        setHasAskedQuestion(false);
        setChatHistories({ beginner: [], thinker: [], story: [], mastery: [] });
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }
      if (canExitRef.current) return;
      event.preventDefault();
      window.history.pushState({ page: 'home' }, '');
      toast.info('Press back again to exit', { duration: 2000 });
      canExitRef.current = true;
      if (backPressTimeoutRef.current) clearTimeout(backPressTimeoutRef.current);
      backPressTimeoutRef.current = setTimeout(() => { canExitRef.current = false; }, 2000);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (backPressTimeoutRef.current) clearTimeout(backPressTimeoutRef.current);
    };
  }, [currentPage, hasAskedQuestion]);
  
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('minimind-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }, [theme]);
  
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
    } catch (error) { toast.error('Failed to re-refine prompt'); }
    finally { setIsRefining(false); }
  };
  
  const fetchModeExplanation = useCallback(async (
    questionText: string, modeKey: ModeKey, language: LanguageKey
  ): Promise<string> => {
    const cacheKey = apiCache.generateKey(questionText, modeKey, `${language}-${purposeLens}`);
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;
    const response = await AIService.getExplanation(questionText, modeKey, language, {
      purposeLens,
      customLensPrompt: purposeLens === 'custom' ? customLensPrompt : undefined
    });
    apiCache.set(cacheKey, response);
    return response;
  }, [purposeLens, customLensPrompt]);
  
  const { useCredits, hasCredits, getCredits, showUpgradePrompt, tier, syncCreditsFromServer } = useSubscription();

  const handleSubmit = useCallback(async () => {
    if (!question.trim()) return;
    if (!hasCredits(1)) { setShowCreditExhaustion(true); return; }
    
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
    
    for (let i = 0; i < MODE_PRIORITY.length; i++) {
      const modeKey = MODE_PRIORITY[i];
      const cost = CREDIT_COSTS[modeKey] || 1;
      
      if (!hasCredits(cost)) {
        const skipMsg = `⚠️ Not enough credits for ${modeKey} mode (needs ${cost} credits). Top up to unlock!`;
        setAnswers(prev => ({ ...prev, [modeKey]: skipMsg }));
        newAnswers[modeKey] = skipMsg;
        setLoadingModes(prev => ({ ...prev, [modeKey]: false }));
        setShowCreditExhaustion(true);
        continue;
      }
      
      try {
        const response = await fetchModeExplanation(questionText, modeKey, selectedLanguage);
        if (abortControllerRef.current?.signal.aborted) return;
        
        await useCredits(cost, modeKey);
        
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
        
        setAnswers(prev => ({ ...prev, [modeKey]: response }));
        newAnswers[modeKey] = response;
        setChatHistories(prev => ({
          ...prev, [modeKey]: [...prev[modeKey], { role: 'assistant', content: response }]
        }));
        
        logUsage({ queryText: questionText, mode: modeKey, language: selectedLanguage, responseLength: response.length });
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
      id: Date.now().toString(), question: questionText, answers: newAnswers,
      timestamp: new Date(), language: selectedLanguage
    };
    setHistory(prev => [historyItem, ...prev.slice(0, 49)]);
    setStats(prev => ({ ...prev, totalQuestions: prev.totalQuestions + 1, todayQuestions: prev.todayQuestions + 1 }));
    setQuestion('');
  }, [question, selectedLanguage, fetchModeExplanation, hasCredits, useCredits, getCredits, showUpgradePrompt, tier]);
  
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
    if (!text || text.includes('Ready to explain')) { toast.error('No content to speak'); return; }
    if (isSpeaking && currentSpeech) { speechService.stop(); setIsSpeaking(false); setCurrentSpeech(null); return; }
    try {
      const utterance = await speechService.speak(text, selectedLanguage, {
        rate: 0.9, pitch: 1,
        onStart: () => setIsSpeaking(true),
        onEnd: () => { setIsSpeaking(false); setCurrentSpeech(null); },
        onError: (error) => { setIsSpeaking(false); setCurrentSpeech(null); console.error('Speech error:', error); toast.error('Speech not available.'); },
      });
      if (utterance) setCurrentSpeech(utterance);
    } catch (error) { console.error('Speech error:', error); toast.error('Speech synthesis not available'); }
  }, [isSpeaking, currentSpeech, selectedLanguage]);
  
  const handleCopy = useCallback((text: string) => { navigator.clipboard.writeText(text); toast.success('Copied to clipboard!'); }, []);
  const handleDownload = useCallback((text: string, mode: string, q: string) => { downloadPDF(text, mode as ModeKey, q || currentQuestion); toast.success('PDF downloaded!'); }, [currentQuestion]);
  
  const handleShare = useCallback(async (text: string, mode: string, q: string, platform: SharePlatform = 'native') => {
    const shared = await sharePDF(text, mode as ModeKey, q || currentQuestion, platform);
    if (shared) {
      const messages: Record<SharePlatform, string> = { whatsapp: 'Opening WhatsApp...', email: 'Opening email...', copy: 'Copied to clipboard!', download: 'PDF downloaded!', native: 'Shared successfully!' };
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
    if (!hasCredits(cost)) { setShowCreditExhaustion(true); return; }
    
    setChatHistories(prev => ({ ...prev, [modeKey]: [...prev[modeKey], { role: 'user', content: message }] }));
    setLoadingModes(prev => ({ ...prev, [modeKey]: true }));
    try {
      const response = await AIService.continueConversation(
        [...chatHistories[modeKey], { role: 'user', content: message }],
        modeKey, selectedLanguage,
        { purposeLens, customLensPrompt: purposeLens === 'custom' ? customLensPrompt : undefined }
      );
      await useCredits(cost, modeKey);
      const remaining = getCredits();
      if (remaining.total > 0 && remaining.total <= 5) toast.warning(`⚡ Running low on credits! ${remaining.total} remaining`);
      setAnswers(prev => ({ ...prev, [modeKey]: response }));
      setChatHistories(prev => ({ ...prev, [modeKey]: [...prev[modeKey], { role: 'assistant', content: response }] }));
    } catch (error) { toast.error('Failed to get response'); }
    finally { setLoadingModes(prev => ({ ...prev, [modeKey]: false })); }
    setChatInputs(prev => ({ ...prev, [modeKey]: '' }));
  }, [chatHistories, selectedLanguage, purposeLens, customLensPrompt, hasCredits, useCredits, getCredits]);
  
  const handleChatInputChange = useCallback((mode: string, value: string) => { setChatInputs(prev => ({ ...prev, [mode as ModeKey]: value })); }, []);
  const handleLoadHistory = useCallback((item: HistoryItem) => { setAnswers(item.answers); setCurrentQuestion(item.question); setHasAskedQuestion(true); setCurrentPage('home'); toast.success('Loaded from history!'); }, []);
  const handleClearHistory = useCallback(() => { setHistory([]); localStorage.removeItem('minimind-history'); toast.success('History cleared!'); }, []);
  const handleFullscreen = useCallback((mode: string) => { setFullscreenMode(mode as ModeKey); }, []);
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    ['minimind-history', 'minimind-stats', 'minimind-learning-paths', 'minimind-purpose-lens', 'minimind-custom-lens-prompt', 'minimind-ekakshar-history', 'minimind-explainback-history'].forEach(key => localStorage.removeItem(key));
    toast.success('Signed out!');
  };
  
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
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await supabase.from('user_settings').update({ purpose_lens: lens, custom_lens_prompt: customPrompt || null }).eq('user_id', currentUser.id);
    }
    setShowPurposeLensOnboarding(false);
    toast.success(`Switched to ${lens === 'custom' ? 'Custom' : lens.charAt(0).toUpperCase() + lens.slice(1)} mode!`);
  }, []);

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

  const handlePromptClick = useCallback(async (prompt: string) => {
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
    
    for (let i = 0; i < MODE_PRIORITY.length; i++) {
      const modeKey = MODE_PRIORITY[i];
      try {
        const response = await fetchModeExplanation(prompt, modeKey, selectedLanguage);
        if (abortControllerRef.current?.signal.aborted) return;
        setAnswers(prev => ({ ...prev, [modeKey]: response }));
        newAnswers[modeKey] = response;
        setChatHistories(prev => ({ ...prev, [modeKey]: [...prev[modeKey], { role: 'assistant', content: response }] }));
        logUsage({ queryText: prompt, mode: modeKey, language: selectedLanguage, responseLength: response.length });
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
      id: Date.now().toString(), question: prompt, answers: newAnswers,
      timestamp: new Date(), language: selectedLanguage
    };
    setHistory(prev => [historyItem, ...prev.slice(0, 49)]);
    setStats(prev => ({ ...prev, totalQuestions: prev.totalQuestions + 1, todayQuestions: prev.todayQuestions + 1 }));
  }, [selectedLanguage, fetchModeExplanation]);

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

  if (currentPage === 'auth') {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <AuthPage onBack={() => setCurrentPage('home')} onAuthSuccess={() => setCurrentPage('home')} />
      </Suspense>
    );
  }

  if (!user && isEarlyAccess) {
    return <EarlyAccessGate onSignIn={() => setCurrentPage('auth')} />;
  }

  const handleNavigate = (page: NavigationId | 'settings') => {
    if (page === 'profile' && !user) {
      setCurrentPage('auth');
    } else {
      setCurrentPage(page);
    }
  };

  return (
    <div className="app-container">
      {/* CHANGE 2: Clean Top Navbar */}
      <TopNavBar onNavigateToSubscription={() => setCurrentPage('subscription')} />
      
      <main className="page-content px-4 custom-scrollbar">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <motion.div key="home" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
              {!hasAskedQuestion && !isAnyLoading && (
                <HeroEmptyState onPromptClick={handlePromptClick} onNavigateToSubscription={() => setCurrentPage('subscription')} />
              )}
              {(hasAskedQuestion || isAnyLoading) && (Object.keys(modes) as ModeKey[]).map((modeKey, index) => (
                <motion.div key={modeKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.2 }}>
                  <MemoizedModeCard modeKey={modeKey} answer={answers[modeKey]} isLoading={loadingModes[modeKey]} onSpeak={handleSpeak} onCopy={handleCopy} onDownload={handleDownload} onShare={handleShare} onGetOneWord={handleGetOneWord} onChatSubmit={handleChatSubmit} onFullscreen={handleFullscreen} isSpeaking={isSpeaking} chatInputValue={chatInputs[modeKey]} onChatInputChange={handleChatInputChange} currentQuestion={currentQuestion} />
                </motion.div>
              ))}
            </motion.div>
          )}
          
          {currentPage === 'profile' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="profile" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <ProfilePage onSignOut={handleSignOut} />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'ekakshar' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="ekakshar" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <EkaksharPage language={selectedLanguage} />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'history' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="history" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <HistoryPage history={history} onLoadItem={handleLoadHistory} onClearHistory={handleClearHistory} />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'settings' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="settings" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <SettingsPage theme={theme} onToggleTheme={toggleTheme} selectedLanguage={selectedLanguage} onLanguageSelect={setSelectedLanguage} onClearHistory={handleClearHistory} stats={stats} />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'subscription' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="subscription" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <SubscriptionPage />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'learningpath' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="learningpath" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <LearningPathPage />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'explainback' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="explainback" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <ExplainBackPage />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'purposelens' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="purposelens" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <PurposeLensPage currentLens={purposeLens} customPrompt={customLensPrompt} onLensChange={handlePurposeLensSelect} />
              </motion.div>
            </Suspense>
          )}
          
          {currentPage === 'notes' && (
            <Suspense fallback={<PageLoadingFallback />}>
              <motion.div key="notes" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <NotesPage onNavigateHome={() => setCurrentPage('home')} />
              </motion.div>
            </Suspense>
          )}
        </AnimatePresence>
      </main>
      
      <QuestionLimitBanner />
      
      {/* CHANGE 4: Redesigned Input Bar (home only) */}
      {currentPage === 'home' && (
        <BottomInputBar
          value={question}
          onChange={setQuestion}
          onSubmit={handleSubmit}
          onVoiceInput={handleVoiceInput}
          onRefinePrompt={handleRefinePrompt}
          onNavigateToSubscription={() => setCurrentPage('subscription')}
          placeholder="Ask MiniMind anything..."
          isLoading={isAnyLoading}
          isRefining={isRefining}
        />
      )}
      
      {/* CHANGE 1: Bottom Tab Bar */}
      <BottomTabBar currentPage={currentPage} onNavigate={handleNavigate} />
      
      {fullscreenMode && (
        <Suspense fallback={<PageLoadingFallback />}>
          <FullscreenMode isOpen={!!fullscreenMode} modeKey={fullscreenMode} answer={answers[fullscreenMode]} chatHistory={chatHistories[fullscreenMode]} isLoading={loadingModes[fullscreenMode]} onClose={() => setFullscreenMode(null)} onSpeak={handleSpeak} onCopy={handleCopy} onDownload={handleDownload} onShare={handleShare} onChatSubmit={handleChatSubmit} isSpeaking={isSpeaking} chatInputValue={chatInputs[fullscreenMode]} onChatInputChange={handleChatInputChange} currentQuestion={currentQuestion} />
        </Suspense>
      )}
      
      <RefinePromptDialog isOpen={showRefineDialog} originalPrompt={originalPrompt} refinedPrompt={refinedPrompt} onAccept={handleAcceptRefinedPrompt} onReject={() => setShowRefineDialog(false)} onReRefine={handleReRefine} isRefining={isRefining} />
      
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingGuide isOpen={showOnboarding} onClose={handleCloseOnboarding} />
        </Suspense>
      )}
      
      {showPurposeLensOnboarding && !showOnboarding && (
        <PurposeLensOnboarding isOpen={showPurposeLensOnboarding} onSelect={handlePurposeLensSelect} />
      )}
      
      <CreditExhaustionModal open={showCreditExhaustion} onOpenChange={setShowCreditExhaustion} onNavigateToSubscription={() => setCurrentPage('subscription')} />
    </div>
  );
};

export default Index;
