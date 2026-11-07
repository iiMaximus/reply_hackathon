import { createWhiteboard } from "./whiteboard.js";
import { accuracy } from "./outcomes.js";
import reportExample from "/sample-report.js";
import {
  escapeHTML as h,
  mathText as math,
  classroomMarkdown as md,
} from "/math.js";
const actionIcons = {
  class: "book-open",
  standings: "trophy",
  equation: "square-radical",
  "draw-mode": "pen-line",
  "write-mode": "keyboard",
  "undo-ink": "undo-2",
  "clear-ink": "eraser",
  report: "list-checks",
  send: "send",
  publish: "radio",
  close: "chart-column",
  copy: "copy",
  revise: "pencil",
  back: "arrow-left",
  analyze: "scan-text",
  progress: "notebook-pen",
};
const icon = (name) =>
  name
    ? `<span class="lucide-icon" aria-hidden="true" style="--icon:url('/icons/${name}.svg')"></span>`
    : "";
const btn = (action, label, primary = false, extra = "") =>
  `<button type="button" data-action-open="${action}" class="${primary ? "primary" : ""}" ${extra}>${icon(actionIcons[action])}${math(label)}</button>`;
const field = (id, label, value, rows = 3, max = 3000) =>
  `<label class="field" for="${id}">${h(label)}</label><textarea id="${id}" rows="${rows}" maxlength="${max}">${h(value)}</textarea>`;
const picker = (id, label, accept) =>
  `<label class="file-button">${icon(id === "open-file" ? "upload" : "camera")}${h(label)}<input id="${id}" type="file" accept="${accept}"></label>`;
const status = (label) =>
  `<div class="status-line ${label === "Open for responses" ? "is-live" : ""}"><span class="status-dot"></span>${h(label)}</div>`;
const heading = (title, desc = "") =>
  `<div class="heading"><h1>${math(title)}</h1>${desc ? `<p>${h(desc)}</p>` : ""}</div>`;
// The same question carries the same visual marker on every device.
function roundHeading(r) {
  const variant = [...r.id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 3;
  return `<div class="round-heading mark-${variant}"><span class="round-tile" aria-hidden="true"><i></i></span><div><h1>${math(r.topic || "Class question")}</h1></div></div>`;
}
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
  upload = null;
let sheetImage = null;
let worksheetRows = [],
  worksheetMode = "sequence";
let studentEvent = "",
  notification = "";
let studentId = "",
  answer = "",
  editing = false,
  tab = "class",
  reportId = "",
  selectedReview = null;
let saved = [];
let aliasInput = "",
  rememberedAlias = null,
  restoringAlias = false;
try {
  // The demo room was reset. Retire only its previous browser records.
  localStorage.removeItem("showwork-alias");
  localStorage.removeItem("showwork-progress");
  if (localStorage.getItem("qai-reset-generation") !== "equation-entry-v1") {
    localStorage.removeItem("qai-classroom-alias");
    localStorage.removeItem("qai-classroom-progress");
    localStorage.setItem("qai-reset-generation", "equation-entry-v1");
  }
  rememberedAlias = localStorage.getItem("qai-classroom-alias");
} catch {}

try {
  const data = JSON.parse(
    localStorage.getItem("qai-classroom-progress") || "[]",
  );
  if (Array.isArray(data)) saved = data.slice(0, 40);
} catch {}
function loading() {
  if (pending === "Preparing the class report")
    return `<div class="report-progress" role="status"><span class="report-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div><strong>Preparing your class report</strong><small>Reviewing the class’s reasoning and planning the next teaching step.</small></div></div>`;
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
  worksheetRows = [];
  sheetImage = null;
  upload?.dispose?.();
  upload = null;
  asset = null;
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
function mockButton(c) {
  return btn(
    "run-mock",
    c.mockReport ? "View 10 mock answers" : "Run demo with 10 mock answers",
  );
}
function reports(c) {
  const rows = [
    ...(c.active?.status === "closed" ? [c.active] : []),
    ...c.history,
  ];
  return `<section class="side-section"><h2>${icon("list-checks")} Class reports</h2>${rows.map((r) => btn("report", r.topic || r.prompt, false, `data-id="${h(r.id)}"`)).join("")}${btn("report", "View example report", false, 'data-id="example"')}${mockButton(c)}</section>`;
}
function home(c) {
  return (
    `<div class="desk-heading">${heading("Prepare a question", "Choose the exercise you want to discuss in class.")}<a class="project-link" href="/board" target="_blank" rel="noopener">${icon("presentation")} Open projector</a></div>` +
    `<div class="columns"><section class="panel composer"><h2>Course material</h2><div class="upload-area" data-drop-material><strong>Drop your worksheet here</strong>
    ${picker("open-file", "Choose a photo or worksheet", ".jpg,.jpeg,.png,.webp,.pdf,.txt,.md")}
    <span class="muted">JPG, PNG, WebP, PDF or text · up to 16 MB</span></div>
    <div class="or"><span>or paste the question</span></div>
    <label class="sr-only" for="open-source">Question text</label><textarea id="open-source" rows="4" maxlength="5000" placeholder="Paste a question or a numbered worksheet.">${h(source)}</textarea><div class="actions">${btn("analyze", "Review question", true, source.trim().length < 8 ? "disabled" : "")}</div>
    ${c.draft ? btn("resume", "Continue with saved draft") : ""}</section>
    <aside class="desk-library">${nextQuestion(c)}<section class="side-section"><h2>${icon("book-open")} Course examples</h2>${c.examples.map((name, i) => btn("sample", name, false, `data-index="${i}"`)).join("")}</section>${reports(c)}</aside></div>`
  );
}
function worksheetView() {
  return (
    btn("back", "Back to questions") +
    heading("Plan your worksheet", upload?.name || "Pasted questions") +
    `<section class="panel"><h2>Select questions</h2>${sheetImage ? `<details data-preserve="worksheet-image"><summary>View original image</summary><img class="question-image" src="${h(sheetImage)}" alt="Uploaded worksheet"></details>` : ""}${worksheetRows.map((row, i) => `<div class="worksheet-row"><label><input type="checkbox" data-select-row="${i}" ${row.selected ? "checked" : ""}> Question ${i + 1} · Page ${row.page}</label><textarea id="sheet-row-${i}" data-edit-row="${i}" aria-label="Question ${i + 1} wording" rows="2">${h(row.text)}</textarea></div>`).join("")}
    ${btn("append-row", "Add another question")}
    <fieldset class="delivery-options"><legend>How should students answer?</legend>${[
      ["sequence", "One at a time", "Review each question separately."],
      ["together", "Together", "One submission for the selected questions."],
    ]
      .map(
        ([value, title, desc]) =>
          `<label><input type="radio" name="worksheet-mode" value="${value}" ${worksheetMode === value ? "checked" : ""}><span><strong>${title}</strong><small>${desc}</small></span></label>`,
      )
      .join("")}</fieldset>
    <div class="actions">${btn("prepare-set", "Preview selected questions", true)}</div></section>`
  );
}
function nextQuestion(c) {
  const count = c.active?.remaining?.length;
  return count && c.active.status === "closed"
    ? btn(
        "next-planned",
        `Review next worksheet question (${count} remaining)`,
        true,
      )
    : "";
}
function preview(value) {
  return (
    '<small>Student preview</small><div class="question rich">' +
    md(value) +
    "</div>"
  );
}
function editor() {
  return (
    btn(
      worksheetRows.length ? "back-set" : "back",
      worksheetRows.length ? "Back to worksheet" : "Back to questions",
    ) +
    heading(
      "Review question",
      "Only the question and any image you select will be shared.",
    ) +
    `<section class="panel editor"><p class="muted">Format with Markdown and LaTeX. The preview shows what students will see.</p>${field("open-prompt", "Question students will see", draft.prompt, 4)}<div id="open-preview">${preview(draft.prompt)}</div>
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
    roundHeading(r) +
    status(
      r.status === "closing"
        ? "Finishing the class report"
        : "Open for responses",
    ) +
    `<div class="columns"><section class="panel"><div class="question rich">${md(r.prompt)}</div>${imageOf(r)}${stats(s)}
    <h2>Live reasoning patterns</h2>${breakdown(s)}<div class="actions">${btn("close", "Close and view report", true, r.status === "closing" ? "disabled" : "")}<span class="muted">${c.connected} student device${c.connected === 1 ? "" : "s"} connected</span></div>${mockButton(c)}</section>${invite()}</div>`
  );
}
function report(r) {
  const s = r.summary,
    evidence = s.evidence || [],
    synthetic = r.mock || r.id === "example";
  const metadata = [
    synthetic ? "Mock class" : "Class report",
    `${s.total} ${s.total === 1 ? "response" : "responses"}`,
  ];
  if (s.accuracy?.assessed)
    metadata.push(
      `${s.accuracy.percent}% correct · ${s.accuracy.correct} of ${s.accuracy.assessed} assessed`,
    );
  const missing = s.unclear
    ? `<p class="report-unclear">${s.unclear} ${s.unclear === 1 ? "response did" : "responses did"} not show enough working to identify a mistake.</p>`
    : "";
  const observation = evidence.length
    ? `<ul class="report-findings">${evidence.map((e) => `<li><strong>${e.count} ${e.count === 1 ? "student" : "students"}</strong><span>${math(e.error)}</span></li>`).join("")}</ul>`
    : !missing
      ? `<p>${s.reviewed ? "No specific error was identified in the reviewed answers." : "No responses were available for review."}</p>`
      : "";
  return (
    btn(
      "back",
      state.classroom.active?.status === "open"
        ? "Back to class"
        : "Back to questions",
    ) +
    `<article class="report-sheet"><header><p class="report-meta">${metadata.map(h).join("　·　")}</p><h1>${math(r.topic || "Class report")}</h1><div class="rich report-question">${md(r.prompt)}</div></header>
    <section><h2>What students struggled with</h2>${observation}${missing}</section>
    ${s.reviewed ? `<section><h2>What to teach next</h2><p>${math(s.move)}</p>${s.boardExample ? `<blockquote class="rich">${md(s.boardExample)}</blockquote>` : ""}</section>` : ""}
    ${s.check ? `<section><h2>Check understanding</h2><div class="rich">${md(s.check)}</div><details><summary>Expected reasoning</summary>${md(s.expected || "")}</details></section>` : ""}
    ${r.mock ? `<details data-preserve="mock-answers"><summary>Read the 10 mock answers</summary><ol>${r.samples.map((sample) => `<li><p>${math(sample.text)}</p>${verdictBadge(sample.verdict)} <span>${math(sample.hint)}</span></li>`).join("")}</ol></details>` : ""}
    <details data-preserve="summary-counts"><summary>All reasoning patterns</summary>${breakdown(s)}</details></article>
    <div class="actions">${(state.classroom.active?.id === r.id && nextQuestion(state.classroom)) || btn("back", state.classroom.active?.status === "open" ? "Return to class" : "Prepare another question", true)}</div>`
  );
}
function teacher(c) {
  if (screen === "mock-report" && c.mockReport) return report(c.mockReport);
  if (c.active && c.active.status !== "closed") return live(c);
  if (screen === "report") {
    const r =
      reportId === "example"
        ? reportExample
        : [c.active, ...c.history].find((r) => r?.id === reportId);
    if (r) return report(r);
  }
  if (screen === "worksheet" && worksheetRows.length) return worksheetView();
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
    text: v.text || (v.photo ? "Photo of your working" : ""),
    hint: v.result.hint,
    verdict: v.result.verdict,
    practice: v.result.practice,
  };
  if (JSON.stringify(saved.find((x) => x.id === r.id)) === JSON.stringify(row))
    return;
  saved = [row, ...saved.filter((x) => x.id !== r.id)].slice(0, 40);
  try {
    localStorage.setItem("qai-classroom-progress", JSON.stringify(saved));
  } catch {}
}
function accuracyLine(value, label) {
  if (value?.percent == null) return "";
  return `<div class="accuracy-line"><span>${h(label)}</span><strong>${value.percent}% correct</strong><small>${value.correct} of ${value.assessed} assessed</small></div>`;
}
function verdictBadge(verdict) {
  const labels = {
    correct: "Correct",
    incorrect: "Incorrect",
    unassessed: "Not assessed",
  };
  return labels[verdict]
    ? `<span class="answer-verdict ${verdict}">${labels[verdict]}</span>`
    : "";
}
function answerPreview(text) {
  const rendered = math(text);
  return rendered.includes('class="math-')
    ? "<small>Equation preview</small><div>" + rendered + "</div>"
    : "";
}
function feedback(result) {
  if (!result)
    return "<p>The agent is reading your response.</p><progress></progress>";
  return `${verdictBadge(result.verdict)}<p>${math(result.hint)}</p>${result.practice ? `<h3>${icon("target")} Practice next</h3><p>${math(result.practice)}</p>` : ""}`;
}
let responseMode = "write";
let pad = null;
function syncPadControls() {
  const send = root?.querySelector('[data-action-open="send"]');
  if (send)
    send.disabled =
      pending || !(responseMode === "draw" ? pad?.hasInk : answer.trim());
  for (const b of root?.querySelectorAll(
    '[data-action-open="undo-ink"],[data-action-open="clear-ink"]',
  ) || [])
    b.disabled = pending || !pad?.hasInk;
}
function responseComposer(c) {
  const draw = responseMode === "draw";
  const modes = `<div class="response-modes" role="group" aria-label="Answer format">${btn("write-mode", "Write", false, `aria-pressed="${!draw}"`)}${btn("draw-mode", "Whiteboard", false, `aria-pressed="${draw}"`)}</div>`;
  const surface = draw
    ? `<div class="pad-frame"><div class="pad-tools"><strong>Your whiteboard</strong><span>${btn("undo-ink", "Undo")}${btn("clear-ink", "Clear")}</span></div><div id="drawing-surface"></div></div>${field("open-answer", "Note with your drawing (optional)", answer, 2, 2000)}${!c.photoEnabled ? "<small>Local rehearsal saves drawings without AI image feedback.</small>" : ""}`
    : field("open-answer", "Your response", answer, 4, 2000) +
      `<div class="equation-tools">${btn("equation", "Insert equation")}<small>Write LaTeX between $ signs.</small></div><div id="answer-preview">${answerPreview(answer)}</div>`;
  return (
    modes +
    surface +
    `<div class="actions">${btn("send", draw ? "Submit drawing" : "Submit response", true, (draw ? pad?.hasInk : answer.trim()) ? "" : "disabled")}${!draw && c.photoEnabled ? picker("open-student-photo", "Submit a photo", "image/jpeg,image/png,image/webp") : ""}</div><p class="muted">Your feedback is private. Your professor sees class patterns.</p>`
  );
}
function student(c) {
  const r = c.active,
    v = c.receipt;
  if (studentId !== (r?.id || "")) {
    studentId = r?.id || "";
    responseMode = "write";
    pad = null;
    answer = "";
    editing = false;
    tab = "class";
  }
  remember(r, v);
  const event = [
    r?.id,
    r?.status,
    v?.result ? v.text + (v.photo || "") : "",
  ].join("|");
  if (event !== studentEvent) {
    notification =
      v?.result && r?.status === "open"
        ? "Your private feedback is ready."
        : r?.status === "closed"
          ? "The professor closed this question."
          : r?.status === "open"
            ? "Your professor opened a question."
            : "";
    studentEvent = event;
  }
  if (c.nickname == null) {
    if (rememberedAlias !== null && !restoringAlias) {
      restoringAlias = true;
      queueMicrotask(async () => {
        try {
          await post("open/nickname", { alias: rememberedAlias });
        } catch (err) {
          rememberedAlias = null;
          error = err.message;
          try {
            localStorage.removeItem("qai-classroom-alias");
          } catch {}
        } finally {
          restoringAlias = false;
          controls.draw();
        }
      });
    }
    return `<section class="panel join-panel"><div class="join-heading"><span class="join-mark">${icon("book-open")}</span>${heading("Join the class")}</div><form id="join-class-form"><label for="open-alias">Choose a nickname</label><input id="open-alias" maxlength="24" autocomplete="off" aria-describedby="alias-description" placeholder="Nickname" value="${h(aliasInput)}"><p id="alias-description" class="muted">${icon("trophy")} Earn a participation point for each question you try. Your nickname appears on the leaderboard.</p><div class="actions"><button type="submit" class="primary">Join with nickname</button>${btn("anonymous", "Stay anonymous")}</div></form></section>`;
  }
  const nav = `<nav aria-label="Student views">${btn("class", "Class question", false, `aria-current="${tab === "class" ? "page" : "false"}"`)}${btn("progress", "My work", false, `aria-current="${tab === "progress" ? "page" : "false"}"`)}${btn("standings", "Leaderboard", false, `aria-current="${tab === "standings" ? "page" : "false"}"`)}</nav>`;
  if (tab === "standings") {
    let rank = 0;
    return (
      nav +
      heading(
        "Leaderboard",
        "One point per question attempted. Ties share a place.",
      ) +
      `<section class="panel">${
        c.standings.length
          ? c.standings
              .map((player, i, rows) => {
                if (!i || rows[i - 1].points !== player.points) rank = i + 1;
                return `<div class="standing ${player.alias === c.nickname ? "is-you" : ""}"><span class="rank">${rank}</span><span>${h(player.alias)}${player.alias === c.nickname ? " (you)" : ""}</span><strong>${player.points} pt</strong></div>`;
              })
              .join("")
          : "<p>The first named participant to answer will appear here.</p>"
      }</section>`
    );
  }
  if (tab === "progress") {
    const item = saved.find((x) => x.id === selectedReview);
    return (
      nav +
      heading("My work", "Your responses are saved on this browser.") +
      accuracyLine(accuracy(saved), "Your saved questions") +
      `<section class="panel">${
        item
          ? `${btn("progress", "All responses")}<div class="question rich">${md(item.prompt)}</div><h2>Your response</h2><p class="written">${math(item.text)}</p><h2>Feedback</h2>${feedback(item)}`
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
      `<section class="panel waiting lobby"><span class="join-mark">${icon("radio")}</span><div><h1>Waiting for the professor</h1><p>The next question will appear here automatically.</p></div></section>`
    );
  let html =
    nav +
    roundHeading(r) +
    status(
      r.status === "open" ? "Open for responses" : "Closed for responses",
    ) +
    `<section class="panel"><div class="question rich">${md(r.prompt)}</div>${imageOf(r)}`;
  if (v && (!editing || r.status !== "open")) {
    html += `<div class="sent-badge">${icon("circle-check")} Response submitted</div><div class="feedback"><h2>Private feedback</h2>${feedback(v.result)}${v.result ? accuracyLine(accuracy(saved), "Your saved questions") : ""}</div>
    <details class="submitted-work" data-preserve="student-work"><summary>Your submitted work</summary><p class="written">${math(v.text)}</p>${v.photo ? `<img class="question-image" src="${h(v.photo)}" alt="Your submitted working">` : ""}</details>
    ${r.status === "open" && v.result ? btn("revise", "Revise response") : ""}`;
  } else if (r.status === "open") {
    html += responseComposer(c);
  } else
    html +=
      "<p>This question is closed. Stay here for the next class question.</p>";
  return html + "</section>";
}
function board(c) {
  const r = c.active,
    open = r?.status === "open";
  return `<div class="board-layout"><section>${open ? roundHeading(r) + status("Open for responses") : heading("Join the class")}
    ${open ? `<div class="question rich">${md(r.prompt)}</div>${imageOf(r)}<p>${r.total} response${r.total === 1 ? "" : "s"} received</p>` : `<p>${r ? "Responses are closed." : "Waiting for the professor to open a question."}</p>`}</section>${invite(true)}</div>`;
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
    (role === "student" && state.classroom.nickname != null && notification
      ? `<div class="class-notice" role="status">${h(notification)}${btn("dismiss-notice", "Dismiss")}</div>`
      : "") +
    loading() +
    `<p class="error" role="alert" ${error ? "" : "hidden"}>${h(error)}</p><p class="offline" role="status" hidden>Reconnecting to the classroom…</p>`;
  const surface = root.querySelector("#drawing-surface");
  if (surface) {
    pad ??= createWhiteboard(syncPadControls);
    surface.append(pad.canvas);
    pad.canvas.style.pointerEvents = pending ? "none" : "";
    syncPadControls();
  }
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
export const teachingBusy = () => !!pending || !!pad?.drawing;
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
async function pageQuestions(material, reader) {
  if (material.text?.trim()) return reader.splitQuestions(material.text);
  if (!material.image) return [];
  if (state.classroom.cloud) {
    try {
      const { questions } = await controls.api("host/open/extract", {
        file: { type: "image/jpeg", data: material.image.split(",")[1] },
      });
      if (questions.length) return questions;
    } catch {
      /* Printed text can still be read on the device. */
    }
  }
  try {
    return reader.splitQuestions(
      await reader.recognize(material.image, progress),
    );
  } catch {
    return [];
  }
}
async function fileChosen(file) {
  if (!file) return;
  fileReset();
  source = "";
  screen = "home";
  const reader = await import("/uploads.js");
  upload = await reader.openFile(file);
  const items = [];
  for (let pageNumber = 1; pageNumber <= upload.pages; pageNumber++) {
    progress(`Finding questions on page ${pageNumber} of ${upload.pages}`);
    const material = await upload.page(pageNumber);
    if (upload.pages === 1) sheetImage = material.image;
    const questions = await pageQuestions(material, reader);
    for (const text of questions.length ? questions : [""]) {
      items.push({ page: pageNumber, text, selected: Boolean(text) });
    }
  }
  worksheetRows = items;
  screen = "worksheet";
}
async function setNickname(anonymous) {
  const value = anonymous ? "" : aliasInput.trim();
  if (!value && !anonymous) {
    error = "Enter a nickname or choose Stay anonymous.";
    controls.draw();
    return;
  }
  return task("Joining class", async () => {
    await post("open/nickname", { alias: value });
    rememberedAlias = value;
    try {
      localStorage.setItem("qai-classroom-alias", value);
    } catch {}
  });
}
async function act(b) {
  const a = b.dataset.actionOpen,
    c = state.classroom;
  error = "";
  if (a === "run-mock")
    return task("Preparing 10 mock answers", async () => {
      await post("host/open/rehearse", {});
      screen = "mock-report";
    });
  if (a === "dismiss-notice") {
    notification = "";
    controls.draw();
    return;
  }
  if (a === "append-row") {
    worksheetRows.push({
      text: "",
      page: worksheetRows.at(-1)?.page || 1,
      selected: true,
    });
    controls.draw();
    root.querySelector("#sheet-row-" + (worksheetRows.length - 1))?.focus();
    return;
  }
  if (a === "next-planned") {
    const [text, ...remaining] = c.active.remaining;
    return task("Preparing next question", () =>
      analyze({ text, remaining, authored: true }),
    );
  }
  if (a === "prepare-set") {
    const items = worksheetRows
      .filter((row) => row.selected)
      .map((row) => row.text.trim());
    if (!items.length || items.some((x) => x.length < 8)) {
      error = "Select at least one question and check its wording.";
      controls.draw();
      return;
    }
    const together = worksheetMode === "together" && items.length > 1;
    const text = together
      ? items
          .map(
            (t, i) =>
              `**Question ${i + 1}**\n\n${t.replace(/^\d+[.)]\s+/, "")}`,
          )
          .join("\n\n")
      : items[0];
    asset =
      upload && items.length === 1
        ? await upload.page(worksheetRows.find((row) => row.selected).page)
        : null;
    return task("Preparing worksheet", () =>
      analyze({
        text,
        authored: true,
        bundle: together,
        remaining: together ? [] : items.slice(1),
      }),
    );
  }
  if (a === "standings") {
    tab = "standings";
    controls.draw();
    return;
  }
  if (a === "anonymous") return setNickname(true);
  if (a === "analyze") {
    if (screen !== "upload") {
      const reader = await import("/uploads.js"),
        parts = reader.splitQuestions(source);
      if (parts.length > 1) {
        worksheetRows = parts.map((text) => ({
          page: 1,
          text,
          selected: true,
        }));
        screen = "worksheet";
        controls.draw();
        return;
      }
    }
    return task("Preparing question", () =>
      analyze({ text: source, authored: screen !== "upload" }),
    );
  }
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
  if (a === "draw-mode" || a === "write-mode") {
    responseMode = a === "draw-mode" ? "draw" : "write";
    controls.draw();
    return;
  }
  if (a === "undo-ink" || a === "clear-ink") {
    if (a === "undo-ink") pad?.undo();
    else pad?.clear();
    return;
  }
  if (a === "equation") {
    const field = root.querySelector("#open-answer");
    const start = field.selectionStart,
      end = field.selectionEnd;
    if (field.value.length + 4 > field.maxLength) return;
    field.setRangeText(
      "\\(" + field.value.slice(start, end) + "\\)",
      start,
      end,
    );
    field.focus();
    field.setSelectionRange(start + 2, end + 2);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  if (a === "send")
    return task("Checking your response", async () => {
      const drawing = responseMode === "draw";
      if (drawing && !pad?.hasInk)
        throw Error("Draw a step before submitting.");
      await post("open/answer", {
        id: studentId,
        text: answer,
        ...(drawing ? { photo: pad.jpeg(), kind: "drawing" } : {}),
      });
      editing = false;
    });
  if (a === "back") {
    screen = "home";
    error = "";
    fileReset();
  }
  if (a === "back-set") screen = "worksheet";
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
document.addEventListener("submit", (e) => {
  if (e.target.id !== "join-class-form") return;
  e.preventDefault();
  if (!pending) void setNickname(false);
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action-open]");
  if (root?.contains(b) && !pending) void act(b);
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (!root?.contains(el)) return;
  if (el.dataset.editRow !== undefined)
    worksheetRows[Number(el.dataset.editRow)].text = el.value;
  if (el.dataset.selectRow !== undefined)
    worksheetRows[Number(el.dataset.selectRow)].selected = el.checked;
  if (el.name === "worksheet-mode") worksheetMode = el.value;
  if (el.id === "open-alias") aliasInput = el.value;
  if (el.id === "open-source") {
    source = el.value;
    const b = root.querySelector('[data-action-open="analyze"]');
    if (b) b.disabled = source.trim().length < 8;
  }
  if (el.id === "open-answer") {
    answer = el.value;
    const previewBox = root.querySelector("#answer-preview");
    if (previewBox) previewBox.innerHTML = answerPreview(answer);
    syncPadControls();
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
  if (el.id === "open-student-photo" && el.files[0]) {
    const file = el.files[0];
    const id = studentId;
    void task("Checking your photo", async () => {
      const reader = await import("/uploads.js");
      const doc = await reader.openFile(file);
      try {
        const { image } = await doc.page(1);
        await post("open/answer", { id, text: answer, photo: image });
        editing = false;
      } finally {
        await doc.dispose?.();
      }
    });
  }
});

for (const type of ["dragover", "dragleave", "drop"]) {
  document.addEventListener(type, (event) => {
    const zone = event.target.closest?.("[data-drop-material]");
    if (!zone) return;
    event.preventDefault();
    zone.classList.toggle("dragging", type === "dragover");
    if (type === "drop" && !pending && event.dataTransfer.files.length) {
      const file = event.dataTransfer.files[0];
      void task("Opening " + file.name, () => fileChosen(file));
    }
  });
}
