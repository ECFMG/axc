import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { camel, pascal } from './names.ts';
import { normalizeShape } from './shape.ts';
import {
	contextApplication,
	contextBarrel,
	contextPersistence,
	contextsBarrel,
	dataSourcesIndex,
	domainBarrel,
	domainDataSourceIndex,
	entityBarrel,
	entityPersistence,
	modelsContext,
	modelsIndex,
	persistenceRoot,
} from './templates/composition/indexes.ts';
import { schema } from './templates/graphql/schema.ts';
import { modelsPackageJson, modelsTsconfig } from './templates/models/package-manifest.ts';
import { actionKind, commandFields, graphqlFieldName, httpReadArgument, namespacePath, paramShape, serviceResult } from './text.ts';
import type { GenerateFeatureOptions } from './types.ts';

// Edits barrels and host files that already exist. New-file patterns live under src/templates. Disk helpers for a brand-new file are src/write/new-files.ts.

interface WrittenFile {
	path: string;
	contents: string;
}

export async function wireComposition(options: GenerateFeatureOptions): Promise<WrittenFile[]> {
	const context = options.context;
	const entity = options.entity;
	const action = options.action;
	const contextPascal = pascal(context);
	const entityPascal = pascal(entity);
	const kind = options.operation === 'query' ? 'read' : options.operation === 'update' ? 'update' : action ? actionKind(camel(action)) : 'create';
	const shape = normalizeShape(entity, options.fields ?? [], options.permissions ?? [], options.nested ?? []);
	const commandShape = options.operation ? paramShape(options.params ?? []) : shape;
	const mutation = kind !== 'read';
	const permissions = options.permissions && options.permissions.length > 0 ? options.permissions : [`canManage${entityPascal}`];
	const scope = options.lint.scope;
	const domainSrc = path.join(options.root, options.lint.layers.domain);
	const applicationSrc = path.join(options.root, options.lint.layers.applicationServices);
	const persistenceSrc = path.join(options.root, options.lint.layers.persistence);
	const modelsSrc = path.join(options.root, options.lint.layers.models);
	const written: WrittenFile[] = [];

	written.push(
		...(await writeIfAbsent(path.join(domainSrc, 'domain/contexts', context, entity, 'index.ts'), entityBarrel(entity, entityPascal))),
		...(await ensureLine(path.join(domainSrc, 'domain/contexts', context, 'index.ts'), `export * as ${entityPascal} from './${entity}/index.ts';\n`, contextBarrel(context, contextPascal, entity, entityPascal))),
		...(await ensureLine(path.join(domainSrc, 'domain/contexts/index.ts'), `export * as ${contextPascal} from './${context}/index.ts';\n`, contextsBarrel(context, contextPascal))),
		...(await writeIfAbsent(path.join(domainSrc, 'domain/index.ts'), domainBarrel())),
		...(await ensureDomainDataSource(path.join(domainSrc, 'index.ts'), contextPascal, entityPascal)),
		...(await ensurePassport(path.join(domainSrc, 'domain/contexts/passport.ts'), { context, contextPascal, entityPascal, permissions })),
		...(await ensureModelsIndex(path.join(modelsSrc, 'index.ts'), entity, entityPascal)),
		...(await ensureModelsPackage(options)),
		...(await ensureDependency(path.join(domainSrc, '..', 'package.json'), '@lucaspaganini/value-objects', '1.3.1')),
		...(await ensureDependency(path.join(applicationSrc, '..', 'package.json'), `${scope}/domain`, 'workspace:*')),
		...(await ensureDependency(path.join(applicationSrc, '..', 'package.json'), `${scope}/persistence`, 'workspace:*')),
		...(await ensureDependency(path.join(persistenceSrc, '..', 'package.json'), `${scope}/domain`, 'workspace:*')),
		...(await ensureDependency(path.join(persistenceSrc, '..', 'package.json'), `${scope}/data-sources-mongoose-models`, 'workspace:*')),
		...(await ensureCatalogWiring(options)),
		...(await ensureSeedExports(options)),
		...(await ensureVitest(path.join(domainSrc, '..'))),
		...(await ensureVitest(path.dirname(path.join(options.root, options.lint.layers.models)))),
		...(await writeIfAbsent(path.join(persistenceSrc, 'datasources/domain', context, entity, 'index.ts'), entityPersistence(scope, entity, entityPascal))),
		...(await ensureObjectMember(path.join(persistenceSrc, 'datasources/domain', context, 'index.ts'), {
			importLine: `import * as ${entityPascal} from './${entity}/index.ts';\n`,
			marker: '=> ({',
			member: `\n\t${entityPascal}: ${entityPascal}.${entityPascal}Persistence(models, passport),`,
			fallback: contextPersistence(scope, contextPascal, entity, entityPascal),
		})),
		...(await ensureObjectMember(path.join(persistenceSrc, 'datasources/domain/index.ts'), {
			importLine: `import { ${contextPascal}ContextPersistence } from './${context}/index.ts';\n`,
			marker: '=> ({',
			member: `\n\t${contextPascal}: ${contextPascal}ContextPersistence(models, passport),`,
			fallback: domainDataSourceIndex(scope, context, contextPascal),
		})),
		...(await writeIfAbsent(path.join(persistenceSrc, 'datasources/index.ts'), dataSourcesIndex(scope))),
		...(await writeIfAbsent(path.join(persistenceSrc, 'models-context.ts'), modelsContext(scope))),
		...(await ensurePersistenceRoot(path.join(persistenceSrc, 'index.ts'), persistenceRoot(scope))),
		...(await ensureContextApplication(path.join(applicationSrc, 'contexts', context, 'index.ts'), { scope, contextPascal, entity, entityPascal })),
		...(await ensureReadonlyContext(path.join(persistenceSrc, 'datasources/readonly', context, 'index.ts'), { entity, entityPascal })),
		...(await ensureReadonlyRoot(path.join(persistenceSrc, 'datasources/readonly/index.ts'), { context, entity, contextPascal, entityPascal })),
	);

	const applicationIndex = path.join(applicationSrc, 'index.ts');
	if (await exists(applicationIndex)) written.push(...(await spliceApplicationHost(applicationIndex, { scope, context, contextPascal, entityPascal })));
	if (!action) return written;
	const restIndex = path.join(options.root, options.lint.layers.rest, 'index.ts');
	const actionCamel = camel(action);
	const reference = `Domain.Contexts.${namespacePath(contextPascal, entityPascal)}EntityReference`;
	const result = serviceResult({ result: options.result, operation: options.operation, kind, actionCamel, reference });
	if (options.operation === 'query') {
		written.push(
			...(await spliceReadMethod(path.join(persistenceSrc, 'datasources/readonly', context, entity, `${entity}.read-repository.ts`), {
				entityPascal,
				name: actionCamel,
				command: commandFields(commandShape, 'read').replaceAll('\n\t', ' '),
				result,
			})),
		);
	}
	if (options.operation) {
		written.push(
			...(await spliceEntityAction(path.join(applicationSrc, 'contexts', context, entity, 'index.ts'), {
				action,
				actionCamel,
				command: `${entityPascal}${pascal(action)}Command`,
				entityPascal,
				result,
			})),
		);
	}

	const routeOperation = options.operation === 'query' || options.operation === 'update';
	if (routeOperation && options.transport === 'rest') {
		if (await exists(restIndex)) {
			written.push(
				...(await spliceRest(restIndex, {
					entity,
					route: options.route ?? entity,
					contextPascal,
					entityPascal,
					actionCamel,
					mutation,
					readArgument: httpReadArgument(commandShape),
				})),
			);
		}
		const apiIndex = path.join(options.root, options.lint.apiComposition);
		if (await exists(apiIndex)) written.push(...(await spliceApi(apiIndex, { scope, entity, action, route: options.route ?? entity, mutation })));
		written.push(...(await ensureApiWiring(options)));
	}
	if (routeOperation) {
		const graphqlDir = path.join(options.root, options.lint.layers.graphql, 'schema/types');
		const resolverFile = path.join(graphqlDir, `${entity}.resolvers.ts`);
		const asked = options.transport !== 'rest' && (options.resolver === true || options.transport === 'graphql');
		if (asked || (await exists(resolverFile))) {
			const actionPascal = pascal(action);
			const fieldName = graphqlFieldName(actionCamel, options.transport, options.route);
			const graphqlOperation = options.operation === 'query' ? 'Query' : 'Mutation';
			const inputs = options.operation === 'query' ? queryInputs(commandShape.fields) : updateInputs(commandShape.fields);
			written.push(
				...(await spliceGraphql({
					resolverFile,
					schemaFile: path.join(graphqlDir, `${entity}.graphql`),
					entityPascal,
					contextPascal,
					actionCamel,
					fieldName,
					actionPascal,
					operation: graphqlOperation,
					inputs,
				})),
			);
		}
	}
	return written;
}

async function ensureDomainDataSource(file: string, contextPascal: string, entityPascal: string): Promise<WrittenFile[]> {
	const member = `\t${contextPascal}: {\n\t\t${entityPascal}: {\n\t\t\t${entityPascal}UnitOfWork: Contexts.${contextPascal}.${entityPascal}.${entityPascal}UnitOfWork;\n\t\t};\n\t};`;
	const created = `import type { Repository } from '@cellix/domain-seedwork/repository';\nimport type { Contexts } from './domain/index.ts';\n\n/** Repositories added in this package implement the Cellix repository contract. */\nexport type DomainRepository<T> = Repository<T>;\n\nexport * as Domain from './domain/index.ts';\n\nexport interface DomainDataSource {\n${member}\n}\n`;
	if (!(await exists(file))) return writeIfAbsent(file, created);
	let current = await readFile(file, 'utf8');
	if (!current.includes("export * as Domain from './domain/index.ts'")) current = `${current.trimEnd()}\n\nexport * as Domain from './domain/index.ts';\n`;
	if (!current.includes('import type { Contexts }')) current = `import type { Contexts } from './domain/index.ts';\n${current}`;
	if (!current.includes('export interface DomainDataSource')) {
		current = `${current.trimEnd()}\n\nexport interface DomainDataSource {\n${member}\n}\n`;
	} else if (!current.includes(`${entityPascal}UnitOfWork:`)) {
		current = current.replace('export interface DomainDataSource {', `export interface DomainDataSource {\n${member}`);
	}
	await writeFile(file, current.endsWith('\n') ? current : `${current}\n`);
	return [{ path: file, contents: current }];
}

async function spliceApplicationHost(file: string, input: { scope: string; context: string; contextPascal: string; entityPascal: string }): Promise<WrittenFile[]> {
	const current = await readFile(file, 'utf8');
	if (current.includes(`${input.contextPascal}(dataSources)`) && current.includes(`${input.contextPascal}ContextApplicationService`)) return [];
	let next = current;
	const serviceImport = `import { ${input.contextPascal}, type ${input.contextPascal}ContextApplicationService } from './contexts/${input.context}/index.ts';\n`;
	const dataImport = `import type { DataSourcesFactory } from '${input.scope}/persistence';\n`;
	if (!next.includes(dataImport.trim())) next = `${dataImport}${next}`;
	if (!next.includes(serviceImport.trim())) next = `${serviceImport}${next}`;
	if (!next.includes('dataSourcesFactory?:')) {
		next = next.replace('\tdataSourcesFactory: DataSourcesFactory;\n', '\tdataSourcesFactory?: DataSourcesFactory;\n');
	}
	if (!next.includes('dataSourcesFactory?:') && !next.includes('dataSourcesFactory:')) {
		next = next.replace('export interface ApiContext {\n\tenvironment: HealthEnvironment;\n}', 'export interface ApiContext {\n\tenvironment: HealthEnvironment;\n\tdataSourcesFactory?: DataSourcesFactory;\n}');
	}
	const member = `\t${input.contextPascal}: ${input.contextPascal}ContextApplicationService;\n`;
	if (!next.includes(`${input.contextPascal}: ${input.contextPascal}ContextApplicationService`)) next = insertBeforeClose(next, 'export interface ApplicationServices {', member);
	if (!next.includes('dataSourcesFactory?.withSystemPassport')) {
		next = next.replace('context.dataSourcesFactory.withSystemPassport()', 'context.dataSourcesFactory?.withSystemPassport()');
		next = next.replace(
			'const forRequest = (): Promise<ApplicationServices> =>\n\t\tPromise.resolve({',
			'const forRequest = (): Promise<ApplicationServices> => {\n\t\tconst dataSources = context.dataSourcesFactory?.withSystemPassport();\n\t\treturn Promise.resolve({',
		);
		next = next.replace(');\n\n\treturn { forRequest };', ');\n\t};\n\n\treturn { forRequest };');
	}
	const contextCall = `${input.contextPascal}: dataSources === undefined ? ({} as ${input.contextPascal}ContextApplicationService) : ${input.contextPascal}(dataSources),`;
	if (!next.includes(`${input.contextPascal}(dataSources)`)) next = insertBeforeClose(next, 'return Promise.resolve({', `\n\t\t\t${contextCall}\n`);
	if (next === current) return [];
	await writeFile(file, next);
	return [{ path: file, contents: next }];
}

async function ensurePassport(file: string, input: { context: string; contextPascal: string; entityPascal: string; permissions: string[] }): Promise<WrittenFile[]> {
	if (!(await exists(file))) return [];
	let current = await readFile(file, 'utf8');
	if (current.includes(`for${input.entityPascal}(`) || current.includes(`for${input.entityPascal}:`)) return [];
	const visaImport = `import type { ${input.contextPascal}Visa } from './${input.context}/${input.context}.visa.ts';\n`;
	if (!current.includes(visaImport.trim())) current = `${visaImport}${current}`;
	const contextKey = camel(input.context);
	const checks = input.permissions.map((permission) => `${permission}: true`).join(', ');
	if (current.includes(`${contextKey}: {`)) {
		current = insertIntoNthBlock(current, `${contextKey}: {`, 0, `\n\t\tfor${input.entityPascal}(entity: unknown): ${input.contextPascal}Visa;`);
		current = insertIntoNthBlock(current, `${contextKey}: {`, 1, `\n\t\t\t\tfor${input.entityPascal}: () => ({\n\t\t\t\t\tdetermineIf: (check) => check({ ${checks} }),\n\t\t\t\t}),`);
	} else {
		current = insertBeforeClose(current, 'export interface Passport {', `\n\t${contextKey}: {\n\t\tfor${input.entityPascal}(entity: unknown): ${input.contextPascal}Visa;\n\t};`);
		current = insertBeforeClose(current, 'return {', `\n\t\t\t${contextKey}: {\n\t\t\t\tfor${input.entityPascal}: () => ({\n\t\t\t\t\tdetermineIf: (check) => check({ ${checks} }),\n\t\t\t\t}),\n\t\t\t},`);
	}
	await writeFile(file, current);
	return [{ path: file, contents: current }];
}

async function spliceReadMethod(file: string, method: { entityPascal: string; name: string; command: string; result: string }): Promise<WrittenFile[]> {
	if (!(await exists(file))) return [];
	let current = await readFile(file, 'utf8');
	if (current.includes(`\t${method.name}(`) || current.includes(`\t${method.name}:`)) return [];
	const interfaceAt = current.indexOf(`export interface ${method.entityPascal}ReadRepository`);
	const interfaceEnd = interfaceAt < 0 ? -1 : current.indexOf('\n}', interfaceAt);
	const factoryAt = current.indexOf(`export const get${method.entityPascal}ReadRepository`);
	if (interfaceEnd < 0 || factoryAt < 0) return [];
	const inline = method.command.replaceAll('\n', ' ');
	const member = `\n\t${method.name}: (command: { ${inline} }) => Promise<${method.result}>;`;
	const body = `\n\t${method.name}(command: { ${inline} }): Promise<${method.result}> {\n\t\treturn Promise.reject(new Error(\`not implemented: \${JSON.stringify(command)}\`));\n\t}\n`;
	current = `${current.slice(0, interfaceEnd)}${member}${current.slice(interfaceEnd)}`;
	const factory = current.indexOf(`export const get${method.entityPascal}ReadRepository`);
	const classEnd = current.lastIndexOf('\n}', factory);
	if (classEnd < 0) return [];
	current = `${current.slice(0, classEnd)}\n${body}${current.slice(classEnd)}`;
	await writeFile(file, current);
	return [{ path: file, contents: current }];
}

async function spliceEntityAction(file: string, input: { action: string; actionCamel: string; command: string; entityPascal: string; result: string }): Promise<WrittenFile[]> {
	if (!(await exists(file))) return [];
	let current = await readFile(file, 'utf8');
	if (current.includes(`from './${input.action}.ts'`)) return [];
	const importLine = `import { type ${input.command}, ${input.actionCamel} } from './${input.action}.ts';\n`;
	const lastImport = current.lastIndexOf('\nimport ');
	const lineEnd = lastImport === -1 ? 0 : current.indexOf('\n', lastImport + 1) + 1;
	current = `${current.slice(0, lineEnd)}${importLine}${current.slice(lineEnd)}`;
	const interfaceName = `${input.entityPascal}ApplicationService`;
	const typeAlias = `export type ${interfaceName} = {};`;
	if (current.includes(typeAlias)) current = current.replace(typeAlias, `export interface ${interfaceName} {\n}`);
	const oneLine = `export interface ${interfaceName} {}`;
	if (current.includes(oneLine)) current = current.replace(oneLine, `export interface ${interfaceName} {\n}`);
	current = current.replace('(_dataSources: DataSources)', '(dataSources: DataSources)');
	const interfaceAt = current.indexOf(`export interface ${interfaceName}`);
	const interfaceEnd = interfaceAt < 0 ? -1 : current.indexOf('\n}', interfaceAt);
	if (interfaceEnd < 0) return [];
	current = `${current.slice(0, interfaceEnd)}\n\t${input.actionCamel}: (command: ${input.command}) => Promise<${input.result}>;${current.slice(interfaceEnd)}`;
	if (current.includes('return {};')) current = current.replace('return {};', 'return {\n\t};');
	const returnAt = current.indexOf('return {');
	if (returnAt < 0) return [];
	const lineEndAt = current.indexOf('\n', returnAt);
	const sameLine = current.slice(returnAt, lineEndAt === -1 ? current.length : lineEndAt);
	if (sameLine.includes('}')) {
		const brace = returnAt + sameLine.lastIndexOf('}');
		current = `${current.slice(0, brace)}${input.actionCamel}: ${input.actionCamel}(dataSources), ${current.slice(brace)}`;
	} else {
		const close = current.indexOf('\n\t};', returnAt);
		if (close < 0) return [];
		current = `${current.slice(0, close)}\n\t\t${input.actionCamel}: ${input.actionCamel}(dataSources),${current.slice(close)}`;
	}
	await writeFile(file, current);
	return [{ path: file, contents: current }];
}

function queryInputs(fields: { name: string; pascal: string; type: string }[]) {
	return fields.length > 0 ? fields : [{ name: 'id', pascal: 'Id', type: 'string' as const }];
}

function updateInputs(fields: { name: string; pascal: string; type: string }[]) {
	return [{ name: 'id', pascal: 'Id', type: 'string' as const }, ...fields];
}

async function spliceRest(file: string, input: { entity: string; route: string; contextPascal: string; entityPascal: string; actionCamel: string; mutation: boolean; readArgument: string }): Promise<WrittenFile[]> {
	const current = await readFile(file, 'utf8');
	const call = `applicationServices.${input.contextPascal}.${input.entityPascal}.${input.actionCamel}(`;
	if (current.includes(call)) return [];
	const method = input.mutation ? 'post' : 'get';
	const command = input.mutation ? 'await c.req.json()' : input.readArgument;
	const route = `\tapp.${method}('/api/${input.route}', async (c) => {\n\t\tconst authorization = c.req.header('Authorization');\n\t\tconst applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);\n\t\treturn c.json(await ${call}${command}));\n\t});\n\n`;
	if (!current.includes('\treturn app;\n')) return [];
	const next = current.replace('\treturn app;\n', `${route}\treturn app;\n`);
	await writeFile(file, next);
	return [{ path: file, contents: next }];
}

async function spliceGraphql(input: {
	resolverFile: string;
	schemaFile: string;
	entityPascal: string;
	contextPascal: string;
	actionCamel: string;
	fieldName: string;
	actionPascal: string;
	operation: 'Query' | 'Mutation';
	inputs: { name: string; pascal: string; type: string }[];
}): Promise<WrittenFile[]> {
	const written: WrittenFile[] = [];
	const field = `\t\t${input.fieldName}: async (_parent, args, context: GraphContext) => {\n\t\t\treturn await context.applicationServices.${input.contextPascal}.${input.entityPascal}.${input.actionCamel}(args.input);\n\t\t},\n`;
	if (await exists(input.resolverFile)) {
		let current = await readFile(input.resolverFile, 'utf8');
		if (!current.includes(`\t\t${input.fieldName}:`)) {
			const header = `\t${input.operation}: {\n`;
			if (current.includes(header)) current = current.replace(header, `${header}${field}`);
			else {
				const exportAt = current.indexOf('\nexport default ');
				const closeAt = exportAt < 0 ? -1 : current.lastIndexOf('\n};', exportAt);
				if (closeAt >= 0) current = `${current.slice(0, closeAt)}\n\t${input.operation}: {\n${field}\t},${current.slice(closeAt)}`;
			}
			await writeFile(input.resolverFile, current);
			written.push({ path: input.resolverFile, contents: current });
		}
	}
	const addition = schema({
		entityPascal: input.entityPascal,
		actionPascal: input.actionPascal,
		actionCamel: input.fieldName,
		operation: input.operation,
		shape: { fields: [], permissions: [], nested: [] },
		inputs: input.inputs,
	});
	if (await exists(input.schemaFile)) {
		const current = await readFile(input.schemaFile, 'utf8');
		if (!current.includes(`${input.fieldName}(input:`)) {
			const next = `${current.trimEnd()}\n\n${addition}`;
			await writeFile(input.schemaFile, next);
			written.push({ path: input.schemaFile, contents: next });
		}
	}
	return written;
}

async function spliceApi(file: string, input: { scope: string; entity: string; action: string; route: string; mutation: boolean }): Promise<WrittenFile[]> {
	let current = await readFile(file, 'utf8');
	if (current.includes(`'${input.entity}-${input.action}'`)) return [];
	const method = input.mutation ? 'POST' : 'GET';
	if (!current.includes(`from '${input.scope}/persistence'`)) {
		current = `import mongoose from 'mongoose';\nimport { Persistence } from '${input.scope}/persistence';\n${current}`;
	}
	if (!current.includes('dataSourcesFactory:')) {
		current = current.replace('environment: RuntimeConfig.environment,', 'environment: RuntimeConfig.environment,\n\t\t\tdataSourcesFactory: Persistence({ service: mongoose }),');
	}
	const registration = `\n\t.registerAzureFunctionHttpHandler('${input.entity}-${input.action}', { route: 'api/${input.route}', methods: ['${method}'], authLevel: 'anonymous' }, restHandlerCreator)`;
	current = current.replace('\t.startUp();', `${registration}\n\t.startUp();`);
	await writeFile(file, current);
	return [{ path: file, contents: current }];
}

async function ensureModelsPackage(options: GenerateFeatureOptions): Promise<WrittenFile[]> {
	const packageDir = path.dirname(path.join(options.root, options.lint.layers.models));
	const packageName = `${options.lint.scope}/${path.basename(packageDir)}`;
	return [...(await writeIfAbsent(path.join(packageDir, 'package.json'), modelsPackageJson(packageName))), ...(await writeIfAbsent(path.join(packageDir, 'tsconfig.json'), modelsTsconfig()))];
}

const vitestConfig = `import { nodeConfig } from '@cellix/config-vitest';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	nodeConfig,
	defineConfig({
		// Add package-specific overrides here if needed
	}),
);
`;

async function ensureCatalogWiring(options: GenerateFeatureOptions): Promise<WrittenFile[]> {
	const persistenceDir = path.join(options.root, options.lint.layers.persistence, '..');
	const serviceDir = path.join(options.root, options.lint.layers.serviceMongoose, '..');
	const acceptanceDir = path.join(options.root, options.lint.acceptance, '..');
	const modelsDir = path.dirname(path.join(options.root, options.lint.layers.models));
	return [
		...(await ensureDependency(path.join(persistenceDir, 'package.json'), '@cellix/event-bus-seedwork-node', 'workspace:*')),
		...(await ensureDependency(path.join(persistenceDir, 'package.json'), '@cellix/mongoose-seedwork', 'workspace:*')),
		...(await ensureDependency(path.join(persistenceDir, 'package.json'), 'mongoose', 'catalog:')),
		...(await ensureProjectReference(path.join(persistenceDir, 'tsconfig.json'), path.relative(persistenceDir, path.join(options.root, 'packages/cellix/event-bus-seedwork-node')))),
		...(await ensureProjectReference(path.join(persistenceDir, 'tsconfig.json'), path.relative(persistenceDir, path.join(options.root, 'packages/cellix/mongoose-seedwork')))),
		...(await ensureProjectReference(path.join(persistenceDir, 'tsconfig.json'), path.relative(persistenceDir, path.join(options.root, options.lint.layers.domain, '..')))),
		...(await ensureProjectReference(path.join(persistenceDir, 'tsconfig.json'), path.relative(persistenceDir, modelsDir))),
		...(await ensureDependency(path.join(serviceDir, 'package.json'), `${options.lint.scope}/data-sources-mongoose-models`, 'workspace:*')),
		...(await ensureProjectReference(path.join(serviceDir, 'tsconfig.json'), path.relative(serviceDir, modelsDir))),
		...(await ensureDependency(path.join(acceptanceDir, 'package.json'), `${options.lint.scope}/service-mongoose`, 'workspace:*')),
		...(await ensureProjectReference(path.join(acceptanceDir, 'tsconfig.json'), path.relative(acceptanceDir, serviceDir))),
	];
}

async function ensureApiWiring(options: GenerateFeatureOptions): Promise<WrittenFile[]> {
	const apiDir = path.join(options.root, path.dirname(options.lint.apiComposition), '..');
	const persistenceDir = path.join(options.root, options.lint.layers.persistence, '..');
	const serviceDir = path.join(options.root, options.lint.layers.serviceMongoose, '..');
	return [
		...(await ensureDependency(path.join(apiDir, 'package.json'), `${options.lint.scope}/persistence`, 'workspace:*')),
		...(await ensureDependency(path.join(apiDir, 'package.json'), `${options.lint.scope}/service-mongoose`, 'workspace:*')),
		...(await ensureDependency(path.join(apiDir, 'package.json'), 'mongoose', 'catalog:')),
		...(await ensureProjectReference(path.join(apiDir, 'tsconfig.json'), path.relative(apiDir, persistenceDir))),
		...(await ensureProjectReference(path.join(apiDir, 'tsconfig.json'), path.relative(apiDir, serviceDir))),
	];
}

async function ensureSeedExports(options: GenerateFeatureOptions): Promise<WrittenFile[]> {
	const entity = options.entity;
	const seed = `${camel(entity)}Seed`;
	const scope = options.lint.scope;
	return [
		...(await ensureExport(path.join(options.root, options.lint.layers.models, 'index.ts'), `export { ${seed} } from './models/${entity}/${entity}.seed.ts';\n`)),
		...(await ensureExport(path.join(options.root, options.lint.layers.serviceMongoose, 'index.ts'), `export { ${seed} } from '${scope}/data-sources-mongoose-models';\n`)),
	];
}

async function ensureVitest(packageDir: string): Promise<WrittenFile[]> {
	return [
		...(await ensureDevDependency(path.join(packageDir, 'package.json'), 'vitest', 'catalog:')),
		...(await ensureDevDependency(path.join(packageDir, 'package.json'), '@cellix/config-vitest', 'workspace:*')),
		...(await ensureScript(path.join(packageDir, 'package.json'), 'test', 'vitest run --silent --reporter=dot')),
		...(await writeIfAbsent(path.join(packageDir, 'vitest.config.ts'), vitestConfig)),
	];
}

async function ensureDependency(file: string, name: string, spec: string): Promise<WrittenFile[]> {
	if (!(await exists(file))) return [];
	const current = await readFile(file, 'utf8');
	if (current.includes(`"${name}"`)) return [];
	const entry = `\n\t\t"${name}": "${spec}"`;
	let next: string;
	if (/"dependencies"\s*:\s*\{/.test(current)) next = current.replace(/"dependencies"\s*:\s*\{/, (open) => `${open}${entry},`);
	else if (/"devDependencies"\s*:/.test(current)) next = current.replace(/"devDependencies"\s*:/, `"dependencies": {${entry}\n\t},\n\t"devDependencies":`);
	else next = current.replace(/\}\s*$/, `,\n\t"dependencies": {${entry}\n\t}\n}`);
	await writeFile(file, next);
	return [{ path: file, contents: next }];
}

async function ensureDevDependency(file: string, name: string, spec: string): Promise<WrittenFile[]> {
	if (!(await exists(file))) return [];
	const current = await readFile(file, 'utf8');
	if (current.includes(`"${name}"`)) return [];
	const entry = `\n\t\t"${name}": "${spec}"`;
	let next: string;
	if (/"devDependencies"\s*:\s*\{/.test(current)) next = current.replace(/"devDependencies"\s*:\s*\{/, (open) => `${open}${entry},`);
	else next = current.replace(/\}\s*$/, `,\n\t"devDependencies": {${entry}\n\t}\n}`);
	await writeFile(file, next);
	return [{ path: file, contents: next }];
}

async function ensureScript(file: string, name: string, command: string): Promise<WrittenFile[]> {
	if (!(await exists(file))) return [];
	const current = await readFile(file, 'utf8');
	if (current.includes(`"${name}":`)) return [];
	const entry = `\n\t\t"${name}": "${command}"`;
	let next: string;
	if (/"scripts"\s*:\s*\{/.test(current)) next = current.replace(/"scripts"\s*:\s*\{/, (open) => `${open}${entry},`);
	else next = current.replace(/\}\s*$/, `,\n\t"scripts": {${entry}\n\t}\n}`);
	await writeFile(file, next);
	return [{ path: file, contents: next }];
}

async function ensureProjectReference(file: string, reference: string): Promise<WrittenFile[]> {
	if (!(await exists(file))) return [];
	const posix = reference.split(path.sep).join('/');
	const current = await readFile(file, 'utf8');
	if (current.includes(`"${posix}"`)) return [];
	const entry = `{ "path": "${posix}" }`;
	let next: string;
	if (/"references"\s*:\s*\[/.test(current)) next = current.replace(/"references"\s*:\s*\[/, (open) => `${open}${entry}, `);
	else next = current.replace(/\}\s*$/, `,\n\t"references": [${entry}]\n}`);
	await writeFile(file, next);
	return [{ path: file, contents: next }];
}

async function ensureExport(file: string, line: string): Promise<WrittenFile[]> {
	if (!(await exists(file))) return [];
	const current = await readFile(file, 'utf8');
	if (current.includes(line.trim())) return [];
	const contents = current.endsWith('\n') ? `${current}${line}` : `${current}\n${line}`;
	await writeFile(file, contents);
	return [{ path: file, contents }];
}

async function writeIfAbsent(file: string, contents: string): Promise<WrittenFile[]> {
	if (await exists(file)) return [];
	await mkdir(path.dirname(file), { recursive: true });
	await writeFile(file, contents);
	return [{ path: file, contents }];
}

async function ensurePersistenceRoot(file: string, contents: string): Promise<WrittenFile[]> {
	if (!(await exists(file))) return writeIfAbsent(file, contents);
	const current = await readFile(file, 'utf8');
	if (current.includes('export const Persistence')) return [];
	await writeFile(file, contents);
	return [{ path: file, contents }];
}

async function ensureModelsIndex(file: string, entity: string, entityPascal: string): Promise<WrittenFile[]> {
	const written = await ensureObjectMember(file, {
		importLine: `import { ${entityPascal}ModelFactory } from './models/${entity}/${entity}.model.ts';\n`,
		marker: 'return {',
		member: `\n\t\t${entityPascal}: ${entityPascal}ModelFactory(initializedService),`,
		fallback: modelsIndex(entity, entityPascal),
	});
	if (!(await exists(file))) return written;
	const typeLine = `export type { ${entityPascal}, ${entityPascal}ModelType } from './models/${entity}/${entity}.model.ts';\n`;
	const nameLine = `export { ${entityPascal}ModelName } from './models/${entity}/${entity}.model.ts';\n`;
	let current = await readFile(file, 'utf8');
	if (current.includes(typeLine.trim()) && current.includes(nameLine.trim())) return written;
	const marker = 'export const mongooseContextBuilder';
	const at = current.indexOf(marker);
	if (at < 0) return written;
	const prefix = `${current.includes(typeLine.trim()) ? '' : typeLine}${current.includes(nameLine.trim()) ? '' : nameLine}`;
	if (prefix.length === 0) return written;
	current = `${current.slice(0, at)}${prefix}\n${current.slice(at)}`;
	await writeFile(file, current);
	return [...written.filter((item) => item.path !== file), { path: file, contents: current }];
}

async function ensureContextApplication(file: string, input: { scope: string; contextPascal: string; entity: string; entityPascal: string }): Promise<WrittenFile[]> {
	const fallback = contextApplication(input.scope, input.contextPascal, input.entity, input.entityPascal);
	if (!(await exists(file))) return writeIfAbsent(file, fallback);
	let current = await readFile(file, 'utf8');
	const member = `\t${input.entityPascal}: ${input.entityPascal}ApplicationService;`;
	if (current.includes(member)) return [];
	const importLine = `import { ${input.entityPascal} as ${input.entityPascal}Api, type ${input.entityPascal}ApplicationService } from './${input.entity}/index.ts';\n`;
	if (!current.includes(importLine.trim())) {
		const lastImport = current.lastIndexOf('\nimport ');
		const lineEnd = lastImport === -1 ? 0 : current.indexOf('\n', lastImport + 1) + 1;
		current = `${current.slice(0, lineEnd)}${importLine}${current.slice(lineEnd)}`;
	}
	current = insertBeforeClose(current, `export interface ${input.contextPascal}ContextApplicationService {`, `\n\t${member}`);
	current = insertBeforeClose(current, 'return {', `\n\t\t${input.entityPascal}: ${input.entityPascal}Api(dataSources),`);
	await writeFile(file, current);
	return [{ path: file, contents: current }];
}

async function ensureReadonlyContext(file: string, input: { entity: string; entityPascal: string }): Promise<WrittenFile[]> {
	if (!(await exists(file))) return [];
	return ensureObjectMember(file, {
		importLine: `import { ${input.entityPascal}ReadRepositoryImpl } from './${input.entity}/index.ts';\n`,
		marker: '=> ({',
		member: `\n\t${input.entityPascal}: ${input.entityPascal}ReadRepositoryImpl(models, passport),`,
		fallback: '',
	});
}

async function ensureReadonlyRoot(file: string, input: { context: string; entity: string; contextPascal: string; entityPascal: string }): Promise<WrittenFile[]> {
	if (!(await exists(file))) return [];
	let current = await readFile(file, 'utf8');
	if (current.includes(`${input.entityPascal}ReadRepo:`)) return [];
	const importLine = `import type { ${input.entityPascal}ReadRepository } from './${input.context}/${input.entity}/${input.entity}.read-repository.ts';\n`;
	if (!current.includes(`from './${input.context}/index.ts'`)) {
		current = `import { ${input.contextPascal}Context } from './${input.context}/index.ts';\n${current}`;
	}
	if (!current.includes(importLine.trim())) {
		const lastImport = current.lastIndexOf('\nimport ');
		const lineEnd = lastImport === -1 ? 0 : current.indexOf('\n', lastImport + 1) + 1;
		current = `${current.slice(0, lineEnd)}${importLine}${current.slice(lineEnd)}`;
	}
	const nested = `\n\t${input.contextPascal}: {\n\t\t${input.entityPascal}: {\n\t\t\t${input.entityPascal}ReadRepo: ${input.entityPascal}ReadRepository;\n\t\t};\n\t};`;
	if (!current.includes(`${input.contextPascal}: {`)) current = insertBeforeClose(current, 'export interface ReadonlyDataSource {', nested);
	current = insertBeforeClose(current, '=> ({', `\n\t${input.contextPascal}: ${input.contextPascal}Context(models, passport),`);
	await writeFile(file, current);
	return [{ path: file, contents: current }];
}

async function ensureObjectMember(file: string, input: { importLine: string; marker: string; member: string; fallback: string }): Promise<WrittenFile[]> {
	if (!(await exists(file))) {
		if (input.fallback.length === 0) return [];
		return writeIfAbsent(file, input.fallback);
	}
	let current = await readFile(file, 'utf8');
	if (current.includes(input.member.trim())) return [];
	if (!current.includes(input.importLine.trim())) {
		const lastImport = current.lastIndexOf('\nimport ');
		const lineEnd = lastImport === -1 ? 0 : current.indexOf('\n', lastImport + 1) + 1;
		current = `${current.slice(0, lineEnd)}${input.importLine}${current.slice(lineEnd)}`;
	}
	current = insertBeforeClose(current, input.marker, input.member);
	await writeFile(file, current);
	return [{ path: file, contents: current }];
}

async function ensureLine(file: string, line: string, fallback: string): Promise<WrittenFile[]> {
	if (!(await exists(file))) return writeIfAbsent(file, fallback);
	const current = await readFile(file, 'utf8');
	if (current.includes(line.trim())) return [];
	const contents = current.endsWith('\n') ? `${current}${line}` : `${current}\n${line}`;
	await writeFile(file, contents);
	return [{ path: file, contents }];
}

function insertIntoNthBlock(source: string, marker: string, occurrence: number, insertion: string): string {
	let from = 0;
	for (let seen = 0; ; seen += 1) {
		const start = source.indexOf(marker, from);
		if (start < 0) return source;
		if (seen === occurrence) return `${source.slice(0, start)}${insertBeforeClose(source.slice(start), marker, insertion)}`;
		from = start + marker.length;
	}
}

function insertBeforeClose(source: string, startMarker: string, insertion: string): string {
	const start = source.indexOf(startMarker);
	if (start < 0) return source;
	let depth = 0;
	for (let index = start; index < source.length; index += 1) {
		const char = source[index];
		if (char === '{') depth += 1;
		if (char === '}') {
			depth -= 1;
			if (depth === 0) {
				let at = index;
				while (at > start && /\s/.test(source[at - 1] ?? '')) at -= 1;
				return `${source.slice(0, at)}${insertion}${source.slice(at)}`;
			}
		}
	}
	return source;
}

async function exists(file: string): Promise<boolean> {
	try {
		await readFile(file);
		return true;
	} catch {
		return false;
	}
}
