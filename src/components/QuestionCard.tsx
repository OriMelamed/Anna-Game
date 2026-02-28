import React from 'react';
import type { Question } from '../types';

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
  const answered = question.selectedAnswer !== null;

  const getOptionClass = (option: number): string => {
    const classes = ['option-btn'];

    if (answered) {
      if (option === question.selectedAnswer) {
        classes.push('option-btn--selected');
        classes.push(
          question.isCorrect ? 'option-btn--correct' : 'option-btn--incorrect'
        );
      }
      // Always highlight the correct answer in green (so the child learns)
      if (option === question.correctAnswer) {
        classes.push('option-btn--correct');
      }
    }

    return classes.join(' ');
  };

  return (
    <div className="question-card">
      <div className="question-expression">
        {question.expression} = ❓
      </div>
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
