import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Wand2, Paperclip, X, FileText, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';

interface FileInfo {
  name: string;
  size: number;
  type: string;
  content?: string;
  preview?: string;
}

interface BottomInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onVoiceInput: () => void;
  onRefinePrompt?: () => void;
  onFileAnalysis?: (file: FileInfo) => void;
  placeholder?: string;
  isLoading?: boolean;
  isRefining?: boolean;
}

const SUPPORTED_TYPES: Record<string, { label: string }> = {
  'image/jpeg': { label: 'Image' },
  'image/png': { label: 'Image' },
  'image/webp': { label: 'Image' },
  'application/pdf': { label: 'PDF' },
  'text/plain': { label: 'Text' },
  'text/csv': { label: 'CSV' },
};

const BottomInputBar: React.FC<BottomInputBarProps> = ({
  value,
  onChange,
  onSubmit,
  onVoiceInput,
  onRefinePrompt,
  onFileAnalysis,
  placeholder = "Ask anything...",
  isLoading = false,
  isRefining = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [attachedFile, setAttachedFile] = useState<FileInfo | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (attachedFile && onFileAnalysis) {
      onFileAnalysis(attachedFile);
      setAttachedFile(null);
    } else if (value.trim() && !isLoading) {
      onSubmit();
    }
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const typeInfo = SUPPORTED_TYPES[file.type];
    if (!typeInfo) {
      toast.error('Unsupported file type. Use images, PDFs, or text files.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const fileInfo: FileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        content: content.includes(',') ? content.split(',')[1] : content,
      };
      if (file.type.startsWith('image/')) {
        fileInfo.preview = URL.createObjectURL(file);
      }
      setAttachedFile(fileInfo);
      toast.success('File attached! Press send to analyze.');
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = () => {
    if (attachedFile?.preview) {
      URL.revokeObjectURL(attachedFile.preview);
    }
    setAttachedFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasContent = value.trim() || attachedFile;

  return (
    <div className="app-input-bar">
      <div className="app-input-inner">
        {/* Attached File Preview */}
        <AnimatePresence>
          {attachedFile && (
            <motion.div
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 8, height: 0 }}
              className="mb-2"
            >
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                {attachedFile.preview ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img src={attachedFile.preview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4.5 h-4.5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{attachedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(attachedFile.size)}</p>
                </div>
                <motion.button
                  type="button"
                  onClick={removeFile}
                  className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Input Area - ChatGPT/Claude style */}
        <div className="premium-input-container">
          {/* Top: Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={attachedFile ? "Add a message or just send..." : placeholder}
            className="premium-textarea"
            disabled={isLoading}
            rows={1}
          />

          {/* Bottom: Action row */}
          <div className="flex items-center justify-between px-2 pb-2 pt-0.5">
            {/* Left actions */}
            <div className="flex items-center gap-1">
              {onFileAnalysis && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.csv"
                    onChange={handleFileSelect}
                    aria-label="Select file to analyze"
                  />
                  <motion.button
                    type="button"
                    className="input-action-btn"
                    onClick={() => fileInputRef.current?.click()}
                    whileTap={{ scale: 0.92 }}
                    aria-label="Attach file"
                    disabled={isLoading}
                  >
                    <Paperclip className="w-[18px] h-[18px]" />
                  </motion.button>
                </>
              )}

              <motion.button
                type="button"
                className="input-action-btn"
                onClick={onVoiceInput}
                whileTap={{ scale: 0.92 }}
                aria-label="Voice input"
                disabled={isLoading}
              >
                <Mic className="w-[18px] h-[18px]" />
              </motion.button>

              {onRefinePrompt && value.trim() && !attachedFile && (
                <motion.button
                  type="button"
                  className="input-action-btn group"
                  onClick={onRefinePrompt}
                  whileTap={{ scale: 0.92 }}
                  aria-label="Refine prompt with AI"
                  disabled={isLoading || isRefining}
                >
                  <Wand2 className={`w-[18px] h-[18px] ${isRefining ? 'text-primary animate-pulse' : 'group-hover:text-primary'}`} />
                </motion.button>
              )}
            </div>

            {/* Send button */}
            <motion.button
              type="button"
              onClick={handleSubmit}
              className={`send-btn-premium ${hasContent ? 'send-btn-active' : 'send-btn-inactive'}`}
              whileTap={{ scale: 0.9 }}
              disabled={!hasContent || isLoading}
              aria-label="Send"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomInputBar;
