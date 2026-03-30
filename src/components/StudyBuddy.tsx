import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import AIService from '@/services/aiService';

const StudyBuddy: React.FC = () => {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const [thinkQuestion, setThinkQuestion] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAndShow = async () => {
      // Only show after 8PM IST
      const now = new Date();
      const istHours = (now.getUTCHours() + 5 + (now.getUTCMinutes() + 30 >= 60 ? 1 : 0)) % 24;
      if (istHours < 20) return;

      // Check if already dismissed today
      const today = new Date().toISOString().split('T')[0];
      const dismissed = localStorage.getItem('minimind-studybuddy-dismissed');
      if (dismissed === today) return;

      // Must be logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Must have at least 3 usage logs
      const { count } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!count || count < 3) return;

      // Get recent queries
      const { data: logs } = await supabase
        .from('usage_logs')
        .select('query_text')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      setDisplayName(profile?.display_name?.split(' ')[0] || 'there');

      // Generate study buddy message
      setLoading(true);
      try {
        const topics = logs?.map(l => l.query_text).filter(Boolean).join(', ') || 'various topics';
        const result = await AIService.invokeChat({
          prompt: `Topics studied: ${topics}`,
          type: 'study_buddy',
          language: 'English',
          mode: 'study_buddy',
          system_prompt: `You are MiniMind's study buddy. Based on these topics the user studied: ${topics}, give ONE motivating message under 20 words that references what they learned, and ONE question to think about tonight. Format exactly: MESSAGE:[text]\nQUESTION:[text]`,
        });

        const response = result.response || '';
        const msgMatch = response.match(/MESSAGE:\s*(.+)/);
        const qMatch = response.match(/QUESTION:\s*(.+)/);

        setMessage(msgMatch ? msgMatch[1].trim() : 'Great learning today! Keep the momentum going.');
        setThinkQuestion(qMatch ? qMatch[1].trim() : 'What was the most interesting thing you learned today?');
        setShow(true);
      } catch {
        // Silently fail - study buddy is non-critical
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(checkAndShow, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('minimind-studybuddy-dismissed', new Date().toISOString().split('T')[0]);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('saved_notes').insert({
      user_id: user.id,
      title: 'Study Buddy Question',
      query_text: thinkQuestion,
      response_text: message,
      mode: 'study_buddy',
    });

    toast_success();
    handleDismiss();
  };

  if (!show || loading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 200, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto"
      >
        <div className="bg-card border border-border rounded-2xl shadow-xl p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Good evening, {displayName}!</p>
                <p className="text-xs text-muted-foreground">Your Study Buddy</p>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Message */}
          <p className="text-sm text-foreground">{message}</p>

          {/* Question */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Think about this tonight:</p>
            <p className="text-sm font-medium text-foreground">{thinkQuestion}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleDismiss}>
              Dismiss
            </Button>
            <Button size="sm" className="flex-1" onClick={handleSave}>
              <Bookmark className="w-3.5 h-3.5 mr-1" />
              Save question
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

function toast_success() {
  import('sonner').then(({ toast: t }) => t.success('Question saved to notes!'));
}

export default StudyBuddy;
