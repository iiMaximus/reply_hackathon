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
};
export function notebookReview(id) {
  return { ...notebooks[id], mode: "scripted", notebook: id };
}
export function sampleClass() {
  return [
    { alias: "Ada", attempt: notebookReview("divide") },
    { alias: "Luca", attempt: notebookReview("factor") },
    {
      alias: "Sam",
      attempt: {
        mode: "scripted",
        group: "started",
        line: "f′(x) = x² − x",
        hint: "What slope are you looking for?",
      },
    },
  ].map((p) => ({
    ...p,
    example: true,
    share: true,
    reviewId: "example-" + p.alias,
    scored: null,
  }));
}
