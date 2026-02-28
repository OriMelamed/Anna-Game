import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Question, Screen, SessionState } from '../types';

const initialState: SessionState = {
  currentScreen: 'settings',
  questions: [],
  currentQuestionIndex: 0,
  sessionId: '',
  isActive: false,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    startSession(
      state,
      action: PayloadAction<{ questions: Question[]; sessionId: string }>
    ) {
      state.questions = action.payload.questions;
      state.sessionId = action.payload.sessionId;
      state.isActive = true;
      state.currentScreen = 'practice';
      state.currentQuestionIndex = 0;
    },
    answerQuestion(
      state,
      action: PayloadAction<{ questionIndex: number; selectedAnswer: number }>
    ) {
      const { questionIndex, selectedAnswer } = action.payload;
      const question = state.questions[questionIndex];
      if (question) {
        question.selectedAnswer = selectedAnswer;
        question.isCorrect = selectedAnswer === question.correctAnswer;
      }
    },
    nextQuestion(state) {
      if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex += 1;
      } else {
        state.currentScreen = 'summary';
        state.isActive = false;
      }
    },
    goToScreen(state, action: PayloadAction<Screen>) {
      state.currentScreen = action.payload;
    },
    resetSession(state) {
      state.questions = [];
      state.currentQuestionIndex = 0;
      state.sessionId = '';
      state.isActive = false;
      state.currentScreen = 'settings';
    },
    markAnsweredLate(
      state,
      action: PayloadAction<{ questionIndex: number }>
    ) {
      const question = state.questions[action.payload.questionIndex];
      if (question) {
        question.answeredLate = true;
      }
    },
    timeExpired(
      state,
      action: PayloadAction<{ questionIndex: number }>
    ) {
      const question = state.questions[action.payload.questionIndex];
      if (question) {
        question.selectedAnswer = null;
        question.isCorrect = false;
        question.answeredLate = true;
      }
      if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex += 1;
      } else {
        state.currentScreen = 'summary';
        state.isActive = false;
      }
    },
  },
});

export const {
  startSession,
  answerQuestion,
  nextQuestion,
  goToScreen,
  resetSession,
  markAnsweredLate,
  timeExpired,
} = sessionSlice.actions;

export default sessionSlice.reducer;
