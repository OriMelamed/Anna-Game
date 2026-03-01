import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { startSession, goToScreen } from '../slices/sessionSlice';
import { generateSession } from '../utils/questionGenerator';
import IntroCard from '../components/settings/IntroCard';
import OperationsCard from '../components/settings/OperationsCard';
import NumbersCard from '../components/settings/NumbersCard';
import DifficultyCard from '../components/settings/DifficultyCard';

const STEP_LABELS = ['👋 ברוכים הבאים', '➕ פעולות חשבון', '🔢 הגדרות מספרים', '🎯 רמת קושי'];
const TOTAL_STEPS = STEP_LABELS.length;

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const hasHistory = useAppSelector(
    (state) => state.history.sessions.length > 0,
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'next' | 'back'>('next');

  const handleStart = () => {
    const sessionId = Date.now().toString();
    const { maxResult, operandCount, questionCount, operations, useParentheses, difficulty, timerDuration } = settings;
    const questions = generateSession(
      { maxResult, operandCount, questionCount, operations, useParentheses, difficulty, timerDuration },
      sessionId,
    );
    dispatch(startSession({ questions, sessionId }));
  };

  const goNext = () => {
    setDirection('next');
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => {
    setDirection('back');
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const stepCards = [<IntroCard />, <OperationsCard />, <NumbersCard />, <DifficultyCard />];

  return (
    <div className="settings-screen" dir="rtl">
      {/* Step label */}
      <h2 className="wizard-step-label">{STEP_LABELS[currentStep]}</h2>

      {/* Step indicator dots */}
      <div className="wizard-steps">
        {[0, 1, 2, 3].map((step) => (
          <div
            key={step}
            className={`wizard-dot ${currentStep === step ? 'wizard-dot--active' : ''}`}
          />
        ))}
      </div>

      {/* Current card with slide animation */}
      <div
        key={currentStep}
        className={`wizard-card-container wizard-slide-${direction}`}
      >
        {stepCards[currentStep]}
      </div>

      {/* Navigation buttons */}
      <div className="wizard-nav">
        {currentStep > 0 && (
          <button className="wizard-btn wizard-btn--back" onClick={goBack}>
            ➜ חזרה
          </button>
        )}
        {currentStep < TOTAL_STEPS - 1 ? (
          <button className="wizard-btn wizard-btn--next" onClick={goNext}>
            המשך ➜
          </button>
        ) : (
          <button className="settings-start-btn" onClick={handleStart}>
            🚀 התחל תרגול
          </button>
        )}
      </div>

      {/* History button — shown on intro step */}
      {currentStep === 0 && hasHistory && (
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
