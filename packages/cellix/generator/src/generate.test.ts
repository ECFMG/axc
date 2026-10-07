import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { checkCellixLint, defaultCellixLintConfig } from '../../lint/src/index.ts';
import { generateFeature } from './generate.ts';
import { parseField, parseFieldsFile, parseNested, parsePermission } from './spec.ts';

const roots: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function expectBiomeClean(files: { path: string }[]): void {
	const biome = path.join(repoRoot, 'node_modules', '.bin', 'biome');
	const result = spawnSync(biome, ['check', `--config-path=${path.join(repoRoot, 'biome.json')}`, ...files.map((file) => file.path)], { encoding: 'utf8' });
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
		expect(files.map((file) => file.path).join('\n')).toContain('course.aggregate.ts');
		expect(files.map((file) => file.path).join('\n')).toContain('course.resolvers.ts');
		expect(files.map((file) => file.path).join('\n')).not.toContain('.event.ts');
		const aggregate = files.find((file) => file.path.endsWith('course.aggregate.ts'));
		expect(aggregate?.contents).toContain('entity.markAsNew()');
		expect(aggregate?.contents).toContain('private markAsNew(): void');
		expect(aggregate?.contents).not.toContain('addIntegrationEvent');

		const violations = await checkCellixLint({ root, lint });
		expect(violations).toStrictEqual([]);
		expectBiomeClean(files);
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

		const violations = await checkCellixLint({ root, lint });
		expect(violations).toStrictEqual([]);

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
		expect(() => parseFieldsFile('{ "fields": [{ "name": "title", "type": "text" }] }')).toThrow('Field type');
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
		expect(queryAction?.contents).toContain('readonlyDataSource');
		expect(queryAction?.contents).not.toContain('withScopedTransaction');
		expect(queryFiles.find((file) => file.path.endsWith('course.resolvers.ts'))?.contents).toContain('Query:');
		await expect(checkCellixLint({ root: queryRoot, lint })).resolves.toStrictEqual([]);

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

	it('refuses to overwrite an entity file', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-generate-'));
		roots.push(root);
		const lint = defaultCellixLintConfig();
		await generateFeature({ root, lint, context: 'course', entity: 'course', action: 'create' });
		await expect(generateFeature({ root, lint, context: 'course', entity: 'course', action: 'update' })).rejects.toThrow('Refusing to overwrite');
	});
});
