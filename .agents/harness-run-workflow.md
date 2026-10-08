# Feature run workflow

Use this workflow for bounded feature implementation runs. It keeps comparisons reproducible while remaining applicable to different domains and feature sizes. It does not apply to explicitly requested harness maintenance or evaluation-file edits.

## Establish the run boundary

- Record the starting branch/commit and `git status --short`; preserve existing user changes. Read the fixed task requirements once and extract the allowed paths, acceptance criteria, and prohibited changes into a compact working checklist.
- Check required workspace dependency edges against existing package manifests before writing code. When the task permits adding dependencies with justification, that permission includes the root package-manager lockfile as the generated record of dependency declarations made in package manifests inside the allowed write boundary, unless the task explicitly prohibits lockfile changes. Explain each dependency edge before editing and keep the lockfile diff limited to those edges and unavoidable package-manager metadata. Obtain a boundary exception for root workspace configuration or unrelated lockfile changes. Do not introduce undeclared imports or flatten architecture to avoid package dependencies.
- Review any existing baseline verification record before implementation, including dependency advisories and Knip findings. Distinguish new actionable findings from inherited findings and Knip configuration hints. Do not change scan ignores or root `knip.json` merely to silence findings during a bounded feature task.
- Convert the task into a small evidence matrix before implementation. Map each required behavior and error to its owning layer, public contract or documentation, and planned test. For an HTTP API, include method and path, request validation, success response, status code, and specified error code. Do not add requirements that are absent from the task or repository instructions.

## Use context and verification deliberately

- Use targeted file discovery and bounded reads. Read only the Cellix layers applicable to the chosen feature, including parent and sibling composition files, public exports, and test companions. Record the planned file tree and reuse the resulting alignment map instead of repeatedly loading whole repository diffs or unrelated slices.
- Keep one compact checklist for requirements, reference paths, planned files, dependency decisions, deviations, and verification results. Do not write run notes into an unauthorized repository path.
- Implement and test behavior at its owning layer. Add composed public-path coverage for the feature. If a custom adapter replaces the reference technology, identify the observable semantics being preserved and test the ones relevant to the task and risk.
- Start with focused tests. After the final implementation change, run the checks required by `AGENTS.md` and the task. Resolve findings introduced by the patch within the allowed boundary, then rerun only the affected checks after a fix. If a check is blocked, record its exact cause. Compare Knip configuration hints with the starting baseline when Knip is run. Run shared build-dependent checks sequentially when diagnosing a failure; avoid simultaneous Turbo pipelines that mutate the same artifacts.
- Capture concise command summaries; inspect detailed logs on failure. Distinguish fresh execution from Turbo cache hits. Repeat a check only after relevant changes, a failure, or an environment correction; do not count sandbox startup failures as product defects when an authorized unchanged rerun passes.

## Review and finish

- Complete the Cellix review. Compare the actual tree with the planned tree and map every acceptance criterion to source, test, and documentation evidence where required. For specified errors, verify both status and error code; verify material response and audit fields rather than relying only on collection lengths. A read-only feature may omit mutation machinery; a mutation workflow must implement its invariants and transaction boundary.
- Inspect `git diff --name-status`, `git diff --cached --name-status`, and `git ls-files --others --exclude-standard` against the initial snapshot and exact allowed paths. Check prohibited changes within allowed directories too: authentication, production settings, deployment, and unrelated behavior remain protected. Resolve agent-created violations; do not discard user changes.
- Run `git diff --check` and `git diff --cached --check`. Preserve the patch without automatically staging or committing it. Never bypass a failed hook to finish a feature run.
- Follow the task's explicit reporting requirements. Do not invent dollar cost, usage, or vendor approval evidence.

## Preparing the next comparable run

Before a comparative run, prepare one shared baseline with synchronized dependencies and recorded results for the checks required by `AGENTS.md` and the task. Remediate baseline dependency issues in a separate authorized maintenance change, then use the same starting point for every comparison. Keep security commands and policy consistent. Record temporary service outages as external verification limitations and rerun the unchanged scan when service recovers; do not score them as generated-code or harness defects.
