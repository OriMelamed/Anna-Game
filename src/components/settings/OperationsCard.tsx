import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleOperation } from '../../slices/settingsSlice';
import type { OperationType } from '../../types';

const OPERATION_OPTIONS: { value: OperationType; emoji: string; label: string }[] = [
  { value: 'addition', emoji: '➕', label: 'חיבור' },
  { value: 'subtraction', emoji: '➖', label: 'חיסור' },
  { value: 'multiplication', emoji: '✖️', label: 'כפל' },
  { value: 'division', emoji: '➗', label: 'חילוק' },
];

export default function OperationsCard() {
  const dispatch = useAppDispatch();
  const operations = useAppSelector((state) => state.settings.operations);

  return (
    <div className="settings-card settings-card--operations">
      <h2 className="settings-card-header">🎲 סוגי פעולה</h2>
      <p className="settings-card-hint">ניתן לבחור כמה שרוצים</p>
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
  );
}
