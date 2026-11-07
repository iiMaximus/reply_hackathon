import { api } from './api.mjs';
import { esc, on, toast } from './ui.mjs';
import { authView } from './views/auth.mjs';
import { homeView } from './views/home.mjs';
import { classroomView } from './views/classroom.mjs';
import { quizView } from './views/quiz.mjs';
import { notificationsView, progressView } from './views/activity.mjs';

let user;
let config;
let polling;
let newestNotification;

function header() {
  const element = document.querySelector('#header');
  element.innerHTML = `<div class="header-inner"><a class="brand" href="#/">Classroom<span>Solution Room</span></a>${user ? `<nav aria-label="Main navigation"><a href="#/">Classes</a>${user.role === 'student' ? '<a href="#/progress">My progress</a>' : ''}<a href="#/notifications">Notifications <span id="unread-count" class="badge">0</span></a></nav><div class="account"><span>${esc(user.name)} · ${esc(user.role)}</span><button id="logout" class="secondary">Sign out</button></div>` : ''}</div>`;
  on(element, '#logout', 'click', async () => {
    await api('/auth/logout', { method: 'POST' });
    user = null; clearInterval(polling); newestNotification = undefined;
    header(); await render();
  });
}

async function pollNotifications() {
  if (!user) return;
  try {
    const { unread, notifications } = await api('/notifications');
    const badge = document.querySelector('#unread-count');
    if (badge) badge.textContent = unread;
    const newest = notifications[0]?.id ?? 0;
    if (newestNotification !== undefined && newest > newestNotification &&
        localStorage.getItem('classroom.browser-alerts') === 'enabled' &&
        'Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Classroom', { body: notifications[0].message });
      notification.onclick = () => {
        window.focus(); location.hash = '#/notifications'; notification.close();
      };
    }
    newestNotification = newest;
  } catch (error) {
    if (error.status === 401 && user) { user = null; clearInterval(polling); header(); await render(); }
  }
}

async function signedIn(account) {
  user = account;
  config = await api('/config');
  newestNotification = undefined;
  header(); clearInterval(polling);
  await pollNotifications(); polling = setInterval(pollNotifications, 15000);
  if (location.hash !== '#/') location.hash = '#/';
  else await render();
}

async function render() {
  const root = document.createElement('div');
  document.querySelector('#view').replaceChildren(root);
  if (!user) { authView(root, signedIn); return; }
  const path = location.hash.replace(/^#\/?/, '').split('/');
  root.innerHTML = '<p>Loading…</p>';
  try {
    if (path[0] === 'classes' && /^\d+$/.test(path[1])) await classroomView(root, user, path[1], path[2] || 'questions', render);
    else if (path[0] === 'quizzes' && /^\d+$/.test(path[1])) await quizView(root, user, path[1], render);
    else if (path[0] === 'notifications') await notificationsView(root, render);
    else if (path[0] === 'progress' && user.role === 'student') await progressView(root);
    else await homeView(root, user, render);
    if (!config.ai_configured) {
      const notice = document.createElement('p'); notice.className = 'notice';
      notice.textContent = 'AI feedback is currently unavailable. Answers are saved and can be reviewed by the professor.';
      root.prepend(notice);
    }
    await pollNotifications();
  } catch (error) {
    if (error.status === 401) { user = null; clearInterval(polling); header(); authView(root, signedIn); }
    else root.innerHTML = `<p class="notice">${esc(error.message)}</p><a href="#/">Back to your classes</a>`;
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('unhandledrejection', event => { toast(event.reason?.message || 'Something went wrong.', true); });
try {
  const account = (await api('/auth/me')).user;
  user = account; config = await api('/config'); header();
  await pollNotifications(); polling = setInterval(pollNotifications, 15000);
  await render();
} catch (error) {
  if (error.status !== 401) toast('Unable to reach the server. Check the connection and refresh.', true);
  header(); await render();
}
