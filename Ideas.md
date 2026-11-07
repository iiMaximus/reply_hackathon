# AI on Campus — Hackathon Idea Shortlist

Date: 7 November 2026  
Challenge: https://studentclash.reply.com/challenges/AI_on_Campus_IT.html

## Selection principle

The product must justify being an application. If a reusable prompt or SKILL.md can reproduce its main value, the idea is too thin. Look for shared workflows, real data, coordination between people, and a feedback loop that leads to an action.

These are brainstorming proposals, not verified claims of market novelty or proven educational effectiveness. The exact linked challenge page was unavailable during research; the public event overview established the broad education theme.

## 1. Live Peer Instruction — Recommended

**Concept:** Organize classroom discussions around students' reasoning, then check whether their understanding improves.

### Workflow

1. The professor opens a room with a conceptual question.
2. Students privately submit an answer and a short explanation.
3. AI identifies reasoning patterns and possible misconceptions using teacher-approved reference explanations.
4. The system suggests nearby pairs with useful contrasting reasoning. The professor can correct classifications and override pairings.
5. Students discuss briefly and answer again.
6. A fresh question tests whether they can apply the concept in a different situation.
7. The professor sees unresolved misconceptions and decides where to intervene.

### Demonstration: Same answer, different understanding

For a slender cantilever beam with a tip force, under linear Euler–Bernoulli assumptions:

`delta = F L^3 / (3 E I)`, with `I = b h^3 / 12`.

Hold force, material, and width constant. Double both length L and section height h. Deflection remains unchanged because the cubic factors cancel.

- Student A answers “unchanged” and correctly explains the cubic relationship.
- Student B also answers “unchanged,” but incorrectly believes deflection scales linearly with L/h.
- A normal multiple-choice poll marks both answers correct. Analysis of their explanations reveals the disagreement.
- After discussion, ask what happens when only L doubles. The correct answer is eight times the deflection; Student B's model predicts twice.

### Why AI is useful

Interpret free-text reasoning, including correct answers reached for incorrect reasons. Multiple-choice answers alone would not justify AI: predefined distractor rules could handle those.

### Why this needs an application

Concurrent private submissions, session state, constrained pairing, discussion timing, follow-up questions, and teacher intervention form a coordinated multiuser workflow.

### One-day MVP

- One classroom room code and four to six browser clients.
- One topic and three teacher-authored questions.
- Answer and explanation submission.
- AI classification with visible uncertainty and teacher correction.
- Suggested pairs, discussion round, and follow-up question.
- Teacher dashboard showing reasoning categories and responses before and after discussion.

Polling is sufficient for updates; hardware is unnecessary.

### Main weaknesses

- Peer instruction already exists. The proposed contribution is AI-assisted interpretation and orchestration, not a new teaching method.
- Incorrect classifications can produce unhelpful pairings. Correct answers alone must not qualify someone as a mentor.
- Keep students nearby or let them discuss in-app; avoid sending an entire lecture hall wandering around.
- A tiny demonstration can show the workflow, but cannot establish improved learning. Agreement after discussion is also not proof of understanding; use a fresh transfer question.

**Pitch:** “A professor has 200 students. We help them see the different ways those students misunderstand—and organize the next classroom activity around that.”

## 2. One Project, Many Courses

**Concept:** A substantial student project produces evidence that different professors can assess against their own course outcomes.

### Example

A wing project produces CAD models, structural calculations, material-selection reasoning, test measurements, and sensor code. These artifacts are linked to relevant learning outcomes in mechanics, materials, and programming.

AI suggests evidence-to-outcome mappings and identifies gaps. For example, missing uncertainty analysis leads to a proposed calibration experiment. Each professor independently reviews and accepts or rejects the relevant evidence.

### Why this needs an application

A shared evidence graph connects artifacts, contributors, course outcomes, missing work, and separate teacher approvals. This is a cross-course assessment workflow.

### One-day demo

Upload a small wing-project evidence package, map it to three sets of teacher-authored outcomes, identify a missing experiment, and demonstrate two teacher roles reviewing different evidence.

### Main weaknesses

- Adoption depends on faculty coordination and academic rules.
- AI mappings are suggestions, not reliable automatic assessment.
- Individual contributions need evidence; a team artifact does not establish every member's competence.
- Do not promise automatic credits or CFU. The prototype demonstrates an approval workflow, not institutional acceptance.

**Verdict:** Stronger as an ambitious university redesign pitch than as the safest hackathon build.

## 3. Diagnostic Teaching Lab

**Concept:** Combine real experiment data, student predictions, and diagnostic history to help students investigate problems and help teaching assistants prioritize benches.

### Workflow

1. Students predict an experiment's result.
2. Instrument or STM32 telemetry records the actual result.
3. The system highlights the mismatch and suggests a diagnostic measurement.
4. Students collect further evidence and evaluate competing explanations.
5. A shared dashboard shows unresolved benches and what each group has already tried.

### Why AI is useful

Suggest hypotheses, interpret students' explanations, and propose measurements that distinguish possible causes. Deterministic code should handle numerical checks where possible. An unseen wiring fault must remain a hypothesis until measurements support it.

### Why this needs an application

Automatic telemetry capture, experiment state, prediction history, diagnostic steps, and a multi-bench assistance queue provide the product value.

### One-day demo

Use an already-working low-voltage hardware setup. Introduce a known fault, capture real measurements, guide the next diagnostic step, and show the teaching assistant's dashboard.

### Main weaknesses

- Hardware integration can consume the entire hackathon.
- Without real telemetry and the shared workflow, it risks becoming a simulator with a chatbot.
- Show what students learn from diagnosis, not just that the system can troubleshoot.

**Verdict:** A strong option if working hardware and telemetry are already available.

## Comparison and Recommendation

| Idea | Main advantage | Main risk | Best use |
| --- | --- | --- | --- |
| Live Peer Instruction | Visible AI role and feasible multiuser demo | Classification quality; must distinguish itself from ordinary polling | Recommended software prototype |
| One Project, Many Courses | Meaningful change to assessment across courses | Institutional coordination and adoption | Ambitious future-of-university pitch |
| Diagnostic Teaching Lab | Tangible real-world data and shared teaching workflow | Hardware integration | Prototype when equipment already works |

**Recommendation:** Build the live classroom loop. Keep the demonstration narrow: one misconception, a few participants, reasoning-based grouping, and a fresh question that exposes whether understanding changed.

## Ideas Set Aside

- **Generic tutor, deliberate-error exercise generator, or explain-back assistant:** useful activities, but their core value can largely be reproduced with a prompt or SKILL.md.
- **Campus skill exchange:** risks being a generic marketplace with AI matching and a cold-start problem.
- **Curriculum dependency doctor:** potentially useful, but inferred prerequisites need validation and the benefit is slower to demonstrate.
- **University-wide misconception dashboard:** too broad without access to student attempts; a dashboard needs a concrete intervention loop to earn its existence.
