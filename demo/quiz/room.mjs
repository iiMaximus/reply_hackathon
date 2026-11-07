import { randomUUID } from "node:crypto";
import {
  approve,
  prepare,
  readSource,
  reject,
  teachingMove,
} from "./agent.mjs";
import { examples } from "./course.mjs";

function totals(q, votes) {
  const counts = q.options.map(() => 0),
    reasons = q.options.map(() => 0);
  let total = 0,
    split = 0,
    coherent = 0,
    explained = 0;
  for (const { answer, reason } of votes) {
    total++;
    counts[answer]++;
    if (reason === null) continue;
    explained++;
    reasons[reason]++;
    if (answer === q.key) {
      if (reason === q.reasonKey) coherent++;
      else split++;
    }
  }
  return {
    total,
    counts,
    reasons,
    correct: counts[q.key],
    split,
    coherent,
    explained,
  };
}
function aggregate(q, evidence) {
  const { counts, reasons, total, split, explained } = evidence;
  const most = (items, exclude) =>
    items.reduce(
      (best, n, i) =>
        i !== exclude && n > 0 && (best === null || n > items[best]) ? i : best,
      null,
    );
  const wrong = most(counts, q.key),
    why = most(reasons, q.reasonKey);
  let finding;
  if (!total) finding = "There were no answers to interpret.";
  else if (split)
    finding =
      split +
      " " +
      (split === 1 ? "response paired" : "responses paired") +
      " the correct answer with a different reason. Check the underlying rule before moving on.";
  else if (wrong !== null)
    finding =
      counts[wrong] +
      " chose “" +
      q.options[wrong].text +
      "”. " +
      (explained
        ? "Compare the reasons below before deciding what to revisit."
        : "The votes show the choice. A follow-up can establish why it appealed.");
  else
    finding = explained
      ? "Everyone chose the correct answer. Try a changed example to check whether the reasoning transfers."
      : "Everyone chose the correct answer. The answers alone do not establish why.";
  return {
    ...evidence,
    finding,
    leadingReason:
      why === null
        ? null
        : { text: q.options[why].reason, count: reasons[why] },
  };
}
const sample = approve(examples[0]);
const fictitious = Array.from({ length: 24 }, (_, i) => ({
  answer: i < 15 ? 0 : i < 17 ? 1 : i < 22 ? 2 : 3,
  reason: i < 9 ? 0 : i < 17 ? 1 : i < 22 ? 2 : 3,
}));
const preview = {
  id: "example",
  title: sample.topic,
  question: sample,
  example: true,
  ...aggregate(sample, totals(sample, fictitious)),
  action: sample.next,
  engine: "Reviewed example",
};

export function createTeachingRoom({ match, cloud }) {
  let current = null,
    draft = null,
    preparing = false;
  const archived = [];
  function board() {
    if (!current) return null;
    const { id, question: q, status, votes, order } = current;
    return {
      id,
      status,
      total: votes.size,
      prompt: q.prompt,
      topic: q.topic,
      options: q.options.map((o) => o.text),
      reasonChoices:
        q.reasonKey === null
          ? []
          : order.map((i) => ({ id: i, text: q.options[i].reason })),
    };
  }
  function receipt(round, vote) {
    const q = round.question,
      o = q.options[vote.answer];
    return {
      id: round.id,
      topic: q.topic,
      prompt: q.prompt,
      chosen: o.text,
      correct: q.options[q.key].text,
      right: vote.answer === q.key,
      hint: o.hint,
      explanation: q.explanation,
      choices: q.options.map((o) => o.text),
      reason: vote.reason === null ? null : q.options[vote.reason].reason,
      reasonRight: vote.reason === null ? null : vote.reason === q.reasonKey,
      soundReason: q.reasonKey === null ? null : q.options[q.reasonKey].reason,
    };
  }
  function student(p) {
    if (!current) return null;
    const vote = current.votes.get(p);
    return { ...board(), receipt: vote ? receipt(current, vote) : null };
  }
  const solo = { id: "practice-calculus", question: approve(examples[1]) };
  function practice(p) {
    const q = solo.question;
    return {
      id: solo.id,
      status: "practice",
      topic: q.topic,
      prompt: q.prompt,
      options: q.options.map((o) => o.text),
      reasonChoices: [2, 3, 0, 1].map((i) => ({
        id: i,
        text: q.options[i].reason,
      })),
      receipt: p.soloVote ? receipt(solo, p.soloVote) : null,
    };
  }
  function practiceVote(p, input) {
    const ok = (i) =>
      Number.isInteger(i) && i >= 0 && i < solo.question.options.length;
    if (
      input.id !== solo.id ||
      !ok(input.answer) ||
      (input.reason != null && !ok(input.reason))
    )
      reject("Choose an available practice answer.");
    p.soloVote = { answer: input.answer, reason: input.reason ?? null };
  }
  function host() {
    return {
      draft,
      active: current
        ? {
            id: current.id,
            status: current.status,
            total: current.votes.size,
            question: current.question,
            report: current.report,
          }
        : null,
      history: archived,
      sample: preview,
      examples: examples.map((e) => e.topic),
      cloud: cloud.enabled,
    };
  }
  async function analyze(input) {
    if (preparing)
      reject("A question is being prepared. Try again in a moment.", 409);
    preparing = true;
    try {
      const source = await readSource(input);
      const proposed = await prepare(source, { match, cloud });
      draft = { id: randomUUID(), sourceText: source.text || "", ...proposed };
    } finally {
      preparing = false;
    }
  }
  function publish(input) {
    if (current && input.id === current.draftId) return;
    if (!draft || draft.id !== input.id)
      reject(
        "That draft changed. Open the latest draft before publishing.",
        409,
      );
    if (current && current.status !== "closed")
      reject("Close the current question before publishing another.", 409);
    const question = approve(input.question);
    const order = question.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (current?.report) archived.unshift(current.report);
    if (archived.length > 12) archived.length = 12;
    current = {
      id: randomUUID(),
      draftId: draft.id,
      question,
      order,
      status: "open",
      votes: new Map(),
      report: null,
    };
    draft = null;
  }
  function vote(p, input) {
    if (!current || current.id !== input.id)
      reject("This question has changed. Open the current question.", 409);
    // Network retries return the first private receipt, including after the poll closes.
    if (current.votes.has(p)) return;
    if (current.status !== "open")
      reject("The professor closed voting for this question.", 409);
    const { answer, reason = null } = input,
      q = current.question;
    const valid = (i) => Number.isInteger(i) && i >= 0 && i < q.options.length;
    if (
      !valid(answer) ||
      (reason !== null && (!valid(reason) || q.reasonKey === null))
    )
      reject("Choose one of the available answers.");
    current.votes.set(p, { answer, reason });
  }
  async function close(id) {
    const round = current;
    if (!round || round.id !== id)
      reject("Open the current question first.", 409);
    if (round.status === "closed") return;
    if (round.closing) return round.closing;
    round.status = "closing";
    const evidence = aggregate(
      round.question,
      totals(round.question, round.votes.values()),
    );
    round.closing = (async () => {
      const move = await teachingMove(round.question, evidence, cloud, match);
      round.report = {
        id: round.id,
        title: round.question.topic,
        question: round.question,
        ...evidence,
        ...move,
      };
      round.status = "closed";
    })();
    return round.closing;
  }
  return {
    host,
    student,
    board,
    practice,
    practiceVote,
    analyze,
    publish,
    vote,
    close,
  };
}
