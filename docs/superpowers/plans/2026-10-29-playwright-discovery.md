# Playwright discovery repair

**Goal:** Discover and run the existing 8 Provider workflows at 1440px and 320px without collecting Node unit tests or archived model workflows.

**Scope:** The user's nine repair instructions in this session. Keep the current Provider engine/UI, archived files, and uncommitted work; do not commit, push, or deploy.

- [x] Reproduce the missing export using the cached Playwright CLI. The import is in `archive/legacy-app/src/lib/workflow.test.ts:5`; active code has no `buildStagePrompt` reference. Baseline: `Total: 0 tests`; Node suite: 80/80.
- [x] Register the existing checks in `tests/e2e/provider-flow.spec.ts` with `@playwright/test`; retain the old script path as a CLI compatibility entry point.
- [x] Add a root configuration with a narrow test directory/match, archive/unit exclusions, two Chromium viewports, fresh production build/preview, and failure artifacts.
- [x] Align package scripts/dependencies and Windows documentation with the registered tests.
- [x] Run verification attempts and report the results: cached official runner discovers 16 E2E only; Node tests 80/80; app/evaluation/E2E types and data validation pass. Ordinary npx installation, browser execution and build remain blocked by environment restrictions, not marked passing.

**Review focus:** No archived imports; no model information in UI; all original clipboard/budget/draft/overflow/error checks retained; no stale `dist` used after a failed build; no successful-browser claim based on discovery alone.

**Environment evidence:** npm installation is blocked (`ECONNREFUSED 127.0.0.1:9`); the default npm offline setting also causes `ENOTCACHED`. Production build reaches esbuild then fails at `spawn EPERM`. A cached Playwright 1.64.1 runner and Chromium binaries exist, but `@playwright/test` is absent.

**Final review:** Independent read-only reviewer found no actionable defects. npm Arborist accepts the minimal wrapper lock metadata; the missing checksum is not invented, and actual package installation/npm ci are explicitly unverified. Diagnostic import mapping lives only in ignored `.qa` files and is not enabled in project scripts. See `docs/provider-playwright-repair-report.md` for exact limits and local rerun commands.
