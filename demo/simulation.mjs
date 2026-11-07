// These readings belong to the bundled notebook pages. Uploaded photos never use them.
export const notebooks = {
  divide: {
    group: "lost",
    line: "x² − x = 0 → divide by x → x − 1 = 0 → x = 1",
    hint: "When is dividing both sides by x allowed? Check that condition against the original equation.",
  },
  factor: {
    group: "kept",
    line: "x(x − 1) = 0 → x = 0 or x = 1",
    hint: "Try substituting each value into the derivative. What do the two results tell you?",
  },
  derivative: {
    group: "started",
    line: "f′(x) = x² − x. I have the slope; what do I set it equal to?",
    hint: "What slope would you expect from a horizontal line?",
  },
};
export function notebookReview(id) {
  return { ...notebooks[id], mode: "scripted", notebook: id };
}
export function sampleClass() {
  return [
    { alias: "Elena", work: { notebook: "divide" }, exampleTransfer: true },
    { alias: "Luca", work: { notebook: "factor" }, exampleTransfer: true },
    { alias: "Sam", work: { notebook: "derivative" }, exampleTransfer: false },
    {
      alias: "Noor",
      work: { text: "x² = x. I cancel x on both sides and get x=1." },
      exampleTransfer: false,
    },
    {
      alias: "Marta",
      work: {
        text: "I checked x=0 and x=1 in the derivative. Both give slope zero.",
      },
      exampleTransfer: true,
    },
    {
      alias: "Teo",
      work: { text: "I drew the tangent here. Is this the point you meant?" },
      exampleTransfer: false,
    },
  ].map((p) => ({
    ...p,
    example: true,
    share: true,
    reviewId: "example-" + p.alias,
    scored: null,
  }));
}
