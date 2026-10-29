---
name: cellix-architecture
description: >
  Development workflow for agentCourses Cellix features. Use when adding or changing
  domain, application service, persistence, mongoose model, GraphQL, or REST code.
  Requires @cellix/generator for new features, @cellix/lint for file body, visibility,
  and dependency-graph checks, and the agentAccess write hook.
---

# Cellix development

Generate a new context, subdomain, or action. Edit a file that already exists. Do not invent a second layout.

`cellix-lint.config.json` stays at the project root. The generator reads it and writes into those paths.

## Commands

A new REST read is two commands, in this order. Do not run `--help`.

1. `generate` builds the subdomain: domain, model, and persistence. Pass every `--field` here. No `--action`. No `--transport`. It does not add a route.
2. `query` adds the read onto that subdomain. Pass `--name`, `--param`, `--route`, and `--transport rest`. No `--field`. It writes the repository method, the application service, and `GET /api/<route>`.

```bash
pnpm --filter @cellix/generator generate -- --context <context> --subdomain <subdomain> --field <field>:<type>
pnpm --filter @cellix/generator query -- --context <context> --subdomain <subdomain> --name <name> --param <param>:<type> --route <route> --transport rest
```

The repository method rejects with `not implemented`. Fill that method in. The result is `EntityReference[]`. Leave that array as it is in domain, persistence, and the application service. Shape the HTTP body in the REST index.

A new GraphQL read is the same two commands. No `--route`. The field name is `--name`.

1. `generate` is the same subdomain command. Pass every `--field`. No `--action`. No `--transport`.
2. `query` adds the query field. Pass `--name`, `--param`, and `--transport graphql`. No `--field`. No `--route`.

```bash
pnpm --filter @cellix/generator generate -- --context <context> --subdomain <subdomain> --field <field>:<type>
pnpm --filter @cellix/generator query -- --context <context> --subdomain <subdomain> --name <name> --param <param>:<type> --transport graphql
```

That `query` writes the resolver when the file does not exist yet. A later GraphQL query adds another query field.

A mutation is `generate` with `--action`. Add `--transport graphql` on that command when the mutation should have a resolver. Leave it off and there is no resolver. `update` loads with `getById` inside `withScopedTransaction`. Fill in the assignment above `save`. A REST update requires `--route`. A GraphQL update does not. The field name is `--name`.

```bash
pnpm --filter @cellix/generator generate -- --context <context> --subdomain <subdomain> --action <action> --field <field>:<type>
pnpm --filter @cellix/generator generate -- --context <context> --subdomain <subdomain> --action <action> --field <field>:<type> --transport graphql
pnpm --filter @cellix/generator update -- --context <context> --subdomain <subdomain> --name <name> --param <param>:<type> --route <route> --transport rest
pnpm --filter @cellix/generator update -- --context <context> --subdomain <subdomain> --name <name> --param <param>:<type> --transport graphql
```

`--subdomain` is the subdomain name. `--field` and `--param` are `name:type`. The type is written as given (`string`, `string[]`, `'draft'|'archived'`). Quote a value that contains `[]` or `|`. Do not pass `createdAt` or `updatedAt` as `--field`. The model sets those timestamps. `query` and `update` require `--transport rest` or `--transport graphql`. `--route` is required for rest and writes `/api/<route>`. Leave `--route` off for graphql. The field name is the function name. Do not pass `--return`. `--transport rest` adds `app.get` or `app.post` in the REST index. `--transport graphql` on `generate` with `--action` writes that mutation's resolver. A GraphQL `query` writes the query field, and the resolver file when it is missing. A later update adds a mutation.

The generator prints the files to edit. The barrels are already wired. Do not open them. Leave the read method and the update assignment blank until you fill them in. Do not copy `<camel>Seed` into a handler or a read repository. The generator adds every dependency those files import, including `@axc/persistence` on application services and `@lucaspaganini/value-objects` on `@axc/domain`. After `query`, `pnpm run agent-check -- pnpm run check` passes before you fill in behavior. If that check cannot find one of those modules, run `pnpm install` once.

`packages/axc/data-sources-mongoose-models/package.json` is required. Write it when it is missing so the workspace can resolve `@axc/data-sources-mongoose-models`. Match the other `@axc` packages: `"private": true`, `"type": "module"`, `"exports"` pointing at `./dist`. Depend on `@cellix/mongoose-seedwork` and `mongoose`. Add a dependency only when a file in that package imports it. A `tsconfig.json` that extends `@cellix/config-typescript/node`, with `rootDir` `src` and `outDir` `dist`, belongs next to that manifest. Do not add a second config style.

A query name cannot start with `create`, `update`, or `delete`. An update name cannot start with `query`, `get`, or `find`. Do not `generate` a create action unless the task writes rows through that action.

## Checks

While the files are still changing, run `pnpm run agent-check -- pnpm run check`. That is lint and typecheck. The wrapper prints the next edit. Do not pipe it to `tail` or `head`. The `Expected` line is the shape to restore. Read a file again only when that line names it.

Read the files the task names. Do not list the tree or cat a directory. A new subdomain starts with `generate`. Add `query` only after that backend exists. Any other change edits the existing file. Do not assign `CELLIX_AGENT_ID`. A denial names a wrong path. Do not edit `ocom-write.config.json` to open another one.

When the behavior is in place, run `pnpm run agent-check -- pnpm run verify` once. Finish only after it prints `CELLIX_VERIFY=pass`. Do not write `.cellix/verify.json`.

Acceptance owns the database process. In `packages/axc-verification/acceptance-api/src/infrastructure.ts`, call `createMemoryMongoServer` from `@axc/service-mongoose`, await `start()`, and set `process.env['MONGODB_URI']` to `getUri()` inside `setupEnvironment`, before the API process spawns. Stop the server in `afterAll`. `apps/api/src/index.ts` reads `process.env['MONGODB_URI']`. It does not construct `MongoMemoryServer`. Insert `<camel>Seed` from `packages/axc/service-mongoose/src/index.ts`. Re-export it from the models index: `export { <camel>Seed } from './models/<entity>/<entity>.seed.ts'`. Persistence does not import the seed.

Do not glob a whole tree. Do not search without a directory. Read the file you are changing. The open trees are `packages/axc`, `packages/axc-verification`, `apps/api/src`, and `apps/docs`. Also open `AGENTS.md`, this skill, the task requirements file, and `cellix-lint.config.json`. Open `REFERENCE.md` only when a check error names a file role. `node_modules`, `packages/cellix`, `scripts`, `.cursor`, and `pnpm-lock.yaml` are closed.

## Writes

`ocom-write.config.json` has a `read` map and a `write` map. The first matching key in that map wins. A session at `.cellix/sessions/<CELLIX_AGENT_ID>.json` can list `read` and `write` separately. `files` is the write list when `write` is absent. The file exists at startup and holds the agent id. It does not close the product tree. A session does not unlock a locked path. A shell assignment of `CELLIX_AGENT_ID` does not open a session. The shell may not have that variable.

File roles, visibility, and the dependency graph are in `REFERENCE.md` next to this file. Open that when a lint or write error names them.
