import path from 'node:path';
import { camel, pascal } from './names.ts';
import { isShapeNested, normalizeShape, type Shape, type ShapeNested } from './shape.ts';
import { feature, steps } from './templates/acceptance-api/scenario.ts';
import { action, entityServiceIndex, entityServiceShell } from './templates/application-services/action.ts';
import { domainPermissions } from './templates/domain/context.domain-permissions.ts';
import { visa } from './templates/domain/context.visa.ts';
import { aggregate } from './templates/domain/entity.aggregate.ts';
import { repository as domainRepository } from './templates/domain/entity.repository.ts';
import { unitOfWork as domainUnitOfWork } from './templates/domain/entity.uow.ts';
import { scalarValueObjects } from './templates/domain/entity.value-objects.ts';
import { nestedEntity } from './templates/domain/nested.entity.ts';
import { nestedValueObject } from './templates/domain/nested.value-objects.ts';
import { passport } from './templates/domain/passport.ts';
import { resolvers } from './templates/graphql/resolvers.ts';
import { schema } from './templates/graphql/schema.ts';
import { model } from './templates/models/entity.model.ts';
import { seed } from './templates/models/entity.seed.ts';
import { domainAdapter } from './templates/persistence/entity.domain-adapter.ts';
import { persistenceRepository } from './templates/persistence/entity.repository.ts';
import { persistenceUnitOfWork } from './templates/persistence/entity.uow.ts';
import { mongoDataSource } from './templates/persistence/mongo-data-source.ts';
import { entityData, readContextIndex, readEntityIndex, readonlyIndex, readRepository } from './templates/persistence/readonly.ts';
import { actionKind, commandFields, graphqlFieldName, namespacePath, paramShape, serviceResult } from './text.ts';
import type { GeneratedFile, GenerateFeatureOptions } from './types.ts';

export function plan(options: GenerateFeatureOptions): GeneratedFile[] {
	rejectOwnedTimestamps(options.fields, options.nested);
	if (options.operation === 'query' || options.operation === 'update') return actionFiles(options);
	const files = backendFiles(options);
	if (options.action) files.push(...actionFiles(options));
	return files;
}

function backendFiles(options: GenerateFeatureOptions): GeneratedFile[] {
	const { root, lint, context, entity } = options;
	const scope = lint.scope;
	const entityPascal = pascal(entity);
	const contextPascal = pascal(context);
	const shape = normalizeShape(entity, options.fields ?? [], options.permissions ?? [], options.nested ?? []);
	const domainContexts = path.join(root, lint.layers.domain, 'domain/contexts');
	const entityDir = path.join(domainContexts, context, entity);
	const persistenceDir = path.join(root, lint.layers.persistence, 'datasources/domain', context, entity);
	const readonlyRoot = path.join(root, lint.layers.persistence, 'datasources/readonly');
	const readonlyDir = path.join(readonlyRoot, context, entity);
	const applicationDir = path.join(root, lint.layers.applicationServices, 'contexts', context, entity);
	const read = embeddedRead(options);
	const files: GeneratedFile[] = [
		...nestedFiles(entityDir, context, shape),
		{ path: path.join(domainContexts, context, `${context}.domain-permissions.ts`), contents: domainPermissions(contextPascal, shape.permissions) },
		{ path: path.join(domainContexts, context, `${context}.visa.ts`), contents: visa(context, contextPascal) },
		{ path: path.join(domainContexts, 'passport.ts'), contents: passport(context, contextPascal, entityPascal, shape.permissions) },
		{
			path: path.join(entityDir, `${entity}.value-objects.ts`),
			contents: scalarValueObjects(
				shape.fields.filter((field) => field.type === 'string').map((field) => field.pascal),
				`${entityPascal}Name`,
			),
		},
		{ path: path.join(entityDir, `${entity}.aggregate.ts`), contents: aggregate({ entity, entityPascal, context, shape }) },
		{ path: path.join(entityDir, `${entity}.aggregate.test.ts`), contents: aggregateTest({ entity, entityPascal, shape }) },
		{
			path: path.join(entityDir, `${entity}.value-objects.test.ts`),
			contents: valueObjectTest({
				entity,
				entityPascal,
				classNames: shape.fields.filter((field) => field.type === 'string').map((field) => field.pascal),
			}),
		},
		{ path: path.join(entityDir, `${entity}.repository.ts`), contents: domainRepository(entity, entityPascal) },
		{ path: path.join(entityDir, `${entity}.uow.ts`), contents: domainUnitOfWork(entity, entityPascal) },
		{ path: path.join(root, lint.layers.models, 'models', entity, `${entity}.model.ts`), contents: model(entityPascal, shape) },
		{ path: path.join(root, lint.layers.models, 'models', entity, `${entity}.model.test.ts`), contents: modelTest({ entity, entityPascal }) },
		{ path: path.join(root, lint.layers.models, 'models', entity, `${entity}.seed.ts`), contents: seed(entity, entityPascal, shape) },
		{ path: path.join(persistenceDir, `${entity}.domain-adapter.ts`), contents: domainAdapter({ entityPascal, contextPascal, scope, shape }) },
		{ path: path.join(persistenceDir, `${entity}.repository.ts`), contents: persistenceRepository({ entity, entityPascal, contextPascal, scope, shape }) },
		{ path: path.join(persistenceDir, `${entity}.uow.ts`), contents: persistenceUnitOfWork({ entity, entityPascal, contextPascal, scope }) },
		{ path: path.join(readonlyRoot, 'mongo-data-source.ts'), contents: mongoDataSource() },
		{ path: path.join(readonlyDir, `${entity}.data.ts`), contents: entityData(entityPascal, scope) },
		{ path: path.join(readonlyDir, `${entity}.read-repository.ts`), contents: readRepository({ context, entity, entityPascal, contextPascal, scope, ...(read ? { read } : {}) }) },
		{ path: path.join(readonlyDir, 'index.ts'), contents: readEntityIndex(entity, entityPascal, scope) },
		{ path: path.join(readonlyRoot, context, 'index.ts'), contents: readContextIndex(contextPascal, entity, entityPascal, scope) },
		{ path: path.join(readonlyRoot, 'index.ts'), contents: readonlyIndex(context, contextPascal, entity, entityPascal, scope) },
	];
	if (!options.action) files.push({ path: path.join(applicationDir, 'index.ts'), contents: entityServiceShell(entityPascal, scope) });
	return files;
}

function actionFiles(options: GenerateFeatureOptions): GeneratedFile[] {
	const actionName = options.action;
	if (!actionName) throw new Error('Missing --name');
	const { root, lint, context, entity } = options;
	const scope = lint.scope;
	const entityPascal = pascal(entity);
	const contextPascal = pascal(context);
	const actionCamel = camel(actionName);
	const actionPascal = pascal(actionName);
	const command = `${entityPascal}${actionPascal}Command`;
	const kind = options.operation === 'query' ? 'read' : options.operation === 'update' ? 'update' : actionKind(actionCamel);
	const shape = normalizeShape(entity, options.fields ?? [], options.permissions ?? [], options.nested ?? []);
	const commandShape = options.operation ? paramShape(options.params ?? []) : shape;
	const reference = `Domain.Contexts.${namespacePath(contextPascal, entityPascal)}EntityReference`;
	const result = serviceResult({ result: options.result, operation: options.operation, kind, actionCamel, reference });
	const fieldName = graphqlFieldName(actionCamel, options.transport, options.route);
	const resolver = options.transport !== 'rest' && (options.resolver === true || options.transport === 'graphql');
	const applicationDir = path.join(root, lint.layers.applicationServices, 'contexts', context, entity);
	const files: GeneratedFile[] = [{ path: path.join(applicationDir, `${actionName}.ts`), contents: action({ actionCamel, command, contextPascal, entityPascal, kind, result, scope, shape, commandShape }) }];
	if (!options.operation) {
		files.push({ path: path.join(applicationDir, 'index.ts'), contents: entityServiceIndex(actionName, actionCamel, command, contextPascal, entityPascal, result, scope) });
	}
	const acceptanceName = `${entity}-${actionName}`;
	files.push(
		{ path: path.join(root, lint.acceptance, 'features', `${acceptanceName}.feature`), contents: feature(entity, actionName) },
		{ path: path.join(root, lint.acceptance, 'step-definitions', `${acceptanceName}.steps.ts`), contents: steps(entity, actionName) },
	);
	if (resolver) {
		const typesDir = path.join(root, lint.layers.graphql, 'schema/types');
		const operation = kind === 'read' ? 'Query' : 'Mutation';
		const inputs = options.operation === 'query' ? queryInputs(commandShape.fields) : options.operation === 'update' ? updateInputs(commandShape.fields) : undefined;
		files.push(
			{ path: path.join(typesDir, `${entity}.graphql`), contents: schema({ entityPascal, actionPascal, actionCamel, fieldName, operation, shape, ...(inputs ? { inputs } : {}) }) },
			{ path: path.join(typesDir, `${entity}.resolvers.ts`), contents: resolvers(entity, entityPascal, contextPascal, actionCamel, operation, fieldName) },
		);
	}
	return files;
}

function embeddedRead(options: GenerateFeatureOptions): { name: string; command: string; result: string } | undefined {
	const actionName = options.action;
	if (!actionName || options.operation) return undefined;
	const actionCamel = camel(actionName);
	const kind = actionKind(actionCamel);
	if (kind !== 'read') return undefined;
	const entityPascal = pascal(options.entity);
	const contextPascal = pascal(options.context);
	const shape = normalizeShape(options.entity, options.fields ?? [], options.permissions ?? [], options.nested ?? []);
	const reference = `Domain.Contexts.${namespacePath(contextPascal, entityPascal)}EntityReference`;
	const result = serviceResult({ result: options.result, kind, actionCamel, reference });
	return { name: actionCamel, command: commandFields(shape, 'read').replaceAll('\n\t', ' '), result };
}

function queryInputs(fields: { name: string; pascal: string; type: string }[]) {
	return fields.length > 0 ? fields : [{ name: 'id', pascal: 'Id', type: 'string' as const }];
}

function updateInputs(fields: { name: string; pascal: string; type: string }[]) {
	return [{ name: 'id', pascal: 'Id', type: 'string' as const }, ...fields];
}

const OWNED_TIMESTAMPS = new Set(['createdAt', 'updatedAt']);

function rejectOwnedTimestamps(fields: { name: string }[] | undefined, nested: { fields: unknown[] }[] | undefined): void {
	for (const field of fields ?? []) {
		if (OWNED_TIMESTAMPS.has(field.name)) throw new Error(`${field.name} is a timestamp. Leave it off --field. The model sets it.`);
	}
	for (const item of nested ?? []) {
		const scalars: { name: string }[] = [];
		const children: { fields: unknown[] }[] = [];
		for (const member of item.fields) {
			if (member === null || typeof member !== 'object') continue;
			if ('fields' in member) {
				const nestedFields = member.fields;
				if (Array.isArray(nestedFields)) {
					children.push({ fields: nestedFields });
					continue;
				}
			}
			if ('name' in member) {
				const name = member.name;
				if (typeof name === 'string') scalars.push({ name });
			}
		}
		rejectOwnedTimestamps(scalars, children);
	}
}

function nestedFiles(entityDir: string, context: string, shape: Shape): GeneratedFile[] {
	const permission = shape.permissions[0] ?? 'canManage';
	return shape.nested.flatMap((item) => filesForNested(entityDir, context, item, permission));
}

function filesForNested(entityDir: string, context: string, item: ShapeNested, permission: string): GeneratedFile[] {
	const children = item.fields.filter(isShapeNested).flatMap((child) => filesForNested(entityDir, context, child, permission));
	const strings = item.fields.filter((member) => !isShapeNested(member) && member.type === 'string').map((member) => member.pascal);
	const files = [...children];
	if (item.kind === 'value' || strings.length > 0) {
		files.push({ path: path.join(entityDir, `${item.name}.value-objects.ts`), contents: nestedValueObject(item, strings) });
	}
	if (item.kind === 'entity') files.push({ path: path.join(entityDir, `${item.name}.entity.ts`), contents: nestedEntity(item, context, permission) });
	return files;
}

function aggregateTest(input: { entity: string; entityPascal: string; shape: Shape }): string {
	const { entity, entityPascal, shape } = input;
	if (shape.nested.length > 0) {
		return `import { describe, expect, it } from 'vitest';
import { ${entityPascal} } from './${entity}.aggregate.ts';

describe('${entityPascal}', () => {
	it('opens a new instance', () => {
		expect(${entityPascal}.getNewInstance).toEqual(expect.any(Function));
	});
});
`;
	}
	const fields = shape.fields.map((field) => `\t\t${field.name}: ${sampleValue(field.type)},`);
	const props = ["\t\tid: 'example',", '\t\tcreatedAt: now,', '\t\tupdatedAt: now,', "\t\tschemaVersion: '1.0.0',", ...fields].join('\n');
	const command = fields.join('\n');
	const stringChecks = shape.fields
		.filter((field) => field.type === 'string')
		.map((field) => `\t\texpect(created.${field.name}.valueOf()).toBe('example');`)
		.join('\n');
	return `import { describe, expect, it } from 'vitest';
import { PassportFactory } from '../../passport.ts';
import { ${entityPascal} } from './${entity}.aggregate.ts';

describe('${entityPascal}', () => {
	it('builds a new instance', () => {
		const now = new Date('2024-01-01T00:00:00.000Z');
		const created = ${entityPascal}.getNewInstance(
			{
${props}
			},
			{
${command}
			},
			PassportFactory.forSystem(),
		);
		expect(created).toBeInstanceOf(${entityPascal});
${stringChecks}
	});
});
`;
}

function valueObjectTest(input: { entity: string; entityPascal: string; classNames: string[] }): string {
	const names = input.classNames.length > 0 ? input.classNames : [`${input.entityPascal}Name`];
	const cases = names
		.map(
			(name) => `\tit('trims ${name}', () => {
		expect(new ${name}('  example  ').valueOf()).toBe('example');
		expect(() => new ${name}('   ')).toThrow();
	});`,
		)
		.join('\n\n');
	return `import { describe, expect, it } from 'vitest';
import { ${names.join(', ')} } from './${input.entity}.value-objects.ts';

describe('${input.entityPascal} value objects', () => {
${cases}
});
`;
}

function modelTest(input: { entity: string; entityPascal: string }): string {
	return `import { describe, expect, it } from 'vitest';
import { ${input.entityPascal}ModelName } from './${input.entity}.model.ts';

describe('${input.entityPascal} model', () => {
	it('names the mongoose model', () => {
		expect(${input.entityPascal}ModelName).toBe('${input.entityPascal}');
	});
});
`;
}

function sampleValue(type: string): string {
	if (type === 'boolean') return 'true';
	if (type === 'number') return '1';
	if (type === 'date') return "new Date('2024-01-01T00:00:00.000Z')";
	if (type.endsWith('[]')) return `[${sampleValue(type.slice(0, -2))}]`;
	const quoted = type
		.split('|')
		.map((part) => part.trim())
		.find((part) => part.startsWith("'"));
	if (quoted) return quoted;
	return "'example'";
}
