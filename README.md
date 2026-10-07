# agentCourses

agentCourses (`axc`) quantifies how harness engineering, agentic coding harnesses, and model selection affect software quality and delivery efficiency. This repository is the initial scaffold: a dark software factory where coding agents build in isolated git worktrees, and every output passes automated quality, architecture, security, and BDD gates.

The architecture follows [CellixJS](https://github.com/CellixJs/cellixjs). Reusable framework packages live in `packages/cellix` and are consumed as workspace packages. Application code lives in `packages/axc`. `@apps/api` is the composition root.

## Healthcheck

`GET /health` is served by the Hono route in `@axc/rest`, with the response built by `@axc/application-services`, through the same Cellix bootstrap `@apps/api` uses for local and Azure Functions execution.

`200` response:

```json
{
  "status": "ok",
  "service": "agentCourses-api",
  "projectCode": "axc",
  "environment": "<local|test|production>",
  "timestamp": "<ISO-8601 string>"
}
```

`environment` is `production` when `NODE_ENV=production`, `test` when `NODE_ENV=test`, and `local` otherwise.

## Commands

Requires Node.js 24 (`nvm use`) and pnpm 11. Dependency lifecycle scripts are disabled (`.npmrc` sets `ignore-scripts=true`).

| Command | What it does |
| --- | --- |
| `pnpm run dev` | Starts the API through portless (`https://api.agentcourses.localhost`) with hot reload. Set `WORKTREE_NAME` to the worktree directory name for a parallel hostname `api.agentcourses.<name>.localhost`. |
| `pnpm run test` | Unit tests and the Serenity/Cucumber healthcheck acceptance suite. |
| `pnpm run verify` | Full local gate. See below. |
| `pnpm run build` | Rolldown bundle of `@apps/api` plus an Azure Functions run-from-package zip at `apps/api/agentCourses-api.zip`. |
| `pnpm run start` | Starts the built API with the Azure Functions host (`func start` on `apps/api/deploy`). |

`pnpm run verify` runs, in order:

1. Dependency script policy (`ignore-scripts=true`)
2. Biome, including Cellix layer import rules
3. Cellix lint from `@cellix/lint` (file roles, file body, visibility, dependency graph)
4. TypeScript compilation
5. Knip
6. `@e18e/cli analyze`
7. Architecture tests
8. Unit tests and Serenity acceptance tests
9. `pnpm audit`
10. Snyk local CLI

Snyk does not call `snyk monitor` and does not pass `--remote-repo-url`. The organization slug is `agentcourses`. If the Snyk CLI or credentials are missing, verify prints `Snyk: SKIPPED` and the reason, and continues. That skip is non-blocking for this first scaffold only. A successful authenticated `snyk test` still fails the gate when Snyk reports vulnerabilities.

Husky and lint-staged format staged files on commit. `pnpm run verify` and the GitHub Actions workflow are the enforcement boundary. CI runs `pnpm install --frozen-lockfile` and `pnpm run verify`.

## Layout

- `apps/api` composes infrastructure, application services, and REST with `@cellix/api-core`.
- `apps/docs` is the Docusaurus site for the healthcheck contract.
- `packages/cellix/*` are reusable Cellix packages, including `@cellix/api-core`.
- `packages/axc/*` is the application layer.
- `packages/axc-verification/acceptance-api` drives `GET /health` over HTTP against the `@apps/api` host and writes a Serenity HTML report under `packages/axc-verification/acceptance-api/target/site/serenity`.
- `packages/axc-verification/archunit-tests` checks layering and Cellix structure with `@cellix/archunit-tests`. `@cellix/lint` runs the same structure rules, plus file-body, visibility, and dependency-graph checks, from `pnpm run lint` and on commit. `@cellix/generator` writes a new feature slice into those rules.

## Local tools

- Azure Functions Core Tools v4 (`func`) for `pnpm run dev`, `pnpm run start`, and acceptance tests.
- A JRE for the Serenity BDD report
- Snyk CLI, authenticated, when security results should fail the gate
