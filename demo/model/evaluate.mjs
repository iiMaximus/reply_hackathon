import assert from "node:assert/strict";
import { createStrategyMatcher } from "./strategies.mjs";
import { runAgent } from "../agent/orchestrator.mjs";
import { rehearsalPlanner } from "../agent/providers.mjs";
const match = await createStrategyMatcher();
for (const [text, group] of [
  ["f′(x)=2+x²", "power"],
  ["f′(x)=x(x−1)", "started"],
  ["I know the slope but I'm unsure what value it needs to take.", "started"],
  ["I divided both sides by the variable so I only have one solution.", "lost"],
  ["I drew the tangent here. Is this the point you meant?", "unclear"],
]) {
  const r = await runAgent({
    work: { text },
    decide: rehearsalPlanner,
    matchStrategy: match,
    stepBudget: 5,
    mode: "local",
  });
  assert.equal(r.group, group, text);
  assert.equal(r.strategy.model, "MiniLM-L6-v2");
  console.log(group + " ← " + text);
}

const { examples } = await import("../quiz/course.mjs");
const { prepare, teachingMove } = await import("../quiz/agent.mjs");
const cloud = { enabled: false };
const prepared = await prepare(
  {
    text: "How does tip deflection change when the length and rectangular section height of a cantilever beam double?",
  },
  { match, cloud },
);
assert.equal(prepared.question.topic, examples[0].topic);
assert.equal(prepared.question.key, null);
const move = await teachingMove(
  examples[0],
  {
    total: 4,
    leadingReason: { text: examples[0].options[1].reason, count: 3 },
  },
  cloud,
  match,
);
assert.match(move.engine, /MiniLM/);
assert.match(move.action, /twice and eight times/);
console.log(
  "Quiz: matched a beam exercise and selected a follow-up from observed reasoning.",
);
