---
name: axc-harness
description: Apply the repository's extracted coding harness to AXC implementation tasks, harness-readiness checks, and evaluation reporting. Distinguish native Codex work from the supplied Task A controller and preserve measurement evidence.
---

# AXC harness workflow

Resolve paths from the repository root. Read `openai-harness-v7.12.02/README.md` for the current controlled-upgrade workflow. For controller commands and frozen coding contracts, consult `openai-harness-v7.12.02/CODING_TASKS.md` and the selected task configuration. Read only relevant sections; do not ingest historical releases, logs, SHA manifests or Ollama reports as routine context.

## Choose the actual task and execution mode

- Read the task prompt and requirements named by the user completely. For the bundled AXC tasks these are `task-set-a-prompt.md` / `task-set-a-requirements.md` or `task-set-b-prompt.md` / `task-set-b-requirements.md` at the repository root. Their allowed/protected write boundaries govern feature work; user instructions take precedence.
- The shipped `coding-task-set-a.json`, `run_task_a.py` and independent course verifier are **Task A-specific**. Their presence does not establish a Task B controller or enrollment acceptance suite. For Task B, implement the supplied Task B specification natively and record its own tests and boundaries. Creating a controlled Task B preset is separate work; do not silently rename or reuse the Task A preset.
- The bundled Task A preset explicitly plans model, fixture storage and search in application services. That frozen historical plan conflicts with the current Cellix architecture profile: do not invoke it as the default controller for a Cellix feature evaluation. Native Task A/B work uses the fixed task requirements plus these repository skills. A separately approved Cellix controller profile and verifiers would be needed for controller-enforced execution; none is claimed by this integration.
- For an explicitly requested historical controlled adapter experiment, use its documented controller, provider ledger and review workflow, and disclose the fixture-oriented architecture profile. Do not start a provider/model experiment merely because the harness is installed.

## Before a measured implementation

Record the requested task ID, branch and exact starting commit. A comparison must use equivalent declared starting source and work scope; a completed feature is not a fresh implementation baseline. Keep raw run evidence in a new directory outside the measured checkout, as required by the controller. Run preparation only on a clean checkout with its declared runtime/dependencies; report failed prerequisites instead of silently repairing production or environment settings.

When usage measurement is requested, identify the original session and turn, capture the available cumulative counters and timestamp, and record a separate projection before substantive work. Include inspection, planning, implementation, validation and reporting in the declared scope. Preserve failed attempts and meaningful changes in scope.

## Implementation and verification

Before implementation or architecture review, read [the Cellix architecture skill](../cellix-architecture/SKILL.md). It is mandatory for the affected API/AXC/verification layers, including small catalogs and in-memory workflows. Its reference map and post-implementation review are completion evidence. The health-service pattern and fixture-only examples do not justify omitting domain or persistence responsibilities.

Follow existing `apps/api` composition, `packages/axc/rest` routes and application-service/domain/persistence package contracts. Keep vendor code and unrelated configuration unchanged. Prefer bounded source reads; retain a retrieval path when excerpts omit relevant material. Resolve failures with focused checks; do not repeat unchanged reads or validation without a new question or code change.

For feature completion run focused tests and the repository `pnpm run verify` gate, rather than treating a subset of passing checks as architectural acceptance. Its stages include lint/format policy, typecheck, build, Knip, dependency analysis, architecture, tests and security checks. The existing Turbo build inputs omit docs, so run `pnpm --filter @apps/docs build` directly after documentation changes. Readiness-only or documentation-only tasks do not require feature implementation or the entire application suite. Controller runs additionally use the frozen checks in their selected configuration. A review packet is not evidence that a review happened; report its actual status.

## Usage, assessment and handoff

Calculate native task usage as ending cumulative `total_token_usage` minus the counters at the starting boundary; never sum cumulative snapshots. Cached input is part of input, and reasoning output is part of output. Record explicit subagent usage separately when used and available; unknown counters remain unknown. Freeze the original turn boundary and exclude follow-ups. If final-response counters are pending, mark accounting incomplete and recover that original turn on the next user message before answering.

Provide implementation/source identity, relevant validation outcomes, limitations, separate measured/projection/cost fields and evidence locations. Read `openai-harness-v7.12.02/RUBRIC_POLICY.json` only when assessing scores or comparisons. Distinguish a qualified retrospective comparison from the policy's predeclared matched experiment. Historical test logs and mocked harness regressions are not new live-task results or measured savings.
