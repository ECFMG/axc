import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GenerateFeatureOptions } from './generate.ts';

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
	const mutation = /^(?:create|update|delete)(?:[A-Z]|$)/.test(camel(action));
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
		...(await ensurePersistenceRoot(path.join(persistenceSrc, 'index.ts'), persistenceRoot(scope))),
		...(await ensureContextApplication(path.join(applicationSrc, 'contexts', context, 'index.ts'), { scope, contextPascal, entity, entityPascal })),
		...(await ensureReadonlyContext(path.join(persistenceSrc, 'datasources/readonly', context, 'index.ts'), { entity, entityPascal })),
		...(await ensureReadonlyRoot(path.join(persistenceSrc, 'datasources/readonly/index.ts'), { context, entity, contextPascal, entityPascal })),
	);

	const applicationIndex = path.join(applicationSrc, 'index.ts');
	if (await exists(applicationIndex)) written.push(...(await spliceApplicationHost(applicationIndex, { scope, context, contextPascal, entityPascal })));
	const restIndex = path.join(options.root, options.lint.layers.rest, 'index.ts');
	if (await exists(restIndex)) written.push(...(await spliceRest(restIndex, { entity, action, mutation })));
	const apiIndex = path.join(options.root, options.lint.apiComposition);
	if (await exists(apiIndex)) written.push(...(await spliceApi(apiIndex, { scope, entity, action, mutation })));
	return written;
}

function entityBarrel(entity: string, entityPascal: string): string {
	return `export type { ${entityPascal}Repository } from './${entity}.repository.ts';\nexport { ${entityPascal}, type ${entityPascal}EntityReference, type ${entityPascal}Props } from './${entity}.aggregate.ts';\nexport type { ${entityPascal}UnitOfWork } from './${entity}.uow.ts';\nexport * as ValueObjects from './${entity}.value-objects.ts';\n`;
}

function contextBarrel(context: string, contextPascal: string, entity: string, entityPascal: string): string {
	return `export * as ${entityPascal} from './${entity}/index.ts';\nexport type { ${contextPascal}DomainPermissions } from './${context}.domain-permissions.ts';\nexport type { ${contextPascal}Visa } from './${context}.visa.ts';\n`;
}

function contextsBarrel(context: string, contextPascal: string): string {
	return `export * as ${contextPascal} from './${context}/index.ts';\n`;
}

function domainBarrel(): string {
	return `export * as Contexts from './contexts/index.ts';\nexport { type Passport, PassportFactory } from './contexts/passport.ts';\n`;
}

function modelsIndex(entity: string, entityPascal: string): string {
	return `import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';\nimport { ${entityPascal}ModelFactory } from './models/${entity}/${entity}.model.ts';\n\nexport type { ${entityPascal}, ${entityPascal}ModelType } from './models/${entity}/${entity}.model.ts';\n\nexport const mongooseContextBuilder = (initializedService: MongooseSeedwork.MongooseContextFactory) => {\n\treturn {\n\t\t${entityPascal}: ${entityPascal}ModelFactory(initializedService),\n\t};\n};\n`;
}

function entityPersistence(scope: string, entity: string, entityPascal: string): string {
	return `import type { Domain } from '${scope}/domain';\nimport type { ModelsContext } from '${scope}/persistence';\nimport { get${entityPascal}UnitOfWork } from './${entity}.uow.ts';\n\nexport const ${entityPascal}Persistence = (models: ModelsContext, passport: Domain.Passport) => {\n\tconst ${entityPascal}Model = models.${entityPascal};\n\treturn {\n\t\t${entityPascal}UnitOfWork: get${entityPascal}UnitOfWork(${entityPascal}Model, passport),\n\t};\n};\n`;
}

function contextPersistence(scope: string, contextPascal: string, entity: string, entityPascal: string): string {
	return `import type { Domain } from '${scope}/domain';\nimport type { ModelsContext } from '${scope}/persistence';\nimport * as ${entityPascal} from './${entity}/index.ts';\n\nexport const ${contextPascal}ContextPersistence = (models: ModelsContext, passport: Domain.Passport) => ({\n\t${entityPascal}: ${entityPascal}.${entityPascal}Persistence(models, passport),\n});\n`;
}

function domainDataSourceIndex(scope: string, context: string, contextPascal: string): string {
	return `import type { Domain, DomainDataSource } from '${scope}/domain';\nimport type { ModelsContext } from '${scope}/persistence';\nimport { ${contextPascal}ContextPersistence } from './${context}/index.ts';\n\nexport const DomainDataSourceImplementation = (models: ModelsContext, passport: Domain.Passport): DomainDataSource => ({\n\t${contextPascal}: ${contextPascal}ContextPersistence(models, passport),\n});\n`;
}

function dataSourcesIndex(scope: string): string {
	return `import { Domain, type DomainDataSource } from '${scope}/domain';\nimport type { ModelsContext } from '${scope}/persistence';\nimport { DomainDataSourceImplementation } from './domain/index.ts';\nimport { type ReadonlyDataSource, ReadonlyDataSourceImplementation } from './readonly/index.ts';\n\nexport type DataSources = {\n\tdomainDataSource: DomainDataSource;\n\treadonlyDataSource: ReadonlyDataSource;\n};\n\nexport type DataSourcesFactory = {\n\twithPassport: (passport: Domain.Passport) => DataSources;\n\twithSystemPassport: () => DataSources;\n};\n\nexport const DataSourcesFactoryImpl = (models: ModelsContext): DataSourcesFactory => {\n\tconst withPassport = (passport: Domain.Passport): DataSources => {\n\t\treturn {\n\t\t\tdomainDataSource: DomainDataSourceImplementation(models, passport),\n\t\t\treadonlyDataSource: ReadonlyDataSourceImplementation(models, passport),\n\t\t};\n\t};\n\tconst withSystemPassport = (): DataSources => withPassport(Domain.PassportFactory.forSystem());\n\treturn { withPassport, withSystemPassport };\n};\n`;
}

function persistenceRoot(scope: string): string {
	return `import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';\nimport { mongooseContextBuilder } from '${scope}/data-sources-mongoose-models';\nimport { DataSourcesFactoryImpl } from './datasources/index.ts';\n\nexport type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';\nexport type ModelsContext = ReturnType<typeof mongooseContextBuilder>;\nexport type { DataSources, DataSourcesFactory } from './datasources/index.ts';\n\nexport const Persistence = (initializedService: MongooseSeedwork.MongooseContextFactory) => {\n\tif (!initializedService?.service) {\n\t\tthrow new Error('MongooseSeedwork.MongooseContextFactory is required');\n\t}\n\tconst models: ModelsContext = {\n\t\t...mongooseContextBuilder(initializedService),\n\t};\n\treturn DataSourcesFactoryImpl(models);\n};\n`;
}

function contextApplication(scope: string, contextPascal: string, entity: string, entityPascal: string): string {
	return `import type { DataSources } from '${scope}/persistence';\nimport { ${entityPascal} as ${entityPascal}Api, type ${entityPascal}ApplicationService } from './${entity}/index.ts';\n\nexport interface ${contextPascal}ContextApplicationService {\n\t${entityPascal}: ${entityPascal}ApplicationService;\n}\n\nexport const ${contextPascal} = (dataSources: DataSources): ${contextPascal}ContextApplicationService => {\n\treturn {\n\t\t${entityPascal}: ${entityPascal}Api(dataSources),\n\t};\n};\n`;
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
	if (!next.includes('dataSourcesFactory:')) {
		next = next.replace('export interface ApiContext {\n\tenvironment: HealthEnvironment;\n}', 'export interface ApiContext {\n\tenvironment: HealthEnvironment;\n\tdataSourcesFactory: DataSourcesFactory;\n}');
	}
	const member = `\t${input.contextPascal}: ${input.contextPascal}ContextApplicationService;\n`;
	if (!next.includes(`${input.contextPascal}: ${input.contextPascal}ContextApplicationService`)) next = insertBeforeClose(next, 'export interface ApplicationServices {', member);
	if (!next.includes('dataSourcesFactory.withSystemPassport')) {
		next = next.replace(
			'const forRequest = (): Promise<ApplicationServices> =>\n\t\tPromise.resolve({',
			'const forRequest = (): Promise<ApplicationServices> => {\n\t\tconst dataSources = context.dataSourcesFactory.withSystemPassport();\n\t\treturn Promise.resolve({',
		);
		next = next.replace(');\n\n\treturn { forRequest };', ');\n\t};\n\n\treturn { forRequest };');
	}
	if (!next.includes(`${input.contextPascal}(dataSources)`)) next = insertBeforeClose(next, 'return Promise.resolve({', `\n\t\t\t${input.contextPascal}: ${input.contextPascal}(dataSources),\n`);
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

async function spliceRest(file: string, input: { entity: string; action: string; mutation: boolean }): Promise<WrittenFile[]> {
	const current = await readFile(file, 'utf8');
	const handler = camel(`${input.entity}-${input.action}`);
	if (current.includes(`from './${input.entity}-${input.action}.ts'`)) return [];
	const method = input.mutation ? 'post' : 'get';
	const command = input.mutation ? 'await c.req.json()' : "{ id: c.req.query('id') ?? '' }";
	const importLine = `import { ${handler} } from './${input.entity}-${input.action}.ts';\n`;
	const route = `\tapp.${method}('/api/${input.entity}', async (c) => {\n\t\tconst authorization = c.req.header('Authorization');\n\t\tconst applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);\n\t\treturn c.json(await ${handler}(applicationServices, ${command}));\n\t});\n\n`;
	const lastImport = current.lastIndexOf('\nimport ');
	const lineEnd = lastImport === -1 ? 0 : current.indexOf('\n', lastImport + 1) + 1;
	let next = `${current.slice(0, lineEnd)}${importLine}${current.slice(lineEnd)}`;
	next = next.replace('\treturn app;\n', `${route}\treturn app;\n`);
	await writeFile(file, next);
	return [{ path: file, contents: next }];
}

async function spliceApi(file: string, input: { scope: string; entity: string; action: string; mutation: boolean }): Promise<WrittenFile[]> {
	let current = await readFile(file, 'utf8');
	if (current.includes(`'${input.entity}-${input.action}'`)) return [];
	const method = input.mutation ? 'POST' : 'GET';
	if (!current.includes(`from '${input.scope}/persistence'`)) {
		current = `import mongoose from 'mongoose';\nimport { Persistence } from '${input.scope}/persistence';\n${current}`;
	}
	if (!current.includes('dataSourcesFactory:')) {
		current = current.replace('environment: RuntimeConfig.environment,', 'environment: RuntimeConfig.environment,\n\t\t\tdataSourcesFactory: Persistence({ service: mongoose }),');
	}
	const registration = `\n\t.registerAzureFunctionHttpHandler('${input.entity}-${input.action}', { route: 'api/${input.entity}', methods: ['${method}'], authLevel: 'anonymous' }, restHandlerCreator)`;
	current = current.replace('\t.startUp();', `${registration}\n\t.startUp();`);
	await writeFile(file, current);
	return [{ path: file, contents: current }];
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
	let current = await readFile(file, 'utf8');
	if (current.includes(typeLine.trim())) return written;
	const marker = 'export const mongooseContextBuilder';
	const at = current.indexOf(marker);
	if (at < 0) return written;
	current = `${current.slice(0, at)}${typeLine}\n${current.slice(at)}`;
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

function camel(value: string): string {
	return value.replace(/-([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

function pascal(value: string): string {
	const next = camel(value);
	return next.slice(0, 1).toUpperCase() + next.slice(1);
}

async function exists(file: string): Promise<boolean> {
	try {
		await readFile(file);
		return true;
	} catch {
		return false;
	}
}
