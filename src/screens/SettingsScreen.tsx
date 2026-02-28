import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setChildName,
  setDifficulty,
  setMaxResult,
  setOperandCount,
  setQuestionCount,
  setTimerDuration,
  toggleOperation,
  toggleParentheses,
} from '../slices/settingsSlice';
import { startSession, goToScreen } from '../slices/sessionSlice';
import { generateSession } from '../utils/questionGenerator';
import type { DifficultyLevel, OperationType } from '../types';

const MAX_RESULT_OPTIONS = [50, 100, 500, 1000] as const;
const OPERAND_COUNT_OPTIONS = [2, 3, 4] as const;
const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20] as const;

const OPERATION_OPTIONS: { value: OperationType; emoji: string; label: string }[] = [
  { value: 'addition', emoji: '➕', label: 'חיבור' },
  { value: 'subtraction', emoji: '➖', label: 'חיסור' },
  { value: 'multiplication', emoji: '✖️', label: 'כפל' },
  { value: 'division', emoji: '➗', label: 'חילוק' },
];

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const { childName, difficulty, maxResult, operandCount, questionCount, operations, timerDuration, useParentheses } =
    useAppSelector((state) => state.settings);
  const parenthesesDisabled = operandCount < 3;
  const hasHistory = useAppSelector(
    (state) => state.history.sessions.length > 0,
  );

  const handleStart = () => {
    const sessionId = Date.now().toString();
    const questions = generateSession(
      { maxResult, operandCount, questionCount, operations, useParentheses, difficulty, timerDuration },
      sessionId,
    );
    dispatch(startSession({ questions, sessionId }));
  };

  return (
    <div className="settings-screen" dir="rtl">
      <h1 className="settings-title">🎯 תרגול חשבון 🧮</h1>
      <p className="settings-subtitle">!בחר הגדרות ובוא נתחיל</p>

      {/* Section 1: Personal Details */}
      <div className="settings-section">
        <h2 className="settings-section-header">👤 פרטים</h2>
        <div className="settings-field">
          <label className="settings-label">👤 שם (לא חובה)</label>
          <input
            className="settings-input"
            type="text"
            value={childName}
            onChange={(e) => dispatch(setChildName(e.target.value))}
            placeholder="הכנס שם..."
          />
        </div>
      </div>

      {/* Section 2: Practice Settings */}
      <div className="settings-section">
        <h2 className="settings-section-header">🎲 הגדרות תרגול</h2>

        {/* Operation types (multi-select) */}
        <div className="settings-field">
          <label className="settings-label">🎲 סוגי פעולה (ניתן לבחור כמה)</label>
          <div className="settings-operations-grid">
            {OPERATION_OPTIONS.map(({ value, emoji, label }) => (
              <button
                key={value}
                className={`settings-operation-btn${
                  operations.includes(value) ? ' settings-operation-btn--selected' : ''
                }`}
                onClick={() => dispatch(toggleOperation(value))}
              >
                <span className="settings-operation-emoji">{emoji}</span>
                <span className="settings-operation-text">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Max result */}
        <div className="settings-field">
          <label className="settings-label">📏 טווח תוצאות (עד)</label>
          <div className="settings-options">
            {MAX_RESULT_OPTIONS.map((value) => (
              <button
                key={value}
                className={`settings-option${
                  maxResult === value ? ' settings-option--selected' : ''
                }`}
                onClick={() => dispatch(setMaxResult(value))}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {/* Operand count + Question count side by side */}
        <div className="settings-row">
          <div className="settings-field" style={{ flex: 1 }}>
            <label className="settings-label">🔢 מספר מספרים</label>
            <div className="settings-options">
              {OPERAND_COUNT_OPTIONS.map((value) => (
                <button
                  key={value}
                  className={`settings-option${
                    operandCount === value ? ' settings-option--selected' : ''
                  }`}
                  onClick={() => dispatch(setOperandCount(value))}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-field" style={{ flex: 1 }}>
            <label className="settings-label">❓ מספר שאלות</label>
            <div className="settings-options">
              {QUESTION_COUNT_OPTIONS.map((value) => (
                <button
                  key={value}
                  className={`settings-option${
                    questionCount === value ? ' settings-option--selected' : ''
                  }`}
                  onClick={() => dispatch(setQuestionCount(value))}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Use parentheses toggle */}
        <div className="settings-toggle-row">
          <label className="settings-label">🔢 שימוש בסוגריים</label>
          <button
            className={`settings-toggle${useParentheses && !parenthesesDisabled ? ' settings-toggle--active' : ''}`}
            disabled={parenthesesDisabled}
            onClick={() => dispatch(toggleParentheses())}
            aria-label="Toggle parentheses"
          >
            <span className="settings-toggle-knob" />
          </button>
        </div>
        {parenthesesDisabled && (
          <span className="settings-note">נדרשים לפחות 3 מספרים</span>
        )}
      </div>

      {/* Section 3: Difficulty */}
      <div className="settings-section">
        <h2 className="settings-section-header">💪 רמת קושי</h2>

        {/* Difficulty level */}
        <div className="settings-field">
          <div className="settings-difficulty-options">
            {([
              { value: 'easy' as DifficultyLevel, emoji: '🟢', label: 'קל', desc: 'בלי שעון ⏰❌', color: 'easy' },
              { value: 'medium' as DifficultyLevel, emoji: '🟡', label: 'בינוני', desc: 'עם שעון ⏰', color: 'medium' },
              { value: 'hard' as DifficultyLevel, emoji: '🔴', label: 'קשה', desc: 'שעון אוטומטי ⏰💨', color: 'hard' },
            ]).map(({ value, emoji, label, desc, color }) => (
              <button
                key={value}
                className={`settings-difficulty-option settings-difficulty-option--${color}${
                  difficulty === value ? ' settings-difficulty-option--selected' : ''
                }`}
                onClick={() => dispatch(setDifficulty(value))}
              >
                <span className="settings-difficulty-emoji">{emoji}</span>
                <span className="settings-difficulty-label">{label}</span>
                <span className="settings-difficulty-desc">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Timer duration (hard only) */}
        {difficulty === 'hard' && (
          <div className="settings-field">
            <label className="settings-label">⏱️ זמן לשאלה (שניות)</label>
            <div className="settings-options">
              {([5, 6, 7, 8, 9, 10] as const).map((value) => (
                <button
                  key={value}
                  className={`settings-option${
                    timerDuration === value ? ' settings-option--selected' : ''
                  }`}
                  onClick={() => dispatch(setTimerDuration(value))}
                >
                  {value} שניות
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Start button */}
      <button className="settings-start-btn" onClick={handleStart}>
        🚀 התחל תרגול
      </button>

      {/* History button */}
      {hasHistory && (
        <button
          className="settings-history-btn"
          onClick={() => dispatch(goToScreen('summary'))}
        >
          📊 היסטוריית תרגולים
        </button>
      )}
    </div>
  );
}
