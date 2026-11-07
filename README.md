# reply_hackathon

Reply Student Tech Clash 2026 · AI on Campus

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
