import type { Question, OperationType } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExplanationStep {
  emoji: string;
  text: string;
  calculation: string;
  isLast: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OP_SYMBOLS: Record<OperationType, string> = {
  addition: '+',
  subtraction: '\u2212',
  multiplication: '\u00D7',
  division: '\u00F7',
};

const OP_NAMES: Record<OperationType, string> = {
  addition: 'חיבור',
  subtraction: 'חיסור',
  multiplication: 'כפל',
  division: 'חילוק',
};

const SYMBOL_TO_OP: Record<string, OperationType> = {
  '+': 'addition',
  '\u2212': 'subtraction',
  '\u00D7': 'multiplication',
  '\u00F7': 'division',
};

const PAREN_ORDINALS: readonly string[] = ['ראשונים', 'שניים', 'שלישיים'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyOp(left: number, op: OperationType, right: number): number {
  switch (op) {
    case 'addition':       return left + right;
    case 'subtraction':    return left - right;
    case 'multiplication': return left * right;
    case 'division':       return left / right;
  }
}

function opSymbol(op: OperationType): string {
  return OP_SYMBOLS[op];
}

function isHighPriority(op: OperationType): boolean {
  return op === 'multiplication' || op === 'division';
}

/** Parse a flat expression string (no parentheses) into operands & operators. */
function parseSimpleExpression(expr: string): {
  operands: number[];
  operators: OperationType[];
} {
  const tokens = expr.trim().split(/\s+/);
  const operands: number[] = [];
  const operators: OperationType[] = [];

  for (let i = 0; i < tokens.length; i++) {
    if (i % 2 === 0) {
      operands.push(Number(tokens[i]));
    } else {
      const op = SYMBOL_TO_OP[tokens[i]];
      if (op !== undefined) {
        operators.push(op);
      }
    }
  }

  return { operands, operators };
}

/** Evaluate a flat list of operands/operators respecting PEMDAS. */
function evaluateFlat(operands: number[], operators: OperationType[]): number {
  const vals = [...operands];
  const ops = [...operators];

  // Phase 1: × ÷
  let i = 0;
  while (i < ops.length) {
    if (isHighPriority(ops[i])) {
      vals.splice(i, 2, applyOp(vals[i], ops[i], vals[i + 1]));
      ops.splice(i, 1);
    } else {
      i++;
    }
  }

  // Phase 2: + −
  let result = vals[0];
  for (let j = 0; j < ops.length; j++) {
    result = applyOp(result, ops[j], vals[j + 1]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Step generators
// ---------------------------------------------------------------------------

/**
 * Generate explanation steps for a flat (no-paren) operand/operator sequence,
 * respecting PEMDAS order.
 *
 * @param vals  Mutable copy of operand values.
 * @param ops   Mutable copy of operators.
 * @param style 'pemdas' → top-level call; 'continuation' → after paren steps.
 */
function generatePEMDASSteps(
  vals: number[],
  ops: OperationType[],
  style: 'pemdas' | 'continuation',
): ExplanationStep[] {
  const steps: ExplanationStep[] = [];
  const hasHigh = ops.some(isHighPriority);
  const hasLow  = ops.some(op => !isHighPriority(op));
  const mixed   = hasHigh && hasLow;

  // ── All same priority → left-to-right ──────────────────────────
  if (style === 'pemdas' && !mixed) {
    steps.push({
      emoji: '🔢',
      text: 'מחשבים משמאל לימין:',
      calculation: '',
      isLast: false,
    });

    while (ops.length > 0) {
      const result = applyOp(vals[0], ops[0], vals[1]);
      steps.push({
        emoji: '➡️',
        text: '',
        calculation: `${vals[0]} ${opSymbol(ops[0])} ${vals[1]} = ${result}`,
        isLast: ops.length === 1,
      });
      vals.splice(0, 2, result);
      ops.splice(0, 1);
    }

    return steps;
  }

  // ── Mixed priority / continuation ──────────────────────────────
  let isFirstHigh = true;
  let isFirstLow  = true;
  let stepIdx     = 0;

  // Phase 1: resolve × and ÷ left-to-right
  let idx = 0;
  while (idx < ops.length) {
    if (isHighPriority(ops[idx])) {
      const result = applyOp(vals[idx], ops[idx], vals[idx + 1]);
      const calc   = `${vals[idx]} ${opSymbol(ops[idx])} ${vals[idx + 1]} = ${result}`;

      let text: string;
      let emoji: string;
      if (style === 'continuation') {
        text  = stepIdx === 0
          ? `עכשיו ${OP_NAMES[ops[idx]]}:`
          : `ואז ${OP_NAMES[ops[idx]]}:`;
        emoji = '➡️';
      } else {
        text  = isFirstHigh
          ? `קודם ${OP_NAMES[ops[idx]]}:`
          : `ואז ${OP_NAMES[ops[idx]]}:`;
        emoji = isFirstHigh ? '🔢' : '➡️';
      }

      steps.push({ emoji, text, calculation: calc, isLast: ops.length === 1 });

      vals.splice(idx, 2, result);
      ops.splice(idx, 1);
      isFirstHigh = false;
      stepIdx++;
      // don't increment idx — check new element at same position
    } else {
      idx++;
    }
  }

  // Phase 2: resolve + and − left-to-right
  while (ops.length > 0) {
    const result = applyOp(vals[0], ops[0], vals[1]);
    const calc   = `${vals[0]} ${opSymbol(ops[0])} ${vals[1]} = ${result}`;

    let text: string;
    if (style === 'continuation') {
      text = stepIdx === 0
        ? `עכשיו ${OP_NAMES[ops[0]]}:`
        : `ואז ${OP_NAMES[ops[0]]}:`;
    } else {
      text = isFirstLow
        ? `עכשיו ${OP_NAMES[ops[0]]}:`
        : `ואז ${OP_NAMES[ops[0]]}:`;
    }

    steps.push({
      emoji: '➡️',
      text,
      calculation: calc,
      isLast: ops.length === 1,
    });

    vals.splice(0, 2, result);
    ops.splice(0, 1);
    isFirstLow = false;
    stepIdx++;
  }

  return steps;
}

/** Build explanation steps for a parenthesized expression. */
function generateParenthesizedExplanation(
  expression: string,
): ExplanationStep[] {
  const steps: ExplanationStep[] = [];

  // Collect parenthesized sub-expressions
  const parenRegex = /\(([^)]+)\)/g;
  const groups: Array<{ full: string; inner: string; result: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = parenRegex.exec(expression)) !== null) {
    const inner    = m[1];
    const { operands, operators } = parseSimpleExpression(inner);
    const result   = evaluateFlat(operands, operators);
    groups.push({ full: m[0], inner, result });
  }

  // Step(s): resolve each parenthesized group
  for (let i = 0; i < groups.length; i++) {
    const text =
      groups.length === 1
        ? 'קודם הסוגריים:'
        : `סוגריים ${PAREN_ORDINALS[i]}:`;

    steps.push({
      emoji: '🔢',
      text,
      calculation: `${groups[i].inner} = ${groups[i].result}`,
      isLast: false,
    });
  }

  // Substitute group results into expression
  let simplified = expression;
  for (const g of groups) {
    simplified = simplified.replace(g.full, String(g.result));
  }

  // Parse remaining flat expression
  const { operands, operators } = parseSimpleExpression(simplified);

  if (operators.length === 0) {
    // Edge case: the entire expression was wrapped in parens
    steps[steps.length - 1].isLast = true;
    return steps;
  }

  if (operators.length === 1) {
    const result = applyOp(operands[0], operators[0], operands[1]);
    steps.push({
      emoji: '➡️',
      text: `עכשיו ${OP_NAMES[operators[0]]}:`,
      calculation: `${operands[0]} ${opSymbol(operators[0])} ${operands[1]} = ${result}`,
      isLast: true,
    });
    return steps;
  }

  // Multiple remaining ops — delegate to PEMDAS stepper
  steps.push(
    ...generatePEMDASSteps([...operands], [...operators], 'continuation'),
  );
  return steps;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate kid-friendly, step-by-step Hebrew explanation for a math question.
 *
 * Returns an ordered array of {@link ExplanationStep} objects.
 * The last step always has `isLast === true` (the renderer should append ✅).
 */
export function generateExplanation(question: Question): ExplanationStep[] {
  const { operands, operators, expression, correctAnswer, hasParentheses } =
    question;

  // ── Simple 2-operand → single step ─────────────────────────────
  if (operators.length === 1 && !hasParentheses) {
    return [
      {
        emoji: '🔢',
        text: '',
        calculation: `${expression} = ${correctAnswer}`,
        isLast: true,
      },
    ];
  }

  // ── Parenthesized expression ───────────────────────────────────
  if (hasParentheses) {
    return generateParenthesizedExplanation(expression);
  }

  // ── Multi-operation (no parentheses) ───────────────────────────
  return generatePEMDASSteps([...operands], [...operators], 'pemdas');
}
