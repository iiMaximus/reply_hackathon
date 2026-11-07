// Authored, synthetic responses for the pitch. The classroom reviewer assesses
// them at runtime. The report is isolated from students and the leaderboard.
export const pitchExercise = {
  prompt: String.raw`Evaluate \(\displaystyle\lim_{x\to2}\left(8-3x+12x^2\right)\), if it exists.`,
  topic: "Polynomial limits",
  reference: "Polynomials are continuous. Substitute x=2 to obtain 8−6+48=50.",
  patterns: [
    {
      label: "Substituted into all three terms",
      anchor:
        "By continuity I substitute 2 into all three terms and get 8−6+48=50.",
      hint: "You accounted for all three terms.",
      move: "Change the constant and ask what changes in the limit.",
    },
    {
      label: "Dropped the constant 8",
      anchor: "I discarded the constant 8 and got −6+48=42.",
      hint: "The 8 stays in the expression when you substitute.",
      move: "Write each term in its own column before adding.",
    },
    {
      label: "Squared the coefficient as well",
      anchor: "I read 12x² as (12x)² and squared 24.",
      hint: "Check which quantity the exponent applies to.",
      move: "Compare 12(2²) with (12·2)².",
    },
  ],
};
export const pitchAnswers = [
  "Polynomials are continuous, so 8 − 3(2) + 12(2²) = 8 − 6 + 48 = 50.",
  "I regrouped the terms: 12(4) + (8−6) = 50 by continuity.",
  "The polynomial is continuous at 2. Its value there is 8 + 48 − 6 = 50.",
  "I used direct substitution. The constant contributes 8, the linear term −6 and the quadratic term 48, giving 50.",
  "The constant drops out, leaving −3(2) + 12(4) = 42.",
  "I substituted into the x terms only: −6 + 48 = 42.",
  "I ignored 8 because it is constant. That leaves 42.",
  "I read 12x² as (12x)², so at 2 I get 8 − 6 + 576 = 578.",
  "50",
  "42",
];
