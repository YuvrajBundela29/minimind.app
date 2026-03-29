import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, Image, Table, FileSpreadsheet, Presentation, 
  X, Sparkles, Brain, BookOpen, Zap, GraduationCap, ChevronRight,
  Loader2, AlertCircle, CheckCircle, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useSubscription, CREDIT_COSTS } from '@/contexts/SubscriptionContext';
import { modes, ModeKey } from '@/config/minimind';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import AIService from '@/services/aiService';

interface FileInfo {
  name: string;
  size: number;
  type: string;
  content?: string;
}

const SUPPORTED_TYPES = {
...
  const analyzeFile = useCallback(async () => {
    if (!file) return;

    const cost = CREDIT_COSTS.ekakshar || 5; // Use ekakshar cost for file analysis
    if (!hasCredits(cost)) {
      showUpgradePrompt('File Analysis');
      return;
    }

    setIsAnalyzing(true);
    try {
      const data = await AIService.invokeChat({
        type: 'file_analysis',
        prompt: `Analyze "${file.name}": ${file.content?.substring(0, 4500)}`,
        analysisMode: selectedMode,
        language: 'en',
      });

      useCredits(cost, 'file_analysis');
      setAnalysis((data.response as string) || 'Unable to analyze this file right now. Please try again.');
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze file. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [file, selectedMode, hasCredits, useCredits, showUpgradePrompt]);

  const clearFile = () => {
    setFile(null);
    setAnalysis(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 mb-4">
          <Upload className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-violet-300">File Intelligence</span>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
          Upload & Understand
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload files and images for AI-powered analysis
        </p>
      </motion.div>

      {/* Upload Area */}
      {!file && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-muted-foreground/30 rounded-2xl p-8 text-center cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
              <Upload className="w-8 h-8 text-violet-400" />
            </div>
            <p className="text-foreground font-medium mb-1">Drop your file here</p>
            <p className="text-muted-foreground text-sm mb-4">or click to browse</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {Object.entries(SUPPORTED_TYPES).slice(0, 5).map(([type, info]) => (
                <span key={type} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {info.label}
                </span>
              ))}
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                +more
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Max file size: 100MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.pptx,.txt,.csv,.xlsx"
            onChange={handleFileSelect}
          />
        </motion.div>
      )}

      {/* File Preview */}
      {file && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-start gap-4">
              {/* Preview/Icon */}
              <div className="shrink-0">
                {previewUrl ? (
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`w-20 h-20 rounded-lg bg-gradient-to-br ${SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES]?.color || 'from-gray-500 to-slate-500'} flex items-center justify-center`}>
                    {React.createElement(SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES]?.icon || FileText, {
                      className: 'w-10 h-10 text-white',
                    })}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES]?.label || 'File'} • {formatFileSize(file.size)}
                </p>
                {uploadProgress < 100 && (
                  <Progress value={uploadProgress} className="mt-2 h-1" />
                )}
                {uploadProgress === 100 && (
                  <div className="flex items-center gap-1 text-green-500 text-sm mt-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Ready for analysis</span>
                  </div>
                )}
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFile}
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Mode Selection */}
      {file && !analysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <h3 className="text-sm font-medium text-muted-foreground">Choose explanation style:</h3>
          <div className="grid grid-cols-2 gap-3">
            {ANALYSIS_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.key;
              return (
                <motion.button
                  key={mode.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMode(mode.key as ModeKey)}
                  className={`relative p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-transparent bg-gradient-to-br ' + mode.color + ' text-white shadow-lg'
                      : 'border-border bg-card hover:bg-muted'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                  <p className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-foreground'}`}>
                    {mode.label}
                  </p>
                  <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {mode.description}
                  </p>
                </motion.button>
              );
            })}
          </div>

          {/* Analyze Button */}
          <Button
            onClick={analyzeFile}
            disabled={isAnalyzing}
            className="w-full h-12 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Eye className="w-5 h-5 mr-2" />
                Analyze File
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                  5 credits
                </span>
              </>
            )}
          </Button>
        </motion.div>
      )}

      {/* Analysis Result */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-6 bg-gradient-to-br from-card to-muted/50 border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${ANALYSIS_MODES.find(m => m.key === selectedMode)?.color} flex items-center justify-center`}>
                  {React.createElement(ANALYSIS_MODES.find(m => m.key === selectedMode)?.icon || Brain, {
                    className: 'w-4 h-4 text-white',
                  })}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {ANALYSIS_MODES.find(m => m.key === selectedMode)?.label} Analysis
                  </p>
                  <p className="text-xs text-muted-foreground">{file?.name}</p>
                </div>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer content={analysis} />
              </div>
            </Card>

            {/* Try Another Mode */}
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setAnalysis(null)}
                className="flex-1"
              >
                Try Another Style
              </Button>
              <Button
                variant="outline"
                onClick={clearFile}
                className="flex-1"
              >
                New File
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileAnalysisPage;
