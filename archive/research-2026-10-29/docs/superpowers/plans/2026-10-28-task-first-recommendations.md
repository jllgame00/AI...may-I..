# Task-first model recommendations implementation plan

**Goal:** Remove budget/free/price scoring from recommendation while preserving the registered five releases and 13 source-backed observations.
**Spec:** Current user request; `docs/model-recommendation-methodology.md` is updated to supersede its budget policy.
**Architecture:** Existing route candidates/session/drafts remain. Task eligibility depends on required features, with a separate access status for exact model/route entitlement. Model evidence describes the exact evaluated release independently of unconfirmed subscription entitlement, with explicit environment/mode caveats. Comparison prioritizes exact models; generic unlinked service paths remain supplemental. Selected plan price/usage limits move to stage guidance.
**Stack:** Existing React/TypeScript/Vite/Node, no new dependencies.

## Constraints

- No model/version/score/source/mapping inventions or model upgrades.
- No budget fields, free filtering, price weights, or price-only holds in active recommendation code.
- No cross-benchmark composite score. Unknown feature/route conditions remain explicit.
- Keep editing/copy/recovery/review/navigation and Pages configuration.
- No commit/push/deploy. Do not repeat established spawn EPERM or unavailable debug-host attempts.

## Tasks

- [x] Pin actual model/catalog records and write failing budget-independent/task-vs-access UI and engine regressions.
- [x] Remove budget and obsolete weighted scoring types/policy/engine/tests; separate task and access status and model-reference evidence.
- [x] Remove budget inputs and preselection cost/plan promotion; show exact models and source facts, then selected usage conditions in stages.
- [x] Update browser scenarios, README and current methodology. Run tests/typecheck/syntax/diff checks; document build/browser limits honestly.

## Completion evidence

90 tests pass, typecheck and browser-script syntax pass. The 15 obsolete budget/weighted-score tests were replaced or removed; six new policy/version/UI regressions added. Source catalog stays five exact releases and 13 observations. Independent review found a missing mapping version guard; regression reproduced failure and strict version equality fixed it. Legacy synthetic fixture now supplies explicit version provenance.

Build and actual browser/mobile/keyboard/clipboard checks remain unexecuted in this turn: prior default/native builds failed spawn EPERM, and current preview/debug listeners are absent. Failed mechanisms were not retried. Manual cases are recorded in current methodology. Pages base, deployment/package settings and historical Arena snapshot unchanged. No commit/push/deploy.

## Review focus

- A price/tier edit must not change candidate identity, task fit, access status or order.
- Unconfirmed consumer subscription entitlement must remain visible even when model performance is known from API/research evaluations.
- No coding scores in writing/statistics; no inheritance across versions or misleading effort labels.
- A model/route change must preserve edited drafts and allow explicit regeneration/recovery.
- API usage billing must remain explicit after selection and never appear as free or monthly subscription pricing.
