import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { openDatabase } from '../server/database.mjs';
import { createApp } from '../server/app.mjs';
import { createAI } from '../server/ai.mjs';

const assessment = {
  score: 80, feedback: 'Check your explanation of the scaling.', strengths: ['Cubic scaling'],
  weaknesses: ['Explain cancellation'], misconceptions: [],
  evidence: [{ quote: 'Cubic scaling', explanation: 'Identifies the dependence.' }],
  source_references: ['Resource 1'], needs_review: false, review_reason: '',
};
const fakeAI = {
  configured: true, model: 'test-provider',
  assess: async () => structuredClone(assessment),
  summarize: async ({ submissions }) => ({ summary: 'Respondents used scaling.',
    misconceptions: [{ concept: 'Unclear cancellation', submission_ids: [submissions[0].id, 999999] }],
    suggested_intervention: 'Revisit the exponents.', follow_up_question: 'Double only the length. What changes?',
    recommended_resource_ids: [999999],
  }),
};
function setup(t, ai = fakeAI) {
  const db = openDatabase(':memory:');
  const app = createApp({ db, ai, sessionSecret: 'integration-test-session-secret-at-least-32-chars' });
  t.after(() => db.close());
  return { db, app, teacher: request.agent(app), learner: request.agent(app), stranger: request.agent(app) };
}
const mutate = (agent, method, url, body) => agent[method](`/api${url}`).set('X-Requested-With', 'classroom').send(body);
async function register(agent, role, address) {
  const response = await mutate(agent, 'post', '/auth/register', { name: role, email: address,
    password: 'classroom-test-password', role });
  assert.equal(response.status, 201, response.text);
  return response.body.user;
}
async function classroom(teacher, join_mode = 'open') {
  const response = await mutate(teacher, 'post', '/classes', { name: 'Mechanics', join_mode });
  assert.equal(response.status, 201, response.text);
  return (await teacher.get(`/api/classes/${response.body.id}`)).body.classroom;
}
async function joinClass(learner, c) {
  return mutate(learner, 'post', '/classes/join', { code: c.code });
}
async function question(teacher, c, extra = {}) {
  const response = await mutate(teacher, 'post', `/classes/${c.id}/quizzes`, {
    title: 'Beam scaling', question: 'What changes when length and height double?', weight: 5,
    reference_answer: 'PRIVATE_REFERENCE_CUBIC_CANCELLATION', rubric: 'Explain cubic dependence.', notify_students: true, ...extra,
  });
  assert.equal(response.status, 201, response.text);
  return response.body.id;
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=', 'base64');
async function uploadImage(agent, c, purpose = 'answer') {
  const response = await agent.post(`/api/classes/${c.id}/files`).set('X-Requested-With', 'classroom')
    .field('purpose', purpose).attach('file', png, { filename: 'solution.png', contentType: 'image/png' });
  assert.equal(response.status, 201, response.text);
  return response.body.id;
}

test('complete classroom loop, notifications, history, weighted scores and professor follow-up', async t => {
  const { teacher, learner } = setup(t);
  await register(teacher, 'professor', 'teacher@example.test');
  await register(learner, 'student', 'student@example.test');
  const c = await classroom(teacher);
  assert.equal((await joinClass(learner, c)).body.membership, 'active');
  assert.equal((await mutate(teacher, 'post', `/classes/${c.id}/resources`, { title: 'Beam notes', content: 'Deflection is proportional to L^3 / h^3.' })).status, 201);
  const quiz = await question(teacher, c);
  const notification = (await learner.get('/api/notifications')).body;
  assert.equal(notification.unread, 1);
  assert.equal(notification.notifications[0].quiz_id, quiz);
  const quizData = await learner.get(`/api/quizzes/${quiz}`);
  assert.ok(!quizData.text.includes('PRIVATE_REFERENCE'));
  assert.ok(!('rubric' in quizData.body.quiz));
  const first = await mutate(learner, 'post', `/quizzes/${quiz}/submissions`, { answer: 'Cubic scaling cancels.' });
  assert.equal(first.status, 201, first.text);
  assert.equal(first.body.submission.status, 'graded');
  assert.equal(first.body.submission.score, 80);
  assert.equal((await learner.get(`/api/classes/${c.id}/leaderboard`)).body.leaderboard[0].points, 4);
  const second = await mutate(learner, 'post', `/quizzes/${quiz}/submissions`, { answer: 'Cubic scaling still cancels.' });
  assert.equal(second.status, 201);
  assert.equal((await learner.get(`/api/classes/${c.id}/leaderboard`)).body.leaderboard[0].points, 4, 'revisions must not accumulate points');
  assert.equal((await learner.get(`/api/quizzes/${quiz}`)).body.submissions.length, 2);
  const stats = (await teacher.get(`/api/classes/${c.id}/stats`)).body;
  assert.equal(stats.enrolled, 1); assert.equal(stats.respondents, 1); assert.equal(stats.scored_count, 1);
  const summary = await mutate(teacher, 'post', `/classes/${c.id}/summary`);
  assert.equal(summary.status, 200, summary.text);
  assert.deepEqual(summary.body.summary.misconceptions[0].submission_ids, [second.body.submission.id]);
  assert.deepEqual(summary.body.summary.recommended_resource_ids, []);
  const followup = await question(teacher, c, { title: 'Follow-up', question: summary.body.summary.follow_up_question });
  assert.ok(followup > quiz);
  assert.equal((await mutate(teacher, 'patch', `/quizzes/${quiz}`, { status: 'archived' })).status, 200);
  assert.equal((await mutate(learner, 'post', `/quizzes/${quiz}/submissions`, { answer: 'Again' })).status, 409);
  assert.equal((await learner.get(`/api/quizzes/${quiz}`)).body.submissions.length, 2, 'archive preserves history');
  const progress = (await learner.get('/api/progress')).body;
  assert.equal(progress.assessed, 1); assert.equal(progress.strengths[0].concept, 'Cubic scaling');
});

test('approval, whitelist, blocking and cross-class access are enforced server-side', async t => {
  const { teacher, learner, stranger } = setup(t);
  await register(teacher, 'professor', 'prof@example.test');
  const student = await register(learner, 'student', 'student@example.test');
  await register(stranger, 'professor', 'other@example.test');
  const c = await classroom(teacher, 'approval');
  assert.equal((await joinClass(learner, c)).body.membership, 'pending');
  assert.equal((await learner.get(`/api/classes/${c.id}/quizzes`)).status, 403);
  assert.equal((await mutate(learner, 'post', '/classes', { name: 'Hijack' })).status, 403);
  assert.equal((await mutate(teacher, 'patch', `/classes/${c.id}/members/${student.id}`, { status: 'active' })).status, 200);
  const quiz = await question(teacher, c);
  assert.equal((await stranger.get(`/api/quizzes/${quiz}`)).status, 403);
  assert.equal((await learner.get(`/api/classes/${c.id}/stats`)).status, 403);
  assert.equal((await learner.get(`/api/classes/${c.id}/members`)).status, 403);
  await mutate(teacher, 'patch', `/classes/${c.id}/members/${student.id}`, { status: 'blocked' });
  assert.equal((await joinClass(learner, c)).status, 403);
  assert.equal((await learner.get(`/api/quizzes/${quiz}`)).status, 403);
  assert.equal((await learner.get('/api/notifications')).body.notifications.length, 0);
  const restricted = await classroom(teacher, 'whitelist');
  assert.equal((await joinClass(learner, restricted)).status, 403);
  await mutate(teacher, 'put', `/classes/${restricted.id}/whitelist`, { emails: ['STUDENT@example.test'] });
  assert.equal((await joinClass(learner, restricted)).body.membership, 'active');
});

test('photo answers stay private; student resources require approval; fake images are rejected', async t => {
  const { teacher, learner, stranger } = setup(t);
  await register(teacher, 'professor', 'prof@example.test');
  await register(learner, 'student', 'student@example.test');
  await register(stranger, 'student', 'stranger@example.test');
  const c = await classroom(teacher); await joinClass(learner, c); await joinClass(stranger, c);
  const quiz = await question(teacher, c);
  const fileId = await uploadImage(learner, c);
  assert.equal((await mutate(learner, 'post', `/quizzes/${quiz}/submissions`, { image_id: fileId })).status, 201);
  assert.equal((await teacher.get(`/api/files/${fileId}`)).status, 200);
  assert.equal((await stranger.get(`/api/files/${fileId}`)).status, 403);
  assert.equal((await stranger.get(`/api/quizzes/${quiz}`)).body.submissions.length, 0);
  const resourceFile = await uploadImage(learner, c, 'resource');
  const result = await mutate(learner, 'post', `/classes/${c.id}/resources`, { title: 'Useful reading', image_id: resourceFile });
  assert.equal(result.status, 201, result.text);
  assert.equal((await stranger.get(`/api/classes/${c.id}/resources`)).body.resources.length, 0);
  assert.equal((await stranger.get(`/api/files/${resourceFile}`)).status, 403);
  assert.equal((await teacher.get(`/api/classes/${c.id}/resources`)).body.resources[0].status, 'pending');
  await mutate(teacher, 'patch', `/resources/${result.body.id}`, { status: 'approved' });
  assert.equal((await stranger.get(`/api/files/${resourceFile}`)).status, 200);
  const badImage = await learner.post(`/api/classes/${c.id}/files`).set('X-Requested-With', 'classroom')
    .field('purpose', 'answer').attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'fake.png', contentType: 'image/png' });
  assert.equal(badImage.status, 400);
});

test('missing AI key and provider failures preserve work; professor can assess; no fake scores', async t => {
  const ai = createAI({ apiKey: '' });
  const { teacher, learner } = setup(t, ai);
  await register(teacher, 'professor', 'prof@example.test'); await register(learner, 'student', 'student@example.test');
  const c = await classroom(teacher); await joinClass(learner, c); const quiz = await question(teacher, c);
  const saved = (await mutate(learner, 'post', `/quizzes/${quiz}/submissions`, { answer: 'Saved without a provider.' })).body.submission;
  assert.equal(saved.status, 'awaiting_ai'); assert.equal(saved.score, null);
  const review = await mutate(teacher, 'patch', `/submissions/${saved.id}/review`, { score: 70, note: 'Explain why the exponents cancel.' });
  assert.equal(review.status, 200, review.text);
  assert.equal((await learner.get(`/api/quizzes/${quiz}`)).body.submissions[0].score, 70);
  ai.configured = true; ai.assess = async () => { throw new Error('Provider unavailable'); };
  const failure = (await mutate(learner, 'post', `/quizzes/${quiz}/submissions`, { answer: 'Do not lose this answer.' })).body.submission;
  assert.equal(failure.status, 'failed'); assert.equal(failure.answer, 'Do not lose this answer.'); assert.equal(failure.score, null);
  ai.assess = fakeAI.assess;
  await mutate(learner, 'post', `/submissions/${failure.id}/retry`);
  const retried = (await learner.get(`/api/quizzes/${quiz}`)).body.submissions[0];
  assert.equal(retried.status, 'review', 'unmatched evidence must trigger review'); assert.equal(retried.score, null);
});

test('authentication, session persistence and request validation', async t => {
  const folder = mkdtempSync(join(tmpdir(), 'classroom-test-'));
  const filename = join(folder, 'classroom.sqlite');
  const secret = 'persistent-test-session-secret-that-survives-restart';
  let db = openDatabase(filename);
  t.after(() => { db.close(); rmSync(folder, { recursive: true, force: true }); });
  let app = createApp({ db, ai: fakeAI, sessionSecret: secret });
  assert.equal((await request(app).get('/api/classes')).status, 401);
  assert.equal((await request(app).post('/api/auth/register').send({})).status, 403, 'CSRF header required');
  assert.equal((await request(app).post('/api/auth/register').set('X-Requested-With', 'classroom').set('Origin', 'https://evil.example').send({})).status, 403);
  const agent = request.agent(app);
  const user = await register(agent, 'professor', 'persist@example.test');
  const login = await mutate(agent, 'post', '/auth/login', { email: user.email, password: 'classroom-test-password' });
  const cookie = login.headers['set-cookie'][0].split(';')[0];
  const c = await classroom(agent);
  assert.equal((await mutate(agent, 'post', `/classes/${c.id}/quizzes`, { title: 'Empty', weight: -1 })).status, 400);
  db.close(); db = openDatabase(filename);
  app = createApp({ db, ai: fakeAI, sessionSecret: secret });
  assert.equal((await request(app).get('/api/auth/me').set('Cookie', cookie)).body.user.email, user.email);
  assert.equal((await request(app).get(`/api/classes/${c.id}`).set('Cookie', cookie)).body.classroom.name, 'Mechanics');
  assert.equal((await request(app).get('/')).status, 200);
  assert.equal((await request(app).get('/vendor/marked.js')).status, 200);
});

test('simultaneous submissions and professor review cannot race a running assessment', async t => {
  let started;
  let finish;
  const assessmentStarted = new Promise(resolve => { started = resolve; });
  const assessmentCanFinish = new Promise(resolve => { finish = resolve; });
  const ai = { ...fakeAI, assess: async () => {
    started(); await assessmentCanFinish; return structuredClone(assessment);
  } };
  const { teacher, learner, db } = setup(t, ai);
  await register(teacher, 'professor', 'prof@example.test'); await register(learner, 'student', 'student@example.test');
  const c = await classroom(teacher); await joinClass(learner, c); const quiz = await question(teacher, c);
  const pending = mutate(learner, 'post', `/quizzes/${quiz}/submissions`, { answer: 'Cubic scaling cancels.' }).then(response => response);
  await assessmentStarted;
  try {
    assert.equal((await mutate(learner, 'post', `/quizzes/${quiz}/submissions`, { answer: 'Duplicate' })).status, 409);
    const { id } = db.prepare('SELECT id FROM submissions').get();
    assert.equal((await mutate(teacher, 'patch', `/submissions/${id}/review`, { score: 100, note: 'Concurrent override' })).status, 409);
  } finally { finish(); }
  assert.equal((await pending).body.submission.status, 'graded');
});

test('OpenAI SDK serializes real Responses image/structured-output requests and parses feedback', async () => {
  let outbound;
  const ai = createAI({ apiKey: 'test-only-key', model: 'test-model', fetch: async (url, options) => {
    assert.equal(String(url), 'https://api.openai.com/v1/responses');
    outbound = JSON.parse(options.body);
    return new Response(JSON.stringify({ id: 'resp_test', object: 'response', status: 'completed',
      output: [{ id: 'msg_test', type: 'message', role: 'assistant', status: 'completed',
        content: [{ type: 'output_text', annotations: [], text: JSON.stringify(assessment) }] }],
    }), { headers: { 'Content-Type': 'application/json' } });
  } });
  const result = await ai.assess({ quiz: { title: 'Test', question: 'Explain', reference_answer: 'Private answer', rubric: 'Reasoning' },
    submission: { answer: 'Cubic scaling' }, resources: [], questionImage: null,
    answerImage: { mime: 'image/png', data: png }, resourceImages: [],
  });
  assert.equal(result.score, 80);
  assert.equal(outbound.store, false);
  assert.equal(outbound.text.format.type, 'json_schema');
  assert.equal(outbound.text.format.strict, true);
  assert.equal(outbound.model, 'test-model');
  assert.ok(outbound.input[0].content.some(part => part.type === 'input_image' && part.image_url.startsWith('data:image/png;base64,')));
});

test('HTTPS reverse proxy supports same-origin sign-up and secure session cookies', async t => {
  const db = openDatabase(':memory:');
  t.after(() => db.close());
  const app = createApp({ db, ai: fakeAI, sessionSecret: 'reverse-proxy-test-secret-at-least-32-chars', trustProxy: true });
  const response = await request(app).post('/api/auth/register')
    .set('Host', 'qai.riccardogiorgi.tech').set('Origin', 'https://qai.riccardogiorgi.tech')
    .set('X-Forwarded-Proto', 'https').set('X-Requested-With', 'classroom')
    .send({ name: 'Proxy test', email: 'proxy@example.test', password: 'proxy-test-password', role: 'student' });
  assert.equal(response.status, 201, response.text);
  const cookie = response.headers['set-cookie'][0];
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /; HttpOnly/);
  assert.equal((await request(app).get('/api/auth/me')
    .set('Host', 'qai.riccardogiorgi.tech').set('X-Forwarded-Proto', 'https')
    .set('Cookie', cookie.split(';')[0])).body.user.email, 'proxy@example.test');
  const foreignOrigin = await request(app).post('/api/auth/login')
    .set('Host', 'qai.riccardogiorgi.tech').set('Origin', 'https://other.example')
    .set('X-Forwarded-Proto', 'https').set('X-Requested-With', 'classroom').send({});
  assert.equal(foreignOrigin.status, 403, 'Proxy support must preserve cross-origin rejection.');
});
