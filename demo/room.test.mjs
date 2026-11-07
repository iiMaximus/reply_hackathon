import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { analyze, forecast } from "./analysis.mjs";

test("live analysis sends the photo and rubric, validates the response, and recovers privately on provider failure", async (t) => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only";
  t.after(() => {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  });
  const image = "data:image/jpeg;base64,AAAA";
  const sample = {
    group: "lost",
    line: "x − 1 = 0",
    hint: "Which values allow division?",
  };
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
  const read = await analyze(
    { image, text: "", live: true },
    async (_url, req) => {
      const request = JSON.parse(req.body);
      assert.equal(request.input[0].content[1].image_url, image);
      assert.match(request.instructions, /separate check of x=0/);
      assert.equal(request.store, false);
      return packed(sample);
    },
  );
  assert.equal(read.mode, "live");
  assert.equal(read.line, sample.line);
  const offline = await analyze({ image, text: "", live: true }, async () => ({
    ok: false,
  }));
  assert.equal(offline.group, "unclear");
  assert.equal(offline.fallback, true);
  assert.equal(offline.line, "");
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
  for await (const part of child.stdout) {
    logs += part;
    if (logs.includes("Students:")) break;
  }
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
    assert.equal((await api("host/examples", {}, student)).status, 403);
    assert.equal((await api("host/mode", { live: true }, host)).status, 409);
    assert.equal((await api("host/release", {}, host)).status, 409);
    const predicted = (await api("host/forecast", {}, host)).value;
    assert.equal(predicted.count, 0);
    assert.equal(predicted.prediction.mode, "rehearsal");
    const simulated = (
      await api(
        "attempt",
        { notebook: "divide", share: true, round: 1 },
        student,
      )
    ).value;
    assert.equal(simulated.attempt.mode, "scripted");
    assert.equal(simulated.attempt.group, "lost");
    await api(
      "attempt",
      { notebook: "factor", share: true, round: 1 },
      student,
    );
    assert.equal(
      (await api("host/state", undefined, host)).value.suggested.title,
      "Shift the roots",
    );
    await api("host/examples", {}, host);
    const room = (await api("host/examples", {}, host)).value;
    assert.equal(room.count, 4);
    assert.equal(room.examples, 3);
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
      "Keep every root",
    );
    assert.equal(
      (await api("state", undefined, student)).value.challenge.title,
      "Keep every root",
    );
    const projection = (await api("board")).value;
    assert.equal(projection.examples, 3);
    assert.equal(projection.groups, undefined);
    assert.equal(projection.challenge.key, undefined);
    await api("score", { answer: 1, reason: 1, round: 1 }, student);
    await api("alias", { alias: "Jo" }, student);
    const complete = (await api("host/state", undefined, host)).value;
    assert.equal(complete.audienceCorrect, 1);
    assert.equal(complete.audienceScored, 1);
    assert.equal(complete.board.filter((x) => x.example).length, 2);
    assert.equal(complete.board.filter((x) => !x.example)[0].alias, "Jo");
    const reset = (await api("host/restart", {}, host)).value;
    assert.equal(reset.round, 2);
    assert.equal(reset.count, 0);
    assert.equal(reset.challenge, null);
    assert.equal(reset.prediction, null);
    assert.deepEqual(reset.board, []);
    assert.equal(
      (await api("attempt", { notebook: "factor", round: 1 }, student)).status,
      409,
    );
    const replay = (await api("state", undefined, student)).value;
    assert.equal(replay.round, 2);
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
