# QAI · Presenter notes

## One minute, no slides

In an Analisi I tutorial, the professor works through a limit on the board. A student gets 42. Did they drop a constant, make an arithmetic mistake, or just guess? The number alone can’t tell the professor what to explain.

QAI lets the professor open a question from their own worksheet. Students scan a QR code and send a line of reasoning or a photo of their working. Each gets private feedback. The professor sees which steps the class struggled with.

We tried six simulated answers. Two students showed work that dropped the eight. A third sent only “42.” QAI identified the missing eight in the first two and asked the third for a step.

Our next test is one real tutorial. We want to see whether that report changes what the professor writes on the board.

## Finalist presentation · five minutes including the demo

| Elapsed | Presenter action |
| --- | --- |
| 0:00–0:35 | Open with the 42 example. Ask the audience what went wrong, then reveal that they need to see the working. |
| 0:35–1:15 | Show the two lines of calculation on slide two. Identify the first-year student and the tutor who must decide what to teach while class is still in session. |
| 1:15–2:40 | Switch from slide three to the private professor screen. Upload the demo worksheet, select question one, review its wording and open it. Project the QR. On a separate phone, type “I substituted 2 and got −6 + 48 = 42,” or choose Whiteboard and draw the same line. Submit the response. Show the private feedback. |
| 2:40–3:35 | Close the question and show the anonymous report. For a room with few participants, use **View example report** on the professor home screen. Say explicitly that the example contains six synthetic responses. |
| 3:35–4:20 | Show how the agent checked the evidence and where it deferred. For an architecture question, show the bounded tool loop in the worked-step notebook. |
| 4:20–4:50 | Describe the proposed pilot. Leave ten seconds for transitions. |

**Pitch shortcut.** In the professor portal choose **Run demo with 10 mock answers**. The rehearsal uses the [exact example question](demo-question.png). Expand **See all 10 mock answers** to compare the simulated working and private feedback. Reopening the result reuses the same reviewed batch. Real class responses and participation points stay separate.

## Rehearsal and handoff

Before presenting, open the professor link on the laptop, the projector in a second tab, and the student room on a phone. Wake the hosted service, test its QR and confirm the photo option is available. Keep the professor access link off the projector. Keep the PDF deck and example report available locally. If connectivity fails, use the local rehearsal and explain which outputs are simulated.

If asked about impact, report the synthetic evaluation as a software test. The proposed pilot recruits one Analisi I tutor and five first-year students. Before the round, record the step the tutor planned to explain. Afterwards, record which step they actually taught and why. Use a fresh problem to check transfer. Participation, changes in teaching decisions and independent transfer are the proposed measures.

## Questions from judges

**Why would a professor use this during an exercise class?** The tutor can bring an existing sheet, open one question during the usual working time, and use the report when they would normally discuss the solution. The pilot measures whether this changes a teaching decision.

**Why does this need AI?** Two students can select the same answer for different reasons. The professor cannot predefine every explanation students might type or photograph. The model interprets those attempts against the approved reference. The application synchronizes everyone and counts each response once.

**What happens when the evidence is thin?** In the six-response test, “42” received a request for the missing step. A student who explicitly omitted the constant received feedback naming the 8. A professor decides what to teach, and students earn participation credit for making an attempt.

**Who could be left out?** Students can type instead of using a camera and can participate anonymously. An unreliable connection or unclear handwriting can still prevent useful feedback. In the pilot, count students who could not join or finish as well as those who submitted.
