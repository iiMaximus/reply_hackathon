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

test(
  "two students share a room; predictions, observations, privacy, revisions and scoring stay distinct",
  { timeout: 15000 },
  async (t) => {
    const child = spawn(
      process.execPath,
      [new URL("./server.mjs", import.meta.url).pathname],
      {
        env: {
          ...process.env,
          PORT: "0",
          OPENAI_API_KEY: "",
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
    const [, room] = logs.match(/\?room=([A-F\d]+)/);
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
