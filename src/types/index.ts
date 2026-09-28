export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export type GameStatus =
  | 'DRAFT'
  | 'READY'
  | 'LOBBY'
  | 'COUNTDOWN'
  | 'LIVE'
  | 'PAUSED'
  | 'QUESTION_LOCKED'
  | 'QUESTION_RESULTS'
  | 'COMPLETED'
  | 'ARCHIVED';

export type LeaderboardVisibility =
  | 'HIDDEN'
  | 'AFTER_EACH'
  | 'EVERY_5'
  | 'HOST_ONLY'
  | 'FINAL_ONLY';

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'CODE_ANALYSIS' | 'FAST_TRIVIA';

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  category: string;
  difficulty: QuestionDifficulty;
  questionType?: QuestionType; // 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'CODE_ANALYSIS' | 'FAST_TRIVIA'
  points: number;
  timeLimit: number; // in seconds, default 5
  sourceDocument?: string;
  sourcePage?: number;
  status: QuestionStatus;
  createdAt: string;
}

export interface QuizEvent {
  id: string;
  name: string;
  description: string;
  eventDate: string;
  endDate?: string;
  logoUrl?: string;
  coverImage?: string;
  organizerInfo: {
    name: string;
    email: string;
  };
  visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  status: EventStatus;
  gameIds: string[];
  createdAt: string;
}

export interface QuizGame {
  id: string;
  eventId: string;
  name: string;
  description: string;
  joinCode: string;
  status: GameStatus;
  questionIds: string[];
  timePerQuestion: number; // default 5 seconds
  customQuestionTimeLimits?: Record<string, number>; // per-question custom time limits (e.g. { "q-1": 10, "q-2": 30 })
  difficultyTimeLimits?: {
    EASY?: number;
    MEDIUM?: number;
    HARD?: number;
  };
  questionTypeTimeLimits?: {
    MULTIPLE_CHOICE?: number;
    TRUE_FALSE?: number;
    CODE_ANALYSIS?: number;
    FAST_TRIVIA?: number;
  };
  pointsPerCorrect: number; // default 1
  leaderboardVisibility: LeaderboardVisibility;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  maxParticipants: number; // default 500, up to 10000
  currentQuestionIndex: number;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface Participant {
  id: string;
  gameId: string;
  eventId?: string;
  firstName: string;
  username: string;
  joinedAt: string;
  isConnected: boolean;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  totalResponseTimeMs: number;
  lastActiveAt: string;
}

export interface ParticipantAnswer {
  participantId: string;
  gameId: string;
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
  responseTimeMs: number;
  isCorrect: boolean;
  pointsAwarded: number;
  submittedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  page: number;
  section: string;
  text: string;
}

export interface DocumentItem {
  id: string;
  filename: string;
  size: number;
  uploadDate: string;
  status: 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';
  pageCount: number;
  textExtractionStatus: 'SUCCESS' | 'PARTIAL' | 'PENDING' | 'FAILED';
  chunks: DocumentChunk[];
  questionsGeneratedCount: number;
}

export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  firstName: string;
  username: string;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  accuracy: number; // percentage 0 - 100
  avgResponseTimeMs: number;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  actor: string;
}

// Client-safe question payload delivered during active question
export interface ClientQuestion {
  id: string;
  number: number;
  total: number;
  text: string;
  options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  category: string;
  difficulty: QuestionDifficulty;
  points: number;
  timeLimit: number;
  startTime: number; // server timestamp (ms)
  endTime: number;   // server timestamp (ms)
}

// Authoritative Realtime Room State
export interface RealtimeRoomState {
  gameId: string;
  joinCode: string;
  gameStatus: GameStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: ClientQuestion | null;
  serverTime: number;
  startTime?: number;
  endTime?: number;
  countdownSeconds?: number;
  answeredCount: number;
  connectedParticipantsCount: number;
  hostAnnouncement?: string;
  leaderboardVisible: boolean;
  revealedResult?: {
    questionId: string;
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    explanation: string;
    optionStats: Record<'A' | 'B' | 'C' | 'D', number>;
  };
  leaderboard: LeaderboardEntry[];
}
