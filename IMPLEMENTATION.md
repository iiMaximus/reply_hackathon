# Classroom implementation

## Structure

```text
server/
  index.mjs             Start server, load environment, persist local session secret
  app.mjs               Express middleware, sessions, routes, static files, errors
  database.mjs          SQLite schema and express-session store
  access.mjs            Shared validation, authorization and notification helpers
  ai.mjs                OpenAI client, prompts and Zod output schemas
  grading.mjs           Save/assess/retry lifecycle and evidence checks
  moderation.mjs        Server-side classroom slur policy before storage/scoring
  ollama.mjs            Local-only inference adapter for opt-in tests
  routes/
    auth.mjs            Registration, login, logout, current account
    classes.mjs         Classes, joining, roster, whitelist and blocking
    quizzes.mjs         Questions, submission history and professor review
    resources.mjs       Image uploads and resource review
    insights.mjs        Statistics, summaries, progress, leaderboard, notifications
public/
  index.html            Application shell
  app.mjs               Hash routing, account state and notification polling
  api.mjs               Fetch and multipart upload helpers
  ui.mjs                Sanitized Markdown, common UI and drawing board
  markdown.mjs          Shared Markdown/LaTeX rendering and sanitizer boundary
  styles.css            Minimal responsive styling
  views/                Auth, dashboard, class, question and activity screens
test/classroom.test.mjs  API integration tests with an injected test AI provider
scripts/check.mjs       Dependency-free JavaScript syntax check
```

The server serves the frontend and API from one origin. Frontend modules are plain browser JavaScript: no bundler or framework is required for this initial version. Express handles routing; express-session handles cookies and session lifecycle; bcryptjs hashes passwords; Zod validates API input and model output; Multer handles multipart uploads; file-type checks image signatures; Helmet sets browser security headers; express-rate-limit limits requests; marked parses GitHub-style Markdown and DOMPurify sanitizes its HTML. The official OpenAI SDK calls the Responses API with Structured Outputs and image input.

## Data and authorization

SQLite tables are created on startup. Users have a student or professor role; a class has one professor. Membership is `pending`, `active` or `blocked`. Every class-scoped endpoint checks active membership or class ownership on the server. Students cannot see reference answers, rubrics, other students' submissions, private solution images, or the roster. Leaderboard display names and points are shared within the class. Registering as a professor is self-service for the hackathon.

Classes default to professor approval. Open classes admit anyone with the code; whitelist classes admit listed email addresses. Whitelisted addresses bypass approval in approval mode too. Changing a join policy or whitelist does not eject existing members. A professor can block and restore individual members. Blocked users lose class access and cannot rejoin with the same account. Email addresses are unique and normalized, but **email ownership is not verified**: this is account management for a prototype, not institutional identity or a guarantee against duplicate people. Invitation/email verification or campus sign-in is a next step for a real deployment.

Passwords are bcrypt hashes. Sessions persist in SQLite and use HTTP-only, SameSite=Strict cookies. Mutations require the app's custom request header and reject foreign Origins. API input uses bound SQL parameters. Images are signature-checked, limited to 8 MB and served through authorized routes. Markdown HTML is sanitized and remote Markdown images are disabled. No API keys are returned to browsers. Only enable `TRUST_PROXY=1` behind a trusted reverse proxy.

Authentication has separate 15-minute limits: 500 registration requests per network, 1,000 failed login requests per network, and 10 failed logins per normalized email/network pair. Successful logins do not consume either failed-login allowance. These limits let a classroom share Wi-Fi while retaining account-level password-guessing protection. Class PATCH requests update only the supplied fields; omitted access policies and descriptions are preserved.

## Questions, scores and history

All Markdown views and previews support inline LaTeX (`$x^2$`) and display LaTeX (`$$\frac{a}{b}$$`, including multiline blocks), using KaTeX and marked-katex-extension. Code spans/fences stay literal. KaTeX assets/fonts are served locally. Untrusted HTML is sanitized separately from library-generated math, preserving fraction/matrix layout while keeping unsafe LaTeX commands disabled. Escape literal dollar signs with `\$`.

GitHub-style task lists render checked/unchecked states as accessible static symbols, without allowing arbitrary HTML form inputs. Intentional application errors (including missing AI configuration) retain actionable messages; unexpected server/provider exceptions remain masked.

The first version treats each quiz as one open-ended question. A question can combine text/Markdown and one image, optional private reference answer and rubric, and a positive score weight (default 1, maximum 1000). Closing or archiving a question preserves submissions and feedback. Reopening allows revisions.

A submission is inserted **before** any AI request. States are:

- `pending`: assessment running.
- `awaiting_ai`: saved, but the server has no API key.
- `failed`: saved; the provider failed, refused, or returned invalid output. Retry is available.
- `review`: AI feedback exists, but uncertainty/evidence issues require professor review. No leaderboard score yet.
- `graded`: usable score, either AI-suggested or reviewed by the professor.

An interrupted `pending` job becomes `failed` on server restart. Retry operates on the saved submission. Professor review retains the original AI feedback and saves a separate note and replacement score. Requests cannot overwrite a running assessment with a professor review.

Leaderboard points equal **weight × score / 100** for the **latest attempt per student per question**. Previous attempts remain visible but do not add points. A latest attempt awaiting assessment/review temporarily contributes no points. Archived questions retain their points. Removed members are excluded from aggregates and rankings. Scores are formative suggestions, not official grades.

Statistics show respondents/enrolled, assessed-answer mean, distribution, misconceptions and a review queue. They use latest attempts only. Unreviewed/failed answers are excluded from score means. AI concept labels corrected by a professor are excluded from concept aggregates to avoid presenting rejected labels as facts. Personal strengths and weaknesses describe submitted answers, not fixed learner traits.

## AI and resources

Student answer text is checked on the server before a submission is stored or any grading request is sent. A configured English slur policy uses Obscenity's matchers plus Unicode/HTML normalization and spelled-out token normalization. Matching submissions receive HTTP 422 with an actionable message, without echoing the offending text, creating a submission or awarding points. Retries and professor scoring also enforce the policy on older records. Ordinary frustration (for example, “I hate this integral”) is allowed. This is a bounded lexical policy, not comprehensive multilingual/contextual hate-speech classification or OCR moderation. Photo-only content requires vision or human inspection; a text-only model cannot certify it.

Assessment output is also checked before points are awarded. A nonempty review reason forces review even if the model incorrectly sets its flag to false. Missing/empty evidence or unmatched quotations in typed answers also force review. Local test-provider feedback always requires professor approval and never awards points automatically.

Approved text resources, the reference answer, rubric and question/answer images are supplied to the model. Context is bounded to the 12 most recent approved resources and up to four resource images. Linked websites are never silently fetched. Resource changes affect subsequent assessments; existing feedback stays as saved.

Feedback contains a suggested percentage, explanation, strengths, weaknesses, misconceptions, evidence excerpts, source references and a review flag. For text-only responses, unmatched evidence quotations force human review. The model is instructed to flag unreadable handwriting and missing/ambiguous grounding. An image interpretation and a citation remain fallible; professor review is available.

AI summaries analyze at most the 100 most recent assessed latest responses and explicitly record the analyzed/available counts. Invalid model-provided response/resource IDs are removed. Summaries persist until refreshed manually and display their generation time. Follow-up suggestions require professor review and a publish action; they are sent to the whole class in this version. Students can propose resources, which remain private to the author and professor until approved. AI recommendations refer only to supplied approved resource IDs.

The provider receives the submitted learning content but not account email fields. Text authored by users could itself contain identifying details. `store: false` is sent in OpenAI requests. There is no simulated AI mode in the app. Automated tests inject a test provider; live grading requires a configured key and compatible model.

Official API references: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) and [image inputs](https://developers.openai.com/api/docs/guides/images-vision?api-mode=responses).

## API map

All routes below start with `/api`. Mutating requests need `X-Requested-With: classroom`; JSON requests also need `Content-Type: application/json`. Session cookies authenticate requests after login.

```text
POST   /auth/register                    {name,email,password,role}
POST   /auth/login                       {email,password}
POST   /auth/logout
GET    /auth/me
GET    /config

GET    /classes
POST   /classes                          {name,description?,join_mode?}
POST   /classes/join                     {code}
GET    /classes/:id
PATCH  /classes/:id                      {name?,description?,join_mode?} (at least one field)
GET    /classes/:id/members
PUT    /classes/:id/whitelist             {emails:[]}
PATCH  /classes/:id/members/:userId       {status:active|blocked}

GET    /classes/:id/quizzes
POST   /classes/:id/quizzes               {title,question?,image_id?,weight?,reference_answer?,rubric?,notify_students?}
GET    /quizzes/:id
PATCH  /quizzes/:id                       {status:open|closed|archived}
POST   /quizzes/:id/notify
POST   /quizzes/:id/submissions           {answer?,image_id?}
POST   /submissions/:id/retry
PATCH  /submissions/:id/review            {score,note}

POST   /classes/:id/files                 multipart: file, purpose=question|answer|resource
GET    /files/:id
GET    /classes/:id/resources
POST   /classes/:id/resources             {title,content?,url?,image_id?}
PATCH  /resources/:id                     {status:approved|rejected}

GET    /classes/:id/stats
POST   /classes/:id/summary
GET    /classes/:id/leaderboard
GET    /progress
GET    /notifications                    optional ?before=<id>; returns next_cursor for older history
POST   /notifications/read               {ids:[]} or {all:true} (current account only)
```

## Development and deployment

For explicit local inference tests, pull `hf.co/mradermacher/Qwen2.5-0.5B-Instruct-uncensored-GGUF:Q4_K_M` into the running Ollama server, then run `npm run test:ollama`. Override with `OLLAMA_TEST_MODEL`, `OLLAMA_URL`, or `OLLAMA_TEST_REPORT` (default report `/tmp/classroom-ollama-results.json`). The suite uses isolated in-memory SQLite and the same classroom prompts/output schemas, with tighter output lengths for the small model. It tests answer storage, evidence guards, hateful-text rejection before inference, summary/follow-up publishing, notifications, image limitations and professor override. A separate model-quality gate checks simple score thresholds and intentionally fails when the model cannot distinguish correct from incorrect reasoning. Passing application guardrails does not imply passing model quality. The public server continues to use OpenAI; this test suite does not change `.env` or use the production database.

For Cloudflare Tunnel, configure the published hostname's service as **HTTP → localhost:4173**. Cloudflare provides public HTTPS while the local app serves HTTP. Set `TRUST_PROXY=1` in `.env` and restart the app so HTTPS Origin checks and secure session cookies recognize the tunnel's forwarded protocol. Using `https://localhost:4173` as the origin causes a TLS handshake error and a public 502.

`npm ci`, `npm start`, `npm run dev`, `npm run check`, `npm test`. Node 24+ is required by the installed packages and built-in SQLite API. Change configuration in `.env` (see `.env.example`). The app serves on port 4173 by default and binds to all interfaces for local phone testing. Browser alerts need browser permission and a secure context (localhost or HTTPS); in-app notifications work on HTTP too.

The included Render configuration uses a persistent disk for SQLite; review its paid hosting configuration before deploying. No deployment is performed by local setup. A single Node process owns the database. Use a shared database and job queue before running multiple instances. Image blobs grow the SQLite file; there is no storage quota/cleanup job yet. Notifications poll while the app is open; email, service-worker push, deadlines, multi-question quiz containers, PDF extraction, institutional login, and targeted subgroup follow-ups are future work.

Tests exercise the full feedback loop, histories, score deduplication, teacher approval, whitelists, blocking, access isolation, image privacy, resource approval, missing keys, provider errors, human review, invalid input, CSRF checks and database/session persistence. They make no external AI calls.
