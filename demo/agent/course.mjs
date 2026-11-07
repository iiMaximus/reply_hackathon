import { lesson } from "../lesson.mjs";

export const hints = {
  lost: [
    ["division", "Which values of x allow the division you used?"],
    [
      "substitute",
      "Try the value your division excludes in the original equation. What happens?",
    ],
  ],
  kept: [
    [
      "verify",
      "Substitute each candidate in your derivative. What slope does it give?",
    ],
    ["justify", "How does your factored form account for every candidate?"],
  ],
  started: [
    ["slope", "What should your derivative equal at a horizontal tangent?"],
    [
      "next",
      "Which operation could turn your derivative equation into simpler pieces?",
    ],
  ],
};
export const cards = {
  stationary: {
    id: "stationary",
    title: "Horizontal tangents",
    reference: lesson.reference,
    note: "For a differentiable function, a horizontal tangent has slope zero. This exercise asks for stationary values, not whether each is a maximum or minimum.",
    groups: ["started"],
  },
  roots: {
    id: "roots",
    title: "Preserving roots",
    reference: lesson.reference,
    note: lesson.rubric,
    groups: ["lost", "kept", "started"],
  },
};
export const handoffs = {
  ambiguous:
    "Which mathematical line should your tutor look at? Type it, or share a clearer photo.",
  answer_request:
    "Try writing the first operation you would use. Your tutor can discuss that step with you.",
  unsupported:
    "This step needs your tutor’s interpretation. Mark the line you want to discuss.",
  budget:
    "Your tutor will review this step; the agent reached its decision limit.",
  unavailable:
    "Your tutor received your step. Automated review is unavailable for this attempt.",
};
export const hintIds = Object.values(hints)
  .flat()
  .map(([id]) => id);
export function readMemory(value) {
  if (!value || value.length > 160) return null;
  try {
    const [version, group, hint] = value.split(".");
    if (
      version !== "v1" ||
      !Object.hasOwn(hints, group) ||
      !hints[group].some(([id]) => id === hint)
    )
      return null;
    return { group, hint };
  } catch {
    return null;
  }
}
export function memoryValue(review) {
  return review.hintId && Object.hasOwn(hints, review.group)
    ? ["v1", review.group, review.hintId].join(".")
    : null;
}
