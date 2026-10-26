import path from 'node:path';
import { camel, pascal } from './names.ts';
import { isShapeNested, normalizeShape, type Shape, type ShapeNested } from './shape.ts';
import { feature, steps } from './templates/acceptance-api/scenario.ts';
import { action, entityServiceIndex } from './templates/application-services/action.ts';
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
import { actionKind, commandFields, namespacePath, paramShape } from './text.ts';
import type { GeneratedFile, GenerateFeatureOptions } from './types.ts';

export function plan(options: GenerateFeatureOptions): GeneratedFile[] {
	const { root, lint, context, entity, action: actionName } = options;
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
	const serviceResult = options.operation === 'query' ? `${reference}[]` : kind === 'read' ? (/^get(?:[A-Z]|$)/.test(actionCamel) ? `${reference} | null` : `${reference}[]`) : reference;
	const read = kind === 'read' ? { name: actionCamel, command: commandFields(commandShape, 'read').replaceAll('\n\t', ' '), result: serviceResult } : undefined;
	const resolver = options.transport !== 'rest' && (options.resolver === true || options.transport === 'graphql');
	const domainContexts = path.join(root, lint.layers.domain, 'domain/contexts');
	const entityDir = path.join(domainContexts, context, entity);
	const persistenceDir = path.join(root, lint.layers.persistence, 'datasources/domain', context, entity);
	const readonlyRoot = path.join(root, lint.layers.persistence, 'datasources/readonly');
	const readonlyDir = path.join(readonlyRoot, context, entity);
	const applicationDir = path.join(root, lint.layers.applicationServices, 'contexts', context, entity);
	const modelFile = path.join(root, lint.layers.models, 'models', entity, `${entity}.model.ts`);

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
		{ path: path.join(entityDir, `${entity}.repository.ts`), contents: domainRepository(entity, entityPascal) },
		{ path: path.join(entityDir, `${entity}.uow.ts`), contents: domainUnitOfWork(entity, entityPascal) },
		{ path: modelFile, contents: model(entityPascal, shape) },
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
		{ path: path.join(applicationDir, `${actionName}.ts`), contents: action({ actionCamel, command, contextPascal, entityPascal, kind, result: serviceResult, scope, shape, commandShape }) },
		{ path: path.join(applicationDir, 'index.ts'), contents: entityServiceIndex(actionName, actionCamel, command, contextPascal, entityPascal, serviceResult, scope) },
	];

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
			{ path: path.join(typesDir, `${entity}.graphql`), contents: schema({ entityPascal, actionPascal, actionCamel, operation, shape, ...(inputs ? { inputs } : {}) }) },
			{ path: path.join(typesDir, `${entity}.resolvers.ts`), contents: resolvers(entity, entityPascal, contextPascal, actionCamel, operation) },
		);
	}
	return files;
}

function queryInputs(fields: { name: string; pascal: string; type: 'string' | 'boolean' | 'date' | 'number' }[]) {
	return fields.length > 0 ? fields : [{ name: 'id', pascal: 'Id', type: 'string' as const }];
}

function updateInputs(fields: { name: string; pascal: string; type: 'string' | 'boolean' | 'date' | 'number' }[]) {
	return [{ name: 'id', pascal: 'Id', type: 'string' as const }, ...fields];
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
