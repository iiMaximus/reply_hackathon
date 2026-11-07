import { randomUUID } from "node:crypto";
import { cards, handoffs, hintIds, hints } from "./course.mjs";
import { notebooks } from "../simulation.mjs";
import { derivativeLine, probeDerivative } from "./slope.mjs";

const choice = (values) => ({ type: "string", enum: values });
function tool(name, description, properties) {
  return {
    type: "function",
    name,
    description,
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties,
      required: Object.keys(properties),
    },
  };
}
export const tools = [
  tool(
    "match_strategy",
    "Use the local sentence encoder to retrieve a possible reasoning strategy for this submission. Its result is provisional.",
    {},
  ),
  tool(
    "check_slope",
    "Compare the submitted derivative polynomial with the lesson curve and select a test point. Returns evidence. Use an empty line for typed work; only for an image may you supply a transcription.",
    { line: { type: "string" } },
  ),
  tool(
    "lookup_course",
    "Read the course note, marking criteria and approved hints for this concept.",
    { card: choice(Object.keys(cards)) },
  ),
  tool(
    "recall_practice",
    "Read the last hint for this browser and exercise, if any.",
    {},
  ),
  tool(
    "record_step",
    "Record one visible step, select a private hint and propose a checked transfer problem. Terminal action.",
    {
      card: choice(Object.keys(cards)),
      group: choice(Object.keys(hints)),
      line: { type: "string" },
      hint: choice(hintIds),
      followUp: choice(["factor", "shift", "power"]),
      confidence: choice(["clear", "uncertain"]),
    },
  ),
  tool(
    "ask_tutor",
    "Request human clarification or uphold the boundary on supplying an answer. Terminal action.",
    {
      reason: choice(["ambiguous", "answer_request", "unsupported"]),
    },
  ),
];
const toolByName = new Map(tools.map((t) => [t.name, t]));
const sourceFor = (id) => ({
  id,
  title: cards[id].title,
  url: cards[id].reference,
});
const normalize = (s) =>
  s.normalize("NFKC").replace(/\s+/g, "").replaceAll("−", "-").toLowerCase();

function validArguments(spec, args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) return false;
  const fields = spec.parameters.properties;
  return (
    Object.keys(args).length === Object.keys(fields).length &&
    Object.entries(fields).every(
      ([key, def]) =>
        Object.hasOwn(args, key) &&
        typeof args[key] === "string" &&
        (!def.enum || def.enum.includes(args[key])),
    )
  );
}

export async function runAgent({
  work,
  previous = null,
  decide,
  mode = "scripted",
  onEvent = () => {},
  stepBudget = 4,
  matchStrategy,
  timeoutMs = 25000,
}) {
  const trace = [],
    history = [],
    sources = new Set();
  const runId = randomUUID();
  const signal = AbortSignal.timeout(timeoutMs);
  let recalled = false;
  let strategy = null,
    probe = null;
  const submission = work.notebook ? notebooks[work.notebook]?.line : work.text;
  const allowed = matchStrategy
    ? tools
    : tools.filter((t) => t.name !== "match_strategy");
  function log(step, action, result) {
    const event = { step, action, result };
    trace.push(event);
    onEvent({ runId, mode, ...event });
  }
  function handoff(reason) {
    return {
      group: "unclear",
      line: (work.text || "").slice(0, 300),
      hint: handoffs[reason],
      handoff: reason,
      mode,
      trace,
      runId,
      source: null,
      strategy,
      probe,
      followUp: null,
      ...(reason === "unavailable" ? { fallback: true } : {}),
    };
  }
  if (
    /(?:give|show|tell)\s+me\s+(?:just\s+)?(?:the\s+)?(?:final\s+)?(?:answer|solution)|(?:solve|do)\s+(?:it|this)\s+for\s+me|(?:dammi|scrivi)\s+(?:la\s+)?(?:soluzione|risposta)/iu.test(
      work.text || "",
    )
  ) {
    log(0, "ask_tutor", "answer_request");
    return handoff("answer_request");
  }
  for (let step = 1; step <= stepBudget; step++) {
    let decision;
    try {
      decision = await decide({ work, tools: allowed, history, signal });
      if (signal.aborted) throw new Error("timeout");
    } catch {
      log(step, "ask_tutor", "unavailable");
      return handoff("unavailable");
    }
    const call = decision?.call;
    const spec = toolByName.get(call?.name);
    let args;
    try {
      args = JSON.parse(call?.arguments);
    } catch {
      /* The model observes a rejected call and may retry. */
    }
    let observation;
    if (!spec || !allowed.includes(spec) || !validArguments(spec, args)) {
      observation = {
        ok: false,
        error: "Use a listed tool with its exact fields.",
      };
    } else if (call.name === "match_strategy") {
      try {
        strategy = submission ? await matchStrategy(submission) : null;
      } catch {
        log(step, "ask_tutor", "unavailable");
        return handoff("unavailable");
      }
      observation = { ok: true, strategy };
    } else if (call.name === "check_slope") {
      probe = probeDerivative(
        derivativeLine(submission)
          ? submission
          : work.image
            ? args.line.slice(0, 300)
            : submission,
      );
      observation = { ok: true, probe };
    } else if (call.name === "ask_tutor") {
      log(step, call.name, args.reason);
      return handoff(args.reason);
    } else if (call.name === "lookup_course") {
      sources.add(args.card);
      const card = cards[args.card];
      observation = {
        ok: true,
        card,
        availableHints: Object.fromEntries(
          card.groups.map((g) => [g, hints[g]]),
        ),
        followUps: {
          factor: "Preserve a root when dividing.",
          shift: "Find stationary values for shifted factors.",
          power: "Test the derivative of each term in another polynomial.",
        },
      };
    } else if (call.name === "recall_practice") {
      recalled = true;
      observation = { ok: true, previous };
    } else if (call.name === "record_step") {
      if (args.confidence === "uncertain") {
        log(step, "ask_tutor", "ambiguous");
        return handoff("ambiguous");
      }
      const options = hints[args.group];
      const hint = options.find(([id]) => id === args.hint);
      const evidence = work.notebook
        ? notebooks[work.notebook]?.line
        : work.text;
      const line = args.line.trim();
      const matches = evidence && normalize(evidence).includes(normalize(line));
      if ((derivativeLine(submission) || derivativeLine(line)) && !probe)
        observation = {
          ok: false,
          error: "Run check_slope on the submitted derivative first.",
        };
      else if (
        probe?.status === "unsupported" ||
        (probe?.status === "mismatch" && args.group !== "power") ||
        (args.group === "power" &&
          (probe?.status !== "mismatch" || args.followUp !== "power"))
      )
        observation = {
          ok: false,
          error:
            "The mathematical check must support this group. Request clarification when it cannot read the expression.",
        };
      else if (!sources.has(args.card) || !recalled)
        observation = {
          ok: false,
          error: "Consult the cited card and previous hint first.",
        };
      else if (
        !cards[args.card].groups.includes(args.group) ||
        !hint ||
        (args.group === "lost" && args.followUp !== "factor")
      )
        observation = {
          ok: false,
          error: "Use a group, hint and follow-up supported by the card.",
        };
      else if (!line || line.length > 300 || (!matches && !work.image))
        observation = {
          ok: false,
          error:
            "Quote a short line actually present in the submission or request clarification.",
        };
      else if (previous?.hint === args.hint)
        observation = {
          ok: false,
          error: "That hint was already shown; choose the other approved hint.",
        };
      else {
        log(step, call.name, "recorded");
        return {
          group: args.group,
          line,
          hint: hint[1],
          hintId: hint[0],
          source: sourceFor(args.card),
          strategy,
          probe,
          followUp: args.followUp,
          mode,
          trace,
          runId,
          ...(work.notebook ? { notebook: work.notebook } : {}),
        };
      }
    }
    log(
      step,
      spec?.name || "unknown_tool",
      observation.ok
        ? call.name === "match_strategy"
          ? (strategy?.strategy ?? "no_text")
          : call.name === "check_slope"
            ? (probe?.status ?? "no_claim")
            : call.name === "lookup_course"
              ? args.card
              : previous
                ? "previous_hint"
                : "no_previous_hint"
        : "rejected",
    );
    history.push({ call, output: decision.output, observation });
  }
  log(stepBudget, "ask_tutor", "budget");
  return handoff("budget");
}
