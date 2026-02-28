import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { HistoryState, SessionRecord } from '../types';

const initialState: HistoryState = {
  sessions: [],
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    addSession(state, action: PayloadAction<SessionRecord>) {
      state.sessions.unshift(action.payload);
      if (state.sessions.length > 10) {
        state.sessions = state.sessions.slice(0, 10);
      }
    },
    loadHistory(state, action: PayloadAction<SessionRecord[]>) {
      state.sessions = action.payload;
    },
    clearHistory(state) {
      state.sessions = [];
    },
  },
});

export const { addSession, loadHistory, clearHistory } = historySlice.actions;

export default historySlice.reducer;
