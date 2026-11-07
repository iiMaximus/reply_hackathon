# Local uncensored-model and classroom guardrail test

Date: 7 November 2026.

## Model and setup

Installed and ran `hf.co/mradermacher/Qwen2.5-0.5B-Instruct-uncensored-GGUF:Q4_K_M` using the user's existing Ollama service. Ollama reports **630,167,424 parameters (630M)** and Q4_K_M quantization: below the requested one-billion-parameter limit. “Uncensored” is the publisher's label, not a property independently certified by these tests.

Sources: [GGUF publisher](https://huggingface.co/mradermacher/Qwen2.5-0.5B-Instruct-uncensored-GGUF), [upstream model](https://huggingface.co/thirdeyeai/Qwen2.5-0.5B-Instruct-uncensored), [Ollama Structured Outputs](https://docs.ollama.com/capabilities/structured-outputs).

All classroom records were synthetic and stored in isolated in-memory SQLite. The suite used the real HTTP routes, shared production assessment/summary prompts and Zod schemas. Local generation used shorter strings/arrays to prevent repetitive output from exhausting the token limit. The public app's provider and existing records were not switched to Ollama.

## Results

Application guards passed. The model-quality gate failed.

- Six of six final assessment responses parsed and validated against the application schema.
- All six suggested scores were **90%**: correct arithmetic, incorrect arithmetic, correct beam reasoning, incorrect beam reasoning, an unexplained answer and a prompt-injection attempt. Four of six simple score-threshold checks therefore failed.
- All six assessments were placed in professor review. None contributed automatic leaderboard points. A separately professor-reviewed photo was the only scored item.
- A class summary was generated (HTTP 200), and the professor approved/published a follow-up. Its content repeated mathematical errors from assessments. Valid JSON and valid source IDs do not establish educational accuracy.
- Final assessment request times ranged from 786 to 3,700 ms. Summary generation took 1,889 ms. These are one local synthetic run, not a throughput benchmark.

The first transport run had six malformed assessment responses. Constraining local output lengths and discouraging repetition produced valid structured output in the final run. This fixed transport reliability for the sample, not the model's reasoning quality.

## Guardrails exercised

### Hateful answer text

The user-provided racist answer and variants using case changes, leetspeak, spelled-out letters, invisible characters, full-width Unicode, lookalike characters and HTML entities were rejected with HTTP 422 before submission insertion or model invocation. The API regression also included an image attachment to confirm that adding a photo cannot bypass a blocked text answer.

The live Ollama suite repeated five variants: **five rejected, zero provider calls, zero saved submissions**. Typed rejection messages do not echo the offensive text. Retrying or manually scoring a previously saved prohibited answer cannot bypass the policy. Ordinary frustration and normal mathematical/geographic language remain accepted in the tested examples.

This is a configured lexical slur policy using Obscenity and text normalization, not comprehensive hate-speech classification across all languages and contexts. It does not OCR image content. Text-only local inference refuses images rather than silently pretending to inspect them.

### Model output and scoring

- Nonempty review reasons force review even if the model says `needs_review=false`.
- Missing or empty evidence, and quotations that do not match a typed answer, force review.
- Truncated, malformed and out-of-range local model output cannot create scores.
- Every local test-provider assessment requires professor approval regardless of its claimed confidence.
- A photo-only answer remains saved and unscored when the text-only provider rejects it. Professor manual review succeeds.
- Submission histories, private reference-answer redaction, notifications, statistics, progress and leaderboard routes were exercised through the actual app.

Prompt injection was included as an adversarial case. The model still suggested 90%; application review prevented those points from becoming an automatic score. These tests do not establish that model prompts alone resist arbitrary injection.

## Reproduce

```sh
# Existing Ollama service must have the model downloaded.
npm run test:ollama
```

Optional variables: `OLLAMA_TEST_MODEL`, `OLLAMA_URL`, `OLLAMA_TEST_REPORT`. The default machine-readable report is `/tmp/classroom-ollama-results.json`, containing synthetic assessment responses and diagnostics. The live command exits nonzero when the model-quality gate fails; the failure is intentional evidence, not a passing grading-quality result.

`npm test` runs the independent offline regression suite without inference or OpenAI charges. The public app continues using its configured OpenAI model.
