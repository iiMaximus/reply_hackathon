import { api } from '../api.mjs';
import { on, formValues } from '../ui.mjs';

export function authView(root, onSignIn) {
  let register = false;
  function render() {
    root.innerHTML = `<section class="auth card"><p class="eyebrow">Solution Room</p><h1>${register ? 'Create your account' : 'Welcome to Classroom'}</h1>
      <p>Ask questions. Show your reasoning. Find the next step.</p>
      <form id="auth-form">
        ${register ? '<label>Name<input name="name" required maxlength="200" autocomplete="name"></label>' : ''}
        <label>Email<input type="email" name="email" required autocomplete="email" maxlength="254"></label>
        <label>Password<input type="password" name="password" required minlength="${register ? 10 : 1}" maxlength="72" autocomplete="${register ? 'new-password' : 'current-password'}"></label>
        ${register ? '<label>Account type<select name="role"><option value="student">Student</option><option value="professor">Professor</option></select></label><small>Use at least 10 characters for your password.</small>' : ''}
        <p id="auth-error" class="error-text" role="alert"></p>
        <button type="submit">${register ? 'Create account' : 'Sign in'}</button>
      </form><button id="toggle-auth" class="secondary">${register ? 'Already registered? Sign in' : 'New here? Create an account'}</button>
    </section>`;
    on(root, '#toggle-auth', 'click', () => { register = !register; render(); });
    on(root, '#auth-form', 'submit', async (_event, form) => {
      root.querySelector('#auth-error').textContent = '';
      try {
        const { user } = await api(`/auth/${register ? 'register' : 'login'}`, { method: 'POST', body: formValues(form) });
        await onSignIn(user);
      } catch (error) { root.querySelector('#auth-error').textContent = error.message; }
    });
  }
  render();
}
