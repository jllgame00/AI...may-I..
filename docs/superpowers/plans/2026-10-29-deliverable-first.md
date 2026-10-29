# Deliverable First implementation plan

**Goal:** Generate prompts that request the user's actual deliverable, while preserving Provider recommendations, source data, UI and draft/copy behavior.

**Spec:** The user's 2026-10-29 Deliverable First requirements and subsequently supplied service prompt. The supplied prompt itself has no outline/promotion instruction; its real AI responses cannot be attributed to app-added text without that experiment's selected stages and complete transcript.

**Baseline:** Clean commit `0f79525`, Node tests 80/80. `src/lib/prompts.ts` is absent. Active generation is `promptEngine.ts` → `aiGuide.ts`/`workStages.ts`. `.qa/deliverable-before.json` reproduces four companies' identical generated bodies. Multiline survey text misses the `surveyDraft` regex, generic writing starts with an outline, and even recognized surveys start with design rather than questions.

**Architecture:** Add a small typed deliverable contract separate from WorkCategory. Resolve explicit output kinds/formats before inference; render one active output contract per stage, preserving original text as reference rather than copying a global multi-output instruction into each stage. Use the same contract across companies. Keep existing statistical and coding prerequisites where needed. Extend task extraction only where an actual survey/explicit output was previously missed; do not change recommendation assessment or capability facts.

**Alternatives considered:** Appending survey keywords alone leaves generic writing and mixed-stage contracts broken. A new recommendation/UI framework is outside scope. A reusable output contract in the existing generator addresses the reproduced defects with no new UI controls or dependencies.

**Constraints:** No model names/benchmarks; no fabricated inputs, legal terms or survey metadata; no commit/push/deploy; no changes to Provider policy/catalog/evaluation gates/main UI/draft ownership. Work in the current authorized checkout; Git metadata is read-only in the managed workspace.

## Tasks

- [x] Audit source paths, classification, templates, stages, override merging, copy/edit/restore and existing regressions; reproduce both supplied survey texts and short/composite examples before production edits.
- [x] Add failing regressions in `src/lib/deliverables.test.ts`, using `tests/fixtures/survey-request.ts`: final vs plan outputs; exact survey counts/types; stage isolation and handoff; explicit output priority; unknown inputs; company equality; draft preservation.
- [x] Add types in `src/types.ts`, inference in `src/lib/deliverables.ts`, rendering in `src/lib/deliverablePrompts.ts`; integrate with `promptEngine.ts`, `workStages.ts`, `aiGuide.ts`, and minimal survey/explicit task detection in `providerRequirements.ts`.
- [x] Verify the new regressions and complete existing suite. Final 118/118 (80 original + 38 added). Prompt text tests are not evidence of real AI responses. Distinct planning outputs also have distinct draft IDs, verified RED→GREEN.
- [x] Generate before/after evidence and full ChatGPT/Claude/Gemini prompts from the real API. Three 1,426-character bodies are identical. Add 6 exact-survey browser cases while preserving original 16 byte-for-byte.
- [x] Recheck types/data (pass), production build and E2E (EPERM, no browser scenarios executed). Independent reviewer found six real boundary defects, each reproduced RED and fixed GREEN. Twelve protected file hashes and eight original recommendation inputs remain unchanged. See `docs/deliverable-first-report.md`.

**Decisions:** WorkCategory remains the recommendation boundary; multiple writing outputs receive separate prompt contracts without changing Provider assessment. An explicit output changes the final deliverable but preserves input-analysis prerequisites. Original text stays inside a reference block; only the selected contract is an active stage instruction. External AI experiments and local browser/build verification remain explicitly unverified; no fake successes, commits or deployments.

## Review focus

1. Survey words appearing only in a promotion or analysis request must not create an unwanted questionnaire.
2. Planning-only and explicit output overrides must not leak final-output instructions from the inferred original.
3. Composite stages must have separate active instructions and required handoff, even for two writing outputs sharing one recommendation work category.
4. All eight survey constraints and the experience/skip logic must survive company changes without invented dates, institution or promises.
5. Existing source/reference text, stage IDs for persistent drafts and the original browser cases must remain meaningful; edited drafts must not be overwritten.
