import test from "node:test";
import assert from "node:assert/strict";
import {
  approve,
  cloudClient,
  prepare,
  readSource,
  teachingMove,
} from "./quiz/agent.mjs";
import { examples } from "./quiz/course.mjs";

test("an unfamiliar worksheet stays editable, and an incomplete key blocks publication", async () => {
  const { question } = await prepare(
    { text: "Determine the lifetime of an excited state." },
    { cloud: { enabled: false } },
  );
  assert.equal(question.key, null);
  assert.equal(question.prompt, "Determine the lifetime of an excited state.");
  assert.throws(() => approve(question), /correct answer/);
  await assert.rejects(
    () =>
      readSource({
        file: { type: "application/pdf", data: "cGxhY2Vob2xkZXI=" },
      }),
    /text PDF/,
  );
});
test("the fast cloud adapter caps output and accepts structured drafts; outage preserves the source", async () => {
  let request;
  const cloud = cloudClient({
    enabled: true,
    fetcher: async (_, args) => {
      request = JSON.parse(args.body);
      return {
        ok: true,
        json: async () => ({
          status: "completed",
          output: [
            {
              content: [
                { type: "output_text", text: JSON.stringify(examples[2]) },
              ],
            },
          ],
        }),
      };
    },
  });
  const { engine } = await prepare(
    { text: "Build a question on combining unequal groups." },
    { cloud },
  );
  assert.equal(engine, "gpt-6-luna");
  assert.equal(request.store, false);
  assert.equal(request.max_output_tokens, 1400);
  assert.equal(request.text.format.strict, true);
  const failed = {
    enabled: true,
    ask: () => {
      throw Error();
    },
  };
  const actual = await prepare(
    { text: "Which method preserves angular momentum?" },
    { cloud: failed },
  );
  assert.match(actual.note, /unavailable/);
  assert.equal(actual.question.key, null);
  const report = await teachingMove(
    examples[1],
    {
      total: 1,
      correct: 1,
      split: 0,
      reasons: [1, 0, 0, 0],
      counts: [1, 0, 0, 0],
    },
    failed,
  );
  assert.match(report.engine, /cloud unavailable/);
});

test("a real text PDF imports its choices and key", async () => {
  const lines = [
    "Which average weights all observations equally?",
    "A. Pooled mean",
    "B. Mean of section means",
    "Key: A",
    "Explanation: Each student has the same weight.",
  ];
  const stream =
    "BT /F1 12 Tf 17 TL 48 720 Td " +
    lines.map((s, i) => (i ? "T* " : "") + "(" + s + ") Tj").join("\n") +
    " ET";
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>",
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
    "<</Length " + stream.length + ">>\nstream\n" + stream + "\nendstream",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((s, i) => {
    offsets.push(pdf.length);
    pdf += i + 1 + " 0 obj\n" + s + "\nendobj\n";
  });
  const start = pdf.length;
  pdf +=
    "xref\n0 6\n0000000000 65535 f \n" +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
      .join("") +
    "trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n" +
    start +
    "\n%%EOF";
  const source = await readSource({
    file: {
      type: "application/pdf",
      data: Buffer.from(pdf).toString("base64"),
    },
  });
  const { question } = await prepare(source, { cloud: { enabled: false } });
  assert.equal(approve(question).key, 0);
  assert.equal(question.options[1].text, "Mean of section means");
});
