# agentCourses (axc) — working notes for coding agents

A "dark software factory": your change is not done until `pnpm run verify`
passes. Read this before starting; it is short on purpose.

## The write boundary is the scored constraint

The task prompt names the paths you may write. Three traps that have already
caught a run here:

- **Adding a dependency forces a lockfile write.** `pnpm-lock.yaml` sits at the
  repo root, outside every task boundary. If you add a package, the lockfile
  changes and you have written outside the boundary. Prefer what is already in
  the workspace. If a dependency is genuinely unavoidable, say so in your
  summary rather than discovering it at commit time.
- **`packages/axc/domain/**` must not import infrastructure.** `test:arch`
  reads every `.ts` under `domain/src` — **tests included** — and fails on the
  literal strings `hono`, `@azure/`, `mongoose`, `mongodb`, `@axc/rest`,
  `@axc/persistence`, `@axc/service-mongoose`, `@axc/application-services`. A
  domain test that needs a database belongs in `packages/axc-verification/**`.
- **`packages/cellix/**` is vendored** from the CellixJS upstream. The prompt
  says it must never deviate from its source. Read it, reuse it, do not edit it.

## Reuse before you build

Twelve packages already exist under `packages/cellix/`. Writing an
application-specific version of one is a review failure:

`api-core` (bootstrap, service lifecycle) · `api-services-spec` ·
`domain-seedwork` (DDD primitives) · `mongoose-seedwork` (repository, unit of
work) · `serenity-framework` (Screenplay/Cucumber plumbing) ·
`server-mongodb-memory-mock-seedwork` · `event-bus-seedwork-node` ·
`local-dev` (portless, worktrees) · `config-typescript` / `config-vitest` /
`config-rolldown` · `archunit-tests`.

## What the gates cost

`pnpm run verify` is ten gates: script policy, biome, typecheck, build, knip,
e18e, architecture tests, unit + acceptance tests, audit, snyk. It takes
minutes — it is the enforcement boundary, not a search tool. While iterating,
reach for the cheapest thing that answers the question:

| need | command |
|---|---|
| lint or format one area | `pnpm exec biome check <path>` |
| test one package | `pnpm --filter <pkg> run test` |
| everything, before you claim done | `pnpm run verify` |

A gate reporting **SKIPPED** is not a pass. Say so explicitly rather than
implying the suite was green.

## Finish with evidence, not narration

End with a table: one row per numbered requirement and per acceptance
criterion, each with PASS/FAIL and the test or file that proves it. A
requirement whose only evidence is your own assertion is not done. Then the
commands you ran with their real output, and any limitations.

## Prose is the expensive part

Code and tests are the deliverable. Prose is overhead and output tokens are
scored.

- No preamble, no restating the task, no announcing what you are about to do.
- Never echo back a file you just wrote, and never summarise a diff the reader
  can read.
- One line of intent before a batch of tool calls, not one per call.
- If a sentence would not change what a reviewer does next, cut it.
