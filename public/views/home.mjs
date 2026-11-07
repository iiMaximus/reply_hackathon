import { api } from '../api.mjs';
import { esc, on, formValues, modes, empty, toast } from '../ui.mjs';

export async function homeView(root, user, refresh) {
  const { classes } = await api('/classes');
  const professor = user.role === 'professor';
  const todo = professor ? [] : (await Promise.all(classes.filter(c => c.membership === 'active').map(async c => {
    const { quizzes } = await api(`/classes/${c.id}/quizzes`);
    return quizzes.filter(q => q.status === 'open' && !q.submission).map(q => ({ ...q, class_name: c.name }));
  }))).flat();
  root.innerHTML = `<div class="page-heading"><div><p class="eyebrow">${esc(user.role)} workspace</p><h1>Hello, ${esc(user.name)}</h1></div></div>
    ${!professor ? `<section class="card"><h2>To do <span class="badge">${todo.length}</span></h2>${todo.length ? todo.map(q => `<a class="list-link" href="#/quizzes/${q.id}"><strong>${esc(q.title)}</strong><span>${esc(q.class_name)} · ${q.weight} point${q.weight === 1 ? '' : 's'}</span></a>`).join('') : empty('You’re caught up. New questions will appear here.')}</section>` : ''}
    <div class="columns"><section><h2>Your classes</h2>${classes.length ? classes.map(c => `<article class="card"><h3>${c.membership !== 'pending' ? `<a href="#/classes/${c.id}/questions">${esc(c.name)}</a>` : esc(c.name)}</h3><p>${esc(c.description)}</p>${c.membership === 'pending' ? '<p class="notice">Waiting for professor approval.</p>' : `<a href="#/classes/${c.id}/questions">Open class →</a>`}</article>`).join('') : empty('No classes yet.')}</section>
    <section class="card"><h2>${professor ? 'Create a class' : 'Join a class'}</h2>
      <form id="class-form">${professor ? `<label>Class name<input name="name" required maxlength="200" placeholder="e.g. Analisi Matematica I"></label><label>Description<textarea name="description" rows="3" maxlength="50000"></textarea></label><label>Who can join?<select name="join_mode">${modes('approval')}</select></label>` : '<label>Class code<input name="code" required maxlength="30" autocomplete="off" placeholder="Ask your professor"></label>'}
      <button type="submit">${professor ? 'Create class' : 'Join class'}</button></form>
    </section></div>`;
  on(root, '#class-form', 'submit', async (_event, form) => {
    const result = await api(professor ? '/classes' : '/classes/join', { method: 'POST', body: formValues(form) });
    if (result.membership === 'pending') { toast('Join request sent to the professor.'); await refresh(); }
    else location.hash = `#/classes/${result.id}/questions`;
  });
}
