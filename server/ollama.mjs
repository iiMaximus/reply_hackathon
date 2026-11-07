import { z } from 'zod';
import { createClassroomAI } from './ai.mjs';

/** Local test provider. The public server continues to use createAI/OpenAI. */
export function createOllamaAI({ model, baseURL = 'http://127.0.0.1:11434', fetch: fetchImplementation = globalThis.fetch, onResponse } = {}) {
  if (!model) throw new Error('Specify the downloaded Ollama model to test.');
  async function respond(schema, _name, instructions, content) {
    // The selected sub-1B model has no vision encoder. Never silently omit images.
    if (content.some(part => part.type === 'input_image')) {
      throw new Error('This local text-only test provider cannot assess images. Use professor review or a vision provider.');
    }
    // Small models otherwise repeat until the production schema's generous limits.
    // Tighter local generation bounds remain a subset of the same validated schema.
    const format = z.toJSONSchema(schema);
    function boundOutput(node) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'string') node.maxLength = Math.min(node.maxLength ?? 400, 400);
      if (node.type === 'array') node.maxItems = Math.min(node.maxItems ?? 3, 3);
      for (const child of Object.values(node)) {
        if (Array.isArray(child)) child.forEach(boundOutput);
        else if (child && typeof child === 'object') boundOutput(child);
      }
    }
    boundOutput(format);
    const response = await fetchImplementation(`${baseURL.replace(/\/$/, '')}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(120000),
      body: JSON.stringify({
        model, stream: false, format,
        messages: [
          { role: 'system', content: `${instructions}\nBe concise. Do not repeat yourself. Use at most three items per array and short sentences. Return JSON matching this schema: ${JSON.stringify(format)}` },
          { role: 'user', content: content.map(part => part.text).join('\n') },
        ],
        options: { temperature: 0, seed: 42, repeat_penalty: 1.15, num_ctx: 8192, num_predict: 3072 },
      }),
    });
    if (!response.ok) throw new Error(`Local model request failed (${response.status}).`);
    const result = await response.json();
    // Optional diagnostics are used only by the synthetic, opt-in local test suite.
    onResponse?.({ task: _name, ...result });
    if (result.error) throw new Error('Local model returned an error.');
    if (result.done_reason === 'length') throw new Error('Local model output exceeded the token limit.');
    return schema.parse(JSON.parse(result.message?.content ?? ''));
  }
  return { ...createClassroomAI({ configured: true, model, respond }), requiresProfessorReview: true };
}
