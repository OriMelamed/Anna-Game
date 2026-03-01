import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setMaxResult,
  setOperandCount,
  setQuestionCount,
  toggleParentheses,
} from '../../slices/settingsSlice';

const RANGE_OPTIONS = [
  { value: 50, emoji: '🐣', label: 'קל' },
  { value: 100, emoji: '🐥', label: 'בינוני' },
  { value: 500, emoji: '🦅', label: 'גדול' },
  { value: 1000, emoji: '🚀', label: 'ענק' },
] as const;

const OPERAND_OPTIONS = [2, 3, 4] as const;
const QUESTION_OPTIONS = [5, 10, 15, 20] as const;

export default function NumbersCard() {
  const dispatch = useAppDispatch();
  const { maxResult, operandCount, questionCount, useParentheses } =
    useAppSelector((state) => state.settings);
  const parenthesesDisabled = operandCount < 3;

  return (
    <div className="settings-card settings-card--numbers">
      <h2 className="settings-card-header">🔢 הגדרות מספרים</h2>

      {/* Max result range */}
      <div className="numbers-section">
        <label className="numbers-section-label">📏 טווח תוצאות (עד)</label>
        <div className="numbers-range-grid">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`numbers-range-card${maxResult === opt.value ? ' numbers-range-card--selected' : ''}`}
              onClick={() => dispatch(setMaxResult(opt.value))}
            >
              <span className="numbers-range-emoji">{opt.emoji}</span>
              <span className="numbers-range-value">{opt.value}</span>
              <span className="numbers-range-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Operand count */}
      <div className="numbers-section">
        <label className="numbers-section-label">🧮 כמה מספרים בתרגיל?</label>
        <div className="numbers-pills">
          {OPERAND_OPTIONS.map((value) => (
            <button
              key={value}
              className={`numbers-pill${operandCount === value ? ' numbers-pill--selected' : ''}`}
              onClick={() => dispatch(setOperandCount(value))}
            >
              <span className="numbers-pill-number">{value}</span>
              <span className="numbers-pill-text">מספרים</span>
            </button>
          ))}
        </div>
      </div>

      {/* Question count */}
      <div className="numbers-section">
        <label className="numbers-section-label">❓ כמה שאלות?</label>
        <div className="numbers-pills">
          {QUESTION_OPTIONS.map((value) => (
            <button
              key={value}
              className={`numbers-pill${questionCount === value ? ' numbers-pill--selected' : ''}`}
              onClick={() => dispatch(setQuestionCount(value))}
            >
              <span className="numbers-pill-number">{value}</span>
              <span className="numbers-pill-text">שאלות</span>
            </button>
          ))}
        </div>
      </div>

      {/* Parentheses toggle */}
      <div className="numbers-paren-section">
        <div className="numbers-paren-header">
          <label className="numbers-section-label">✨ שימוש בסוגריים</label>
          <button
            className={`settings-toggle${useParentheses && !parenthesesDisabled ? ' settings-toggle--active' : ''}`}
            disabled={parenthesesDisabled}
            onClick={() => dispatch(toggleParentheses())}
            aria-label="Toggle parentheses"
          >
            <span className="settings-toggle-knob" />
          </button>
        </div>
        <div className="numbers-paren-example">
          <span className="numbers-paren-example-text">(2 + 3) × 4 = 20</span>
        </div>
        {parenthesesDisabled && (
          <span className="numbers-paren-note">⚠️ נדרשים לפחות 3 מספרים</span>
        )}
      </div>
    </div>
  );
}
