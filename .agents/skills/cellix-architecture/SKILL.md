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

The generator prints the files to edit. The barrels are already wired. Do not open them. Leave the read method and the update assignment blank until you fill them in. Do not copy `<camel>Seed` into a handler or a read repository. `@lucaspaganini/value-objects` is already available.

`packages/axc/data-sources-mongoose-models/package.json` is required. Write it when it is missing so the workspace can resolve `@axc/data-sources-mongoose-models`. Match the other `@axc` packages: `"private": true`, `"type": "module"`, `"exports"` pointing at `./dist`. Depend on `@cellix/mongoose-seedwork` and `mongoose`. Add a dependency only when a file in that package imports it. A `tsconfig.json` that extends `@cellix/config-typescript/node`, with `rootDir` `src` and `outDir` `dist`, belongs next to that manifest. Do not add a second config style.

A query name cannot start with `create`, `update`, or `delete`. An update name cannot start with `query`, `get`, or `find`.

A search or list endpoint is a `query`. Pass `--field` on that first call so the entity exists. Do not `generate` a create action unless the task writes rows.

## Checks

While the files are still changing, run `pnpm run agent-check -- pnpm run check`. That is lint and typecheck. The wrapper prints the next edit. Do not pipe it to `tail` or `head`. The `Expected` line is the shape to restore. Read a file again only when that line names it.

After the generator prints paths, edit those paths. Read `.cellix/sessions/<CELLIX_AGENT_ID>.json` once. Do not list the tree to find them. A denial names a wrong path. Do not edit `ocom-write.config.json` to open another one.

Acceptance starts Mongo in `packages/axc-verification/acceptance-api/src/infrastructure.ts`. Call `createMemoryMongoServer` from `@axc/service-mongoose`, await `start()`, and set `process.env.MONGODB_URI` to `getUri()` inside `setupEnvironment`, before the API process spawns. Stop the server in `afterAll`. Do not start it in `apps/api/src/index.ts`.

When the behavior is in place, run `pnpm run agent-check -- pnpm run verify` once. Finish only after it prints `CELLIX_VERIFY=pass`. Do not write `.cellix/verify.json`.

Do not glob a whole tree. Do not search without a directory. Read the slice you are editing. The open trees are `packages/axc`, `packages/axc-verification`, `apps/api/src`, and `apps/docs`. Also open `AGENTS.md`, this skill, the task requirements file, and `cellix-lint.config.json`. Open `REFERENCE.md` only when a check error names a file role. `node_modules`, `packages/cellix`, `scripts`, `.cursor`, and `pnpm-lock.yaml` are closed.

## Writes

`ocom-write.config.json` has a `read` map and a `write` map. The first matching key in that map wins. A session at `.cellix/sessions/<CELLIX_AGENT_ID>.json` can list `read` and `write` separately. `files` is the write list when `write` is absent. A session does not unlock a locked path, and a write list does not narrow reads. The generator records the write list for the new slice, `apps/docs/`, the acceptance tree, and the models `package.json`. It does not narrow reads. A shell assignment of `CELLIX_AGENT_ID` does not open a session. The runner sets that variable.

File roles, visibility, and the dependency graph are in `REFERENCE.md` next to this file. Open that when a lint or write error names them.
