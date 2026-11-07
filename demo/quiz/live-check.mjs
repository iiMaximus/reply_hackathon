import assert from "node:assert/strict";
import { approve, cloudClient, prepare, teachingMove } from "./agent.mjs";

if (!process.env.OPENAI_API_KEY)
  throw Error(
    "The trusted main-branch workflow needs the OPENAI_KEY Actions secret.",
  );
// Use a fictional class. A local fallback must never pass this live check.
let calls = 0;
const cloud = cloudClient({
  enabled: true,
  fetcher: async (url, options) => {
    if (url !== "https://api.openai.com/v1/responses" || ++calls > 2)
      throw Error("Unexpected live-check request");
    const res = await fetch(url, options);
    if (!res.ok) {
      const data = await res
        .clone()
        .json()
        .catch(() => ({}));
      const code = String(data.error?.code || "")
        .replace(/[^a-z0-9_]/gi, "")
        .slice(0, 60);
      console.error("OpenAI HTTP", res.status, code);
    }
    return res;
  },
});
const { engine, question } = await prepare(
  {
    text: "A tutorial has 10 students who average 90 and 30 who average 70. What is the mean across all 40? A. 75 B. 80 C. 85. Include these three answer choices.",
  },
  { cloud },
);
assert.equal(engine, cloud.model, "The cloud model must produce the draft");
const approved = approve(question);
assert.match(
  approved.options[approved.key].text,
  /\b75\b/,
  "Check the weighted mean in the returned key.",
);
const counts = approved.options.map(() => 0),
  reasons = approved.options.map(() => 0);
counts[approved.key] = 3;
const alternate = (approved.key + 1) % counts.length;
counts[alternate] = 1;
assert.notEqual(approved.reasonKey, null);
reasons[approved.reasonKey] = 2;
reasons[(approved.reasonKey + 1) % reasons.length] = 2;
const report = await teachingMove(
  approved,
  { total: 4, correct: 3, split: 1, counts, reasons },
  cloud,
);
assert.equal(
  report.engine,
  cloud.model,
  "The second model call must produce the teaching move",
);
assert.ok(report.action.length > 12);
assert.equal(calls, 2);
console.log(
  "Passed: teacher-reviewed weighted-mean key, private reasoning feedback data, and aggregate teaching recommendation.",
  cloud.model,
);
