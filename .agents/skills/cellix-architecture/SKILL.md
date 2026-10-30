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

`--subdomain` is the subdomain name. `--field` and `--param` are `name:type`. Write the type as given (`string`, `string[]`, `'draft'|'archived'`). Quote a value that contains `[]` or `|`. Do not pass `createdAt` or `updatedAt`. The model sets those. `query` and `update` require `--transport rest` or `--transport graphql`. Rest requires `--route` and writes `/api/<route>`. Leave `--route` off for graphql. `--name` is kebab-case. Do not pass `--return`. Rest adds `app.get` or `app.post`. GraphQL `generate --action` writes that mutation's resolver. A GraphQL `query` writes the query field, and the resolver when it is missing. A later update adds a mutation.

The generator prints the files to edit. Barrels are wired. Do not open them. Leave the read method and the update assignment blank until you fill them in. Do not copy `<camel>Seed` into a handler or a read repository. Dependencies and tsconfig references are already added. Do not edit `package.json`. Do not run `pnpm install`. After `query`, `pnpm run agent-check -- pnpm run check` passes before you fill in behavior.

The generator writes `packages/axc/data-sources-mongoose-models` when that package is missing. Do not write that manifest yourself.

A query name cannot start with `create`, `update`, or `delete`. An update name cannot start with `query`, `get`, or `find`. Do not `generate` a create action unless the task writes rows through that action.

## Before the first check

Do not glob, grep, or read the tree first. Edit the files the generator printed, and a file a failing check names. Other reads are closed. Do not edit `package.json`. Do not run `pnpm install`. Do not redirect a check into a file.

- Pass an optional command field with a spread, and omit the property when the value is undefined.
- Copy the `insertMany` line from the seed file. The cast is already on that line.
- A Mongo filter is a typed object. Use dot access. `Record<string, unknown>` and bracket keys fail the check.

Run `pnpm run agent-check -- pnpm run check` while those behavior files change. The wrapper prints one short failure. A passing check on the scaffold is not the end. Do not add a script under `apps/docs`.

## Checks

While files change, run `pnpm run agent-check -- pnpm run check`. That is lint and typecheck. The wrapper prints the next edit. Do not pipe it, and do not redirect it into a file. The `Expected` line is the shape to restore. Read a file again only when that line names it.

Read the files the task names. Do not list the tree. A new subdomain starts with `generate`. Add `query` only after that backend exists. Any other change edits the existing file. Do not assign `CELLIX_AGENT_ID`. A denial names a wrong path. Do not edit `ocom-write.config.json` or `.cellix/sessions`.

When the search, the seed rows, the acceptance steps, and the mongo insert are in place, run `pnpm run agent-check -- pnpm run verify` once. Stop only after `CELLIX_VERIFY=pass`. Do not write `.cellix/verify.json`.

In `packages/axc-verification/acceptance-api/src/infrastructure.ts`, call `createMemoryMongoServer` from `@axc/service-mongoose`, await `start()`, and assign the uri before the API process spawns. `@axc/service-mongoose` and `mongoose` are already dependencies. Do not edit `package.json` to add them.

```ts
const mongoUri = memoryMongo.getUri();
const env = process.env as { MONGODB_URI?: string };
env.MONGODB_URI = mongoUri;
```

Stop the server in `afterAll`. `apps/api/src/index.ts` reads the same cast (`const env = process.env as { MONGODB_URI?: string }`). It does not construct `MongoMemoryServer`. Import `<camel>Seed` from `@axc/service-mongoose` and insert it with the line from the seed file. The generator already re-exports `<camel>Seed`. Persistence does not import the seed. Edit the feature and the steps the generator wrote. Do not add a second feature file.

`generate` narrows reads and writes to the files it printed. Instruction files stay readable. Do not edit `.cellix/sessions` to widen that list. A failing check names the next file. Do not glob a whole tree. Open `REFERENCE.md` only when a check names a file role.

## Writes

`ocom-write.config.json` has a `read` map and a `write` map. The first matching key in that map wins. A session at `.cellix/sessions/<CELLIX_AGENT_ID>.json` can list `read` and `write` separately. `files` is the write list when `write` is absent. The file exists at startup and holds the agent id. `generate` narrows that file's read and write lists to the slice. A session does not unlock a locked path. A shell assignment of `CELLIX_AGENT_ID` does not open a session. The shell may not have that variable.

File roles, visibility, and the dependency graph are in `REFERENCE.md` next to this file. Open that when a lint or write error names them.
