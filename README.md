# reply_hackathon

Reply Student Tech Clash 2026 · AI on Campus

## Solution Room

[Join the deployed classroom](https://solution-room-demo.onrender.com/join) · [Open the projector](https://solution-room-demo.onrender.com/board) · [Agent architecture, examples and evaluation](demo/README.md#how-the-classroom-agent-works)

The public classroom runs a local MiniLM sentence encoder and a mathematical checking tool without an API key. Try `f′(x)=2+x²`. The agent selects a test point, compares the proposed tangent to the original curve, shows the mismatch, and recommends a fresh problem to the tutor. The notebook displays the tools that actually ran. Six labeled example attempts are ready for presenting; audience work drives the next question when people join.

**[Run or rehearse the demo](demo/README.md#play-the-public-ai-classroom).** Use `npm run model:prepare` and `npm run classroom` for the local AI; `npm run demo` for the scripted fallback; or `npm run live` with an OpenAI key for generative planning and photo interpretation.

**[Try the one-exercise proof of concept first](demo/README.md#start-with-the-proof-of-concept).** Run `npm run poc`. Students send an unfinished step from their phones and a tutor decides what to explain from the incoming work. The guide includes a five-minute classroom test and a criterion for trying a second session.

**[Run the phone demo, see the architecture and rehearse the pitch](demo/README.md)**. The repository now includes a working student room, a professor dashboard and an offline rehearsal path. Before anyone submits, the professor can request likely mistakes and example steps to watch for. The live counts come only from submitted work.

**Solution Room lets a professor see how students are approaching the exercise on the board while there is still time to explain a tricky step.** Students can snap a photo of their workings, upload a tablet screenshot or type a first move. The AI reads the steps against the professor’s course material and groups similar attempts for the professor. Students get private feedback and can try a fresh in-class challenge for a point on an optional weekly leaderboard. [Original classroom feedback proposal](ai-classroom-feedback-proposal.md)

### A round at PoliTO

1. **Share the exercise already on the board.** The professor opens the room as they start a worked example. Students can use their usual devices and submit “What would you try first?” while the lecture continues. A single handwritten line or an unfinished attempt is enough.
2. **Read the work.** For a photo, the agent shows the student its reading of the relevant line and asks them to clarify an ambiguous symbol. It compares the visible step with the professor’s approved solution or criteria, gives private feedback and accepts a revision. An unreadable image or a missing step stays unresolved.
3. **Show the professor where to focus.** The live view groups attempts by the step students took, counts distinct submissions and shows anonymous excerpts students agreed to share. The professor can inspect the supporting line, correct a grouping and use it during the usual explanation. They can revisit the summary before the next tutorial.
4. **Try a fresh problem.** The agent uses the approaches it saw to select a question from the professor’s approved set that distinguishes them. The first attempt is private and unscored. Students can earn a weekly point on the fresh in-class question and revisit the exercise afterward for practice.

For example, in Analisi I the class reaches `x² − x = 0` while finding stationary points. One notebook shows `x(x − 1) = 0` and both roots. Another shows “divide by x” and only `x = 1`. An illustrative tutor screen might read **“Of 12 submissions, 3 divided by x and showed only x = 1. Two photos still need clarification.”** The professor can ask, “Before we divide, which value do we need to check?” A student might have checked zero mentally or on another page, so the wording describes exactly what was visible.

### Why students might come back

A student can join the weekly standings under a chosen display name, see a friend one point ahead and choose a problem to catch up. Award one point per concept for a fresh answer and a checkable justification, capped at three concepts per week. A scoring item can ask for a result and the calculation that produced it. Use the approved answer key for points, keep open-ended feedback private, share tied places, and reset the standings each week. Every student gets the same questions and feedback whether they publish a score or keep it private.

### Specific uses

| When | What the student does | What the tutor gets |
| --- | --- | --- |
| **Last slide of a statistics lecture** | Two labs each test ten parts. Six pass in one lab and eight in the other. Students explain the pooled pass rate of 70%. Both averaging percentages and pooling counts work on this example. | If the submissions rely on different rules, change the sample sizes for the scored round. With six passes out of ten and 24 out of 30, the pooled result is 75%. Giving both labs equal weight still predicts 70%. The tutor sees whether to explain weighting. [Penn State's pooled proportion formula](https://online.stat.psu.edu/stat500/Lesson07) |
| **Before an Analisi I tutorial** | On the optional sheet, decide whether the function defined by f(0)=0 and f(x)=x sin(1/x) elsewhere is continuous and differentiable at zero. Feedback can recognize a valid continuity argument and ask the student to examine the difference quotient. | With permission, use two anonymous attempts in the planned correction. The variant x² sin(1/x), also defined as zero at zero, has derivative zero there. |
| **Between a mechanics lab and exam review** | Predict how tip deflection changes when a cantilever's length and rectangular section height both double, with load, width and material fixed. Then try doubling length alone. | Both linear and cubic reasoning predict unchanged deflection initially. The changed case predicts 2× or 8×, and the beam model gives 8×. The tutor can release this outside class or use it live. [Texas A&M lab manual, Lab 8](https://oaktrust.library.tamu.edu/server/api/core/bitstreams/4daebb22-e822-4a6e-a5de-a72023d64164/content) |

### What the council changed

The student reviewer argued for a real public competition and initially suggested teams contest three topic tiles. The faculty reviewer argued for using existing exercises and the correction the professor already intends to give. After discussing unequal team sizes, setup effort and the risk of penalizing learners who need a first revision, the council supported individual, optional weekly standings. The scout found that Wayground already offers rubric feedback on open answers and asynchronous homework with leaderboard options. Our design bet is that the class's explanations can produce a more useful next challenge and save the tutor time preparing the next correction. [Wayground open responses](https://help.wayground.com/support/solutions/articles/158000437795-question-type-open-ended) · [Wayground homework modes](https://help.wayground.com/support/solutions/articles/158000404919-async-homework-session-modes-on-wayground)

**Hackathon demo.** Give a judge a notebook and let them photograph their own attempt. Show the line the agent read, the matching group on the tutor screen, and the follow-up question that group prompted. A second judge can play that question for a leaderboard point. Use one course, one approved source and a few student devices. Label any preloaded responses or standings as examples.

**Pilot.** Give a tutor the option to post their existing exercise in two comparable tutorials. Check whether they voluntarily post again and whether the suggested example helped with the normal correction. Separately compare identical practice with standings shown or hidden. Count how many previously inactive students return and finish a fresh problem, then check an unaided problem in the next tutorial. A college study found its leaderboard did not meaningfully change optional practice. Motivation and adoption at PoliTO remain hypotheses. [University of Minnesota study](https://experts.umn.edu/en/publications/a-longitudinal-quasi-experiment-of-leaderboard-effectiveness-on-l/)

The [earlier council debate](DEBATE.md) develops the live peer-instruction format in more detail.

## Earlier shortlist

These seven concepts preceded the classroom proposal. **Case 4.00** was the first pick in that round for helping students start a study session.

| Rank and idea | Audience and first move | What the agent and tools do |
| --- | --- | --- |
| 1 · **Case 4.00** | A student putting off a programming or numerical methods lab sees an experiment in the course feed they already check. It estimates π as exactly 4.000. Their first click chooses whether to plot the points or rerun with a different seed. | From a notebook volunteered for practice, the agent finds a reproducible surprising output, saves the code snapshot and seed, and makes an editable copy. The student predicts and runs an edit. The original and revised outputs stay side by side. Seed the first case with an instructor-authored notebook. |
| 2 · **The Missing View** | A technical drawing student sees two different solids with matching silhouettes. They can request one view or cross-section to tell them apart. A lecturer can use it to check which information their own exercise actually supplies. | Given a small block model and the permitted views, the agent asks a geometry tool to search for a different solid with identical projections. It verifies the match and renders the student's requested cut. [McGill on choosing views and sections](https://www.mcgill.ca/engineeringdesign/step-step-design-process/basics-graphics-communication/projections-and-views) |
| 3 · **One Probe** | An electronics study group shares a sealed circuit. A peer has already measured its total resistance. Pick two terminals for the next reading and predict it. Each move leaves a lab result the next student can use. | The agent maintains a set of instructor-approved candidate circuits, runs a circuit solver, and eliminates only candidates inconsistent with the shared readings. A student can return hours later and still make one meaningful move. |
| 4 · **Calculus Duet** | One student moves a fingertip along a line. A partner sees only the velocity graph and tries to recreate the motion. Matching speeds can leave the fingers in different places. What information was missing? | The tool samples both position traces against time. The agent locates a segment where the motions agree in velocity but differ in position, then offers a replay with both starting positions visible. The students discover the role of the integration constant in their own gestures. |
| 5 · **Both Parts Passed** | Two mechanical design students each make a part within tolerance, yet the pin won't go into the hole. Pick which drawing to revise and predict whether the whole batch will now fit. | The agent reads the permitted ranges and runs a worst-case fit check. For a 10.0 ± 0.2 mm pin and a 10.2 ± 0.1 mm hole, a 10.2 mm pin and a 10.1 mm hole both pass inspection. The students must find a revision that guarantees their chosen clearance. |
| 6 · **Five Sources, One Witness** | A student in a research methods seminar sees five publications supporting a claim. A first move is to circle the two they think are independent. | The agent follows citations and text reuse in a curated source packet, attaches evidence to each proposed link, and asks the class to accept or challenge it. The class can trace five apparent confirmations to a shared source when the documents support that reading. Uncertain links stay open. |
| 7 · **Fork the Blackboard** | A TA wants to understand a wrong final answer. In a practice session, the student can rewind their own digital scratchpad, choose one line to change, and continue from there. | The agent compares the two time-ordered solutions, checks supported algebraic steps and highlights where the paths diverged. For example, replay the step that divided by a variable that might be zero. The TA can see what the student repaired independently. |

### Two reproducible demo seeds

- **Case 4.00.** Draw 1,000 pairs of uniform random numbers with Python's `random.Random(7)`. Accidentally scale both coordinates by 0.5 before testing whether each point lies in the unit quarter-circle. All 1,000 land inside and the standard estimate gives 4.000. Restoring the intended unit-square sampling range with the same draws gives 788 inside and an estimate of 3.152. Ask the judge what they expect to learn by changing the seed or plotting the sample. Test the study-start hypothesis by offering this case and a conventional link to the same exercise on different occasions. Observe whether students take an independent second step.
- **The Missing View.** Make two 2×2 arrangements of cube stacks with rows of heights `(2,1)/(1,2)` and `(1,2)/(2,1)`. Treat all given views as outer silhouettes. Both footprints fill the square, and both front and side silhouettes have heights `(2,2)`. A section through the front row reveals `(2,1)` or `(1,2)`. Restrict the prototype to voxel models so all these claims are directly checkable.

Games built around attacking other students' code already exist, and bridge-building games already support community-designed challenges. That precedent helped narrow this shortlist. [Code Defenders](https://www.code-defenders.org/) · [Poly Bridge 3](https://store.steampowered.com/app/1850160/poly_bridge_3/)

## Seven ideas for students and teachers

**Two to try first.** For a student-facing demo, try **Mi sono perso qui** during one Analisi I derivation. For a teacher-facing demo, try **Two correct answers** with one programming assignment. The first depends on whether students can recover their place while the lecture continues. The second can produce an executable example of a problem in the assignment itself.

### Ideas to explore with students with ADHD

Students in a university lecture-capture study described revisiting particular passages to recover material they had missed. A separate interview study of 25 STEM majors with ADHD and/or specific learning disabilities examined their experiences with active learning. These are starting points for design conversations. Ask PoliTO students which situations they recognize, invite them to change the interaction, and make it available to anyone who wants it. [Lecture-capture study](https://link.springer.com/article/10.1007/s10734-024-01201-5) · [STEM student interviews](https://pubmed.ncbi.nlm.nih.gov/36525283/)

| Idea | Classroom moment and agent action | What to test |
| --- | --- | --- |
| **Mi sono perso qui** (“I got lost here”) | A student follows line 3 of a derivation, loses line 4, and the lecturer is already at line 7. They tap the last line they understood. Using the lecturer’s worked example, the agent identifies the missing operation, links the relevant lines and asks for one move that lets the student rejoin. | Try it on rationalizing a numerator. Can the student explain why multiplying by the conjugate over itself preserves the expression, then follow the current line? Does finding the recovery card itself cost them another step? |
| **Riparto da qui** (“I’ll pick up here”) | After an interruption, a student can see their unfinished solution but has forgotten what they were deciding. On pause, the agent turns their selected lines and a few words into an editable bookmark. On return it restores the open decision, e.g. “I found the left-hand limit. What do I still need to check?” | Compare it with bookmarking the page. Can the student resume the right step unaided, and is saving the bookmark less work than restarting? |
| **Before we compare** | In a circuits lab, one partner announces an answer before the other has formed a prediction. Each gets private thinking time. With both ready, the agent finds where their predictions diverge and configures one simulation to test it. | Add a second bulb in parallel across an ideal voltage source. Do both partners explain what happens to current through the original bulb and distinguish it from total current? |

### Ideas for lecturers and TAs

| Idea | Classroom moment and agent action | What to test |
| --- | --- | --- |
| **Two correct answers** | Before publishing a programming lab, the lecturer asks for the “second-largest reading.” The agent writes two plausible interpretations and runs both on a small input. For `[9, 9, 4]`, the second sorted entry is 9, while the second distinct value is 4. The lecturer chooses the intended rule and keeps the example as a test. | Can a TA confirm that both readings fit the original assignment and that the revised sentence resolves the disagreement? |
| **Rubric twins** | Two TAs disagree about how much a lab conclusion deserves. The agent builds pairs of synthetic answers from their rubric. One pair expresses the same reasoning in terse and polished prose. Another changes exactly one scientific claim. The TAs mark them independently, compare decisions and revise the disputed criterion. | On fresh, instructor-checked pairs, do graders agree when reasoning is equivalent and still catch a genuine scientific error? [University of Iowa on grader calibration](https://pressbooks.uiowa.edu/teaching-handbook/chapter/grading-fairly/) |
| **Rehearse office hours** | A new TA knows how to solve a problem but hasn't practised eliciting a student's reasoning. Give the agent a TA-approved sample mistake, such as dividing both sides of `x² = x` by `x` and losing the zero solution. The TA has two questions to uncover the assumption. The simulator returns a transcript with the point where the student first explained their move. | Have an experienced TA judge whether the questions exposed the assumption or supplied the missing root. The simulated exchange is rehearsal material. |

### One for a design studio

**The entrance test.** An architecture student hears “the entrance is unclear” during critique and has to decide what to redraw. They mark their intended entrance on a floor plan. Three classmates independently click where they would enter. The agent overlays the anonymous marks, ties the critique to a specific part of the drawing and sets up the same task for a revised plan with fresh readers. Compare the before-and-after clicks. The peers provide the evidence and the designer chooses the revision.

## What should we build for Analisi Matematica I?

I’d test **Salva la risposta** (“save your answer”) first. A PoliTO student picks the wrong option on a practice quiz. Their challenge is to change one thing in the question that would make their original answer true. Then they have to explain why the change worked.

The audience is first-year students revising for the quiz portion of Analisi I described by the team. The open question is whether a student who follows a worked correction can recognize the same mathematical condition on a fresh problem. That is a hypothesis to test with classmates. PoliTO’s *Palestra di analisi matematica 1* already describes 430 multiple-choice questions with explanations. ChatGPT can also turn prior quizzes into practice questions and answer explanations. These are credible baselines. [PoliTO publication record](https://iris.polito.it/handle/11583/2991781) · [Official OpenAI exam-study guide](https://learn.chatgpt.com/use-cases/build-exam-study-system)

### A demo a judge can play

1. **Answer.** For `f(x) = x³`, is the origin a local minimum, a local maximum, or neither? Suppose the student picks “minimum” and says “the derivative is zero.”
2. **Change one thing.** Keep the point, the answer, and the coefficient. Let the student change the exponent to another integer greater than one. Choosing 4 makes “minimum” true. Choosing 5 leaves the original mistake intact.
3. **Defend the edit.** Ask what happens immediately to the left and right of zero. Both derivatives vanish at zero. The cubic rises through the origin, while the quartic falls and then rises. The student supplies that distinction. A sign table offers the same evidence as the graph.
4. **Try it cold.** On a fresh card, classify the origin for `g(x) = −x⁴` and justify it without a hint. Someone who inferred “even exponent means minimum” now has a chance to discover the limits of that shortcut. [Course reading on derivatives and extrema](https://www2.math.uconn.edu/ClassHomePages/Math1071/Textbook2/sec_Ch4Sec5.html)

**What the agent actually does.** It interprets the student’s reason, selects a follow-up that could distinguish plausible explanations, and runs a mathematical check on the submitted edit. Start with the family `a·xⁿ` for nonzero real `a` and integer `n ≥ 2`. An exact parity-and-sign rule can verify every allowed edit. The student can correct the agent’s interpretation. If a reason is ambiguous, ask one clarifying question. Save the original choice, attempted edit, and unaided follow-up under a local session ID so the learner can revisit what changed.

**What is original here?** Changing assumptions to pose a new problem is an established teaching method. Our proposed contribution is turning the student's *specific distractor* into a construction task with an exact check and a fresh test of the rule they used. A teacher can run the exercise on paper. The reason to use AI is to respond to unexpected explanations in students’ own words and choose a relevant next challenge. Whether that adds enough value over a fixed sequence is an open design question. [University account of mathematical problem posing](https://azimpremjiuniversity.edu.in/news/2023/mathematical-doodling-using-the-what-if-not-approach)

### Three other directions worth testing

| Idea and audience | Problem in a real teaching moment | Smallest demo and evidence of learning |
| --- | --- | --- |
| **Il Bivio** (“the fork”) · Analisi I students reviewing a practice quiz | Two people correctly say that the derivative of `\|x\|` at zero does not exist. One checked the slopes. The other thinks absolute-value bars *always* create a corner. Both get the same mark. | Ask for one sentence of reasoning. Give the second student `\|x²\|` at zero and ask for a prediction. Give the first a piecewise function with different one-sided slopes at another point. Count who can justify the answer unaided. |
| **Which example should I draw?** · An Analisi I TA leading a tutorial | A room agrees that a particular continuous function is differentiable. The TA cannot see who thinks continuity *guarantees* differentiability. | Students anonymously submit one reason. The agent groups the claims and proposes a pair of graphs that look alike except near one point. The TA checks the pair and runs a second vote. Check how many students can now construct a continuous function with a corner. |
| **One Last Run** · First-year physics lab partners | Two explanations both fit their pendulum timings. Following the next line in the manual gives the pair little practice deciding which measurement would settle the disagreement. | Give them one simulated run to spend. They choose an angle and predict what each model would show. The agent translates their plan into simulator settings and logs the prediction before revealing the reading. On a second trial, check whether they account for timing uncertainty when choosing the measurement. [Research on university pendulum labs](https://journals.aps.org/prper/abstract/10.1103/6g9j-s2cm) |

### What to borrow from previous winners

- **ChatEDU** won first place in the technical category at Microsoft’s 2024 AI Classroom Hackathon. It turned supplied text into personalized study material and tests. For Reply, spend the demo on what the learner does *after* seeing a result. [Microsoft’s winners](https://www.microsoft.com/en-us/education/blog/2024/05/meet-the-winners-of-the-microsoft-ai-classroom-hackathon/)
- **Dyscover** won Wharton’s 2025 education track. The team worked backward from a teacher deciding how to support a learner, using handwriting samples to inform a suggested teaching response. This inspired the TA idea above. Which graph should they draw in the next two minutes of class? [Wharton’s account](https://ai-analytics.wharton.upenn.edu/news/fighting-dyslexia-breaking-chatbots-inside-the-winning-projects-of-whartons-2025-hack-ai-thon/)
- **AccessLens** won first place at Utah’s Minds and Machines hackathon. It presented an instructor-approved lesson in several synchronized formats. For our demo, let students inspect either a graph or a keyboard-readable sign table and answer the same mathematical question. [University of Utah’s results](https://attheu.utah.edu/facultystaff/students-build-ai-powered-solutions-for-education-at-minds-and-machines-hackathon/)

### First test at PoliTO

Ask a TA for one practice item they can share and the two explanations they have actually heard for the same wrong answer. Ask four classmates to recall their last missed quiz question and show how they decided they understood the correction. Use a team-authored item for the public demo.

Try two matched questions per person. On one, give the usual worked explanation. On the other, give the one-edit challenge. Swap the order and topic assignment across classmates. After each, give a fresh unaided question. Record the answer and whether the student can name the decisive condition. Report the counts and one example of reasoning that changed. Four classmates can expose a confusing interaction. A learning-impact claim would need a larger test.
