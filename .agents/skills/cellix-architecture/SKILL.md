---
name: cellix-architecture
description: >
  Development workflow for agentCourses Cellix features. Use when adding or changing
  domain, application service, persistence, mongoose model, GraphQL, or REST code.
  Requires @cellix/generator for new features, @cellix/lint for file body, visibility,
  and dependency-graph checks, and the writable-path hook.
---

# Cellix development

New features start from the generator. After that, change data and behavior only. File roles, function shape, imports, and package names stay inside the Cellix slice.

The health host in `packages/axc/application-services/src/index.ts` is the composition root. It is not an action template.

## Guardrails

Use them in this order. Each one catches a different class of drift.

| Guardrail | What it forces | When it runs |
| --- | --- | --- |
| `@cellix/generator` | The file set for one context, entity, and action | Before any new feature files exist |
| Write-allow hook | Agent edits stay on the feature paths in `cellix-lint.config.json` `writable` | Every write and every shell write |
| `@cellix/lint` | File roles, file body, public imports, dependency graph | `pnpm --filter @cellix/lint lint:cellix`, `pnpm run lint`, commit, `pnpm run verify` |
| Biome, extended from `@cellix/lint/biome` | Formatter, recommended rules, and layer import bans. The repo `biome.json` extends that file and adds only app-specific ignores and overrides | `pnpm exec biome check` |
| `@cellix/archunit-tests` `./structure` | The same lint, as an architecture test apps opt into | `pnpm run test:arch` |

Do not edit `packages/cellix/lint`, `packages/cellix/generator`, `cellix-lint.config.json`, or `.cursor/hooks` to make a feature pass. Those are the control plane. A human changes them on purpose.

## New feature

Run the generator. Do not create the slice by hand.

```bash
pnpm --filter @cellix/generator generate -- --context course --entity course --action create \
  --field courseName:string --field isPublished:boolean \
  --permission canManageCourse \
  --nested address:street:string,city:string \
  --nested activity-log:id:id,activityType:string
```

`--context`, `--entity`, and `--action` are kebab-case. `create`, `update`, and `delete` are mutations. `query`, `get`, and `find` are reads. Repeat `--field name:type` (`string`, `boolean`, `date`, `number`) and `--permission name` to fill the aggregate and the permissions interface. Repeat `--nested name:field:type,field:type`. A nested object that includes `id:id` is an entity, because it has its own identity. A nested object without an id is a value object. In a fields file, a nested `fields` entry may itself be a nested object, and the same id rule applies at every level. A nested entity can sit on the aggregate or inside another entity. It cannot sit inside a value object. The `--nested` flag stays one level deep. `--fields <file>` reads the same three lists from JSON. Flags after the file are added to it. `--resolver` writes the GraphQL schema and resolver that call `context.applicationServices`. Leave it off in this repo. `--transport rest` writes the REST adapter. `--transport graphql` is the same resolver output as `--resolver`.

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

That command writes a scaffold. It does not finish the feature. `getNewInstance` builds `const newInstance` and calls `private markAsNew()`, which sets `isNew`. Setters assign the value. They do not call `visa.determineIf`. The visa, the permissions interface, and passport are there so a later edit can add a check. There is no created event. After the files exist, build the behavior they only sketch.

The command writes:

1. Domain permissions, visa, passport (passport is created once), value objects, aggregate, repository interface, unit-of-work interface
2. `models/<entity>/<entity>.model.ts` and `models/<entity>/<entity>.seed.ts`
3. Persistence domain adapter, repository, and `get<Entity>UnitOfWork`
4. The read side: `datasources/readonly/<context>/<entity>/<entity>.data.ts`, `<entity>.read-repository.ts`, and the entity index that returns `<Entity>ReadRepo`. Queries call `readonlyDataSource.<Context>.<Entity>.<Entity>ReadRepo`
5. `contexts/<context>/<entity>/<action>.ts` and the context `index.ts`

`datasources/readonly/mongo-data-source.ts`, `datasources/readonly/index.ts`, and `datasources/readonly/<context>/index.ts` are created once. A later generate leaves them in place. Add the next entity to those indexes yourself.

It refuses to overwrite an entity file. A second action in an existing entity is a new generator invocation only when that action file does not already exist; shared passport is left in place. If the generator stops, do not copy a file over the collision.

Then build:

- Value-object bounds and what the aggregate setters enforce
- Repository methods behind `getNewInstance` and `getById`
- The command fields and the body inside `withScopedTransaction` or `readonlyDataSource`
- A visa check on a setter, when the feature needs one: `if (!this.isNew && !this.visa.determineIf(...)) throw new PermissionError(...)`
- The `Domain` namespace, as `export * as Domain from './domain/index.ts'` on the domain package index. Do not add `export type { Course, ... }` or `export const Domain` there. Do not add document types to a domain adapter. Do not import `<camel>Seed` into a read repository or return it from one. An action imports `DataSources` from `@axc/persistence` and does not declare that type itself
- The Azure function route in `apps/api/src/index.ts`
- The Hono route in `packages/axc/rest/src/index.ts`. The handler calls `applicationServices.<Context>.<Entity>.<action>(command)`
- The new service on the health host, `packages/axc/application-services/src/index.ts`. Add it beside `health` on `ApplicationServices` and return it from `buildApplicationServicesFactory`. Keep `health.getStatus`
- The context factory's ports, when the action needs more than `DataSources`

When that behavior is in place, run `pnpm run build`. Lint only checks file shape. The build is what shows the slice compiles. Generate finishing is not that check.

## Testing

Start the application with `pnpm run dev` and call the endpoint. The rows come from the database.

`models/<entity>/<entity>.seed.ts` exports `<camel>Seed`, one example document. Insert that document into the `<Pascal>` collection, then read it back through the running app. Do not copy it into a REST handler, a GraphQL resolver, a read repository, or a test that replaces the database with an in-memory list.

A REST handler other than `index.ts` calls `applicationServices.<Context>.<Entity>.<action>(command)` inside the function that receives `applicationServices`. Context and Entity are PascalCase. Mentioning `applicationServices`, casting it, or calling a local list when the property is missing does not count. A REST file does not keep an array of documents.

## Writable paths

The hook allows writes only under `writable` in `cellix-lint.config.json`. In this repo that is domain source, application-services source including the health host, persistence source, REST, GraphQL, and mongoose `models`.

Edits outside that list are denied. Shell redirects, `rm`, `mv`, `cp`, `mkdir`, and `touch` aimed outside that list are denied. `pnpm --filter @cellix/generator generate` is allowed.

## After every edit

```bash
pnpm --filter @cellix/lint lint:cellix
pnpm exec biome check --write <files>
pnpm run build
```

`Cellix lint: ok` is the bar. A violation names the file, the rule, what was found, and the expected shape. Fix the file. Do not weaken the rule.

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
