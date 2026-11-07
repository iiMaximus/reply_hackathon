import { readFileSync } from "node:fs";
import { classifyPracticeText } from "../analysis.mjs";
import { notebookReview } from "../simulation.mjs";
import { lesson } from "../lesson.mjs";
import { hints } from "./course.mjs";

const instructions = readFileSync(
  new URL("./instructions.md", import.meta.url),
  "utf8",
);
export function openAIPlanner({
  model = process.env.OPENAI_MODEL || "gpt-6.1-terra",
  apiKey = process.env.OPENAI_API_KEY,
  fetchImpl = fetch,
  reserve = () => true,
} = {}) {
  return async ({ work, tools, history, signal }) => {
    if (!apiKey || !reserve()) throw new Error("Model unavailable");
    const content = [
      {
        type: "input_text",
        text: JSON.stringify({
          exercise: lesson.formula,
          question: lesson.prompt,
          submission: work.text || "Read the attached photo.",
        }),
      },
    ];
    if (work.image)
      content.push({
        type: "input_image",
        image_url: work.image,
        detail: "high",
      });
    const input = [{ role: "user", content }];
    for (const turn of history) {
      input.push(...turn.output, {
        type: "function_call_output",
        call_id: turn.call.call_id,
        output: JSON.stringify(turn.observation),
      });
    }
    const res = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      signal,
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions,
        input,
        tools,
        store: false,
        include: ["reasoning.encrypted_content"],
        tool_choice: "required",
        parallel_tool_calls: false,
      }),
    });
    if (!res.ok) throw new Error("Provider unavailable");
    const raw = await res.json();
    const calls = raw.output?.filter((i) => i.type === "function_call");
    if (raw.status === "incomplete" || calls?.length !== 1 || !calls[0].call_id)
      throw new Error("No usable model decision");
    return { call: calls[0], output: raw.output };
  };
}

// A deterministic substitute for the planner only. Tools, validation and effects are shared.
export async function rehearsalPlanner({ work, history }) {
  const reading = work.notebook
    ? notebookReview(work.notebook)
    : classifyPracticeText(work.text || "");
  const act = (name, args = {}) => ({
    call: {
      name,
      arguments: JSON.stringify(args),
      call_id: "demo-" + history.length,
    },
    output: [],
  });
  if (reading.group === "unclear")
    return act("ask_tutor", { reason: "ambiguous" });
  const card = reading.group === "started" ? "stationary" : "roots";
  if (!history.some((t) => t.observation?.card?.id === card))
    return act("lookup_course", { card });
  const recalled = history.find(
    (t) => t.call.name === "recall_practice" && t.observation.ok,
  );
  if (!recalled) return act("recall_practice");
  const choices = hints[reading.group];
  return act("record_step", {
    card,
    group: reading.group,
    line: reading.line,
    hint: choices.find(([id]) => id !== recalled.observation.previous?.hint)[0],
    followUp: reading.group === "lost" ? "factor" : "shift",
    confidence: "clear",
  });
}
