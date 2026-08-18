export type MathOp = "+" | "-" | "×" | "÷";
export type DigitCount = 1 | 2 | 3;

export type MathProblem = {
  a: number;
  b: number;
  op: MathOp;
  answer: number;
  text: string;
};

export const ALL_OPS: MathOp[] = ["+", "-", "×", "÷"];

export const OP_LABELS: Record<MathOp, string> = {
  "+": "Сложение",
  "-": "Вычитание",
  "×": "Умножение",
  "÷": "Деление",
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rangeForDigits(digits: DigitCount): [number, number] {
  if (digits === 1) return [1, 9];
  if (digits === 2) return [10, 99];
  return [100, 999];
}

function make(a: number, b: number, op: MathOp, answer: number): MathProblem {
  return { a, b, op, answer, text: `${a} ${op} ${b}` };
}

function addition(digits: DigitCount): MathProblem {
  const [lo, hi] = rangeForDigits(digits);
  const a = randInt(lo, hi);
  const b = randInt(lo, hi);
  return make(a, b, "+", a + b);
}

function subtraction(digits: DigitCount): MathProblem {
  const [lo, hi] = rangeForDigits(digits);
  let a = randInt(lo, hi);
  let b = randInt(lo, hi);
  if (b > a) [a, b] = [b, a];
  if (b === a) {
    if (a > lo) b = a - 1;
    else a = Math.min(hi, a + 1);
  }
  return make(a, b, "-", a - b);
}

function multiplication(digits: DigitCount): MathProblem {
  const [lo, hi] = rangeForDigits(digits);
  const a = randInt(lo, hi);
  const bMax = digits === 1 ? 9 : digits === 2 ? 12 : 9;
  const b = randInt(2, bMax);
  return make(a, b, "×", a * b);
}

function division(digits: DigitCount): MathProblem {
  const [lo, hi] = rangeForDigits(digits);
  const divisorMax = digits === 1 ? 9 : digits === 2 ? 12 : 15;
  for (let i = 0; i < 40; i++) {
    const b = randInt(2, divisorMax);
    const maxQ = Math.floor(hi / b);
    const minQ = Math.max(1, Math.ceil(lo / b));
    if (minQ > maxQ) continue;
    const q = randInt(minQ, maxQ);
    const a = q * b;
    if (a >= lo && a <= hi) return make(a, b, "÷", q);
  }
  const b = 2;
  const q = Math.max(1, Math.ceil(lo / b));
  return make(q * b, b, "÷", q);
}

const BUILDERS: Record<MathOp, (d: DigitCount) => MathProblem> = {
  "+": addition,
  "-": subtraction,
  "×": multiplication,
  "÷": division,
};

export function generateProblem(ops: MathOp[], digits: DigitCount): MathProblem {
  const list = ops.length ? ops : (["+"] as MathOp[]);
  const op = list[randInt(0, list.length - 1)];
  return BUILDERS[op](digits);
}
