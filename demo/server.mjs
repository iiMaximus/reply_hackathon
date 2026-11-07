import http from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { networkInterfaces } from "node:os";
import { readFile } from "node:fs/promises";
import QRCode from "qrcode";
import { createTeachingRoom } from "./quiz/room.mjs";
import { cloudClient } from "./quiz/agent.mjs";
import { forecast } from "./analysis.mjs";
import { runAgent } from "./agent/orchestrator.mjs";
import { rehearsalPlanner, openAIPlanner } from "./agent/providers.mjs";
import { readMemory, memoryValue } from "./agent/course.mjs";
import { notebooks, sampleClass } from "./simulation.mjs";
import {
  groups,
  lesson,
  practiceFor,
  publicVariant,
  recommend,
  studentLesson,
  variants,
} from "./lesson.mjs";

const pilot = process.argv.includes("--poc");
const localAI = process.argv.includes("--local-ai");
const simulated = localAI || process.argv.includes("--simulate");
const strategyMatcher = localAI
  ? await (await import("./model/strategies.mjs")).createStrategyMatcher()
  : null;
const liveClass = process.argv.includes("--live");
const showcase = simulated || liveClass;
if (liveClass && !simulated && !process.env.OPENAI_API_KEY) {
  throw new Error(
    "Live classroom needs OPENAI_API_KEY. For the offline simulation use npm run demo.",
  );
}
const teaching = createTeachingRoom({
  match: strategyMatcher,
  cloud: cloudClient({
    enabled:
      Boolean(process.env.OPENAI_API_KEY) &&
      !process.argv.includes("--simulate"),
  }),
});
const port = Number(
  pilot
    ? (process.env.POC_PORT ?? 4174)
    : (process.env.PORT ?? (showcase ? 4175 : 4173)),
);
const addr = Object.values(networkInterfaces())
  .flat()
  .find((n) => n?.family === "IPv4" && !n.internal);
let origin;
const secret = process.env.PRESENTER_SECRET
  ? createHash("sha256").update(process.env.PRESENTER_SECRET).digest("hex")
  : randomBytes(24).toString("hex");
const room = randomBytes(3).toString("hex").toUpperCase();
let join;
const people = new Map();
const openReview = new Set();
let live = !simulated && Boolean(process.env.OPENAI_API_KEY);
const examples = new Map();
let round = 1;
function participants() {
  return [...examples.values(), ...people.values()];
}
let challenge = null;
let releaseReason = null;
let prediction = null;
let predictionJob = null;
let aiRequests = 0;
const maxRequests = 120;
const memoryCookie = simulated || !live ? "demo_practice" : "course_practice";
function logAgent(event) {
  console.info(JSON.stringify({ event: "classroom.agent", ...event }));
}
async function seedClass() {
  const prepared = sampleClass();
  for (const p of prepared)
    p.attempt = await runAgent({
      work: p.work,
      decide: rehearsalPlanner,
      matchStrategy: strategyMatcher,
      stepBudget: strategyMatcher ? 5 : 4,
      mode: localAI ? "local" : "scripted",
      onEvent: logAgent,
    });
  for (const p of prepared) examples.set(p.reviewId, p);
}
if (simulated) await seedClass();

const web = new URL("./web/", import.meta.url);
const files = {
  "/": [new URL("index.html", web), "text/html; charset=utf-8"],
  "/present": [new URL("index.html", web), "text/html; charset=utf-8"],
  "/board": [new URL("index.html", web), "text/html; charset=utf-8"],
  "/teaching.js": [
    new URL("teaching.js", web),
    "text/javascript; charset=utf-8",
  ],
  "/teaching.css": [new URL("teaching.css", web), "text/css; charset=utf-8"],
  "/lens.js": [new URL("lens.js", web), "text/javascript; charset=utf-8"],
  "/app.js": [new URL("app.js", web), "text/javascript; charset=utf-8"],
  "/style.css": [new URL("style.css", web), "text/css; charset=utf-8"],
  "/join": [new URL("index.html", web), "text/html; charset=utf-8"],
  ...Object.fromEntries(
    Object.keys(notebooks).map((id) => [
      "/samples/" + id + ".png",
      [new URL("samples/" + id + ".png", web), "image/png"],
    ]),
  ),
  "/sans.woff2": [
    new URL(
      "../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
      import.meta.url,
    ),
    "font/woff2",
  ],
  "/serif.woff2": [
    new URL(
      "../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2",
      import.meta.url,
    ),
    "font/woff2",
  ],
};

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
function json(res, data) {
  // The quiz clients have their own contract. Notebook excerpts, aliases, and photos
  // are never included in the teacher, student, or projector quiz payloads.
  if (res.quizView && data.showcase) {
    const keys = [
      "room",
      "showcase",
      "round",
      "join",
      "teaching",
      "quiz",
      "quizPractice",
    ];
    data = Object.fromEntries(
      keys
        .filter((key) => Object.hasOwn(data, key))
        .map((key) => [key, data[key]]),
    );
  }
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}
function cookie(req, name) {
  if (pilot) name = "poc_" + name;
  return (req.headers.cookie || "")
    .split("; ")
    .find((v) => v.startsWith(name + "="))
    ?.slice(name.length + 1);
}
function setCookie(res, name, value, maxAge = 0) {
  if (pilot) name = "poc_" + name;
  res.setHeader(
    "Set-Cookie",
    name +
      "=" +
      value +
      "; Path=/; HttpOnly; SameSite=Strict" +
      (maxAge ? "; Max-Age=" + maxAge : "") +
      (origin.startsWith("https:") ? "; Secure" : ""),
  );
}
async function body(req, limit = 2800000) {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    fail(415, "Use a JSON request.");
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit)
      fail(413, "The file is too large. Choose a smaller file.");
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (value && typeof value === "object" && !Array.isArray(value))
      return value;
  } catch {}
  fail(400, "Invalid request.");
}
function standings() {
  return participants()
    .filter((p) => p.alias && p.scored?.point)
    .map((p) => ({
      alias: p.alias,
      points: 1,
      ...(p.example ? { example: true } : {}),
    }));
}
function proposedChallenge() {
  const real = [...people.values()].filter(
    (p) => p.attempt && p.attempt.group !== "unclear",
  );
  const current = real.length ? real : participants().filter((p) => p.attempt);
  return recommend(current.map((p) => p.attempt));
}
function reasonFor(variant) {
  if (variant === "power")
    return "A submitted derivative predicts a slope the curve does not have.";
  if (variant === "factor")
    return "A step divided by x without showing the zero case.";
  return "Check whether the same reasoning works with different factors.";
}
function dashboard() {
  const students = participants();
  const submitted = students.filter((p) => p.attempt);
  const suggested = proposedChallenge();
  return {
    room,
    join,
    pilot: pilot || showcase,
    showcase,
    simulated,
    engine: localAI ? "local" : live ? "openai" : "scripted",
    round,
    examples: examples.size,
    live,
    canLive: !simulated && Boolean(process.env.OPENAI_API_KEY),
    ...(showcase ? { teaching: teaching.host() } : {}),
    audienceScored: [...people.values()].filter((p) => p.scored).length,
    audienceCorrect: [...people.values()].filter((p) => p.scored?.point).length,
    count: submitted.length,
    fallbackCount: submitted.filter((p) => p.attempt.fallback).length,
    joined: students.length,
    groups: Object.entries(groups).map(([id, title]) => ({
      id,
      title,
      count: submitted.filter((p) => p.attempt.group === id).length,
      excerpts: submitted
        .filter((p) => p.share && p.attempt.group === id)
        .map((p) => ({
          id: p.reviewId,
          line: p.attempt.line,
          trace: p.attempt.trace,
          probe: p.attempt.probe,
          strategy: p.attempt.strategy,
          source: p.attempt.source,
          handoff: p.attempt.handoff,
          ...(p.example ? { example: true, exampleName: p.alias } : {}),
          ...(p.attempt.notebook
            ? { photo: "/samples/" + p.attempt.notebook + ".png" }
            : {}),
          ...(p.photo
            ? { photo: "/api/host/photo/" + p.reviewId + "?v=" + p.version }
            : {}),
        })),
    })),
    suggested: publicVariant(suggested),
    challenge: publicVariant(challenge),
    recommendationReason: releaseReason ?? reasonFor(suggested),
    board: standings(),
    lesson,
    prediction,
  };
}
function studentView(p) {
  return {
    room,
    pilot: pilot || showcase,
    showcase,
    simulated,
    engine: localAI ? "local" : live ? "openai" : "scripted",
    round,
    lesson: studentLesson(),
    ...(showcase
      ? { quiz: teaching.student(p), quizPractice: teaching.practice(p) }
      : {}),
    practice: practiceFor(p.attempt?.group),
    challenge: publicVariant(challenge),
    live,
    attempt: p.attempt,
    share: p.share,
    alias: p.alias,
    scored: p.scored,
    board: standings(),
  };
}

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  res.quizView = url.searchParams.get("view") === "quiz";
  if (path === "/health" && req.method === "GET")
    return json(res, { ok: true });
  if (
    path === "/" &&
    showcase &&
    req.method === "GET" &&
    !url.searchParams.has("room")
  ) {
    res.writeHead(302, { Location: "/join", "Cache-Control": "no-store" });
    return res.end();
  }
  if (req.method === "GET" && Object.hasOwn(files, path)) {
    const [file, type] = files[path];
    res.setHeader("Content-Type", type);
    res.end(await readFile(file));
    return;
  }
  if (req.method === "GET" && path === "/qr.png") {
    res.setHeader("Content-Type", "image/png");
    res.end(
      await QRCode.toBuffer(
        showcase && url.searchParams.get("view") === "notebook"
          ? join + "?view=notebook"
          : join,
        { width: 260, margin: 4 },
      ),
    );
    return;
  }
  if (req.method === "GET" && path === "/api/board") {
    if (
      url.searchParams.get("room") !== room &&
      !(showcase && !url.searchParams.has("room"))
    )
      fail(404, "Open the projector link from the professor’s view.");
    const count = participants().filter((p) => p.attempt).length;
    return json(res, {
      room,
      showcase,
      simulated,
      engine: localAI ? "local" : live ? "openai" : "scripted",
      round,
      examples: examples.size,
      ...(showcase ? { quiz: teaching.board() } : {}),
      lesson: studentLesson(),
      count,
      challenge: publicVariant(challenge),
      board: standings(),
    });
  }
  if (req.method === "POST" && path === "/api/host") {
    const input = await body(req);
    if (input.secret !== secret)
      fail(403, "Open the private presenter link printed by the server.");
    setCookie(res, "host", secret);
    return json(res, {});
  }
  if (path.startsWith("/api/host/")) {
    if (cookie(req, "host") !== secret)
      fail(403, "Open the private presenter link printed by the server.");
    if (
      (pilot || showcase) &&
      req.method === "GET" &&
      path.startsWith("/api/host/photo/")
    ) {
      const id = path.slice("/api/host/photo/".length);
      const person = [...people.values()].find((p) => p.reviewId === id);
      if (
        !person?.share ||
        !person.photo ||
        String(person.version) !== url.searchParams.get("v")
      )
        fail(404, "That photo is no longer available.");
      const [meta, data] = person.photo.split(",");
      res.writeHead(200, {
        "Content-Type": meta.slice(5, meta.indexOf(";")),
        "Cache-Control": "private, no-store",
      });
      return res.end(Buffer.from(data, "base64"));
    }
    if (path === "/api/host/state" && req.method === "GET")
      return json(res, dashboard());
    if (req.method !== "POST") fail(405, "Unsupported action.");
    if (showcase && path.startsWith("/api/host/quiz/")) {
      const input = await body(req, 5700000);
      if (path === "/api/host/quiz/analyze") await teaching.analyze(input);
      else if (path === "/api/host/quiz/publish") teaching.publish(input);
      else if (path === "/api/host/quiz/close") await teaching.close(input.id);
      else fail(404, "Unknown classroom action.");
      return json(res, dashboard());
    }
    const input = await body(req);
    if (pilot && path !== "/api/host/correct")
      fail(404, "This room is for sharing one step.");
    if (path === "/api/host/release") {
      if (showcase && !participants().some((p) => p.attempt))
        fail(409, "Collect a step first.");
      challenge ??= proposedChallenge();
      if (!challenge)
        fail(409, "Review a clear step before opening a follow-up.");
      releaseReason ??= reasonFor(challenge);
      for (const p of examples.values())
        p.scored ??= { point: p.exampleTransfer };
    } else if (simulated && path === "/api/host/examples") {
      if (!examples.size && challenge)
        fail(409, "Restart the round before loading an example class.");
      if (!examples.size) await seedClass();
    } else if (simulated && path === "/api/host/restart") {
      examples.clear();
      for (const p of people.values()) {
        Object.assign(p, {
          attempt: null,
          photo: null,
          share: false,
          alias: "",
          scored: null,
          reviews: 0,
        });
        p.version++;
      }
      prediction = null;
      challenge = null;
      releaseReason = null;
      round++;
    } else if (path === "/api/host/mode") {
      if (showcase) fail(409, "This classroom’s analysis mode is fixed.");
      live = Boolean(input.live && process.env.OPENAI_API_KEY);
    } else if (path === "/api/host/forecast") {
      if (!prediction || (live && prediction.mode === "rehearsal")) {
        if (!predictionJob) {
          const useLive = live && aiRequests < maxRequests;
          if (useLive) aiRequests++;
          predictionJob = forecast(useLive).finally(() => {
            predictionJob = null;
          });
        }
        prediction = await predictionJob;
      }
    } else if (path === "/api/host/correct") {
      const p = participants().find(
        (p) => p.reviewId === input.id && p.share && p.attempt,
      );
      if (!p || !Object.hasOwn(groups, input.group))
        fail(400, "That excerpt is unavailable.");
      p.attempt.group = input.group;
      p.attempt.followUp =
        input.group === "power"
          ? "power"
          : input.group === "lost"
            ? "factor"
            : input.group === "unclear"
              ? null
              : "shift";
      p.attempt.handoff = input.group === "unclear" ? "ambiguous" : null;
      p.attempt.trace?.push({
        step: p.attempt.trace.length + 1,
        action: "tutor_correction",
        result: input.group,
      });
    } else fail(404, "Unknown action.");
    return json(res, dashboard());
  }
  let p = people.get(cookie(req, "student"));
  if (path === "/api/join" && req.method === "POST") {
    const input = await body(req);
    if (input.room !== room && input.direct !== true)
      fail(
        404,
        "Scan the room code on the projector or enter the six characters.",
      );
    if (!p) {
      if (people.size >= (pilot ? 20 : 300))
        fail(429, "This demo room is full.");
      const token = randomBytes(20).toString("hex");
      p = {
        reviewId: randomBytes(8).toString("hex"),
        alias: "",
        attempt: null,
        share: false,
        version: 0,
        scored: null,
        reviews: 0,
      };
      people.set(token, p);
      setCookie(res, "student", token);
    }
    return json(res, studentView(p));
  }
  if (!p) fail(403, "Join the room first.");
  if (path === "/api/state" && req.method === "GET")
    return json(res, studentView(p));
  if (req.method !== "POST") fail(405, "Unsupported action.");
  const input = await body(req);
  if (showcase && input.round !== undefined && input.round !== round)
    fail(409, "The tutor started a new round. Refresh and try again.");
  if (pilot && path !== "/api/attempt")
    fail(404, "This room is for sharing one step.");
  if (showcase && path === "/api/quiz/practice") {
    teaching.practiceVote(p, input);
    return json(res, studentView(p));
  }
  if (showcase && path === "/api/quiz/vote") {
    teaching.vote(p, input);
    return json(res, studentView(p));
  }
  if (path === "/api/attempt") {
    const text =
      typeof input.text === "string" ? input.text.trim().slice(0, 1500) : "";
    const image = input.image || null;
    const notebook =
      simulated &&
      typeof input.notebook === "string" &&
      Object.hasOwn(notebooks, input.notebook)
        ? input.notebook
        : null;
    if (input.notebook && (!notebook || text || image))
      fail(400, "Choose a prepared page or send your own work.");
    if (
      image &&
      (typeof image !== "string" ||
        !/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(image))
    )
      fail(400, "Use a JPEG, PNG or WebP photo.");
    if (!text && !image && !notebook)
      fail(400, "Add a photo or type a step first.");
    if (openReview.has(p)) fail(409, "Your last step is still being read.");
    openReview.add(p);
    try {
      const work = { text, image, notebook };
      const reserve = () => {
        if (aiRequests >= maxRequests || p.reviews >= 24) return false;
        p.reviews++;
        aiRequests++;
        return true;
      };
      const review = await runAgent({
        work,
        previous: readMemory(cookie(req, memoryCookie)),
        mode: localAI
          ? "local"
          : live
            ? "live"
            : notebook
              ? "scripted"
              : "rehearsal",
        stepBudget: 5,
        matchStrategy: strategyMatcher,
        decide: live ? openAIPlanner({ reserve }) : rehearsalPlanner,
        onEvent: logAgent,
      });
      const memory = memoryValue(review);
      if (memory) setCookie(res, memoryCookie, memory, 30 * 86400);
      if (
        image &&
        !live &&
        !text &&
        (pilot || showcase) &&
        input.share === true
      ) {
        review.hint =
          "Your tutor can see the photo. Add a line if you want to clarify it.";
      }
      p.attempt = review;
      p.share = input.share === true;
      if (pilot || showcase) {
        p.photo = p.share ? image : null;
        p.version++;
      }
    } finally {
      openReview.delete(p);
    }
  } else if (path === "/api/score") {
    if (!challenge) fail(409, "The professor has not opened the challenge.");
    const v = variants[challenge];
    if (
      !Number.isInteger(input.answer) ||
      !v.answers[input.answer] ||
      !Number.isInteger(input.reason) ||
      !v.reasons[input.reason]
    )
      fail(400, "Choose an answer and a reason.");
    p.scored ??= {
      point: input.answer === v.key && input.reason === v.reasonKey,
      explanation: v.answers[v.key] + " · " + v.reasons[v.reasonKey],
    };
  } else if (path === "/api/alias") {
    const alias = String(input.alias || "")
      .trim()
      .slice(0, 20);
    if (
      participants().some(
        (other) =>
          other !== p &&
          alias &&
          other.alias.toLowerCase() === alias.toLowerCase(),
      )
    )
      fail(409, "That alias is taken. Try another.");
    p.alias = alias;
  } else fail(404, "Unknown action.");
  return json(res, studentView(p));
}

const server = http.createServer((req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  handle(req, res).catch((error) => {
    res.writeHead(error.status || 500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: error.status
          ? error.message
          : "The room could not complete that request. Try again.",
      }),
    );
  });
});
server.listen(port, "0.0.0.0", () => {
  const boundPort = server.address().port;
  origin = new URL(
    process.env.PUBLIC_ORIGIN ||
      process.env.RENDER_EXTERNAL_URL ||
      "http://" + (addr?.address || "localhost") + ":" + boundPort,
  ).origin;
  join = origin + (showcase ? "/join" : "/?room=" + room);
  console.log(
    "Professor: " +
      (process.env.RENDER_EXTERNAL_URL ||
        process.env.PUBLIC_ORIGIN ||
        "http://localhost:" + boundPort) +
      "/present#" +
      secret,
  );
  console.log(
    "Students: " +
      join +
      " · " +
      (localAI
        ? "MiniLM classroom"
        : simulated
          ? "Scripted simulation"
          : live
            ? "Live analysis"
            : "Rehearsal analysis"),
  );
});
