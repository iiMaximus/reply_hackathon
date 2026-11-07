const app = document.querySelector("#app");
const notice = document.querySelector("#notice");
const host = location.pathname === "/present";
const projection = location.pathname === "/board";
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let state,
  tab = "Class",
  photo = "",
  draft = "",
  sharing = false,
  aliasDraft = "",
  busy = false,
  editing = false;
let roomCode = new URLSearchParams(location.search).get("room") || "";
let noticeTimer;

function tell(message) {
  notice.textContent = message;
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    notice.hidden = true;
  }, 4500);
}
async function api(path, data) {
  const options =
    data === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        };
  const response = await fetch("/api/" + path, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Try again.");
  return result;
}
function chip(text, muted = false) {
  return `<span class="chip ${muted ? "muted" : ""}">${esc(text)}</span>`;
}
function problem() {
  return `<section class="problem"><p class="eyebrow">Today’s exercise</p><h2>${esc(state.lesson.title)}</h2><div class="formula">${esc(state.lesson.formula)}</div><p>${esc(state.lesson.prompt)}</p></section>`;
}
function board() {
  const rows = state.board
    .map(
      (p) =>
        `<div class="spread boardrow"><span>${esc(p.alias)}</span><strong>1 pt · joint lead</strong></div>`,
    )
    .join("");
  return (
    rows ||
    '<p class="small">The first challenge point opens the board. Share an alias to appear here.</p>'
  );
}
function renderGroups(groups, populatedOnly = false) {
  return groups
    .filter((g) => !populatedOnly || g.count > 0)
    .map(
      (
        g,
      ) => `<div class="group"><div class="spread"><b>${esc(g.title)}</b><strong>${g.count}</strong></div><div class="meter"><div style="width:${state.count ? (g.count * 100) / state.count : 0}%"></div></div>
    ${g.excerpts.map((e) => `<div class="excerpt">${e.photo ? `<a href="${esc(e.photo)}" target="_blank" rel="noopener"><img class="preview" src="${esc(e.photo)}" alt="Notebook step, open full size"></a>` : ""}${e.line ? `<blockquote>${esc(e.line)}</blockquote>` : ""}<label class="small">Group <select data-review="${esc(e.id)}">${state.groups.map((o) => `<option value="${o.id}" ${o.id === g.id ? "selected" : ""}>${esc(o.title)}</option>`).join("")}</select></label></div>`).join("")}</div>`,
    )
    .join("");
}
function hostView() {
  const groups = renderGroups(state.groups);
  const prediction = state.prediction;
  app.innerHTML = `<div class="head spread"><div><p class="eyebrow">Professor’s view</p><h1>The classroom</h1></div>${chip(state.live ? "Live AI" : "Rehearsal mode", !state.live)}</div>
    <div class="grid"><div class="stack">${problem()}<section class="card"><div class="spread"><div><p class="eyebrow">From submitted work</p><h2>Steps around the room</h2></div><div class="total">${state.count}</div></div><p class="small">${state.count} submitted · ${state.joined} joined. Revisions replace the student’s earlier step.</p>${groups}${state.fallbackCount ? `<p class="small">${state.fallbackCount} current review(s) used rehearsal feedback.</p>` : ""}</section></div>
    <div class="stack"><section class="card"><div class="row"><img class="qr" src="/qr.png" alt="Scan to join the classroom"><div><p class="eyebrow">Join from a phone</p><p class="mono">${esc(state.room)}</p><a class="joinurl" href="${esc(state.join)}" target="_blank" rel="noopener">Student link ↗</a><br><a class="joinurl" href="/board?room=${esc(state.room)}" target="_blank" rel="noopener">Open projector view ↗</a></div></div></section>
    <section class="card"><p class="eyebrow">Before the exercise</p><h2>What to watch for</h2>
    ${prediction ? `<p class="small">${prediction.mode === "live" ? "AI suggestions" : "Prepared rehearsal examples"} · hypotheses only</p>${prediction.items.map((i) => `<div class="predict"><b>${esc(i.mistake)}</b><p>${esc(i.signal)}</p><p class="small">Ask “${esc(i.question)}”</p></div>`).join("")}` : '<p class="small">Preview possible mistakes and a question to ask if one shows up.</p><button data-action="forecast">Suggest likely mistakes</button>'}</section>
    <section class="card lavender"><p class="eyebrow">Fresh challenge</p><h2>${esc((state.challenge || state.suggested).title)}</h2><p>${esc((state.challenge || state.suggested).prompt)}</p>${state.challenge ? chip("Open on student screens") : '<button class="primary" data-action="release">Open challenge for everyone →</button>'}</section>
    <section class="card"><h2>Standings</h2>${board()}</section>
    <details class="details"><summary>Course reference &amp; rehearsal controls</summary><p><a href="${esc(state.lesson.reference)}" target="_blank" rel="noopener">OpenStax · Maxima and minima ↗</a></p>${state.canLive ? `<button data-action="mode">${state.live ? "Use rehearsal analysis" : "Use live analysis"}</button>` : "Rehearsal analysis is available on this server."}</details></div></div>`;
}
function attemptForm() {
  const lineNotice = state.live
    ? "Submitted photos are sent to the AI for reading."
    : "Rehearsal mode groups typed steps. For a photo, type the relevant line below.";
  return `<section class="card"><h2>Your first move</h2><p class="small">One line from your notebook is enough. This attempt is private and unscored.</p>
    <form data-form="attempt"><label class="upload">▧ &nbsp; ${photo ? "Change photo" : "Add a photo"}<input type="file" accept="image/*" id="photo"></label>
    <img class="preview" id="preview" ${photo ? `src="${photo}"` : "hidden"} alt="Your selected work">
    <p class="small" id="mode-note">${lineNotice}</p>
    <label class="form-label">Your working<textarea id="step" maxlength="1500" placeholder="What would you try first?">${esc(draft)}</textarea></label>
    <label class="check"><input id="share" type="checkbox" ${sharing ? "checked" : ""}> Let the professor show my anonymous line</label>
    <button class="primary wide">Share my step →</button></form></section>`;
}
function feedback() {
  const a = state.attempt;
  if (!a) return "";
  return `<section class="card"><div class="spread"><h2>Your feedback</h2>${chip(a.mode === "live" ? "Live AI" : "Rehearsal feedback", a.mode !== "live")}</div>
    ${a.line ? `<p class="small">The step we read</p><blockquote>${esc(a.line)}</blockquote>` : ""}<p>${esc(a.hint)}</p>
    ${editing ? "" : '<button data-action="edit">Clarify or revise</button>'}</section>`;
}
function choices(name, options) {
  return options
    .map(
      (v, i) =>
        `<label class="choice"><input type="radio" name="${name}" value="${i}" required>${esc(v)}</label>`,
    )
    .join("");
}
function challengeView() {
  if (!state.challenge) return "";
  if (state.scored)
    return `<section class="card lavender"><p class="eyebrow">Fresh challenge</p><h2>${state.scored.point ? "You earned a point." : "Round complete."}</h2><p>${esc(state.scored.explanation)}</p><button data-tab="${state.scored.point ? "Standings" : "Study"}">${state.scored.point ? "See standings" : "Practice this concept"} →</button></section>`;
  const v = state.challenge;
  return `<section class="card lavender"><p class="eyebrow">One point available</p><h2>${esc(v.title)}</h2><p>${esc(v.prompt)}</p><form data-form="score"><fieldset><legend>Where?</legend>${choices("answer", v.answers)}</fieldset><fieldset><legend>Why?</legend>${choices("reason", v.reasons)}</fieldset><button class="primary">Check my answer →</button></form></section>`;
}
function studentView() {
  app.className = "student";
  const tabs = ["Class", "Study", "Standings"]
    .map(
      (t) =>
        `<button data-tab="${t}" aria-current="${t === tab}">${t}</button>`,
    )
    .join("");
  let panel;
  if (tab === "Class") {
    panel = `${problem()}${feedback()}${!state.attempt || editing ? attemptForm() : ""}${challengeView()}`;
  } else if (tab === "Study") {
    panel = `<section class="card"><p class="eyebrow">Private practice</p><h2>Try it again on paper</h2><p>${esc(state.practice.prompt)}</p><details><summary>Check your working</summary><p>${esc(state.practice.explanation)}</p></details></section>${state.attempt ? feedback() : ""}`;
  } else {
    panel = `<section class="card"><p class="eyebrow">Today’s challenge</p><h2>Class standings</h2><p class="small">One point for the answer and its reason. Ties share the lead.</p>${board()}</section>
      <section class="card"><h2>Play under an alias</h2><form data-form="alias"><label class="form-label">Display name <input id="alias" type="text" maxlength="20" placeholder="Choose a name" value="${esc(aliasDraft)}"></label><p class="small">Only your alias and earned point appear. Clear your alias to leave.</p><button>Save preference</button></form></section>`;
  }
  app.innerHTML = `<div class="head"><p class="eyebrow">Exercise room · ${esc(state.room)}</p><h1>${tab === "Class" ? "On the board" : tab === "Study" ? "Your study desk" : "The standings"}</h1></div><nav class="tabs" aria-label="Student views">${tabs}</nav><div class="stack">${panel}</div>`;
}
let entryMode = "choose";
let showPhotoNote = false;
let pilotError = "";
let expandedGroup = null;
let lastSentPhoto = "";

function icon(name) {
  return `<i aria-hidden="true" class="ui-icon icon-${name}"></i>`;
}

function writtenFormula(formula) {
  if (formula !== "f(x) = x³/3 − x²/2") return esc(formula);
  return `<math aria-label="f of x equals x cubed over three minus x squared over two">
    <mrow><mi>f</mi><mo stretchy="false">(</mo><mi>x</mi><mo stretchy="false">)</mo><mo>=</mo>
    <mfrac><msup><mi>x</mi><mn>3</mn></msup><mn>3</mn></mfrac><mo>−</mo>
    <mfrac><msup><mi>x</mi><mn>2</mn></msup><mn>2</mn></mfrac></mrow></math>`;
}

function roomHeader(section, room) {
  document.body.classList.add("workroom");
  document.querySelector(".room-context").innerHTML =
    `<span class="context-name">${esc(section)}</span>${room ? `<span class="room-number">Room ${esc(room)}</span>` : ""}`;
}

function exerciseCard() {
  const { lesson } = state;
  return `<section class="exercise-board" aria-labelledby="exercise-title">
    <canvas class="sheet-art" aria-hidden="true" width="600" height="380"></canvas>
    <div class="exercise-content">
      <span class="board-course"><span aria-hidden="true"></span>${esc(lesson.course)} <b>/</b> Class exercise</span>
      <h1 id="exercise-title">${esc(lesson.title)}</h1>
      <div class="board-formula">${writtenFormula(lesson.formula)}</div>
      <p>${esc(lesson.prompt.split("?")[0])}?</p>
    </div></section>`;
}

// A stack of bent graph-paper sheets. The artwork is independent of the exercise data.
function drawSheets() {
  const canvas = document.querySelector(".sheet-art");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const at = (u, v) => [
    46 + u * 354 + v * 135,
    168 +
      v * 111 -
      u * 46 +
      63 * Math.sin(u * 5.1 + v * 1.7) -
      v * 40 * Math.cos(u * 3.4),
  ];
  ctx.clearRect(0, 0, 600, 380);
  for (let i = 0; i <= 32; i++) {
    ctx.beginPath();
    for (let j = 0; j <= 70; j++) {
      const [x, y] = at(j / 70, i / 32);
      if (j) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.lineWidth = i % 8 === 0 ? 2.4 : 1.1;
    ctx.strokeStyle = i % 8 === 0 ? "#bec4ff" : "#969eff";
    ctx.stroke();
  }
  for (let i = 0; i <= 26; i++) {
    ctx.beginPath();
    for (let j = 0; j <= 40; j++) {
      const [x, y] = at(i / 26, j / 40);
      if (j) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#8189ef";
    ctx.stroke();
  }
}

function picker(id, text, name, camera = false) {
  return `<label class="${camera ? "camera-action" : "picker-link"}">${icon(name)} <span>${text}</span>
    <input class="hidden-file" type="file" accept="image/*" id="${id}" ${camera ? 'capture="environment"' : ""}></label>`;
}

function studentComposer() {
  if (entryMode === "choose") {
    const cameraFirst = window.matchMedia("(pointer: coarse)").matches;
    const primary = cameraFirst
      ? picker("camera", "Take a photo", "camera", true)
      : `<button class="camera-action" data-pilot="type">${icon("pen")} Type a step</button>`;
    return `<section class="composer"><h2>Share your next step</h2><p>One unfinished line is enough.</p>
      ${primary}
      <div class="other-methods">${picker("photo", "Upload a photo", "image")}${cameraFirst ? `<button data-pilot="type" class="picker-link">${icon("pen")} Type a step</button>` : ""}</div>
      <div class="privacy-note">${icon("lock")} Only your tutor sees your work.${state.live ? " AI helps read it." : ""}</div>
      ${editing ? '<button class="back-action" data-pilot="cancel">Keep my submitted step</button>' : ""}
      ${pilotError ? `<p class="field-error" role="alert">${esc(pilotError)}</p>` : ""}</section>`;
  }
  const hasPhoto = entryMode === "photo" && Boolean(photo);
  const write = !hasPhoto || showPhotoNote;
  return `<section class="composer"><button class="back-action" data-pilot="choose">← Input options</button>
    <h2>${hasPhoto ? "Review your photo" : "Write your next step"}</h2>
    <form data-form="attempt">
    ${
      hasPhoto
        ? `<img class="work-preview" src="${photo}" alt="Notebook photo to send">
      <div class="other-methods">${picker("photo", "Replace photo", "image")}${showPhotoNote ? "" : '<button type="button" class="picker-link" data-pilot="note">Add a note</button>'}</div>`
        : ""
    }
    ${
      write
        ? `<label class="compose-field">${hasPhoto ? "Note for your tutor" : "Your working"}
      <textarea id="step" maxlength="1500" rows="3" placeholder="Write the line you would try next…">${esc(draft)}</textarea></label>
      <div class="math-keys" aria-label="Math symbols">${["f′(x)", "x²", "−", "="].map((v) => `<button type="button" data-symbol="${esc(v)}">${esc(v)}</button>`).join("")}</div>`
        : ""
    }
    <p class="privacy-note">${icon("lock")} Only your tutor sees this.${state.live ? " AI helps read it." : ""}</p>
    <p class="field-error" id="pilot-error" role="alert" ${pilotError ? "" : "hidden"}>${esc(pilotError)}</p>
    <button class="send-action" type="submit" ${hasPhoto || draft.trim() ? "" : "disabled"}>Send to tutor <span aria-hidden="true">↗</span></button>
    </form></section>`;
}

function sentCard() {
  const review = state.attempt;
  return `<section class="composer sent-card" role="status"><span class="sent-check" aria-hidden="true">✓</span>
    <h2 tabindex="-1">Your step is with your tutor.</h2>
    ${lastSentPhoto ? `<img class="receipt-photo" src="${lastSentPhoto}" alt="Photo you sent">` : ""}
    ${review.line ? `<blockquote>${esc(review.line)}</blockquote>` : ""}
    <p>${review.mode === "live" || review.line ? esc(review.hint) : "You can return to the exercise or replace your submission."}</p>
    ${review.fallback ? '<p class="fallback-note">Live analysis was unavailable. Your tutor still received your step.</p>' : ""}
    <button class="quiet-action" data-pilot="revise">${icon("pen")} Revise my step</button></section>`;
}

const groupLabels = {
  lost: "Divided by x",
  unclear: "Needs a closer look",
  started: "Set up the derivative",
  kept: "Kept both roots",
};
const questions = {
  lost: "Before dividing by x, which value do we need to check?",
  started: "Once you have the derivative, what makes the tangent horizontal?",
  kept: "How can you check that both values give a horizontal tangent?",
  unclear: "Which line would you like to look at together?",
};
function attentionGroups() {
  const order = ["lost", "unclear", "started", "kept"];
  return order
    .map((id) => state.groups.find((g) => g.id === id))
    .filter((g) => g?.count);
}

function groupRow(group, open) {
  const entries = group.excerpts
    .map(
      (ex) => `<div class="review-entry">
    ${ex.photo ? `<a class="photo-link" href="${esc(ex.photo)}" target="_blank" rel="noopener"><img src="${esc(ex.photo)}" alt="Open notebook photo at full size"></a>` : ""}
    <div>${ex.line ? `<blockquote>${esc(ex.line)}</blockquote>` : ""}
    <label class="change-group">Group <select data-review="${esc(ex.id)}">${state.groups.map((g) => `<option value="${g.id}" ${g.id === group.id ? "selected" : ""}>${esc(groupLabels[g.id])}</option>`).join("")}</select></label></div></div>`,
    )
    .join("");
  return `<article class="pattern pattern-${group.id}"><button class="pattern-heading" data-group="${group.id}" aria-expanded="${open}" aria-controls="details-${group.id}">
    <span class="pattern-dot"></span><strong>${esc(groupLabels[group.id])}</strong><span class="group-number">${group.count}</span><span class="disclose" aria-hidden="true">${open ? "−" : "+"}</span></button>
    <div id="details-${group.id}" ${open ? "" : "hidden"}><p class="discuss">${esc(questions[group.id])}</p>${entries}</div></article>`;
}

function joinPanel() {
  return `<aside class="invite-panel"><div class="panel-heading"><h2>Invite students</h2>${icon("people")}</div>
    <img class="invite-qr" src="/qr.png" alt="Scan to join the exercise"><span class="qr-code">Room ${esc(state.room)}</span>
    <button class="copy-action" data-pilot="copy">${icon("link")} Copy student link</button>
    <a class="open-student" href="${esc(state.join)}" target="_blank" rel="noopener">Open student view ↗</a></aside>`;
}
function pilotView() {
  roomHeader(host ? "Tutor view" : "Student view", state.room);
  if (!host) {
    app.className = "pilot student-pilot";
    app.innerHTML = `<div class="student-layout">${exerciseCard()}${state.attempt && !editing ? sentCard() : studentComposer()}</div>`;
    drawSheets();
    return;
  }
  const groups = attentionGroups();
  const opened = expandedGroup ?? groups[0]?.id;
  app.className = "pilot tutor-pilot";
  app.innerHTML = `<div class="tutor-title"><div><p class="section-meta"><span class="live-dot"></span><span data-connection>Room open</span> · ${esc(state.lesson.course)}</p><h1>Class responses</h1></div>
    <a class="project-action" href="/board?room=${esc(state.room)}" target="_blank" rel="noopener">${icon("screen")} Project exercise <span>↗</span></a></div>
    <div class="tutor-layout"><div class="tutor-main">${exerciseCard()}
      <section class="responses"><div class="response-title"><h2>Student steps</h2><span>${state.count} sent · ${state.joined} joined</span></div>
        ${
          state.count
            ? groups.map((g) => groupRow(g, opened === g.id)).join("")
            : `<div class="empty-responses"><span class="empty-symbol">${icon("sheets")}</span><div><h3>Waiting for the first step</h3><p>Students can scan the QR on the projector to send their working.</p></div></div>`
        }
        ${state.fallbackCount ? `<p class="fallback-note">Live analysis was unavailable for ${state.fallbackCount} current submission(s). Check their working.</p>` : ""}
      </section></div>${joinPanel()}</div>`;
  drawSheets();
}

function projectorView() {
  roomHeader("Class screen", state.room);
  app.className = "pilot projection";
  app.innerHTML = `<div class="project-layout">${exerciseCard()}<aside class="invite-panel"><h2>Join the exercise</h2>
    <img class="invite-qr" src="/qr.png" alt="Scan to join the exercise"><span class="qr-code">Room ${esc(state.room)}</span>
    <p>${state.count} ${state.count === 1 ? "step" : "steps"} received</p></aside></div>
    ${state.challenge ? `<section class="card lavender"><h2>${esc(state.challenge.title)}</h2><p>${esc(state.challenge.prompt)}</p></section><section class="card"><h2>Standings</h2>${board()}</section>` : ""}`;
  drawSheets();
}

function render() {
  if (state.pilot && !projection) pilotView();
  else if (host) hostView();
  else if (projection) projectorView();
  else studentView();
}
function joinForm() {
  roomHeader("Classroom", "");
  app.className = "pilot join-pilot";
  app.innerHTML =
    '<section class="join-box"><div class="join-stamp" aria-hidden="true">↗</div><h1>Join your class</h1><p>Enter the room code from the projector.</p><form data-form="join"><label class="compose-field">Room code<input id="code" maxlength="6" minlength="6" type="text" autocomplete="off" autocapitalize="characters" placeholder="ABC123" required></label><button class="send-action">Join room →</button></form></section>';
}
async function join(code) {
  state = await api("join", { room: code.trim().toUpperCase() });
  roomCode = state.room;
  history.replaceState(null, "", "/?room=" + roomCode);
  aliasDraft = state.alias;
  sharing = state.share;
  render();
}
async function run(action, button) {
  if (busy) return;
  busy = true;
  if (button) {
    button.disabled = true;
    button.dataset.old = button.textContent;
    button.textContent =
      button.classList.contains("send-action") &&
      button.form?.dataset.form === "attempt"
        ? "Sending your step…"
        : "Working…";
  }
  try {
    await action();
  } catch (error) {
    if (state?.pilot && !host && !projection) {
      pilotError = error.message;
      const field = document.querySelector("#pilot-error");
      if (field) {
        field.textContent = pilotError;
        field.hidden = false;
      } else {
        render();
        tell(pilotError);
      }
    } else tell(error.message);
  } finally {
    busy = false;
    if (button?.isConnected) {
      button.disabled = false;
      button.textContent = button.dataset.old;
    }
  }
}
app.addEventListener("input", (e) => {
  if (e.target.id === "step") {
    draft = e.target.value;
    const send = e.target.form?.querySelector(".send-action");
    if (send)
      send.disabled = !draft.trim() && !(entryMode === "photo" && photo);
    pilotError = "";
    const message = document.querySelector("#pilot-error");
    if (message) message.hidden = true;
  }
  if (e.target.id === "alias") aliasDraft = e.target.value;
  if (e.target.id === "share") sharing = e.target.checked;
});
app.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn || busy) return;
  if (btn.dataset.group) {
    const wasOpen = btn.getAttribute("aria-expanded") === "true";
    expandedGroup = wasOpen ? "" : btn.dataset.group;
    render();
    document
      .querySelector('[data-group="' + btn.dataset.group + '"]')
      ?.focus({ preventScroll: true });
    return;
  }
  if (btn.dataset.symbol) {
    const field = document.querySelector("#step");
    field.setRangeText(
      btn.dataset.symbol,
      field.selectionStart,
      field.selectionEnd,
      "end",
    );
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.focus();
    return;
  }
  if (btn.dataset.pilot) {
    switch (btn.dataset.pilot) {
      case "copy": {
        void (async () => {
          try {
            if (!navigator.clipboard) throw new Error();
            await navigator.clipboard.writeText(state.join);
          } catch {
            const field = document.createElement("textarea");
            field.value = state.join;
            btn.after(field);
            field.select();
            if (!document.execCommand("copy")) {
              tell("Select and copy the student link.");
              return;
            }
            field.remove();
            btn.focus();
          }
          tell("Student link copied.");
        })();
        return;
      }
      case "revise":
        editing = true;
        draft = state.attempt.line || "";
        photo = lastSentPhoto;
        showPhotoNote = Boolean(photo && draft);
        entryMode = photo ? "photo" : "text";
        break;
      case "choose":
        entryMode = "choose";
        break;
      case "cancel":
        editing = false;
        photo = "";
        draft = "";
        entryMode = "choose";
        break;
      case "type":
        photo = "";
        entryMode = "text";
        break;
      case "note":
        showPhotoNote = true;
        break;
    }
    pilotError = "";
    render();
    (
      document.querySelector("#step") ||
      document.querySelector(".camera-action input")
    )?.focus({ preventScroll: true });
    return;
  }
  if (btn.dataset.tab) {
    tab = btn.dataset.tab;
    render();
    return;
  }
  const action = btn.dataset.action;
  if (!action) return;
  if (action === "edit") {
    tab = "Class";
    editing = true;
    draft = state.attempt.line;
    sharing = state.share;
    render();
    document.querySelector("#step")?.focus();
    return;
  }
  void run(async () => {
    state = await api(
      "host/" + action,
      action === "mode" ? { live: !state.live } : {},
    );
    render();
  }, btn);
});
app.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  void run(async () => {
    if (form.dataset.form === "join") {
      await join(document.querySelector("#code").value);
      return;
    }
    if (form.dataset.form === "attempt") {
      const attachment = state.pilot && entryMode !== "photo" ? "" : photo;
      state = await api("attempt", {
        text: draft,
        image: attachment,
        share: state.pilot || sharing,
      });
      lastSentPhoto = attachment;
      pilotError = "";
      entryMode = "choose";
      showPhotoNote = false;
      photo = "";
      editing = false;
    } else if (form.dataset.form === "score") {
      const d = new FormData(form);
      state = await api("score", {
        answer: Number(d.get("answer")),
        reason: Number(d.get("reason")),
      });
    } else if (form.dataset.form === "alias") {
      state = await api("alias", { alias: aliasDraft });
      aliasDraft = state.alias;
      tell("Standings preference saved.");
    }
    render();
    if (state.pilot && form.dataset.form === "attempt")
      document.querySelector(".sent-card h2")?.focus({ preventScroll: true });
  }, e.submitter);
});
async function resizePhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}
app.addEventListener("change", (e) => {
  if (
    (e.target.id === "photo" || e.target.id === "camera") &&
    e.target.files?.[0]
  ) {
    const file = e.target.files[0];
    void run(async () => {
      try {
        photo = await resizePhoto(file);
      } catch {
        throw new Error(
          "This browser could not read that photo. Try a JPEG or type your line.",
        );
      }
      if (state?.pilot) {
        entryMode = "photo";
        showPhotoNote = Boolean(draft.trim());
        pilotError = "";
      }
      render();
    });
    return;
  }
  if (e.target.dataset.review)
    void run(async () => {
      state = await api("host/correct", {
        id: e.target.dataset.review,
        group: e.target.value,
      });
      render();
    });
});

async function refresh() {
  if (!state || busy || document.hidden) return;
  const previous = state;
  try {
    const next = await api(
      projection
        ? "board?room=" + encodeURIComponent(roomCode)
        : host
          ? "host/state"
          : "state",
    );
    const status = document.querySelector("[data-connection]");
    if (status) status.textContent = "Room open";
    if (
      busy ||
      state !== previous ||
      JSON.stringify(next) === JSON.stringify(previous)
    )
      return;
    // Avoid destroying in-progress answers, keyboard focus or expanded study notes on a poll.
    if (
      document.activeElement?.matches("textarea,input,select") ||
      document.querySelector(
        'details[open], form[data-form="score"] input:checked',
      )
    )
      return;
    state = next;
    render();
  } catch {
    const status = document.querySelector("[data-connection]");
    if (status) status.textContent = "Reconnecting…";
  }
}
try {
  if (host) {
    if (location.hash) {
      const secret = location.hash.slice(1);
      history.replaceState(null, "", "/present");
      await api("host", { secret });
    }
    state = await api("host/state");
    render();
  } else if (projection) {
    state = await api("board?room=" + encodeURIComponent(roomCode));
    render();
  } else if (roomCode) {
    await join(roomCode);
  } else {
    joinForm();
  }
} catch (error) {
  if (host) {
    app.innerHTML =
      '<section class="card center"><h2>Presenter access</h2><p>Open the private presenter link printed when you start the room.</p></section>';
  } else if (projection) {
    app.textContent = "Open the projector link from the professor’s view.";
  } else {
    joinForm();
    tell(error.message);
  }
}
setInterval(refresh, 1500);
