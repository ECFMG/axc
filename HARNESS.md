# Repository harness integration

The supplied `openai-harness-v7.12.02-updated.zip` has been replaced by its extracted files. Original harness files are unchanged, so reviewers can inspect and diff the source directly.

| Location | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Root instructions discovered by Codex; routes coding/evaluation work to the repository skill |
| [.agents/skills/axc-harness/SKILL.md](.agents/skills/axc-harness/SKILL.md) | Native workflow, task selection, guardrails, validation and accounting guidance |
| [openai-harness-v7.12.02/README.md](openai-harness-v7.12.02/README.md) | Upstream controller usage and current release workflow |
| [openai-harness-v7.12.02/CODING_TASKS.md](openai-harness-v7.12.02/CODING_TASKS.md) | Frozen coding-task protocol and execution modes |

Root guidance loads the operative workflow on relevant tasks. It does not eagerly load historical reports, prior versions or result logs. Those remain ordinary committed source/evidence files in the extracted directory. The archive's CHECKLIST.md and QUALITY.md describe historical/teaching workflows; they are not substituted for the current coding workflow or coding rubric.

The bundled controller preset is for Task A. Task B prompt/requirements exist in the repository and can guide native implementation, but this installation does not introduce a new Task B controller. No application feature, dependency, deployment, authentication or CI changes are included. Committing instructions makes them discoverable; it does not automatically launch a model or prove savings.

From the repository root:

```sh
python3 -B openai-harness-v7.12.02/run_task_a.py --help
```

For harness regression tests, run from the extracted directory with Python 3.9+, Node and the existing TypeScript runtime available:

```sh
cd openai-harness-v7.12.02
HARNESS_TEST_TYPESCRIPT=/absolute/path/to/typescript/lib/typescript.js python3 -B -m unittest discover -v
```

See the extracted README before preparing a measured trial: preparation requires a clean declared checkout, and its evidence directory must be outside that checkout. The installed native skill does not claim that controller-enforced budgets apply to native Codex sessions.

Source archive SHA-256: `14a5f3c308670fc4d04ced33c514976b42dc3db1187fa4cb65b00ed3f50dbf90`.

## Loading and verification evidence

A fresh native Codex readiness task automatically received root AGENTS.md and read the repository skill and referenced coding guidance. The transcript confirms these reads; this is loading evidence, not a claim of feature completion or savings. All 299 harness regression tests and official skill validation passed. See [installation verification](harness-integration/README.md), [native transcript](harness-integration/agent-task-transcript.jsonl), and [machine-readable results](harness-integration/validation.json).

## Cellix alignment correction

The native entrypoint now requires `.agents/skills/cellix-architecture/SKILL.md`, with an upstream-verified reference map and review checklist. Domain lifecycle rules and concrete storage cannot be collapsed into application services merely to reduce file count. Agents must inspect actual reference source, map responsibilities before writing, and review architecture separately from functional tests.

The original extracted files remain unchanged for provenance. Their historical Task A configuration includes a fixture-oriented application-service implementation plan and is not approved as the default controller for Cellix-aligned feature work. Native Task A/B runs use the repository skills; no new controlled Cellix preset is claimed. If task write boundaries prevent required directories or lockfile updates, surface the conflict before implementation.

The [Cellix correction evidence](harness-integration/architecture-correction/README.md) includes the configuration diff, verified source anchors and a fresh read-only probe that rejects the prior simplified application-service implementation. The screenshot’s separate local working tree was unavailable; no application refactor or new Task B result is claimed.
