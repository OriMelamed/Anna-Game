export type OperationType = 'addition' | 'subtraction' | 'multiplication' | 'division';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface Question {
  operands: number[];
  operators: OperationType[];  // N-1 operators between N operands
  expression: string;          // Pre-formatted expression string like "2 + 4 × 5"
  correctAnswer: number;
  options: number[];
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  hasParentheses?: boolean;
  answeredLate?: boolean;
}

export interface SessionSettings {
  maxResult: number;
  operandCount: number;
  questionCount: number;
  operations: OperationType[];
  useParentheses: boolean;
  difficulty: DifficultyLevel;
  timerDuration: number;
}

export interface SessionRecord {
  sessionId: string;
  timestamp: number;
  settings: SessionSettings;
  questions: Question[];
  score: number;
  totalQuestions: number;
}

export type Screen = 'settings' | 'practice' | 'summary';

export interface SettingsState {
  childName: string;
  maxResult: number;
  operandCount: number;
  questionCount: number;
  operations: OperationType[];
  useParentheses: boolean;
  difficulty: DifficultyLevel;
  timerDuration: number;
}

export interface SessionState {
  currentScreen: Screen;
  questions: Question[];
  currentQuestionIndex: number;
  sessionId: string;
  isActive: boolean;
}

export interface HistoryState {
  sessions: SessionRecord[];
}

export interface RootState {
  settings: SettingsState;
  session: SessionState;
  history: HistoryState;
}
