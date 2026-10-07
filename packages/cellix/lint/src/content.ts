import path from 'node:path';
import type { CellixLintConfig } from './config.js';
import { importSpecifiers, isTestFile, kebabToCamel, kebabToPascal, listTypeScript, readText, relativePosix, report } from './files.js';

export async function checkCellixContent(input: { root: string; lint: CellixLintConfig }): Promise<string[]> {
	const violations: string[] = [];
	const domainRoot = path.join(input.root, input.lint.layers.domain);
	const applicationRoot = path.join(input.root, input.lint.layers.applicationServices);
	const persistenceRoot = path.join(input.root, input.lint.layers.persistence);
	const modelRoot = path.join(input.root, input.lint.layers.models);
	const [domainFiles, applicationFiles, persistenceFiles, modelFiles] = await Promise.all([listTypeScript(domainRoot), listTypeScript(applicationRoot), listTypeScript(persistenceRoot), listTypeScript(modelRoot)]);

	for (const file of domainFiles) {
		if (isTestFile(file)) continue;
		const relative = relativePosix(file, domainRoot);
		const content = await readText(file);
		if (relative.endsWith('.aggregate.ts')) violations.push(...checkAggregateContent(file, content));
		if (relative.endsWith('.value-objects.ts')) violations.push(...checkValueObjectContent(file, content));
		if (relative.endsWith('.repository.ts')) violations.push(...checkDomainRepositoryContent(file, content));
		if (relative.endsWith('.uow.ts')) violations.push(...checkDomainUnitOfWorkContent(file, content));
	}

	violations.push(...(await checkApplicationContent(applicationFiles, applicationRoot)));

	for (const file of persistenceFiles) {
		if (isTestFile(file)) continue;
		const relative = relativePosix(file, persistenceRoot);
		const content = await readText(file);
		if (relative.includes('datasources/domain/') && relative.endsWith('.repository.ts')) violations.push(...checkPersistenceRepositoryContent(file, content));
		if (relative.includes('datasources/domain/') && relative.endsWith('.domain-adapter.ts')) violations.push(...checkPersistenceAdapterContent(file, content));
		if (relative.includes('datasources/domain/') && relative.endsWith('.uow.ts')) violations.push(...checkPersistenceUnitOfWorkContent(file, content));
	}

	for (const file of modelFiles) {
		if (isTestFile(file) || !file.endsWith('.model.ts')) continue;
		violations.push(...checkModelContent(file, await readText(file)));
	}

	return violations;
}

function checkAggregateContent(file: string, content: string): string[] {
	const violations: string[] = [];
	const stem = path.basename(file, '.aggregate.ts');
	const pascal = kebabToPascal(stem);
	if (!/import\s+\*\s+as\s+ValueObjects\s+from\s+['"][^'"]+\.value-objects(?:\.ts)?['"]/.test(content)) {
		violations.push(report(file, 'cellix/content-aggregate-values', 'missing ValueObjects namespace import', `import * as ValueObjects from './${stem}.value-objects.ts'`));
	}
	if (!new RegExp(`export\\s+interface\\s+${pascal}Props\\s+extends\\s+DomainEntityProps\\b`).test(content)) {
		violations.push(report(file, 'cellix/content-aggregate-props', `missing ${pascal}Props extends DomainEntityProps`, `export interface ${pascal}Props extends DomainEntityProps`));
	}
	if (!new RegExp(`export\\s+class\\s+${pascal}\\b[\\s\\S]*\\simplements\\s+${pascal}EntityReference\\b`).test(content)) {
		violations.push(
			report(
				file,
				'cellix/content-aggregate-implements',
				`class does not implement ${pascal}EntityReference`,
				`export class ${pascal}<props extends ${pascal}Props> extends AggregateRoot<props, Passport> implements ${pascal}EntityReference`,
			),
		);
	}
	if (!/private\s+readonly\s+visa\b/.test(content)) {
		violations.push(report(file, 'cellix/content-aggregate-visa', 'missing private readonly visa', 'private readonly visa: <Name>Visa'));
	}
	if (!/constructor\s*\(\s*props:\s*props\s*,\s*passport:\s*Passport\s*\)\s*\{[\s\S]*super\(\s*props\s*,\s*passport\s*\)/.test(content)) {
		violations.push(
			report(
				file,
				'cellix/content-aggregate-constructor',
				'constructor does not call super(props, passport)',
				'constructor(props: props, passport: Passport) { super(props, passport); this.visa = passport.<context>.for<Name>(this); }',
			),
		);
	}
	for (const setter of stringSetters(content)) {
		if (!setter.body.includes('new ValueObjects.') || !setter.body.includes('.valueOf()') || !setter.body.includes(`this.props.${setter.name}`)) {
			violations.push(report(file, 'cellix/content-aggregate-setter', `set ${setter.name} assigns something other than a value object`, `this.props.${setter.name} = new ValueObjects.<Type>(${setter.name}).valueOf()`));
		}
		if (!setter.body.includes('this.visa.determineIf') || !setter.body.includes('PermissionError')) {
			violations.push(report(file, 'cellix/content-aggregate-permission', `set ${setter.name} has no visa check`, 'if (!this.visa.determineIf((permissions) => permissions.<permission>)) throw new PermissionError(...)'));
		}
	}
	return violations;
}

function checkValueObjectContent(file: string, content: string): string[] {
	const violations: string[] = [];
	for (const match of content.matchAll(/export\s+class\s+(\w+)\s+extends\s+(VO[A-Za-z0-9_]+)\(([\s\S]*?)\)\s*\{([\s\S]*?)\}/g)) {
		const name = match[1] ?? '';
		const base = match[2] ?? '';
		const args = match[3] ?? '';
		const body = match[4] ?? '';
		if (!/^VO(?:String|Array|Optional|Float|Integer|Boolean|Date)$/.test(base)) {
			violations.push(report(file, 'cellix/content-value-object', `${name} extends ${base}`, 'extends VOString({ trim, minLength, maxLength }) {}'));
		}
		if (base === 'VOString' && !/minLength\s*:/.test(args) && !/maxLength\s*:/.test(args)) {
			violations.push(report(file, 'cellix/content-value-object-bounds', `${name} has no length bounds`, 'VOString({ trim: true, minLength: <n>, maxLength: <n> })'));
		}
		if (body.trim() !== '') {
			violations.push(report(file, 'cellix/content-value-object-body', `${name} has a class body`, 'an empty class body. Validation lives in the VOString options'));
		}
	}
	return violations;
}

function checkDomainRepositoryContent(file: string, content: string): string[] {
	const violations: string[] = [];
	if (!/getNewInstance\s*\(/.test(content) || !/getById\s*\(/.test(content)) {
		violations.push(report(file, 'cellix/content-domain-repository', 'missing getNewInstance or getById', 'getNewInstance(...): Promise<<Entity><props>> and getById(id: string): Promise<<Entity><props>>'));
	}
	if (/\bexport\s+(?:async\s+)?function\b/.test(content) || /\bconsole\./.test(content)) {
		violations.push(report(file, 'cellix/content-domain-repository-body', 'function or console in a repository interface', 'method signatures only'));
	}
	return violations;
}

function checkDomainUnitOfWorkContent(file: string, content: string): string[] {
	const stem = path.basename(file, '.uow.ts');
	const expected = `${kebabToPascal(stem)}UnitOfWork`;
	if (!new RegExp(`export\\s+interface\\s+${expected}\\b[\\s\\S]*extends\\s+UnitOfWork<`).test(content) || !/InitializedUnitOfWork</.test(content)) {
		return [
			report(
				file,
				'cellix/content-domain-uow',
				'unit of work is not the two-interface extension',
				`export interface ${expected} extends UnitOfWork<Passport, Props, Entity, Repository>, InitializedUnitOfWork<Passport, Props, Entity, Repository> {}`,
			),
		];
	}
	if (!/\{\s*\}/.test(content)) {
		return [report(file, 'cellix/content-domain-uow-body', 'unit of work declares members', 'an empty interface body. Methods stay on the repository')];
	}
	return [];
}

async function checkApplicationContent(files: string[], applicationRoot: string): Promise<string[]> {
	const violations: string[] = [];
	const actions = new Map<string, string[]>();
	for (const file of files) {
		if (isTestFile(file)) continue;
		const relative = relativePosix(file, applicationRoot);
		if (!relative.startsWith('contexts/') || relative.endsWith('/index.ts')) continue;
		const directory = path.dirname(file);
		const list = actions.get(directory) ?? [];
		list.push(file);
		actions.set(directory, list);
		violations.push(...checkActionContent(file, await readText(file)));
	}
	for (const [directory, actionFiles] of actions) {
		const indexFile = path.join(directory, 'index.ts');
		let index = '';
		try {
			index = await readText(indexFile);
		} catch {
			continue;
		}
		for (const actionFile of actionFiles) {
			const camel = kebabToCamel(path.basename(actionFile, '.ts'));
			if (!index.includes(camel)) {
				violations.push(report(indexFile, 'cellix/content-context-wires-action', `index does not mention ${camel}`, `import { ${camel} } from './${path.basename(actionFile)}' and return { ${camel}: ${camel}(dataSources) }`));
			}
		}
	}
	return violations;
}

function checkActionContent(file: string, content: string): string[] {
	const violations: string[] = [];
	const camel = kebabToCamel(path.basename(file, '.ts'));
	if (/\bconsole\./.test(content)) {
		violations.push(report(file, 'cellix/content-action-console', 'console call', 'throw an Error or return a result. Logging stays outside the action'));
	}
	if (/\bfunction\b/.test(content)) {
		violations.push(report(file, 'cellix/content-action-function', 'function declaration', 'export const <action> = (dataSources: DataSources) => { return async (command: <Command>): Promise<...> => { ... } }'));
	}
	const commands = [...content.matchAll(/export\s+(?:interface|type)\s+(\w*Command)\b/g)].map((match) => match[1] ?? '');
	if (commands.length !== 1) {
		violations.push(report(file, 'cellix/content-action-command', commands.join(', ') || 'no command type', 'one export interface <Context><Action>Command'));
	}
	const command = commands[0] ?? 'Command';
	const shape = new RegExp(`export\\s+const\\s+${camel}\\s*=\\s*\\(dataSources:\\s*DataSources\\b[\\s\\S]*?\\)\\s*=>[\\s\\S]*?async\\s*\\(command:\\s*${command}\\)\\s*:\\s*Promise<`);
	if (!shape.test(content)) {
		violations.push(
			report(file, 'cellix/content-action-shape', `export const ${camel} does not match the action body`, `export const ${camel} = (dataSources: DataSources) => { return async (command: ${command}): Promise<...> => { ... }; }`),
		);
	}
	if (/^(?:create|update|delete)(?:[A-Z]|$)/.test(camel) && !/domainDataSource\.[\s\S]*\.withScopedTransaction\(/.test(content)) {
		violations.push(
			report(
				file,
				'cellix/content-mutation-call',
				'mutation does not call domainDataSource...withScopedTransaction(',
				'return dataSources.domainDataSource.<Context>.<Entity>.<Entity>UnitOfWork.withScopedTransaction(async (repo) => repo.save(...))',
			),
		);
	}
	if (/^(?:query|get|find)(?:[A-Z]|$)/.test(camel) && !/readonlyDataSource\./.test(content)) {
		violations.push(report(file, 'cellix/content-query-call', 'query does not read readonlyDataSource.<path>', 'return dataSources.readonlyDataSource.<Context>.<Entity>.<Entity>ReadRepo.<method>(command...)'));
	}
	if (/Promise<\s*unknown\s*>/.test(content)) {
		violations.push(report(file, 'cellix/content-action-result', 'Promise<unknown>', 'Promise<Domain.Contexts.<Context>.<Entity>.<Entity>EntityReference>'));
	}
	for (const specifier of importSpecifiers(content)) {
		if (specifier.startsWith('.') && !specifier.startsWith('./')) {
			violations.push(report(file, 'cellix/content-action-import', specifier, 'a sibling ./ import or a package barrel'));
		}
	}
	return violations;
}

function checkPersistenceRepositoryContent(file: string, content: string): string[] {
	const violations: string[] = [];
	if (!/async\s+getById\s*\(/.test(content) || !/getNewInstance\s*\(/.test(content)) {
		violations.push(
			report(file, 'cellix/content-persistence-repository', 'missing async getById or getNewInstance', 'async getById(id: string) uses this.model.findById; getNewInstance uses this.typeConverter.toAdapter(new this.model())'),
		);
	}
	if (!/this\.model\.findById\(/.test(content) || !/this\.typeConverter\.toDomain\(/.test(content) || !/this\.typeConverter\.toAdapter\(/.test(content)) {
		violations.push(
			report(
				file,
				'cellix/content-persistence-repository-body',
				'repository body does not use model.findById and typeConverter',
				'getById: this.model.findById(id).exec() then this.typeConverter.toDomain; getNewInstance: this.typeConverter.toAdapter(new this.model())',
			),
		);
	}
	return violations;
}

function checkPersistenceAdapterContent(file: string, content: string): string[] {
	const violations: string[] = [];
	if (!/super\(\s*\w+DomainAdapter\s*,/.test(content)) {
		violations.push(report(file, 'cellix/content-persistence-converter', 'converter constructor does not pass the adapter', 'constructor() { super(<Name>DomainAdapter, <Domain>.<Entity>); }'));
	}
	if (!/this\.doc\./.test(content)) {
		violations.push(report(file, 'cellix/content-persistence-adapter', 'adapter does not read or write this.doc', 'get field(): T { return this.doc.field; } set field(field: T) { this.doc.field = field; }'));
	}
	return violations;
}

function checkPersistenceUnitOfWorkContent(file: string, content: string): string[] {
	if (!/new\s+MongooseSeedwork\.MongoUnitOfWork\(\s*InProcEventBusInstance\s*,\s*NodeEventBusInstance\s*,/.test(content) || !/return\s+MongooseSeedwork\.getInitializedUnitOfWork\(/.test(content)) {
		return [
			report(
				file,
				'cellix/content-persistence-uow',
				'factory does not construct MongoUnitOfWork and return getInitializedUnitOfWork',
				'new MongooseSeedwork.MongoUnitOfWork(InProcEventBusInstance, NodeEventBusInstance, model, new <Name>Converter(), <Name>Repository); return MongooseSeedwork.getInitializedUnitOfWork(unitOfWork, passport)',
			),
		];
	}
	return [];
}

function checkModelContent(file: string, content: string): string[] {
	const violations: string[] = [];
	if (!/new\s+Schema</.test(content) || !/schemaVersion\s*:/.test(content) || !/timestamps\s*:\s*true/.test(content)) {
		violations.push(
			report(
				file,
				'cellix/content-model-schema',
				'schema is missing Schema<>, schemaVersion, or timestamps',
				"new Schema<Entity, Model<Entity>, Entity>({ schemaVersion: { type: String, default: '1.0.0' }, ... }, { timestamps: true, versionKey: 'version' })",
			),
		);
	}
	if (/\bfunction\b/.test(content) || /\bconsole\./.test(content)) {
		violations.push(report(file, 'cellix/content-model-body', 'function or console in a model file', 'a schema and ModelFactory, ModelType, ModelName exports'));
	}
	return violations;
}

function stringSetters(content: string): { name: string; body: string }[] {
	const setters: { name: string; body: string }[] = [];
	for (const match of content.matchAll(/set\s+(\w+)\(\s*\1\s*:\s*string\s*\)\s*\{/g)) {
		const name = match[1] ?? '';
		const start = (match.index ?? 0) + match[0].length;
		setters.push({ name, body: sliceBlock(content, start) });
	}
	return setters;
}

function sliceBlock(content: string, start: number): string {
	let depth = 1;
	for (let index = start; index < content.length; index += 1) {
		const char = content[index];
		if (char === '{') depth += 1;
		if (char === '}') depth -= 1;
		if (depth === 0) return content.slice(start, index);
	}
	return content.slice(start);
}
