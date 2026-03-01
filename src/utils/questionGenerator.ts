import type { OperationType, Question, SessionSettings } from '../types';

// ---------------------------------------------------------------------------
// 1. Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = (hash << 5) - hash + ch;
    hash |= 0;
  }
  return hash >>> 0;
}

function createSeededRandom(seed: string): () => number {
  let state = hashString(seed);
  if (state === 0) state = 1;
  return (): number => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fisherYatesShuffle<T>(arr: T[], random: () => number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ---------------------------------------------------------------------------
// 2. Helpers
// ---------------------------------------------------------------------------

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

// ---------------------------------------------------------------------------
// 3. Expression Evaluation (respects order of operations)
// ---------------------------------------------------------------------------

/** Evaluate expression with correct PEMDAS order: × ÷ first, then + − */
export function evaluateExpression(operands: number[], operators: OperationType[]): number {
  // Phase 1: resolve × and ÷ left to right
  const vals = [...operands];
  const ops = [...operators];

  let i = 0;
  while (i < ops.length) {
    if (ops[i] === 'multiplication' || ops[i] === 'division') {
      const res = ops[i] === 'multiplication'
        ? vals[i] * vals[i + 1]
        : vals[i] / vals[i + 1];
      vals.splice(i, 2, res);
      ops.splice(i, 1);
    } else {
      i++;
    }
  }

  // Phase 2: resolve + and − left to right
  let result = vals[0];
  for (let j = 0; j < ops.length; j++) {
    result = ops[j] === 'addition' ? result + vals[j + 1] : result - vals[j + 1];
  }

  return result;
}

/** Evaluate expression strictly left-to-right (ignoring PEMDAS — common kid mistake) */
function evaluateLeftToRight(operands: number[], operators: OperationType[]): number {
  let result = operands[0];
  for (let i = 0; i < operators.length; i++) {
    switch (operators[i]) {
      case 'addition': result += operands[i + 1]; break;
      case 'subtraction': result -= operands[i + 1]; break;
      case 'multiplication': result *= operands[i + 1]; break;
      case 'division': result /= operands[i + 1]; break;
    }
  }
  return result;
}

/**
 * Check whether the add/subtract chain (after resolving ×/÷) ever dips
 * below zero at any intermediate step.  Returns true if any running total
 * goes negative — meaning the expression should be rejected.
 */
function hasNegativeIntermediate(operands: number[], operators: OperationType[]): boolean {
  // Phase 1: resolve × and ÷ left to right (same as evaluateExpression)
  const vals = [...operands];
  const ops = [...operators];

  let i = 0;
  while (i < ops.length) {
    if (ops[i] === 'multiplication' || ops[i] === 'division') {
      const res = ops[i] === 'multiplication'
        ? vals[i] * vals[i + 1]
        : vals[i] / vals[i + 1];
      vals.splice(i, 2, res);
      ops.splice(i, 1);
    } else {
      i++;
    }
  }

  // Phase 2: walk the +/− chain and check each intermediate result
  let running = vals[0];
  for (let j = 0; j < ops.length; j++) {
    running = ops[j] === 'addition' ? running + vals[j + 1] : running - vals[j + 1];
    if (running < 0) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// 3b. String-Based Expression Evaluator (supports parentheses)
// ---------------------------------------------------------------------------

function tokenize(expr: string): (number | string)[] {
  const tokens: (number | string)[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ' || ch === '\t') {
      i++;
      continue;
    }
    if (
      ch === '+' || ch === '\u2212' || ch === '-' ||
      ch === '\u00D7' || ch === '\u00F7' ||
      ch === '(' || ch === ')'
    ) {
      tokens.push(ch);
      i++;
      continue;
    }
    if (ch >= '0' && ch <= '9') {
      let numStr = '';
      while (i < expr.length && expr[i] >= '0' && expr[i] <= '9') {
        numStr += expr[i];
        i++;
      }
      tokens.push(Number(numStr));
      continue;
    }
    i++;
  }
  return tokens;
}

export function evaluateExpressionString(expr: string): number {
  const tokens = tokenize(expr);
  let pos = 0;

  function peek(): number | string | undefined {
    return tokens[pos];
  }

  function consume(): number | string {
    return tokens[pos++];
  }

  // expr → term (('+' | '−' | '-') term)*
  function parseExpr(): number {
    let left = parseTerm();
    while (peek() === '+' || peek() === '\u2212' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  // term → factor (('×' | '÷') factor)*
  function parseTerm(): number {
    let left = parseFactor();
    while (peek() === '\u00D7' || peek() === '\u00F7') {
      const op = consume();
      const right = parseFactor();
      left = op === '\u00D7' ? left * right : left / right;
    }
    return left;
  }

  // factor → '(' expr ')' | NUMBER
  function parseFactor(): number {
    if (peek() === '(') {
      consume();
      const val = parseExpr();
      consume();
      return val;
    }
    return consume() as number;
  }

  return parseExpr();
}

// ---------------------------------------------------------------------------
// 3c. Expression Generation
// ---------------------------------------------------------------------------

const OP_SYMBOLS: Record<OperationType, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
};

/**
 * Generate a valid mixed-operation expression.
 *
 * Strategy:
 * 1. Pick random operators from the available set
 * 2. Generate operands:
 *    - Operands next to × or ÷ are kept small (2-12)
 *    - Operands only involved in + or − can be larger
 * 3. Fix ÷ groups: identify contiguous ×/÷ runs. For each group with
 *    a ÷, set the leading operand so the group evaluates to a clean
 *    positive integer. This handles consecutive divisions correctly.
 * 4. Evaluate and validate
 */
function generateMixedQuestion(
  operandCount: number,
  maxResult: number,
  availableOps: OperationType[],
  random: () => number,
): Question | null {
  const MAX_RETRIES = 30;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Step 1: Pick operators
    const operators: OperationType[] = [];
    for (let i = 0; i < operandCount - 1; i++) {
      operators.push(availableOps[Math.floor(random() * availableOps.length)]);
    }

    // Step 2: Determine which operand positions are adjacent to × or ÷
    const isMulDiv = new Set<number>();
    for (let i = 0; i < operators.length; i++) {
      if (operators[i] === 'multiplication' || operators[i] === 'division') {
        isMulDiv.add(i);
        isMulDiv.add(i + 1);
      }
    }

    // Step 3: Generate operands
    const maxSmall = Math.min(12, Math.floor(Math.sqrt(maxResult)));
    const maxLarge = Math.min(maxResult, 100);
    const operands: number[] = [];

    for (let i = 0; i < operandCount; i++) {
      if (isMulDiv.has(i)) {
        // Small operand for multiplication/division context
        operands.push(2 + Math.floor(random() * (maxSmall - 1)));
      } else {
        // Larger operand for addition/subtraction context
        operands.push(2 + Math.floor(random() * (maxLarge - 1)));
      }
    }

    // Step 4: Fix ×/÷ groups for clean integer results.
    // We identify contiguous runs of × and ÷ operators and fix the
    // leading operand of each group so the group evaluates to a
    // positive integer.  For a group  v0 op0 v1 op1 v2 …  the
    // left-to-right result equals  v0 × num / den  where num is the
    // product of operands paired with × and den is the product of
    // operands paired with ÷.  Setting v0 = k × (den / gcd(num,den))
    // guarantees an integer result  k × (num / gcd(num,den)).
    let valid = true;
    {
      let gStart = -1;
      for (let i = 0; i <= operators.length; i++) {
        const isMD =
          i < operators.length &&
          (operators[i] === 'multiplication' || operators[i] === 'division');

        if (isMD && gStart === -1) {
          gStart = i;
        }

        if (!isMD && gStart !== -1) {
          // Process the ×/÷ group from gStart to i-1
          // Only needs fixing if the group contains at least one ÷
          const hasDivision = operators
            .slice(gStart, i)
            .some((op) => op === 'division');

          if (hasDivision) {
            let num = 1;
            let den = 1;
            for (let j = gStart; j < i; j++) {
              // Ensure divisors are ≥ 2
              if (operators[j] === 'division' && operands[j + 1] < 2) {
                operands[j + 1] = 2;
              }
              if (operators[j] === 'multiplication') {
                num *= operands[j + 1];
              } else {
                den *= operands[j + 1];
              }
            }

            const g = gcd(num, den);
            const effectiveDen = den / g;
            const resultFactor = num / g; // group result = k * resultFactor

            if (effectiveDen < 1 || resultFactor < 1) {
              valid = false;
              break;
            }

            // Choose k so the group result stays ≤ maxResult
            const maxK = Math.max(1, Math.floor(maxResult / resultFactor));
            const k = 1 + Math.floor(random() * Math.min(10, maxK));
            operands[gStart] = k * effectiveDen;
          }
          gStart = -1;
        }
      }
    }

    if (!valid) continue;

    // Step 5: Evaluate
    const result = evaluateExpression(operands, operators);

    // Validate: positive integer within range, no negative intermediates
    if (
      Number.isInteger(result) &&
      result > 0 &&
      result <= maxResult &&
      !hasNegativeIntermediate(operands, operators)
    ) {
      const expression = buildExpressionString(operands, operators);
      const distractors = generateDistractors(operands, operators, result, random);
      const options = fisherYatesShuffle([result, ...distractors], random);

      return {
        operands,
        operators,
        expression,
        correctAnswer: result,
        options,
        selectedAnswer: null,
        isCorrect: null,
      };
    }
  }

  return null; // signal to caller to use fallback
}

function buildExpressionString(operands: number[], operators: OperationType[]): string {
  let expr = String(operands[0]);
  for (let i = 0; i < operators.length; i++) {
    expr += ` ${OP_SYMBOLS[operators[i]]} ${operands[i + 1]}`;
  }
  return expr;
}

// ---------------------------------------------------------------------------
// 3d. Parenthesization Templates & Parenthesized Question Generation
// ---------------------------------------------------------------------------

interface ParenTemplate {
  operandCount: number;
  build(operands: number[], ops: OperationType[]): string;
  parenGroups: Array<{ start: number; end: number }>;
}

function opSym(op: OperationType): string {
  return OP_SYMBOLS[op];
}

const PAREN_TEMPLATES: ParenTemplate[] = [
  // --- 3-operand templates ---
  {
    // L3: (a op0 b) op1 c
    operandCount: 3,
    build: (o, ops) =>
      `(${o[0]} ${opSym(ops[0])} ${o[1]}) ${opSym(ops[1])} ${o[2]}`,
    parenGroups: [{ start: 0, end: 1 }],
  },
  {
    // R3: a op0 (b op1 c)
    operandCount: 3,
    build: (o, ops) =>
      `${o[0]} ${opSym(ops[0])} (${o[1]} ${opSym(ops[1])} ${o[2]})`,
    parenGroups: [{ start: 1, end: 2 }],
  },
  // --- 4-operand templates ---
  {
    // L4: (a op0 b) op1 c op2 d
    operandCount: 4,
    build: (o, ops) =>
      `(${o[0]} ${opSym(ops[0])} ${o[1]}) ${opSym(ops[1])} ${o[2]} ${opSym(ops[2])} ${o[3]}`,
    parenGroups: [{ start: 0, end: 1 }],
  },
  {
    // M4: a op0 (b op1 c) op2 d
    operandCount: 4,
    build: (o, ops) =>
      `${o[0]} ${opSym(ops[0])} (${o[1]} ${opSym(ops[1])} ${o[2]}) ${opSym(ops[2])} ${o[3]}`,
    parenGroups: [{ start: 1, end: 2 }],
  },
  {
    // R4: a op0 b op1 (c op2 d)
    operandCount: 4,
    build: (o, ops) =>
      `${o[0]} ${opSym(ops[0])} ${o[1]} ${opSym(ops[1])} (${o[2]} ${opSym(ops[2])} ${o[3]})`,
    parenGroups: [{ start: 2, end: 3 }],
  },
  {
    // LR4: (a op0 b) op1 (c op2 d)
    operandCount: 4,
    build: (o, ops) =>
      `(${o[0]} ${opSym(ops[0])} ${o[1]}) ${opSym(ops[1])} (${o[2]} ${opSym(ops[2])} ${o[3]})`,
    parenGroups: [{ start: 0, end: 1 }, { start: 2, end: 3 }],
  },
  {
    // BL4: (a op0 b op1 c) op2 d
    operandCount: 4,
    build: (o, ops) =>
      `(${o[0]} ${opSym(ops[0])} ${o[1]} ${opSym(ops[1])} ${o[2]}) ${opSym(ops[2])} ${o[3]}`,
    parenGroups: [{ start: 0, end: 2 }],
  },
  {
    // BR4: a op0 (b op1 c op2 d)
    operandCount: 4,
    build: (o, ops) =>
      `${o[0]} ${opSym(ops[0])} (${o[1]} ${opSym(ops[1])} ${o[2]} ${opSym(ops[2])} ${o[3]})`,
    parenGroups: [{ start: 1, end: 3 }],
  },
];

function generateParenthesizedQuestion(
  operandCount: number,
  maxResult: number,
  availableOps: OperationType[],
  random: () => number,
): Question | null {
  const MAX_RETRIES = 40;
  const templates = PAREN_TEMPLATES.filter((t) => t.operandCount === operandCount);
  if (templates.length === 0) return null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Step 1: Pick a random template
    const template = templates[Math.floor(random() * templates.length)];

    // Step 2: Pick random operators
    const operators: OperationType[] = [];
    for (let i = 0; i < operandCount - 1; i++) {
      operators.push(availableOps[Math.floor(random() * availableOps.length)]);
    }

    // Step 3: Generate operands (small near ×/÷, larger near +/−)
    const adjacentToMulDiv = new Set<number>();
    for (let i = 0; i < operators.length; i++) {
      if (operators[i] === 'multiplication' || operators[i] === 'division') {
        adjacentToMulDiv.add(i);
        adjacentToMulDiv.add(i + 1);
      }
    }

    const maxSmall = Math.min(12, Math.floor(Math.sqrt(maxResult)));
    const maxLarge = Math.min(maxResult, 100);
    const operands: number[] = [];
    for (let i = 0; i < operandCount; i++) {
      if (adjacentToMulDiv.has(i)) {
        operands.push(2 + Math.floor(random() * (maxSmall - 1)));
      } else {
        operands.push(2 + Math.floor(random() * (maxLarge - 1)));
      }
    }

    // Step 4a: Division safety within each paren group
    let valid = true;
    for (const group of template.parenGroups) {
      let gStart = -1;
      for (let i = group.start; i <= group.end; i++) {
        const isMD =
          i < group.end &&
          (operators[i] === 'multiplication' || operators[i] === 'division');

        if (isMD && gStart === -1) gStart = i;

        if (!isMD && gStart !== -1) {
          const hasDivision = operators
            .slice(gStart, i)
            .some((op) => op === 'division');

          if (hasDivision) {
            let num = 1;
            let den = 1;
            for (let j = gStart; j < i; j++) {
              if (operators[j] === 'division' && operands[j + 1] < 2) {
                operands[j + 1] = 2;
              }
              if (operators[j] === 'multiplication') {
                num *= operands[j + 1];
              } else {
                den *= operands[j + 1];
              }
            }

            const g = gcd(num, den);
            const effectiveDen = den / g;
            const resultFactor = num / g;

            if (effectiveDen < 1 || resultFactor < 1) {
              valid = false;
              break;
            }

            const maxK = Math.max(1, Math.floor(maxResult / resultFactor));
            const k = 1 + Math.floor(random() * Math.min(10, maxK));
            operands[gStart] = k * effectiveDen;
          }
          gStart = -1;
        }
      }
      if (!valid) break;
    }
    if (!valid) continue;

    // Step 4b: Check paren group sub-expressions are positive integers with no negative intermediates
    const groupResults = new Map<string, number>();
    let groupsValid = true;
    for (const group of template.parenGroups) {
      const groupOps = operators.slice(group.start, group.end);
      const groupVals = operands.slice(group.start, group.end + 1);
      const groupResult = evaluateExpression(groupVals, groupOps);
      if (!Number.isInteger(groupResult) || groupResult < 1 || hasNegativeIntermediate(groupVals, groupOps)) {
        groupsValid = false;
        break;
      }
      groupResults.set(`${group.start}-${group.end}`, groupResult);
    }
    if (!groupsValid) continue;

    // Step 4c: Division safety for outer ÷ operators
    const insideGroup = new Set<number>();
    for (const group of template.parenGroups) {
      for (let oi = group.start; oi < group.end; oi++) {
        insideGroup.add(oi);
      }
    }

    let outerFixed = true;
    for (let i = 0; i < operators.length; i++) {
      if (insideGroup.has(i) || operators[i] !== 'division') continue;

      // Determine the divisor (operand[i+1] or paren group starting at i+1)
      const rightGroup = template.parenGroups.find((g) => g.start === i + 1);
      let divisor: number;
      if (rightGroup) {
        divisor = groupResults.get(`${rightGroup.start}-${rightGroup.end}`)!;
      } else {
        if (operands[i + 1] < 2) operands[i + 1] = 2;
        divisor = operands[i + 1];
      }

      if (divisor <= 0) { outerFixed = false; break; }

      // Determine the dividend (operand[i] or paren group ending at i)
      const leftGroup = template.parenGroups.find((g) => g.end === i);
      if (leftGroup) {
        const gResult = groupResults.get(`${leftGroup.start}-${leftGroup.end}`)!;
        if (gResult % divisor !== 0) {
          const scale = divisor / gcd(gResult, divisor);
          operands[leftGroup.start] = operands[leftGroup.start] * scale;
          const newResult = evaluateExpression(
            operands.slice(leftGroup.start, leftGroup.end + 1),
            operators.slice(leftGroup.start, leftGroup.end),
          );
          if (!Number.isInteger(newResult) || newResult < 1) {
            outerFixed = false;
            break;
          }
          groupResults.set(`${leftGroup.start}-${leftGroup.end}`, newResult);
        }
      } else {
        const k = 1 + Math.floor(
          random() * Math.min(10, Math.max(1, Math.floor(maxResult / divisor))),
        );
        operands[i] = k * divisor;
      }
    }
    if (!outerFixed) continue;

    // Step 5: Build expression strings
    const parenExpr = template.build(operands, operators);
    const flatExpr = buildExpressionString(operands, operators);

    // Step 6: Meaningfulness check — parens must change the result
    const parenResult = evaluateExpressionString(parenExpr);
    const flatResult = evaluateExpressionString(flatExpr);
    if (parenResult === flatResult) continue;

    // Step 7: Validation
    if (!Number.isInteger(parenResult) || parenResult < 1 || parenResult > maxResult) continue;

    // Step 7b: Check no negative intermediates in outer add/subtract chain
    {
      // Build outer expression: collapse each paren group to its evaluated result
      const outerVals: number[] = [];
      const outerOps: OperationType[] = [];
      const consumed = new Set<number>();

      for (const group of template.parenGroups) {
        for (let gi = group.start; gi <= group.end; gi++) {
          consumed.add(gi);
        }
      }

      for (let oi = 0; oi < operandCount; oi++) {
        const group = template.parenGroups.find(g => g.start === oi);
        if (group) {
          outerVals.push(groupResults.get(`${group.start}-${group.end}`)!);
          oi = group.end; // skip to end of group (loop will oi++)
        } else if (!consumed.has(oi)) {
          outerVals.push(operands[oi]);
        }
      }

      // Collect outer operators (those not inside any paren group)
      for (let oi = 0; oi < operators.length; oi++) {
        if (!insideGroup.has(oi)) {
          outerOps.push(operators[oi]);
        }
      }

      if (outerVals.length > 1 && hasNegativeIntermediate(outerVals, outerOps)) continue;
    }

    // Re-check all paren group sub-expressions are still positive integers
    let finalGroupsValid = true;
    for (const group of template.parenGroups) {
      const subResult = evaluateExpression(
        operands.slice(group.start, group.end + 1),
        operators.slice(group.start, group.end),
      );
      if (!Number.isInteger(subResult) || subResult < 1) {
        finalGroupsValid = false;
        break;
      }
    }
    if (!finalGroupsValid) continue;

    // Step 8: Generate distractors
    const distractors = generateDistractors(
      operands, operators, parenResult, random, parenExpr, true,
    );
    const options = fisherYatesShuffle([parenResult, ...distractors], random);

    return {
      operands,
      operators,
      expression: parenExpr,
      correctAnswer: parenResult,
      options,
      selectedAnswer: null,
      isCorrect: null,
      hasParentheses: true,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// 4. Distractors
// ---------------------------------------------------------------------------

function generateDistractors(
  operands: number[],
  operators: OperationType[],
  correctAnswer: number,
  random: () => number,
  expression?: string,
  hasParentheses?: boolean,
): number[] {
  const distractors: number[] = [];
  const maxDelta = Math.max(3, Math.floor(Math.abs(correctAnswer) * 0.15));

  if (hasParentheses && expression) {
    // Distractor 1: "Ignoring parentheses" — evaluate flat expression
    const flatExpr = buildExpressionString(operands, operators);
    const flatResult = evaluateExpressionString(flatExpr);
    const flatRounded = Math.round(flatResult);
    if (
      Number.isInteger(flatResult) &&
      flatRounded >= 1 &&
      flatRounded !== correctAnswer &&
      !distractors.includes(flatRounded)
    ) {
      distractors.push(flatRounded);
    } else {
      const delta = 1 + Math.floor(random() * maxDelta);
      distractors.push(correctAnswer + delta);
    }

    // Distractor 2: nearby ±
    const delta2 = 1 + Math.floor(random() * maxDelta);
    const candidate2 = random() < 0.5
      ? correctAnswer + delta2
      : correctAnswer - delta2;
    if (candidate2 >= 1) {
      distractors.push(candidate2);
    } else {
      distractors.push(correctAnswer + delta2);
    }

    // Distractor 3: nearby ± or left-to-right
    const ltrResult = evaluateLeftToRight(operands, operators);
    const ltrRounded = Math.round(ltrResult);
    if (
      Number.isInteger(ltrResult) &&
      ltrRounded !== correctAnswer &&
      ltrRounded >= 1 &&
      !distractors.includes(ltrRounded)
    ) {
      distractors.push(ltrRounded);
    } else {
      const delta3 = 1 + Math.floor(random() * maxDelta);
      distractors.push(correctAnswer + maxDelta + delta3);
    }
  } else {
    // Existing behavior for non-parenthesized questions

    // Distractor 1: nearby +
    const delta1 = 1 + Math.floor(random() * maxDelta);
    distractors.push(correctAnswer + delta1);

    // Distractor 2: nearby −
    const delta2 = 1 + Math.floor(random() * maxDelta);
    const candidate2 = correctAnswer - delta2;
    if (candidate2 >= 1) {
      distractors.push(candidate2);
    } else {
      distractors.push(correctAnswer + delta1 + 1 + Math.floor(random() * maxDelta));
    }

    // Distractor 3: left-to-right evaluation mistake (ignoring PEMDAS)
    const ltrResult = evaluateLeftToRight(operands, operators);
    const ltrRounded = Math.round(ltrResult);
    if (
      Number.isInteger(ltrResult) &&
      ltrRounded !== correctAnswer &&
      ltrRounded >= 1 &&
      !distractors.includes(ltrRounded)
    ) {
      distractors.push(ltrRounded);
    } else {
      // Fallback: another nearby value
      distractors.push(correctAnswer + maxDelta + 2);
    }
  }

  // Deduplicate
  for (let i = 0; i < distractors.length; i++) {
    let offset = 1;
    while (
      distractors[i] === correctAnswer ||
      distractors[i] < 1 ||
      distractors.some((v, j) => j !== i && v === distractors[i])
    ) {
      distractors[i] = correctAnswer + offset;
      offset++;
    }
  }

  return distractors;
}

// ---------------------------------------------------------------------------
// 5. Fallback: simple single-operation question
// ---------------------------------------------------------------------------

function generateFallbackQuestion(
  availableOps: OperationType[],
  random: () => number,
): Question {
  const op = availableOps[Math.floor(random() * availableOps.length)];
  let operands: number[];
  let operators: OperationType[];

  switch (op) {
    case 'addition':
      operands = [5 + Math.floor(random() * 20), 3 + Math.floor(random() * 15)];
      operators = ['addition'];
      break;
    case 'subtraction':
      {
        const a = 10 + Math.floor(random() * 30);
        const b = 1 + Math.floor(random() * (a - 1));
        operands = [a, b];
        operators = ['subtraction'];
      }
      break;
    case 'multiplication':
      operands = [2 + Math.floor(random() * 8), 2 + Math.floor(random() * 8)];
      operators = ['multiplication'];
      break;
    case 'division':
      {
        const divisor = 2 + Math.floor(random() * 9);
        const quotient = 2 + Math.floor(random() * 9);
        operands = [divisor * quotient, divisor];
        operators = ['division'];
      }
      break;
  }

  const correctAnswer = evaluateExpression(operands!, operators!);
  const expression = buildExpressionString(operands!, operators!);
  const distractors = generateDistractors(operands!, operators!, correctAnswer, random);
  const options = fisherYatesShuffle([correctAnswer, ...distractors], random);

  return {
    operands: operands!,
    operators: operators!,
    expression,
    correctAnswer,
    options,
    selectedAnswer: null,
    isCorrect: null,
  };
}

// ---------------------------------------------------------------------------
// 6. Generate Full Session
// ---------------------------------------------------------------------------

function expressionsEqual(a: Question, b: Question): boolean {
  return a.expression === b.expression;
}

export function generateSession(
  settings: SessionSettings,
  sessionId: string,
): Question[] {
  const random = createSeededRandom(sessionId);
  const questions: Question[] = [];

  for (let q = 0; q < settings.questionCount; q++) {
    const MAX_DUP_RETRIES = 3;
    let question: Question | null = null;

    for (let attempt = 0; attempt <= MAX_DUP_RETRIES; attempt++) {
      let candidate: Question | null = null;

      // Conditionally try parenthesized question
      if (
        settings.useParentheses &&
        settings.operandCount >= 3 &&
        random() < 0.5
      ) {
        candidate = generateParenthesizedQuestion(
          settings.operandCount,
          settings.maxResult,
          settings.operations,
          random,
        );
      }

      // Fall back to mixed question if parenthesized wasn't attempted or failed
      if (!candidate) {
        candidate = generateMixedQuestion(
          settings.operandCount,
          settings.maxResult,
          settings.operations,
          random,
        );
      }

      // Fall back to simple question if mixed also failed
      if (!candidate) {
        question = generateFallbackQuestion(settings.operations, random);
        break;
      }

      const isDuplicate = questions.some((existing) =>
        expressionsEqual(existing, candidate!),
      );

      if (!isDuplicate || attempt === MAX_DUP_RETRIES) {
        question = candidate;
        break;
      }
    }

    questions.push(question!);
  }

  return questions;
}

// ---------------------------------------------------------------------------
// 7. Format Expression Helper (exported for display)
// ---------------------------------------------------------------------------

export function formatExpression(operands: number[], operators: OperationType[]): string {
  return buildExpressionString(operands, operators);
}
