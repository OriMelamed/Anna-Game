import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { answerQuestion, nextQuestion, markAnsweredLate, timeExpired } from '../slices/sessionSlice';
import QuestionCard from '../components/QuestionCard';

const CORRECT_MESSAGES = ['🎉 מעולה!', '🌟 נכון!', '👏 יופי!', '💪 כל הכבוד!', '🎊 מדהים!', '🌈 בול!'];
const INCORRECT_MESSAGES = ['🤔 לא נורא, נסה שוב בפעם הבאה!', '💪 ממשיכים!', '🎯 בפעם הבאה!', '😊 קרוב!', '🌟 לומדים מטעויות!'];

const HARD_AUTO_ADVANCE_DELAY = 1500; // ms to show feedback before auto-advancing

const PracticeScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const questions = useAppSelector((state) => state.session.questions);
  const currentQuestionIndex = useAppSelector(
    (state) => state.session.currentQuestionIndex
  );
  const difficulty = useAppSelector((state) => state.settings.difficulty);
  const timerDuration = useAppSelector((state) => state.settings.timerDuration);

  const effectiveDuration =
    difficulty === 'easy' ? 0 : difficulty === 'medium' ? 15 : timerDuration;

  const [timeLeft, setTimeLeft] = useState(effectiveDuration);
  const [timerExpired, setTimerExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handledTimeoutRef = useRef<number>(-1); // tracks which question index we already handled timeout for
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const answered = currentQuestion?.selectedAnswer !== null;
  const hardTimedOut = difficulty === 'hard' && timerExpired && currentQuestion?.answeredLate === true;

  // Cleanup auto-advance timeout on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
    };
  }, []);

  // Reset timer when question changes
  useEffect(() => {
    setTimeLeft(effectiveDuration);
    setTimerExpired(false);
    // Clear any pending auto-advance from previous question
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  }, [currentQuestionIndex, effectiveDuration]);

  // Timer countdown logic
  useEffect(() => {
    if (difficulty === 'easy' || answered || timerExpired || hardTimedOut) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [difficulty, answered, timerExpired, hardTimedOut, currentQuestionIndex]);

  // Handle timer reaching 0
  useEffect(() => {
    if (timeLeft === 0 && !timerExpired && difficulty !== 'easy') {
      // Guard against double-dispatch for the same question
      if (handledTimeoutRef.current === currentQuestionIndex) return;
      handledTimeoutRef.current = currentQuestionIndex;

      setTimerExpired(true);
      if (difficulty === 'medium') {
        dispatch(markAnsweredLate({ questionIndex: currentQuestionIndex }));
      } else if (difficulty === 'hard') {
        dispatch(timeExpired({ questionIndex: currentQuestionIndex }));
        // Auto-advance after a brief delay so the kid sees feedback
        autoAdvanceRef.current = setTimeout(() => {
          dispatch(nextQuestion());
          autoAdvanceRef.current = null;
        }, HARD_AUTO_ADVANCE_DELAY);
      }
    }
  }, [timeLeft, timerExpired, difficulty, currentQuestionIndex, dispatch]);

  const encourageMessage = answered
    ? currentQuestion.isCorrect
      ? currentQuestion.answeredLate
        ? '⏰ נכון, אבל אחרי הזמן!'
        : CORRECT_MESSAGES[currentQuestionIndex % CORRECT_MESSAGES.length]
      : INCORRECT_MESSAGES[currentQuestionIndex % INCORRECT_MESSAGES.length]
    : hardTimedOut
      ? '⏰ הזמן נגמר!'
      : null;

  const handleAnswer = useCallback(
    (questionIndex: number, selectedAnswer: number) => {
      dispatch(answerQuestion({ questionIndex, selectedAnswer }));
      if (timerExpired && difficulty === 'medium') {
        dispatch(markAnsweredLate({ questionIndex }));
      }
    },
    [dispatch, timerExpired, difficulty]
  );

  const handleNext = useCallback(() => {
    dispatch(nextQuestion());
  }, [dispatch]);

  if (!currentQuestion) return null;

  const timerProgress = effectiveDuration > 0 ? timeLeft / effectiveDuration : 0;
  const timerClassNames = [
    'practice-timer',
    timerExpired ? 'practice-timer--expired' : '',
    !timerExpired && timeLeft <= 3 ? 'practice-timer--warning' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="practice-screen">
      <div className="practice-progress">
        ⭐ שאלה {currentQuestionIndex + 1} מתוך {totalQuestions}
      </div>

      {difficulty !== 'easy' && (
        <div className={timerClassNames}>
          <div
            className="practice-timer-circle"
            style={{ '--timer-progress': timerProgress } as React.CSSProperties}
          >
            <span className="practice-timer-number">{timeLeft}</span>
          </div>
        </div>
      )}

      {difficulty === 'medium' && timerExpired && !answered && (
        <div className="practice-timer-late-msg">
          ⏰ הזמן נגמר! אבל אפשר עדיין לענות
        </div>
      )}

      <QuestionCard
        question={currentQuestion}
        questionIndex={currentQuestionIndex}
        onAnswer={handleAnswer}
        disabled={answered || hardTimedOut}
      />

      {encourageMessage && (
        <div className="practice-encourage animate-bounce-in">
          {encourageMessage}
        </div>
      )}

      {answered && !hardTimedOut && (
        <button className="practice-next-btn" onClick={handleNext}>
          {isLastQuestion ? '🏁 סיום' : 'הבא ➡️'}
        </button>
      )}
    </div>
  );
};

export default PracticeScreen;
