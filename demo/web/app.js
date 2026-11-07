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
function hostView() {
  const groups = state.groups
    .map(
      (
        g,
      ) => `<div class="group"><div class="spread"><b>${esc(g.title)}</b><strong>${g.count}</strong></div><div class="meter"><div style="width:${state.count ? (g.count * 100) / state.count : 0}%"></div></div>
    ${g.excerpts.map((e) => `<div class="excerpt"><blockquote>${esc(e.line || "Unclear step")}</blockquote><label class="small">Group <select data-review="${esc(e.id)}">${state.groups.map((o) => `<option value="${o.id}" ${o.id === g.id ? "selected" : ""}>${esc(o.title)}</option>`).join("")}</select></label></div>`).join("")}</div>`,
    )
    .join("");
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
  return `<section class="card"><h2>Your first move</h2><p class="small">One line from your notebook is enough. This attempt is private and unscored.</p>
    <form data-form="attempt"><label class="upload">▧ &nbsp; ${photo ? "Change photo" : "Add a photo"}<input type="file" accept="image/*" id="photo"></label>
    <img class="preview" id="preview" ${photo ? `src="${photo}"` : "hidden"} alt="Your selected work">
    <p class="small" id="mode-note">${state.live ? "Submitted photos are sent to the AI for reading." : "Rehearsal mode groups typed steps. For a photo, type the relevant line below."}</p>
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
function projectorView() {
  app.innerHTML = `<div class="head"><p class="eyebrow">Analisi I · Live exercise</p><h1>On the board</h1></div><div class="grid"><div class="stack">${problem()}
    ${state.challenge ? `<section class="card lavender"><p class="eyebrow">Now open on phones</p><h2>${esc(state.challenge.title)}</h2><p>${esc(state.challenge.prompt)}</p></section><section class="card"><h2>Standings</h2>${board()}</section>` : ""}</div>
    <section class="card display-join"><h2>Join the exercise</h2><img src="/qr.png" alt="Scan to join"><p class="mono">${esc(state.room)}</p><p>${state.count} submitted</p></section></div>`;
}
function render() {
  if (host) hostView();
  else if (projection) projectorView();
  else studentView();
}
function joinForm() {
  app.innerHTML =
    '<section class="card center"><p class="eyebrow">Join a lecture</p><h1>Find your room.</h1><form data-form="join"><label class="form-label">Room code <input id="code" maxlength="6" type="text" autocomplete="off" required></label><p class="small">Use the six characters on the professor’s screen.</p><button class="primary">Enter room →</button></form></section>';
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
    button.textContent = "Working…";
  }
  try {
    await action();
  } catch (error) {
    tell(error.message);
  } finally {
    busy = false;
    if (button?.isConnected) {
      button.disabled = false;
      button.textContent = button.dataset.old;
    }
  }
}
app.addEventListener("input", (e) => {
  if (e.target.id === "step") draft = e.target.value;
  if (e.target.id === "alias") aliasDraft = e.target.value;
  if (e.target.id === "share") sharing = e.target.checked;
});
app.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn || busy) return;
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
      state = await api("attempt", {
        text: draft,
        image: photo,
        share: sharing,
      });
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
  if (e.target.id === "photo" && e.target.files?.[0]) {
    const file = e.target.files[0];
    void run(async () => {
      try {
        photo = await resizePhoto(file);
      } catch {
        throw new Error(
          "This browser could not read that photo. Try a JPEG or type your line.",
        );
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
    /* A later poll retries. Submission errors are shown at the action. */
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
