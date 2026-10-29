# Historical model-centered implementation

This directory preserves the exact pre-refactor sources, data, tests, scripts and uncommitted score-estimation work from 2026-10-29. `preservation-manifest.json` records SHA-256 for 106 files. `working-tree-before.patch` captures the pre-existing tracked diff; untracked source files are included in the copied tree.

These sources are excluded from the active application, TypeScript build and default test suite. They are research/history, not a Provider scoring source or fallback. The original 28 models and 111 observations, service/plan reviews and prior score-estimation artifacts remain here. Earlier design/report documents in the repository describe their historical stage, not current recommendation behavior.

Do not run these copied scripts from the repository root: historical scripts use relative data paths. No historical collector is invoked by the active Pages/data command. Current documentation: `docs/provider-recommendation-policy.md` and `docs/provider-refactor-report.md` in the repository root.
