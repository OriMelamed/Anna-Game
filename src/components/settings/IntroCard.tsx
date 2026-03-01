import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setChildName } from '../../slices/settingsSlice';

export default function IntroCard() {
  const dispatch = useAppDispatch();
  const childName = useAppSelector((state) => state.settings.childName);

  return (
    <div className="settings-card settings-card--intro">
      <h1 className="settings-title">🎯 תרגול חשבון 🧮</h1>
      <p className="settings-subtitle">בחר הגדרות ובוא נתחיל!</p>
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
  );
}
