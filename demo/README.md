# Run the Solution Room demo

## Play the simulated classroom

Run `npm ci` and `npm run demo`. Open the private presenter link printed in the terminal. Put **Project exercise** on the classroom display. The QR opens `/join` directly. Students can scan from a phone or open the student link on a second device without typing a code or creating an account.

1. Click **Preview likely mistakes** while the room is empty. These are prepared hypotheses. For a solo rehearsal, **Load example class** adds three explicitly labeled classmates.
2. On a phone, tap **Try a sample notebook**, choose **Divide by x** and send the page. Inspect its scripted reading and private hint. Revising with **Factor first** changes the group without adding another participant. Visitors can also type or upload their own step. The simulation uses simple rules for text and leaves unfamiliar photos for the tutor to review.
3. The tutor checks the anonymous steps and opens the recommended challenge. A division error selects a new equation where canceling the variable loses a root. With a class that kept both roots, the alternative changes the factors. The released question stays fixed as more submissions arrive.
4. A student chooses an answer and a reason, earns at most one point, and can use an alias in **Standings** or open **Study**. Prepared scores carry an example label. The tutor sees audience results separately and can **Start a fresh round** to replay with the same QR.

This mode never calls a model, even if a key is configured. `npm run live` runs the same classroom with the server-side model for forecasting and submission analysis; it requires `OPENAI_API_KEY`. Live mode has no scripted notebook or seeded classmates. In both modes the server groups actual submissions and selects an approved follow-up. For the challenge, rehearse the live agent separately with real handwriting.

### Put the simulation on Render

Use [Deploy the demo on Render](https://render.com/deploy?repo=https://github.com/iiMaximus/reply_hackathon). The repository’s blueprint starts one free Node web service with `npm run demo`. After the deploy completes, open the private **Professor** link from the service logs. Share the public service’s `/join` or project its `/board`; the QR uses Render’s service URL. The free service may take time to wake up, so open it before presenting. Room state is in memory and clears on a process restart; the student URL stays the same. [Render deployment button](https://render.com/docs/deploy-to-render) · [Render environment variables](https://render.com/docs/environment-variables) · [Free service behavior](https://render.com/docs/free)

The first customer to approach is the teaching assistant who leads a first-year engineering **Analisi I esercitazione at PoliTO**, works through an exercise sheet on the board and has to decide which algebra step deserves class time. The first student is the first-year engineering student already copying that solution into a notebook or tablet, who has a partial line but would hesitate to raise a hand. The course coordinator is the person to approach about a second group after a TA asks to run it again. These are pilot hypotheses.

## Start with the proof of concept

From the repository root, run `npm ci` once, then `npm run poc`. Open the private tutor link it prints and click **Project the exercise**. Students on the same Wi-Fi scan the QR, try the Analisi I question and send one photo or typed step. The tutor sees the actual steps, provisional groups and the number of distinct submissions. A revision replaces the previous step. This room runs separately on port 4174 (override with `POC_PORT`).

With a server-side API key, photos and text get live analysis. In rehearsal, the tutor reads photos directly and a few prepared rules group typed answers. The form tells students who can see their work. Photos are available only on the private tutor screen, held in memory until replaced or the room restarts.

**Five-minute trial.** Invite one Analisi I tutor and five first-year students. Before showing the summary, have the tutor jot down what they planned to explain next. Project the exercise, start a timer, and invite each student to send the next line they would actually write. Avoid seeding mistakes or coaching anyone through the UI. At 90 seconds, record the number who sent a step unaided, including anyone who never joined. Ask the tutor to teach the next line as usual. Write down what they actually explained, which submission informed it, and whether they would bring another exercise.

**Decision for the team.** Try a second tutorial if at least three of the five sent a step unaided within 90 seconds and the tutor can point to a submission that influenced what they explained or skipped. If participation was low, ask the non-submitters what got in the way. If the tutor learned nothing useful, try a problem from their own sheet once before adding features. These are proposed pilot thresholds. A rehearsal can test classroom usefulness; a live-key trial with real handwriting is needed to assess AI reading quality.

## Start a room

Use Node 22.9 or later. From the repository root:

~~~sh
npm ci
npm start
~~~

The terminal prints a **private professor link** and a **student link**. Open the professor link on the presenter laptop. Put its **Open projector view** tab on the classroom display. That view shows a large QR code, the exercise and any released challenge. Phones can join from a browser on the same reachable Wi-Fi or personal hotspot. No install, login or student API key. If the venue isolates devices, use a reachable HTTPS origin for the running server and set PUBLIC_ORIGIN to that origin before startup. Try the QR on a real phone in the room before presenting.

For live handwriting analysis, copy [.env.example](../.env.example) to `.env`, set OPENAI_API_KEY on the server and restart. The default model is `gpt-6.1-terra`. Choose another supported image-input model with OPENAI_MODEL if needed. Each fresh server starts a new room. Never put the professor link, a key or a real student’s page on a shared slide. [Terra model](https://developers.openai.com/api/docs/models/gpt-6.1-terra) · [Image input API](https://developers.openai.com/api/docs/guides/images-vision)

## What to demo in three minutes

| Time | Audience sees | Presenter does |
| --- | --- | --- |
| 0:00–0:30 | A real QR and a blank room | Open the Analisi I exercise already on the projector. Click **Suggest likely mistakes**. Show one prediction, such as dividing away a possible zero, alongside the observation count of zero. |
| 0:30–1:20 | A judge’s own handwriting on their phone | Ask two people to join. One sends the line they would write next, by photo or text. For a rehearsed contrast, invite a teammate to type “divide by x, x=1”; label them as the teammate playing a student. Sharing the anonymous excerpt is optional. |
| 1:20–2:00 | Counts change and the professor has a decision | Inspect an actual step, ask “When is that division valid?” and correct a group if needed. A student can amend an unclear reading. Show that one revision updates the existing count. |
| 2:00–2:40 | The next question appears on every phone | Open the recommended fresh problem. An answer and a checkable reason together earn a point. A player can choose an alias and appear in the standings. |
| 2:40–3:00 | An individual study task | Open **Study** on a phone. A short worked example lets the student practice the same idea after class. Close by asking the TA to bring one problem from next week’s sheet. |

The professor can generate a forecast before anyone joins. A forecast is a possible mistake, a line of work that might reveal it, and a question the professor might ask. Only actual student submissions increment the observation counts. The prepared course card uses an original exercise for practicing the method in OpenStax Calculus Volume 1, §4.3. An authentic PoliTO sheet and its tutor’s criteria are the next inputs for a campus pilot. [Course reference](https://openstax.org/books/calculus-volume-1/pages/4-3-maxima-and-minima)

## Architecture and fallback

- **Student phone.** A browser session holds an anonymous room identity. A student submits one typed step or a photo resized on-device, receives a private question, can revise, plays the professor’s fresh question and can review the concept afterward.
- **Professor laptop.** One screen shows the QR, a forecast for preparation, observations with counts, opt-in anonymous excerpts, a correction control and a recommended question. The professor decides when to open the challenge.
- **Room server.** One Node process holds the current room in memory. Browsers poll every 1.5 seconds. A revision replaces the student’s previous attempt. The server chooses a follow-up from two prepared variants and checks the answer and reason against its key. A student can earn one point for this demo concept. Restarting clears the room, photos are not saved to disk, and semester-long standings are outside this prototype.
- **Model.** A server-side Responses API call reads the exercise, reference criteria and submitted work. It returns the relevant line, a provisional group and a hint. Forecasting is a separate request with the same criteria and no student submissions. Neither request receives student aliases.
- **Rehearsal.** Without a key, after a failed model request or when the presenter switches modes, the shared room, counts, scoring and QR keep working. Rehearsal uses two labeled prepared forecasts and a small set of rules for typed steps. For an arbitrary photo, it asks the student to type the relevant line. Rehearse “divide by x, x=1” and “x(x−1)=0, x=0 and x=1” to demonstrate both groups. With no venue internet, keep the laptop and phones on one reachable hotspot.

Run `npm test` to check independent participants, revisions, privacy, adaptive follow-up selection, idempotent scoring and the live-provider request contract with a simulated response.

## How to introduce it at PoliTO

The invitation to the TA is **“Bring one exercise you already teach. We’ll show you the line your class gets stuck on while you’re still at the board.”** Approach one Analisi I tutor through a student representative or an exercise-session coordinator. Set up their exercise ahead of time, let them use their usual correction, and ask whether they would voluntarily use it for the following sheet. The student invitation on the closing slide can be **“Snap the step you’re on. See what the class tries next.”** Offer a weekly round if the tutor repeats.

For the pilot, record time from scanning the QR to first submission, whether the tutor used an observed step to change their explanation, and whether they bring a second exercise without prompting. Ask students who usually copy the solution whether they actually attempted a step. For the competition, compare voluntary participation and fresh-problem completion with the board visible and hidden. These are proposed measures, not results.
