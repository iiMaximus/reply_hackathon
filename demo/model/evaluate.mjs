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
