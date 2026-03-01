import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setDifficulty, setTimerDuration } from '../../slices/settingsSlice';
import type { DifficultyLevel } from '../../types';

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; emoji: string; label: string; desc: string; color: string }[] = [
  { value: 'easy', emoji: '🟢', label: 'קל', desc: 'בלי שעון ⏰❌', color: 'easy' },
  { value: 'medium', emoji: '🟡', label: 'בינוני', desc: 'עם שעון ⏰', color: 'medium' },
  { value: 'hard', emoji: '🔴', label: 'קשה', desc: 'שעון אוטומטי ⏰💨', color: 'hard' },
];

const TIMER_OPTIONS = [5, 6, 7, 8, 9, 10] as const;

export default function DifficultyCard() {
  const dispatch = useAppDispatch();
  const { difficulty, timerDuration } = useAppSelector((state) => state.settings);

  return (
    <div className="settings-card settings-card--difficulty">
      <h2 className="settings-card-header">💪 רמת קושי</h2>

      <div className="settings-difficulty-options">
        {DIFFICULTY_OPTIONS.map(({ value, emoji, label, desc, color }) => (
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

      {difficulty === 'hard' && (
        <div className="settings-field" style={{ marginTop: '1rem' }}>
          <label className="settings-label">⏱️ זמן לשאלה (שניות)</label>
          <div className="settings-options">
            {TIMER_OPTIONS.map((value) => (
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
  );
}
