const h = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const letter = (i) => String.fromCharCode(65 + i);
const button = (id, text, primary = false, attrs = "") =>
  `<button type="button" data-q="${id}" class="q-button ${primary ? "primary" : ""}" ${attrs}>${text}</button>`;
const eyebrow = (text) => `<p class="q-overline">${h(text)}</p>`;
const panelTitle = (text) => `<h2>${h(text)}</h2>`;
const notebook = location.pathname + "?view=notebook";
let screen = "",
  source = "",
  localDraft = null,
  draftId = "",
  reportId = "",
  pending = "",
  error = "",
  joinCopied = false;
let editingDraft = false;
let questionId = "",
  answer = null,
  reason = null,
  stage = "choose",
  studentTab = "class",
  reviewIndex = null,
  retry = null;
let state, role, root, controls;
let saved = [];
try {
  const data = JSON.parse(localStorage.getItem("sr-quiz-progress-v1") || "[]");
  if (Array.isArray(data)) saved = data.slice(0, 40);
} catch {}
function remember(receipt) {
  if (!receipt || saved.some((r) => r.id === receipt.id)) return;
  saved = [receipt, ...saved].slice(0, 40);
  try {
    localStorage.setItem("sr-quiz-progress-v1", JSON.stringify(saved));
  } catch {}
}
function resetStudent(q) {
  if (questionId === q?.id) return;
  questionId = q?.id;
  answer = null;
  reason = null;
  stage = "choose";
  error = "";
}
function link(label, url, extra = "") {
  return `<a class="q-link" href="${h(url)}" ${extra}>${h(label)}</a>`;
}
function shell(label, html, foot = "") {
  document.body.classList.remove("workroom");
  document.body.classList.add("q-body");
  document.querySelector(".room-context").textContent = label;
  root.className = "q-app";
  root.innerHTML =
    html +
    `<div class="q-error" role="alert" ${error ? "" : "hidden"}>${h(error)}</div>` +
    foot;
}
const topper = (small, title, summary = "") =>
  `<div class="q-heading">${eyebrow(small)}<h1>${h(title)}</h1>${summary ? `<p>${h(summary)}</p>` : ""}</div>`;
function teacherHome(t) {
  const available = [
    ...(t.active?.report ? [t.active.report] : []),
    ...t.history,
  ];
  const list = available.length
    ? `<div class="q-archive">${panelTitle("Past questions")}${available.map((r) => button("past", h(r.title || r.question.prompt) + " ↗", false, `data-id="${h(r.id)}"`)).join("")}</div>`
    : "";
  return (
    topper(
      "Teaching desk",
      "Class questions",
      "Start with one exercise from your course.",
    ) +
    `<div class="q-grid"><section class="q-panel q-prepare">${panelTitle("Add a question")}
    <label class="q-field">Question text<textarea id="quiz-source" maxlength="5000" rows="4" placeholder="Paste an exercise, with answer choices if you have them.">${h(source)}</textarea></label>
    <div class="q-toolbar">${button("analyze", pending === "analyze" ? "Reading question…" : "Review question →", true)}
    <label class="q-upload">↑ Upload a file<input id="quiz-file" type="file" accept=".pdf,.txt,.md${t.cloud ? ",.png,.jpg,.jpeg,.webp" : ""}"></label></div>
    <p class="q-small">PDF or plain text${t.cloud ? " · JPEG, PNG or WebP" : ""} · One exercise, up to 4 MB</p>
    <div class="q-examples"><h3>Try a course example</h3>${t.examples.map((n, i) => button("sample", h(n) + " <span>↗</span>", false, `data-index="${i}"`)).join("")}</div>
    ${t.draft ? button("resume", "Resume reviewed draft →") : ""}</section>
    <aside class="q-aside">${eyebrow("Example class report")}<h2>When a correct answer hides a gap</h2>
    <div class="q-mini"><b>15 <small>/ 24</small></b><span>chose the correct deflection</span><i style="--a:62.5%"></i></div>
    <div class="q-mini"><b>9 <small>/ 24</small></b><span>also chose the cubic rule</span><i style="--a:37.5%"></i></div>
    ${button("example-report", "Explore example report →")}
    <p class="q-small">Illustrative responses from a mechanics tutorial.</p></aside></div>${list}`
  );
}
function field(title, key, value, rows = 0, max = 300) {
  return `<label class="q-field">${h(title)}${rows ? `<textarea data-field="${key}" rows="${rows}" maxlength="${max}">${h(value)}</textarea>` : `<input data-field="${key}" value="${h(value)}" maxlength="${max}">`}</label>`;
}
function editor(t) {
  const d = localDraft;
  const original = t.draft.sourceText
    ? `<details class="q-details" data-preserve="source"><summary>Original question text</summary><p class="q-original">${h(t.draft.sourceText)}</p></details>`
    : "";
  if (
    !editingDraft &&
    d.key !== null &&
    d.explanation &&
    d.options.every((o) => o.text)
  ) {
    return `${button("home", "← Teaching desk")}${topper("Instructor review", "Review question", "Check the key, then open voting on every connected phone.")}
    <div class="q-grid"><section class="q-panel"><p class="q-question">${h(d.prompt)}</p>
    <ol class="q-static">${d.options.map((o, i) => `<li><i>${letter(i)}</i><span>${h(o.text)} ${d.key === i ? '<b class="q-correct">Correct</b>' : ""}</span></li>`).join("")}</ol>
    <p>${h(d.explanation)}</p>${original}<div class="q-toolbar">${button("publish", pending ? "Opening…" : "Open for students →", true)}${button("edit-draft", "Edit question")}</div></section>
    <aside class="q-aside">${eyebrow("Question analysis")}<h2>${h(d.topic || "Review notes")}</h2>
    ${d.reasonKey === null ? "" : `<h3>Reasoning to listen for</h3><p>${h(d.options[d.reasonKey].reason)}</p><h3>Possible stumbling block</h3><p>${h(d.options.find((o, i) => i !== d.reasonKey)?.reason)}</p>`}
    <small>${h(t.draft.engine)} · ${h(t.draft.note)}</small></aside></div>`;
  }
  const pick = (name, idx, key, label) =>
    `<label class="q-tick"><input type="radio" name="${name}" data-key="${name}" value="${idx}" ${idx === key ? "checked" : ""}>${label}</label>`;
  return `${button("home", "← Teaching desk")}${topper("Instructor review", "Review question", "Students will see it when you open voting.")}
    <section class="q-panel q-editor"><div class="q-source-note"><b>${h(t.draft.engine)}</b><span>${h(t.draft.note)}</span></div>${original}
    ${field("Question", "prompt", d.prompt, 3, 1600)}${field("Topic", "topic", d.topic, 0, 100)}
    <h2>Answer choices</h2><div class="q-edit-options">${d.options.map((o, i) => `<div class="q-edit-choice"><b>${letter(i)}</b><div>${field("Answer " + letter(i), "text-" + i, o.text, 0, 240)}${pick("key", i, d.key, "Correct answer")}</div></div>`).join("")}</div>
    <div class="q-inline">${d.options.length < 4 ? button("add-choice", "+ Add choice") : ""}${d.options.length > 2 ? button("remove-choice", "Remove last choice") : ""}</div>
    ${field("Explanation students receive", "explanation", d.explanation, 2, 700)}
    <details class="q-details" data-preserve="reason-editor"><summary>Reasoning choices and private feedback</summary><p>Students can pick a reason after choosing an answer. Select the sound reason, or leave every reason empty to skip this step.</p>
    ${d.options.map((o, i) => `<div class="q-reason-editor">${field("Reason " + (i + 1), "reason-" + i, o.reason, 0, 300)}${pick("reasonKey", i, d.reasonKey, "Sound reason")}${field("Feedback for answer " + letter(i), "hint-" + i, o.hint, 0, 450)}</div>`).join("")}</details>
    ${field("What to try on the board", "next", d.next, 2, 500)}
    <div class="q-toolbar">${button("publish", pending ? "Opening…" : "Open for students →", true)}</div></section>`;
}
function teacherLive(a) {
  return (
    topper("Voting open", a.question.topic || "Class question") +
    `<div class="q-grid"><section class="q-panel">${eyebrow("On students’ phones")}
    <p class="q-question">${h(a.question.prompt)}</p>${optionList(a.question.options.map((o) => o.text))}
    <div class="q-live-count"><strong>${a.total}</strong> ${a.total === 1 ? "answer" : "answers"} received</div>
    ${button("close", a.status === "closing" || pending ? "Preparing report…" : "Close voting & see report", true)}</section>
    ${invite(state.join)}</div>`
  );
}
function optionList(opts) {
  return `<ol class="q-static">${opts.map((o, i) => `<li><i>${letter(i)}</i>${h(o)}</li>`).join("")}</ol>`;
}
function invite(join) {
  return `<aside class="q-aside q-invite"><h2>Join this question</h2><img src="/qr.png" alt="QR code to join this class">
    ${link("Open projector ↗", "/board", 'target="_blank" rel="noopener"')}${join ? button("copy", joinCopied ? "Join link copied" : "Copy student link") : ""}<p class="q-small">Scan to join. No code or account.</p></aside>`;
}
function report(r) {
  const q = r.question;
  return `${button("back-report", "← Teaching desk")}${topper(r.example ? "Example report · illustrative data" : "Anonymous class report", r.title || "Class report")}
    <p class="q-report-question">${h(q.prompt)}</p><div class="q-stats">
    <div><b>${r.total}</b><span>responses</span></div><div><b>${r.correct}</b><span>correct answers</span></div>
    ${q.reasonKey !== null ? `<div><b>${r.coherent}</b><span>correct with sound reason</span></div>` : ""}</div>
    <div class="q-grid"><section class="q-panel"><h2>How the class answered</h2>
    ${q.options.map((o, i) => `<div class="q-bar-row"><div><span>${letter(i)} · ${h(o.text)} ${i === q.key ? '<b class="q-correct">Correct</b>' : ""}</span><b>${r.counts[i]} <small>· ${r.total ? Math.round((100 * r.counts[i]) / r.total) : 0}%</small></b></div><i style="--a:${r.total ? (r.counts[i] * 100) / r.total : 0}%"></i></div>`).join("")}
    ${q.reasonKey === null ? "" : `<details class="q-details" data-preserve="report-reasons"><summary>Reasons selected · ${r.explained} of ${r.total}</summary>${q.options.map((o, i) => `<p class="q-reason-stat"><span>${h(o.reason)} ${i === q.reasonKey ? "(sound reason)" : ""}</span><b>${r.reasons[i]}</b></p>`).join("")}</details>`}</section>
    <aside class="q-aside"><h2>What to teach next</h2><p>${h(r.finding)}</p>
    ${r.leadingReason ? `<p class="q-evidence">${r.leadingReason.count} selected this reason<br><strong>“${h(r.leadingReason.text)}”</strong></p>` : ""}
    <h3>On the board</h3><p>${h(r.action)}</p><small>${h(r.engine)}</small></aside></div>
    <div class="q-toolbar">${button("home", r.example ? "Prepare a question →" : "Prepare next question →", true)}</div>`;
}
function teach() {
  const t = state.teaching;
  if (t.draft && draftId !== t.draft.id) {
    draftId = t.draft.id;
    localDraft = structuredClone(t.draft.question);
  }
  const viewed =
    reportId === "example"
      ? t.sample
      : [t.active?.report, ...t.history].find((r) => r?.id === reportId);
  let html;
  if (screen === "report" && viewed) html = report(viewed);
  else if (screen === "edit" && t.draft) html = editor(t);
  else if (t.active && t.active.status !== "closed")
    html = teacherLive(t.active);
  else if (t.active?.report && screen !== "home" && screen !== "edit")
    html = report(t.active.report);
  else html = teacherHome(t);
  shell(
    "Professor",
    html,
    `<footer class="q-footer">${link("Open the worked-step notebook ↗", notebook)}</footer>`,
  );
}
function progress() {
  const r = reviewIndex === null ? null : saved[reviewIndex];
  if (r)
    return `${button("all-progress", "← My progress")}${topper("Private review", r.topic || "Practice question")}
    <div class="q-panel"><p class="q-question">${h(r.prompt)}</p>
    ${
      retry === null
        ? `<p>Your first choice: <strong>${h(r.chosen)}</strong>. ${r.reason ? `Your reason: ${h(r.reason)}` : ""}</p>
    ${r.reasonRight === false ? `<p>Revisit the reason: ${h(r.soundReason)}</p>` : ""}`
        : ""
    }
    ${
      retry === null
        ? button("retry", "Try this question again", true)
        : retry === -1
          ? `<div class="q-picks">${r.choices.map((v, i) => button("retry-pick", h(v), false, `data-index="${i}"`)).join("")}</div>`
          : `<h2>${r.choices[retry] === r.correct ? "Correct on this try" : "Look at the rule again"}</h2><p>${h(r.explanation)}</p>${button("retry", "Try again")}`
    }</div>`;
  return (
    topper(
      "For you",
      "My progress",
      "Your first answers stay on this browser. Practice again at your own pace.",
    ) +
    `<div class="q-stats"><div><b>${saved.length}</b><span>questions answered</span></div><div><b>${saved.filter((r) => r.right).length}</b><span>correct first answers</span></div><div><b>${saved.filter((r) => r.retryRight === true).length}</b><span>correct on review</span></div></div>
    <section class="q-panel">${panelTitle("Your questions")}${saved.length ? saved.map((r, i) => button("review-saved", `<span>${h(r.topic || r.prompt)}</span><small>${r.retryRight ? "Reviewed" : r.reasonRight === false ? "Revisit reasoning" : r.right ? "Correct" : "Revisit answer"} →</small>`, false, `data-index="${i}"`)).join("") : "<p>Your first question will appear here after you answer.</p>"}</section>`
  );
}
function picks(items, selected, id) {
  return `<div class="q-picks" role="group" aria-label="${id === "answer" ? "Answer choices" : "Reasoning choices"}">${items.map(({ id: key, text }, i) => button(id, `<i>${id === "answer" ? letter(i) : i + 1}</i><span>${h(text)}</span>`, false, `data-index="${key}" aria-pressed="${key === selected}"`)).join("")}</div>`;
}
function student() {
  const q = state.quiz || state.quizPractice;
  resetStudent(q);
  remember(state.quizPractice?.receipt);
  remember(state.quiz?.receipt);
  const nav = `<nav class="q-tabs" aria-label="Student view">${button("class", "Class", false, `aria-current="${studentTab === "class" ? "page" : "false"}"`)}${button("progress", "My progress", false, `aria-current="${studentTab === "progress" ? "page" : "false"}"`)}</nav>`;
  let html;
  if (studentTab === "progress") html = progress();
  else {
    const solo = q.status === "practice";
    const label = solo
      ? "Private practice · waiting for a class question"
      : q.status === "open"
        ? "Class question · voting open"
        : "Class question · voting closed";
    const r = q.receipt;
    html =
      topper(label, q.topic || "Your class question") +
      `<section class="q-panel q-student"><p class="q-question">${h(q.prompt)}</p>`;
    if (r) {
      html += `<div class="q-receipt"><h2>${r.right ? "Correct answer" : "A step to revisit"}</h2><p>You chose <strong>${h(r.chosen)}</strong>.</p>
      ${!r.right ? `<p>Correct choice: <strong>${h(r.correct)}</strong>.</p>` : ""}
      ${r.hint && !r.right ? `<p>${h(r.hint)}</p>` : ""}<p>${h(r.explanation)}</p>
      ${r.reasonRight !== null ? `<p><b>${r.reasonRight ? "Your reasoning fits." : "Check your reasoning."}</b> ${h(r.soundReason)}</p>` : ""}
      ${button("progress", "View my progress →")}</div>`;
    } else if (q.status === "closing" || q.status === "closed")
      html +=
        "<h2>Voting has ended</h2><p>The next question will appear here when your professor opens it.</p>";
    else if (stage === "reason")
      html += `<p class="q-chosen">Your answer · ${h(q.options[answer])}</p><h2>What led you there?</h2>${picks(q.reasonChoices, reason, "reason")}<div class="q-toolbar">${button("send", pending ? "Sending…" : reason === null ? "Send without a reason" : "Send my answer →", true)}${button("change", "Change answer")}</div>`;
    else
      html += `${picks(
        q.options.map((text, id) => ({ id, text })),
        answer,
        "answer",
      )}<div class="q-toolbar">${button("next", q.reasonChoices.length ? "Continue →" : "Send my answer →", true, answer === null ? "disabled" : "")}</div>`;
    html += "</section>";
  }
  shell(
    "Student",
    nav + html,
    `<footer class="q-footer">${link("Open the worked-step notebook ↗", notebook)}</footer>`,
  );
}
function board() {
  const q = state.quiz;
  const open = q?.status === "open";
  const html =
    topper(
      "Class screen",
      open ? q.topic || "Class question" : "Join the class",
      open
        ? ""
        : q
          ? "Voting has ended. The next question will appear here."
          : "The question will appear here when voting opens.",
    ) +
    `<div class="q-grid"><section class="q-panel">${open ? `<p class="q-question">${h(q.prompt)}</p>${optionList(q.options)}<div class="q-live-count"><strong>${q.total}</strong> answers received</div>` : `<h2>On your phone</h2><p>Scan the QR code. Keep this page open on your phone to answer and receive private feedback.</p>`}</section>${invite(null).replace(/<a class="q-link"[^>]*>Open projector ↗<\/a>/, "")}</div>`;
  shell("Projector", html);
}
export function paintTeaching(app, next, view, actions) {
  root = app;
  state = next;
  role = view;
  controls = actions;
  if (role === "host") teach();
  else if (role === "board") board();
  else student();
  if (pending)
    root
      .querySelectorAll("button,input,textarea")
      .forEach((el) => (el.disabled = true));
}
export const teachingBusy = () => Boolean(pending);
async function mutate(action, path, data, done) {
  if (pending) return;
  pending = action;
  error = "";
  controls.draw();
  try {
    const next = await controls.api(path, data);
    done?.();
    controls.set(next);
  } catch (e) {
    error = e.message;
  } finally {
    pending = "";
    controls.draw();
  }
}
function editInput(el) {
  const field = el.dataset.field;
  if (el.id === "quiz-source") {
    source = el.value;
    return;
  }
  if (!localDraft) return;
  if (el.dataset.key) {
    localDraft[el.dataset.key] = Number(el.value);
    return;
  }
  if (!field) return;
  const [key, index] = field.split("-");
  if (index === undefined) localDraft[key] = el.value;
  else localDraft.options[Number(index)][key] = el.value;
}
async function analyze(data) {
  await mutate("analyze", "host/quiz/analyze", data, () => {
    screen = "edit";
    editingDraft = false;
  });
}
async function upload(file) {
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) {
    error = "Choose a file smaller than 4 MB.";
    controls.draw();
    return;
  }
  try {
    if (/\.(?:md|txt)$/i.test(file.name)) {
      source = await file.text();
      await analyze({ text: source });
      return;
    }
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const type =
      file.type || (/\.pdf$/i.test(file.name) ? "application/pdf" : "");
    await analyze({ file: { type, data } });
  } catch {
    error =
      "The file could not be opened. Paste its text or choose another file.";
    controls.draw();
  }
}
async function action(btn) {
  const id = btn.dataset.q,
    i = Number(btn.dataset.index),
    t = state.teaching;
  error = "";
  if (id === "analyze") return analyze({ text: source });
  if (id === "sample") return analyze({ sample: i });
  if (id === "publish")
    return mutate(
      "publish",
      "host/quiz/publish",
      { id: draftId, question: localDraft },
      () => {
        screen = "";
        source = "";
      },
    );
  if (id === "close")
    return mutate("close", "host/quiz/close", { id: t.active.id }, () => {
      screen = "";
    });
  if (id === "copy") {
    try {
      await navigator.clipboard.writeText(state.join);
      joinCopied = true;
    } catch {
      error = "Student link: " + state.join;
    }
  }
  if (id === "home" || id === "back-report") {
    screen = "home";
    reportId = "";
  }
  if (id === "resume") screen = "edit";
  if (id === "edit-draft") editingDraft = true;
  if (id === "add-choice")
    localDraft.options.push({ text: "", reason: "", hint: "" });
  if (id === "remove-choice") {
    localDraft.options.pop();
    for (const k of ["key", "reasonKey"])
      if (localDraft[k] >= localDraft.options.length) localDraft[k] = null;
  }
  if (id === "example-report" || id === "past") {
    screen = "report";
    reportId = id === "past" ? btn.dataset.id : "example";
  }
  if (id === "progress" || id === "all-progress") {
    studentTab = "progress";
    reviewIndex = null;
    retry = null;
  }
  if (id === "class") studentTab = "class";
  if (id === "review-saved") {
    reviewIndex = i;
    retry = null;
  }
  if (id === "retry") retry = -1;
  if (id === "retry-pick") {
    retry = i;
    const entry = saved[reviewIndex];
    entry.retryRight = entry.choices[i] === entry.correct;
    try {
      localStorage.setItem("sr-quiz-progress-v1", JSON.stringify(saved));
    } catch {}
  }
  if (id === "answer") answer = i;
  if (id === "reason") reason = reason === i ? null : i;
  if (id === "change") stage = "choose";
  if (id === "next" || id === "send") {
    const q = state.quiz || state.quizPractice;
    if (q.id !== questionId || answer === null) return;
    if (id === "next" && q.reasonChoices.length) stage = "reason";
    else
      return mutate(
        "send",
        q.status === "practice" ? "quiz/practice" : "quiz/vote",
        { id: q.id, answer, reason },
      );
  }
  controls.draw();
  if (id === "answer" || id === "reason")
    root
      .querySelector(`[data-q="${id}"][data-index="${i}"]`)
      ?.focus({ preventScroll: true });
}
document.addEventListener("input", (e) => {
  if (root?.contains(e.target)) editInput(e.target);
});
document.addEventListener("change", (e) => {
  if (e.target.id === "quiz-file") void upload(e.target.files[0]);
});
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-q]");
  if (btn && root?.contains(btn) && !pending) void action(btn);
});
