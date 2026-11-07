import { escapeHTML as h, mathText as math } from "/math.js";
const btn = (action, label, primary = false, extra = "") =>
  `<button type="button" data-action-open="${action}" class="${primary ? "primary" : ""}" ${extra}>${math(label)}</button>`;
const field = (id, label, value, rows = 3, max = 3000) =>
  `<label class="field" for="${id}">${h(label)}</label><textarea id="${id}" rows="${rows}" maxlength="${max}">${h(value)}</textarea>`;
const picker = (id, label, accept) =>
  `<label class="file-button">${h(label)}<input id="${id}" type="file" accept="${accept}"></label>`;
const status = (label) =>
  `<div class="status-line"><span class="status-dot"></span>${h(label)}</div>`;
const heading = (title, desc = "") =>
  `<div class="heading"><h1>${math(title)}</h1>${desc ? `<p>${h(desc)}</p>` : ""}</div>`;
let controls,
  root,
  role,
  state,
  screen = "",
  pending = "",
  error = "",
  percent = null;
let source = "",
  draft = null,
  draftId = "",
  attach = false,
  asset = null,
  upload = null,
  page = 1,
  exercises = [],
  exercise = 0;
let studentId = "",
  answer = "",
  editing = false,
  tab = "class",
  reportId = "",
  selectedReview = null;
let saved = [];
try {
  const data = JSON.parse(localStorage.getItem("showwork-progress") || "[]");
  if (Array.isArray(data)) saved = data.slice(0, 40);
} catch {}
const reportExample = {
  id: "example",
  topic: "Mechanics",
  prompt:
    "If a cantilever’s length and section height both double, what happens to tip deflection? Explain your reasoning.",
  summary: {
    total: 24,
    reviewed: 24,
    groups: [
      {
        label: "Used the cubic relationship for both length and height",
        count: 11,
      },
      {
        label: "Used a linear relationship between length and height",
        count: 8,
      },
      { label: "Considered length alone", count: 3 },
      { label: "Reasoning needs a closer look", count: 2 },
    ],
    move: "Double only the beam length. Ask students to compare the linear prediction with the cubic one.",
  },
};
function loading() {
  return `<div id="open-progress" class="loading" role="status" ${pending ? "" : "hidden"}><progress ${percent === null ? "" : `max="100" value="${percent}"`}></progress><span>${h(pending)}${percent === null ? "" : " · " + percent + "%"}</span></div>`;
}
function progress(text, n = null) {
  pending = text;
  percent = n;
  const el = root?.querySelector("#open-progress");
  if (el) {
    el.hidden = false;
    el.querySelector("span").textContent =
      text + (n === null ? "" : " · " + n + "%");
    const bar = el.querySelector("progress");
    if (n === null) bar.removeAttribute("value");
    else {
      bar.max = 100;
      bar.value = n;
    }
  }
}
function fileReset() {
  upload?.dispose?.();
  upload = null;
  asset = null;
  page = 1;
  exercises = [];
  exercise = 0;
  attach = false;
}
async function task(label, fn) {
  if (pending) return;
  pending = label;
  percent = null;
  error = "";
  controls.draw();
  try {
    await fn();
  } catch (e) {
    error = e.message || "This action could not finish. Please try again.";
  } finally {
    pending = "";
    percent = null;
    controls.draw();
  }
}
async function post(path, input) {
  const next = await controls.api(path, input);
  controls.set(next);
  state = next;
}
function imageOf(r) {
  return r?.image
    ? `<img class="question-image" src="${h(r.image)}" alt="Question material shared by the professor">`
    : "";
}
function reports(c) {
  const rows = [
    ...(c.active?.status === "closed" ? [c.active] : []),
    ...c.history,
  ];
  return `<section class="side-section"><h2>Class reports</h2>${rows.map((r) => btn("report", r.topic || r.prompt, false, `data-id="${h(r.id)}"`)).join("")}${btn("report", "View example report", false, 'data-id="example"')}</section>`;
}
function home(c) {
  return (
    heading(
      "Prepare a question",
      "Use a question from your course. You can review it before students see it.",
    ) +
    `<div class="columns"><section class="panel"><h2>Upload a question</h2><div class="upload-area">
    ${picker("open-file", "Choose a photo or worksheet", ".jpg,.jpeg,.png,.webp,.pdf,.txt,.md")}
    <span class="muted">JPG, PNG, WebP, PDF or text · up to 16 MB</span></div>
    <div class="or"><span>or paste the question</span></div>
    <label class="sr-only" for="open-source">Question text</label><textarea id="open-source" rows="4" maxlength="5000" placeholder="Paste one open question here.">${h(source)}</textarea><div class="actions">${btn("analyze", "Review question", true, source.trim().length < 8 ? "disabled" : "")}</div>
    ${c.draft ? btn("resume", "Continue with saved draft") : ""}</section>
    <aside><section class="side-section"><h2>Course examples</h2>${c.examples.map((name, i) => btn("sample", name, false, `data-index="${i}"`)).join("")}</section>${reports(c)}</aside></div>`
  );
}
function uploadView() {
  const opts = Array.from(
    { length: upload.pages },
    (_, i) =>
      `<option value="${i + 1}" ${page === i + 1 ? "selected" : ""}>Page ${i + 1}</option>`,
  ).join("");
  return (
    btn("back", "Back to questions") +
    heading("Choose the question", upload.name) +
    `<section class="panel"><div class="file-controls">${upload.pages > 1 ? `<label>Worksheet page <select id="open-page">${opts}</select></label>` : ""}
    ${exercises.length > 1 ? `<label>Question <select id="open-exercise">${exercises.map((_, i) => `<option value="${i}" ${i === exercise ? "selected" : ""}>Question ${i + 1}</option>`).join("")}</select></label>` : ""}</div>
    ${asset?.image ? `<details data-preserve="material"><summary>See original page</summary><img class="question-image" src="${h(asset.image)}" alt="Selected worksheet page"></details>` : ""}
    ${field("open-source", "Text to use", source, 7, 5000)}<div class="actions">${btn("analyze", "Prepare this question", true, source.trim().length < 8 ? "disabled" : "")}</div></section>`
  );
}
function preview(value) {
  const html = math(value);
  return html === h(value)
    ? ""
    : '<small>Student preview</small><p class="question">' + html + "</p>";
}
function editor() {
  return (
    btn(
      upload?.pages > 1 ? "pick-page" : "back",
      upload?.pages > 1 ? "Back to worksheet" : "Back to questions",
    ) +
    heading(
      "Review question",
      "Only the question and any image you select will be shared.",
    ) +
    `<section class="panel editor">${field("open-prompt", "Question students will see", draft.prompt, 4)}<div id="open-preview">${preview(draft.prompt)}</div>
    ${asset?.image ? `<details data-preserve="attachment"><summary>Original image</summary><img class="question-image" src="${h(asset.image)}" alt="Uploaded page"></details><label class="check"><input type="checkbox" id="open-attach" ${attach ? "checked" : ""}> Also show this image to students</label>` : ""}
    <label class="field" for="open-topic">Topic</label><input id="open-topic" maxlength="100" placeholder="Optional" value="${h(draft.topic)}">
    ${field("open-ref", "Private reference answer", draft.reference, 3, 1000)}
    <p class="muted">Add a reference for content feedback. Without one, the agent looks for how students approached the question.</p>
    ${draft.patterns.length > 1 ? `<details data-preserve="patterns"><summary>What the agent will look for</summary>${draft.patterns.map((p) => `<p>${math(p.anchor)}</p>`).join("")}</details>` : ""}
    <div class="actions">${btn("publish", "Open for students", true)}<span class="muted">${h(draft.engine)}</span></div></section>`
  );
}
function invite(projector = false) {
  return `<aside class="invite"><h2>Scan to join</h2><img src="/qr.png" alt="QR code for the student room"><p>No account or room code needed.</p>
  ${projector ? "" : `<a href="/board" target="_blank" rel="noopener">Open projector</a> ${btn("copy", "Copy student link")}`}</aside>`;
}
function stats(s) {
  return `<dl class="stats"><div><dt>Responses</dt><dd>${s.total}</dd></div><div><dt>Reviewed</dt><dd>${s.reviewed}</dd></div><div><dt>Being checked</dt><dd>${s.total - s.reviewed}</dd></div></dl>`;
}
function breakdown(s) {
  const groups = s.groups.filter((g) => g.count);
  return groups.length
    ? `<ul class="distribution">${groups
        .sort((a, b) => b.count - a.count)
        .map(
          (g) =>
            `<li><div><span>${math(g.label)}</span><strong>${g.count}</strong></div><progress aria-label="${h(g.label)}" max="${s.reviewed}" value="${g.count}"></progress></li>`,
        )
        .join("")}</ul>`
    : '<p class="muted">Reasoning patterns appear as responses are reviewed.</p>';
}
function live(c) {
  const r = c.active,
    s = r.summary;
  return (
    heading(r.topic || "Class question") +
    status(
      r.status === "closing"
        ? "Finishing the class report"
        : "Open for responses",
    ) +
    `<div class="columns"><section class="panel"><p class="question">${math(r.prompt)}</p>${imageOf(r)}${stats(s)}
    <h2>Live reasoning patterns</h2>${breakdown(s)}<div class="actions">${btn("close", "Close and view report", true, r.status === "closing" ? "disabled" : "")}<span class="muted">${c.connected} student device${c.connected === 1 ? "" : "s"} connected</span></div></section>${invite()}</div>`
  );
}
function report(r) {
  return (
    btn("back", "Back to questions") +
    heading(
      "Class report",
      r.id === "example"
        ? "Example data from a mechanics tutorial."
        : "Anonymous responses to the class question.",
    ) +
    `<section class="panel"><p class="question">${math(r.prompt)}</p>${stats(r.summary)}<div class="report-grid"><section><h2>Reasoning patterns</h2>${breakdown(r.summary)}</section>
    <section><h2>What to teach next</h2><p>${math(r.summary.move || "There are no responses to interpret.")}</p>${r.summary.engine ? `<small>${h(r.summary.engine)}</small>` : ""}</section></div></section><div class="actions">${btn("back", "Prepare another question", true)}</div>`
  );
}
function teacher(c) {
  if (c.active && c.active.status !== "closed") return live(c);
  if (screen === "report") {
    const r =
      reportId === "example"
        ? reportExample
        : [c.active, ...c.history].find((r) => r?.id === reportId);
    if (r) return report(r);
  }
  if (screen === "upload" && upload) return uploadView();
  if (screen === "edit" && c.draft) {
    if (draftId !== c.draft.id) {
      draft = structuredClone(c.draft);
      draftId = draft.id;
    }
    return editor();
  }
  return home(c);
}
function remember(r, v) {
  if (!r || !v?.result) return;
  const row = {
    id: r.id,
    prompt: r.prompt,
    topic: r.topic,
    text: v.text,
    hint: v.result.hint,
  };
  if (saved.find((x) => x.id === r.id)?.text === row.text) return;
  saved = [row, ...saved.filter((x) => x.id !== r.id)].slice(0, 40);
  try {
    localStorage.setItem("showwork-progress", JSON.stringify(saved));
  } catch {}
}
function student(c) {
  const r = c.active,
    v = c.receipt;
  if (studentId !== (r?.id || "")) {
    studentId = r?.id || "";
    answer = "";
    editing = false;
    tab = "class";
  }
  remember(r, v);
  const nav = `<nav aria-label="Student views">${btn("class", "Class question", false, `aria-current="${tab === "class" ? "page" : "false"}"`)}${btn("progress", "My work", false, `aria-current="${tab === "progress" ? "page" : "false"}"`)}</nav>`;
  if (tab === "progress") {
    const item = saved.find((x) => x.id === selectedReview);
    return (
      nav +
      heading("My work", "Your responses are saved on this browser.") +
      `<section class="panel">${
        item
          ? `${btn("progress", "All responses")}<p class="question">${math(item.prompt)}</p><h2>Your response</h2><p class="written">${math(item.text)}</p><h2>Feedback</h2><p>${math(item.hint)}</p>`
          : saved.length
            ? saved
                .map((x) =>
                  btn("history", x.prompt, false, `data-id="${h(x.id)}"`),
                )
                .join("")
            : "<p>Your submitted work will appear here.</p>"
      }</section>`
    );
  }
  if (!r)
    return (
      nav +
      heading("Class question") +
      `<section class="panel waiting">${status("Waiting for the professor")}<p>The question will appear here when your professor opens it.</p></section>`
    );
  let html =
    nav +
    heading(r.topic || "Class question") +
    status(
      r.status === "open" ? "Open for responses" : "Closed for responses",
    ) +
    `<section class="panel"><p class="question">${math(r.prompt)}</p>${imageOf(r)}`;
  if (v && (!editing || r.status !== "open")) {
    html += `<h2>Your response</h2><p class="written">${math(v.text)}</p><div class="feedback"><h2>Private feedback</h2><p>${math(v.result?.hint || "The agent is reading your response.")}</p>
    ${v.result ? `<small>${h(v.result.engine)}</small>` : "<progress></progress>"}</div>
    ${r.status === "open" && v.result ? btn("revise", "Revise response") : ""}`;
  } else if (r.status === "open") {
    html +=
      field("open-answer", "Your response", answer, 4, 2000) +
      `<div class="actions">${btn("send", "Submit response", true, answer.trim() ? "" : "disabled")}${picker("open-student-photo", "Read text from a photo", "image/jpeg,image/png,image/webp")}</div><p class="muted">Your professor sees class patterns. Your feedback is private.</p>`;
  } else
    html +=
      "<p>This question is closed. Stay here for the next class question.</p>";
  return html + "</section>";
}
function board(c) {
  const r = c.active,
    open = r?.status === "open";
  return `<div class="board-layout"><section>${heading(open ? r.topic || "Class question" : "Join the class")}
    ${open ? `<p class="question">${math(r.prompt)}</p>${imageOf(r)}<p>${r.total} response${r.total === 1 ? "" : "s"} received</p>` : `<p>${r ? "Responses are closed." : "Waiting for the professor to open a question."}</p>`}</section>${invite(true)}</div>`;
}
export function paintTeaching(el, next, view, actions) {
  root = el;
  state = next;
  role = view;
  controls = actions;
  const c = state.classroom,
    focus = root.contains(document.activeElement)
      ? document.activeElement
      : null;
  const pos =
    focus?.tagName === "TEXTAREA" ||
    (focus?.tagName === "INPUT" && focus.type === "text")
      ? [focus.selectionStart, focus.selectionEnd]
      : null;
  document.body.className = "open-room";
  document.querySelector(".room-context").textContent = {
    host: "Professor",
    student: "Student",
    board: "Projector",
  }[role];
  root.className = "room-" + role;
  root.innerHTML =
    (role === "host" ? teacher(c) : role === "board" ? board(c) : student(c)) +
    loading() +
    `<p class="error" role="alert" ${error ? "" : "hidden"}>${h(error)}</p><p class="offline" role="status" hidden>Reconnecting to the classroom…</p>`;
  if (pending)
    root
      .querySelectorAll("button,input,select,textarea")
      .forEach((x) => (x.disabled = true));
  else if (focus?.id) {
    const input = document.getElementById(focus.id);
    if (input) {
      input.focus({ preventScroll: true });
      if (pos && input.setSelectionRange) input.setSelectionRange(...pos);
    }
  }
}
export const teachingBusy = () => !!pending;
export async function updateActivity() {
  if (role !== "host" || !pending || !root) return;
  const before = pending;
  try {
    const next = await controls.api("host/state");
    if (pending === before && next.classroom?.job) progress(next.classroom.job);
  } catch {}
}
async function analyze(data) {
  progress("Preparing the question and private feedback");
  await post("host/open/analyze", data);
  screen = "edit";
}
async function readPage(n) {
  page = n;
  progress(
    "Reading " + (upload.pages > 1 ? "worksheet page " + n : upload.name),
  );
  asset = await upload.page(n);
  let text = asset.text;
  if (!text && asset.image && (!state.classroom.cloud || upload.pages > 1)) {
    const { recognize } = await import("/uploads.js");
    text = await recognize(asset.image, progress);
  }
  exercises = splitText(text || "");
  exercise = 0;
  source = exercises[0] || "";
  if (upload.pages > 1 || exercises.length > 1 || source.length > 3000) {
    screen = "upload";
    return;
  }
  if (asset.image && !source && state.classroom.cloud) {
    try {
      await analyze({
        file: { type: "image/jpeg", data: asset.image.split(",")[1] },
      });
      return;
    } catch {
      const { recognize } = await import("/uploads.js");
      source = await recognize(asset.image, progress);
    }
  }
  if (source.trim().length < 8) {
    screen = "upload";
    throw Error(
      "Too little text was readable. Type the question or try a clearer photo.",
    );
  }
  await analyze({ text: source });
}
let splitText;
async function fileChosen(file) {
  if (!file) return;
  fileReset();
  source = "";
  screen = "home";
  const reader = await import("/uploads.js");
  splitText = reader.splitQuestions;
  upload = await reader.openFile(file);
  await readPage(1);
}
async function act(b) {
  const a = b.dataset.actionOpen,
    c = state.classroom;
  error = "";
  if (a === "analyze")
    return task("Preparing question", () => analyze({ text: source }));
  if (a === "sample") {
    fileReset();
    return task("Reading course example", () =>
      analyze({ sample: Number(b.dataset.index) }),
    );
  }
  if (a === "publish")
    return task("Opening the question", async () => {
      await post("host/open/publish", {
        id: draftId,
        prompt: draft.prompt,
        topic: draft.topic,
        reference: draft.reference,
        image: attach ? asset?.image : null,
      });
      screen = "";
      source = "";
      fileReset();
    });
  if (a === "close")
    return task("Preparing the class report", async () => {
      await post("host/open/close", { id: c.active.id });
      reportId = c.active.id;
      screen = "report";
    });
  if (a === "send")
    return task("Checking your response", async () => {
      await post("open/answer", { id: studentId, text: answer });
      editing = false;
    });
  if (a === "back") {
    screen = "home";
    error = "";
    fileReset();
  }
  if (a === "pick-page") screen = "upload";
  if (a === "resume") screen = "edit";
  if (a === "report") {
    reportId = b.dataset.id;
    screen = "report";
  }
  if (a === "revise") {
    answer = c.receipt.text;
    editing = true;
  }
  if (a === "class") tab = "class";
  if (a === "progress") {
    tab = "progress";
    selectedReview = null;
  }
  if (a === "history") selectedReview = b.dataset.id;
  if (a === "copy") {
    try {
      await navigator.clipboard.writeText(state.join);
      b.textContent = "Copied";
      return;
    } catch {
      error = "Student link: " + state.join;
    }
  }
  controls.draw();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action-open]");
  if (root?.contains(b) && !pending) void act(b);
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (!root?.contains(el)) return;
  if (el.id === "open-source") {
    source = el.value;
    const b = root.querySelector('[data-action-open="analyze"]');
    if (b) b.disabled = source.trim().length < 8;
  }
  if (el.id === "open-answer") {
    answer = el.value;
    root.querySelector('[data-action-open="send"]').disabled = !answer.trim();
  }
  if (el.id === "open-topic") draft.topic = el.value;
  if (el.id === "open-prompt") {
    draft.prompt = el.value;
    root.querySelector("#open-preview").innerHTML = preview(el.value);
  }
  if (el.id === "open-ref") draft.reference = el.value;
  if (el.id === "open-attach") attach = el.checked;
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (!root?.contains(el) || pending) return;
  if (el.id === "open-file" && el.files[0]) {
    const file = el.files[0];
    void task("Opening " + file.name, () => fileChosen(file));
  }
  if (el.id === "open-page") {
    const n = Number(el.value);
    void task("Reading worksheet page", () => readPage(n));
  }
  if (el.id === "open-exercise") {
    exercise = Number(el.value);
    source = exercises[exercise];
    controls.draw();
  }
  if (el.id === "open-student-photo" && el.files[0]) {
    const file = el.files[0];
    void task("Reading photo", async () => {
      const reader = await import("/uploads.js");
      const doc = await reader.openFile(file);
      try {
        const page = await doc.page(1);
        const txt = page.text || (await reader.recognize(page.image, progress));
        if (!txt.trim())
          throw Error("The photo was unclear. Type your step or try again.");
        answer = (answer + "\n" + txt).trim().slice(0, 2000);
      } finally {
        await doc.dispose?.();
      }
    });
  }
});
