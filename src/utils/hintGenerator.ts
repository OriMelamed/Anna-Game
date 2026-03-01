import type { Question, OperationType } from '../types';

const OP_NAMES: Record<OperationType, string> = {
  addition: 'חיבור',
  subtraction: 'חיסור',
  multiplication: 'כפל',
  division: 'חילוק',
};

const OP_SYMBOLS: Record<OperationType, string> = {
  addition: '+',
  subtraction: '\u2212',
  multiplication: '\u00D7',
  division: '\u00F7',
};

/**
 * Extract the first parenthesized sub-expression from the expression string.
 * Returns the content inside the first pair of parentheses, or null if none.
 */
function extractFirstParenGroup(expression: string): string | null {
  const match = expression.match(/\(([^()]+)\)/);
  return match ? match[1].trim() : null;
}

/**
 * Count the number of parenthesized groups in an expression.
 */
function countParenGroups(expression: string): number {
  const matches = expression.match(/\([^()]+\)/g);
  return matches ? matches.length : 0;
}

/**
 * Find the first high-priority (× or ÷) operation in the operands/operators.
 * Returns the sub-expression string like "5 × 2".
 */
function findFirstHighPriorityOp(
  operands: number[],
  operators: OperationType[],
): { opName: string; subExpr: string } | null {
  for (let i = 0; i < operators.length; i++) {
    if (operators[i] === 'multiplication' || operators[i] === 'division') {
      const symbol = OP_SYMBOLS[operators[i]];
      const name = OP_NAMES[operators[i]];
      return {
        opName: name,
        subExpr: `${operands[i]} ${symbol} ${operands[i + 1]}`,
      };
    }
  }
  return null;
}

/**
 * Generate a hint for a math question.
 * The hint tells the kid where to start solving.
 */
export function generateHint(question: Question): string {
  const { operands, operators, expression, hasParentheses } = question;

  // Single operation (2 operands) — just name the operation
  if (operators.length === 1) {
    const opName = OP_NAMES[operators[0]];
    return `💡 זהו תרגיל ${opName}!`;
  }

  // Has parentheses — point to the first paren group
  if (hasParentheses) {
    const firstGroup = extractFirstParenGroup(expression);
    if (firstGroup) {
      const groupCount = countParenGroups(expression);
      if (groupCount > 1) {
        return `💡 התחל מהסוגריים הראשונים: ${firstGroup}`;
      }
      return `💡 התחל מהסוגריים: ${firstGroup}`;
    }
  }

  // Mixed operations — point to the first × or ÷
  const highPriority = findFirstHighPriorityOp(operands, operators);
  if (highPriority) {
    const hasLowPriority = operators.some(
      (op) => op === 'addition' || op === 'subtraction',
    );
    if (hasLowPriority) {
      // Mixed: explain why we start with × or ÷
      return `💡 התחל מה${highPriority.opName}: ${highPriority.subExpr}`;
    }
    // All high priority — solve left to right
    return `💡 פתור משמאל לימין: ${highPriority.subExpr}`;
  }

  // Only + and − → left to right
  const symbol = OP_SYMBOLS[operators[0]];
  const opName = OP_NAMES[operators[0]];
  const firstOp = `${operands[0]} ${symbol} ${operands[1]}`;
  return `💡 התחל מה${opName}: ${firstOp}`;
}
