# AI Classroom Feedback — Hackathon Proposal

Date: 7 November 2026  
Challenge: https://studentclash.reply.com/challenges/AI_on_Campus_IT.html

## Concept

A classroom question platform, similar in interaction to Kahoot but less gamified and built around open-ended answers. Professors publish questions during lectures or between classes. Students submit explanations in their own words. AI assesses responses against professor-approved criteria and course material, gives students immediate feedback, and summarizes class understanding for the professor.

The goal is continuous feedback during the semester: students discover gaps while they can still address them, and professors adjust teaching before the final exam exposes those gaps.

## Problems Addressed

- Professors cannot regularly read and assess hundreds of open-ended answers.
- Students often receive meaningful feedback only near the end of the semester.
- Multiple-choice correctness can hide incorrect reasoning.
- Delayed results can make regular study difficult to sustain. Immediate feedback and visible progress respond to the project originator's experience with ADHD; this is a design motivation, not a claim of clinically demonstrated benefit.

## Core Workflow

1. A professor supplies relevant course material, a question, and an assessment rubric.
2. The professor publishes the question live or with an asynchronous response window.
3. Students write answers independently.
4. AI proposes rubric-based scores and explains strengths, mistakes, and missing concepts. Ambiguous or unsupported assessments are flagged for review.
5. The professor receives aggregate results and representative anonymized examples.
6. The professor reviews the suggested intervention and publishes a follow-up question.
7. Students receive feedback and see their progress. A fresh question checks whether the concept transfers beyond the original answer.

## Features

| Feature | Professor value | Student value |
| --- | --- | --- |
| Live open-ended questions | Immediate overview of class understanding | Participation without speaking publicly |
| Questions between lectures | Evidence of retention between classes | Small, regular practice opportunities |
| Course-grounded AI feedback | Suggested assessment at classroom scale | Immediate explanation of strengths and gaps |
| Misconception analytics | Specific concepts to revisit and example answers | Teaching responds to actual difficulties |
| Targeted follow-up questions | Check whether an intervention helped | Another opportunity to apply the concept |
| Progress and optional rewards | Participation trends | Visible progress before exam season |
| Notifications | Reach students outside lectures | Reminders within user-controlled settings |

## Professor Dashboard

Possible outputs include:

- Mean suggested score as a percentage, with score distribution and rubric breakdown.
- Most common misconceptions and the number of responses exhibiting each.
- Representative anonymized excerpts supporting the summary.
- Submitted, blank, and insufficient-to-assess responses.
- Assessment uncertainty and a review queue.
- Suggested teaching intervention and follow-up question.

Always show the denominator. For example, **64 responses from 110 enrolled students**. Respondents may not represent the entire class.

Do not label students as having “actually tried” based on AI inference. Length, correctness, or fluency do not reliably establish effort.

### Example

“Among 64 respondents, 38 confused stress with force. Here are three representative answers. Suggested next step: revisit the role of cross-sectional area, then publish this follow-up question.”

This connects diagnosis to an action rather than stopping at an average score.

## Motivation and Rewards

The original proposal includes a scoreboard to provide a more immediate reward than an end-of-semester exam result.

Suggested design:

- Immediate feedback and completion points.
- Personal progress toward small weekly goals.
- Recognition for improvement and revisiting mistakes.
- Optional pseudonymous rankings.
- Forgiving weekly targets rather than streaks that collapse after one missed day.
- User-controlled notifications and reminder timing.

A correctness-only leaderboard may mostly reward students who already understand the material. Rewards should support learning rather than encourage repeated trivial submissions or competition over AI-assigned marks.

## Why AI and an Application Are Needed

**AI:** interpret varied free-text reasoning against a course-specific rubric, identify misconceptions, and propose an evidence-backed summary and next question.

**Application:** coordinate private submissions, live and asynchronous sessions, course membership, response history, aggregate analytics, teacher review, notifications, and follow-up activity.

The product value is the complete classroom feedback loop. A prompt can analyze an answer; it cannot alone coordinate that workflow across a class.

## Hackathon Fit

The full brief was successfully retrieved using curl. It requires Levels 1 and 2: an idea and a working AI prototype. The prototype must use real university material, take an action beyond conversation, and demonstrate boundaries. Administrative and logistical projects are out of scope.

| Evaluation criterion | Weight | Implication |
| --- | --- | --- |
| Creativity and innovation | 40% | Demonstrate what becomes possible beyond faster marking |
| Impact | 20% | Explain student and professor value, plus how to measure it |
| Technical | 20% | Show a working, grounded feedback loop |
| Effective presentation | 20% | Use one clear before-and-after classroom example |

“Kahoot with AI grading” is a useful shorthand, but the stronger pitch is continuous feedback between lectures, followed by targeted teaching and reassessment.

## One-Day MVP

Build one complete cycle:

**Professor publishes → students answer → AI provides grounded feedback → professor sees misconceptions → professor publishes targeted follow-up.**

- One course and one real course-material excerpt.
- Three to five short conceptual questions with approved rubrics.
- One professor interface and several student browser clients.
- Suggested score, criterion-level feedback, supporting source reference, and review flag.
- Aggregate misconception summary linked to response evidence.
- Follow-up question and response history.
- One ambiguous answer that the system routes to human review.

Notifications, native mobile apps, and public rankings can follow after the core flow works. A responsive web interface is sufficient for the demonstration.

## Validation and Limits

- Compare suggested marks with a small manually assessed answer set, including correct, partially correct, incorrect, unconventional, and ambiguous responses.
- Check whether the misconception summary is supported by actual answers.
- Use a fresh follow-up question to distinguish transferable understanding from repeating the feedback.
- Treat AI marks as formative suggestions, not automatic official grades.
- Asynchronous answers cannot establish independent authorship; students may use external assistance.
- Keep individual feedback private and professor-facing examples anonymized.
- Measure response rate, repeat participation, assessment agreement with reviewers, and follow-up performance. A small demo does not establish long-term learning or ADHD benefit.

## Review by Independent Agents

Three reviewers assessed educational value, technical feasibility, and hackathon differentiation, and discussed the proposal with each other.

### Consensus

**Useful and buildable, but insufficiently distinctive if presented only as “Kahoot with AI grading.”** The strongest version turns detected misconceptions into a teacher-approved intervention and a fresh check of understanding.

| Reviewer | Verdict | Main recommendation |
| --- | --- | --- |
| Skeptical judge | Viable product; innovation is the competition vulnerability | Demonstrate reasoning that ordinary quizzes miss, then act on it |
| Learning reviewer | The feedback loop matters more than activity statistics | Prioritize transfer performance; distinguish participation from learning |
| Technical reviewer | A narrow version is feasible in one day | Finish one course-grounded cycle before notifications, rewards, or integrations |

The judge's subjective concept rating was **5/10 for the generic feature bundle and 8/10 for the focused misconception-to-intervention loop**. These are brainstorming assessments, not predicted competition results or verified market comparisons.

### Recommended Demonstration

Use a real course excerpt containing the cantilever deflection relation `delta = F L^3 / (3 E I)` and the rectangular second moment `I = b h^3 / 12`.

1. Ask what happens to tip deflection when length L and section height h both double, with width, material, and tip force fixed. Assume linear Euler–Bernoulli beam behavior.
2. Two students answer “unchanged.” One correctly explains cubic cancellation; the other incorrectly assumes a linear L/h relationship.
3. AI distinguishes their reasoning using rubric criteria, supporting answer excerpts, and the course reference.
4. The professor reviews the misconception group and approves a follow-up: double only the length.
5. The system sends the question to the relevant students. Correct reasoning predicts eight times the deflection; the incorrect model predicts twice.
6. The dashboard records the progression from initial response through intervention to the transfer response.

This demonstrates the action beyond conversation: the system assigns targeted follow-up after teacher approval. It also shows why an overall percentage alone is insufficient.

### Build Priorities

Keep the professor question/rubric editor, student reasoning submissions, provisional assessment, evidence-backed dashboard, teacher override, and targeted follow-up. For the hackathon, defer native notifications, elaborate rewards, public rankings, production authentication, and a separate asynchronous workflow. Preserve asynchronous practice and motivational features in the product roadmap: the reviewers recommend sequencing them later, not removing them from the idea.

### Important Qualifications

- AI classification is a hypothesis about an answer, not a definitive label of a student's ability or understanding.
- A source citation improves traceability but does not prove an assessment is correct.
- Use deterministic checks for numerical results where appropriate.
- Asynchronous students can submit externally generated answers. Keep this low-stakes practice; do not claim cheating detection or proof of independent ability.
- Rewards for speed, public ability rankings, and punitive streaks may undermine the intended learning behavior.
- Evaluate learning with fresh questions and later retention; evaluate usability separately through participation and teacher review time.

### Suggested Pitch

“Open-ended practice usually creates more answers than a professor can read. Our platform analyzes students' reasoning against course material, shows the professor the misconceptions behind their answers, and sends targeted follow-up questions. Students receive immediate feedback throughout the semester, while professors can respond before those gaps become exam failures.”
