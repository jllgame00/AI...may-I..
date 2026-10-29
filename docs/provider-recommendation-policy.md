# Provider recommendation policy

Version `provider-evidence-v1`. Data `src/data/provider-catalog.json`. The sole active path is `main → App → aiGuide → providerRequirements/providerRecommendation → providerCatalog`. Model evaluation engines, historical weights and benchmark tables are not imports or fallback dependencies.

## Data

12 explicit Provider records own 13 Service records (Google owns Gemini and NotebookLM). Each Service has independently scoped Plan records; unknown plans remain registered. Each Plan has Capability records and Evidence references. Evidence specifies an official URL, date, reviewed/unverified status, service and exact plan IDs. No service-level claim is automatically a Free entitlement. Capabilities distinguish text/question drafting, real forms, upload/PDF upload/PDF analysis/PDF creation, existing spreadsheet analysis/new sheet creation, image input/generation, code generation/execution, web search/source verification, slides and video.

`ProviderModel` is an optional descriptive plan reference type. Current exact-release availability is not newly verified, so the active `models` list is empty. All 28 original Model records, release/mode/access links and 111 Evaluation records are byte-preserved in the history snapshot. Removing or adding descriptive models does not change Provider registration or recommendation. Evaluations are not a field consumed by the new engine.

## Requirements and gate

Rules extract work categories, input and output roles independently, required/preferred capabilities, monthly budget/free-only/currency/country, format and explicit quantities. Missing values stay null/unknown. Up to three unresolved questions are shown; controls override inference. This is a transparent rule-based parser, not a paid LLM. The original request and prompt overrides remain separate.

All required capabilities must be supported by reviewed evidence matching that Plan/Service. Missing sources, wrong scope, unknown features and unresolved limited conditions produce conditional candidates. A verified explicit mismatch or exceeded published bound excludes the Plan. A supported-file list records confirmed formats; absence of a format means unconfirmed, not an invented explicit prohibition. Explicit requested quantities without verified capacity also stay conditional. Generic feature availability never promises arbitrary volumes or remaining account quota.

Free-only forbids paid routes. Free claims require a reviewed zero-cost plan record. For a numeric paid monthly budget, currency, known country, monthly billing amount and tax-inclusive total must all match; no implicit currency conversion or annual/monthly conflation. Missing price context is conditional. Country-specific prices remain scoped internal evidence. The product UI shows free/paid route status rather than a price or local quote.

## Score and company grouping

The new prospective weights are fit 40%, direct task quality 30%, cost 20%, ease/transition 10%. They are not inherited or empirically calibrated. The internal fit=100 codes a complete required-feature gate only; the UI displays confirmed features rather than a quality point score. Quality/cost/ease values are null because task/Plan-matched direct quality and comparable cost/ease scoring evidence are missing. Total and rank are always null in the present dataset. No missing-weight renormalization, model maximum/average, benchmark transfer or 100-point fallback is used.

Representatives are selected among a company's actual Plan options by gate, fewer unresolved required features, more verified preferred features, verified free route and stable Plan ID. This is route selection, not company quality. A user's explicit compatible selection is retained in session. Providers without a feasible whole-task route may still have appropriate individual-work routes; capabilities from different services are never merged into a fictitious Plan.

Eligible companies are joint candidates, displayed by neutral company name. At most three appear first; further joint candidates are folded. Conditional and excluded companies have separate folded sections. A company appears once in each comparison set even when it has many models/Plans/Services. Each work stage has its own comparison set.

## Flow and preservation

### Product display policy (2026-10-29 follow-up)

The UI recommends Providers and representative Services. It shows required-feature status, free availability and whether the selected route requires paid access. It does not expose model names/releases/benchmarks, Plan names, detailed prices or alternative-Plan comparison tables. Full Plan, price and Evidence scope records remain internal and unchanged. Free labels require reviewed evidence scoped to the exact Service/Plan. A paid representative does not establish that every route at that company requires payment. Conditional free support remains separately labelled.

Company details focus on features, reasons, practical use steps, the official service link and customized prompts. Official evidence links and checked dates remain available without rendering raw research scopes. The stage selector displays one option per Provider while retaining an existing compatible internal Plan selection. User-supplied original text and edited drafts remain intact. See [product validation](provider-product-validation-report.md) for executed checks and browser limitations.

Original text → editable interpretation/budget → company/Service/Plan → staged prompts/edit/copy. A work-specific change updates only that work's stages. A single-stage change updates only that stage. Existing edited drafts survive all changes and get a changed-context notice; regeneration keeps the prior draft recoverable. A default route is inherited only when that stage's required capabilities are verified; a conditional route needs explicit stage selection. No service substitution, extra subscription or payment occurs automatically.

## Data maintenance

`npm run data:refresh` validates and preserves the reviewed Provider snapshot; it does **not** collect external pages or refresh source dates. `--import <reviewed.json>` accepts a complete newly reviewed schema only after validation. `data:restore` restores the new Provider backup, with a new Provider-only seed as a final recovery source. It never loads model recommendations. The old model collectors and recovery files are historical, not fallback inputs. `storedAt` and source `checkedAt` are separate; automatic external-collection time remains null.

Validation detects missing major Providers/Services, duplicate IDs, orphan relations, invalid Evidence/Plan scopes and invalid prices. The default tests traverse the app import graph and hash-check the preserved historical snapshot.
