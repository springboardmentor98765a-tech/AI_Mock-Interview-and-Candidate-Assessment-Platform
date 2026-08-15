import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Mic } from 'lucide-react';

const ProgressiveSubtitle = ({
  questionText = '',
  isTtsPlaying = false,
  isTtsLoading = false,
  userAnswer = '',
  interimTranscript = '',
  isListening = false,
  ttsFailed = false,
}) => {
  const [visibleWordCount, setVisibleWordCount] = useState(0);

  const words = questionText ? questionText.trim().split(/\s+/) : [];

  useEffect(() => {
    if (isTtsLoading) {
      setVisibleWordCount(0);
      return;
    }

    if (isTtsPlaying && words.length > 0) {
      setVisibleWordCount(1);
      const intervalMs = Math.max(180, Math.min(260, Math.floor(4500 / Math.max(words.length, 1))));
      const timer = setInterval(() => {
        setVisibleWordCount((prev) => {
          if (prev >= words.length) {
            clearInterval(timer);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
      return () => clearInterval(timer);
    } else {
      setVisibleWordCount(words.length);
    }
  }, [isTtsPlaying, isTtsLoading, questionText]);

  const displayedQuestionText = isTtsPlaying
    ? words.slice(0, visibleWordCount).join(' ')
    : questionText;

  const activeTranscript = (interimTranscript || userAnswer || '').trim();
  const showCandidateCaption = Boolean(isListening && !isTtsLoading && !isTtsPlaying);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-4 px-4 py-2 select-none relative">
      <div className="w-full relative overflow-hidden rounded-2xl bg-gray-950/80 backdrop-blur-xl border border-white/10 p-6 md:p-8 shadow-2xl text-white flex flex-col items-center justify-center text-center transition-all duration-300">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Volume2 className={`w-4 h-4 ${isTtsPlaying ? 'animate-pulse text-indigo-300' : ''}`} />
          </div>
          {isTtsPlaying && (
            <span className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-500/15 px-3 py-1 rounded-full border border-indigo-500/30 font-medium tracking-wide">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              AI Speaking
            </span>
          )}
          {isListening && !isTtsPlaying && !isTtsLoading && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 font-medium tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Listening
            </span>
          )}
          {ttsFailed && (
            <span className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30 font-medium tracking-wide">
              Voice temporarily unavailable
            </span>
          )}
        </div>

        <div className="min-h-[4rem] flex items-center justify-center w-full">
          {isTtsLoading ? (
            <div className="flex items-center gap-3 text-indigo-200/80 text-lg md:text-xl font-medium">
              <span>Thinking...</span>
              <div className="flex gap-1.5 items-center">
                <motion.span
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                  className="w-2 h-2 bg-indigo-400 rounded-full"
                />
                <motion.span
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                  className="w-2 h-2 bg-indigo-400 rounded-full"
                />
                <motion.span
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                  className="w-2 h-2 bg-indigo-400 rounded-full"
                />
              </div>
            </div>
          ) : (
            <p className="text-xl md:text-2xl font-medium leading-relaxed text-gray-100 tracking-wide text-center">
              {displayedQuestionText}
            </p>
          )}
        </div>
      </div>

      <div className="w-full flex items-center justify-center">
        <AnimatePresence>
          {showCandidateCaption && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-3 bg-gray-950/85 backdrop-blur-md border border-emerald-500/30 px-5 py-2.5 rounded-full shadow-lg shadow-emerald-950/20 text-emerald-100 max-w-2xl"
            >
              <div className="relative flex items-center justify-center shrink-0">
                <Mic className={`w-4 h-4 ${isListening ? 'text-emerald-400' : 'text-emerald-500/70'}`} />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <div className="flex items-center gap-0.5 shrink-0 h-4">
                <motion.span
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                  className="w-0.5 h-3 bg-emerald-400 rounded-full"
                />
                <motion.span
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                  className="w-0.5 h-4 bg-emerald-400 rounded-full"
                />
                <motion.span
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                  className="w-0.5 h-2 bg-emerald-400 rounded-full"
                />
              </div>
              <span className="text-sm font-medium text-emerald-100 truncate">
                {activeTranscript || 'Listening...'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProgressiveSubtitle;
