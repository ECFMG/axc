import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { type CellixLintConfig, defaultCellixLintConfig } from './config.js';

const HELPER_FILE = /(?:^|\/)(?:helpers?|utils?|common|shared|misc)\.[cm]?tsx?$/;
const KEBAB_BASENAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface ActiveLint {
	hostFunctions: readonly string[];
	apiComposition: string;
	domainPath: string;
	domainBans: RegExp[];
	applicationBans: RegExp[];
	persistenceBans: RegExp[];
	modelBans: RegExp[];
	transportBans: RegExp[];
	serviceMongooseBans: RegExp[];
}

let active: ActiveLint = {
	hostFunctions: ['buildApplicationServicesFactory', 'resolveEnvironment'],
	apiComposition: 'apps/api/src/index.ts',
	domainPath: 'packages/axc/domain',
	domainBans: [],
	applicationBans: [],
	persistenceBans: [],
	modelBans: [],
	transportBans: [],
	serviceMongooseBans: [],
};

function activate(lint: CellixLintConfig): ActiveLint {
	const scope = escapeRegExp(lint.scope);
	const scoped = (names: string[]) => new RegExp(`^${scope}/(?:${names.join('|')})(?:/|$)`);
	return {
		hostFunctions: lint.hostFunctions,
		apiComposition: lint.apiComposition,
		domainPath: lint.layers.domain.replace(/\/src$/, ''),
		domainBans: [/^(?:mongoose|mongodb|graphql|hono)$/, /^@azure\//, /^@cellix\/mongoose-seedwork(?:\/|$)/, scoped(['rest', 'persistence', 'service-mongoose', 'application-services', 'data-sources-mongoose-models', 'graphql'])],
		applicationBans: [/^(?:mongoose|mongodb|graphql|hono)$/, /^@azure\//, /^@cellix\/mongoose-seedwork(?:\/|$)/, scoped(['rest', 'service-mongoose', 'data-sources-mongoose-models', 'graphql'])],
		persistenceBans: [scoped(['application-services', 'graphql', 'rest']), /^(?:hono|graphql)$/],
		modelBans: [scoped(['domain', 'persistence', 'application-services', 'graphql', 'rest']), /^(?:hono|graphql)$/],
		transportBans: [/^(?:mongoose|mongodb)$/, /^@cellix\/mongoose-seedwork(?:\/|$)/, scoped(['persistence', 'service-mongoose', 'data-sources-mongoose-models'])],
		serviceMongooseBans: [scoped(['domain', 'application-services', 'graphql', 'rest']), /^(?:hono|graphql)$/],
	};
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function checkCellixStructure(input: { root: string; lint?: CellixLintConfig }): Promise<string[]> {
	readCache.clear();
	const lint = input.lint ?? defaultCellixLintConfig();
	active = activate(lint);
	const root = input.root;
	const violations: string[] = [];

	const domainFiles = await listTypeScript(path.join(root, lint.layers.domain));
	const applicationFiles = await listTypeScript(path.join(root, lint.layers.applicationServices));
	const persistenceFiles = await listTypeScript(path.join(root, lint.layers.persistence));
	const modelFiles = await listTypeScript(path.join(root, lint.layers.models));
	const serviceMongooseFiles = await listTypeScript(path.join(root, lint.layers.serviceMongoose));
	const restFiles = await listTypeScript(path.join(root, lint.layers.rest));
	const graphqlFiles = await listSource(path.join(root, lint.layers.graphql), ['.ts', '.graphql']);

	violations.push(...checkDomain(domainFiles));
	violations.push(...checkApplicationServices(applicationFiles));
	violations.push(...checkPersistence(persistenceFiles, domainFiles));
	violations.push(...checkModels([...modelFiles, ...serviceMongooseFiles.filter((file) => file.endsWith('.model.ts'))], domainFiles));
	violations.push(...checkServiceMongoose(serviceMongooseFiles));
	violations.push(...checkTransport(restFiles, 'rest'));
	violations.push(...checkGraphql(graphqlFiles));
	violations.push(...checkCrossPackageNames(applicationFiles, domainFiles));
	violations.push(...(await checkApiComposition(root)));

	return violations;
}

function checkDomain(files: string[]): string[] {
	const violations: string[] = [];
	const packageSrc = packageSrcOf(files);

	for (const file of files) {
		if (isTestFile(file)) {
			violations.push(...banImports(file, readSyncSafe(file), active.domainBans, 'cellix/domain-no-infrastructure'));
			continue;
		}

		const relative = relativePosix(file, packageSrc);
		const content = readSyncSafe(file);
		violations.push(...banHelperFile(file));
		violations.push(...banImports(file, content, active.domainBans, 'cellix/domain-no-infrastructure'));
		violations.push(...banRelativeEscape(file, content, packageSrc, 'cellix/domain-no-infrastructure'));

		if (relative.endsWith('/index.ts') || relative === 'index.ts') {
			violations.push(...banExecutable(file, content, 'cellix/domain-barrel', 'Domain barrels re-export types and constructors only'));
			continue;
		}

		if (relative.endsWith('.aggregate.ts')) {
			violations.push(...checkAggregate(file, content));
			continue;
		}
		if (relative.endsWith('.entity.ts')) {
			violations.push(...checkEntity(file, content));
			continue;
		}
		if (relative.endsWith('.value-objects.ts')) {
			violations.push(...checkValueObjects(file, content));
			continue;
		}
		if (relative.endsWith('.repository.ts')) {
			violations.push(...checkDomainRepository(file, content));
			continue;
		}
		if (relative.endsWith('.uow.ts')) {
			violations.push(...checkDomainUnitOfWork(file, content));
			continue;
		}
		if (relative.endsWith('.visa.ts') || relative.endsWith('/passport.ts') || relative === 'passport.ts' || relative.endsWith('permissions.ts')) {
			violations.push(...checkDomainAuthorization(file, content, relative));
			continue;
		}
		if (relative.endsWith('.event.ts')) {
			violations.push(...checkDomainEvent(file, content));
			continue;
		}

		violations.push(report(file, 'cellix/domain-file-role', path.basename(file), '*.aggregate.ts, *.entity.ts, *.value-objects.ts, *.repository.ts, *.uow.ts, *.visa.ts, passport.ts, *permissions.ts, *.event.ts, or index.ts'));
	}

	return violations;
}

function checkAggregate(file: string, content: string): string[] {
	const violations: string[] = [];
	if (!/extends\s+(?:DomainSeedwork\.)?AggregateRoot</.test(content)) {
		violations.push(report(file, 'cellix/aggregate-extends', 'missing AggregateRoot base', 'export class <Name> extends AggregateRoot<Props, Passport>'));
	}
	if (!/from\s+['"]@cellix\/domain-seedwork\/aggregate-root['"]/.test(content)) {
		violations.push(report(file, 'cellix/aggregate-import', 'missing aggregate-root import', "import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root'"));
	}
	if (!/export\s+interface\s+\w+Props\b/.test(content)) {
		violations.push(report(file, 'cellix/aggregate-props', 'missing Props interface', 'export interface <Name>Props'));
	}
	if (!/export\s+interface\s+\w+EntityReference\b/.test(content)) {
		violations.push(report(file, 'cellix/aggregate-reference', 'missing EntityReference interface', 'export interface <Name>EntityReference'));
	}
	if (!/static\s+getNewInstance\b/.test(content)) {
		violations.push(report(file, 'cellix/aggregate-factory', 'missing static getNewInstance', 'public static getNewInstance(...)'));
	}
	if (!/private\s+markAsNew\s*\(/.test(content) || !/\.markAsNew\s*\(/.test(content) || !/this\.isNew\s*=\s*true/.test(content)) {
		violations.push(report(file, 'cellix/aggregate-mark-as-new', 'getNewInstance does not call markAsNew', 'private markAsNew(): void { this.isNew = true }'));
	}
	if (!/\bPassport\b/.test(content) || !/\b\w*Visa\b/.test(content)) {
		violations.push(report(file, 'cellix/aggregate-auth-hooks', 'missing Passport or Visa', 'import Passport and a Visa type, matching Cellix aggregates'));
	}
	violations.push(...banTopLevelFunctions(file, content, 'cellix/aggregate-no-helper'));
	if (/^export\s+const\s+/m.test(content)) {
		violations.push(report(file, 'cellix/aggregate-no-helper', 'top-level export const', 'behavior lives on the aggregate class'));
	}
	if (/set\s+\w+\([^)]*:\s*string\s*\)/.test(content) && !/new\s+ValueObjects\./.test(content)) {
		violations.push(report(file, 'cellix/aggregate-value-object', 'string setter assigns a raw string', 'this.props.<field> = new ValueObjects.<Type>(value).valueOf()'));
	}
	if (/^\s+\w+\??:\s*\{/m.test(content)) {
		violations.push(report(file, 'cellix/aggregate-nested-type', 'inline object type', 'a named Props type implemented by a ValueObject or Entity class'));
	}
	return violations;
}

function checkEntity(file: string, content: string): string[] {
	const violations: string[] = [];
	if (!/extends\s+(?:DomainSeedwork\.)?(?:DomainEntity|ValueObject)</.test(content)) {
		violations.push(report(file, 'cellix/entity-extends', 'missing DomainEntity or ValueObject base', 'export class <Name> extends DomainEntity<Props> or ValueObject<Props>'));
	}
	if (!/export\s+interface\s+\w+Props\b/.test(content) || !/export\s+interface\s+\w+(?:EntityReference|Reference)\b/.test(content)) {
		violations.push(report(file, 'cellix/entity-shape', 'missing Props or reference interface', 'export interface <Name>Props and export interface <Name>EntityReference'));
	}
	violations.push(...banTopLevelFunctions(file, content, 'cellix/entity-no-helper'));
	if (/set\s+\w+\([^)]*:\s*string\s*\)/.test(content) && !/new\s+ValueObjects\./.test(content)) {
		violations.push(report(file, 'cellix/entity-value-object', 'string setter assigns a raw string', 'this.props.<field> = new ValueObjects.<Type>(value).valueOf()'));
	}
	if (/^\s+\w+\??:\s*\{/m.test(content)) {
		violations.push(report(file, 'cellix/entity-nested-type', 'inline object type', 'a named Props type implemented by a ValueObject or Entity class'));
	}
	return violations;
}

function checkValueObjects(file: string, content: string): string[] {
	const violations: string[] = [];
	if (!/from\s+['"]@lucaspaganini\/value-objects['"]/.test(content)) {
		violations.push(report(file, 'cellix/value-object-library', 'missing value-objects import', "import { VOString } from '@lucaspaganini/value-objects'"));
	}
	violations.push(...banTopLevelFunctions(file, content, 'cellix/value-object-no-helper'));
	for (const match of content.matchAll(/^export\s+class\s+(\w+)(?:\s+extends\s+([A-Za-z0-9_]+))?/gm)) {
		const base = match[2];
		if (!base) {
			violations.push(report(file, 'cellix/value-object-extends', `class ${match[1]} has no base`, 'VOString, VOArray, VOOptional, or a local class that extends one of those'));
			continue;
		}
		if (!/^VO(?:String|Array|Optional|Float|Integer|Boolean|Date)$/.test(base) && !new RegExp(`class\\s+${base}\\b`).test(content)) {
			violations.push(report(file, 'cellix/value-object-extends', `class ${match[1]} extends ${base}`, 'VOString, VOArray, VOOptional, or a local class that extends one of those'));
		}
	}
	if (!/export\s+class\s+/.test(content)) {
		violations.push(report(file, 'cellix/value-object-class', 'no value object class', 'export class <Name> extends VOString(...) {}'));
	}
	for (const match of content.matchAll(/^export\s+const\s+(\w+)\s*=/gm)) {
		const start = match.index ?? 0;
		const slice = content.slice(start, start + 400);
		if (!/as\s+const/.test(slice)) {
			violations.push(report(file, 'cellix/value-object-const', `export const ${match[1]}`, 'export const <Name> = { ... } as const'));
		}
	}
	return violations;
}

function checkDomainRepository(file: string, content: string): string[] {
	const violations: string[] = [];
	const stem = path.basename(file, '.repository.ts');
	const expected = `${kebabToPascal(stem)}Repository`;
	if (!new RegExp(`export\\s+interface\\s+${expected}\\b`).test(content)) {
		violations.push(report(file, 'cellix/domain-repository-name', `missing ${expected}`, `export interface ${expected}<Props> extends Repository<...>`));
	}
	if (!/extends\s+(?:DomainSeedwork\.)?Repository</.test(content)) {
		violations.push(report(file, 'cellix/domain-repository-extends', 'missing Repository base', 'extends Repository<T> from @cellix/domain-seedwork/repository'));
	}
	if (/export\s+class\s+/.test(content) || /^export\s+function\s+/m.test(content) || /^export\s+const\s+/m.test(content)) {
		violations.push(report(file, 'cellix/domain-repository-interface', 'concrete export', 'domain repositories export interfaces only'));
	}
	return violations;
}

function checkDomainUnitOfWork(file: string, content: string): string[] {
	const violations: string[] = [];
	const stem = path.basename(file, '.uow.ts');
	const expected = `${kebabToPascal(stem)}UnitOfWork`;
	if (!new RegExp(`export\\s+interface\\s+${expected}\\b`).test(content)) {
		violations.push(report(file, 'cellix/domain-uow-name', `missing ${expected}`, `export interface ${expected}`));
	}
	if (!/extends\s+(?:DomainSeedwork\.)?UnitOfWork</.test(content) || !/InitializedUnitOfWork</.test(content)) {
		violations.push(report(file, 'cellix/domain-uow-extends', 'missing UnitOfWork bases', 'extends UnitOfWork<...> and InitializedUnitOfWork<...>'));
	}
	if (!/\.repository(?:\.ts)?['"]/.test(content)) {
		violations.push(report(file, 'cellix/domain-uow-repository', 'missing repository import', 'import the sibling .repository type'));
	}
	if (/export\s+class\s+/.test(content)) {
		violations.push(report(file, 'cellix/domain-uow-interface', 'concrete class', 'domain unit-of-work files export interfaces only'));
	}
	violations.push(...banTopLevelFunctions(file, content, 'cellix/domain-uow-no-helper'));
	return violations;
}

function checkDomainAuthorization(file: string, content: string, relative: string): string[] {
	const violations: string[] = [];
	violations.push(...banTopLevelFunctions(file, content, 'cellix/domain-auth-no-helper'));
	if (relative.endsWith('.visa.ts')) {
		if (!/export\s+interface\s+\w*Visa\b/.test(content) || !/extends\s+[A-Za-z0-9_.]*Visa\b/.test(content)) {
			violations.push(report(file, 'cellix/visa-interface', 'missing Visa interface', 'export interface <Name>Visa extends <Passport>Visa'));
		}
		if (!/permissions/.test(content)) {
			violations.push(report(file, 'cellix/visa-permissions', 'missing permissions import', 'import the context permissions type'));
		}
	}
	if (/export\s+class\s+/.test(content)) {
		violations.push(report(file, 'cellix/domain-auth-interface', 'concrete class', 'passport, visa, and permissions files export types and interfaces'));
	}
	return violations;
}

function checkDomainEvent(file: string, content: string): string[] {
	const violations: string[] = [];
	const stem = path.basename(file, '.event.ts');
	const expected = kebabToPascal(stem);
	if (!new RegExp(`export\\s+class\\s+${expected}\\b`).test(content)) {
		violations.push(report(file, 'cellix/domain-event-name', `missing class ${expected}`, `export class ${expected}`));
	}
	violations.push(...banTopLevelFunctions(file, content, 'cellix/domain-event-no-helper'));
	return violations;
}

function checkApplicationServices(files: string[]): string[] {
	const violations: string[] = [];
	const packageSrc = packageSrcOf(files);

	for (const file of files) {
		if (isTestFile(file)) {
			violations.push(...banImports(file, readSyncSafe(file), active.applicationBans, 'cellix/application-no-infrastructure'));
			continue;
		}

		const relative = relativePosix(file, packageSrc);
		const content = readSyncSafe(file);
		violations.push(...banHelperFile(file));
		violations.push(...banImports(file, content, active.applicationBans, 'cellix/application-no-infrastructure'));
		violations.push(...banRelativeEscape(file, content, packageSrc, 'cellix/application-no-infrastructure'));

		if (relative === 'index.ts') {
			violations.push(...checkApplicationHost(file, content));
			continue;
		}

		if (!relative.startsWith('contexts/')) {
			violations.push(report(file, 'cellix/application-file-role', relative, 'src/index.ts or src/contexts/<context>/<action>.ts'));
			continue;
		}

		if (relative.endsWith('/index.ts')) {
			violations.push(...checkApplicationContextIndex(file, content));
			continue;
		}

		violations.push(...checkApplicationAction(file, content));
	}

	const present = new Set(files.map((file) => path.normalize(file)));
	const actionDirectories = new Set(files.filter((file) => !isTestFile(file) && relativePosix(file, packageSrc).startsWith('contexts/') && path.basename(file) !== 'index.ts').map((file) => path.dirname(file)));
	for (const directory of actionDirectories) {
		const indexFile = path.join(directory, 'index.ts');
		if (!present.has(path.normalize(indexFile))) {
			violations.push(report(indexFile, 'cellix/application-context-index', 'missing context index.ts', 'export interface <Name>ApplicationService and export const <Name> = (dataSources: DataSources) => ({ ... })'));
		}
	}

	return violations;
}

function checkApplicationHost(file: string, content: string): string[] {
	const violations: string[] = [];
	if (!/export\s+interface\s+ApplicationServices\b/.test(content)) {
		violations.push(report(file, 'cellix/application-host', 'missing ApplicationServices', 'export interface ApplicationServices'));
	}
	if (/export\s+class\s+/.test(content)) {
		violations.push(report(file, 'cellix/application-host-no-class', 'export class', 'wire context factories from export function buildApplicationServicesFactory'));
	}
	for (const match of content.matchAll(/^export\s+function\s+(\w+)/gm)) {
		const name = match[1] ?? '';
		if (!active.hostFunctions.includes(name)) {
			violations.push(report(file, 'cellix/application-host-function', `export function ${name}`, 'a context action file: contexts/<context>/<kebab-name>.ts exporting a const factory'));
		}
	}
	return violations;
}

function checkApplicationContextIndex(file: string, content: string): string[] {
	const violations: string[] = [];
	const folder = path.basename(path.dirname(file));
	const pascal = kebabToPascal(folder);
	if (!/export\s+interface\s+\w+(?:ApplicationService|Context)\b/.test(content)) {
		violations.push(report(file, 'cellix/application-context-interface', 'missing service interface', `export interface ${pascal}ApplicationService`));
	}
	if (!new RegExp(`export\\s+const\\s+${pascal}\\s*=`).test(content)) {
		violations.push(report(file, 'cellix/application-context-factory', `missing export const ${pascal}`, `export const ${pascal} = (dataSources: DataSources, ...ports) => ({ ... })`));
	}
	if (!/dataSources:\s*DataSources/.test(content)) {
		violations.push(report(file, 'cellix/application-context-datasources', 'factory does not take DataSources', '(dataSources: DataSources, ...ports)'));
	}
	if (/withScopedTransaction|readonlyDataSource/.test(content)) {
		violations.push(report(file, 'cellix/application-context-no-behavior', 'transaction or read-model call in the context index', 'call withScopedTransaction or readonlyDataSource inside the action file'));
	}
	const consts = [...content.matchAll(/^export\s+const\s+(\w+)/gm)].map((match) => match[1]);
	if (consts.length !== 1) {
		violations.push(report(file, 'cellix/application-context-single-factory', consts.join(', ') || 'no const export', `only export const ${pascal}`));
	}
	violations.push(...banTopLevelFunctions(file, content, 'cellix/application-context-no-helper'));
	return violations;
}

function checkApplicationAction(file: string, content: string): string[] {
	const violations: string[] = [];
	const basename = path.basename(file, '.ts');
	if (!KEBAB_BASENAME.test(basename)) {
		violations.push(report(file, 'cellix/application-action-filename', basename, 'kebab-case, for example query-by-id.ts'));
	}
	const camel = kebabToCamel(basename);
	if (!new RegExp(`export\\s+const\\s+${camel}\\s*=`).test(content)) {
		violations.push(report(file, 'cellix/application-action-const', `missing export const ${camel}`, `export const ${camel} = (dataSources: DataSources, ...ports) => async (command) => result`));
	}
	if (!/dataSources:\s*DataSources/.test(content)) {
		violations.push(report(file, 'cellix/application-action-datasources', 'missing DataSources parameter', '(dataSources: DataSources, ...ports) => async (command) => result'));
	}
	if (!/async\s*\(/.test(content) && !/async\s+\(/.test(content)) {
		violations.push(report(file, 'cellix/application-action-async', 'factory does not return an async command function', '(dataSources: DataSources) => async (command) => result'));
	}
	if (/export\s+class\s+/.test(content)) {
		violations.push(report(file, 'cellix/application-action-no-class', 'export class', 'a const factory, not a class with execute()'));
	}
	violations.push(...banTopLevelFunctions(file, content, 'cellix/application-action-no-helper'));

	const consts = [...content.matchAll(/^export\s+const\s+(\w+)/gm)].map((match) => match[1]);
	if (consts.length !== 1 || consts[0] !== camel) {
		violations.push(report(file, 'cellix/application-action-single-const', consts.join(', ') || 'no const', `only export const ${camel}`));
	}
	for (const match of content.matchAll(/^export\s+(?:interface|type)\s+(\w+)/gm)) {
		const name = match[1] ?? '';
		if (!/(?:Command|Input|Result)$/.test(name)) {
			violations.push(report(file, 'cellix/application-action-type', name, 'a Command, Input, or Result type next to the action const'));
		}
	}
	if (/^(?:create|update|delete)(?:[A-Z]|$)/.test(camel) && !/withScopedTransaction/.test(content)) {
		violations.push(report(file, 'cellix/application-mutation', `${camel} does not open a transaction`, 'domainDataSource.<context>.<entity>.<UnitOfWork>.withScopedTransaction(...)'));
	}
	if (/^(?:query|get|find)(?:[A-Z]|$)/.test(camel) && !/readonlyDataSource/.test(content)) {
		violations.push(report(file, 'cellix/application-query', `${camel} does not use the read model`, 'dataSources.readonlyDataSource...'));
	}
	return violations;
}

function checkPersistence(files: string[], domainFiles: string[]): string[] {
	const violations: string[] = [];
	const packageSrc = packageSrcOf(files);
	const domainRepositories = new Set(domainFiles.filter((file) => file.endsWith('.repository.ts')).map((file) => path.basename(file)));

	for (const file of files) {
		if (isTestFile(file)) {
			violations.push(...banImports(file, readSyncSafe(file), active.persistenceBans, 'cellix/persistence-boundary'));
			continue;
		}
		const relative = relativePosix(file, packageSrc);
		const content = readSyncSafe(file);
		violations.push(...banHelperFile(file));
		violations.push(...banImports(file, content, active.persistenceBans, 'cellix/persistence-boundary'));

		if (relative === 'index.ts' || relative.endsWith('/index.ts')) {
			violations.push(...banTopLevelFunctions(file, content, 'cellix/persistence-barrel'));
			if (/export\s+class\s+/.test(content)) {
				violations.push(report(file, 'cellix/persistence-barrel', 'export class in a barrel', 'classes live in *.repository.ts, *.domain-adapter.ts, or *.uow.ts'));
			}
			continue;
		}
		if (relative.includes('datasources/domain/') && relative.endsWith('.repository.ts')) {
			violations.push(...checkPersistenceRepository(file, content, domainRepositories));
			continue;
		}
		if (relative.includes('datasources/domain/') && relative.endsWith('.domain-adapter.ts')) {
			violations.push(...checkPersistenceAdapter(file, content));
			continue;
		}
		if (relative.includes('datasources/domain/') && relative.endsWith('.uow.ts')) {
			violations.push(...checkPersistenceUnitOfWork(file, content));
			continue;
		}
		if (relative.includes('datasources/readonly/') && relative.endsWith('.ts')) {
			if (!/MongoDataSourceImpl/.test(content)) {
				violations.push(report(file, 'cellix/persistence-readonly', 'missing MongoDataSourceImpl', 'export class <Name> extends MongoDataSourceImpl'));
			}
			violations.push(...banTopLevelFunctions(file, content, 'cellix/persistence-readonly-no-helper'));
			continue;
		}

		violations.push(report(file, 'cellix/persistence-file-role', relative, 'datasources/domain/<context>/<entity>/*.(repository|domain-adapter|uow).ts, datasources/readonly/**, or index.ts'));
	}

	return violations;
}

function checkPersistenceRepository(file: string, content: string, domainRepositories: Set<string>): string[] {
	const violations: string[] = [];
	const basename = path.basename(file);
	const stem = path.basename(file, '.repository.ts');
	const expected = `${kebabToPascal(stem)}Repository`;
	if (!domainRepositories.has(basename)) {
		violations.push(report(file, 'cellix/persistence-repository-contract', `no domain ${basename}`, `${active.domainPath}/**/${basename} exporting interface ${expected}`));
	}
	if (!new RegExp(`export\\s+class\\s+${expected}\\b`).test(content)) {
		violations.push(report(file, 'cellix/persistence-repository-name', `missing class ${expected}`, `export class ${expected} extends MongoRepositoryBase implements ${expected}`));
	}
	if (!/extends\s+(?:MongooseSeedwork\.)?MongoRepositoryBase</.test(content)) {
		violations.push(report(file, 'cellix/persistence-repository-base', 'missing MongoRepositoryBase', 'extends MongooseSeedwork.MongoRepositoryBase<...>'));
	}
	if (!new RegExp(`implements\\s+[\\s\\S]*\\b${expected}\\b`).test(content)) {
		violations.push(report(file, 'cellix/persistence-repository-implements', `class does not implement ${expected}`, `implements <domain>.${expected}`));
	}
	violations.push(...banTopLevelFunctions(file, content, 'cellix/persistence-repository-no-helper'));
	return violations;
}

function checkPersistenceAdapter(file: string, content: string): string[] {
	const violations: string[] = [];
	const stem = path.basename(file, '.domain-adapter.ts');
	const pascal = kebabToPascal(stem);
	if (!new RegExp(`export\\s+class\\s+${pascal}DomainAdapter\\b`).test(content)) {
		violations.push(report(file, 'cellix/persistence-adapter-name', `missing ${pascal}DomainAdapter`, `export class ${pascal}DomainAdapter extends MongooseSeedwork.MongooseDomainAdapter`));
	}
	if (!new RegExp(`export\\s+class\\s+${pascal}Converter\\b`).test(content)) {
		violations.push(report(file, 'cellix/persistence-converter-name', `missing ${pascal}Converter`, `export class ${pascal}Converter extends MongooseSeedwork.MongoTypeConverter`));
	}
	if (!/MongooseDomainAdapter/.test(content) || !/MongoTypeConverter/.test(content)) {
		violations.push(report(file, 'cellix/persistence-adapter-bases', 'missing adapter bases', 'MongooseDomainAdapter and MongoTypeConverter'));
	}
	violations.push(...banTopLevelFunctions(file, content, 'cellix/persistence-adapter-no-helper'));
	return violations;
}

function checkPersistenceUnitOfWork(file: string, content: string): string[] {
	const violations: string[] = [];
	const stem = path.basename(file, '.uow.ts');
	const factory = `get${kebabToPascal(stem)}UnitOfWork`;
	if (!/MongoUnitOfWork/.test(content)) {
		violations.push(report(file, 'cellix/persistence-uow-base', 'missing MongoUnitOfWork', 'new MongooseSeedwork.MongoUnitOfWork(...)'));
	}
	if (!/InProcEventBusInstance/.test(content) || !/NodeEventBusInstance/.test(content)) {
		violations.push(report(file, 'cellix/persistence-uow-buses', 'missing event bus wiring', 'InProcEventBusInstance and NodeEventBusInstance'));
	}
	if (!new RegExp(`export\\s+const\\s+${factory}\\s*=`).test(content)) {
		violations.push(report(file, 'cellix/persistence-uow-factory', `missing ${factory}`, `export const ${factory} = (...) => ...`));
	}
	if (/export\s+class\s+/.test(content)) {
		violations.push(report(file, 'cellix/persistence-uow-no-class', 'export class', `export const ${factory}`));
	}
	violations.push(...banTopLevelFunctions(file, content, 'cellix/persistence-uow-no-helper'));
	return violations;
}

function checkModels(files: string[], domainFiles: string[]): string[] {
	const violations: string[] = [];
	const domainStems = new Set(domainFiles.filter((file) => file.endsWith('.aggregate.ts') || file.endsWith('.entity.ts')).map((file) => path.basename(file).replace(/\.(aggregate|entity)\.ts$/, '')));

	for (const file of files) {
		if (isTestFile(file)) continue;
		const content = readSyncSafe(file);
		const posix = toPosix(file);
		violations.push(...banHelperFile(file));
		violations.push(...banImports(file, content, active.modelBans, 'cellix/model-boundary'));
		if (!/\/models\/[^/]+\/[^/]+\.model\.ts$/.test(posix)) {
			violations.push(report(file, 'cellix/model-path', posix, 'models/<entity>/<entity>.model.ts'));
		}
		const stem = path.basename(file, '.model.ts');
		const dir = path.basename(path.dirname(file));
		if (dir !== stem) {
			violations.push(report(file, 'cellix/model-directory', `${dir}/${stem}.model.ts`, `models/${stem}/${stem}.model.ts`));
		}
		if (!KEBAB_BASENAME.test(stem)) {
			violations.push(report(file, 'cellix/model-filename', stem, 'kebab-case entity name'));
		}
		const pascal = kebabToPascal(stem);
		for (const suffix of ['ModelFactory', 'ModelName'] as const) {
			if (!new RegExp(`export\\s+const\\s+${pascal}${suffix}\\b`).test(content)) {
				violations.push(report(file, 'cellix/model-exports', `missing ${pascal}${suffix}`, `export const ${pascal}${suffix}`));
			}
		}
		if (!new RegExp(`export\\s+type\\s+${pascal}ModelType\\b`).test(content)) {
			violations.push(report(file, 'cellix/model-exports', `missing ${pascal}ModelType`, `export type ${pascal}ModelType`));
		}
		if (!domainStems.has(stem)) {
			violations.push(report(file, 'cellix/model-domain-name', `no domain ${stem}.aggregate.ts or ${stem}.entity.ts`, 'the same kebab-case stem as the domain type'));
		}
		violations.push(...banTopLevelFunctions(file, content, 'cellix/model-no-helper'));
	}

	return violations;
}

function checkServiceMongoose(files: string[]): string[] {
	const violations: string[] = [];
	const packageSrc = packageSrcOf(files);
	for (const file of files) {
		if (isTestFile(file) || file.endsWith('.model.ts')) continue;
		const relative = relativePosix(file, packageSrc);
		const content = readSyncSafe(file);
		violations.push(...banHelperFile(file));
		violations.push(...banImports(file, content, active.serviceMongooseBans, 'cellix/service-mongoose-boundary'));
		if (relative !== 'index.ts') {
			violations.push(report(file, 'cellix/service-mongoose-file-role', relative, 'src/index.ts for the Mongo runtime, or models/<entity>/<entity>.model.ts'));
		}
	}
	return violations;
}

function checkTransport(files: string[], kind: 'rest' | 'graphql'): string[] {
	const violations: string[] = [];
	const packageSrc = packageSrcOf(files);
	for (const file of files) {
		if (!file.endsWith('.ts') || isTestFile(file)) {
			if (file.endsWith('.ts')) violations.push(...banImports(file, readSyncSafe(file), active.transportBans, 'cellix/transport-boundary'));
			continue;
		}
		const content = readSyncSafe(file);
		violations.push(...banHelperFile(file));
		violations.push(...banImports(file, content, active.transportBans, 'cellix/transport-boundary'));
		violations.push(...banRelativeEscape(file, content, packageSrc, 'cellix/transport-boundary'));
		if (/withScopedTransaction|readonlyDataSource|MongoRepositoryBase|mongoose\(/.test(content)) {
			violations.push(report(file, 'cellix/transport-no-persistence', 'persistence or transaction call', `${kind} calls applicationServices only`));
		}
		if (!/applicationServices/.test(content)) {
			violations.push(report(file, 'cellix/transport-application-services', 'no applicationServices reference', 'call the application service from the transport adapter'));
		}
		if (/export\s+class\s+/.test(content)) {
			violations.push(report(file, 'cellix/transport-no-class', 'export class', 'functions that delegate to applicationServices'));
		}
		const basename = path.basename(file, '.ts').replace(/\.resolvers$/, '');
		if (basename !== 'index' && !KEBAB_BASENAME.test(basename)) {
			violations.push(report(file, 'cellix/transport-filename', basename, 'kebab-case or index.ts'));
		}
	}
	return violations;
}

function checkGraphql(files: string[]): string[] {
	const violations: string[] = [];
	const typeScriptFiles = files.filter((file) => file.endsWith('.ts'));
	const resolvers = typeScriptFiles.filter((file) => file.endsWith('.resolvers.ts'));
	for (const file of typeScriptFiles) {
		if (resolvers.includes(file)) continue;
		violations.push(...banImports(file, readSyncSafe(file), active.transportBans, 'cellix/transport-boundary'));
	}
	const schemas = files.filter((file) => file.endsWith('.graphql'));
	const other = typeScriptFiles.filter((file) => !file.endsWith('.resolvers.ts') && !isTestFile(file) && !toPosix(file).includes('/builder/') && path.basename(file) !== 'index.ts' && path.basename(file) !== 'context.ts');

	violations.push(...checkTransport(resolvers, 'graphql'));

	for (const file of other) {
		const base = path.basename(file);
		if (base === 'generated.ts' || base.endsWith('.generated.ts')) continue;
		violations.push(report(file, 'cellix/graphql-file-role', base, '*.resolvers.ts, *.graphql, context.ts, index.ts, or schema/builder/generated.ts'));
	}

	for (const file of resolvers) {
		const content = readSyncSafe(file);
		if (!/export\s+default\s+/.test(content)) {
			violations.push(report(file, 'cellix/graphql-default-export', 'missing default export', 'export default <name> where the object is typed as Resolvers'));
		}
		if (!/:\s*Resolvers\b/.test(content)) {
			violations.push(report(file, 'cellix/graphql-resolvers-type', 'object is not typed as Resolvers', 'const <name>: Resolvers = { Query, Mutation }'));
		}
		if (/context\s*[,)]/.test(content) && !/context:\s*GraphContext/.test(content)) {
			violations.push(report(file, 'cellix/graphql-context', 'context is not GraphContext', 'context: GraphContext'));
		}
		if (!/async\s*\(/.test(content)) {
			violations.push(report(file, 'cellix/graphql-async', 'resolver is not async', 'async (_parent, args, context: GraphContext)'));
		}
		if (/^(?:export\s+)?(?:interface|type|class|enum|function)\s+/m.test(content) || /^export\s+const\s+/m.test(content)) {
			violations.push(report(file, 'cellix/graphql-no-local-types', 'local type, class, or named export', 'import command types and call context.applicationServices'));
		}
		if (/from\s+['"][^'"]+\.(?:repository|uow|entity|aggregate)(?:\.ts)?['"]/.test(content)) {
			violations.push(report(file, 'cellix/graphql-no-domain-internals', 'import of a domain role file', 'application service command types only'));
		}
	}

	const resolverStems = new Set(resolvers.map((file) => path.basename(file, '.resolvers.ts')));
	const schemaStems = new Set(schemas.map((file) => path.basename(file, '.graphql')));
	for (const stem of resolverStems) {
		if (!schemaStems.has(stem)) violations.push(report(`graphql/${stem}.resolvers.ts`, 'cellix/graphql-sibling-schema', 'no sibling schema', `${stem}.graphql beside ${stem}.resolvers.ts`));
	}
	for (const file of schemas) {
		const stem = path.basename(file, '.graphql');
		if (!KEBAB_BASENAME.test(stem)) violations.push(report(file, 'cellix/graphql-schema-filename', stem, 'lower-kebab-case'));
		if (!resolverStems.has(stem)) violations.push(report(file, 'cellix/graphql-sibling-resolver', 'no sibling resolver', `${stem}.resolvers.ts`));
		const content = readSyncSafe(file);
		for (const match of content.matchAll(/^input\s+(\w+)/gm)) {
			const name = match[1] ?? '';
			if (!name.endsWith('Input')) violations.push(report(file, 'cellix/graphql-input-name', `input ${name}`, `${name}Input`));
		}
		const mutationBody = content.match(/(?:extend\s+)?type\s+Mutation\s*\{([^}]*)\}/);
		if (mutationBody?.[1]) {
			for (const field of mutationBody[1].matchAll(/^\s*(\w+)\s*(?:\([^)]*\))?\s*:\s*([^\n!]+)/gm)) {
				const returnType = (field[2] ?? '').trim();
				if (!returnType.includes('MutationResult')) {
					violations.push(report(file, 'cellix/graphql-mutation-result', `${field[1]}: ${returnType}`, 'a type whose name contains MutationResult'));
				}
			}
		}
	}

	return violations;
}

function checkCrossPackageNames(applicationFiles: string[], domainFiles: string[]): string[] {
	const violations: string[] = [];
	if (domainFiles.length === 0) return violations;
	const domainDirs = new Set(domainFiles.flatMap((file) => toPosix(file).split('/').slice(0, -1)));
	const domainDirNames = new Set([...domainDirs].flatMap((dir) => dir.split('/')));

	for (const file of applicationFiles) {
		const posix = toPosix(file);
		const marker = '/contexts/';
		const index = posix.indexOf(marker);
		if (index === -1 || isTestFile(file)) continue;
		const parts = posix.slice(index + marker.length).split('/');
		const entityFolder = parts.length >= 2 ? parts.at(-2) : parts[0];
		if (!entityFolder || entityFolder.endsWith('.ts')) continue;
		if (!domainDirNames.has(entityFolder)) {
			violations.push(report(file, 'cellix/application-domain-name', `no domain directory named ${entityFolder}`, `${active.domainPath}/**/${entityFolder}/`));
		}
	}
	return violations;
}

async function checkApiComposition(root: string): Promise<string[]> {
	const file = path.join(root, active.apiComposition);
	let content: string;
	try {
		content = await readFile(file, 'utf8');
	} catch {
		return [];
	}
	if (/from\s+['"]@cellix\/service-[^'"]+['"]/.test(content)) {
		return [report(file, 'cellix/api-composition', 'direct @cellix/service-* import', 'register infrastructure through the Cellix service registry, not from src/index.ts')];
	}
	return [];
}

function banHelperFile(file: string): string[] {
	if (!HELPER_FILE.test(toPosix(file))) return [];
	return [report(file, 'cellix/no-helper-module', path.basename(file), 'a Cellix role file. Do not add helper, util, common, or shared modules in these layers')];
}

function banTopLevelFunctions(file: string, content: string, rule: string): string[] {
	const names = [...content.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm)].map((match) => match[1]);
	if (names.length === 0) return [];
	return [report(file, rule, names.join(', '), 'no top-level functions. Behavior belongs on the role class, the action const, or the unit-of-work factory')];
}

function banExecutable(file: string, content: string, rule: string, expected: string): string[] {
	if (/^(?:export\s+)?(?:async\s+)?function\s+/m.test(content) || /^export\s+class\s+/m.test(content) || /^export\s+const\s+\w+\s*=\s*(?:async\s*)?\(/m.test(content)) {
		return [report(file, rule, 'executable export', expected)];
	}
	return [];
}

function banImports(file: string, content: string, bans: RegExp[], rule: string): string[] {
	const violations: string[] = [];
	for (const specifier of importSpecifiers(content)) {
		if (bans.some((ban) => ban.test(specifier))) {
			violations.push(report(file, rule, specifier, 'an import allowed for this layer'));
		}
	}
	return violations;
}

function banRelativeEscape(file: string, content: string, packageSrc: string, rule: string): string[] {
	if (!packageSrc) return [];
	const violations: string[] = [];
	for (const specifier of importSpecifiers(content)) {
		if (!specifier.startsWith('.')) continue;
		const resolved = path.normalize(path.join(path.dirname(file), specifier));
		if (!resolved.startsWith(packageSrc)) {
			violations.push(report(file, rule, specifier, 'an import that stays inside this package, or a workspace package export'));
		}
	}
	return violations;
}

function importSpecifiers(content: string): string[] {
	const specifiers: string[] = [];
	const pattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;
	for (const match of content.matchAll(pattern)) {
		const specifier = match[1] ?? match[2] ?? match[3];
		if (specifier) specifiers.push(specifier);
	}
	return specifiers;
}

function packageSrcOf(files: string[]): string {
	const first = files[0];
	if (!first) return '';
	const posix = toPosix(first);
	const marker = '/src/';
	const index = posix.lastIndexOf(marker);
	if (index === -1) return '';
	return first.slice(0, index + marker.length - 1);
}

function relativePosix(file: string, packageSrc: string): string {
	if (!packageSrc) return toPosix(file);
	return toPosix(path.relative(packageSrc, file));
}

function isTestFile(file: string): boolean {
	return file.endsWith('.test.ts') || file.endsWith('.spec.ts');
}

function toPosix(filePath: string): string {
	return filePath.split(path.sep).join('/');
}

function kebabToCamel(value: string): string {
	return value.replace(/-([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

function kebabToPascal(value: string): string {
	const camel = kebabToCamel(value);
	return camel.slice(0, 1).toUpperCase() + camel.slice(1);
}

function readSyncSafe(file: string): string {
	return readCache.get(file) ?? '';
}

const readCache = new Map<string, string>();

async function listTypeScript(directory: string): Promise<string[]> {
	return (await listSource(directory, ['.ts'])).filter((file) => !file.endsWith('.d.ts'));
}

async function listSource(directory: string, extensions: string[]): Promise<string[]> {
	const files = await walk(directory);
	const selected = files.filter((file) => extensions.some((extension) => file.endsWith(extension)));
	await Promise.all(
		selected.map(async (file) => {
			readCache.set(file, await readFile(file, 'utf8'));
		}),
	);
	return selected;
}

async function walk(directory: string): Promise<string[]> {
	let entries: Dirent[];
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw error;
	}
	const nested = await Promise.all(
		entries.map((entry) => {
			const full = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				if (entry.name === 'node_modules' || entry.name === 'dist') return Promise.resolve([]);
				return walk(full);
			}
			return Promise.resolve(entry.isFile() ? [full] : []);
		}),
	);
	return nested.flat();
}

function report(file: string, rule: string, found: string, expected: string): string {
	return `${toPosix(file)}\n  Rule: ${rule}\n  Found: ${found}\n  Expected: ${expected}`;
}
