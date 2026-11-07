import { api } from '../api.mjs';
import { date, empty, esc, on, score, toast } from '../ui.mjs';

export async function notificationsView(root, refresh) {
  const { notifications, unread, next_cursor } = await api('/notifications');
  let cursor = next_cursor;
  const notificationLink = n => `<a class="list-link ${n.read_at ? '' : 'unread'}" href="${n.quiz_id ? `#/quizzes/${n.quiz_id}` : `#/classes/${n.class_id}/questions`}"><strong>${esc(n.message)}</strong><span>${date(n.created_at)}${n.read_at ? '' : ' · unread'}</span></a>`;
  root.innerHTML = `<div class="page-heading"><h1>Notifications <span class="badge">${unread} unread</span></h1><button id="mark-read" class="secondary">Mark all as read</button></div>
    <p class="muted">New tasks and feedback arrive here. This page updates when you open it.</p>
    <button id="browser-notifications" class="secondary">Enable browser alerts while this app is open</button>
    <section class="card" id="notification-list">${notifications.length ? notifications.map(notificationLink).join('') : empty('No notifications yet.')}</section>
    <button id="older-notifications" class="secondary" ${cursor ? '' : 'hidden'}>Load older notifications</button>`;
  on(root, '#mark-read', 'click', async () => {
    await api('/notifications/read', { method: 'POST', body: { all: true } }); await refresh();
  });
  on(root, '#older-notifications', 'click', async (_event, button) => {
    const page = await api(`/notifications?before=${cursor}`);
    root.querySelector('#notification-list').insertAdjacentHTML('beforeend', page.notifications.map(notificationLink).join(''));
    cursor = page.next_cursor;
    button.hidden = !cursor;
  });
  on(root, '#browser-notifications', 'click', async () => {
    if (!('Notification' in window)) throw new Error('Browser notifications are not supported here. In-app notifications still work.');
    const result = await Notification.requestPermission();
    if (result !== 'granted') throw new Error('Browser alerts are disabled. You can change this in your browser’s site settings.');
    localStorage.setItem('classroom.browser-alerts', 'enabled'); toast('Browser alerts enabled while the app is open.');
  });
}

export async function progressView(root) {
  const progress = await api('/progress');
  const concepts = (title, list) => `<section class="card"><h2>${title}</h2>${list.length ? `<ul>${list.map(c => `<li>${esc(c.concept)} <span class="muted">(${c.count} response${c.count === 1 ? '' : 's'})</span></li>`).join('')}</ul>` : empty('No assessed evidence yet.')}</section>`;
  root.innerHTML = `<h1>Your learning progress</h1><section class="card"><div class="metrics"><div><strong>${progress.answered}</strong><span>questions answered</span></div><div><strong>${progress.assessed}</strong><span>answers assessed</span></div><div><strong>${score(progress.average_score)}</strong><span>mean suggested score</span></div></div><p class="muted">Based on your latest answers in active classes. AI feedback describes your submitted work and can be corrected by your professor.</p></section><div class="columns">${concepts('Strengths in your answers', progress.strengths)}${concepts('Concepts to revisit', progress.weaknesses)}</div>`;
}
