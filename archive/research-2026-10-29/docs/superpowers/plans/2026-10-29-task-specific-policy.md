# Task-specific recommendation policy correction

User requests implementation now. Preserve existing source data, prompts, drafts and deployment settings. No commit, push or deployment.

## Shared rules

- Remove the universal 70/20/10 gate. Define criteria once per request/task, never per candidate. Unknown is null. For limited support, compare documented scope/bounds with explicit task facts: met becomes supported, a confirmed violation becomes unsupported, unresolved conditions remain conditional; never invent a fractional value.
- Coding: use the taskfit=4 source-declared comparison set already audited by the project. Rank its raw observations only inside that set; identify model vs agent, versions, effort and unreported conditions. Do not require a normalized service score or unrelated documentation components.
- Survey/file analysis: use requested official tool/use criteria. Base weights upload=1, spreadsheet=2, code=2 (20/40/40 for the demo). Other explicitly requested tools get a common base weight2; normalize once for all candidates. Official tool descriptions provide the use evidence; do not add an empty separate purpose field.
- Text-only writing/analysis: one documented text generation/output/work-use criterion, weight100%. A dated official model source plus an explicit capability statement confirms applicability to text drafting. This is a task-use judgment, not measured Korean/genre quality. Generic text input, multilingual support or a model name alone is insufficient.
- A fully supported rubric yields a functional suitability score. Missing criteria keep the total null and do not block other candidates. Limited documented functionality yields a conditional recommendation without a fabricated partial score. Confirmed unsupported is separate from unknown. Equal supported evidence yields joint recommendation.
- Model/source/price/array identity cannot affect ranks. Neutral name ordering only arranges ties.

## Implementation and verification

1. [x] Replace pure task-policy engine and tests: real demo supports two full recommendations and three conditional ones; writing has documented joint recommendations; algorithm/repository retain actual raw group ranks. Mutate source status/capability/evaluation values through compareCandidates and verify judgment/order changes.
2. [x] Restore featured recommendations (max3), remaining joint recommendations disclosure and separate default-collapsed additional-check disclosure. Preserve native keyboard behavior, aria-expanded/controls and App-owned same-task toggle state across selection/return. Keep API/install references read-only.
3. [x] Run input→interpretation→comparison→selection→workspace integration against real data and source mutations, not only isolated arithmetic. Attempt available actual browser QA and report concrete restrictions honestly.
4. [x] Replace obsolete generated report with task-specific criteria, per-model evidence and actual case outcomes; dynamic/self-contained generator. Verify protected source data/prompts/config unchanged, full suite/typecheck, independent review. No commit/push/deploy.

## Verified outcomes

- Survey: two full joint recommendations; three conditional Work routes due to limited spreadsheet input scope. Writing: 20 documented text-use joint recommendations, eight unknown. Algorithm and repository use their actual three-model/two-configuration source-table ranks.
- Cloned Work sheet support change promotes five full survey recommendations; sourced Claude code unsupported removes two from eligibility; source removal becomes unknown; text-use statement removal changes writing judgment; normal refresh changes the algorithm ordering.
- Real request parsing/comparison/actual card selection/guide/workspace rendering preserves research questions and selected model. Four report cases choose a valid existing UI candidate ID; the repository execution alternative is explicitly separate from the benchmark leader.
- 201 tests and TypeScript checks pass. Source preview compiles the real entrypoint and serves HTML/JavaScript with HTTP 200. This is not a browser run or production build.
- Current browser access host is unavailable; native Chrome access was denied by automatic approval review without a stated reason. Browser runner updated but not run. Production build remains blocked at esbuild child-process creation with spawn EPERM.
- Independent review identified mapping/plan feature precedence disagreement. A shared resolver and both-direction rendering regressions fix it; scoped re-review is clean.
- Existing data, prompt/draft implementation and deployment settings have no diff. No commit, push or deployment.

## Follow-up: confirmation wording and task-relative constraints

- Functional cards now say `필수 기능 3개 확인` or `공식 텍스트 생성·출력 용도 확인`. Numeric functional totals and rank numbers are kept out of cards; internal weights remain in details.
- A joint group larger than three states the full group size and neutral model-name order before the first three cards, with remaining joint candidates expandable. Writing does not acquire a measured quality rank.
- Source-note scope matching recognizes the documented new-sheet creation use, while existing Excel/CSV analysis and negated creation stay unresolved. Optional explicit source bounds are compared only against asserted task quantities; missing/uncertain/range conditions stay conditional unless a violation is proven.
- Current source data is unchanged. Synthetic numeric quota examples are explicitly labelled rule fixtures, not actual Work/service limits.
- 210 tests and TypeScript pass, including actual card wording and task-relative selection eligibility. Independent review found two over-permissive matching cases; both were corrected with failing-then-passing regressions and scoped re-review is clean.
