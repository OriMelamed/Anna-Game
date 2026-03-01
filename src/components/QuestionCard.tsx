import React, { useState } from 'react';
import type { Question } from '../types';
import { generateHint } from '../utils/hintGenerator';

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  onAnswer: (questionIndex: number, selectedAnswer: number) => void;
  disabled: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionIndex,
  onAnswer,
  disabled,
}) => {
  const [showHint, setShowHint] = useState(false);
  const answered = question.selectedAnswer !== null;

  // Reset hint when question changes
  React.useEffect(() => {
    setShowHint(false);
  }, [questionIndex]);

  const getOptionClass = (option: number): string => {
    const classes = ['option-btn'];

    if (answered) {
      if (option === question.selectedAnswer) {
        classes.push('option-btn--selected');
        classes.push(
          question.isCorrect ? 'option-btn--correct' : 'option-btn--incorrect'
        );
      }
      if (option === question.correctAnswer) {
        classes.push('option-btn--correct');
      }
    }

    return classes.join(' ');
  };

  const hint = generateHint(question);

  return (
    <div className="question-card">
      <div className="question-expression">
        {question.expression} = ❓
      </div>

      {!answered && (
        <button
          className={`hint-btn ${showHint ? 'hint-btn--active' : ''}`}
          onClick={() => setShowHint((prev) => !prev)}
          type="button"
        >
          {showHint ? '🙈 הסתר רמז' : '💡 רמז'}
        </button>
      )}

      {showHint && !answered && (
        <div className="hint-bubble animate-bounce-in">
          <span className="hint-bubble-text">{hint}</span>
        </div>
      )}

      <div className="options-grid">
        {question.options.map((option) => (
          <button
            key={option}
            className={getOptionClass(option)}
            onClick={() => onAnswer(questionIndex, option)}
            disabled={disabled}
          >
            {option}
            {answered && option === question.selectedAnswer && (
              <span style={{ marginInlineStart: '0.25rem' }}>
                {question.isCorrect ? ' ✅' : ' ❌'}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuestionCard;
