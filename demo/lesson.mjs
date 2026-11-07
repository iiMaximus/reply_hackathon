export const lesson = {
  course: "Analisi I",
  title: "Find the stationary points",
  formula: "f(x) = x³/3 − x²/2",
  prompt:
    "Where is the tangent horizontal? Share the line you would write next.",
  reference:
    "https://openstax.org/books/calculus-volume-1/pages/4-3-maxima-and-minima",
  rubric:
    "For this polynomial, horizontal tangents occur where f′(x)=x²−x=0. Factoring keeps x=0 and x=1. Dividing by x needs a separate check of x=0. Another mathematically valid route is welcome. Partial work can be valid.",
};

export function studentLesson() {
  const { course, title, formula, prompt, reference } = lesson;
  return { course, title, formula, prompt, reference };
}

export const groups = {
  lost: "Divided by x; zero still needs a check",
  kept: "Kept both stationary values",
  started: "Set up the derivative",
  unclear: "Needs a closer look",
};

export const variants = {
  factor: {
    title: "Keep every root",
    prompt: "If g′(x) = x² − 3x, where is the tangent horizontal?",
    answers: ["3 only", "0 and 3", "−3 and 0"],
    key: 1,
    reasons: [
      "Cancel x from both sides",
      "Each factor of x(x − 3) can vanish",
      "Take another derivative",
    ],
    reasonKey: 1,
  },
  shift: {
    title: "Shift the roots",
    prompt: "If g′(x) = (x − 2)(x + 1), where is the tangent horizontal?",
    answers: ["2 only", "−2 and 1", "−1 and 2"],
    key: 2,
    reasons: [
      "The derivative is zero when either factor is zero",
      "The two factors must be equal",
      "A horizontal tangent requires x = 0",
    ],
    reasonKey: 0,
  },
};

export function recommend(attempts) {
  return attempts.some((a) => a.group === "lost") ? "factor" : "shift";
}

export function publicVariant(id) {
  if (!id) return null;
  const { title, prompt, answers, reasons } = variants[id];
  return { title, prompt, answers, reasons };
}

export const practice = {
  prompt:
    "Try this on paper. If h′(x) = x² + 2x, where is the tangent horizontal?",
  explanation:
    "Write h′(x) = x(x + 2). One factor vanishes at x = 0, the other at x = −2. Both are stationary values.",
};
