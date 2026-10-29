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

A search or list endpoint starts with `query`. Pass `--field` on that call so the entity exists. Do not run `--help`.

`query` adds a read. Filter params are optional. The repository method rejects with `not implemented`. Fill that method in. The result is `EntityReference[]`. Leave that array as it is in domain, persistence, and the application service. Shape the HTTP body in the REST index.

`generate` builds a mutation. It does not add a REST route. Use it when the task writes rows through an action. `generate` with no `--action` prints the query command and writes nothing.

`update` loads with `getById` inside `withScopedTransaction`. Fill in the assignment above `save`.

```bash
pnpm --filter @cellix/generator query -- --context <context> --entity <entity> --name <name> --field <field>:<type> --param <param>:<type> --route <route> --transport rest
pnpm --filter @cellix/generator generate -- --context <context> --entity <entity> --action <action> --field <field>:<type>
pnpm --filter @cellix/generator update -- --context <context> --entity <entity> --name <name> --param <param>:<type> --transport rest
```

`--field` and `--param` are `name:type`. The type is written as given (`string`, `string[]`, `'draft'|'archived'`). `--route` is the path name you pass. `--route <route>` writes `/api/<route>`. Left off, REST uses the entity name. With `--transport graphql`, `--route` is the field name. Do not pass `--return`. `--transport rest` on a query or update adds `app.get` or `app.post` in the REST index and calls the new function. It does not create a resolver. `--resolver` or `--transport graphql` writes the resolver. A later query adds a query field. A later update adds a mutation.

The generator prints the files to edit. The barrels are already wired. Do not open them. Leave the read method and the update assignment blank until you fill them in. Do not copy `<camel>Seed` into a handler or a read repository. The generator adds every dependency those files import, including `@axc/persistence` on application services and `@lucaspaganini/value-objects` on `@axc/domain`. After `query`, `pnpm run agent-check -- pnpm run check` passes before you fill in behavior. If that check cannot find one of those modules, run `pnpm install` once.

`packages/axc/data-sources-mongoose-models/package.json` is required. Write it when it is missing so the workspace can resolve `@axc/data-sources-mongoose-models`. Match the other `@axc` packages: `"private": true`, `"type": "module"`, `"exports"` pointing at `./dist`. Depend on `@cellix/mongoose-seedwork` and `mongoose`. Add a dependency only when a file in that package imports it. A `tsconfig.json` that extends `@cellix/config-typescript/node`, with `rootDir` `src` and `outDir` `dist`, belongs next to that manifest. Do not add a second config style.

A query name cannot start with `create`, `update`, or `delete`. An update name cannot start with `query`, `get`, or `find`. Do not `generate` a create action unless the task writes rows through that action.

## Checks

While the files are still changing, run `pnpm run agent-check -- pnpm run check`. That is lint and typecheck. The wrapper prints the next edit. Do not pipe it to `tail` or `head`. The `Expected` line is the shape to restore. Read a file again only when that line names it.

The session file `.cellix/sessions/<CELLIX_AGENT_ID>.json` exists when the agent starts. Read it once. An empty write list means run query before opening `packages/axc` or `apps`. After the generator prints paths, edit those paths. Do not list the tree to find them. A denial names a wrong path. Do not edit `ocom-write.config.json` to open another one.

When the behavior is in place, run `pnpm run agent-check -- pnpm run verify` once. Finish only after it prints `CELLIX_VERIFY=pass`. A diff whose paths are all on the session list lands. A path that is not on that list has to be reverted. Do not write `.cellix/verify.json`.

Acceptance owns the database process. In `packages/axc-verification/acceptance-api/src/infrastructure.ts`, call `createMemoryMongoServer` from `@axc/service-mongoose`, await `start()`, and set `process.env['MONGODB_URI']` to `getUri()` inside `setupEnvironment`, before the API process spawns. Stop the server in `afterAll`. `apps/api/src/index.ts` reads `process.env['MONGODB_URI']`. It does not construct `MongoMemoryServer`. Insert `<camel>Seed` from `packages/axc/service-mongoose/src/index.ts`. Re-export it from the models index: `export { <camel>Seed } from './models/<entity>/<entity>.seed.ts'`. Persistence does not import the seed.

Do not glob a whole tree. Do not search without a directory. Read the slice you are editing. After query, the open trees are `packages/axc`, `packages/axc-verification`, `apps/api/src`, and `apps/docs`. Also open `AGENTS.md`, this skill, the task requirements file, and `cellix-lint.config.json`. Open `REFERENCE.md` only when a check error names a file role. `node_modules`, `packages/cellix`, `scripts`, `.cursor`, and `pnpm-lock.yaml` are closed.

## Writes

`ocom-write.config.json` has a `read` map and a `write` map. The first matching key in that map wins. A session at `.cellix/sessions/<CELLIX_AGENT_ID>.json` can list `read` and `write` separately. `files` is the write list when `write` is absent. The file exists at startup with an empty write list and a read list that is only the brief. query adds the slice to both lists. A session does not unlock a locked path. A shell assignment of `CELLIX_AGENT_ID` does not open a session. The runner sets that variable.

File roles, visibility, and the dependency graph are in `REFERENCE.md` next to this file. Open that when a lint or write error names them.
