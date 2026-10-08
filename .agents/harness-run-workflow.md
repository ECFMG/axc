# Feature run workflow

This workflow addresses the iteration-2 evaluation on `dn-oai-2-a-out`: architecture and functionality passed, but lockfile scope, late dependency-audit findings, an unrequested commit attempt, and repeated context/verification work reduced the result. It applies to feature implementation runs, not to explicitly requested harness maintenance or evaluation-file edits. The temporary Snyk service degradation is external infrastructure evidence, not a harness defect or a reason to change scan configuration.

## Establish the run boundary

- Record the starting branch/commit and `git status --short`; preserve existing user changes. Read the fixed task requirements once and extract the allowed paths, acceptance criteria, and prohibited changes into a compact working checklist.
- Check required workspace dependency edges against existing package manifests before writing code. When the task permits adding dependencies with justification, that permission includes the root package-manager lockfile as the generated record of dependency declarations made in package manifests inside the allowed write boundary, unless the task explicitly prohibits lockfile changes. Explain each dependency edge before editing, keep the lockfile diff limited to those edges and unavoidable package-manager metadata, and record the justification in the handoff. Obtain a boundary exception for root workspace configuration or unrelated lockfile changes. Do not introduce undeclared imports or flatten architecture to avoid package dependencies.
- Review any existing baseline verification record before implementation, including dependency advisories and Knip findings. `pnpm verify` runs both audit and Knip, so do not run them separately unless diagnosing a failure or establishing a missing baseline. Distinguish new actionable findings from inherited findings and Knip configuration hints. Do not change scan ignores or root `knip.json` merely to silence findings during a bounded feature task.

## Use context and verification deliberately

- Use targeted file discovery and bounded reads. Read only the Cellix layers applicable to the chosen feature, including their relevant composition and test companions. Reuse the resulting alignment map throughout the run instead of repeatedly loading whole repository diffs or unrelated slices.
- Keep one compact checklist for requirements, reference paths, dependency decisions, deviations, and verification results. Do not write run notes into an unauthorized repository path.
- Start with focused tests. After the final implementation change, run `pnpm verify` as the final handoff gate. It includes script policy, Biome, typecheck, build, Knip, e18e, architecture tests, full tests, audit, and Snyk. Resolve findings introduced by the patch within the allowed boundary, then rerun `pnpm verify` after the fix. Do not report the changes as ready for handoff unless the command exits successfully; report any blocked check and its exact cause. Compare Knip configuration hints with the starting baseline and report them separately. Run shared build-dependent checks sequentially if diagnosing a failed gate; avoid simultaneous Turbo pipelines that mutate the same artifacts.
- Capture concise command summaries; inspect detailed logs on failure. Distinguish fresh execution from Turbo cache hits. Repeat a check only after relevant changes, a failure, or an environment correction; do not count sandbox startup failures as product defects when an authorized unchanged rerun passes.

## Review and hand off

- Complete the Cellix review and map each acceptance criterion to source/test evidence. A read-only feature may omit mutation machinery; a mutation workflow must implement its invariants and transaction boundary.
- Inspect `git diff --name-status`, `git diff --cached --name-status`, and `git ls-files --others --exclude-standard` against the initial snapshot and exact allowed paths. Check prohibited changes within allowed directories too: authentication, production settings, deployment, and unrelated behavior remain protected. Resolve agent-created violations; do not discard user changes.
- Run `git diff --check` and `git diff --cached --check`. Preserve the patch without automatically staging or committing it. Never bypass a failed hook to finish a feature run.
- Give a short handoff with requirements completed, reference paths and intentional deviations, the final `pnpm verify` exit status and relevant findings (including Knip findings and configuration hints), outstanding blockers, and measured usage if available. Keep primary and helper token totals explicit; cached tokens are part of input and reasoning tokens are part of output. Do not invent dollar cost or vendor approval evidence.

## Preparing the next comparable run

Before starting the fixed task, the operator should prepare one shared baseline with synchronized dependencies and a recorded `pnpm verify` result. Remediate dependency issues in a separate authorized maintenance change, then use the same baseline for every comparison. Keep the existing Snyk command and policy. Record temporary security-service outages as external verification limitations and rerun the unchanged gate when service recovers; do not score them as generated-code or harness defects.
