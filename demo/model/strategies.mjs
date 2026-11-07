import { readFile } from "node:fs/promises";
import { Tokenizer } from "@huggingface/tokenizers";
import * as ort from "onnxruntime-web";
import { directory } from "./prepare.mjs";

// Short reference explanations are compared to student language, not to private classmates' answers.
const anchors = {
  probe: [
    "I took the derivative using the power rule. Here is the slope formula I got.",
    "f'(x) = 2 + x squared. Is this derivative correct?",
    "I differentiated each term of the polynomial.",
  ],
  lost: [
    "I divided both sides by x and got just one solution.",
    "I canceled the variable from both sides and kept only one root.",
    "Cancel x so x equals one; there is a single stationary point.",
  ],
  kept: [
    "I set each factor equal to zero separately and got both solutions.",
    "Either factor can vanish so I checked both roots in the derivative.",
    "Zero and one both give a horizontal tangent.",
  ],
  started: [
    "I found the derivative but don't know what to set it equal to.",
    "I have the slope. What should it equal for a horizontal tangent?",
  ],
  unclear: [
    "I don't understand the question.",
    "My drawing is here but you cannot see what I mean.",
    "I have not written a mathematical step yet.",
  ],
};
async function loadEncoder() {
  ort.env.wasm.numThreads = 1;
  const [model, json, config] = await Promise.all([
    readFile(new URL("model.onnx", directory)),
    readFile(new URL("tokenizer.json", directory), "utf8"),
    readFile(new URL("tokenizer_config.json", directory), "utf8"),
  ]);
  const tokenizer = new Tokenizer(JSON.parse(json), JSON.parse(config));
  const session = await ort.InferenceSession.create(model, {
    executionProviders: ["wasm"],
    executionMode: "sequential",
  });
  async function encode(text) {
    const ids = tokenizer.encode(text).ids.slice(0, 96);
    ids[ids.length - 1] = 102; // BERT [SEP], including when truncation was needed.
    const tensor = (arr) =>
      new ort.Tensor("int64", BigInt64Array.from(arr, BigInt), [1, ids.length]);
    const inp = {
      input_ids: tensor(ids),
      attention_mask: tensor(ids.map(() => 1)),
      token_type_ids: tensor(ids.map(() => 0)),
    };
    let out;
    try {
      out = await session.run(
        Object.fromEntries(session.inputNames.map((k) => [k, inp[k]])),
      );
      const hidden = out.last_hidden_state;
      const width = hidden.dims.at(-1),
        vector = new Float32Array(width);
      for (let j = 0; j < hidden.data.length; j++)
        vector[j % width] += hidden.data[j];
      const norm = Math.hypot(...vector);
      return vector.map((n) => n / norm);
    } finally {
      Object.values(inp).forEach((t) => t.dispose());
      if (out) Object.values(out).forEach((t) => t.dispose());
    }
  }
  const refs = [];
  for (const [group, lines] of Object.entries(anchors))
    for (const line of lines) refs.push({ group, vector: await encode(line) });
  return async (text) => {
    const vector = await encode(text);
    const scores = new Map();
    for (const ref of refs) {
      const score = vector.reduce((sum, v, i) => sum + v * ref.vector[i], 0);
      scores.set(ref.group, Math.max(scores.get(ref.group) ?? -1, score));
    }
    const ranking = [...scores].sort((a, b) => b[1] - a[1]);
    const [group, score] = ranking[0];
    const accepted = score >= 0.47 && score - ranking[1][1] >= 0.055;
    return {
      model: "MiniLM-L6-v2",
      strategy: accepted ? group : "unclear",
      nearest: group,
    };
  };
}
let encoder;
export async function createStrategyMatcher() {
  encoder ??= loadEncoder();
  const infer = await encoder;
  // Serial inference bounds WASM memory for an audience submitting together.
  let queue = Promise.resolve();
  return (text) => {
    const result = queue.then(() => infer(text));
    queue = result.catch(() => {});
    return result;
  };
}
