import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SettingsState, OperationType, DifficultyLevel } from '../types';

const initialState: SettingsState = {
  childName: '',
  maxResult: 100,
  operandCount: 2,
  questionCount: 10,
  operations: ['multiplication'],
  useParentheses: false,
  difficulty: 'easy',
  timerDuration: 10,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setChildName(state, action: PayloadAction<string>) {
      state.childName = action.payload;
    },
    setMaxResult(state, action: PayloadAction<number>) {
      state.maxResult = action.payload;
    },
    setOperandCount(state, action: PayloadAction<number>) {
      state.operandCount = action.payload;
      if (action.payload < 3) {
        state.useParentheses = false;
      }
    },
    toggleParentheses(state) {
      state.useParentheses = !state.useParentheses;
    },
    setQuestionCount(state, action: PayloadAction<number>) {
      state.questionCount = action.payload;
    },
    toggleOperation(state, action: PayloadAction<OperationType>) {
      const op = action.payload;
      const index = state.operations.indexOf(op);
      if (index >= 0) {
        // Don't allow removing the last operation — must have at least 1
        if (state.operations.length > 1) {
          state.operations.splice(index, 1);
        }
      } else {
        state.operations.push(op);
      }
    },
    setDifficulty(state, action: PayloadAction<DifficultyLevel>) {
      state.difficulty = action.payload;
    },
    setTimerDuration(state, action: PayloadAction<number>) {
      state.timerDuration = Math.max(5, Math.min(10, action.payload));
    },
    loadSettings(_state, action: PayloadAction<SettingsState>) {
      return action.payload;
    },
  },
});

export const {
  setChildName,
  setMaxResult,
  setOperandCount,
  setQuestionCount,
  toggleOperation,
  toggleParentheses,
  setDifficulty,
  setTimerDuration,
  loadSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
