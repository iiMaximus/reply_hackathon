import assert from "node:assert/strict";
import test from "node:test";
import { probeDerivative, polynomial } from "./agent/slope.mjs";
import { runAgent } from "./agent/orchestrator.mjs";
import { rehearsalPlanner } from "./agent/providers.mjs";
import { recommend, practiceFor } from "./lesson.mjs";

test("a counterexample distinguishes the screenshot claim even though the slopes coincide elsewhere", () => {
  for (const text of ["f′(x)=2+x²", "f’(x) = 2 + x^2", "f'(x)=x**2+2"]) {
    const p = probeDerivative(text);
    assert.equal(p.status, "mismatch");
    assert.deepEqual(
      [p.example.x, p.example.predicted, p.example.measured],
      [2, 6, 2],
    );
    assert.equal(p.cubicTermMatches, true);
    const agreeing = p.points.find((s) => s.x === -2);
    assert.equal(agreeing.predicted, agreeing.measured);
  }
  for (const text of ["f′(x)=−x + x²", "f'(x)=x(x-1)", "f′(x) = 2x²/2 - x"]) {
    assert.equal(probeDerivative(text).status, "match");
  }
  for (const text of [
    "x/x",
    "abs(x)",
    "x^40",
    "process.exit()",
    "1/0",
    "x-",
    "(x+1",
  ]) {
    assert.equal(polynomial(text), null);
  }
  assert.equal(probeDerivative("f′(x)=sin(x)").status, "unsupported");
  assert.equal(probeDerivative("I have no line yet"), null);
});
test("a checked mismatch chooses a power-rule hint and changes the class follow-up", async () => {
  const r = await runAgent({
    work: { text: "f′(x)=2+x²" },
    decide: rehearsalPlanner,
  });
  assert.equal(r.group, "power");
  assert.equal(r.source.id, "powers");
  assert.equal(r.handoff, undefined);
  assert.ok(
    r.trace.find((e) => e.action === "check_slope" && e.result === "mismatch"),
  );
  assert.equal(recommend([r]), "power");
  assert.equal(practiceFor(r.group).focus, "Differentiate one term at a time");
  const revised = await runAgent({
    work: { text: "f′(x)=x²−x" },
    decide: rehearsalPlanner,
  });
  assert.equal(revised.group, "started");
  assert.equal(revised.probe.status, "match");
});
