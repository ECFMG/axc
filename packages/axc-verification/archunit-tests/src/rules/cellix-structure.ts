import { codeOf, isTestFile, type SourceFile } from '../support/workspace.ts';

// Placement rules that make the Cellix convention suites meaningful: those suites select files
// by name (*.aggregate.ts, *.repository.ts, ...), so a construct written under another name
// or folder would silently escape them. Each rule finds the construct by content and requires
// the Cellix file name and location. See .claude/skills/axc-feature for the full layout.

interface PlacementRule {
	construct: RegExp;
	location: RegExp;
	describe: string;
	expected: string;
}

const placementRules: Record<string, readonly PlacementRule[]> = {
	'packages/axc/domain/src/': [
		{
			construct: /extends\s+(?:\w+\.)?AggregateRoot</,
			location: /^packages\/axc\/domain\/src\/domain\/contexts\/[\w-]+\/[\w-]+\/[\w-]+\.aggregate\.ts$/,
			describe: 'aggregate root',
			expected: 'src/domain/contexts/<context>/<aggregate>/<aggregate>.aggregate.ts, extending DomainSeedwork.AggregateRoot',
		},
		{
			construct: /interface\s+\w+\s+extends\s+(?:\w+\.)?Repository</,
			location: /^packages\/axc\/domain\/src\/domain\/contexts\/[\w-]+\/[\w-]+\/[\w-]+\.repository\.ts$/,
			describe: 'repository interface',
			expected: 'src/domain/contexts/<context>/<aggregate>/<aggregate>.repository.ts, extending DomainSeedwork.Repository',
		},
		{
			construct: /extends\s+(?:\w+\.)?(?:Initialized)?UnitOfWork</,
			location: /^packages\/axc\/domain\/src\/domain\/contexts\/[\w-]+\/[\w-]+\/[\w-]+\.uow\.ts$/,
			describe: 'unit of work interface',
			expected: 'src/domain/contexts/<context>/<aggregate>/<aggregate>.uow.ts',
		},
		{
			construct: /extends\s+(?:\w+\.)?Visa</,
			location: /^packages\/axc\/domain\/src\/domain\/contexts\/[\w-]+\/[\w-]+\.visa\.ts$/,
			describe: 'visa',
			expected: 'src/domain/contexts/<context>/<context>.visa.ts, extending PassportSeedwork.Visa',
		},
	],
	'packages/axc/persistence/src/': [
		{
			construct: /extends\s+(?:\w+\.)?MongoRepositoryBase</,
			location: /^packages\/axc\/persistence\/src\/datasources\/domain\/[\w-]+\/[\w-]+\/[\w-]+\.repository\.ts$/,
			describe: 'domain repository implementation',
			expected: 'src/datasources/domain/<context>/<aggregate>/<aggregate>.repository.ts',
		},
		{
			construct: /extends\s+(?:\w+\.)?MongooseDomainAdapter</,
			location: /^packages\/axc\/persistence\/src\/datasources\/domain\/[\w-]+\/[\w-]+\/[\w-]+\.domain-adapter\.ts$/,
			describe: 'domain adapter',
			expected: 'src/datasources/domain/<context>/<aggregate>/<aggregate>.domain-adapter.ts',
		},
		{
			construct: /new\s+(?:\w+\.)?MongoUnitOfWork\(/,
			location: /^packages\/axc\/persistence\/src\/datasources\/domain\/[\w-]+\/[\w-]+\/[\w-]+\.uow\.ts$/,
			describe: 'unit of work implementation',
			expected: 'src/datasources/domain/<context>/<aggregate>/<aggregate>.uow.ts',
		},
		{
			construct: /extends\s+MongoDataSourceImpl</,
			location: /^packages\/axc\/persistence\/src\/datasources\/readonly\/[\w-]+\/[\w-]+\/[\w-]+\.data\.ts$/,
			describe: 'readonly data source',
			expected: 'src/datasources/readonly/<context>/<aggregate>/<aggregate>.data.ts',
		},
	],
	'packages/axc/service-mongoose/src/': [
		{
			construct: /new\s+Schema\s*[<(]|\bmodelFactory\s*[<(]/,
			location: /^packages\/axc\/service-mongoose\/src\/models\/[\w-]+\/[\w-]+\.model\.ts$/,
			describe: 'Mongoose model',
			expected: 'src/models/<name>/<name>.model.ts exporting *ModelFactory, *ModelType and *ModelName',
		},
	],
};

export function placementViolations(files: readonly SourceFile[]): string[] {
	const violations: string[] = [];
	for (const file of files) {
		if (isTestFile(file.path)) {
			continue;
		}
		for (const [prefix, rules] of Object.entries(placementRules)) {
			if (!file.path.startsWith(prefix)) {
				continue;
			}
			for (const rule of rules) {
				if (rule.construct.test(codeOf(file)) && !rule.location.test(file.path)) {
					violations.push(`[${file.path}] Cellix layout: this ${rule.describe} belongs in ${rule.expected}.`);
				}
			}
		}
	}
	return violations;
}

/** The Cellix domain checks match `DomainSeedwork.X` / `PassportSeedwork.X`; the vendored package only has subpath exports, so the domain re-exports them as namespaces. */
export function seedworkNamespaceViolations(files: readonly SourceFile[]): string[] {
	const violations: string[] = [];
	const bareBase = /\bextends\s+(AggregateRoot|DomainEntity|ValueObject|Repository|UnitOfWork|InitializedUnitOfWork|Visa)</g;
	for (const file of files) {
		if (isTestFile(file.path) || !file.path.startsWith('packages/axc/domain/src/domain/contexts/')) {
			continue;
		}
		for (const match of codeOf(file).matchAll(bareBase)) {
			const namespace = match[1] === 'Visa' ? 'PassportSeedwork' : 'DomainSeedwork';
			violations.push(`[${file.path}] Write 'extends ${namespace}.${match[1]}<' (import { ${namespace} } from the domain's seedwork barrel) so the Cellix domain conventions can verify it.`);
		}
	}
	return violations;
}

/** Use cases live in Cellix contexts folders; only the package index (factory, ApiContext, ApplicationServices) sits at the root. */
export function applicationServicesLayoutViolations(files: readonly SourceFile[]): string[] {
	return files
		.filter((file) => !isTestFile(file.path))
		.filter((file) => !/^packages\/axc\/application-services\/src\/(index\.ts|contexts\/.+\.ts)$/.test(file.path))
		.map(
			(file) =>
				`[${file.path}] Cellix layout: application services live in src/contexts/<context>/<aggregate>/<action>.ts as curried factories '(dataSources: DataSources) => async (command) => result', composed by index.ts files.`,
		);
}

const inMemoryPattern = /\bInMemory\w*/;

/** The persistence path is Mongoose (mongodb-memory-server locally and in tests). In-memory stand-ins bypass the Cellix data-source conventions. */
export function inMemoryStandInViolations(files: readonly SourceFile[]): string[] {
	return files
		.filter((file) => !isTestFile(file.path) && inMemoryPattern.test(codeOf(file)))
		.map(
			(file) =>
				`[${file.path}] '${inMemoryPattern.exec(codeOf(file))?.[0]}' looks like an in-memory stand-in. Persist through service-mongoose models and persistence data sources; local and test runs use mongodb-memory-server (see .claude/skills/axc-feature).`,
		);
}

const directConstruction = /\bnew\s+(\w*(?:Repository|Repo|DataSource|UnitOfWork|Uow)\w*)\s*\(/g;

/** apps/api composes; it registers infrastructure services and builds context from the service registry, it does not construct data access itself. */
export function compositionRootViolations(files: readonly SourceFile[]): string[] {
	const violations: string[] = [];
	for (const file of files) {
		if (isTestFile(file.path)) {
			continue;
		}
		for (const match of codeOf(file).matchAll(directConstruction)) {
			violations.push(
				`[${file.path}] The composition root must not construct '${match[1]}'. Register an infrastructure service in initializeInfrastructureServices and build the context in setContext from serviceRegistry.getInfrastructureService(...), passing it to the persistence DataSourcesFactory.`,
			);
		}
	}
	return violations;
}
