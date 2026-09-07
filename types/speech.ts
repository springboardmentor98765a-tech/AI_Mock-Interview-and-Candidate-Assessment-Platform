// Types for Speech-to-Text & Communication Analysis Module

export interface GrammarMistake {
  original_sentence: string;
  incorrect_portion: string;
  suggested_correction: string;
  explanation: string;
  severity: 'Low' | 'Medium' | 'High';
}

export interface SentenceGrammarAnalysis {
  sentence_index: number;
  original_sentence: string;
  is_valid: boolean;
  status: string;
  corrected_sentence: string;
  mistakes: GrammarMistake[];
  mistakes_count: number;
  score: number;
}

export interface GrammarAnalysis {
  score: number;
  mistakes_count: number;
  corrected_sentences_count: number;
  total_sentences_count?: number;
  passed_sentences_count?: number;
  mistakes: GrammarMistake[];
  sentences_analysis?: SentenceGrammarAnalysis[];
  improvement_suggestions: string[];
  highlighted_transcript?: string;
}

export interface FillerWordDetail {
  word: string;
  count: number;
  timestamps?: number[];
}

export interface FillerAnalysis {
  total: number;
  rate: number;
  most_used: string | null;
  most_used_count: number;
  words: Record<string, number>;
  details: FillerWordDetail[];
  highlighted_transcript: string;
}

export interface PaceAnalysis {
  speaking_duration_seconds: number;
  word_count: number;
  wpm: number;
  category: 'Very Slow' | 'Slow' | 'Normal' | 'Fast' | 'Very Fast';
  recommendation: string;
}

export interface PauseTimelineSegment {
  type: 'speech' | 'pause';
  start: number;
  end: number;
  duration: number;
}

export interface PauseAnalysis {
  count: number;
  average_duration: number;
  longest_duration: number;
  total_silence_duration: number;
  silence_percentage: number;
  short_pauses: number;
  normal_pauses: number;
  long_pauses: number;
  timeline: PauseTimelineSegment[];
}

export interface PronunciationIssue {
  word: string;
  status: string;
  feedback: string;
  confidence?: number;
}

export interface PronunciationAnalysis {
  score: number;
  issues: PronunciationIssue[];
  clarity_assessment: string;
}

export interface CommunicationScore {
  overall_score: number;
  grammar: number;
  fluency: number;
  pronunciation: number;
  pace: number;
  clarity: number;
  vocabulary: number;
  confidence: number;
}

export interface AIFeedback {
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}

export interface SpeechAnalysisResponse {
  session_id: string;
  question_id?: string;
  audio_duration: number;
  transcript: string;
  word_count: number;
  character_count: number;
  sentence_count: number;
  grammar: GrammarAnalysis;
  fillers: FillerAnalysis;
  pace: PaceAnalysis;
  pauses: PauseAnalysis;
  pronunciation: PronunciationAnalysis;
  communication: CommunicationScore;
  feedback: AIFeedback;
  audio_url?: string;
  created_at?: string;
}
