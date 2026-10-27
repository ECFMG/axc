---
name: cellix-architecture
description: >
  Development workflow for agentCourses Cellix features. Use when adding or changing
  domain, application service, persistence, mongoose model, GraphQL, or REST code.
  Requires @cellix/generator for new features, @cellix/lint for file body, visibility,
  and dependency-graph checks, and the agentAccess write hook.
---

# Cellix development

`@cellix/generator` is how a new data structure starts: a new context, entity, or action. Course catalog search and course enrollment are examples of that kind of addition. They are not the only work this repo can hold.

`cellix-lint.config.json` stays at the project root. `generate` reads it and writes into those paths, including `acceptance`. Cellix lint reads the same file.

A change to a structure that already exists does not need the generator. That includes a bugfix, a validation rule, a query filter, a route that already has a handler, a test, or documentation. Edit the existing files. Cellix lint still checks file roles, imports, and the dependency graph.

Write product code, acceptance tests, API source, and docs on paths whose `agentAccess` entry is true. The control plane stays locked. Do not hand-create a new context, entity, or action. Generate it so the file roles exist. Do not add a helper, util, common, or shared module.

The health host in `packages/axc/application-services/src/index.ts` is the composition root. It is not an action template.

## Guardrails

Use them in this order. Each one catches a different class of drift.

| Guardrail | What it forces | When it runs |
| --- | --- | --- |
| `@cellix/generator` | The file set for one context, entity, and action | Before any new feature files exist |
| `@cellix/guardrails` | Session, write decision, and verify flag. `ocom-write.config.json` is the allow list. `.cursor/hooks/cellix-write-allow.mjs` is the Cursor adapter | Every write, and at the end of `pnpm run verify` |
| `@cellix/lint` | File roles, file body, public imports, dependency graph | `pnpm --filter @cellix/lint lint:cellix`, `pnpm run lint`, commit, `pnpm run verify` |
| Biome, extended from `@cellix/lint/biome` | Formatter, recommended rules, and layer import bans. The repo `biome.json` extends that file and adds only app-specific ignores and overrides | `pnpm exec biome check` |
| `@cellix/archunit-tests` `./structure` | The same lint, as an architecture test apps opt into | `pnpm run test:arch` |

Do not edit `packages/cellix/lint`, `packages/cellix/generator`, `cellix-lint.config.json`, or `.cursor/hooks` to make a feature pass. Those are the control plane. A human changes them on purpose.

## New feature

Run the generator for a new context, entity, or action. Do not create that slice by hand. Skip the generator when the files already exist and the work is behavior, tests, or docs.

```bash
pnpm --filter @cellix/generator generate -- --context course --entity course --action create \
  --field courseName:string --field isPublished:boolean \
  --permission canManageCourse \
  --nested address:street:string,city:string \
  --nested activity-log:id:id,activityType:string
```

`--context`, `--entity`, and `--action` are kebab-case. `generate` builds the entity. `create` and `delete` are mutations on that command. Repeat `--field name:type`. The type is written as given (`string`, `string[]`, `'online'|'in-person'|'hybrid'`) and `--permission name` to fill the aggregate and the permissions interface. Repeat `--nested name:field:type,field:type`. A nested object that includes `id:id` is an entity, because it has its own identity. A nested object without an id is a value object. In a fields file, a nested `fields` entry may itself be a nested object, and the same id rule applies at every level. A nested entity can sit on the aggregate or inside another entity. It cannot sit inside a value object. The `--nested` flag stays one level deep. `--fields <file>` reads the same three lists from JSON. Flags after the file are added to it. `--resolver` writes the GraphQL schema and resolver that call `context.applicationServices`. Leave it off in this repo. `--transport graphql` is the same resolver output as `--resolver`. `--transport rest` does not write a resolver. `generate` does not add a route.

A query and an update are separate commands. `--name` is the function name. Repeat `--param name:type` for the command. Those params are the command interface, the repository method, and the REST input. The function name does not choose the flow.

```bash
pnpm --filter @cellix/generator query -- --context course --entity course --name search \
  --param title:string --param status:string --transport rest

pnpm --filter @cellix/generator update -- --context course --entity course --name publish \
  --param status:string --transport rest
```

`query` adds `<name>` on the read repository and calls it from the action. The method rejects with `not implemented`. The result is `EntityReference[]`. Leave that array as it is in domain, persistence, and the application service. Shape the HTTP body in the REST index. `--route` is the path name you pass (`--route courses` writes `/api/courses`). Do not pass `--return`. `update` loads with `getById` inside `withScopedTransaction`, leaves a comment where the assignment goes, and `save`s. Its command is `id` plus the params. With `--transport rest`, each of those commands adds one route to `packages/axc/rest/src/index.ts`. A query is `app.get`. An update is `app.post`. The route calls `applicationServices.<Context>.<Entity>.<name>`. It does not write a resolver file. When a resolver already exists, `query` adds a GraphQL query and `update` adds a mutation. The first call for an entity still writes the aggregate from `--field`. A later call adds the function and leaves that aggregate in place. A query name cannot start with `create`, `update`, or `delete`. An update name cannot start with `query`, `get`, or `find`.

```json
{
	"fields": [
		{ "name": "firstName", "type": "string" },
		{ "name": "accessBlocked", "type": "boolean" }
	],
	"permissions": ["canManageStaff"],
	"nested": [
		{ "name": "display-name", "fields": [{ "name": "label", "type": "string" }] },
		{ "name": "activity-log", "fields": [{ "name": "id", "type": "id" }, { "name": "activityType", "type": "string" }, { "name": "detail", "fields": [{ "name": "label", "type": "string" }] }] }
	]
}
```

```bash
pnpm --filter @cellix/generator generate -- --context user --entity staff-user --action create --fields staff-user.fields.json
```

The generator runs Biome on those files before it reports success, so import order and line length already match `biome.json`.

That command writes a scaffold. It does not finish the feature. The text of each new file is a template under `packages/cellix/generator/src/templates/`, in a folder named for the package that receives it. `src/plan.ts` chooses the paths. `src/write/new-files.ts` creates files that do not exist yet. `src/compose.ts` edits barrels that already exist. `src/session-files.ts` records the session.

`getNewInstance` builds `const newInstance` and calls `private markAsNew()`, which sets `isNew`. Setters assign the value. They do not call `visa.determineIf`. The visa, the permissions interface, and passport are there so a later edit can add a check. There is no created event. After the files exist, build the behavior they only sketch.

The command writes:

1. Domain permissions, visa, passport (passport is created once), value objects, aggregate, repository interface, unit-of-work interface
2. `models/<entity>/<entity>.model.ts` and `models/<entity>/<entity>.seed.ts`
3. Persistence domain adapter, repository, and `get<Entity>UnitOfWork`
4. The read side: `datasources/readonly/<context>/<entity>/<entity>.data.ts`, `<entity>.read-repository.ts`, and the entity index that returns `<Entity>ReadRepo`. The `query` command adds `<name>` on that read repository. The `update` command writes the `withScopedTransaction` action. `create` and `delete` call `getNewInstance` inside `withScopedTransaction`.
5. `contexts/<context>/<entity>/<action>.ts` and the context `index.ts`

`datasources/readonly/mongo-data-source.ts`, `datasources/readonly/index.ts`, and `datasources/readonly/<context>/index.ts` are created once. A later generate leaves them in place. Add the next entity to those indexes yourself.

It refuses to overwrite an entity file. A second action in an existing entity is a new generator invocation only when that action file does not already exist; shared passport is left in place. If the generator stops, do not copy a file over the collision.

Then build:

- Value-object bounds and what the aggregate setters enforce
- Repository methods behind `getNewInstance` and `getById`
- The command fields and the body inside `withScopedTransaction` or the read-repository method
- A visa check on a setter, when the feature needs one: `if (!this.isNew && !this.visa.determineIf(...)) throw new PermissionError(...)`
- The `Domain` namespace, as `export * as Domain from './domain/index.ts'` on the domain package index. Do not add `export type { Course, ... }` or `export const Domain` there. Do not add document types to a domain adapter. Do not import `<camel>Seed` into a read repository or return it from one. An action imports `DataSources` from `@axc/persistence` and `Domain` from `@axc/domain`. It does not declare those types itself. Files inside the persistence package import `ModelsContext` from `models-context.ts`
- The Azure function route in `apps/api/src/index.ts`. It calls `Persistence({ service: mongoose })`. Do not start `MongoMemoryServer` or `startMockMongoDB` there. That server is for tests
- The Hono route in `packages/axc/rest/src/index.ts` for a `query` or `update`. It calls `applicationServices.<Context>.<Entity>.<name>(command)`
- The new service on the health host, `packages/axc/application-services/src/index.ts`. Add it beside `health` on `ApplicationServices` and return it from `buildApplicationServicesFactory`. Keep `health.getStatus`
- The context factory's ports, when the action needs more than `DataSources`

When that behavior is in place, run `pnpm run verify`. That command runs Cellix lint, then typecheck and build. Lint only checks file shape. Generate finishing is not that check. `pnpm run verify` is the last check before the work is done. It prints `CELLIX_VERIFY=pass` and writes `.cellix/verify.json` with `"flag": "pass"` only when every step exits 0. That file is the flag. Nothing prompts again. If the flag is missing, verify did not pass.

## Testing

Start the application with `pnpm run dev` and call the endpoint. The rows come from the database.

`models/<entity>/<entity>.seed.ts` exports `<camel>Seed`, one example document. Insert that document into the `<Pascal>` collection, then read it back through the running app. Do not copy it into a REST handler, a GraphQL resolver, a read repository, or a test that replaces the database with an in-memory list.

A REST handler other than `index.ts` calls `applicationServices.<Context>.<Entity>.<action>(command)` inside the function that receives `applicationServices`. Context and Entity are PascalCase. Mentioning `applicationServices`, casting it, or calling a local list when the property is missing does not count. A REST file does not keep an array of documents.

## Sessions

The session rules are `packages/cellix/guardrails/src/session.mjs`. The write order is `packages/cellix/guardrails/src/write/decide.mjs`: `agentAccess` first, then an exact `true` path, then the session. A session belongs to one agent. It does not replace `agentAccess`, and it does not apply to any other agent.

The harness sets `CELLIX_AGENT_ID` (`task-a`, `task-b`) in that agent's environment before the agent runs. The generator then writes `.cellix/sessions/<id>.json`. The write hook reads that same file. A write needs both: the first matching `agentAccess` entry is true, and the path is in that agent's list. An entry that ends with `/` is a directory. A second generate for the same id adds to the list.

The directories are the new context and the new model. Every other file the generator edits is an exact path, including the REST index and `apps/api/src/index.ts`. Docs are not in the session. The rest of `packages/axc/rest`, `apps/api/src`, `apps/docs`, the acceptance package, and `packages/axc/service-mongoose` stay closed.

An exact `true` key with no `*` stays open for that side during a session. A glob can be narrowed by the session. `pnpm-workspace.yaml`, `pnpm-lock.yaml`, and `.snyk` stay writable because they are exact `true` entries in the `write` map.

No `CELLIX_AGENT_ID` means no session. Standing `read` and `write` are the only checks. An empty write list or invalid JSON does not open writes. A missing `read` array does not narrow reads. The agent does not delete the session file. After `.cellix/verify.json` matches the tree, the stop hook and the session-end hook remove `.cellix/sessions/<CELLIX_AGENT_ID>.json`. The verify file stays.

## Verify flag

The flag rules are `packages/cellix/guardrails/src/verify-flag.mjs`. `pnpm run verify` writes `.cellix/verify.json` and prints `CELLIX_VERIFY=pass` only after lint, typecheck, build, tests, audit, and Snyk all exit 0. The file records git HEAD and a hash of `git status --porcelain`, so the pass belongs to that tree. `pnpm run verify:flag` prints `CELLIX_VERIFY=pass` while the tree still matches and `CELLIX_VERIFY=stale` after another edit. `.cellix/verify.json` is not a writable product file. A write to that path is denied even when `agentAccess` would allow it.

`.cursor/hooks/cellix-verify-stop.mjs` runs when a turn ends. With `CELLIX_AGENT_ID` set, a missing or stale flag becomes the next user message: run `pnpm run agent-check -- pnpm run verify`. Cursor stops sending that follow-up after 5 times. A chat with no agent id is not stopped. An aborted or errored turn is not followed up. When the flag matches, that hook removes the session file. `.cursor/hooks/cellix-session-end.mjs` removes it again when the conversation closes after a pass. Turbo and Snyk print failures, not passing task logs.

## Browser end-to-end tests

The generator writes one API acceptance scenario. The steps call the running app and read `LastResponse.body()`. It does not write browser tests. Those follow the screen. CellixJS keeps them in `packages/ocom-verification/e2e-tests`: Playwright, portless, and Serenity screenplay, separate from `acceptance-api`. Add that package when a frontend exists, and write the scenario by hand.

## read and write

`ocom-write.config.json` has two maps, `read` and `write`. The first matching key in that map wins. `true` allows the path. `false` locks it. A path with no match is denied. `read` has no catch-all. The open trees are `packages/axc`, `packages/axc-verification`, `apps/api/src`, and `apps/docs`, plus `AGENTS.md`, this skill, the task prompt and requirements, `cellix-lint.config.json`, `biome.json`, `package.json`, and `pnpm-workspace.yaml`. A session file may list `read` and `write` separately. `files` is the write list when `write` is absent. A session does not unlock a locked path. The generator records the write list only.

A shell write that does not name a file is denied. `pnpm --filter @cellix/generator generate` is allowed. `git status` and `git diff` are allowed. `git restore` of a locked file is denied.

## After every edit

While the files are still changing, run `pnpm run agent-check -- pnpm run check`. That is `pnpm run lint` and typecheck. The wrapper prints pass or the first error. `Cellix lint: ok` is the lint bar. A violation names the file, the rule, what was found, and the expected shape. Fix the file. Do not weaken the rule.

When the behavior is in place, run `pnpm run agent-check -- pnpm run verify` once. It runs `pnpm run check`, then build, tests, audit, and Snyk. Do not finish on lint or build alone.

## File body

Actions are one const whose name is the camelCase filename:

```ts
import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

export interface CourseCreateCommand {
	name: string;
}

export const create = (dataSources: DataSources) => {
	return async (command: CourseCreateCommand): Promise<Domain.Contexts.Course.Course.CourseEntityReference> => {
		return await dataSources.domainDataSource.Course.Course.CourseUnitOfWork.withScopedTransaction(async (repo) => {
			return repo.save(await repo.getNewInstance(command.name));
		});
	};
};
```

Reads use `dataSources.readonlyDataSource.<Context>.<Entity>.<Entity>ReadRepo`. The context `index.ts` imports every sibling action and returns them from `export const <Entity> = (dataSources: DataSources) => { return { ... } }`.

String setters on an aggregate check the visa and assign a value object:

```ts
set courseName(courseName: string) {
	if (!this.isNew && !this.visa.determineIf((permissions) => permissions.canManageCourse)) {
		throw new PermissionError('You do not have permission to change courseName');
	}
	this.props.courseName = new ValueObjects.CourseName(courseName).valueOf();
}
```

Value-object classes are empty and extend `VOString({ trim, minLength, maxLength })`. Nested objects are their own value object or entity. Booleans, dates, ids, and `schemaVersion` stay raw props.

## Visibility and the graph

Import another layer only through its package barrel: `@axc/domain`, `@axc/persistence`, `@axc/application-services`. A deep path such as `@axc/domain/src/...` fails. An application context does not import a sibling context. A persistence entity folder imports only its siblings plus package barrels.

`cellix/graph-layer` fails when a layer depends on one it is not allowed to see, including through a relative import. `cellix/graph-cycle` fails on an import cycle. Domain does not depend on persistence, application services, models, or transport. Application services may depend on domain and the persistence barrel. Transport depends on application services.

## Names that must match

| Stem | Domain | Persistence | Model | Application |
| --- | --- | --- | --- | --- |
| `course` | `CourseRepository` interface | `class CourseRepository` | `CourseModelFactory`, `CourseModelType`, `CourseModelName` | folder `course`, file `create.ts`, const `create` |

The application folder name must exist as a directory under domain.

## Do not add

- `helpers.ts`, `utils.ts`, `common.ts`, `shared.ts`, or a top-level `function` in a role file
- A class with `execute()`
- Mongoose above persistence and models
- GraphQL or REST imports below the transport packages
- A second exported const beside the action
- `console` in an action, aggregate, or model
