// Instructor-reviewed examples. A concept match alone never supplies an answer key.
export const examples = [
  {
    topic: "Mechanics · Beam deflection",
    reference:
      "Cantilever beam tip deflection. Elastic bending stiffness and cubic scaling with length and height of a rectangular cross section.",
    prompt:
      "A cantilever beam carries a fixed tip load. Its length and its rectangular section height both double. Width and material stay the same. Under linear bending theory, what happens to the tip deflection?",
    options: [
      {
        text: "It stays the same",
        reason:
          "Length and height each contribute a factor of eight, which cancel.",
        hint: "Deflection scales as L³/h³. Doubling each length produces 8/8.",
      },
      {
        text: "It doubles",
        reason: "I used L/h. Doubling both leaves that ratio unchanged.",
        hint: "Compare the length term in L³ with the height term in the second moment of area. Each changes by the same factor.",
      },
      {
        text: "It becomes eight times larger",
        reason: "Only the increase in beam length affects deflection.",
        hint: "Length contributes a factor of eight. Check how the deeper section changes its second moment of area.",
      },
      {
        text: "It becomes eight times smaller",
        reason: "Only the increase in section height affects deflection.",
        hint: "A deeper section is stiffer. The increase in length also affects deflection.",
      },
    ],
    key: 0,
    reasonKey: 0,
    explanation:
      "Tip deflection is FL³/(3EI), and I = bh³/12. With F, E and b fixed, the two cubic factors cancel.",
    next: "Keep the section fixed and double only the beam length. Ask students to predict the factor before writing the formula.",
  },
  {
    topic: "Analisi I · Stationary points",
    reference:
      "Calculus derivative horizontal tangent stationary points factoring zero product dividing by x loses a root.",
    prompt:
      "For f(x) = x³/3 − x²/2, at which x-values is the tangent horizontal?",
    options: [
      {
        text: "0 and 1",
        reason: "Either factor of x(x − 1) can vanish.",
        hint: "The derivative is x(x − 1). Both factors can give a zero slope.",
      },
      {
        text: "Only 1",
        reason: "Dividing the derivative equation by x leaves x − 1 = 0.",
        hint: "Before dividing by x, test x = 0 in the original derivative.",
      },
      {
        text: "Only 0",
        reason:
          "The tangent is horizontal only where the graph meets the origin.",
        hint: "Look for every place where the slope vanishes, regardless of the graph’s height.",
      },
      {
        text: "0 and 3/2",
        reason:
          "The zeros of the original function give all the horizontal tangents.",
        hint: "A zero of the function concerns height. A horizontal tangent concerns slope.",
      },
    ],
    key: 0,
    reasonKey: 0,
    explanation:
      "A horizontal tangent has zero slope. Setting f′(x) = x(x − 1) = 0 gives x = 0 and x = 1.",
    next: "Write x(x − 1) = 0 twice. Factor one copy and divide the other by x. Ask which value disappeared and why.",
  },
  {
    topic: "Statistics · Weighted means",
    reference:
      "Statistics combining group averages with unequal sample sizes, weighted arithmetic mean pooled observations.",
    prompt:
      "A lab section of 10 students averaged 90 on a quiz. Another section of 30 averaged 70. What was the average across all 40 students?",
    options: [
      {
        text: "75",
        reason: "Each section mean must be weighted by its number of students.",
        hint: "Total points are 10 × 90 + 30 × 70. Divide by 40.",
      },
      {
        text: "80",
        reason: "The two section means should receive equal weight.",
        hint: "Equal weights would work for equally sized sections. Here one section contains three times as many people.",
      },
      {
        text: "85",
        reason:
          "The larger section should get the higher average in the weighting.",
        hint: "Keep each mean paired with the size of its own section.",
      },
    ],
    key: 0,
    reasonKey: 0,
    explanation:
      "The sections contributed 900 and 2,100 points. Their combined 3,000 points divided by 40 students gives 75.",
    next: "Replace the first section with one student. Ask which section should pull the combined mean closer.",
  },
];

// Each entry is a concrete move a TA can put on the board for one incorrect rule.
export const interventions = [
  [
    "Hold height fixed and double only L. Have the class vote between twice and eight times the deflection, then compare the exponents.",
    "Keep the length fixed. Sketch the same rectangular beam twice as deep and compare its two second moments of area.",
    "Keep the section fixed. Double only the span and ask which term in FL³/(3EI) changes.",
  ],
  [
    "Put x = 0 into the derivative before and after dividing by x. Ask which equation still accepts that value.",
    "Shift the graph vertically by 4. Ask students to locate its horizontal tangents again.",
    "Show the original curve and its derivative on separate axes. Ask which graph needs to cross zero.",
  ],
  [
    "Draw one dot per student in each section. Ask how many times each section average must enter the combined sum.",
    "Write the two section sizes beside their means and reconstruct each section’s total points before combining them.",
  ],
];
