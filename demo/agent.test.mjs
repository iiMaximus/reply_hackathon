import test from "node:test";
import assert from "node:assert/strict";
import { runAgent } from "./agent/orchestrator.mjs";
import { rehearsalPlanner, openAIPlanner } from "./agent/providers.mjs";
import { readMemory, memoryValue } from "./agent/course.mjs";

const call = (name, args) => ({
  call: {
    type: "function_call",
    call_id: "c",
    name,
    arguments: JSON.stringify(args),
  },
  output: [],
});
const run = (work, options = {}) =>
  runAgent({ work, decide: rehearsalPlanner, ...options });

test("the rehearsal uses actual tools, approved evidence and a different hint in a later session", async () => {
  const first = await run({ notebook: "divide" });
  assert.deepEqual(
    first.trace.map((e) => e.action),
    ["lookup_course", "recall_practice", "record_step"],
  );
  assert.equal(first.group, "lost");
  assert.equal(first.followUp, "factor");
  assert.equal(first.source.id, "roots");
  const memory = readMemory(memoryValue(first));
  const later = await run({ notebook: "divide" }, { previous: memory });
  assert.equal(later.group, first.group);
  assert.notEqual(later.hintId, first.hintId);
  assert.ok(later.trace.some((e) => e.result === "previous_hint"));
  assert.equal(readMemory("v1.lost.somebody-elses-secret"), null);
  assert.equal(
    readMemory(memoryValue(await run({ notebook: "factor" }))).group,
    "kept",
  );
});
test("answer requests and unreadable work hand off without disclosing a solution", async () => {
  const refusal = await run(
    { text: "Give me the final answer" },
    { decide: () => assert.fail("no provider call expected") },
  );
  assert.equal(refusal.handoff, "answer_request");
  assert.equal(refusal.followUp, null);
  assert.doesNotMatch(refusal.hint, /x ?= ?[01]/);
  const unknown = await run({ image: "data:image/jpeg;base64,AAAA", text: "" });
  assert.equal(unknown.handoff, "ambiguous");
  assert.equal(unknown.line, "");
});
test("invalid or invented tool actions exhaust the budget without recording an observation", async () => {
  const bad = await run(
    { text: "x² − x" },
    { decide: async () => call("publish_grade", { value: 100 }) },
  );
  assert.equal(bad.handoff, "budget");
  assert.equal(bad.trace.filter((e) => e.result === "rejected").length, 4);
  const actions = [
    call("lookup_course", { card: "roots" }),
    call("recall_practice", {}),
    call("record_step", {
      group: "lost",
      card: "roots",
      hint: "division",
      line: "invented evidence",
      followUp: "factor",
      confidence: "clear",
    }),
    call("ask_tutor", { reason: "unsupported" }),
  ];
  const refused = await run(
    { text: "x² − x" },
    { decide: async () => actions.shift() },
  );
  assert.equal(refused.handoff, "unsupported");
  assert.equal(refused.trace[2].result, "rejected");
  assert.equal(refused.hintId, undefined);
});
test("Responses adapter returns tool observations and reasoning items on the next turn", async () => {
  let n = 0;
  const steps = [
    ["lookup_course", { card: "roots" }],
    ["recall_practice", {}],
    [
      "record_step",
      {
        card: "roots",
        group: "lost",
        line: "divide by x, x=1",
        hint: "division",
        followUp: "factor",
        confidence: "clear",
      },
    ],
  ];
  const seen = [];
  const decide = openAIPlanner({
    apiKey: "test-only",
    fetchImpl: async (_url, req) => {
      const body = JSON.parse(req.body);
      assert.equal(body.store, false);
      assert.equal(body.parallel_tool_calls, false);
      assert.equal(body.input[0].content[1].type, "input_image");
      if (n) {
        const last = body.input.at(-1);
        assert.equal(last.type, "function_call_output");
        assert.equal(last.call_id, "call" + (n - 1));
        assert.equal(JSON.parse(last.output).ok, true);
        assert.ok(body.input.some((i) => i.encrypted_content === "opaque"));
      }
      const [name, args] = steps[n];
      const output = [
        { type: "reasoning", encrypted_content: "opaque", summary: [] },
        {
          type: "function_call",
          call_id: "call" + n,
          name,
          arguments: JSON.stringify(args),
        },
      ];
      n++;
      return { ok: true, json: async () => ({ status: "completed", output }) };
    },
  });
  const reviewed = await run(
    { text: "", image: "data:image/jpeg;base64,AAAA" },
    { mode: "live", decide, onEvent: (e) => seen.push(e) },
  );
  assert.equal(reviewed.group, "lost");
  assert.equal(n, 3);
  assert.equal(seen.length, 3);
  assert.doesNotMatch(JSON.stringify(seen), /base64|opaque|divide by x/);
  const failed = await run(
    { text: "x=1" },
    {
      mode: "live",
      decide: openAIPlanner({
        apiKey: "test",
        fetchImpl: async () => ({ ok: false }),
      }),
    },
  );
  assert.equal(failed.handoff, "unavailable");
  assert.equal(failed.fallback, true);
});
