import assert from "node:assert/strict";
import { appendFile } from "node:fs/promises";
import { openClassroom } from "./open.mjs";
import { cloudClient } from "./agent.mjs";

const cloud = cloudClient({ enabled: true });
const room = openClassroom({ cloud });
await room.analyze({
  text: "Evaluate the limit of 8 - 3x + 12x² as x approaches 2. Explain your reasoning.",
});
const draft = room.host().draft;
assert.equal(draft.engine, cloud.model);
await room.publish(draft);
const { id } = room.board();
const cases = [
  [
    "Correct substitution",
    "Polynomials are continuous. Substituting gives 8 - 6 + 48 = 50.",
    "correct",
  ],
  [
    "Correct regrouping",
    "I get 12(4) + (8 - 3·2) = 48 + 2 = 50 by continuity.",
    "correct",
  ],
  [
    "Dropped constant",
    "At x=2 I use -3(2)+12(2²)=-6+48=42. The constant drops out.",
    "constant",
  ],
  ["Omitted first term", "Substitution gives 12·4 - 3·2 = 42.", "constant"],
  [
    "Confused square with doubling",
    "I used x² = 2x, so the quadratic term is 12 times 2x for any x. That gives 50 at x=2.",
    "other",
  ],
  ["Unsupported result", "42", "unclear"],
];
const hasConstant = (s) =>
  /constant|(?:\+|plus|retain|include|keep|omit|drop|missing)\s*(?:the\s+)?8\b/i.test(
    s,
  );
const results = [];
for (const [label, text, expected] of cases) {
  const p = {};
  await room.answer(p, { id, text });
  const { result } = room.student(p).receipt;
  results.push({ label, text, expected, ...result });
}
await room.close(id);
const report = room.host().active.summary;
const lines = [
  "## Synthetic polynomial limits class",
  ...results.map(
    (r) =>
      `- **${r.label}** — ${r.text} → ${r.hint} Practice: ${r.practice || "—"}`,
  ),
  "",
  `**Teaching focus:** ${report.practiceTopic}`,
  "",
  report.move,
];
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY)
  await appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
for (const r of results) {
  assert.equal(r.engine, cloud.model);
  if (r.expected === "correct") assert.equal(r.group, 0, r.label);
  else if (r.expected === "unclear") assert.equal(r.group, -1, r.label);
  else {
    assert.ok(r.group > 0, r.label);
    if (r.expected === "constant") assert.ok(hasConstant(r.hint), r.hint);
  }
}
assert.equal(report.reviewed, cases.length);
assert.ok(report.evidence.length >= 2);
assert.ok(report.boardExample && report.check && report.expected);
assert.equal(report.unclear, 1);
assert.equal(report.engine, cloud.model);
assert.ok(hasConstant(report.practiceTopic + " " + report.move), report.move);
