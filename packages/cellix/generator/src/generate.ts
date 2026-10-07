import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CellixLintConfig } from '@cellix/lint';
import { formatGeneratedFiles } from './format.ts';
import type { FieldSpec, NestedSpec } from './spec.ts';

export interface GenerateFeatureOptions {
	root: string;
	lint: CellixLintConfig;
	context: string;
	entity: string;
	action: string;
	transport?: 'rest' | 'graphql';
	fields?: FieldSpec[];
	permissions?: string[];
	nested?: NestedSpec[];
	resolver?: boolean;
}

export interface GeneratedFile {
	path: string;
	contents: string;
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function generateFeature(options: GenerateFeatureOptions): Promise<GeneratedFile[]> {
	const context = options.context;
	const entity = options.entity;
	const action = options.action;
	if (!KEBAB.test(context) || !KEBAB.test(entity) || !KEBAB.test(action)) {
		throw new Error('context, entity, and action must be kebab-case');
	}
	const files = plan(options);
	const passport = path.join(options.root, options.lint.layers.domain, 'domain/contexts/passport.ts');
	const readonlyRoot = path.join(options.root, options.lint.layers.persistence, 'datasources/readonly');
	const shared = new Set([passport, path.join(readonlyRoot, 'mongo-data-source.ts'), path.join(readonlyRoot, 'index.ts'), path.join(readonlyRoot, context, 'index.ts')]);
	const collisions: string[] = [];
	const writes: GeneratedFile[] = [];
	for (const file of files) {
		if (await exists(file.path)) {
			if (shared.has(file.path)) continue;
			collisions.push(file.path);
			continue;
		}
		writes.push(file);
	}
	if (collisions.length > 0) {
		throw new Error(`Refusing to overwrite:\n${collisions.join('\n')}`);
	}
	for (const file of writes) {
		assertInsideLayers(file.path, options);
		await mkdir(path.dirname(file.path), { recursive: true });
		await writeFile(file.path, file.contents);
	}
	formatGeneratedFiles(writes);
	for (const file of writes) file.contents = await readFile(file.path, 'utf8');
	return writes;
}

export function plan(options: GenerateFeatureOptions): GeneratedFile[] {
	const { root, lint, context, entity, action } = options;
	const scope = lint.scope;
	const entityPascal = pascal(entity);
	const contextPascal = pascal(context);
	const actionCamel = camel(action);
	const actionPascal = pascal(action);
	const command = `${entityPascal}${actionPascal}Command`;
	const mutation = /^(?:create|update|delete)(?:[A-Z]|$)/.test(actionCamel);
	const shape = normalizeShape(entity, options.fields ?? [], options.permissions ?? [], options.nested ?? []);
	const resolver = options.resolver === true || options.transport === 'graphql';
	const domainContexts = path.join(root, lint.layers.domain, 'domain/contexts');
	const entityDir = path.join(domainContexts, context, entity);
	const persistenceDir = path.join(root, lint.layers.persistence, 'datasources/domain', context, entity);
	const readonlyRoot = path.join(root, lint.layers.persistence, 'datasources/readonly');
	const readonlyDir = path.join(readonlyRoot, context, entity);
	const applicationDir = path.join(root, lint.layers.applicationServices, 'contexts', context, entity);
	const modelFile = path.join(root, lint.layers.models, 'models', entity, `${entity}.model.ts`);

	const files: GeneratedFile[] = [
		...nestedFiles(entityDir, context, shape),
		{
			path: path.join(domainContexts, context, `${context}.domain-permissions.ts`),
			contents: `export interface ${contextPascal}DomainPermissions {\n${shape.permissions.map((permission) => `\t${permission}: boolean;`).join('\n')}\n}\n`,
		},
		{
			path: path.join(domainContexts, context, `${context}.visa.ts`),
			contents: `import type { Visa } from '@cellix/domain-seedwork/visa';\nimport type { ${contextPascal}DomainPermissions } from './${context}.domain-permissions.ts';\n\nexport interface ${contextPascal}Visa extends Visa<${contextPascal}DomainPermissions> {\n\tdetermineIf(func: (permissions: Readonly<${contextPascal}DomainPermissions>) => boolean): boolean;\n}\n`,
		},
		{
			path: path.join(domainContexts, 'passport.ts'),
			contents: `import type { ${contextPascal}Visa } from './${context}/${context}.visa.ts';\n\nexport interface Passport {\n\t${camel(context)}: {\n\t\tfor${entityPascal}(entity: unknown): ${contextPascal}Visa;\n\t};\n}\n`,
		},
		{
			path: path.join(entityDir, `${entity}.value-objects.ts`),
			contents: scalarValueObjects(
				shape.fields.filter((field) => field.type === 'string').map((field) => field.pascal),
				`${entityPascal}Name`,
			),
		},
		{
			path: path.join(entityDir, `${entity}.aggregate.ts`),
			contents: aggregateTemplate({ entity, entityPascal, context, shape }),
		},
		{
			path: path.join(entityDir, `${entity}.repository.ts`),
			contents: `import type { Repository } from '@cellix/domain-seedwork/repository';\nimport type { ${entityPascal}, ${entityPascal}NewInput, ${entityPascal}Props } from './${entity}.aggregate.ts';\n\nexport interface ${entityPascal}Repository<props extends ${entityPascal}Props> extends Repository<${entityPascal}<props>> {\n\tgetNewInstance(input: ${entityPascal}NewInput): Promise<${entityPascal}<props>>;\n\tgetById(id: string): Promise<${entityPascal}<props>>;\n}\n`,
		},
		{
			path: path.join(entityDir, `${entity}.uow.ts`),
			contents: `import type { InitializedUnitOfWork, UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';\nimport type { Passport } from '../../passport.ts';\nimport type { ${entityPascal}, ${entityPascal}Props } from './${entity}.aggregate.ts';\nimport type { ${entityPascal}Repository } from './${entity}.repository.ts';\n\nexport interface ${entityPascal}UnitOfWork extends UnitOfWork<Passport, ${entityPascal}Props, ${entityPascal}<${entityPascal}Props>, ${entityPascal}Repository<${entityPascal}Props>>, InitializedUnitOfWork<Passport, ${entityPascal}Props, ${entityPascal}<${entityPascal}Props>, ${entityPascal}Repository<${entityPascal}Props>> {}\n`,
		},
		{
			path: modelFile,
			contents: modelTemplate(entityPascal, shape),
		},
		{
			path: path.join(persistenceDir, `${entity}.domain-adapter.ts`),
			contents: adapterTemplate({ entity, entityPascal, scope, shape }),
		},
		{
			path: path.join(persistenceDir, `${entity}.repository.ts`),
			contents: persistenceRepositoryTemplate({ entity, entityPascal, scope, shape }),
		},
		{
			path: path.join(persistenceDir, `${entity}.uow.ts`),
			contents: persistenceUowTemplate({ entity, entityPascal, scope }),
		},
		{
			path: path.join(readonlyRoot, 'mongo-data-source.ts'),
			contents: mongoDataSourceTemplate(),
		},
		{
			path: path.join(readonlyDir, `${entity}.data.ts`),
			contents: dataTemplate({ entityPascal, scope }),
		},
		{
			path: path.join(readonlyDir, `${entity}.read-repository.ts`),
			contents: readRepositoryTemplate({ context, entity, entityPascal, scope }),
		},
		{
			path: path.join(readonlyDir, 'index.ts'),
			contents: readEntityIndexTemplate({ entity, entityPascal, scope }),
		},
		{
			path: path.join(readonlyRoot, context, 'index.ts'),
			contents: readContextIndexTemplate({ context, contextPascal, entity, entityPascal, scope }),
		},
		{
			path: path.join(readonlyRoot, 'index.ts'),
			contents: readonlyIndexTemplate({ context, contextPascal, entity, entityPascal, scope }),
		},
		{
			path: path.join(applicationDir, `${action}.ts`),
			contents: actionTemplate({ actionCamel, command, contextPascal, entityPascal, mutation, scope, shape }),
		},
		{
			path: path.join(applicationDir, 'index.ts'),
			contents: `import type { Domain } from '${scope}/domain';\nimport type { DataSources } from '${scope}/persistence';\nimport { type ${command}, ${actionCamel} } from './${action}.ts';\n\nexport interface ${entityPascal}ApplicationService {\n\t${actionCamel}: (command: ${command}) => Promise<Domain.Contexts.${entityPascal}.${entityPascal}.${entityPascal}EntityReference>;\n}\n\nexport const ${entityPascal} = (dataSources: DataSources): ${entityPascal}ApplicationService => {\n\treturn {\n\t\t${actionCamel}: ${actionCamel}(dataSources),\n\t};\n};\n`,
		},
	];

	if (options.transport === 'rest') {
		files.push({
			path: path.join(root, lint.layers.rest, `${entity}-${action}.ts`),
			contents: `import type { ApplicationServices } from '${scope}/application-services';\n\nexport const ${camel(`${entity}-${action}`)} = async (applicationServices: ApplicationServices, command: { ${commandFields(shape, mutation)} }): Promise<unknown> => {\n\treturn applicationServices.${camel(context)}.${camel(entity)}.${actionCamel}(command);\n};\n`,
		});
	}
	if (resolver) {
		const typesDir = path.join(root, lint.layers.graphql, 'schema/types');
		const operation = mutation ? 'Mutation' : 'Query';
		files.push(
			{
				path: path.join(typesDir, `${entity}.graphql`),
				contents: graphqlSchema({ entityPascal, actionPascal, actionCamel, operation, shape }),
			},
			{
				path: path.join(typesDir, `${entity}.resolvers.ts`),
				contents: `import type { Resolvers } from '../builder/generated.ts';\nimport type { GraphContext } from '../context.ts';\n\nconst ${camel(entity)}Resolvers: Resolvers = {\n\t${operation}: {\n\t\t${actionCamel}: async (_parent, args, context: GraphContext) => {\n\t\t\treturn await context.applicationServices.${camel(context)}.${camel(entity)}.${actionCamel}(args.input);\n\t\t},\n\t},\n};\n\nexport default ${camel(entity)}Resolvers;\n`,
			},
		);
	}
	return files;
}

function aggregateTemplate(input: { entity: string; entityPascal: string; context: string; shape: Shape }): string {
	const { entity, entityPascal, context, shape } = input;
	const contextCamel = camel(context);
	const visa = `${pascal(context)}Visa`;
	const permission = shape.permissions[0] ?? `canManage${entityPascal}`;
	const entityNests = shape.nested.filter((item) => item.kind === 'entity');
	const reference = entityNests.length === 0 ? `export interface ${entityPascal}EntityReference extends Readonly<${entityPascal}Props> {}` : entityReference(entityPascal, entityNests);
	const nestedImports = shape.nested.map((item) => childImport(item)).join('\n');
	const props = [
		...shape.fields.map((field) => `\t${field.name}: ${tsType(field.type)};`),
		...shape.nested.map((item) => `\t${item.camel}: ${item.pascal}Props;`),
		'\treadonly createdAt: Date;',
		'\treadonly updatedAt: Date;',
		'\treadonly schemaVersion: string;',
	].join('\n');
	const inputFields = [...shape.fields.map((field) => `\t${field.name}: ${tsType(field.type)};`), ...shape.nested.map((item) => `\t${item.camel}: ${item.pascal}Props;`)].join('\n');
	const assigns = [...shape.fields.map((field) => `\t\tentity.${field.name} = input.${field.name};`), ...shape.nested.map((item) => `\t\tentity.${item.camel} = input.${item.camel};`)].join('\n');
	const members = [...shape.fields.map((field) => scalarMembers(field, permission)), ...shape.nested.map((item) => nestedMembers(item, permission)), createdMembers()].join('\n\n');
	return `import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import { PermissionError } from '@cellix/domain-seedwork/domain-entity';
import type { Passport } from '../../passport.ts';
import type { ${visa} } from '../${context}.visa.ts';
import * as ValueObjects from './${entity}.value-objects.ts';
${nestedImports}

export interface ${entityPascal}Props extends DomainEntityProps {
${props}
}

${reference}

export interface ${entityPascal}NewInput {
${inputFields}
}

export class ${entityPascal}<props extends ${entityPascal}Props> extends AggregateRoot<props, Passport> implements ${entityPascal}EntityReference {
	private isNew: boolean = false;
	private readonly visa: ${visa};
	constructor(props: props, passport: Passport) {
		super(props, passport);
		this.visa = passport.${contextCamel}.for${entityPascal}(this);
	}

	public static getNewInstance<props extends ${entityPascal}Props>(newProps: props, input: ${entityPascal}NewInput, passport: Passport): ${entityPascal}<props> {
		const entity = new ${entityPascal}(newProps, passport);
		entity.markAsNew();
${assigns}
		entity.isNew = false;
		return entity;
	}

	private markAsNew(): void {
		this.isNew = true;
	}

${members}
}
`;
}

function modelTemplate(entityPascal: string, shape: Shape): string {
	const nestedTypes = modelInterfaces(entityPascal, shape.nested);
	const fields = [...shape.fields.map((field) => `\t${field.name}: ${tsType(field.type)};`), ...shape.nested.map((item) => `\t${item.camel}: ${entityPascal}${item.pascal};`)].join('\n');
	const schemaFields = [...shape.fields.map((field) => `\t\t${field.name}: ${mongooseField(field)},`), ...shape.nested.map((item) => `\t\t${item.camel}: {\n${mongooseMembers(item, '\t\t')}\n\t\t},`)].join('\n');
	return `import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';

${nestedTypes}export interface ${entityPascal} extends MongooseSeedwork.Base {
${fields}
}

const ${entityPascal}Schema = new Schema<${entityPascal}, Model<${entityPascal}>, ${entityPascal}>(
	{
		schemaVersion: { type: String, default: '1.0.0' },
${schemaFields}
	},
	{ timestamps: true, versionKey: 'version' },
);

export const ${entityPascal}ModelName = '${entityPascal}';
export const ${entityPascal}ModelFactory = MongooseSeedwork.modelFactory<${entityPascal}>(${entityPascal}ModelName, ${entityPascal}Schema);
export type ${entityPascal}ModelType = ReturnType<typeof ${entityPascal}ModelFactory>;
`;
}

function adapterTemplate(input: { entity: string; entityPascal: string; scope: string; shape: Shape }): string {
	const { entityPascal, scope, shape } = input;
	const members = [
		...shape.fields.map(
			(field) => `	get ${field.name}(): ${tsType(field.type)} {\n\t\treturn this.doc.${field.name};\n\t}\n\tset ${field.name}(${field.name}: ${tsType(field.type)}) {\n\t\tthis.doc.${field.name} = ${field.name};\n\t}`,
		),
		...shape.nested.map((item) => {
			const type = structuralType(item);
			return `	get ${item.camel}(): ${type} {\n\t\treturn this.doc.${item.camel};\n\t}\n\tset ${item.camel}(${item.camel}: ${type}) {\n\t\tthis.doc.${item.camel} = ${item.camel};\n\t}`;
		}),
	].join('\n');
	return `import { Domain } from '${scope}/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';

export class ${entityPascal}Converter extends MongooseSeedwork.MongoTypeConverter<unknown, ${entityPascal}DomainAdapter, Domain.Passport, Domain.Contexts.${entityPascal}.${entityPascal}.${entityPascal}<${entityPascal}DomainAdapter>> {
	constructor() {
		super(${entityPascal}DomainAdapter, Domain.Contexts.${entityPascal}.${entityPascal}.${entityPascal});
	}
}

export class ${entityPascal}DomainAdapter extends MongooseSeedwork.MongooseDomainAdapter<unknown> implements Domain.Contexts.${entityPascal}.${entityPascal}.${entityPascal}Props {
${members}
}
`;
}

function persistenceRepositoryTemplate(input: { entity: string; entityPascal: string; scope: string; shape: Shape }): string {
	const { entity, entityPascal, scope, shape } = input;
	const inputType = `{ ${[...shape.fields.map((field) => `${field.name}: ${tsType(field.type)}`), ...shape.nested.map((item) => `${item.camel}: ${structuralType(item)}`)].join('; ')} }`;
	return `import { Domain } from '${scope}/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { ${entityPascal}DomainAdapter } from './${entity}.domain-adapter.ts';

export class ${entityPascal}Repository extends MongooseSeedwork.MongoRepositoryBase<unknown, ${entityPascal}DomainAdapter, Domain.Passport, Domain.Contexts.${entityPascal}.${entityPascal}.${entityPascal}<${entityPascal}DomainAdapter>> implements Domain.Contexts.${entityPascal}.${entityPascal}.${entityPascal}Repository<${entityPascal}DomainAdapter> {
	async getById(id: string): Promise<Domain.Contexts.${entityPascal}.${entityPascal}.${entityPascal}<${entityPascal}DomainAdapter>> {
		const document = await this.model.findById(id).exec();
		if (!document) {
			throw new Error(\`${entityPascal} with id \${id} not found\`);
		}
		return this.typeConverter.toDomain(document, this.passport);
	}

	getNewInstance(input: ${inputType}): Promise<Domain.Contexts.${entityPascal}.${entityPascal}.${entityPascal}<${entityPascal}DomainAdapter>> {
		const adapter = this.typeConverter.toAdapter(new this.model());
		return Promise.resolve(Domain.Contexts.${entityPascal}.${entityPascal}.${entityPascal}.getNewInstance(adapter, input, this.passport));
	}
}
`;
}

function dataTemplate(input: { entityPascal: string; scope: string }): string {
	const { entityPascal, scope } = input;
	return `import type { ${entityPascal} } from '${scope}/data-sources-mongoose-models';
import { MongoDataSourceImpl, type MongoDataSource } from '../../mongo-data-source.ts';

export interface ${entityPascal}DataSource extends MongoDataSource<${entityPascal}> {}

export class ${entityPascal}DataSourceImpl extends MongoDataSourceImpl<${entityPascal}> implements ${entityPascal}DataSource {}
`;
}

function readRepositoryTemplate(input: { context: string; entity: string; entityPascal: string; scope: string }): string {
	const { context, entity, entityPascal, scope } = input;
	const reference = `Domain.Contexts.${entityPascal}.${entityPascal}.${entityPascal}EntityReference`;
	return `import type { ${entityPascal}ModelType } from '${scope}/data-sources-mongoose-models';
import type { Domain } from '${scope}/domain';
import { ${entityPascal}Converter } from '../../../domain/${context}/${entity}/${entity}.domain-adapter.ts';
import type { FindOneOptions, FindOptions } from '../../mongo-data-source.ts';
import { ${entityPascal}DataSourceImpl, type ${entityPascal}DataSource } from './${entity}.data.ts';

export interface ${entityPascal}ReadRepository {
	getAll: (options?: FindOptions) => Promise<${reference}[]>;
	getById: (id: string, options?: FindOneOptions) => Promise<${reference} | null>;
}

export class ${entityPascal}ReadRepositoryImpl implements ${entityPascal}ReadRepository {
	private readonly mongoDataSource: ${entityPascal}DataSource;
	private readonly converter: ${entityPascal}Converter;
	private readonly passport: Domain.Passport;

	constructor(models: { ${entityPascal}: ${entityPascal}ModelType }, passport: Domain.Passport) {
		this.mongoDataSource = new ${entityPascal}DataSourceImpl(models.${entityPascal});
		this.converter = new ${entityPascal}Converter();
		this.passport = passport;
	}

	async getAll(options?: FindOptions): Promise<${reference}[]> {
		const result = await this.mongoDataSource.find({}, options);
		return result.map((doc) => this.converter.toDomain(doc, this.passport));
	}

	async getById(id: string, options?: FindOneOptions): Promise<${reference} | null> {
		const result = await this.mongoDataSource.findById(id, options);
		if (!result) {
			return null;
		}
		return this.converter.toDomain(result, this.passport);
	}
}

export const get${entityPascal}ReadRepository = (models: { ${entityPascal}: ${entityPascal}ModelType }, passport: Domain.Passport): ${entityPascal}ReadRepository => {
	return new ${entityPascal}ReadRepositoryImpl(models, passport);
};
`;
}

function readEntityIndexTemplate(input: { entity: string; entityPascal: string; scope: string }): string {
	const { entity, entityPascal, scope } = input;
	return `import type { ${entityPascal}ModelType } from '${scope}/data-sources-mongoose-models';
import type { Domain } from '${scope}/domain';
import { get${entityPascal}ReadRepository } from './${entity}.read-repository.ts';

export type { ${entityPascal}ReadRepository } from './${entity}.read-repository.ts';

export const ${entityPascal}ReadRepositoryImpl = (models: { ${entityPascal}: ${entityPascal}ModelType }, passport: Domain.Passport) => {
	return {
		${entityPascal}ReadRepo: get${entityPascal}ReadRepository(models, passport),
	};
};
`;
}

function readContextIndexTemplate(input: { context: string; contextPascal: string; entity: string; entityPascal: string; scope: string }): string {
	const { contextPascal, entity, entityPascal, scope } = input;
	return `import type { ${entityPascal}ModelType } from '${scope}/data-sources-mongoose-models';
import type { Domain } from '${scope}/domain';
import { ${entityPascal}ReadRepositoryImpl } from './${entity}/index.ts';

export const ${contextPascal}Context = (models: { ${entityPascal}: ${entityPascal}ModelType }, passport: Domain.Passport) => ({
	${entityPascal}: ${entityPascal}ReadRepositoryImpl(models, passport),
});
`;
}

function readonlyIndexTemplate(input: { context: string; contextPascal: string; entity: string; entityPascal: string; scope: string }): string {
	const { context, contextPascal, entity, entityPascal, scope } = input;
	return `import type { ${entityPascal}ModelType } from '${scope}/data-sources-mongoose-models';
import type { Domain } from '${scope}/domain';
import { ${contextPascal}Context } from './${context}/index.ts';
import type { ${entityPascal}ReadRepository } from './${context}/${entity}/${entity}.read-repository.ts';

export interface ReadonlyDataSource {
	${contextPascal}: {
		${entityPascal}: {
			${entityPascal}ReadRepo: ${entityPascal}ReadRepository;
		};
	};
}

export const ReadonlyDataSourceImplementation = (models: { ${entityPascal}: ${entityPascal}ModelType }, passport: Domain.Passport): ReadonlyDataSource => ({
	${contextPascal}: ${contextPascal}Context(models, passport),
});
`;
}

function mongoDataSourceTemplate(): string {
	return `import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type FilterQuery, isValidObjectId, type Model, type PipelineStage, type QueryOptions, type Require_id } from 'mongoose';

type LeanBase<T> = Readonly<Require_id<T>>;
type Lean<T> = LeanBase<T> & { id: string };
type ObjectIdLike = { toHexString: () => string };

const hasToHexString = (value: unknown): value is ObjectIdLike => typeof value === 'object' && value !== null && 'toHexString' in value && typeof value.toHexString === 'function';

export type FindOptions = {
	fields?: string[] | undefined;
	projectionMode?: 'include' | 'exclude';
	populateFields?: string[] | undefined;
	limit?: number;
	skip?: number;
	sort?: Partial<Record<string, 1 | -1>>;
};

export type FindOneOptions = Omit<FindOptions, 'limit' | 'skip' | 'sort'>;

export interface MongoDataSource<TDoc extends MongooseSeedwork.Base> {
	find(filter: Partial<TDoc>, options?: FindOptions): Promise<Lean<TDoc>[]>;
	findOne(filter: Partial<TDoc>, options?: FindOneOptions): Promise<Lean<TDoc> | null>;
	findById(id: string, options?: FindOneOptions): Promise<Lean<TDoc> | null>;
	aggregate(pipeline: PipelineStage[]): Promise<Lean<TDoc>[]>;
}

export class MongoDataSourceImpl<TDoc extends MongooseSeedwork.Base> implements MongoDataSource<TDoc> {
	private readonly model: Model<TDoc>;
	constructor(model: Model<TDoc>) {
		this.model = model;
	}

	private buildProjection(fields?: string[] | undefined, projectionMode: 'include' | 'exclude' = 'include'): Record<string, 1 | 0> {
		const projection: Record<string, 1 | 0> = {};
		if (fields) {
			for (const key of fields) {
				projection[key] = projectionMode === 'include' ? 1 : 0;
			}
		}
		return projection;
	}

	private buildFilterQuery(filter: Partial<TDoc>): FilterQuery<TDoc> {
		const query: FilterQuery<TDoc> = {};
		for (const key of Object.keys(filter)) {
			const value = filter[key as keyof TDoc];
			if (value !== undefined) {
				query[key as keyof FilterQuery<TDoc>] = value as FilterQuery<TDoc>[keyof TDoc];
			}
		}
		return query;
	}

	private appendId(doc: LeanBase<TDoc>): Lean<TDoc> {
		const id = doc._id;
		const stringId = typeof id === 'string' ? id : hasToHexString(id) ? id.toHexString() : null;
		if (stringId === null) {
			throw new TypeError('MongoDB document is missing a string-compatible _id');
		}
		return { ...doc, id: stringId };
	}

	private buildQueryOptions(options?: FindOptions): QueryOptions {
		const findOptions: QueryOptions = {};
		if (options?.limit) findOptions.limit = options.limit;
		if (options?.skip) findOptions.skip = options.skip;
		if (options?.sort) findOptions.sort = options.sort;
		return findOptions;
	}

	async find(filter: Partial<TDoc>, options?: FindOptions): Promise<Lean<TDoc>[]> {
		const queryOptions = this.buildQueryOptions(options);
		let query = this.model.find(this.buildFilterQuery(filter), this.buildProjection(options?.fields, options?.projectionMode), queryOptions);
		if (options?.populateFields?.length) {
			for (const field of options.populateFields) {
				query = query.populate(field);
			}
		}
		const docs = await query.lean<LeanBase<TDoc>[]>();
		return docs.map((doc) => this.appendId(doc));
	}

	async findOne(filter: Partial<TDoc>, options?: FindOneOptions): Promise<Lean<TDoc> | null> {
		let query = this.model.findOne(this.buildFilterQuery(filter), this.buildProjection(options?.fields, options?.projectionMode));
		if (options?.populateFields?.length) {
			for (const field of options.populateFields) {
				query = query.populate(field);
			}
		}
		const doc = await query.lean<LeanBase<TDoc>>();
		return doc ? this.appendId(doc) : null;
	}

	async findById(id: string, options?: FindOneOptions): Promise<Lean<TDoc> | null> {
		if (!isValidObjectId(id)) return null;
		let query = this.model.findById(id, this.buildProjection(options?.fields, options?.projectionMode));
		if (options?.populateFields?.length) query = query.populate(options.populateFields);
		const doc = await query.lean<LeanBase<TDoc>>();
		return doc ? this.appendId(doc) : null;
	}

	async aggregate(pipeline: PipelineStage[]): Promise<Lean<TDoc>[]> {
		const docs = await this.model.aggregate(pipeline).exec();
		return docs.map((doc) => this.appendId(doc));
	}
}
`;
}

function persistenceUowTemplate(input: { entity: string; entityPascal: string; scope: string }): string {
	const { entity, entityPascal, scope } = input;
	return `import { InProcEventBusInstance, NodeEventBusInstance } from '@cellix/event-bus-seedwork-node';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { Domain } from '${scope}/domain';
import { ${entityPascal}Converter } from './${entity}.domain-adapter.ts';
import { ${entityPascal}Repository } from './${entity}.repository.ts';

export const get${entityPascal}UnitOfWork = (model: unknown, passport: Domain.Passport): Domain.Contexts.${entityPascal}.${entityPascal}.${entityPascal}UnitOfWork => {
	const unitOfWork = new MongooseSeedwork.MongoUnitOfWork(InProcEventBusInstance, NodeEventBusInstance, model, new ${entityPascal}Converter(), ${entityPascal}Repository);
	return MongooseSeedwork.getInitializedUnitOfWork(unitOfWork, passport);
};
`;
}

function actionTemplate(input: { actionCamel: string; command: string; contextPascal: string; entityPascal: string; mutation: boolean; scope: string; shape: Shape }): string {
	const { actionCamel, command, contextPascal, entityPascal, mutation, scope, shape } = input;
	const inputLiteral = [...shape.fields.map((field) => `${field.name}: command.${field.name}`), ...shape.nested.map((item) => `${item.camel}: command.${item.camel}`)].join(', ');
	const body = mutation
		? `return await dataSources.domainDataSource.${entityPascal}.${entityPascal}.${entityPascal}UnitOfWork.withScopedTransaction(async (repo) => {\n\t\t\treturn repo.save(await repo.getNewInstance({ ${inputLiteral} }));\n\t\t});`
		: `return await dataSources.readonlyDataSource.${contextPascal}.${entityPascal}.${entityPascal}ReadRepo.getById(command.id);`;
	const result = `Domain.Contexts.${entityPascal}.${entityPascal}.${entityPascal}EntityReference`;
	return `import type { Domain } from '${scope}/domain';\nimport type { DataSources } from '${scope}/persistence';\n\nexport interface ${command} {\n\t${commandFields(shape, mutation)}\n}\n\nexport const ${actionCamel} = (dataSources: DataSources) => {\n\treturn async (command: ${command}): Promise<${result}> => {\n\t\t${body}\n\t};\n};\n`;
}

interface ShapeField {
	name: string;
	pascal: string;
	type: 'string' | 'boolean' | 'date' | 'number';
}

interface ShapeNested {
	name: string;
	camel: string;
	pascal: string;
	kind: 'value' | 'entity';
	fields: ShapeMember[];
}

type ShapeMember = ShapeField | ShapeNested;

interface Shape {
	fields: ShapeField[];
	permissions: string[];
	nested: ShapeNested[];
}

function normalizeShape(entity: string, fields: FieldSpec[], permissions: string[], nested: NestedSpec[]): Shape {
	const source = fields.length > 0 ? fields : [{ name: `${camel(entity)}Name`, type: 'string' as const }];
	const scalars: ShapeField[] = source.map((field) => {
		if (field.type === 'id') throw new Error(`${field.name}:id belongs on --nested. Root id comes from the aggregate`);
		return { name: field.name, pascal: pascal(field.name), type: field.type };
	});
	const fileNames = new Set<string>([entity]);
	const children = nested.map((item) => toShapeNested(item, fileNames));
	const seen = new Set<string>();
	for (const name of [...scalars.map((field) => field.name), ...children.map((item) => item.camel)]) {
		if (seen.has(name)) throw new Error(`Name ${name} is used more than once`);
		seen.add(name);
	}
	const resolvedPermissions = permissions.length > 0 ? permissions : [`canManage${pascal(entity)}`];
	const seenPermissions = new Set<string>();
	for (const permission of resolvedPermissions) {
		if (seenPermissions.has(permission)) throw new Error(`Permission ${permission} is used more than once`);
		seenPermissions.add(permission);
	}
	return { fields: scalars, permissions: resolvedPermissions, nested: children };
}

function toShapeNested(item: NestedSpec, fileNames: Set<string>): ShapeNested {
	if (fileNames.has(item.name)) throw new Error(`Name ${item.name} is used more than once`);
	fileNames.add(item.name);
	const fields: ShapeMember[] = item.fields.map((member) => {
		if (isNestedSpec(member)) {
			if (item.kind === 'value' && member.kind === 'entity') throw new Error(`Nested entity ${member.name} cannot sit inside value object ${item.name}`);
			return toShapeNested(member, fileNames);
		}
		if (member.type === 'id') throw new Error(`${item.name}.${member.name} was not removed as an identity field`);
		return { name: member.name, pascal: pascal(member.name), type: member.type };
	});
	return { name: item.name, camel: camel(item.name), pascal: pascal(item.name), kind: item.kind, fields };
}

function nestedFiles(entityDir: string, context: string, shape: Shape): GeneratedFile[] {
	return shape.nested.flatMap((item) => filesForNested(entityDir, context, item, shape.permissions[0] ?? 'canManage'));
}

function filesForNested(entityDir: string, context: string, item: ShapeNested, permission: string): GeneratedFile[] {
	const children = item.fields.filter(isShapeNested).flatMap((child) => filesForNested(entityDir, context, child, permission));
	const strings = item.fields.filter((member): member is ShapeField => !isShapeNested(member) && member.type === 'string').map((member) => member.pascal);
	const files = [...children];
	if (item.kind === 'value' || strings.length > 0) {
		files.push({ path: path.join(entityDir, `${item.name}.value-objects.ts`), contents: valueObjectModule(item, strings) });
	}
	if (item.kind === 'entity') files.push({ path: path.join(entityDir, `${item.name}.entity.ts`), contents: entityTemplate(item, context, permission) });
	return files;
}

function entityTemplate(item: ShapeNested, context: string, permission: string): string {
	const visa = `${pascal(context)}Visa`;
	const childEntities = item.fields.filter((member): member is ShapeNested => isShapeNested(member) && member.kind === 'entity');
	const reference = childEntities.length === 0 ? `export interface ${item.pascal}EntityReference extends Readonly<${item.pascal}Props> {}` : entityReference(item.pascal, childEntities);
	const imports = [valueObjectImport(item), ...item.fields.filter(isShapeNested).map((child) => childImport(child))].filter((line) => line.length > 0).join('\n');
	const members = [
		...item.fields.filter((member): member is ShapeField => !isShapeNested(member)).map((field) => scalarMembers(field, permission)),
		...item.fields.filter(isShapeNested).map((child) => nestedMembers(child, permission)),
	].join('\n\n');
	return `import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import { DomainEntity, PermissionError } from '@cellix/domain-seedwork/domain-entity';
import type { ${visa} } from '../${context}.visa.ts';
${imports}

export interface ${item.pascal}Props extends DomainEntityProps {
${propLines(item.fields)}
	readonly createdAt: Date;
	readonly updatedAt: Date;
}

${reference}

export class ${item.pascal} extends DomainEntity<${item.pascal}Props> implements ${item.pascal}EntityReference {
	private isNew: boolean = false;
	private readonly visa: ${visa};
	constructor(props: ${item.pascal}Props, visa: ${visa}) {
		super(props);
		this.visa = visa;
	}

${members}

	get createdAt(): Date {
		return this.props.createdAt;
	}
	get updatedAt(): Date {
		return this.props.updatedAt;
	}
}
`;
}

function valueObjectModule(item: ShapeNested, names: string[]): string {
	const classes = (names.length > 0 ? names : [`${item.pascal}Value`]).map((name) => `export class ${name} extends VOString({\n\ttrim: true,\n\tminLength: 1,\n\tmaxLength: 200,\n}) {}`).join('\n');
	const childImports = item.fields
		.filter(isShapeNested)
		.map((child) => `import type { ${child.pascal}Props } from './${child.name}.${child.kind === 'entity' ? 'entity' : 'value-objects'}.ts';`)
		.join('\n');
	const header = item.kind === 'value' ? `export interface ${item.pascal}Props {\n${propLines(item.fields)}\n}\n\n` : '';
	const imports = ["import { VOString } from '@lucaspaganini/value-objects';", childImports].filter((line) => line.length > 0).join('\n');
	return `${imports}\n\n${header}${classes}\n`;
}

function scalarMembers(field: ShapeField, permission: string): string {
	const assign = field.type === 'string' ? `this.props.${field.name} = new ValueObjects.${field.pascal}(${field.name}).valueOf();` : `this.props.${field.name} = ${field.name};`;
	return `\tget ${field.name}(): ${tsType(field.type)} {\n\t\treturn this.props.${field.name};\n\t}\n\tset ${field.name}(${field.name}: ${tsType(field.type)}) {\n\t\t${guard(permission, field.name)}\n\t\t${assign}\n\t}`;
}

function nestedMembers(item: ShapeNested, permission: string): string {
	if (item.kind === 'entity') {
		return `\tget ${item.camel}(): ${item.pascal}EntityReference {\n\t\treturn new ${item.pascal}(this.props.${item.camel}, this.visa);\n\t}\n\tset ${item.camel}(${item.camel}: ${item.pascal}Props) {\n\t\t${guard(permission, item.camel)}\n\t\tthis.props.${item.camel} = ${item.camel};\n\t}`;
	}
	return `\tget ${item.camel}(): ${item.pascal}Props {\n\t\treturn this.props.${item.camel};\n\t}\n\tset ${item.camel}(${item.camel}: ${item.pascal}Props) {\n\t\t${guard(permission, item.camel)}\n\t\tthis.props.${item.camel} = ${valueCopy(item, item.camel)};\n\t}`;
}

function createdMembers(): string {
	return `\tget createdAt(): Date {\n\t\treturn this.props.createdAt;\n\t}\n\tget updatedAt(): Date {\n\t\treturn this.props.updatedAt;\n\t}\n\tget schemaVersion(): string {\n\t\treturn this.props.schemaVersion;\n\t}`;
}

function entityReference(entityPascal: string, nests: ShapeNested[]): string {
	const keys = nests.map((item) => `'${item.camel}'`).join(' | ');
	const lines = nests.map((item) => `\treadonly ${item.camel}: ${item.pascal}EntityReference;`).join('\n');
	return `export interface ${entityPascal}EntityReference extends Readonly<Omit<${entityPascal}Props, ${keys}>> {\n${lines}\n}`;
}

function guard(permission: string, name: string): string {
	return `if (!this.isNew && !this.visa.determineIf((permissions) => permissions.${permission})) {\n\t\t\tthrow new PermissionError('You do not have permission to change ${name}');\n\t\t}`;
}

function commandFields(shape: Shape, mutation: boolean): string {
	if (!mutation) return 'id: string;';
	const lines = [...shape.fields.map((field) => `${field.name}: ${tsType(field.type)};`), ...shape.nested.map((item) => `${item.camel}: ${structuralType(item)};`)];
	return lines.join('\n\t');
}

function graphqlSchema(input: { entityPascal: string; actionPascal: string; actionCamel: string; operation: string; shape: Shape }): string {
	const { entityPascal, actionPascal, actionCamel, operation, shape } = input;
	const resultName = operation === 'Query' ? `${entityPascal}${actionPascal}Result` : `${entityPascal}${actionPascal}MutationResult`;
	const result = `type ${resultName} {\n\tid: ID!\n}\n`;
	if (operation === 'Query') {
		return `input ${entityPascal}${actionPascal}Input {\n\tid: ID!\n}\n\n${result}\nextend type Query {\n\t${actionCamel}(input: ${entityPascal}${actionPascal}Input): ${resultName}!\n}\n`;
	}
	const nestedInputs = graphqlNestedInputs(entityPascal, shape.nested);
	const fields = [...shape.fields.map((field) => `\t${field.name}: ${gqlType(field.type)}`), ...shape.nested.map((item) => `\t${item.camel}: ${entityPascal}${item.pascal}Input!`)].join('\n');
	const prefix = nestedInputs.length > 0 ? `${nestedInputs}\n\n` : '';
	return `${prefix}input ${entityPascal}${actionPascal}Input {\n${fields}\n}\n\n${result}\nextend type Mutation {\n\t${actionCamel}(input: ${entityPascal}${actionPascal}Input): ${resultName}!\n}\n`;
}

function isNestedSpec(member: NestedSpec['fields'][number]): member is NestedSpec {
	return 'fields' in member;
}

function isShapeNested(member: ShapeMember): member is ShapeNested {
	return 'kind' in member;
}

function childImport(item: ShapeNested): string {
	if (item.kind === 'entity') return `import { ${item.pascal}, type ${item.pascal}EntityReference, type ${item.pascal}Props } from './${item.name}.entity.ts';`;
	const typeImport = `import type { ${item.pascal}Props } from './${item.name}.value-objects.ts';`;
	const hasString = item.fields.some((member) => !isShapeNested(member) && member.type === 'string');
	return hasString ? `${typeImport}\nimport * as ${item.pascal}Values from './${item.name}.value-objects.ts';` : typeImport;
}

function valueObjectImport(item: ShapeNested): string {
	const hasString = item.fields.some((member) => !isShapeNested(member) && member.type === 'string');
	return hasString ? `import * as ValueObjects from './${item.name}.value-objects.ts';` : '';
}

function propLines(members: ShapeMember[]): string {
	return members.map((member) => (isShapeNested(member) ? `\t${member.camel}: ${member.pascal}Props;` : `\t${member.name}: ${tsType(member.type)};`)).join('\n');
}

function valueCopy(item: ShapeNested, source: string): string {
	const parts = item.fields.map((member) => {
		if (isShapeNested(member)) {
			if (member.kind === 'entity') return `${member.camel}: ${source}.${member.camel}`;
			return `${member.camel}: ${valueCopy(member, `${source}.${member.camel}`)}`;
		}
		if (member.type === 'string') return `${member.name}: new ${item.pascal}Values.${member.pascal}(${source}.${member.name}).valueOf()`;
		return `${member.name}: ${source}.${member.name}`;
	});
	return `{ ${parts.join(', ')} }`;
}

function structuralType(item: ShapeNested): string {
	const parts = item.fields.map((member) => (isShapeNested(member) ? `${member.camel}: ${structuralType(member)}` : `${member.name}: ${tsType(member.type)}`));
	return `{ ${parts.join('; ')} }`;
}

function modelInterfaces(prefix: string, items: ShapeNested[]): string {
	const text = items
		.flatMap((item) => {
			const lines = item.fields.map((member) => (isShapeNested(member) ? `\t${member.camel}: ${prefix}${member.pascal};` : `\t${member.name}: ${tsType(member.type)};`));
			const self = `export interface ${prefix}${item.pascal} {\n${lines.join('\n')}\n}`;
			return [modelInterfaces(prefix, item.fields.filter(isShapeNested)), self];
		})
		.filter((part) => part.length > 0)
		.join('\n\n');
	return text.length > 0 ? `${text}\n` : '';
}

function mongooseMembers(item: ShapeNested, indent: string): string {
	return item.fields
		.map((member) => {
			if (isShapeNested(member)) return `${indent}\t${member.camel}: {\n${mongooseMembers(member, `${indent}\t`)}\n${indent}\t},`;
			return `${indent}\t${member.name}: ${mongooseField(member)},`;
		})
		.join('\n');
}

function graphqlNestedInputs(entityPascal: string, items: ShapeNested[]): string {
	return items
		.flatMap((item) => {
			const fields = item.fields.map((member) => (isShapeNested(member) ? `\t${member.camel}: ${entityPascal}${member.pascal}Input!` : `\t${member.name}: ${gqlType(member.type)}`));
			const self = `input ${entityPascal}${item.pascal}Input {\n${fields.join('\n')}\n}`;
			return [graphqlNestedInputs(entityPascal, item.fields.filter(isShapeNested)), self];
		})
		.filter((part) => part.length > 0)
		.join('\n\n');
}

function scalarValueObjects(names: string[], fallback: string): string {
	const classes = (names.length > 0 ? names : [fallback]).map((name) => `export class ${name} extends VOString({\n\ttrim: true,\n\tminLength: 1,\n\tmaxLength: 200,\n}) {}`).join('\n');
	return `import { VOString } from '@lucaspaganini/value-objects';\n\n${classes}\n`;
}

function tsType(type: ShapeField['type']): string {
	if (type === 'boolean') return 'boolean';
	if (type === 'date') return 'Date';
	if (type === 'number') return 'number';
	return 'string';
}

function mongooseField(field: ShapeField): string {
	if (field.type === 'boolean') return '{ type: Boolean, required: true }';
	if (field.type === 'date') return '{ type: Date, required: true }';
	if (field.type === 'number') return '{ type: Number, required: true }';
	if (field.type === 'string') return '{ type: String, required: true, minlength: 1, maxlength: 200 }';
	return '{ type: String, required: true }';
}

function gqlType(type: ShapeField['type']): string {
	if (type === 'boolean') return 'Boolean!';
	if (type === 'number') return 'Float!';
	return 'String!';
}

function assertInsideLayers(file: string, options: GenerateFeatureOptions): void {
	const roots = Object.values(options.lint.layers).map((layer) => path.join(options.root, layer));
	const posix = file.split(path.sep).join('/');
	const allowed = roots.some((layer) => posix.startsWith(layer.split(path.sep).join('/')));
	if (!allowed) throw new Error(`Generator refused to write outside a configured layer: ${posix}`);
}

async function exists(file: string): Promise<boolean> {
	try {
		await access(file);
		return true;
	} catch {
		return false;
	}
}

function camel(value: string): string {
	return value.replace(/-([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

function pascal(value: string): string {
	const next = camel(value);
	return next.slice(0, 1).toUpperCase() + next.slice(1);
}
