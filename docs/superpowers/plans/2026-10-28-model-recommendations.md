# Exact model recommendations implementation plan

> Execute inline with regression tests; user explicitly requests implementation, verification, and no commit/push/deploy.

**Goal:** Extend AI..may I..?'s existing comparison → selection → editable stage workflow to exact sourced models.
**Architecture:** Keep six subscription plans and session/draft behavior. Add a dated model catalog, factual evaluation records and explicit access mappings; consume raw evidence without aggregate ranking. API paths are manual, metered paths, never subscription entitlements.
**Tech Stack:** Existing React/TypeScript/Vite and Node test runner, no dependencies.
**Spec:** User's detailed requirements and `docs/final-ai-guide-application.md` (historical baseline).

## Constraints and decisions

- Work in the requested checkout; preserve user files and Pages settings. No Git mutations.
- Current official names: GPT-6.1 Sol/Terra, GPT-6 Astra, Claude Sonnet/Opus 5.5. No family-only entries or inherited scores.
- Retain generic free candidates where exact model selection is unknown. Plus Work has separate access from Chat. Claude subscription model entitlement remains unconfirmed unless a source explicitly establishes it.
- Keep old synthetic scoring tests, but production raw-evidence records bypass 60/25/15 totals. Missing values stay null.
- Missing run conditions block a pairwise claim, not the whole catalog; dates alone do not block comparison.

## Tasks

- [x] Add regression tests for exact versions/settings, null values, partial evidence, route/billing separation and draft propagation; observe failure.
- [x] Add five models, observed provider/independent evaluation facts and access mappings with source dates, limitations, terms and access failures.
- [x] Connect route filter, evidence cards/catalog, unique model choices and truthful stage instructions without replacing edited drafts.
- [ ] Run tests/typecheck/build and browser workflow/mobile/keyboard checks; document counts and limitations in `docs/model-recommendation-methodology.md`.

## Review focus

- A new version must never inherit an old version's observations.
- Unspecified tool/harness/trial conditions must remain unknown.
- API prices never become monthly fees or Free entitlements.
- One unknown candidate must not suppress another verified condition candidate.
- Changing model/route preserves drafts and invalidates only affected review context.

## Progress

Initial inspection: clean working tree; no AGENTS.md found in repository or ancestor directories. Existing baseline has 81 tests, generic six-plan mappings and no production exact model observations. Sonnet system-card fetch failed once (13 MB tool limit); use accessible launch facts, do not retry or infer hidden conditions.

Implementation and independent review complete. Regression suite 93/93, typecheck passed. Build attempted with default and native config loaders; both blocked by Windows child-process spawn EPERM. Browser script attempted, prerequisite debug session unavailable (ECONNREFUSED :9222); actual browser/mobile/keyboard/clipboard scenarios remain unexecuted for this change. Do not reuse earlier screenshots. Deployment/package configuration unchanged. No commits/push/deploy. Actual criteria, 13 result records and update procedure are in `docs/model-recommendation-methodology.md`.
