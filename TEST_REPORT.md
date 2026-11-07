# Professor workflow test report

Tested 7 November 2026 by three parallel test agents and the main agent. All write tests used isolated SQLite databases and local test servers. The public homepage and health endpoint returned HTTP 200. No live class records were changed and no OpenAI requests were made.

## Verdict

The classroom feedback workflow works in the tested scenarios. All five findings below have been fixed and covered by permanent regression tests. No cross-student submission leak, unauthorized professor action or score-integrity failure was reproduced in this scope; this is not an exhaustive security assessment.

## Fixes applied

- Separate registration/network login budgets and per-account failed-login protection replace the shared 40-request allowance. Successful logins do not consume the failed-attempt budget.
- Notifications support cursor pagination, and the mark-all action updates all unread notifications for the current account, including older pages.
- Class PATCH validation preserves omitted fields and rejects empty updates.
- Markdown task lists retain accessible checked/unchecked symbols while arbitrary inputs remain forbidden.
- Safe application errors retain actionable messages; unexpected provider/internal details remain masked.

Fix verification: all 18 automated tests, JavaScript syntax checks and whitespace checks pass. Isolated browser testing loaded all 106 notifications across two pages, marked every message read (zero unread remaining), and verified distinct checked/unchecked task symbols alongside rendered LaTeX.

## Original confirmed findings (resolved)

### P1 — Shared-IP login/signup limit can block classroom onboarding

Location: `server/routes/auth.mjs:22`.

Registration and login share an IP-keyed limit of 40 requests per 15 minutes. Successful requests count too. Students sharing one campus public IP consume the same allowance.

Reproduction: send 40 invalid registration requests from separate sessions on one IP. A subsequent legitimate registration and an unrelated account login both return HTTP 429 with `Retry-After: 900`. The shared limit also applies to successful onboarding requests, so a large classroom can exhaust it without making mistakes.

Suggested fix: separate registration and login policies, account for shared networks, and avoid charging successful logins against the failed-attempt budget. Preserve protection against repeated failed authentication and abusive registrations.

Reproduction script: `/tmp/professor-auth-throttle-test.mjs`.

### P2 — Older unread notifications become unreachable

Locations: `server/routes/insights.mjs:94`, `public/views/activity.mjs:11`.

The API returns only the newest 100 notifications but counts unread messages across all history. “Mark all as read” submits only visible IDs. There is no pagination to reach older notifications.

Reproduction: create 105 unread notifications for a professor. The screen receives 100 while the unread count is 105. Mark those 100 read. The API still returns the same newest 100, all read, while the unread count remains five. Repeating the action cannot reach those older messages.

Suggested fix: provide an authenticated server-side mark-all operation and either paginate notification history or prioritize unread records.

Reproduction script: `/tmp/professor-notifications-check.mjs`.

### P2 — Partial class PATCH resets unspecified settings

Location: `server/routes/classes.mjs:48` (creation schema defaults at line 6).

Reproduction: create a whitelist-only class with a nonempty description, then send `PATCH /api/classes/:id` with only `{"name":"Renamed"}`. The description becomes empty and joining switches to approval mode.

The current frontend sends all settings, so its normal form avoids this bug. API clients using partial PATCH semantics do not.

Suggested fix: validate updates with a partial schema and preserve unspecified database values.

Reproduction suite: `/tmp/professor-management-test.mjs`.

### P3 — Markdown task lists lose checked/unchecked state

Location: `public/markdown.mjs:30`.

Reproduction: render `- [x] Complete` followed by `- [ ] Pending`. Marked produces disabled checkbox inputs, but sanitization removes all inputs, leaving visually identical bullets.

Suggested fix: render task states as safe text/icons, or narrowly allow disabled checkbox inputs without allowing general form controls.

### P3 — Actionable missing-AI configuration message is hidden

Locations: `server/routes/insights.mjs:45`, `server/app.mjs:73`.

Reproduction: with no configured AI provider, request a professor class summary. The route throws HTTP 503 explaining that `OPENAI_API_KEY` is required. The error handler replaces that safe application message with a generic failure, making setup harder to diagnose.

Suggested fix: preserve intentional application error messages while keeping unexpected provider/internal exception details private.

Reproduction suite: `/tmp/classroom-professor-audit.mjs`.

## Passed coverage

- Repository checks: JavaScript syntax, whitespace validation and all 11 existing automated tests passed.
- Management agent: 64 API checks passed, covering accounts, email normalization, duplicate accounts, roles, class join modes, membership approval, whitelists, blocking/restoration, enrollment totals, resources, notifications, login and logout.
- Grading/access agent: four additional integration tests passed, covering owner-only actions, peer privacy, score overrides, validation, latest-attempt leaderboard scoring, removed-student exclusion, concurrent grading/review, AI failures/retries, summary source-ID filtering, concurrent summary generation and failure recovery.
- Questions agent: weighted authoring, private reference redaction, image-only questions, invalid weights, closed/archived restrictions, reopening, preserved answer history and professor review were exercised. Browser checks confirmed inline/display LaTeX, private reference math, headings and GitHub-style tables.
- Main agent: public availability and the 105-notification failure above were independently exercised.

## Limits and observations

AI behavior was tested with injected providers and the existing SDK serialization test. Actual model assessment quality, handwritten-solution interpretation, source fidelity and live latency were not evaluated.

A signature-looking but corrupted PNG was accepted as an upload. Current validation checks file signatures, not full image decoding; this is a robustness limitation, not a demonstrated execution or privacy vulnerability. Professor review notes are plain text, so math delimiters there remain literal; that field is not currently advertised as Markdown.

The original reproduction scripts are temporary files. Permanent fix regressions now live in `test/classroom.test.mjs` and `test/markdown.test.mjs`; the original test pass made no application edits, and the subsequent fix pass addressed all five findings.
