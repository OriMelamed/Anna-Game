import { configureStore } from '@reduxjs/toolkit';
import type { RootState, OperationType } from '../types';
import settingsReducer from '../slices/settingsSlice';
import sessionReducer from '../slices/sessionSlice';
import historyReducer from '../slices/historySlice';
import { loadSettings } from '../slices/settingsSlice';
import { loadHistory } from '../slices/historySlice';

const STORAGE_KEY = 'mathGameState';
const CURRENT_VERSION = 1;

interface PersistedData {
  version: number;
  settings: RootState['settings'];
  history: RootState['history'];
}

function loadState(): PersistedData | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as Partial<PersistedData>;

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      parsed.version !== CURRENT_VERSION
    ) {
      return undefined;
    }

    if (
      parsed.settings &&
      typeof parsed.settings.childName === 'string' &&
      typeof parsed.settings.maxResult === 'number' &&
      typeof parsed.settings.operandCount === 'number' &&
      typeof parsed.settings.questionCount === 'number' &&
      parsed.history &&
      Array.isArray(parsed.history.sessions)
    ) {
      // Backward compat: migrate old `operation` (string) to `operations` (array)
      if (!Array.isArray(parsed.settings.operations)) {
        const oldOp = (parsed.settings as any).operation;
        parsed.settings.operations = oldOp && oldOp !== 'mixed'
          ? [oldOp]
          : ['multiplication'];
        delete (parsed.settings as any).operation;
      }

      // Backward compat: add useParentheses if missing
      if (typeof parsed.settings.useParentheses !== 'boolean') {
        parsed.settings.useParentheses = false;
      }

      // Backward compat: add difficulty if missing or invalid
      if (!parsed.settings.difficulty || !['easy', 'medium', 'hard'].includes(parsed.settings.difficulty)) {
        parsed.settings.difficulty = 'easy';
      }

      // Backward compat: add timerDuration if missing or not a number
      if (typeof parsed.settings.timerDuration !== 'number') {
        parsed.settings.timerDuration = 10;
      }

      // Backward compat: migrate old session records
      for (const rec of parsed.history.sessions) {
        if (rec && rec.settings && !Array.isArray(rec.settings.operations)) {
          const oldOp = (rec.settings as any).operation;
          rec.settings.operations = oldOp && oldOp !== 'mixed'
            ? [oldOp]
            : ['multiplication'];
          delete (rec.settings as any).operation;
        }

        // Backward compat: add useParentheses to session settings if missing
        if (typeof rec.settings.useParentheses !== 'boolean') {
          rec.settings.useParentheses = false;
        }

        // Backward compat: add difficulty to session settings if missing
        if (!rec.settings.difficulty) {
          rec.settings.difficulty = 'easy';
        }

        // Backward compat: add timerDuration to session settings if missing
        if (typeof rec.settings.timerDuration !== 'number') {
          rec.settings.timerDuration = 10;
        }

        // Migrate old question format: operation (string) → operators (array) + expression (string)
        for (const q of rec.questions) {
          if (!Array.isArray(q.operators)) {
            const oldOp = (q as any).operation as OperationType;
            q.operators = Array(q.operands.length - 1).fill(oldOp || 'multiplication');
            const symbols: Record<string, string> = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' };
            const sym = symbols[oldOp] || '×';
            q.expression = q.operands.join(` ${sym} `);
            delete (q as any).operation;
          }
        }
      }

      return parsed as PersistedData;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function saveState(state: RootState): void {
  try {
    const data: PersistedData = {
      version: CURRENT_VERSION,
      settings: state.settings,
      history: state.history,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Silently ignore write errors (e.g. quota exceeded)
  }
}

const store = configureStore({
  reducer: {
    settings: settingsReducer,
    session: sessionReducer,
    history: historyReducer,
  },
});

// Hydrate from localStorage
const persisted = loadState();
if (persisted) {
  store.dispatch(loadSettings(persisted.settings));
  store.dispatch(loadHistory(persisted.history.sessions));
}

// Subscribe with throttle (1 second)
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

store.subscribe(() => {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveState(store.getState() as RootState);
    saveTimeout = null;
  }, 1000);
});

export type AppDispatch = typeof store.dispatch;
export default store;
