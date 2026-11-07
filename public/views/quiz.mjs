import { api, upload } from '../api.mjs';
import { badge, date, empty, esc, feedback, formValues, image, markdown, on, toast, whiteboard, wireMarkdown } from '../ui.mjs';

export async function quizView(root, user, quizId, refresh) {
  const { quiz, submissions } = await api(`/quizzes/${quizId}`);
  const owner = user.role === 'professor';
  const latest = submissions[0];
  const latestByStudent = new Map();
  for (const row of submissions) if (!latestByStudent.has(row.student_id)) latestByStudent.set(row.student_id, row.id);
  const attempt = (s, professor = false) => `<article class="card" id="submission-${s.id}">
    <div class="row"><h3>${professor ? `${esc(s.student_name)} · ` : ''}Response #${s.id}${latestByStudent.get(s.student_id) === s.id ? ' · latest' : ' · previous attempt'}</h3><small>${date(s.created_at)}</small></div>
    <div class="markdown">${markdown(s.answer)}</div>${image(s.image_id, 'Submitted solution')}${feedback(s)}
    ${['awaiting_ai','failed'].includes(s.status) ? `<button class="secondary" data-retry="${s.id}">Retry AI assessment</button>` : ''}
    ${professor ? `<details><summary>Professor review / score override</summary><form data-review="${s.id}" class="review-form"><label>Score (0–100)<input type="number" name="score" min="0" max="100" step="0.1" value="${s.score ?? ''}" required></label><label>Feedback for the student<textarea name="note" required maxlength="5000">${esc(s.review_note)}</textarea></label><button type="submit">Save professor review</button></form></details>` : ''}
  </article>`;
  root.innerHTML = `<a href="#/classes/${quiz.class_id}/questions">← Back to class</a><section class="card"><div class="row"><h1>${esc(quiz.title)}</h1>${badge(quiz.status)}</div><p class="muted">Weight: ${quiz.weight} point${quiz.weight === 1 ? '' : 's'} · ${date(quiz.created_at)}</p><div class="markdown">${markdown(quiz.question)}</div>${image(quiz.image_id, 'Question image')}
    ${owner ? `<details><summary>Private assessment material</summary><h3>Reference answer</h3><div class="markdown">${markdown(quiz.reference_answer) || empty('None supplied.')}</div><h3>Rubric</h3><div class="markdown">${markdown(quiz.rubric) || empty('None supplied.')}</div></details><div class="actions">${quiz.status !== 'open' ? '<button data-state="open">Reopen question</button>' : '<button class="secondary" data-state="closed">Close question</button><button class="secondary" id="notify">Notify students</button>'}${quiz.status !== 'archived' ? '<button class="secondary" data-state="archived">Archive question</button>' : ''}<a class="button secondary" href="#/classes/${quiz.class_id}/insights">Class insights</a></div>` : ''}
  </section>
  ${!owner && quiz.status === 'open' ? `<section class="card"><h2>${latest ? 'Submit a revised answer' : 'Your answer'}</h2><p class="muted">Explain your reasoning in Markdown, attach a solution photo, or draw it below. A new answer replaces your leaderboard result; previous attempts stay in your history.</p>
    <form id="answer-form"><label>Answer · Markdown supported<textarea name="answer" data-markdown rows="6" maxlength="50000"></textarea></label>
      <label>Add a solution image<select name="answer_mode" id="answer-mode"><option value="none">Text only</option><option value="photo">Upload a photo</option><option value="whiteboard">Draw on whiteboard</option></select></label>
      <div id="photo-input" hidden><label>Photo of your solution<input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label></div>
      <div id="drawing-input" hidden><p>Draw with a mouse, pen or finger.</p><canvas id="whiteboard" width="1000" height="450" aria-label="Solution drawing board"></canvas><button type="button" id="clear-board" class="secondary">Clear drawing</button></div>
      <p id="submit-status" role="status"></p><button type="submit" ${latest?.status === 'pending' ? 'disabled' : ''}>Save answer & get feedback</button>
    </form></section>` : !owner ? '<p class="notice">This question is closed. Your answers and feedback remain available below.</p>' : ''}
  <section><h2>${owner ? `Student responses (${latestByStudent.size} respondents)` : 'Your answer history'}</h2>${submissions.length ? submissions.map(s => attempt(s, owner)).join('') : empty(owner ? 'No responses yet. Share the class code with students.' : 'You haven’t answered this question yet.')}</section>`;
  wireMarkdown(root);
  let board;
  if (!owner && quiz.status === 'open') {
    board = whiteboard(root.querySelector('#whiteboard'), root.querySelector('#clear-board'));
    on(root, '#answer-mode', 'change', (_event, select) => {
      root.querySelector('#photo-input').hidden = select.value !== 'photo';
      root.querySelector('#drawing-input').hidden = select.value !== 'whiteboard';
    });
  }
  on(root, '#answer-form', 'submit', async (_event, form) => {
    const input = formValues(form);
    const file = input.answer_mode === 'whiteboard' ? await board.toBlob() : input.answer_mode === 'photo' ? input.image : null;
    if (!input.answer.trim() && !file?.size) throw new Error('Write an answer, select a photo, or draw your solution first.');
    const progress = root.querySelector('#submit-status');
    progress.textContent = 'Saving your answer and assessing it. This may take a minute…';
    try {
      const image_id = await upload(quiz.class_id, 'answer', file);
      await api(`/quizzes/${quizId}/submissions`, { method: 'POST', body: { answer: input.answer, image_id } });
      toast('Answer saved.'); await refresh();
    } catch (error) {
      progress.textContent = error.status === 422
        ? 'Your answer was not submitted. Edit it and try again.'
        : 'Check your answer history before resubmitting if the connection was interrupted.';
      throw error;
    }
  });
  on(root, '[data-state]', 'click', async (_event, button) => {
    await api(`/quizzes/${quizId}`, { method: 'PATCH', body: { status: button.dataset.state } }); await refresh();
  });
  on(root, '#notify', 'click', async () => { await api(`/quizzes/${quizId}/notify`, { method: 'POST' }); toast('Students notified.'); });
  on(root, '[data-retry]', 'click', async (_event, button) => {
    button.textContent = 'Assessing…';
    try { await api(`/submissions/${button.dataset.retry}/retry`, { method: 'POST' }); await refresh(); }
    finally { button.textContent = 'Retry AI assessment'; }
  });
  on(root, '[data-review]', 'submit', async (_event, form) => {
    await api(`/submissions/${form.dataset.review}/review`, { method: 'PATCH', body: formValues(form) });
    toast('Professor review saved.'); await refresh();
  });
}
