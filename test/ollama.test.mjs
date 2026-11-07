import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOllamaAI } from '../server/ollama.mjs';

const input = { quiz: { title: 'Arithmetic', question: 'What is 2+2?', reference_answer: '4', rubric: 'Explain addition.' },
  submission: { answer: '2+2=4' }, resources: [], resourceImages: [] };
const assessment = { score: 100, feedback: 'Correct.', strengths: ['Addition'], weaknesses: [], misconceptions: [],
  evidence: [{ quote: '2+2=4', explanation: 'Adds correctly.' }], source_references: [], needs_review: false, review_reason: '' };

test('local provider uses the real schemas and prompts, requires professor review, and rejects images before inference', async () => {
  let calls = 0;
  const ai = createOllamaAI({ model: 'test-local-model', fetch: async (url, options) => {
    calls++;
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    const body = JSON.parse(options.body);
    assert.equal(body.stream, false); assert.equal(body.format.type, 'object');
    assert.ok(body.format.properties.score); assert.ok(body.messages[0].content.includes('formative feedback'));
    return Response.json({ message: { content: JSON.stringify(assessment) }, done_reason: 'stop' });
  } });
  assert.equal(ai.requiresProfessorReview, true);
  assert.equal((await ai.assess(input)).score, 100);
  await assert.rejects(ai.assess({ ...input, answerImage: { mime: 'image/png', data: Buffer.from('image') } }), /text-only/);
  assert.equal(calls, 1);
});

test('truncated or malformed local outputs fail instead of creating scores', async () => {
  for (const response of [{ done_reason: 'length', message: { content: JSON.stringify(assessment) } },
    { done_reason: 'stop', message: { content: 'not JSON' } },
    { done_reason: 'stop', message: { content: JSON.stringify({ ...assessment, score: 999 }) } }]) {
    const ai = createOllamaAI({ model: 'test-local-model', fetch: async () => Response.json(response) });
    await assert.rejects(ai.assess(input));
  }
});
