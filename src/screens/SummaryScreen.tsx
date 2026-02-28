import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { startSession, resetSession } from '../slices/sessionSlice';
import { addSession, clearHistory } from '../slices/historySlice';
import { generateSession } from '../utils/questionGenerator';
import { generateExplanation } from '../utils/explanationGenerator';
import type { OperationType, SessionRecord } from '../types';

const operationLabels: Record<OperationType, string> = {
  addition: 'חיבור',
  subtraction: 'חיסור',
  multiplication: 'כפל',
  division: 'חילוק',
};

function getFeedback(percentage: number): string {
  if (percentage === 100) return '🏆✨ מושלם! אלוף/ה! ✨🏆';
  if (percentage >= 80) return '🌟🎉 כל הכבוד! עבודה מצוינת! 🎉🌟';
  if (percentage >= 60) return '💪😊 לא רע! המשך לתרגל! 😊💪';
  return '🎯💪 צריך עוד תרגול, אל תוותר! 💪🎯';
}

export default function SummaryScreen() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((s) => s.session);
  const settings = useAppSelector((s) => s.settings);
  const history = useAppSelector((s) => s.history);
  const savedRef = useRef(false);

  const { questions, sessionId } = session;
  const { childName, maxResult, operandCount, questionCount, operations, useParentheses, difficulty, timerDuration } = settings;
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  const handleQuestionClick = (index: number) => {
    setExpandedQuestion(prev => prev === index ? null : index);
  };

  const hasSession = questions.length > 0;
  const score = questions.filter((q) => q.isCorrect).length;
  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const lateCount = questions.filter((q) => q.answeredLate).length;

  // Auto-save session to history on mount
  useEffect(() => {
    if (hasSession && !savedRef.current) {
      savedRef.current = true;
      const record: SessionRecord = {
        sessionId,
        timestamp: Date.now(),
        settings: { maxResult, operandCount, questionCount, operations, useParentheses, difficulty, timerDuration },
        questions,
        score,
        totalQuestions: total,
      };
      dispatch(addSession(record));
    }
  }, [hasSession, sessionId, maxResult, operandCount, questionCount, operations, useParentheses, difficulty, timerDuration, questions, score, total, dispatch]);

  const handlePracticeAgain = () => {
    const newId = crypto.randomUUID();
    const newQuestions = generateSession(
      { maxResult, operandCount, questionCount, operations, useParentheses, difficulty, timerDuration },
      newId,
    );
    dispatch(startSession({ questions: newQuestions, sessionId: newId }));
  };

  const handleBackToSettings = () => {
    dispatch(resetSession());
  };

  const handleClearHistory = () => {
    dispatch(clearHistory());
  };

  return (
    <div className="summary-screen" dir="rtl">
      {/* ── Session Results ── */}
      {hasSession && (
        <section className="summary-results">
          <h1 className="summary-title">🏆 סיכום תרגול 🏆</h1>

          {childName && (
            <p className="summary-greeting">🌟 כל הכבוד, {childName}! 🌟</p>
          )}

          <div className="summary-score">
            🏆 ציון: {score}/{total}
          </div>
          <div className="summary-percentage">({percentage}%)</div>

          {lateCount > 0 && (
            <div className="summary-late-count">⏰ {lateCount} תשובות אחרי הזמן</div>
          )}

          <p className="summary-feedback">{getFeedback(percentage)}</p>

          <div className="summary-questions">
            {questions.map((q, i) => {
              const isCorrect = q.isCorrect === true;
              const rowClassName = [
                'summary-question',
                isCorrect ? 'summary-question--correct' : 'summary-question--incorrect',
                expandedQuestion === i ? 'summary-question--expanded' : '',
              ].join(' ');

              return (
                <div key={i} className="summary-question-wrapper">
                  <div className={rowClassName} onClick={() => handleQuestionClick(i)} style={{ cursor: 'pointer' }}>
                    <span className="summary-expression">
                      {q.expression} = {q.correctAnswer}
                    </span>
                    <span className="summary-answer">
                      {q.answeredLate && q.selectedAnswer === null
                        ? '⏰ לא הספיק'
                        : <>תשובתך: {q.selectedAnswer ?? '—'}{q.answeredLate && q.selectedAnswer !== null && <span className="summary-question__late"> ⏰ (אחרי הזמן)</span>}</>}
                    </span>
                    {isCorrect ? (
                      <span className="summary-question__icon" style={{ color: 'green', fontSize: '1.5rem' }}>✅</span>
                    ) : (
                      <>
                        <span className="summary-question__icon" style={{ color: 'red', fontSize: '1.5rem' }}>❌</span>
                        <span className="summary-question__correct">
                          התשובה הנכונה: {q.correctAnswer}
                        </span>
                      </>
                    )}
                    <span className="summary-question__hint">
                      {expandedQuestion === i ? '🔼' : '💡'}
                    </span>
                  </div>
                  {expandedQuestion === i && (
                    <div className="summary-explanation animate-slide-up">
                      <div className="explanation-title">📝 איך פותרים?</div>
                      {generateExplanation(q).map((step, stepIdx) => (
                        <div key={stepIdx} className={`explanation-step${step.isLast ? ' explanation-step--final' : ''}`}>
                          <span className="explanation-step__emoji">{step.emoji}</span>
                          <span className="explanation-step__text">{step.text}</span>
                          <span className="explanation-step__calc">{step.calculation}{step.isLast ? ' ✅' : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="summary-actions">
            <button className="summary-btn summary-btn--primary" onClick={handlePracticeAgain}>🔄 תרגול נוסף</button>
            <button className="summary-btn summary-btn--secondary" onClick={handleBackToSettings}>⚙️ חזרה להגדרות</button>
          </div>
        </section>
      )}

      {/* ── If no active session, show a back button ── */}
      {!hasSession && (
        <div className="summary-empty">
          <h1 className="summary-title">🏆 סיכום תרגול 🏆</h1>
          <p>אין תוצאות להצגה</p>
          <button className="summary-btn summary-btn--secondary" onClick={handleBackToSettings}>⚙️ חזרה להגדרות</button>
        </div>
      )}

      {/* ── History Section ── */}
      {history.sessions.length > 0 && (
        <section className="summary-history">
          <h2>📊 היסטוריית תרגולים</h2>

          <div className="summary-history__list">
            {history.sessions.slice(0, 10).map((rec) => {
              const date = new Date(rec.timestamp);
              const dateStr = date.toLocaleDateString('he-IL');
              const timeStr = date.toLocaleTimeString('he-IL');
              const recPct = rec.totalQuestions > 0
                ? Math.round((rec.score / rec.totalQuestions) * 100)
                : 0;

              return (
                <div key={rec.sessionId} className="summary-history-item">
                  <span className="summary-history__date">{dateStr} {timeStr}</span>
                  <span className="summary-history__settings">
                    סוג: {Array.isArray(rec.settings.operations)
                      ? rec.settings.operations.map(op => operationLabels[op]).join(', ')
                      : operationLabels[(rec.settings as any).operation as OperationType] ?? 'כפל'}, טווח: {rec.settings.maxResult}, מספרים: {rec.settings.operandCount}
                  </span>
                  <span className="summary-history__score">
                    ציון: {rec.score}/{rec.totalQuestions} ({recPct}%)
                  </span>
                </div>
              );
            })}
          </div>

          <button className="summary-clear-btn" onClick={handleClearHistory}>🗑️ נקה היסטוריה</button>
        </section>
      )}
    </div>
  );
}
