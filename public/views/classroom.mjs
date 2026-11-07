import { api, upload } from '../api.mjs';
import { badge, date, empty, esc, formValues, image, markdown, modes, on, score, toast, wireMarkdown } from '../ui.mjs';

export async function classroomView(root, user, classId, tab, refresh) {
  const { classroom } = await api(`/classes/${classId}`);
  const owner = classroom.professor_id === user.id;
  const tabs = ['questions','resources', ...(owner ? ['students','insights'] : []), 'leaderboard'];
  if (!tabs.includes(tab)) tab = 'questions';
  root.innerHTML = `<div class="page-heading"><div><a href="#/">← All classes</a><h1>${esc(classroom.name)}</h1><p>${esc(classroom.description)}</p></div>${owner ? `<div class="card compact"><small>Share this class code</small><strong class="code">${esc(classroom.code)}</strong></div>` : ''}</div>
    <nav class="tabs" aria-label="Class sections">${tabs.map(t => `<a class="${t === tab ? 'active' : ''}" href="#/classes/${classId}/${t}">${t[0].toUpperCase() + t.slice(1)}</a>`).join('')}</nav><div id="class-content"></div>`;
  const content = root.querySelector('#class-content');
  if (tab === 'questions') await questions(content, classroom, owner, refresh);
  if (tab === 'students') await students(content, classroom, refresh);
  if (tab === 'resources') await resources(content, classroom, owner, refresh);
  if (tab === 'insights') await insights(content, classroom, refresh);
  if (tab === 'leaderboard') {
    const { leaderboard } = await api(`/classes/${classId}/leaderboard`);
    content.innerHTML = `<section class="card"><h2>Class leaderboard</h2><p class="muted">Points = question weight × assessed score / 100. Only the latest attempt per question counts. Responses awaiting review earn points after assessment.</p>${leaderboard.length ? `<ol class="leaderboard">${leaderboard.map(m => `<li><span>${esc(m.name)}${m.id === user.id ? ' (you)' : ''}</span><strong>${m.points.toFixed(2)} points</strong></li>`).join('')}</ol>` : empty('No active students yet.')}</section>`;
  }
}

async function questions(root, classroom, owner, refresh) {
  const { quizzes } = await api(`/classes/${classroom.id}/quizzes`);
  root.innerHTML = `${owner ? `<section class="card"><h2>Publish a question</h2><form id="question-form">
    <label>Title<input name="title" required maxlength="200"></label>
    <label>Question · plain text or GitHub-style Markdown<textarea name="question" data-markdown rows="5" maxlength="50000"></textarea></label>
    <label>Import a text/Markdown file<input type="file" accept=".md,.txt,.markdown" data-text-file="question"></label>
    <label>Question image (optional)<input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>
    <div class="columns"><label>Leaderboard weight<input name="weight" type="number" min="0.01" max="1000" step="0.01" value="1" required></label>
    <label>Reference answer (optional, private)<textarea name="reference_answer" rows="3" maxlength="50000"></textarea></label></div>
    <label>Assessment rubric (optional, private)<textarea name="rubric" rows="3" maxlength="50000" placeholder="What should a good explanation demonstrate?"></textarea></label>
    <label class="check"><input name="notify_students" type="checkbox" checked> Notify students</label>
    <button type="submit">Publish question</button></form></section>` : ''}
    <section><h2>Questions & history</h2>${quizzes.length ? quizzes.map(q => `<article class="card"><div class="row"><h3><a href="#/quizzes/${q.id}">${esc(q.title)}</a></h3>${badge(q.status)}</div><p class="muted">${q.weight} point${q.weight === 1 ? '' : 's'} · ${date(q.created_at)}${owner ? ` · ${q.response_count} respondent(s)` : ''}</p>${!owner && q.submission ? `${badge(q.submission.status)} ${q.submission.status === 'graded' ? score(q.submission.score) : ''}` : !owner && q.status === 'open' ? '<p>To do</p>' : ''}<a class="button secondary" href="#/quizzes/${q.id}">${owner ? 'View responses' : q.submission ? 'View answer & feedback' : 'Open question'}</a></article>`).join('') : empty('No questions published yet.')}</section>`;
  wireMarkdown(root);
  on(root, '#question-form', 'submit', async (_event, form) => {
    const body = formValues(form);
    body.image_id = await upload(classroom.id, 'question', body.image);
    delete body.image;
    body.weight = Number(body.weight); body.notify_students = form.elements.notify_students.checked;
    const result = await api(`/classes/${classroom.id}/quizzes`, { method: 'POST', body });
    toast('Question published.'); location.hash = `#/quizzes/${result.id}`;
  });
}

async function students(root, classroom, refresh) {
  const { members, whitelist } = await api(`/classes/${classroom.id}/members`);
  root.innerHTML = `<div class="columns"><section class="card"><h2>Class access</h2><form id="settings-form">
    <label>Name<input name="name" value="${esc(classroom.name)}" required maxlength="200"></label>
    <label>Description<textarea name="description" maxlength="50000">${esc(classroom.description)}</textarea></label>
    <label>Who can join?<select name="join_mode">${modes(classroom.join_mode)}</select></label>
    <p class="muted">Changing access rules affects future joins. Manage current students below.</p><button type="submit">Save settings</button></form></section>
    <section class="card"><h2>Email whitelist</h2><form id="whitelist-form"><label>One email per line<textarea name="emails" rows="7">${esc(whitelist.join('\n'))}</textarea></label><p class="muted">Listed addresses can join immediately. In whitelist mode, other addresses are refused. Blocked accounts remain blocked until restored below.</p><button type="submit">Save whitelist</button></form></section></div>
    <section class="card"><h2>Students & requests</h2>${members.length ? members.map(m => `<div class="member"><div><strong>${esc(m.name)}</strong><p>${esc(m.email)} · ${esc(m.status)}</p></div><div class="actions">${m.status !== 'active' ? `<button class="secondary" data-member="${m.id}" data-status="active">${m.status === 'pending' ? 'Approve' : 'Restore access'}</button>` : ''}${m.status !== 'blocked' ? `<button class="danger" data-member="${m.id}" data-status="blocked">Remove & block</button>` : ''}</div></div>`).join('') : empty('No students have joined yet.')}</section>`;
  on(root, '#settings-form', 'submit', async (_event, form) => {
    await api(`/classes/${classroom.id}`, { method: 'PATCH', body: formValues(form) }); toast('Settings saved.'); await refresh();
  });
  on(root, '#whitelist-form', 'submit', async (_event, form) => {
    const emails = form.elements.emails.value.split(/[\s,;]+/).filter(Boolean);
    await api(`/classes/${classroom.id}/whitelist`, { method: 'PUT', body: { emails } }); toast('Whitelist saved.');
  });
  on(root, '[data-member]', 'click', async (_event, button) => {
    await api(`/classes/${classroom.id}/members/${button.dataset.member}`, { method: 'PATCH', body: { status: button.dataset.status } }); await refresh();
  });
}

async function resources(root, classroom, owner, refresh) {
  const { resources } = await api(`/classes/${classroom.id}/resources`);
  root.innerHTML = `<section class="card"><h2>${owner ? 'Add course material' : 'Share a resource with the professor'}</h2><p class="muted">Approved text and images ground AI feedback. Links are saved for reference; their contents are not fetched.</p><form id="resource-form">
    <label>Title<input name="title" required maxlength="200"></label>
    <label>Text / Markdown<textarea name="content" data-markdown rows="4" maxlength="50000"></textarea></label>
    <label>Import text/Markdown<input type="file" accept=".txt,.md,.markdown" data-text-file="content"></label>
    <label>Link (optional)<input type="url" name="url" placeholder="https://…"></label>
    <label>Image (optional)<input type="file" name="image" accept="image/png,image/jpeg,image/webp,image/gif"></label>
    <button type="submit">${owner ? 'Add approved resource' : 'Send for review'}</button></form></section>
    <section><h2>${owner ? 'Resources & review inbox' : 'Course resources & your contributions'}</h2>${resources.length ? resources.map(r => `<article class="card" id="resource-${r.id}"><div class="row"><h3>${esc(r.title)}</h3>${badge(r.status)}</div>${r.author_name ? `<p class="muted">Shared by ${esc(r.author_name)}</p>` : ''}<div class="markdown">${markdown(r.content)}</div>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Open linked resource ↗</a>` : ''}${image(r.image_id, r.title)}${owner ? `<div class="actions">${r.status !== 'approved' ? `<button data-resource="${r.id}" data-status="approved">Approve</button>` : ''}${r.status !== 'rejected' ? `<button class="secondary" data-resource="${r.id}" data-status="rejected">${r.status === 'approved' ? 'Withdraw' : 'Reject'}</button>` : ''}</div>` : ''}</article>`).join('') : empty('No resources yet.')}</section>`;
  wireMarkdown(root);
  on(root, '#resource-form', 'submit', async (_event, form) => {
    const body = formValues(form); body.image_id = await upload(classroom.id, 'resource', body.image); delete body.image;
    await api(`/classes/${classroom.id}/resources`, { method: 'POST', body });
    toast(owner ? 'Resource added.' : 'Resource sent to the professor.'); await refresh();
  });
  on(root, '[data-resource]', 'click', async (_event, button) => {
    await api(`/resources/${button.dataset.resource}`, { method: 'PATCH', body: { status: button.dataset.status } }); await refresh();
  });
}

async function insights(root, classroom, refresh) {
  const stats = await api(`/classes/${classroom.id}/stats`);
  const summary = stats.summary;
  root.innerHTML = `<section class="card"><h2>Class overview</h2><div class="metrics"><div><strong>${stats.respondents} / ${stats.enrolled}</strong><span>respondents / enrolled</span></div><div><strong>${score(stats.average_score)}</strong><span>mean of ${stats.scored_count} assessed answers</span></div><div><strong>${stats.review_queue.length}</strong><span>answers needing attention</span></div></div><p class="muted">Uses the latest answer per active student per question. Students who respond may not represent the class.</p><h3>Score distribution</h3><div class="distribution">${stats.distribution.map(b => `<div><strong>${b.count}</strong><span>${b.label}%</span></div>`).join('')}</div></section>
    <div class="columns"><section class="card"><h2>Misconceptions to inspect</h2>${stats.misconceptions.length ? `<ul>${stats.misconceptions.map(m => `<li>${esc(m.concept)} <strong>(${m.count} response${m.count === 1 ? '' : 's'})</strong></li>`).join('')}</ul>` : empty('No AI misconception evidence yet.')}<p class="muted">AI groupings are suggestions about responses, subject to review.</p></section>
    <section class="card"><h2>Review queue</h2>${stats.review_queue.length ? stats.review_queue.map(s => `<a class="list-link" href="#/quizzes/${s.quiz_id}"><strong>${esc(s.quiz_title)} · response #${s.id}</strong><span>${esc(s.status)}</span></a>`).join('') : empty('Nothing awaiting review.')}</section></div>
    <section class="card"><div class="row"><h2>AI teaching summary</h2><button id="generate-summary">${summary ? 'Refresh summary' : 'Generate summary'}</button></div>${summary ? `<p class="muted">Generated ${date(summary.created_at)} · ${summary.responses_analyzed} of ${summary.total_assessed_responses} assessed responses analyzed. Refresh after new answers or professor reviews.</p><div class="markdown">${markdown(summary.summary)}</div><h3>Evidence groups</h3>${summary.misconceptions.map(m => `<p>${esc(m.concept)} · response IDs ${m.submission_ids.map(esc).join(', ')}</p>`).join('')}<h3>Suggested intervention</h3><p>${esc(summary.suggested_intervention)}</p>${summary.recommended_resource_ids.length ? `<p>Suggested course resource IDs: ${summary.recommended_resource_ids.join(', ')} (see Resources).</p>` : ''}<h3>Fresh follow-up question</h3><div class="markdown">${markdown(summary.follow_up_question)}</div><button id="use-followup" class="secondary">Review & publish follow-up</button>` : empty('Generate a grounded summary after responses have been assessed.')}</section>
    <section id="followup-editor" class="card" hidden><h2>Review the follow-up</h2><form id="followup-form"><label>Title<input name="title" required maxlength="200" value="Follow-up practice"></label><label>Question<textarea name="question" data-markdown required rows="5" maxlength="50000">${esc(summary?.follow_up_question)}</textarea></label><label>Private reference answer (optional)<textarea name="reference_answer" maxlength="50000"></textarea></label><label class="check"><input type="checkbox" name="notify_students" checked> Notify students</label><button type="submit">Approve & publish</button></form></section>`;
  wireMarkdown(root);
  on(root, '#generate-summary', 'click', async (_event, button) => {
    button.textContent = 'Generating…';
    try { await api(`/classes/${classroom.id}/summary`, { method: 'POST' }); await refresh(); }
    finally { button.textContent = 'Generate summary'; }
  });
  on(root, '#use-followup', 'click', () => { root.querySelector('#followup-editor').hidden = false; root.querySelector('#followup-editor').scrollIntoView({ behavior: 'smooth' }); });
  on(root, '#followup-form', 'submit', async (_event, form) => {
    const body = formValues(form); body.notify_students = form.elements.notify_students.checked;
    const result = await api(`/classes/${classroom.id}/quizzes`, { method: 'POST', body }); location.hash = `#/quizzes/${result.id}`;
  });
}
