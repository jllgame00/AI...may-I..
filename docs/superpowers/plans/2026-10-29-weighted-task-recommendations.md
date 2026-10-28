# Weighted task recommendations implementation plan

Superseded by [the task-specific correction](./2026-10-29-task-specific-policy.md). The universal 70/20/10 gate below describes the previous implementation, which did not yield useful current recommendations and has been replaced.

> **For agentic workers:** Use the executing-plans workflow for the scoring engine and isolated UI work for the comparison view. User authorizes implementation; do not commit, push, deploy or modify existing data, prompts, drafts or hosting settings.

**Goal:** Separate service recommendation priority from execution availability, and decline to invent scores where evidence is insufficient.

**Architecture:** A pure scoring function consumes the current merged snapshot on every comparison. It produces nullable scores, component coverage and a shared strict evaluation cohort. Execution checks are computed independently. Existing benchmark tables remain raw, separately labelled evidence.

**Tech stack:** TypeScript, React, existing node:test and server rendering harness.

**Spec:** User request in this session: weighted task fit; no missing-as-zero, unrelated metric substitution, route gate or model-specific exceptions; trace real survey/coding/writing cases.

## Global constraints

- Preserve existing data files, prompt generation, edited drafts, selection IDs and deployment configuration.
- No commit, push or deployment.
- Weights are explicit product policy, not empirically calibrated coefficients: direct task evaluation 70%, documented core abilities 20%, official intended use 10%. Data does not justify task-specific numerical tuning.
- All three components must be observed; no reweighting over missing components. Unknown is null, never zero or 50.
- Only a strictly comparable exact-release model evaluation can supply the performance component. Source-reported tables with unknown conditions remain raw references.
- Rank only complete scores within one shared cohort. Do not compare scores across different evidence scopes.
- Binary ability/use scores measure documented support, not measured quality. Require explicit scoped, sourced evidence; free-text capabilities and a model release URL alone cannot establish it.
- Model identity, provider, price, tier and input order cannot affect scores or ranks.

## Review focus

- Missing, contradictory, duplicate, mismatched-release or invalid-range evidence must leave a component null.
- Confirmed unsupported runtime tools must differ from unknown tools without changing the performance score.
- API/self-hosted references may appear for task evidence but must not acquire a web-selection action.
- Selection and draft state must remain intact when returning from the workspace.
- New raw scores must recompute totals/ranks through the normal comparison path.

## Tasks

1. [x] Add explicit scoped evidence/score types and pure weighted scoring policy. Write generic synthetic cohort tests first; include incomplete coverage, lower-is-better, ties, conflicts, source/scope mismatches, access independence and refresh recalculation.
2. [x] Connect the engine to `taskRecommendations` / `compareCandidates`, retaining raw benchmark ranks separately. Make display independent of readiness; test absence of invented ranks against the real snapshot.
3. [x] Display all named model candidates in an expanded task-evidence list; show nullable service score, coverage and independent short execution state. Keep detailed component/evaluation/source evidence collapsed and preserve web-only selection. Unspecified-model services retain their disclosure.
4. [x] Generate a reproducible JSON and Markdown report for actual survey, algorithm/repository coding and Korean writing cases. Report every model, exact raw references, missing components and execution checks; list the concrete evidence needed for totals.
5. [x] Run full tests, typecheck, build if permitted, diff/data integrity checks and independent review. Record browser/build limitations accurately.

## Verification

- Full suite: 205 passed, 0 failed. TypeScript check passed. Browser runner syntax check and diff whitespace check passed.
- Independent review found cross-purpose coding attribution and missing-scale raw evidence visibility gaps; both fixed with red-to-green generic regressions. Scoped re-review found no remaining issues. Exact release pinning for capability/purpose documents is tested.
- Current real snapshot: 28 models, 111 observations, no strict comparable cross-model pair. Survey, algorithm, repository and Korean promotional writing all have nullable totals/ranks; no fabricated numerical recommendation.
- Build attempted; Vite/esbuild child-process creation blocked by environment `spawn EPERM`. Actual browser integration was not run: earlier automatic approval review denied Chrome access without a specific reason. Server-rendered UI behavior is covered by tests.
- Existing data, prompts, drafts and deployment configuration have no diff. No commit, push or deployment.
