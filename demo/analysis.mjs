import { lesson } from "./lesson.mjs";

// A deliberately narrow rehearsal path for the prepared exercise. No image OCR is simulated.
export function classifyPracticeText(text) {
  const line = text.toLowerCase().replace(/\s+/g, "").replaceAll("−", "-");
  let group = "unclear";
  if (
    /(?:x=)?0(?:and|,|or|e)(?:x=)?1(?:\D|$)/.test(line) ||
    /(?:x=)?1(?:and|,|or|e)(?:x=)?0(?:\D|$)/.test(line)
  )
    group = "kept";
  else if (
    /divid|cancel|divis|semplif/.test(line) &&
    /x/.test(line) &&
    /(?:x=1|x-1=0)/.test(line)
  )
    group = "lost";
  else if (/x(?:²|\^2)-x|x\(x-1\)/.test(line)) group = "started";
  return {
    group,
    line: text.trim().slice(0, 300),
  };
}

export const preparedForecast = [
  {
    mistake: "Losing a stationary value",
    signal: "Divides x² − x = 0 by x and keeps only x = 1.",
    question: "When is dividing by x valid?",
  },
  {
    mistake: "Confusing the function with its derivative",
    signal: "Sets f(x) = 0 to look for a horizontal tangent.",
    question: "Which quantity measures the slope?",
  },
];

export async function forecast(live, fetchImpl = fetch) {
  const fallback = { items: preparedForecast, mode: "rehearsal" };
  if (!live || !process.env.OPENAI_API_KEY) return fallback;
  const item = {
    type: "object",
    additionalProperties: false,
    required: ["mistake", "signal", "question"],
    properties: Object.fromEntries(
      ["mistake", "signal", "question"].map((k) => [k, { type: "string" }]),
    ),
  };
  try {
    const response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: AbortSignal.timeout(14000),
      headers: {
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-6.1-terra",
        store: false,
        instructions:
          "Using only the supplied exercise and rubric, propose two plausible student mistakes before the lecture. For each, give a short title, a specific observable line of working (signal), and a question the tutor can ask. These are hypotheses. You have seen no submissions. Never claim incidence or frequency.",
        input: [lesson.formula, lesson.prompt, lesson.rubric].join("\n"),
        text: {
          format: {
            type: "json_schema",
            name: "anticipate",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["items"],
              properties: { items: { type: "array", items: item } },
            },
          },
        },
      }),
    });
    if (!response.ok) throw new Error("Provider unavailable");
    const raw = await response.json();
    const out = raw.output
      ?.flatMap((i) => i.content || [])
      .find((i) => i.type === "output_text");
    const { items } = JSON.parse(out?.text || "null");
    if (
      !Array.isArray(items) ||
      !items.length ||
      !items.every(
        (i) =>
          i &&
          ["mistake", "signal", "question"].every(
            (k) => typeof i[k] === "string" && i[k].length > 0,
          ),
      )
    )
      return fallback;
    return { items: items.slice(0, 2), mode: "live" };
  } catch {
    return fallback;
  }
}
