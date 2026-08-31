// =============================================
// SPEECH ANALYSIS SERVICE - Module 5
// =============================================

/**
 * 1. Speech Pace Analysis (Words Per Minute)
 */
export const analyzePace = (transcript, durationSeconds) => {
  if (!transcript || !durationSeconds || durationSeconds === 0) {
    return { wpm: 0, pace: 'No speech detected' };
  }

  const words = transcript.trim().split(/\s+/).length;
  const minutes = durationSeconds / 60;
  const wpm = Math.round(words / minutes);

  let pace = 'Normal';
  let suggestion = '';

  if (wpm < 100) {
    pace = 'Too Slow';
    suggestion = 'Try speaking a bit faster to maintain engagement.';
  } else if (wpm >= 100 && wpm < 130) {
    pace = 'Slow';
    suggestion = 'Your pace is a bit slow. Consider increasing your speaking speed slightly.';
  } else if (wpm >= 130 && wpm <= 170) {
    pace = 'Normal';
    suggestion = 'Good pace! Your speaking speed is ideal for interviews.';
  } else if (wpm > 170 && wpm <= 200) {
    pace = 'Fast';
    suggestion = 'You speak a bit fast. Try to slow down slightly for clarity.';
  } else if (wpm > 200) {
    pace = 'Too Fast';
    suggestion = 'You speak very fast. Slow down to ensure your answers are clearly understood.';
  }

  return {
    wpm,
    pace,
    suggestion,
    wordCount: words,
    minutes: parseFloat(minutes.toFixed(1))
  };
};

/**
 * 2. Filler Words Detection
 */
export const detectFillerWords = (transcript) => {
  if (!transcript) {
    return { fillerWords: [], totalFillerCount: 0, fillerPercentage: 0, score: 100, suggestion: '' };
  }

  const fillerPatterns = [
    { word: 'um', pattern: /\bum\b/gi },
    { word: 'uh', pattern: /\buh\b/gi },
    { word: 'like', pattern: /\blike\b/gi },
    { word: 'you know', pattern: /\byou know\b/gi },
    { word: 'actually', pattern: /\bactually\b/gi },
    { word: 'basically', pattern: /\bbasically\b/gi },
    { word: 'literally', pattern: /\bliterally\b/gi },
    { word: 'so', pattern: /\bso\b/gi },
    { word: 'just', pattern: /\bjust\b/gi },
    { word: 'well', pattern: /\bwell\b/gi },
    { word: 'i mean', pattern: /\bi mean\b/gi },
    { word: 'right', pattern: /\bright\b/gi },
    { word: 'okay', pattern: /\bokay\b/gi },
    { word: 'sort of', pattern: /\bsort of\b/gi },
    { word: 'kind of', pattern: /\bkind of\b/gi }
  ];

  const detected = [];
  let totalFillerCount = 0;

  fillerPatterns.forEach(({ word, pattern }) => {
    const matches = (transcript.match(pattern) || []);
    if (matches.length > 0) {
      detected.push({ word, count: matches.length });
      totalFillerCount += matches.length;
    }
  });

  const totalWords = transcript.trim().split(/\s+/).length;
  const fillerPercentage = totalWords > 0 ? Math.round((totalFillerCount / totalWords) * 100) : 0;

  let score = 100;
  let suggestion = '';

  if (fillerPercentage > 15) {
    score = 40;
    suggestion = 'You use too many filler words. Try to pause and think before speaking.';
  } else if (fillerPercentage > 10) {
    score = 60;
    suggestion = 'You use several filler words. Practice replacing them with brief pauses.';
  } else if (fillerPercentage > 5) {
    score = 80;
    suggestion = 'Good use of language with minimal filler words.';
  } else {
    score = 95;
    suggestion = 'Excellent! Very few filler words. Keep up the good work!';
  }

  return {
    fillerWords: detected,
    totalFillerCount,
    fillerPercentage,
    score,
    suggestion,
    totalWords
  };
};

/**
 * 3. Grammar Checking
 */
export const checkGrammar = (transcript) => {
  if (!transcript || transcript.trim().length === 0) {
    return { score: 0, issues: [], suggestion: 'No text to analyze.' };
  }

  const commonIssues = [];
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // Check for sentence fragments
  const fragments = sentences.filter(s => s.trim().split(/\s+/).length < 3);
  if (fragments.length > 0) {
    commonIssues.push({
      type: 'sentence_fragment',
      count: fragments.length,
      suggestion: 'Use complete sentences with subject and predicate.'
    });
  }

  // Check for run-on sentences
  const longSentences = sentences.filter(s => s.trim().split(/\s+/).length > 25);
  if (longSentences.length > 0) {
    commonIssues.push({
      type: 'run_on_sentence',
      count: longSentences.length,
      suggestion: 'Break long sentences into shorter, clearer statements.'
    });
  }

  // Check for repeated words
  const words = transcript.toLowerCase().match(/\b\w+\b/g) || [];
  const wordCount = {};
  words.forEach(w => {
    wordCount[w] = (wordCount[w] || 0) + 1;
  });
  const repeatedWords = Object.entries(wordCount)
    .filter(([word, count]) => count > 3 && word.length > 2)
    .slice(0, 5);

  if (repeatedWords.length > 0) {
    commonIssues.push({
      type: 'repetition',
      count: repeatedWords.length,
      suggestion: 'Vary your vocabulary to avoid repetition.'
    });
  }

  const score = Math.max(0, 100 - (commonIssues.length * 10));

  let suggestion = '';
  if (score >= 90) {
    suggestion = 'Excellent grammar! Your sentences are well-structured.';
  } else if (score >= 70) {
    suggestion = 'Good grammar with minor issues. Review the suggestions above.';
  } else if (score >= 50) {
    suggestion = 'Some grammar issues found. Work on sentence structure and clarity.';
  } else {
    suggestion = 'Significant grammar issues. Consider practicing with structured answers.';
  }

  return {
    score,
    issues: commonIssues,
    suggestion,
    sentenceCount: sentences.length,
    wordCount: words.length
  };
};

/**
 * 4. Pronunciation Evaluation
 */
export const evaluatePronunciation = (transcript) => {
  if (!transcript || transcript.trim().length === 0) {
    return { score: 0, suggestion: 'No speech to evaluate.' };
  }

  const words = transcript.trim().split(/\s+/);
  const wordLengths = words.map(w => w.length);
  const avgWordLength = wordLengths.reduce((a, b) => a + b, 0) / wordLengths.length;
  const shortWords = words.filter(w => w.length < 3).length;

  let score = 80;
  let issues = [];

  if (shortWords > words.length * 0.3) {
    issues.push('Many short words detected - may indicate unclear pronunciation.');
    score -= 10;
  }

  if (avgWordLength < 4) {
    issues.push('Average word length is short - may indicate clipped speech.');
    score -= 10;
  }

  if (words.length < 10) {
    issues.push('Very short response - may not have enough speech to evaluate.');
    score -= 5;
  }

  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  if (uniqueWords.size < words.length * 0.4) {
    issues.push('Limited vocabulary - consider using more varied language.');
    score -= 5;
  }

  score = Math.max(0, Math.min(100, score));

  let suggestion = '';
  if (score >= 90) {
    suggestion = 'Excellent pronunciation! Your speech is clear and well-articulated.';
  } else if (score >= 70) {
    suggestion = 'Good pronunciation with minor areas for improvement. Practice clear enunciation.';
  } else if (score >= 50) {
    suggestion = 'Some pronunciation issues detected. Focus on articulating each word clearly.';
  } else {
    suggestion = 'Significant pronunciation issues. Practice speaking slowly and clearly.';
  }

  return {
    score,
    issues,
    suggestion,
    wordCount: words.length,
    avgWordLength: parseFloat(avgWordLength.toFixed(1))
  };
};

/**
 * 5. Overall Communication Quality Assessment
 */
export const assessCommunicationQuality = (transcript, durationSeconds) => {
  const pace = analyzePace(transcript, durationSeconds);
  const filler = detectFillerWords(transcript);
  const grammar = checkGrammar(transcript);
  const pronunciation = evaluatePronunciation(transcript);

  const scores = [pace.wpm > 0 ? Math.min(100, pace.wpm / 2) : 0, filler.score, grammar.score, pronunciation.score];
  const validScores = scores.filter(s => s > 0);
  const overallScore = validScores.length > 0 
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0;

  let summary = '';
  if (overallScore >= 85) {
    summary = '🌟 Excellent communication skills! You speak clearly, confidently, and professionally.';
  } else if (overallScore >= 70) {
    summary = '👍 Good communication with some areas to improve. Focus on reducing filler words and pacing.';
  } else if (overallScore >= 50) {
    summary = '📈 Fair communication. Work on clarity, vocabulary, and reducing hesitations.';
  } else {
    summary = '🔄 Needs improvement. Practice speaking more clearly and structuring your answers.';
  }

  return {
    overallScore,
    summary,
    pace,
    filler,
    grammar,
    pronunciation
  };
};

const speechAnalysis = {
  analyzePace,
  detectFillerWords,
  checkGrammar,
  evaluatePronunciation,
  assessCommunicationQuality
};

export default speechAnalysis;