# QAI

QAI helps a university tutor decide which step to explain next. During an Analisi I exercise, students can arrive at 42 by dropping a constant, by making an arithmetic error, or by guessing. QAI reads their working, gives each student private feedback, and shows the professor which mistakes appeared across the room.

**Reply Student Tech Clash 2026 · AI on Campus · Coding track**

[Student room](https://solution-room-demo.onrender.com/join) · [Projector and QR](https://solution-room-demo.onrender.com/board) · [Finalist slides](submission/QAI.pdf) · [Editable PowerPoint](submission/QAI.pptx)

## Submission materials

| Judges’ deliverable | Where to find it |
| --- | --- |
| Problem, audience, proposed impact, one-minute pitch and five-minute demo plan | [Presenter notes](submission/pitch.md) |
| Working prototype, setup, models and architecture | [Technical guide](demo/README.md) |
| Example interactions, including uncertainty | [Six synthetic responses and their actual feedback](submission/classroom-evaluation.md) |
| Sample questions for a live demonstration | [Two-question worksheet](submission/demo-worksheet.md) |

## Run a classroom

Use Node 22.16 or newer. Run `npm ci` and `npm start`. The server prints a private professor link. Open it on the instructor’s laptop and project the public QR. Students join from their phones without a room code.

For live Luna feedback and direct photo review, copy `.env.example` to `.env`, set the server-side `OPENAI_API_KEY` and restart. With no key, the local model supports text and course examples. For a deterministic rehearsal use `npm run demo`. On the hosted service the organizer holds the professor link.

Upload the sample worksheet. Select one question, open several as one shared response, or release them one at a time. Preview Markdown and LaTeX before publishing. A student can type a step or submit a photo. Private feedback labels the reasoning correct, incorrect or unassessed. My work shows the percentage correct across assessed questions saved on that browser. Close the question for a class report, a worked teaching example and a fresh check. **View example report** on the professor home page opens the saved synthetic class.

## Evidence

The live evaluation exercised correct reasoning, two different omissions of the constant, a correct number reached with an invalid rule, and an unsupported answer. The prototype also reviewed an image of a weighted-mean calculation. Student learning gains still need a real classroom pilot. [Live evaluation](https://github.com/iiMaximus/reply_hackathon/actions/runs/42384041491) · [Pilot measures](submission/pitch.md)
