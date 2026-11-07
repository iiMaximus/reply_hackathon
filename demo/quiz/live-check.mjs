import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { cloudClient } from "./agent.mjs";
import { extractWorksheetImage, openClassroom } from "./open.mjs";

if (!process.env.OPENAI_API_KEY)
  throw Error(
    "The trusted main-branch workflow needs the OPENAI_KEY Actions secret.",
  );
// Use a fictional class. A local fallback must never pass this live check.
let calls = 0,
  languageRepairs = 0;
const cloud = cloudClient({
  enabled: true,
  fetcher: async (url, options) => {
    const repair = ["feedback_language", "report_language"].includes(
      JSON.parse(options.body).text.format.name,
    );
    if (
      url !== "https://api.openai.com/v1/responses" ||
      (repair ? ++languageRepairs > 3 : ++calls > 5)
    )
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
const room = openClassroom({ cloud });
await room.analyze({
  text: "A group of 10 averaged 90. A group of 30 averaged 70. Explain how to calculate the average over all 40 participants.",
});
const { draft } = room.host();
assert.equal(draft.engine, cloud.model);
assert.match(draft.reference, /\b75\b/);
await room.publish(draft);
const { id } = room.board();
const participant = {};
await room.answer(participant, {
  id,
  text: "I weight the section means by their student counts: (10 × 90 + 30 × 70) / 40 = 75.",
});
const receipt = room.student(participant).receipt;
assert.equal(receipt.result.engine, cloud.model);
assert.ok(receipt.result.hint);
assert.equal(receipt.result.group, 0);
const mistaken = {};
await room.answer(mistaken, {
  id,
  photo:
    "data:image/jpeg;base64," +
    (
      await readFile(new URL("./fixtures/section-means.jpg", import.meta.url))
    ).toString("base64"),
});
const wrong = room.student(mistaken).receipt.result;
assert.equal(wrong.engine, cloud.model);
assert.ok(
  wrong.practice,
  "A student with an identified mistake receives a practice suggestion.",
);
assert.ok(
  wrong.group > 0,
  "Contradicting the reference must not count as the expected reasoning.",
);
await room.close(id);
assert.equal(room.host().active.summary.engine, cloud.model);
assert.ok(
  room.host().active.summary.practiceTopic,
  "Observed difficulties inform the teaching focus.",
);
assert.equal(calls, 4);
console.log(
  "Verified open question, private response feedback and anonymous class report using",
  cloud.model,
);

const worksheet = await readFile(
  new URL("./fixtures/three-questions.jpg", import.meta.url),
);
const questions = await extractWorksheetImage(
  { file: { type: "image/jpeg", data: worksheet.toString("base64") } },
  cloud,
);
assert.equal(questions.length, 3);
assert.match(questions[0], /differentiat|derivative/i);
assert.match(questions[1], /integrat|integral/i);
assert.match(questions[2], /limit/i);
assert.equal(calls, 5);
console.log("One worksheet photo produced three separate exercises in order.");
