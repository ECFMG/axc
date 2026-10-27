---
name: cellix-architecture
description: >
  Development workflow for agentCourses Cellix features. Use when adding or changing
  domain, application service, persistence, mongoose model, GraphQL, or REST code.
  Requires @cellix/generator for new features, @cellix/lint for file body, visibility,
  and dependency-graph checks, and the agentAccess write hook.
---

# Cellix development

Generate a new context, entity, or action. Edit a file that already exists. Do not invent a second layout.

`cellix-lint.config.json` stays at the project root. The generator reads it and writes into those paths.

## Commands

`generate` builds the entity. It does not add a REST route.

`query` adds a read. The repository method rejects with `not implemented`. Fill that method in. The result is `EntityReference[]`. Leave that array as it is in domain, persistence, and the application service. Shape the HTTP body in the REST index.

`update` loads with `getById` inside `withScopedTransaction`. Fill in the assignment above `save`.

```bash
pnpm --filter @cellix/generator generate -- --context course --entity course --action create --field courseName:string
pnpm --filter @cellix/generator query -- --context course --entity course --name search --param title:string --route courses --transport rest
pnpm --filter @cellix/generator update -- --context course --entity course --name publish --param status:string --transport rest
```

`--field` and `--param` are `name:type`. The type is written as given (`string`, `string[]`, `'online'|'in-person'|'hybrid'`). `--route` is the path name you pass. `--route courses` writes `/api/courses`. Left off, REST uses the entity name. With `--transport graphql`, `--route` is the field name. Do not pass `--return`. `--transport rest` on a query or update adds `app.get` or `app.post` in the REST index and calls the new function. It does not create a resolver. `--resolver` or `--transport graphql` writes the resolver. A later query adds a query field. A later update adds a mutation.

The generator prints the files to edit. The barrels are already wired. Do not open them. Leave the read method and the update assignment blank until you fill them in. Do not copy `<camel>Seed` into a handler or a read repository.

A query name cannot start with `create`, `update`, or `delete`. An update name cannot start with `query`, `get`, or `find`.

## Checks

While the files are still changing, run `pnpm run agent-check -- pnpm run check`. That is lint and typecheck. The full log stays out of the chat.

When the behavior is in place, run `pnpm run agent-check -- pnpm run verify` once. Finish only after it prints `CELLIX_VERIFY=pass`. Do not write `.cellix/verify.json`.

Do not glob a whole tree. Do not search without a directory. Read the slice you are editing. The open trees are `packages/axc`, `packages/axc-verification`, `apps/api/src`, and `apps/docs`. Also open `AGENTS.md`, this skill, the task requirements file, and `cellix-lint.config.json`. Open `REFERENCE.md` only when a check error names a file role. `node_modules`, `packages/cellix`, `scripts`, `.cursor`, and `pnpm-lock.yaml` are closed.

## Writes

`ocom-write.config.json` has a `read` map and a `write` map. The first matching key in that map wins. A session at `.cellix/sessions/<CELLIX_AGENT_ID>.json` can list `read` and `write` separately. `files` is the write list when `write` is absent. A session does not unlock a locked path, and a write list does not narrow reads. The generator records the write list for the new slice and the files it edited. It does not list docs, and it does not narrow reads.

File roles, visibility, and the dependency graph are in `REFERENCE.md` next to this file. Open that when a lint or write error names them.
