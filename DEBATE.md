# The Second Vote

## The user's classroom idea

A professor asks the room a question, sees what deserves another explanation, and can act while students are still there. Each student can privately revisit their own reasoning after class. The student advocate, faculty reviewer, and prior-project scout independently reviewed this proposal after debating seven alternatives. All three picked the refined classroom idea for the user's latest brief. The scout gave Invent the Instrument the edge on originality as a standalone activity.

## The demo at PoliTO

Open with **“Two classrooms gave the same right answer. Which question would you ask each one next?”** Invite the judge to vote on one phone. Show two illustrative rooms, labelled as such.

| What the professor sees | Room A | Room B |
| --- | --- | --- |
| First Analisi I question | Does x⁴ have a local minimum at zero? | The same question and the same vote distribution. |
| One volunteered explanation | “Any point with derivative zero is a minimum.” | “An even exponent always gives a minimum at zero.” |
| Agent's proposed next question | What about x³ at zero? | What about −x⁴ at zero? |
| What the vote can reveal | x³ also has derivative zero there but rises through zero. The claimed rule predicts a minimum. | −x⁴ still has an even exponent but has a maximum at zero. The claimed rule predicts a minimum. |

The agent asks whether it interpreted a student's reason correctly when the wording is ambiguous. A phrase such as “derivative zero” is incomplete on its own. A correct rule the agent can test in both rooms is to compare the function value with nearby values on **both** sides. A bounded verifier checks candidate questions in the family a·xⁿ at zero and the predictions of the supported rules. The professor sees the proposed example and its justification before choosing whether to teach it.

After the vote, the professor sees counts of actual responses and optional reasons, with nonresponses recorded separately. If several students endorse the same reasoning on a question that distinguishes it, the professor has something specific to address. If the evidence is mixed, the next action is to ask the class for two explanations. The teacher can accept, edit, or skip the suggestion.

**The private handoff.** On the poll screen, a student can start a fresh challenge by marking one interval on a sign chart. They can resume from that mark later. For example, f′ is positive just before and after a stationary point. Is it a local minimum, a local maximum, or neither? Explain. This changes representation and removes the odd/even exponent cue. The learner can correct the suggested interpretation, choose another question, or pass. Keep individual choices on the device and display aggregates to the class. Allow untimed, keyboard-accessible responses.

**Smallest build.** One approved PoliTO practice sheet or set of lecture notes on extrema, one lecturer screen, a QR-linked poll, two plausible rule families, an exact sign/parity checker, and a private return card. The examples above are team-authored illustrations. Obtain a section-specific sheet or use a public course section when building. [Course reading on extrema](https://www2.math.uconn.edu/ClassHomePages/Math1071/Textbook2/sec_Ch4Sec5.html)

## What the agents challenged

| Perspective | Hardest objection | Decision |
| --- | --- | --- |
| Student | A vote is weak evidence of why someone chose an answer. A personal dashboard also leaves the student with the same job of starting later. | Treat reasons as hypotheses. Offer a private first move in the session already open and measure whether the learner returns to finish unaided. |
| Lecturer | Two histograms cannot justify assigning a misconception to individual students. A skilled TA could write the entire demonstration in advance. | Use volunteered reasons, counts with denominators, a professor-approved example, and a fresh check. Show the next slide changing when the reasons change. Test unseen reasons against a TA-written sequence. |
| Scout | Kahoot identifies difficult questions and learners needing follow-up. Wooclap already groups live responses and generates follow-up questions. Peer Instruction already includes voting and discussion. | The specific design bet is to find an example on which two stated rules predict different answers, check it, and let the lecturer decide what to explain. There is no established learning advantage for this prototype yet. [Kahoot reports](https://support.kahoot.com/hc/en-us/articles/360035063054-Kahoot-quiz-reports) · [Wooclap live facilitation](https://www.wooclap.com/en/ai-live-facilitator/) · [UBC on Peer Instruction](https://cwsei.ubc.ca/resources/instructor/prs.html) |

**What would change our minds?** Have a TA teach two matched topics with the same time budget, using their own prepared follow-up questions in one and the agent's suggestions in the other. Swap topic/order across groups if available. Compare whether the instructor chose a different useful example, whether students solved an unseen question without hints, and how many voluntarily resumed their private card after class. Record incorrect interpretations and passes as well as successes. A small trial can expose a weak interaction. It cannot establish an ADHD-specific benefit.

## Competitors for the team's time

Before hearing the live-poll proposal, the agents independently worked from three briefs: start studying without relying on a reminder, give lecturers an instructional decision they can act on, and investigate actual hackathon winners for precedents. Each agent had to identify a substitute without AI and a result that would disconfirm its preferred proposal. They sent objections to one another and reconsidered their choices.

| Idea | Debated outcome |
| --- | --- |
| **Invent the Instrument** | All three initially preferred this for the Reply demo. A learner defines “steady” in their own words. The agent translates that rule to a formula for confirmation, then finds two traces for which plausible definitions reverse the ranking. For an arm targeting zero, A = [−2, 2, −2, 2, −2, 2] has lower peak error, B = [0, 0, 0, 0, −3, 3] has lower RMS error. Both are defensible depending on the application. This mechanism inspired The Second Vote. [Stanford's work on inventing with contrasting cases](https://aaalab.stanford.edu/research/inventive-learning/contrasting-cases/) |
| **One Less Problem** | Invite students to nominate two optional Analisi I exercises that use the same method, then try an example where the shortcut breaks. Strong immediate incentive to start. Recognizing a shared method does not establish mastery. Keep both exercises available and compare with an equally short, teacher-curated sheet. [Prior work on curriculum compacting](https://gifted.uconn.edu/schoolwide-enrichment-model/curriculum_compacting/) |
| **Side Door** | A student finishes a programming bisection task and uses the actual sequence of bracket widths to start a deferred calculus problem. From width 1, ten exact halvings first put it below 0.001. Check the recurrence in code and handle early termination. Strong for students already working on another subject. A fixed link from the same notebook is the baseline. [MIT bisection lecture](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/pages/lecture-6-bisection-search/) |
| **Same Question** | Faculty and scout independently proposed a tool that helps a lecturer make a chart accessible while preserving what the student must infer. A description that gives the zero crossing can answer one question and be appropriate for another. Co-design with blind students and compare with a keyboard-accessible trace. [University of Washington guidance](https://teaching.washington.edu/inclusive-accessible/making-course-materials-accessible/images-and-diagrams/) |
| **Wanted: One Witness** | A real tutorial question asks for an example, such as a singular 2×2 matrix with no zero entries. A peer can take part by filling four cells. Exact verification is feasible. Check whether a genuine request produces more independent attempts than a matched fixed exercise. |
| **The Missing Photograph** | Test a classifier trained on washers photographed on red and nuts on blue. A student chooses a missing photograph to disentangle shape and background. Strong live action, close precedent in teachable classifiers, and one image cannot establish exclusive reliance on the background. [Google's Teachable Machine](https://blog.google/innovation-and-ai/products/teachable-machine/) |
| **Fold First** | A mechanics student folds a paper beam and predicts its sag. A photo becomes an editable cross-section. The paper-only activity is already compelling, so AI has to earn its place by handling genuinely different student-made sections. [Exploratorium paper bridges](https://annex.exploratorium.edu/structures/paperbridges2.html) |

Two winning projects changed the discussion. **TinyStep**, an IncludAI track winner, already tackled breaking an intimidating assignment into small first actions. **BAM DASH**, winner of the local IT:U DigiEduHack event, brought classroom signals to the lecturer while teaching was still in progress. We borrowed that timing and chose voluntary responses to course questions as the evidence. [IncludAI award announcement](https://includai-2026.devpost.com/updates/44978-and-the-winner-is) · [IT:U's winning team](https://it-u.at/en/news/itu-digieduhack-2025-is-in-the-books/)
