import { Marked } from '/vendor/marked.js';
import DOMPurify from '/vendor/purify.js';
import { createMarkdownRenderer } from './markdown.mjs';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const markdown = createMarkdownRenderer({
  Marked, markedKatex: globalThis.markedKatex, sanitize: (html, options) => DOMPurify.sanitize(html, options),
});
export const date = value => value ? new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`).toLocaleString() : '';
export const score = value => value == null ? '—' : `${Math.round(value)}%`;
export const image = (id, alt = 'Attached image') => id ? `<a href="/api/files/${id}" target="_blank" rel="noopener"><img class="attachment" src="/api/files/${id}" alt="${esc(alt)}"></a>` : '';
export const empty = message => `<p class="empty">${esc(message)}</p>`;
export const statusLabel = status => ({ awaiting_ai: 'Saved · awaiting AI', pending: 'Assessing…', review: 'Professor review needed', failed: 'Saved · assessment failed', graded: 'Assessed' }[status] || status);
export const badge = status => `<span class="badge">${esc(statusLabel(status))}</span>`;
export const modes = selected => ['approval','whitelist','open'].map(mode => `<option value="${mode}" ${mode === selected ? 'selected' : ''}>${{ approval: 'Professor approval', whitelist: 'Email whitelist only', open: 'Anyone with the class code' }[mode]}</option>`).join('');

let toastTimer;
export function toast(message, error = false) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.className = error ? 'error' : '';
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element.hidden = true; }, error ? 10000 : 5000);
}
export function on(root, selector, event, handler) {
  for (const element of root.querySelectorAll(selector)) element.addEventListener(event, async e => {
    if (event === 'submit' || element.tagName === 'BUTTON') e.preventDefault();
    const button = event === 'submit' ? element.querySelector('button[type="submit"]') : element.tagName === 'BUTTON' ? element : null;
    if (button?.disabled) return;
    if (button) button.disabled = true;
    try { await handler(e, element); }
    catch (error) { toast(error.message, true); }
    finally { if (button) button.disabled = false; }
  });
}
export const formValues = form => Object.fromEntries(new FormData(form));
export function wireMarkdown(root) {
  for (const textarea of root.querySelectorAll('textarea[data-markdown]')) {
    const details = document.createElement('details');
    details.className = 'preview';
    details.innerHTML = '<summary>Preview Markdown</summary><div class="markdown"></div>';
    // Keep interactive preview controls outside the input's label.
    (textarea.closest('label') || textarea).after(details);
    const refresh = () => { if (details.open) details.querySelector('div').innerHTML = markdown(textarea.value); };
    details.addEventListener('toggle', refresh);
    textarea.addEventListener('input', refresh);
  }
  on(root, '[data-text-file]', 'change', async (_event, input) => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 50000) throw new Error('Text files must be 50 KB or smaller.');
    const textarea = root.querySelector(`[name="${input.dataset.textFile}"]`);
    textarea.value = await file.text();
    textarea.dispatchEvent(new Event('input'));
  });
}

export function feedback(submission) {
  const a = submission.assessment;
  return `<div class="feedback">
    <div class="row">${badge(submission.status)} <strong>${submission.status === 'graded' ? score(submission.score) : 'Score pending review'}</strong></div>
    ${submission.status === 'awaiting_ai' ? '<p>Your answer is saved. AI feedback will be available after the server is configured, or your professor can review it.</p>' : ''}
    ${submission.status === 'failed' ? '<p>Your answer is saved. Assessment failed; you or your professor can retry.</p>' : ''}
    ${a ? `<div class="markdown">${markdown(a.feedback)}</div>
      ${a.strengths.length ? `<p><strong>Strengths</strong></p><ul>${a.strengths.map(v => `<li>${esc(v)}</li>`).join('')}</ul>` : ''}
      ${a.weaknesses.length ? `<p><strong>Work on</strong></p><ul>${a.weaknesses.map(v => `<li>${esc(v)}</li>`).join('')}</ul>` : ''}
      ${a.evidence.length ? `<details><summary>Evidence in your answer</summary>${a.evidence.map(e => `<blockquote>${esc(e.quote)}</blockquote><p>${esc(e.explanation)}</p>`).join('')}</details>` : ''}
      ${a.source_references.length ? `<p class="muted">Sources: ${a.source_references.map(esc).join('; ')}</p>` : ''}
      ${a.needs_review && !submission.reviewed_by ? `<p class="notice">${esc(a.review_reason)}</p>` : ''}` : ''}
    ${submission.reviewed_by ? `<div class="notice"><strong>Professor review · ${score(submission.score)}</strong><p>${esc(submission.review_note)}</p><small>The original AI feedback above is retained for context.</small></div>` : ''}
  </div>`;
}

/** Fixed drawing coordinates, responsive display. Pointer capture supports mouse, pen and touch. */
export function whiteboard(canvas, clearButton) {
  const context = canvas.getContext('2d');
  let dirty = false;
  let drawing = false;
  function clear() {
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#18232f'; context.lineWidth = 4; context.lineCap = 'round'; dirty = false;
  }
  function point(event) {
    const box = canvas.getBoundingClientRect();
    return [(event.clientX - box.left) * canvas.width / box.width, (event.clientY - box.top) * canvas.height / box.height];
  }
  canvas.addEventListener('pointerdown', event => {
    event.preventDefault(); drawing = true; dirty = true; canvas.setPointerCapture(event.pointerId);
    const [x, y] = point(event); context.beginPath(); context.moveTo(x, y); context.lineTo(x + 0.1, y + 0.1); context.stroke();
  });
  canvas.addEventListener('pointermove', event => {
    if (!drawing) return;
    context.lineTo(...point(event)); context.stroke();
  });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event, () => { drawing = false; });
  clearButton.addEventListener('click', clear);
  clear();
  return { toBlob: () => dirty ? new Promise(resolve => canvas.toBlob(resolve, 'image/png')) : null };
}
