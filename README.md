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

## Course catalog

`GET /api/courses` searches the course catalog. It supports keyword search (`q`), filters (`modality`, `status`, `tag`), pagination (`page`, `pageSize`, max 50), and sorting (`sort`: `title`, `createdAt`, `updatedAt`). Invalid query parameters return `400` with an `INVALID_QUERY_PARAMETER` error body. The route lives in `@axc/rest`, the search logic in `@axc/application-services`, and the data is an in-memory seed of 16 courses in `@axc/persistence`.

```bash
curl -s 'https://api.agentcourses.localhost/api/courses?q=security&modality=online&pageSize=5'
```

See [apps/docs/docs/courses.md](apps/docs/docs/courses.md) for the full contract.

## Commands

Requires Node.js 24.21.0 (pinned in `mise.toml`) and pnpm 11. Run `mise install`, then activate mise in your shell (for example `eval "$(mise activate zsh)"`) or prefix commands with `mise exec --`. Dependency lifecycle scripts are disabled (`.npmrc` sets `ignore-scripts=true`).

| Command | What it does |
| --- | --- |
| `pnpm run dev` | Starts the API through portless (`https://api.agentcourses.localhost`) with hot reload. Set `WORKTREE_NAME` to the worktree directory name for a parallel hostname `api.agentcourses.<name>.localhost`. |
| `pnpm run test` | Unit tests and the Serenity/Cucumber healthcheck acceptance suite. |
| `pnpm run verify` | Full local gate. See below. |
| `pnpm run build` | Rolldown bundle of `@apps/api` plus an Azure Functions run-from-package zip at `apps/api/agentCourses-api.zip`. |
| `pnpm run start` | Starts the built API with the Azure Functions host (`func start` on `apps/api/deploy`). |

`pnpm run verify` runs, in order:

1. Dependency script policy (`ignore-scripts=true`)
2. Biome
3. TypeScript compilation
4. Knip
5. `@e18e/cli analyze`
6. Architecture tests
7. Unit tests and Serenity acceptance tests
8. `pnpm audit`
9. Snyk local CLI

Snyk does not call `snyk monitor` and does not pass `--remote-repo-url`. The organization slug is `agentcourses`. If the Snyk CLI or credentials are missing, verify prints `Snyk: SKIPPED` and the reason, and continues. That skip is non-blocking for this first scaffold only. A successful authenticated `snyk test` still fails the gate when Snyk reports vulnerabilities.

Husky and lint-staged format staged files on commit. `pnpm run verify` and the GitHub Actions workflow are the enforcement boundary. CI runs `pnpm install --frozen-lockfile` and `pnpm run verify`.

## Layout

- `apps/api` composes infrastructure, application services, and REST with `@cellix/api-core`.
- `apps/docs` is the Docusaurus site for the healthcheck and course catalog contracts.
- `packages/cellix/*` are reusable Cellix packages, including `@cellix/api-core`.
- `packages/axc/*` is the application layer.
- `packages/axc-verification/acceptance-api` drives `GET /health` over HTTP against the `@apps/api` host and writes a Serenity HTML report under `packages/axc-verification/acceptance-api/target/site/serenity`.
- `packages/axc-verification/archunit-tests` checks layering with `@cellix/archunit-tests`.

## Agent instructions

Coding agents start at [AGENTS.md](AGENTS.md). Claude Code and Copilot reach it through `CLAUDE.md` and `.github/copilot-instructions.md`. Instruction sets, their roles, and a change log are kept in [.agents/instructions/](.agents/instructions/README.md).

## Local tools

- [mise](https://mise.jdx.dev) for the pinned Node.js version in `mise.toml`
- Azure Functions Core Tools v4 (`func`) for `pnpm run dev`, `pnpm run start`, and acceptance tests.
- A JRE for the Serenity BDD report
- Snyk CLI, authenticated, when security results should fail the gate
