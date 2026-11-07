import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { forecast } from "./analysis.mjs";

test("forecast validates the provider response and marks prepared fallback examples", async (t) => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only";
  t.after(() => {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  });
  const packed = (value) => ({
    ok: true,
    json: async () => ({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(value) }],
        },
      ],
    }),
  });
  const item = {
    mistake: "Omitting a root",
    signal: "Divides by the variable",
    question: "When is that allowed?",
  };
  assert.deepEqual(
    await forecast(true, async () => packed({ items: [item] })),
    { items: [item], mode: "live" },
  );
  assert.equal(
    (await forecast(true, async () => packed({ items: [{ mistake: 4 }] })))
      .mode,
    "rehearsal",
  );
});

async function startRoom(t, ...flags) {
  const child = spawn(
    process.execPath,
    [new URL("./server.mjs", import.meta.url).pathname, ...flags],
    {
      env: {
        ...process.env,
        PORT: "0",
        POC_PORT: "0",
        OPENAI_API_KEY: flags.includes("--simulate")
          ? "test-key-must-not-enable-live-mode"
          : "",
        PUBLIC_ORIGIN: "",
      },
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  t.after(async () => {
    if (child.exitCode === null) {
      const closed = once(child, "exit");
      child.kill();
      await closed;
    }
  });
  let logs = "";
  for await (const part of child.stdout.iterator({ destroyOnReturn: false })) {
    logs += part;
    if (logs.includes("Students:")) break;
  }
  child.stdout.resume();
  const [, base, secret] = logs.match(
    /Professor: (http:\/\/localhost:\d+)\/present#([a-f\d]+)/,
  );
  const room =
    logs.match(/\?room=([A-F\d]+)/)?.[1] ??
    (await (await fetch(base + "/api/board")).json()).room;
  const api = async (path, payload, cookie = "") => {
    const res = await fetch(base + "/api/" + path, {
      method: payload ? "POST" : "GET",
      headers: { cookie, "content-type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    return {
      status: res.status,
      cookie: res.headers.get("set-cookie")?.split(";")[0],
      value: await res.json(),
    };
  };
  return { api, room, secret, base };
}

test(
  "a new browser session can reuse its approved last hint without carrying the old classroom response",
  { timeout: 15000 },
  async (t) => {
    const { api } = await startRoom(t, "--simulate");
    const first = (await api("join", { direct: true })).cookie;
    const reply = await api(
      "attempt",
      { notebook: "divide", share: true },
      first,
    );
    assert.match(reply.cookie, /^qai_demo_practice=v1\.lost\./);
    const second = (await api("join", { direct: true }, reply.cookie)).cookie;
    const later = await api(
      "attempt",
      { notebook: "divide", share: true },
      second + "; " + reply.cookie,
    );
    assert.notEqual(later.value.attempt.hint, reply.value.attempt.hint);
    assert.equal(
      later.value.attempt.trace.find((e) => e.action === "recall_practice")
        .result,
      "previous_hint",
    );
  },
);

test(
  "a scripted QR round runs from sample handwriting to a fresh scored challenge, and can be replayed",
  { timeout: 15000 },
  async (t) => {
    const { api, secret, base } = await startRoom(t, "--simulate");
    const root = await fetch(base + "/", { redirect: "manual" });
    assert.equal(root.headers.get("location"), "/join");
    assert.equal((await fetch(base + "/join")).status, 200);
    const host = (await api("host", { secret })).cookie;
    const student = (await api("join", { direct: true })).cookie;
    const initial = (await api("host/state", undefined, host)).value;
    assert.equal(initial.simulated, true);
    assert.equal(initial.live, false);
    assert.equal(initial.canLive, false);
    assert.match(initial.join, /\/join$/);
    assert.equal(initial.examples, 6);
    assert.equal(initial.count, 6);
    const unclear = initial.groups.find((g) => g.id === "unclear");
    assert.equal(unclear.count, 1);
    assert.equal(unclear.excerpts[0].handoff, "ambiguous");
    await api("host/restart", {}, host);
    assert.equal((await api("host/examples", {}, student)).status, 403);
    assert.equal((await api("host/mode", { live: true }, host)).status, 409);
    assert.equal((await api("host/release", {}, host)).status, 409);
    const predicted = (await api("host/forecast", {}, host)).value;
    assert.equal(predicted.count, 0);
    assert.equal(predicted.prediction.mode, "rehearsal");
    const simulated = (
      await api(
        "attempt",
        { notebook: "divide", share: true, round: 2 },
        student,
      )
    ).value;
    assert.equal(simulated.attempt.mode, "scripted");
    assert.equal(simulated.attempt.group, "lost");
    await api(
      "attempt",
      { notebook: "factor", share: true, round: 2 },
      student,
    );
    assert.equal(
      (await api("host/state", undefined, host)).value.suggested.title,
      "Shift the roots",
    );
    await api("host/examples", {}, host);
    const room = (await api("host/examples", {}, host)).value;
    assert.equal(room.count, 7);
    assert.equal(room.examples, 6);
    assert.equal(
      room.groups.find((g) => g.id === "lost").excerpts[0].example,
      true,
    );
    assert.equal(
      (await fetch(base + "/samples/divide.png")).headers.get("content-type"),
      "image/png",
    );
    assert.equal(
      (await api("host/release", {}, host)).value.challenge.title,
      "Shift the roots",
    );
    assert.equal(
      (await api("state", undefined, student)).value.challenge.title,
      "Shift the roots",
    );
    const projection = (await api("board")).value;
    assert.equal(projection.examples, 6);
    assert.equal(projection.groups, undefined);
    assert.equal(projection.challenge.key, undefined);
    await api("score", { answer: 2, reason: 0, round: 2 }, student);
    await api("alias", { alias: "Jo" }, student);
    const complete = (await api("host/state", undefined, host)).value;
    assert.equal(complete.audienceCorrect, 1);
    assert.equal(complete.audienceScored, 1);
    assert.equal(complete.board.filter((x) => x.example).length, 3);
    assert.equal(complete.board.filter((x) => !x.example)[0].alias, "Jo");
    const reset = (await api("host/restart", {}, host)).value;
    assert.equal(reset.round, 3);
    assert.equal(reset.count, 0);
    assert.equal(reset.challenge, null);
    assert.equal(reset.prediction, null);
    assert.deepEqual(reset.board, []);
    assert.equal(
      (await api("attempt", { notebook: "factor", round: 2 }, student)).status,
      409,
    );
    const replay = (await api("state", undefined, student)).value;
    assert.equal(replay.round, 3);
    assert.equal(replay.scored, null);
    assert.equal(replay.attempt, null);
  },
);

test(
  "the pilot shares the current photo only with the tutor and replaces it on revision",
  { timeout: 15000 },
  async (t) => {
    const { api, room, secret, base } = await startRoom(t, "--poc");
    const host = (await api("host", { secret })).cookie;
    const student = (await api("join", { room })).cookie;
    const other = (await api("join", { room })).cookie;
    const image = "data:image/png;base64,iVBORw0KGgo=";
    const attempt = await api("attempt", { image, share: true }, student);
    assert.equal(attempt.value.pilot, true);
    assert.equal(attempt.value.attempt.mode, "rehearsal");
    const state = (await api("host/state", undefined, host)).value;
    const snippet = state.groups.find((g) => g.id === "unclear").excerpts[0];
    assert.equal(state.count, 1);
    for (const cookie of ["", student, other]) {
      assert.equal(
        (await fetch(base + snippet.photo, { headers: { cookie } })).status,
        403,
      );
    }
    const photo = await fetch(base + snippet.photo, {
      headers: { cookie: host },
    });
    assert.equal(photo.headers.get("content-type"), "image/png");
    assert.equal(
      Buffer.from(await photo.arrayBuffer()).toString("base64"),
      image.split(",")[1],
    );
    assert.equal(
      (await api("host/correct", { id: snippet.id, group: "lost" }, host)).value
        .groups[0].count,
      1,
    );
    assert.equal((await api("host/release", {}, host)).status, 404);
    await api("attempt", { text: "x=0 and x=1", share: true }, student);
    assert.equal(
      (await fetch(base + snippet.photo, { headers: { cookie: host } })).status,
      404,
    );
    assert.equal((await api("host/state", undefined, host)).value.count, 1);
  },
);

test(
  "two students share a room; predictions, observations, privacy, revisions and scoring stay distinct",
  { timeout: 15000 },
  async (t) => {
    const { api, room, secret } = await startRoom(t);
    assert.equal((await api("host/state")).status, 403);
    const host = (await api("host", { secret })).cookie;
    const a = (await api("join", { room })).cookie;
    const b = (await api("join", { room })).cookie;
    assert.equal((await api("host/forecast", {}, host)).value.count, 0);
    const projector = (await api("board?room=" + room)).value;
    assert.equal(projector.count, 0);
    assert.equal(projector.prediction, undefined);
    assert.equal(projector.groups, undefined);
    assert.equal(projector.lesson.rubric, undefined);
    assert.equal(
      (await api("state", undefined, a)).value.lesson.rubric,
      undefined,
    );
    await api("attempt", { text: "divide by x, x=1", share: false }, a);
    await api("attempt", { text: "x(x-1)=0, x=0 and x=1", share: true }, b);
    let live = (await api("host/state", undefined, host)).value;
    assert.equal(live.count, 2);
    assert.equal(live.groups[0].count, 1);
    assert.equal(live.groups[0].excerpts.length, 0);
    assert.equal(live.groups[1].excerpts.length, 1);
    assert.equal(live.suggested.title, "Keep every root");
    assert.equal(
      (await api("host/release", {}, host)).value.challenge.title,
      "Keep every root",
    );
    assert.equal(
      (await api("state", undefined, a)).value.challenge.title,
      "Keep every root",
    );
    await api("attempt", { text: "x=0 and x=1", share: false }, a);
    live = (await api("host/state", undefined, host)).value;
    assert.equal(live.count, 2);
    assert.equal(live.groups[0].count, 0);
    assert.equal(live.challenge.title, "Keep every root");
    const score = await api("score", { answer: 1, reason: 1 }, a);
    assert.equal(score.value.scored.point, true);
    assert.deepEqual(score.value.board, []);
    assert.equal(
      (await api("score", { answer: 0, reason: 0 }, a)).value.scored.point,
      true,
    );
    await api("alias", { alias: "Ada" }, a);
    assert.deepEqual((await api("state", undefined, b)).value.board, [
      { alias: "Ada", points: 1 },
    ]);
    assert.equal(
      (
        await api(
          "host/correct",
          { id: live.groups[1].excerpts[0].id, group: "started" },
          host,
        )
      ).value.groups[2].count,
      1,
    );
  },
);

test("a professor reviews an imported question, phones vote privately, and the projector only sees turnout", async (t) => {
  const { api, secret } = await startRoom(t, "--simulate");
  const view = "?view=quiz";
  assert.equal(
    (await api("host/quiz/analyze" + view, { sample: 0 })).status,
    403,
  );
  const host = (await api("host", { secret })).cookie;
  const a = (await api("join" + view, { direct: true })).cookie;
  const b = (await api("join" + view, { direct: true })).cookie;
  const data = {
    text: "How many zeros does x² − 1 have?\nA. One\nB. Two\nKey: B\nExplanation: Both +1 and −1 satisfy the equation.",
  };
  const draft = (await api("host/quiz/analyze" + view, data, host)).value
    .teaching.draft;
  assert.equal(draft.question.key, 1);
  assert.equal(draft.question.prompt, "How many zeros does x² − 1 have?");
  assert.equal((await api("state" + view, undefined, a)).value.quiz, null);
  const beam = (await api("host/quiz/analyze" + view, { sample: 0 }, host))
    .value.teaching.draft;
  assert.equal(
    (
      await api(
        "host/quiz/publish" + view,
        { id: draft.id, question: draft.question },
        host,
      )
    ).status,
    409,
  );
  const publish = { id: beam.id, question: beam.question };
  const id = (await api("host/quiz/publish" + view, publish, host)).value
    .teaching.active.id;
  const board = (await api("board" + view)).value;
  assert.equal(board.quiz.id, id);
  for (const field of ["key", "reasonKey", "explanation", "correct", "receipt"])
    assert.ok(!(field in board.quiz));
  assert.ok(!("board" in board));
  const attempt = { id, answer: 0, reason: 1 };
  const reply = (await api("quiz/vote" + view, attempt, a)).value.quiz.receipt;
  assert.equal(reply.right, true);
  assert.equal(reply.reasonRight, false);
  assert.deepEqual(
    (await api("quiz/vote" + view, { id, answer: 2, reason: 0 }, a)).value.quiz
      .receipt,
    reply,
  );
  assert.equal(
    (await api("state" + view, undefined, b)).value.quiz.receipt,
    null,
  );
  await api("quiz/vote" + view, { id, answer: 2 }, b);
  assert.equal((await api("board" + view)).value.quiz.total, 2);
  const responses = await Promise.all(
    [1, 2].map(() => api("host/quiz/close" + view, { id }, host)),
  );
  for (const r of responses) {
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.value).sort(), [
      "join",
      "room",
      "round",
      "showcase",
      "teaching",
    ]);
    const report = r.value.teaching.active.report;
    assert.deepEqual(report.counts, [1, 0, 1, 0]);
    assert.equal(report.split, 1);
    assert.equal(report.explained, 1);
    assert.ok(!JSON.stringify(report).includes(a.split("=")[1]));
    assert.ok(!("votes" in report));
  }
  const again = (await api("host/quiz/analyze" + view, data, host)).value
    .teaching.draft;
  const next = (
    await api(
      "host/quiz/publish" + view,
      { id: again.id, question: again.question },
      host,
    )
  ).value.teaching;
  assert.equal(next.history[0].id, id);
  assert.equal(next.active.total, 0);
  assert.equal((await api("quiz/vote" + view, attempt, b)).status, 409);
});

test("an open quiz tab reconnects after a server restart without applying an old live vote", async (t) => {
  const { api } = await startRoom(t, "--simulate");
  const stale = "student=" + "a".repeat(40);
  const state = await api("state?view=quiz", undefined, stale);
  assert.equal(state.status, 200);
  assert.ok(state.cookie && state.cookie !== stale);
  assert.equal(
    (
      await api(
        "quiz/vote?view=quiz",
        { id: "old-poll", answer: 0 },
        state.cookie,
      )
    ).status,
    409,
  );
  const result = await api(
    "quiz/practice?view=quiz",
    { id: "practice-calculus", answer: 1, reason: 1 },
    stale,
  );
  assert.equal(result.status, 200);
  assert.equal(result.value.quizPractice.receipt.right, false);
});
