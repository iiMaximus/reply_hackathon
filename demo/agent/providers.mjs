import { readFileSync } from "node:fs";
import { classifyPracticeText } from "../analysis.mjs";
import { notebookReview } from "../simulation.mjs";
import { lesson } from "../lesson.mjs";
import { derivativeLine } from "./slope.mjs";
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
export async function rehearsalPlanner({ work, history, tools }) {
  const text = work.notebook
    ? notebookReview(work.notebook).line
    : work.text || "";
  const reading = work.notebook
    ? notebookReview(work.notebook)
    : classifyPracticeText(text);
  const act = (name, args = {}) => ({
    call: {
      name,
      arguments: JSON.stringify(args),
      call_id: "step-" + history.length,
    },
    output: [],
  });
  const result = (name) =>
    history.find((t) => t.call.name === name && t.observation.ok)?.observation;
  if (!text) return act("ask_tutor", { reason: "ambiguous" });
  if (
    tools.some((t) => t.name === "match_strategy") &&
    !result("match_strategy")
  )
    return act("match_strategy");
  const strategy = result("match_strategy")?.strategy?.strategy;
  const claim = derivativeLine(text);
  let group = reading.group,
    line = reading.line;
  if (claim || strategy === "probe") {
    if (!result("check_slope")) return act("check_slope", { line: "" });
    const checked = result("check_slope").probe;
    if (checked?.status === "unsupported")
      return act("ask_tutor", { reason: "unsupported" });
    if (checked?.status === "mismatch") {
      group = "power";
      line = checked.line;
    }
    if (checked?.status === "match" && group === "unclear") {
      group = "started";
      line = checked.line;
    }
  }
  // Semantic retrieval chooses a course route. Ambiguous references and negated claims need a person.
  if (
    group === "unclear" &&
    ["started", "kept", "lost"].includes(strategy) &&
    !/\b(?:not|never|except|unless|without)\b/i.test(text)
  ) {
    if (
      strategy !== "kept" ||
      /\bboth\b|\beach\b|\btwo\b|\beither\b/i.test(text)
    )
      group = strategy;
  }
  if (group === "unclear") return act("ask_tutor", { reason: "ambiguous" });
  if (
    ["kept", "lost"].includes(group) &&
    /(?:don['’]t|didn['’]t|did not|cannot|can['’]t|never|without)\s+(?:simply\s+)?(?:cancel|divid|factor)/i.test(
      text,
    )
  )
    return act("ask_tutor", { reason: "ambiguous" });
  const card =
    group === "power" ? "powers" : group === "started" ? "stationary" : "roots";
  if (!history.some((t) => t.observation?.card?.id === card))
    return act("lookup_course", { card });
  const recalled = result("recall_practice");
  if (!recalled) return act("recall_practice");
  return act("record_step", {
    card,
    group,
    line,
    hint: hints[group].find(([id]) => id !== recalled.previous?.hint)[0],
    followUp:
      group === "power" ? "power" : group === "lost" ? "factor" : "shift",
    confidence: "clear",
  });
}
