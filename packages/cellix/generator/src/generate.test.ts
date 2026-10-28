import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSession } from '@cellix/guardrails';
import { afterEach, describe, expect, it } from 'vitest';
import { checkCellixLint, defaultCellixLintConfig } from '../../lint/src/index.ts';
import { filesToEdit } from './edit-targets.ts';
import { generateFeature } from './generate.ts';
import { parseField, parseFieldsFile, parseNested, parsePermission } from './spec.ts';

const roots: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function expectBiomeClean(files: { path: string }[]): void {
	const source = files.filter((file) => /\.(ts|tsx|js|mjs|json)$/.test(file.path));
	if (source.length === 0) return;
	const biome = path.join(repoRoot, 'node_modules', '.bin', 'biome');
	const result = spawnSync(biome, ['check', `--config-path=${path.join(repoRoot, 'biome.json')}`, ...source.map((file) => file.path)], { encoding: 'utf8' });
	expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
}

afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Cellix generator', () => {
	it('writes a feature slice that passes Cellix lint', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(root);
		const lint = defaultCellixLintConfig();
		const files = await generateFeature({ root, lint, context: 'course', entity: 'course', action: 'create', transport: 'graphql' });
		const paths = files.map((file) => file.path).join('\n');
		expect(paths).toContain('course.aggregate.ts');
		expect(paths).toContain('course.seed.ts');
		expect(paths).toContain('course.resolvers.ts');
		expect(paths).toContain('course.data.ts');
		expect(paths).toContain('course.read-repository.ts');
		expect(paths).toContain('course-create.feature');
		expect(paths).toContain('course-create.steps.ts');
		const steps = files.find((file) => file.path.endsWith('course-create.steps.ts'));
		expect(steps?.contents).toContain('GetRequest.to(');
		expect(steps?.contents).toContain('LastResponse.body');
		expect(paths).toContain('datasources/readonly/mongo-data-source.ts');
		const readRepository = files.find((file) => file.path.endsWith('course.read-repository.ts'));
		expect(readRepository?.contents).toContain('getCourseReadRepository');
		expect(readRepository?.contents).toContain('mongoDataSource.findById');
		const readonlyIndex = files.find((file) => file.path.endsWith('datasources/readonly/index.ts'));
		expect(readonlyIndex?.contents).toContain('CourseReadRepo: CourseReadRepository');
		expect(files.map((file) => file.path).join('\n')).not.toContain('.event.ts');
		const aggregate = files.find((file) => file.path.endsWith('course.aggregate.ts'));
		const resolver = files.find((file) => file.path.endsWith('course.resolvers.ts'));
		expect(resolver?.contents).toContain('applicationServices.Course.Course.create');
		expect(aggregate?.contents).toContain('const newInstance = new Course');
		expect(aggregate?.contents).toContain('newInstance.markAsNew()');
		expect(aggregate?.contents).toContain('this.visa.determineIf');
		expect(aggregate?.contents).toContain('!this.isNew');
		expect(aggregate?.contents).toContain('private markAsNew(): void');
		expect(aggregate?.contents).not.toContain('addIntegrationEvent');
		const seed = files.find((file) => file.path.endsWith('course.seed.ts'));
		expect(seed?.contents).toContain('export const courseSeed = [');
		expect(seed?.contents).toContain("courseName: 'Example courseName'");
		expect(seed?.contents).toContain('Start the application');

		const violations = await checkCellixLint({ root, lint });
		expect(violations).toStrictEqual([]);
		expectBiomeClean(files);
		await expectDomainTypechecks(root);
	});

	it('fills fields, permissions, a value object, and an entity, and writes resolvers only when asked', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(root);
		const lint = defaultCellixLintConfig();
		const files = await generateFeature({
			root,
			lint,
			context: 'user',
			entity: 'staff-user',
			action: 'create',
			fields: [parseField('firstName:string'), parseField('accessBlocked:boolean')],
			permissions: [parsePermission('canManageStaff')],
			nested: [parseNested('display-name:label:string'), parseNested('activity-log:id:id,activityType:string')],
		});
		const paths = files.map((file) => file.path).join('\n');
		expect(paths).toContain('display-name.value-objects.ts');
		expect(paths).toContain('activity-log.entity.ts');
		expect(paths).not.toContain('staff-user.resolvers.ts');
		const permissions = files.find((file) => file.path.endsWith('user.domain-permissions.ts'));
		expect(permissions?.contents).toContain('canManageStaff: boolean;');
		expect(permissions?.contents).not.toContain('canManageStaffUser');
		const aggregate = files.find((file) => file.path.endsWith('staff-user.aggregate.ts'));
		expect(aggregate?.contents).toContain('displayName: DisplayNameProps');
		expect(aggregate?.contents).toContain('new DisplayNameValues.Label');
		expect(aggregate?.contents).toContain('ActivityLogEntityReference');
		const readonlyIndex = files.find((file) => file.path.endsWith('datasources/readonly/index.ts'));
		expect(readonlyIndex?.contents).toContain('StaffUserReadRepo: StaffUserReadRepository');
		expect(readonlyIndex?.contents).toContain('User: {');
		const adapter = files.find((file) => file.path.endsWith('staff-user.domain-adapter.ts'));
		expect(adapter?.contents).toContain('Domain.Contexts.User.StaffUser.StaffUser');
		expect(adapter?.contents).not.toContain('Domain.Contexts.StaffUser.StaffUser.StaffUser');

		const violations = await checkCellixLint({ root, lint });
		expect(violations).toStrictEqual([]);
		await expectDomainTypechecks(root);

		const resolverRoot = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(resolverRoot);
		const withResolver = await generateFeature({
			root: resolverRoot,
			lint,
			context: 'user',
			entity: 'staff-user',
			action: 'create',
			fields: [parseField('firstName:string')],
			nested: [parseNested('activity-log:id:id,activityType:string')],
			resolver: true,
		});
		expect(withResolver.map((file) => file.path).join('\n')).toContain('staff-user.resolvers.ts');
		await expect(checkCellixLint({ root: resolverRoot, lint })).resolves.toStrictEqual([]);
	});

	it('reads fields, permissions, and nested objects from a JSON file', () => {
		const shape = parseFieldsFile(`{
			"fields": [{ "name": "firstName", "type": "string" }, "accessBlocked:boolean"],
			"permissions": ["canManageStaff"],
			"nested": [
				{ "name": "display-name", "fields": [{ "name": "label", "type": "string" }] },
				"activity-log:id:id,activityType:string"
			]
		}`);
		expect(shape.fields).toStrictEqual([
			{ name: 'firstName', type: 'string' },
			{ name: 'accessBlocked', type: 'boolean' },
		]);
		expect(shape.permissions).toStrictEqual(['canManageStaff']);
		expect(shape.nested[0]).toMatchObject({ name: 'display-name', kind: 'value', fields: [{ name: 'label', type: 'string' }] });
		expect(shape.nested[1]).toMatchObject({ name: 'activity-log', kind: 'entity', fields: [{ name: 'activityType', type: 'string' }] });
		expect(() => parseFieldsFile('{ "field": [] }')).toThrow('unknown key field');
		expect(() => parseFieldsFile('{ "fields": [{ "name": "id", "type": "id" }] }')).toThrow('aggregate identity');
		const nested = parseFieldsFile(`{
			"nested": [{
				"name": "address",
				"fields": [
					{ "name": "street", "type": "string" },
					{ "name": "geo", "fields": [{ "name": "lat", "type": "number" }] }
				]
			}]
		}`);
		expect(nested.nested[0]).toMatchObject({
			name: 'address',
			kind: 'value',
			fields: [
				{ name: 'street', type: 'string' },
				{ name: 'geo', kind: 'value', fields: [{ name: 'lat', type: 'number' }] },
			],
		});
	});

	it('nests a value object inside a value object and inside an entity', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(root);
		const lint = defaultCellixLintConfig();
		const shape = parseFieldsFile(`{
			"fields": [{ "name": "firstName", "type": "string" }],
			"nested": [
				{
					"name": "address",
					"fields": [
						{ "name": "street", "type": "string" },
						{ "name": "geo", "fields": [{ "name": "lat", "type": "number" }, { "name": "lng", "type": "number" }] }
					]
				},
				{
					"name": "activity-log",
					"fields": [
						{ "name": "id", "type": "id" },
						{ "name": "activityType", "type": "string" },
						{ "name": "detail", "fields": [{ "name": "label", "type": "string" }] }
					]
				}
			]
		}`);
		const files = await generateFeature({ root, lint, context: 'user', entity: 'staff-user', action: 'create', fields: shape.fields, nested: shape.nested });
		const paths = files.map((file) => file.path).join('\n');
		expect(paths).toContain('geo.value-objects.ts');
		expect(paths).toContain('detail.value-objects.ts');
		expect(files.find((file) => file.path.endsWith('address.value-objects.ts'))?.contents).toContain('geo: GeoProps');
		const log = files.find((file) => file.path.endsWith('activity-log.entity.ts'));
		expect(log?.contents).toContain('detail: DetailProps');
		expect(log?.contents).toContain('new DetailValues.Label');
		const seed = files.find((file) => file.path.endsWith('staff-user.seed.ts'));
		expect(seed?.contents).toContain('export const staffUserSeed = [');
		expect(seed?.contents).toContain("label: 'Example label'");
		expect(seed?.contents).toContain('activityLog: { activityType:');
		await expect(checkCellixLint({ root, lint })).resolves.toStrictEqual([]);
		expectBiomeClean(files);
	});

	it('rejects shapes that collide, drop the only identity, or hide an entity inside a value object', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(root);
		const lint = defaultCellixLintConfig();
		expect(() => parseFieldsFile('not json')).toThrow('Fields file must be JSON');
		expect(() => parseFieldsFile('{ "fields": {} }')).toThrow('fields must be an array');
		expect(() => parseFieldsFile('{ "fields": [{ "name": "address", "fields": [] }] }')).toThrow('belongs in nested');
		expect(() => parseNested('place:id:id')).toThrow('besides its id');
		expect(() => parseField('id:string')).toThrow('aggregate identity');
		expect(() => parseFieldsFile('{ "permissions": ["CanManage"] }')).toThrow('camelCase');
		expect(() => parseFieldsFile('{ "nested": [{ "name": "Address", "fields": [{ "name": "street", "type": "string" }] }] }')).toThrow('kebab-case');
		expect(() => parseFieldsFile('{ "fields": [{ "name": "title", "type": "string type" }] }')).toThrow('Field type');
		expect(parseField('tags:string[]')).toEqual({ name: 'tags', type: 'string[]' });
		expect(parseField("modality:'online'|'in-person'|'hybrid'")).toEqual({ name: 'modality', type: "'online'|'in-person'|'hybrid'" });
		await expect(generateFeature({ root, lint, context: 'course', entity: 'course', action: 'create', permissions: ['canManageCourse', 'canManageCourse'] })).rejects.toThrow('Permission canManageCourse is used more than once');
		await expect(generateFeature({ root, lint, context: 'course', entity: 'course', action: 'create', fields: [parseField('courseName:string'), parseField('courseName:string')] })).rejects.toThrow(
			'Name courseName is used more than once',
		);
		await expect(generateFeature({ root, lint, context: 'course', entity: 'course', action: 'create', nested: [parseNested('course:title:string')] })).rejects.toThrow('Name course is used more than once');
		const hiddenEntity = parseFieldsFile(`{
			"nested": [{
				"name": "address",
				"fields": [
					{ "name": "street", "type": "string" },
					{ "name": "place", "fields": [{ "name": "id", "type": "id" }, { "name": "label", "type": "string" }] }
				]
			}]
		}`);
		await expect(generateFeature({ root, lint, context: 'course', entity: 'course', action: 'create', nested: hiddenEntity.nested })).rejects.toThrow('Nested entity place cannot sit inside value object address');
	});

	it('passes lint for a query, an entity inside an entity, and three levels of value objects', async () => {
		const lint = defaultCellixLintConfig();
		const queryRoot = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(queryRoot);
		const queryFiles = await generateFeature({ root: queryRoot, lint, context: 'course', entity: 'course', action: 'query-by-id', resolver: true });
		const queryAction = queryFiles.find((file) => file.path.endsWith('query-by-id.ts'));
		expect(queryAction?.contents).toContain('readonlyDataSource.Course.Course.CourseReadRepo.queryById');
		expect(queryAction?.contents).not.toContain('withScopedTransaction');
		expect(queryFiles.find((file) => file.path.endsWith('course.read-repository.ts'))?.contents).toContain('return Promise.reject(new Error(`not implemented:');
		expect(queryFiles.find((file) => file.path.endsWith('course.resolvers.ts'))?.contents).toContain('Query:');
		await expect(checkCellixLint({ root: queryRoot, lint })).resolves.toStrictEqual([]);

		const catalogRoot = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(catalogRoot);
		const catalog = await generateFeature({
			root: catalogRoot,
			lint,
			context: 'course',
			entity: 'course',
			operation: 'query',
			action: 'search',
			transport: 'rest',
			params: [parseField('title:string'), parseField('status:string')],
		});
		const catalogAction = catalog.find((file) => file.path.endsWith('/search.ts'));
		const catalogRead = catalog.find((file) => file.path.endsWith('course.read-repository.ts'));
		expect(catalogAction?.contents).toContain('title: string;');
		expect(catalogAction?.contents).toContain('status: string;');
		expect(catalogAction?.contents).toContain('CourseReadRepo.search(command)');
		expect(catalogAction?.contents).not.toContain('domainDataSource');
		expect(catalogRead?.contents).toContain('search(command: { title: string; status: string })');
		expect(catalogRead?.contents).toContain('return Promise.reject');
		expect(catalogRead?.contents).toContain('async getById');
		await expect(checkCellixLint({ root: catalogRoot, lint })).resolves.toStrictEqual([]);

		const updateRoot = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(updateRoot);
		const updateFiles = await generateFeature({
			root: updateRoot,
			lint,
			context: 'course',
			entity: 'course',
			operation: 'update',
			action: 'publish',
			params: [parseField('title:string')],
		});
		const updateAction = updateFiles.find((file) => file.path.endsWith('/publish.ts'));
		expect(updateAction?.contents).toContain('id: string;');
		expect(updateAction?.contents).toContain('const current = await repo.getById(command.id)');
		expect(updateAction?.contents).toContain('updated = await repo.save(current)');
		expect(updateAction?.contents).not.toContain('getNewInstance');
		await expect(checkCellixLint({ root: updateRoot, lint })).resolves.toStrictEqual([]);

		const entityRoot = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(entityRoot);
		const entityShape = parseFieldsFile(`{
			"fields": [{ "name": "firstName", "type": "string" }],
			"nested": [{
				"name": "activity-log",
				"fields": [
					{ "name": "id", "type": "id" },
					{ "name": "activityType", "type": "string" },
					{ "name": "entry", "fields": [{ "name": "id", "type": "id" }, { "name": "note", "type": "string" }] }
				]
			}]
		}`);
		const entityFiles = await generateFeature({ root: entityRoot, lint, context: 'user', entity: 'staff-user', action: 'create', fields: entityShape.fields, nested: entityShape.nested });
		expect(entityFiles.find((file) => file.path.endsWith('activity-log.entity.ts'))?.contents).toContain('new Entry');
		await expect(checkCellixLint({ root: entityRoot, lint })).resolves.toStrictEqual([]);

		const deepRoot = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(deepRoot);
		const deepShape = parseFieldsFile(`{
			"fields": [{ "name": "title", "type": "string" }, { "name": "opensOn", "type": "date" }],
			"nested": [{
				"name": "address",
				"fields": [
					{ "name": "street", "type": "string" },
					{ "name": "geo", "fields": [{ "name": "point", "fields": [{ "name": "lat", "type": "number" }] }] }
				]
			}]
		}`);
		const deepFiles = await generateFeature({ root: deepRoot, lint, context: 'course', entity: 'course', action: 'create', fields: deepShape.fields, nested: deepShape.nested, resolver: true });
		expect(deepFiles.find((file) => file.path.endsWith('address.value-objects.ts'))?.contents).toContain('geo: GeoProps');
		expect(deepFiles.find((file) => file.path.endsWith('geo.value-objects.ts'))?.contents).toContain('point: PointProps');
		expect(deepFiles.find((file) => file.path.endsWith('course.graphql'))?.contents).toContain('CoursePointInput');
		expect(deepFiles.map((file) => file.path).join('\n')).toContain('course.resolvers.ts');
		await expect(checkCellixLint({ root: deepRoot, lint })).resolves.toStrictEqual([]);
		expectBiomeClean(deepFiles);
	});

	it('names the files to edit and leaves the barrels off that list', () => {
		const lint = defaultCellixLintConfig();
		const query = filesToEdit({ root: '/repo', lint, context: 'course', entity: 'course', action: 'search', operation: 'query', transport: 'rest' });
		expect(query).toStrictEqual([
			'packages/axc/application-services/src/contexts/course/course/search.ts',
			'packages/axc/persistence/src/datasources/readonly/course/course/course.read-repository.ts',
			'packages/axc/rest/src/index.ts',
			'packages/axc/data-sources-mongoose-models/src/models/course/course.seed.ts',
		]);
		const update = filesToEdit({ root: '/repo', lint, context: 'course', entity: 'course', action: 'publish', operation: 'update', transport: 'rest' });
		expect(update).toContain('packages/axc/domain/src/domain/contexts/course/course/course.aggregate.ts');
		expect(update).not.toContain('packages/axc/domain/src/index.ts');
	});

	it('records a session for the current agent only', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(root);
		const previous = process.env.CELLIX_AGENT_ID;
		process.env.CELLIX_AGENT_ID = 'task-a';
		try {
			await writeStub(
				root,
				'packages/axc/rest/src/index.ts',
				`import type { ApplicationServicesFactory } from '@axc/application-services';\nimport { Hono } from 'hono';\n\nexport function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {\n\tconst app = new Hono();\n\treturn app;\n}\n`,
			);
			await writeStub(
				root,
				'apps/api/src/index.ts',
				`import { type ApiContext, type ApplicationServices, buildApplicationServicesFactory } from '@axc/application-services';\nimport { restHandlerCreator } from '@axc/rest';\nimport { Cellix } from '@cellix/api-core';\n\nCellix.initializeInfrastructureServices<ApiContext, ApplicationServices>(() => undefined)\n\t.initializeApplicationServices((context) => buildApplicationServicesFactory(context))\n\t.registerAzureFunctionHttpHandler('health', { route: 'health', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)\n\t.startUp();\n`,
			);
			await generateFeature({ root, lint: defaultCellixLintConfig(), context: 'course', entity: 'course', operation: 'query', action: 'search', params: [parseField('title:string')], transport: 'rest' });
			const session = loadSession(root, 'task-a');
			expect(session?.files).toContain('packages/axc/domain/src/domain/contexts/course/');
			expect(session?.files).toContain('packages/axc/domain/src/index.ts');
			expect(session?.files).toContain('packages/axc/application-services/src/contexts/course/course/search.ts');
			expect(session?.files).toContain('packages/axc/persistence/src/datasources/readonly/course/course/course.read-repository.ts');
			expect(session?.files).toContain('packages/axc/rest/src/index.ts');
			expect(session?.files).toContain('apps/api/src/index.ts');
			expect(session?.files).toContain('apps/docs/');
			expect(session?.files).toContain('packages/axc-verification/acceptance-api/src/');
			expect(session?.files).toContain('packages/axc/data-sources-mongoose-models/package.json');
			expect(session?.files).not.toContain('apps/docs/docs/course/');
			expect(session?.files).not.toContain('apps/docs/sidebars.ts');
			expect(session?.files).not.toContain('packages/axc/rest/src/');
			expect(session?.files).not.toContain('apps/api/src/');
			expect(session?.files).not.toContain('packages/axc/service-mongoose/');
			expect(session?.files).not.toContain('pnpm-workspace.yaml');
			expect(session?.files).not.toContain('.snyk');
			expect(session?.files.join('\n')).not.toContain('packages/cellix/');
			expect(loadSession(root, 'task-b')).toBeNull();
		} finally {
			if (previous === undefined) delete process.env.CELLIX_AGENT_ID;
			else process.env.CELLIX_AGENT_ID = previous;
		}
	});

	it('rejects an acceptance step file that keeps a document array', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(root);
		const lint = defaultCellixLintConfig();
		const files = await generateFeature({ root, lint, context: 'course', entity: 'course', action: 'search' });
		const steps = files.find((file) => file.path.endsWith('course-search.steps.ts'));
		if (!steps) throw new Error('missing course search steps');
		const original = await readFile(steps.path, 'utf8');
		await writeFile(steps.path, `${original}\nconst courses = [{ title: 'Example' }];\n`);
		const violations = await checkCellixLint({ root, lint });
		expect(violations.some((violation) => violation.includes('document array'))).toBe(true);
		await writeFile(steps.path, original.replaceAll('LastResponse.body', 'LastResponse.status'));
		const unread = await checkCellixLint({ root, lint });
		expect(unread.some((violation) => violation.includes('LastResponse.body()'))).toBe(true);
	});

	it('refuses to overwrite an entity file', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(root);
		const lint = defaultCellixLintConfig();
		await generateFeature({ root, lint, context: 'course', entity: 'course', action: 'create' });
		await expect(generateFeature({ root, lint, context: 'course', entity: 'course', action: 'update' })).rejects.toThrow('Refusing to overwrite');
	});

	it('adds a named query and update onto an entity that already exists', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(root);
		const lint = defaultCellixLintConfig();
		await writeStub(
			root,
			'packages/axc/rest/src/index.ts',
			`import type { ApplicationServicesFactory } from '@axc/application-services';\nimport { Hono } from 'hono';\n\nexport function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {\n\tconst app = new Hono();\n\treturn app;\n}\n`,
		);
		await generateFeature({ root, lint, context: 'course', entity: 'course', action: 'create', fields: [parseField('courseName:string')], resolver: true });
		const search = await generateFeature({
			root,
			lint,
			context: 'course',
			entity: 'course',
			operation: 'query',
			action: 'search',
			params: [parseField('title:string'), parseField('status:string')],
			transport: 'rest',
		});
		expect(search.map((file) => file.path).join('\n')).not.toContain('course.aggregate.ts');
		const readRepository = await readFile(path.join(root, 'packages/axc/persistence/src/datasources/readonly/course/course/course.read-repository.ts'), 'utf8');
		expect(readRepository).toContain('search(command: { title: string; status: string })');
		expect(search.find((file) => file.path.endsWith('/search.ts'))?.contents).toContain('CourseReadRepo.search(command)');
		const publish = await generateFeature({
			root,
			lint,
			context: 'course',
			entity: 'course',
			operation: 'update',
			action: 'publish',
			params: [parseField('status:string')],
			transport: 'rest',
		});
		const published = publish.find((file) => file.path.endsWith('/publish.ts'))?.contents ?? '';
		expect(published).toContain('id: string;');
		expect(published).toContain('status: string;');
		expect(published).toContain('withScopedTransaction');
		const service = await readFile(path.join(root, 'packages/axc/application-services/src/contexts/course/course/index.ts'), 'utf8');
		expect(service).toContain('search: search(dataSources)');
		expect(service).toContain('publish: publish(dataSources)');
		const rest = await readFile(path.join(root, 'packages/axc/rest/src/index.ts'), 'utf8');
		expect(rest).toContain("app.get('/api/course'");
		expect(rest).toContain('applicationServices.Course.Course.search(');
		expect(rest).toContain("app.post('/api/course'");
		expect(rest).toContain('applicationServices.Course.Course.publish(await c.req.json())');
		expect(search.map((file) => file.path).join('\n')).not.toContain('course.resolvers.ts');
		const resolver = await readFile(path.join(root, 'packages/axc/graphql/src/schema/types/course.resolvers.ts'), 'utf8');
		expect(resolver).toContain('search:');
		expect(resolver).toContain('publish:');
		const schema = await readFile(path.join(root, 'packages/axc/graphql/src/schema/types/course.graphql'), 'utf8');
		expect(schema).toContain('extend type Query {\n\tsearch(input:');
		expect(schema).toContain('extend type Mutation {\n\tpublish(input:');
		await expect(checkCellixLint({ root, lint })).resolves.toStrictEqual([]);
	});

	it('writes a return type and route passed in by the caller', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(root);
		const lint = defaultCellixLintConfig();
		await writeStub(
			root,
			'packages/axc/rest/src/index.ts',
			`import type { ApplicationServicesFactory } from '@axc/application-services';\nimport { Hono } from 'hono';\n\nexport function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {\n\tconst app = new Hono();\n\treturn app;\n}\n`,
		);
		await generateFeature({
			root,
			lint,
			context: 'course',
			entity: 'course',
			action: 'create',
			fields: [parseField('tags:string[]'), parseField("modality:'online'|'in-person'|'hybrid'")],
		});
		const search = await generateFeature({
			root,
			lint,
			context: 'course',
			entity: 'course',
			operation: 'query',
			action: 'search',
			params: [parseField('q:string')],
			result: 'CourseSearchPage',
			route: 'courses',
			transport: 'rest',
		});
		expect(search.find((file) => file.path.endsWith('/search.ts'))?.contents).toContain('Promise<CourseSearchPage>');
		const readRepository = await readFile(path.join(root, 'packages/axc/persistence/src/datasources/readonly/course/course/course.read-repository.ts'), 'utf8');
		expect(readRepository).toContain('Promise<CourseSearchPage>');
		const rest = await readFile(path.join(root, 'packages/axc/rest/src/index.ts'), 'utf8');
		expect(rest).toContain("app.get('/api/courses'");
		const model = await readFile(path.join(root, 'packages/axc/data-sources-mongoose-models/src/models/course/course.model.ts'), 'utf8');
		expect(model).toContain('tags: string[];');
		expect(model).toContain("modality: 'online' | 'in-person' | 'hybrid';");
		await generateFeature({
			root,
			lint,
			context: 'course',
			entity: 'course',
			operation: 'query',
			action: 'find',
			params: [parseField('q:string')],
			route: 'catalog',
			transport: 'graphql',
		});
		const graphql = await readFile(path.join(root, 'packages/axc/graphql/src/schema/types/course.graphql'), 'utf8');
		expect(graphql).toContain('catalog(input:');
		const resolver = await readFile(path.join(root, 'packages/axc/graphql/src/schema/types/course.resolvers.ts'), 'utf8');
		expect(resolver).toContain('catalog:');
		expect(resolver).toContain('.find(');
	});

	it('wires a new context through the same barrels Community uses', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(root);
		const lint = defaultCellixLintConfig();
		await writeStub(
			root,
			'packages/axc/domain/src/index.ts',
			"import type { Repository } from '@cellix/domain-seedwork/repository';\n\n/** Repositories added in this package implement the Cellix repository contract. */\nexport type DomainRepository<T> = Repository<T>;\n",
		);
		await writeStub(root, 'packages/axc/persistence/src/index.ts', "export type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';\n");
		await writeStub(
			root,
			'packages/axc/persistence/package.json',
			'{ "name": "@axc/persistence", "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }, "dependencies": { "@cellix/domain-seedwork": "workspace:*" } }\n',
		);
		await writeStub(root, 'packages/axc/persistence/tsconfig.json', '{ "references": [{ "path": "../../cellix/domain-seedwork" }] }\n');
		await writeStub(root, 'packages/axc/application-services/package.json', '{ "name": "@axc/application-services", "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } } }\n');
		await writeStub(root, 'packages/axc/application-services/tsconfig.json', '{ "references": [] }\n');
		await writeStub(
			root,
			'packages/axc/application-services/src/index.ts',
			`export type HealthEnvironment = 'local' | 'test' | 'production';\n\nexport interface HealthStatus {\n\tstatus: 'ok';\n\tenvironment: HealthEnvironment;\n\ttimestamp: string;\n}\n\nexport interface ApiContext {\n\tenvironment: HealthEnvironment;\n}\n\nexport interface ApplicationServices {\n\thealth: {\n\t\tgetStatus(): HealthStatus;\n\t};\n}\n\nexport interface ApplicationServicesFactory {\n\tforRequest(rawAuthHeader?: string): Promise<ApplicationServices>;\n}\n\nexport function buildApplicationServicesFactory(context: ApiContext): ApplicationServicesFactory {\n\tconst forRequest = (): Promise<ApplicationServices> =>\n\t\tPromise.resolve({\n\t\t\thealth: {\n\t\t\t\tgetStatus(): HealthStatus {\n\t\t\t\t\treturn { status: 'ok', environment: context.environment, timestamp: new Date().toISOString() };\n\t\t\t\t},\n\t\t\t},\n\t\t});\n\n\treturn { forRequest };\n}\n`,
		);
		await writeStub(
			root,
			'packages/axc/rest/src/index.ts',
			`import type { ApplicationServicesFactory } from '@axc/application-services';\nimport { Hono } from 'hono';\n\nexport function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {\n\tconst app = new Hono();\n\treturn app;\n}\n`,
		);
		await writeStub(
			root,
			'apps/api/src/index.ts',
			`import { type ApiContext, type ApplicationServices, buildApplicationServicesFactory } from '@axc/application-services';\nimport { restHandlerCreator } from '@axc/rest';\nimport { Cellix } from '@cellix/api-core';\nimport * as RuntimeConfig from './service-config/runtime/index.ts';\n\nCellix.initializeInfrastructureServices<ApiContext, ApplicationServices>(() => undefined)\n\t.setContext(() => {\n\t\treturn {\n\t\t\tenvironment: RuntimeConfig.environment,\n\t\t};\n\t})\n\t.initializeApplicationServices((context) => buildApplicationServicesFactory(context))\n\t.registerAzureFunctionHttpHandler('health', { route: 'health', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)\n\t.startUp();\n`,
		);
		const apiPackage = '{ "name": "@apps/api", "dependencies": { "@axc/application-services": "workspace:*" } }\n';
		const apiTsconfig = '{ "references": [{ "path": "../../packages/axc/application-services" }] }\n';
		const persistenceTsconfig = '{ "references": [{ "path": "../../cellix/domain-seedwork" }] }\n';
		const applicationPackage = '{ "name": "@axc/application-services", "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } } }\n';
		const applicationTsconfig = '{ "references": [] }\n';
		await writeStub(root, 'apps/api/package.json', apiPackage);
		await writeStub(root, 'apps/api/tsconfig.json', apiTsconfig);

		await generateFeature({ root, lint, context: 'course', entity: 'course', action: 'query', transport: 'rest' });

		const models = await readFile(path.join(root, 'packages/axc/data-sources-mongoose-models/src/index.ts'), 'utf8');
		const persistence = await readFile(path.join(root, 'packages/axc/persistence/src/index.ts'), 'utf8');
		const dataSources = await readFile(path.join(root, 'packages/axc/persistence/src/datasources/index.ts'), 'utf8');
		const domain = await readFile(path.join(root, 'packages/axc/domain/src/index.ts'), 'utf8');
		const domainBarrel = await readFile(path.join(root, 'packages/axc/domain/src/domain/index.ts'), 'utf8');
		const passport = await readFile(path.join(root, 'packages/axc/domain/src/domain/contexts/passport.ts'), 'utf8');
		const application = await readFile(path.join(root, 'packages/axc/application-services/src/index.ts'), 'utf8');
		const contextService = await readFile(path.join(root, 'packages/axc/application-services/src/contexts/course/index.ts'), 'utf8');
		const rest = await readFile(path.join(root, 'packages/axc/rest/src/index.ts'), 'utf8');
		const api = await readFile(path.join(root, 'apps/api/src/index.ts'), 'utf8');

		expect(models).toContain('export const mongooseContextBuilder');
		expect(models).toContain('export type { Course, CourseModelType }');
		expect(models).toContain('export { CourseModelName } from');
		expect(models).toContain('Course: CourseModelFactory(initializedService)');
		expect(persistence).toContain('export const Persistence');
		expect(persistence).toContain('export type { UnitOfWork }');
		expect(persistence).toContain('DataSourcesFactoryImpl(models)');
		expect(dataSources).toContain('withSystemPassport');
		expect(dataSources).toContain('Domain.PassportFactory.forSystem()');
		expect(domain).toContain('export type DomainRepository');
		expect(domain).toContain("export * as Domain from './domain/index.ts'");
		expect(domain).toContain('export interface DomainDataSource');
		expect(domain).toContain('CourseUnitOfWork: Contexts.Course.Course.CourseUnitOfWork');
		expect(domainBarrel).toContain('PassportFactory');
		expect(passport).toContain('forSystem()');
		expect(contextService).toContain('export interface CourseContextApplicationService');
		expect(contextService).toContain('Course: CourseApi(dataSources)');
		expect(application).toContain('dataSourcesFactory.withSystemPassport()');
		expect(application).toContain('Course: Course(dataSources)');
		expect(application).not.toContain("from 'mongoose'");
		expect(dataSources).toContain("from '../models-context.ts'");
		expect(dataSources).not.toContain("from '@axc/persistence'");
		expect(api).not.toContain('MongoMemoryServer');
		expect(api).not.toContain('startMockMongoDB');
		expect(rest).not.toContain("app.get('/api/course'");
		expect(api).not.toContain("route: 'api/course'");
		expect(await readFile(path.join(root, 'apps/api/package.json'), 'utf8')).toBe(apiPackage);
		expect(await readFile(path.join(root, 'apps/api/tsconfig.json'), 'utf8')).toBe(apiTsconfig);
		const persistenceJson = await readFile(path.join(root, 'packages/axc/persistence/package.json'), 'utf8');
		expect(persistenceJson).toContain('"@axc/data-sources-mongoose-models": "workspace:*"');
		expect(persistenceJson).toContain('"@cellix/domain-seedwork": "workspace:*"');
		expect(await readFile(path.join(root, 'packages/axc/persistence/tsconfig.json'), 'utf8')).toBe(persistenceTsconfig);
		expect(await readFile(path.join(root, 'packages/axc/application-services/package.json'), 'utf8')).toBe(applicationPackage);
		expect(await readFile(path.join(root, 'packages/axc/application-services/tsconfig.json'), 'utf8')).toBe(applicationTsconfig);
		expect(await readFile(path.join(root, 'packages/axc/data-sources-mongoose-models/package.json'), 'utf8')).toContain('"name": "@axc/data-sources-mongoose-models"');
		expect(await readFile(path.join(root, 'packages/axc/data-sources-mongoose-models/tsconfig.json'), 'utf8')).toContain('@cellix/config-typescript/node');

		await expect(checkCellixLint({ root, lint })).resolves.toStrictEqual([]);

		await generateFeature({ root, lint, context: 'user', entity: 'staff-user', action: 'query', transport: 'rest' });
		const modelsAfter = await readFile(path.join(root, 'packages/axc/data-sources-mongoose-models/src/index.ts'), 'utf8');
		const domainAfter = await readFile(path.join(root, 'packages/axc/domain/src/index.ts'), 'utf8');
		const passportAfter = await readFile(path.join(root, 'packages/axc/domain/src/domain/contexts/passport.ts'), 'utf8');
		const applicationAfter = await readFile(path.join(root, 'packages/axc/application-services/src/index.ts'), 'utf8');
		expect(modelsAfter).toContain('StaffUser: StaffUserModelFactory(initializedService)');
		expect(modelsAfter).toContain('export type { StaffUser, StaffUserModelType }');
		expect(domainAfter).toContain('StaffUserUnitOfWork: Contexts.User.StaffUser.StaffUserUnitOfWork');
		expect(passportAfter).toContain('forStaffUser');
		expect(applicationAfter).toContain('User: User(dataSources)');
		expect(applicationAfter).toContain('Course: Course(dataSources)');
		const readonlyAfter = await readFile(path.join(root, 'packages/axc/persistence/src/datasources/readonly/index.ts'), 'utf8');
		expect(readonlyAfter).toContain("from './user/staff-user/staff-user.read-repository.ts'");
		expect(readonlyAfter).not.toContain('undefined');
		await expect(checkCellixLint({ root, lint })).resolves.toStrictEqual([]);
	});
});

async function expectDomainTypechecks(root: string): Promise<void> {
	const modules = path.join(root, 'node_modules');
	await mkdir(path.join(root, 'packages/axc/domain'), { recursive: true });
	await writeFile(path.join(root, 'packages/axc/domain/package.json'), '{ "name": "@axc/domain", "type": "module" }\n');
	await mkdir(path.join(modules, '@cellix'), { recursive: true });
	await symlink(path.join(repoRoot, 'packages/cellix/domain-seedwork'), path.join(modules, '@cellix/domain-seedwork'));
	const valueObjects = path.join(modules, '@lucaspaganini/value-objects');
	await mkdir(valueObjects, { recursive: true });
	await writeFile(path.join(valueObjects, 'package.json'), `${JSON.stringify({ name: '@lucaspaganini/value-objects', type: 'module', exports: { '.': { types: './index.d.ts', default: './index.js' } } })}\n`);
	await writeFile(
		path.join(valueObjects, 'index.d.ts'),
		'export interface ValueObject<T> { valueOf(): T }\nexport function VOString(options?: { trim?: boolean; minLength?: number; maxLength?: number }): new (value: string) => ValueObject<string>;\n',
	);
	await writeFile(
		path.join(root, 'tsconfig.json'),
		`${JSON.stringify(
			{
				compilerOptions: {
					target: 'ES2022',
					lib: ['ES2023'],
					module: 'NodeNext',
					moduleResolution: 'nodenext',
					strict: true,
					noUnusedLocals: true,
					noUnusedParameters: true,
					exactOptionalPropertyTypes: true,
					noUncheckedIndexedAccess: true,
					allowImportingTsExtensions: true,
					rewriteRelativeImportExtensions: true,
					verbatimModuleSyntax: true,
					erasableSyntaxOnly: true,
					noEmit: true,
					skipLibCheck: true,
					types: [],
				},
				include: ['packages/axc/domain/src/**/*.ts'],
			},
			null,
			'\t',
		)}\n`,
	);
	const tsgo = path.join(repoRoot, 'node_modules', '.bin', 'tsgo');
	const result = spawnSync(tsgo, ['--noEmit', '--project', path.join(root, 'tsconfig.json')], { encoding: 'utf8' });
	expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
}

async function writeStub(root: string, relative: string, contents: string): Promise<void> {
	const file = path.join(root, relative);
	await mkdir(path.dirname(file), { recursive: true });
	await writeFile(file, contents);
}
