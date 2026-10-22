# AXC agent guidance

For AXC coding tasks, harness readiness checks, or evaluation runs, read [the repository harness skill](.agents/skills/axc-harness/SKILL.md) before implementation. It identifies the operative guidance and distinguishes native Codex work from the bundled Task A controller.

## Cellix architecture is a completion requirement

Before changing or reviewing `apps/api`, `packages/axc`, or `packages/axc-verification`, read [.agents/skills/cellix-architecture/SKILL.md](.agents/skills/cellix-architecture/SKILL.md). Inspect the actual applicable Cellix slice and create a compact responsibility/reference/destination map before implementation. Record the reference commit and any behavior-based omissions. For a stateful workflow, inspect the service-ticket aggregate and its adapter/converter, repository, unit of work, composition and focused tests.

- Domain owns aggregate identity, value objects, invariants and lifecycle changes. Application services orchestrate use cases; they do not own concrete storage maps or reproduce aggregate transition rules.
- Persistence owns fixtures/storage, read repositories, and the applicable command repository, props adapter/converter and unit-of-work implementation. API composition creates/injects data sources; application-service factories do not instantiate concrete persistence internally.
- REST owns request parsing and HTTP status mapping. Put feature routes in feature modules; keep package entrypoints focused on exports and composition. Follow the corresponding Cellix context/entity structure and public contract patterns.
- Test domain, application-service and persistence responsibilities directly, including transactional semantics that are implemented, then verify public HTTP behavior. Before reporting completion, perform the skill's alignment review. Functional tests, a low file count, and the existing health/fixture examples do not establish architectural alignment.

The user's current request and supplied task specification define scope. If their allowed directories or lockfile boundary conflict with the required Cellix layout, obtain an explicit boundary exception before implementing; do not silently flatten the design. Preserve existing/staged user changes. Keep vendored Cellix sources, authentication, production settings, fixed evaluation inputs and unrelated domains unchanged unless the user requests that work.

## Verification and evidence

Use the repository's locked pnpm dependencies and scripts. For feature completion, run focused behavior tests and `pnpm run verify`; run a direct docs build when affected documentation is omitted from Turbo inputs. Report failing/unavailable stages exactly. Readiness-only or harness-guidance-only work uses checks relevant to that change. A security-service outage is not a passing scan; changes outside a bounded task require a boundary decision rather than silent security-ignore or workspace edits.

Report commands and observed outcomes; distinguish original-task results from later publication or integration checks. Keep measured usage separate from projections and estimated cost. Do not claim a matched experiment, independent review, score or savings without the corresponding evidence.

## Extracted harness versus native guidance

Harness source is under `openai-harness-v7.12.02/`. Its historical Task A preset directs model/fixture/search code into application services and is not a Cellix-aligned implementation plan. Do not use that preset as architecture authority or as the default Cellix feature controller. Native Task A/B work follows the repository skills and fixed user task; a controlled Cellix preset would need a separate approved configuration and validation. Archived logs, prior releases, SHA manifests and Ollama results remain historical evidence, outside the routine agent context.
