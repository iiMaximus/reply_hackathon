import test from "node:test";
import assert from "node:assert/strict";
import { openClassroom } from "./quiz/open.mjs";

test("authored open prompt stays identical, pending feedback is counted, and closing waits for the private check", async () => {
  let release;
  const cloud = {
    enabled: true,
    model: "test model",
    async ask(task) {
      if (task === "open_feedback") {
        await new Promise((resolve) => (release = resolve));
        return {
          group: 0,
          evidence: "cubic factors",
          feedback: "Check the height exponent.",
        };
      }
      if (task === "open_report")
        return { move: "Compare what happens when only length doubles." };
      throw Error("unexpected task");
    },
  };
  const room = openClassroom({ cloud }),
    p = {},
    q = {};
  await room.analyze({ sample: 0 });
  const { draft } = room.host();
  room.publish(draft);
  const r = room.board();
  assert.equal(room.student(p).active.prompt, r.prompt);
  assert.equal(room.host().active.prompt, r.prompt);
  assert.ok(!Object.hasOwn(r, "reference"));
  assert.ok(!Object.hasOwn(r, "options"));
  const answer = "Both cubic factors cancel.",
    task = room.answer(p, { id: r.id, text: answer });
  assert.equal(room.host().active.summary.total, 1);
  assert.equal(room.host().active.summary.reviewed, 0);
  const close = room.close(r.id);
  assert.equal(room.board().status, "closing");
  await assert.rejects(
    () => room.answer(q, { id: r.id, text: "Late response" }),
    /closed/,
  );
  release();
  await task;
  await close;
  assert.equal(room.board().status, "closed");
  assert.equal(room.host().active.summary.reviewed, 1);
  assert.equal(room.student(p).receipt.text, answer);
  assert.equal(room.student(q).receipt, null);
  assert.ok(!JSON.stringify(room.host()).includes(answer));
  assert.ok(!JSON.stringify(room.board()).includes(answer));
});
test("without a key an unknown question accepts a written response, replaces a revision and retains the previous round report", async () => {
  const room = openClassroom({ cloud: { enabled: false } }),
    p = {};
  await room.analyze({
    text: "How do you justify the result? Explain the main assumption.",
  });
  room.publish(room.host().draft);
  const { id } = room.board();
  await room.answer(p, { id, text: "4" });
  assert.equal(
    room.student(p).receipt.result.label,
    "Gives a result without working",
  );
  await room.answer(p, { id, text: "Here is my reasoning." });
  assert.equal(room.host().active.summary.total, 1);
  await room.close(id);
  await room.analyze({ sample: 1 });
  room.publish(room.host().draft);
  assert.equal(room.host().history[0].id, id);
  assert.equal(room.student(p).receipt, null);
  await assert.rejects(
    () => room.answer(p, { id, text: "Stale response" }),
    /changed/,
  );
});
