# Provider evidence and evaluation implementation plan

The user's five-phase specification authorizes implementation in the current working tree. Preserve the uncommitted Provider refactor; do not commit, push, deploy, sign in, or call external AI services.

## Design

Keep the production catalog, recommendation algorithm and UI unchanged. Add a separate evidence register and an offline evaluation toolkit. Reusing the existing catalog prevents divergent Provider/Service identities. Extending the runtime scoring path now would violate the requirement to withhold scores; rewriting the catalog would risk losing reviewed dates and working behavior.

The evidence register distinguishes service claims from exact plan/channel claims across all 19 requested operations. Missing, inaccessible, conflicting or unreviewed information resolves to unknown. Materialize unknown cells and research backlog rather than inventing support. A new official document read is recorded separately from historical catalog evidence.

Evaluation cases use synthetic fixtures, immutable prompt/rubric versions and file hashes. Real runs and demo runs are separate by provenance. Automatic grading checks structured output against independently known answers; subjective criteria require two blinded human records. An admission gate only returns eligible run IDs and uncertainty after scope, provenance, repetitions and complete grading checks. It does not calculate a company ranking or connect to the application.

## Tasks and verification

1. Save and verify pre-work ZIP/manifest; read reports; run the 58-test baseline.
2. Test then strengthen catalog status/date validation without changing valid recommendation results. Add evidence types, official source records, service/route matrix validation and five internal cost states.
3. Define three cases, prompts, rubrics and empty real run/score registries. Generate a raw-only XLSX and a three-page PDF with separate answer keys and SHA-256 manifest. Verify actual exported files.
4. Test then implement automatic numeric/question/fact/page checks, validated runs/scores, plan/channel/region/version comparability, repeated-run uncertainty and blinded review packets. Planned/failed/demo runs cannot enter future measured evidence. Missing subjective checks never become zeros.
5. Add CLI validation/audit/manual-template/blind-packet/grade commands; document manual preflight, two fresh conversations per route, artifact retention and timing protocol.
6. Run complete tests, typecheck, catalog/evaluation validation, production build and optional Playwright. Compare preserved production files and recommendation outputs; report exact failures and unexecuted work.

## Review focus

- A service claim or paid entitlement must never establish a free route's capability.
- Creating an XLSX must never count as reading the supplied workbook.
- A planned run, forged grade, missing artifact or synthetic output must not become real evidence.
- Different case/prompt/rubric/fixture/account settings or unavailable plans must not be pooled.
- A transcript length is a format proxy; actual speech duration needs a measured rehearsal.

No approval pause is needed: implementation and routine design choices are already explicitly authorized. No Git worktree is created because the required refactor exists only in this dirty working tree; a new HEAD worktree would omit it. A verified snapshot protects that state.
