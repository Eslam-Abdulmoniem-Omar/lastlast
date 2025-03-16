// User types
export interface User {
  id: string;
  email: string;
  name: string;
  profilePicture?: string;
  nativeLanguage?: string;
  targetLanguage?: string;
  currentLevel?: "beginner" | "intermediate" | "advanced";
}

// Podcast types
export interface Podcast {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  transcriptUrl: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  level: "beginner" | "intermediate" | "advanced";
  duration: number; // in seconds
  topics: string[];
  hostName: string;
  coverImageUrl?: string;
  publishedDate: string;
  questions: PodcastQuestion[];
  referenceAnswers: ReferenceAnswer[];
  dialogueSegments?: DialogueSegment[];
  isShort?: boolean;
  videoSource?: "youtube" | "tiktok";
}

export interface PodcastQuestion {
  id: string;
  text: string;
  timestamp: number; // in seconds
}

export interface ReferenceAnswer {
  questionId: string;
  text: string;
}

// User progress types
export interface UserProgress {
  userId: string;
  podcastId: string;
  listenedAt?: string;
  completedAt?: string;
  writingSubmission?: WritingSubmission;
  speakingSubmissions?: SpeakingSubmission[];
}

export interface WritingSubmission {
  text: string;
  submittedAt: string;
  feedback?: WritingFeedback;
}

export interface WritingFeedback {
  corrections: Correction[];
  suggestions: Suggestion[];
  overallFeedback: string;
  comparisonWithReference: string;
}

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}

export interface Suggestion {
  type: "vocabulary" | "structure";
  suggestion: string;
  reason: string;
}

export interface SpeakingSubmission {
  questionId: string;
  audioUrl?: string;
  transcribedText: string;
  submittedAt: string;
  feedback?: SpeakingFeedback;
}

export interface SpeakingFeedback {
  pronunciationScore: number; // 1-10
  fluencyScore: number; // 1-10
  intonationScore: number; // 1-10
  overallScore: number; // 1-10
  specificFeedback: PronunciationFeedbackItem[];
  generalAdvice: string;
}

export interface PronunciationFeedbackItem {
  word: string;
  issue: string;
  suggestion: string;
}

// Word translation types
export interface WordTranslation {
  originalWord: string;
  translation: string;
  contextualMeaning: string;
  note: string;
}

// New interfaces for dialogue segments
export interface DialogueSegment {
  id: string;
  speakerName: string;
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  vocabularyItems?: VocabularyItem[];
  // Fields for inline editing
  isEditing?: boolean;
  editText?: string;
  editStartTime?: number;
  editEndTime?: number;
}

export interface VocabularyItem {
  word: string;
  definition: string;
  exampleSentence: string;
  translation?: string;
}

// Timestamped dialogue line for interactive transcripts
export interface DialogueLine {
  id: string;
  text: string;
  startTime: number; // in seconds
  endTime?: number; // in seconds (optional)
}

// Add TikTok-related types
export interface TikTokTranscript {
  transcript: string | TikTokTranscriptEntry[];
  title?: string;
  language?: string;
}

export interface TikTokTranscriptEntry {
  text: string;
  start?: number;
  end?: number;
  confidence?: number;
}
