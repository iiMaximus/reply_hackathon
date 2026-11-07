export default {
  prompt:
    "Evaluate the limit of 8 - 3x + 12x² as x approaches 2. Explain your reasoning.",
  topic: "Synthetic class · Polynomial limits",
  summary: {
    total: 6,
    accuracy: { correct: 2, assessed: 5, percent: 40 },
    reviewed: 6,
    groups: [
      {
        label: "Used the expected reasoning",
        move: "Ask the student to evaluate the squared term first, then substitute and simplify each term separately.",
        count: 2,
      },
      {
        label: "Substitute 2 but compute 12(2²) as 24, giving 26.",
        move: "Ask the student to evaluate the squared term first, then substitute and simplify each term separately.",
        count: 0,
      },
      {
        label: "Uses a different reasoning step",
        move: "Compare the expected first step with an alternative and show where they give different results.",
        count: 3,
      },
      {
        label: "Reasoning needs a closer look",
        move: "Work through the first step together and ask the class to explain the next one.",
        count: 1,
      },
    ],
    move: "Have students write each term at x = 2: 8 − 3(2) + 12(2²), then evaluate 2² = 4 and add to get 50.",
    focus: "Uses a different reasoning step",
    practiceTopic:
      "Omitting the constant term 8 when substituting, and treating x² as 2x.",
    engine: "gpt-6-luna",
    evidence: [
      { error: "Omitted the constant 8", count: 2 },
      { error: "Used x² = 2x as a general rule", count: 1 },
    ],
    unclear: 1,
    boardExample:
      "At x = 2 the three terms contribute 8, −6 and 48. Adding only the last two gives 42. Including all three gives 50.",
    check:
      "If the constant changes from 8 to 5, what happens to the limit at 2? Explain which terms changed.",
    expected: "Only the constant changes. The limit falls by 3, from 50 to 47.",
  },
  id: "example",
};
