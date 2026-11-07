# Run Showwork

## Run an open question

Run `npm ci`, `npm run model:prepare` and `npm run classroom`. Open the professor link printed by the server. On the hosted demo use your private professor link, project `/board`, and join `/join` from a phone. The student waits until a professor publishes. Every screen receives the same question and any image the professor explicitly included.

Choose a photo, PDF worksheet, text file, or course example. On a worksheet with several pages, select the page, then select or edit the exercise. Showwork extracts embedded PDF text first. It can also read printed English or Italian text using local OCR. Review symbols, wording, and any reference answer before publishing. Keep an answer key private by leaving **Also show this image to students** unchecked. A file can be up to 16 MB. The browser loads PDF.js and Tesseract only for file handling. The worker and language models are served by this app. Handwriting, diagrams and complex notation may need correction.

**Rehearsal:** choose the mechanics example, review it, and open it. On one phone, write that doubling the length and section height cancels the two cubic factors. On another, explain that you used a linear L/h rule. Check each phone’s feedback and the professor’s live counts. Revising replaces that phone’s response. Closing produces an anonymous report. Only the instructor can publish a new question. Student work is saved in the same browser; server room state resets on a service restart.

The local MiniLM encoder compares written explanations with instructor-reviewed patterns. Weak matches are flagged for discussion. With no reference, results describe the kind of attempt. The selections are formative signals, not grades. With a Render environment variable `OPENAI_API_KEY`, `gpt-6-luna` can read material, draft a reference, review a student response, and suggest a teaching move from anonymous counts. Set `OPENAI_QUIZ_MODEL` to override it. Requests are capped at 30 per server process per UTC day and fall back to local analysis when unavailable. The separate GitHub Actions provider check uses the repository secret `OPENAI_KEY`.

The open classroom emits update notifications when a professor opens or closes a question and when a response is received or reviewed. Each viewer then fetches only their authorized state. A polling fallback also refreshes the room. The projector shows only the question and response count. The instructor receives aggregate categories. The student receives their own text and feedback. Test with `npm test` and `npm run test:model`.

## Play the worked-step notebook

[Student notebook](https://solution-room-demo.onrender.com/join?view=notebook) · [Notebook projector and QR](https://solution-room-demo.onrender.com/board?view=notebook)

Submit `f′(x)=2+x²` or click the example line. The server runs MiniLM on the text to retrieve a likely course strategy. A separate algebra tool reads the polynomial and tests it against the derivative of the original curve. At x = 2, the proposed slope is 6 and the curve’s slope is 2. The figure shows the curve and the tangent implied by the student’s line. Move the test point to −2: the slopes happen to agree there. Revise to `f′(x)=x²−x` and see the comparison, hint and proposed follow-up change.

Each receipt explains what actually ran. The tutor sees the tested mismatch and can publish a fresh power-rule problem. Audience work takes precedence over the six labeled rehearsal examples. The local model retrieves English reasoning strategies; it does not generate prose, recognize arbitrary handwriting or prove algebra. Unsupported expressions or unclear photos go to the tutor. Prepared notebook pages have known transcriptions.

**Run locally:** Node 22, then `npm ci`, `npm run model:prepare`, `npm run classroom`. The Render build performs the same download at a pinned revision and checks the model’s SHA-256. All inference happens on the server; phones download no model and student text does not go to a third party in this mode. The quantized weights are about 23 MB. [Original MiniLM model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) · [ONNX conversion and license](https://huggingface.co/Xenova/all-MiniLM-L6-v2) · [ONNX Runtime](https://onnxruntime.ai/)

**Three modes:** `npm run classroom` runs the local encoder plus the decision policy and tools. `npm run demo` is a deterministic backup with the same slope check. `npm run live` uses OpenAI function calls and image input when a server key is configured. To evaluate the real local model, run `npm run test:model` after downloading the weights. `npm test` independently tests symbolic equivalence, counterexamples, tool limits, room state and privacy.

## Play the simulated classroom

Run `npm ci` and `npm run demo`. Open the private presenter link printed in the terminal, then open `/present?view=notebook` in the same browser. Put **Project exercise** on the classroom display. The QR opens `/join` directly. Students can scan from a phone or open the student link on a second device without typing a code or creating an account.

1. On the tutor laptop, open the seeded exercise. Six labeled example notebooks show four approaches. Compare Noor’s proposed derivative with the curve, then inspect Elena’s cancellation, then look at Teo’s incomplete sketch reference under **Needs a closer look**. **Review history** shows how each step was handled. The tutor can correct a group. **Prepare for the exercise** contains possible mistakes, kept separate from submitted work.
2. On a phone, tap **Try a sample notebook**, choose Noor’s, Elena’s, Luca’s or Sam’s page, and send it. Read the private hint or revise. A repeat attempt in the same reasoning group gets a different approved hint. A typed step or a real uploaded photo can also be sent; the rehearsal asks the tutor to read unfamiliar handwriting.
3. On the tutor screen, **What to cover next** shows what triggered the suggestion. Discuss the missing zero case, then choose **Open challenge on phones**. The class sees a fresh equation. A student who kept the roots can still participate. Switching groups or editing an answer does not change a question already published.
4. Students answer and justify the fresh question, earn at most one point and can opt into **Standings**. **Study** offers a different practice problem for a missed root, a partial derivative setup, or a correct factorization. The tutor sees actual audience results separately from prepared scores. **Start an empty round** clears workshop data if you want a real audience-only trial.

The simulated classroom runs the same agent tools and bounded orchestration as the live classroom, using a deterministic planner. It never calls OpenAI. For live handwriting and free-text interpretation, put `OPENAI_API_KEY` in the server environment and run `npm run live`. The default is `gpt-6.1-terra`; `OPENAI_MODEL` can select another image- and tool-capable model. Live rooms open empty. The keyless simulation and the provider protocol have been tested; live model quality still needs checking with actual class handwriting.

### How the classroom agent works

One Node server runs the phone, tutor and projector views. QRCode generates the join code. The agent uses Node’s built-in fetch and the OpenAI Responses API. A student’s input is the exercise, one typed or photographed step, and their last approved hint for this lesson, if present. The course knowledge is a small pair of locally curated cards grounded in OpenStax Calculus Volume 1 §4.3 and the demo exercise rubric. The cards link back to the source. [Course reference](https://openstax.org/books/calculus-volume-1/pages/4-3-maxima-and-minima)

| Decision | Application behavior |
| --- | --- |
| Interpret a submitted line | `match_strategy` embeds the text with MiniLM, compares it with teacher-written reference explanations, and abstains on weak or close matches. An explicit derivative claim invokes `check_slope`, which compares polynomial coefficients and returns a numeric witness. |
| Look up the relevant concept | `lookup_course` returns a card with the criteria, allowed reasoning groups, hint choices and follow-up choices. |
| Avoid repeating an unhelpful question | `recall_practice` returns the last group and hint for this participant on this browser. The server stores only two allowlisted IDs in a 30-day HTTP-only cookie in a separate namespace for the rehearsal. The cookie is an untrusted preference. It cannot change scores, authorize an action or count as classroom evidence. |
| Record an observed step | `record_step` returns a validated observation to the room handler. The handler replaces the student’s prior attempt, remembers the chosen hint and makes the proposed follow-up available to the tutor. Only a tutor’s release action can publish the question. |
| Ask for help | `ask_tutor` sends an unclear or unsupported step to the tutor. An explicit answer request receives a first-step question. An outage, unknown tool, invalid evidence or exhausted budget cannot publish a grade or manufacture a diagnosis. |

The classroom orchestrator allows up to five decisions, one tool call per decision, within a 25-second run. Intermediate tool results are fed back into the next request, including the returned reasoning items required for stateless Responses calls. Evidence from typed work must quote an actual line. For a photo, the live model proposes a transcription: the student and tutor can correct it. Only approved hint text is returned. Each decision emits a structured event with a run ID, action and outcome; logs exclude student text, photos, aliases and private model reasoning. The student’s current review and redacted trace are replaced on revision; the browser hint preference survives a fresh room. [Versioned prompt](agent/instructions.md) · [Agent loop](agent/orchestrator.mjs) · [Provider adapters](agent/providers.mjs) · [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling)

### Example interactions and evaluation

- Elena’s sample divides by x. The agent looks up **Preserving roots**, checks the previous hint and records the missing zero case. The student sees “Which values of x allow the division you used?” Submitting it again yields a different question. The tutor can release the *Keep every root* problem.
- Sam submits a valid derivative but stops there. The agent retrieves **Horizontal tangents**, acknowledges the setup with a question about slope and selects concept-specific private practice. It makes no claim of mastery.
- “Give me the final answer” routes to a tutor and invites a first operation. An ambiguous page stays unresolved. The model cannot award points or directly send anything to the projector.

Run `npm test` for the offline evaluation: notebook traces, repeated hints, clarification, answer requests, forbidden tools, fabricated evidence, bounded retries, provider failure, Responses tool round trips, the hosted room workflow and photo access. Add a small set of tutor-labeled photos before evaluating a real model with your key.

### Put the simulation on Render

The Render blueprint generates a private presenter secret so the tutor can bookmark their presenter link across service restarts. Keep that link on the tutor laptop; the projector and student URLs are public.

Use [Deploy the demo on Render](https://render.com/deploy?repo=https://github.com/iiMaximus/reply_hackathon). The repository’s blueprint starts one free Node web service with `npm run classroom`. After the deploy completes, open the private **Professor** link from the service logs. Share the public service’s `/join` or project its `/board`; the QR uses Render’s service URL. The free service may take time to wake up, so open it before presenting. Room state is in memory and clears on a process restart; the student URL stays the same. [Render deployment button](https://render.com/docs/deploy-to-render) · [Render environment variables](https://render.com/docs/environment-variables) · [Free service behavior](https://render.com/docs/free)

The first customer to approach is the teaching assistant who leads a first-year engineering **Analisi I esercitazione at PoliTO**, works through an exercise sheet on the board and has to decide which algebra step deserves class time. The first student is the first-year engineering student already copying that solution into a notebook or tablet, who has a partial line but would hesitate to raise a hand. The course coordinator is the person to approach about a second group after a TA asks to run it again. These are pilot hypotheses.

## Start with the proof of concept

From the repository root, run `npm ci` once, then `npm run poc`. Open the private tutor link it prints and click **Project the exercise**. Students on the same Wi-Fi scan the QR, try the Analisi I question and send one photo or typed step. The tutor sees the actual steps, provisional groups and the number of distinct submissions. A revision replaces the previous step. This room runs separately on port 4174 (override with `POC_PORT`).

With a server-side API key, photos and text get live analysis. In rehearsal, the tutor reads photos directly and a few prepared rules group typed answers. The form tells students who can see their work. Photos are available only on the private tutor screen, held in memory until replaced or the room restarts.

**Five-minute trial.** Invite one Analisi I tutor and five first-year students. Before showing the summary, have the tutor jot down what they planned to explain next. Project the exercise, start a timer, and invite each student to send the next line they would actually write. Avoid seeding mistakes or coaching anyone through the UI. At 90 seconds, record the number who sent a step unaided, including anyone who never joined. Ask the tutor to teach the next line as usual. Write down what they actually explained, which submission informed it, and whether they would bring another exercise.

**Decision for the team.** Try a second tutorial if at least three of the five sent a step unaided within 90 seconds and the tutor can point to a submission that influenced what they explained or skipped. If participation was low, ask the non-submitters what got in the way. If the tutor learned nothing useful, try a problem from their own sheet once before adding features. These are proposed pilot thresholds. A rehearsal can test classroom usefulness; a live-key trial with real handwriting is needed to assess AI reading quality.

## Start a room

Use Node 22.16 or later. From the repository root:

~~~sh
npm ci
npm start
~~~

The terminal prints a **private professor link** and a **student link**. Open the professor link on the presenter laptop. Put its **Project exercise** tab on the classroom display. That view shows a large QR code, the exercise and any released challenge. Phones can join from a browser on the same reachable Wi-Fi or personal hotspot. No install, login or student API key. If the venue isolates devices, use a reachable HTTPS origin for the running server and set PUBLIC_ORIGIN to that origin before startup. Try the QR on a real phone in the room before presenting.

For live handwriting analysis, copy [.env.example](../.env.example) to `.env`, set OPENAI_API_KEY on the server and restart. The default model is `gpt-6.1-terra`. Choose another supported image-input model with OPENAI_MODEL if needed. Each fresh server starts a new room. Never put the professor link, a key or a real student’s page on a shared slide. [Terra model](https://developers.openai.com/api/docs/models/gpt-6.1-terra) · [Image input API](https://developers.openai.com/api/docs/guides/images-vision)

## What to demo in three minutes

| Time | Audience sees | Presenter does |
| --- | --- | --- |
| 0:00–0:30 | A real QR and six labeled examples (or an empty live room) | Open the Analisi I exercise on the projector. In the tutor view, expand **Prepare for the exercise** and click **Preview likely mistakes**. Show one prediction, such as dividing away a possible zero, alongside the observation count of zero. |
| 0:30–1:20 | A judge’s own handwriting on their phone | Ask two people to join. One sends the line they would write next, by photo or text. For a rehearsed contrast, invite a teammate to type “divide by x, x=1”; label them as the teammate playing a student. Sharing the anonymous excerpt is optional. |
| 1:20–2:00 | Counts change and the professor has a decision | Inspect an actual step, ask “When is that division valid?” and correct a group if needed. A student can amend an unclear reading. Show that one revision updates the existing count. |
| 2:00–2:40 | The next question appears on every phone | Open the recommended fresh problem. An answer and a checkable reason together earn a point. A player can choose an alias and appear in the standings. |
| 2:40–3:00 | An individual study task | Open **Study** on a phone. A short worked example lets the student practice the same idea after class. Close by asking the TA to bring one problem from next week’s sheet. |

The professor can generate a forecast before anyone joins. A forecast is a possible mistake, a line of work that might reveal it, and a question the professor might ask. Only actual student submissions increment the observation counts. The prepared course card uses an original exercise for practicing the method in OpenStax Calculus Volume 1, §4.3. An authentic PoliTO sheet and its tutor’s criteria are the next inputs for a campus pilot. [Course reference](https://openstax.org/books/calculus-volume-1/pages/4-3-maxima-and-minima)

## Architecture and fallback

- **Student phone.** A browser session holds an anonymous room identity. A student submits one typed step or a photo resized on-device, receives a private question, can revise, plays the professor’s fresh question and can review the concept afterward.
- **Professor laptop.** One screen shows the QR, a forecast for preparation, observations with counts, opt-in anonymous excerpts, a correction control and a recommended question. The professor decides when to open the challenge.
- **Room server.** One Node process holds the current room in memory. Browsers poll every 1.5 seconds. A revision replaces the student’s previous attempt. The server chooses a follow-up from three prepared variants and checks the answer and reason against its key. A student can earn one point for this demo concept. Restarting clears the room, photos are not saved to disk, and semester-long standings are outside this prototype.
- **Model.** The live planner calls course and practice tools and records a provisional grouping, a source-linked hint and an approved follow-up proposal. The bounded loop is described above. Forecasting is a separate request with the same criteria and no student submissions. Neither request receives student aliases.
- **Rehearsal.** Without a key, after a failed model request or when the presenter switches modes, the shared room, counts, scoring and QR keep working. Rehearsal uses two labeled prepared forecasts and a small set of rules for typed steps. For an arbitrary photo, it asks the student to type the relevant line. Rehearse “divide by x, x=1” and “x(x−1)=0, x=0 and x=1” to demonstrate both groups. With no venue internet, keep the laptop and phones on one reachable hotspot.

Run `npm test` for the agent evaluations and the separate two-browser room checks.

## How to introduce it at PoliTO

The invitation to the TA is **“Bring one exercise you already teach. We’ll show you the line your class gets stuck on while you’re still at the board.”** Approach one Analisi I tutor through a student representative or an exercise-session coordinator. Set up their exercise ahead of time, let them use their usual correction, and ask whether they would voluntarily use it for the following sheet. The student invitation on the closing slide can be **“Snap the step you’re on. See what the class tries next.”** Offer a weekly round if the tutor repeats.

For the pilot, record time from scanning the QR to first submission, whether the tutor used an observed step to change their explanation, and whether they bring a second exercise without prompting. Ask students who usually copy the solution whether they actually attempted a step. For the competition, compare voluntary participation and fresh-problem completion with the board visible and hidden. These are proposed measures, not results.

### Live provider check

The **Live classroom check** GitHub Actions workflow uses the repository secret named `OPENAI_KEY` as the process variable `OPENAI_API_KEY`. It checks a fictional statistics question, one written response and an aggregate report, and requires all three model calls to succeed. It runs on the trusted main branch when its own check changes, or by manual dispatch. GitHub supplies this secret to its runner only. The Render service independently uses its own `OPENAI_API_KEY` environment value for cloud analysis.
