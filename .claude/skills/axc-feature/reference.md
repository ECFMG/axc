# axc-feature reference: validated Note slice

Generated from a throwaway `Note` feature that passed biome, typecheck, knip, the arch suite, unit tests, the
rolldown build, and the Serenity acceptance run through the Azure Functions host (in-process Mongo replica set,
seeded, transactional write). Rename `Notebook`/`Note` to your context/aggregate; keep the shapes.

## service-mongoose: model

`packages/axc/service-mongoose/src/models/note/note.model.ts`

```ts
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';

export interface Note extends MongooseSeedwork.Base {
	title: string;
	body: string;
	tags: string[];
}

const NoteSchema = new Schema<Note, Model<Note>, Note>(
	{
		title: { type: String, required: true },
		body: { type: String, required: true },
		tags: { type: [String], default: [] },
		schemaVersion: { type: String, default: '1.0.0' },
	},
	{ timestamps: true, versionKey: 'version' },
);

export const NoteModelName = 'Note';
export const NoteModelFactory = MongooseSeedwork.modelFactory<Note>(NoteModelName, NoteSchema);
export type NoteModelType = ReturnType<typeof NoteModelFactory>;
```

## service-mongoose: models context

`packages/axc/service-mongoose/src/models/index.ts`

```ts
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { NoteModelFactory } from './note/note.model.ts';

export * as Note from './note/note.model.ts';

/** All Mongoose models, bound to the connection owned by ServiceMongoose. */
export const mongooseContextBuilder = (service: MongooseSeedwork.MongooseContextFactory) => ({
	Note: NoteModelFactory(service),
});

export type ModelsContext = ReturnType<typeof mongooseContextBuilder>;
```

## service-mongoose: infrastructure service (replica set fallback + seed)

`packages/axc/service-mongoose/src/service-mongoose.ts`

```ts
import type { ServiceBase } from '@cellix/api-services-spec';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import mongoose from 'mongoose';
import { mongooseContextBuilder } from './models/index.ts';
import { seedNotes } from './seed/note.seed.ts';

export interface ServiceMongooseOptions {
	/** MongoDB connection string. When absent outside production, an in-process replica set is started and seeded. */
	connectionString: string | undefined;
	dbName: string;
	allowInMemory: boolean;
}

/**
 * Cellix infrastructure service owning the Mongoose connection. Units of work run transactions on
 * the default mongoose connection, so this service connects it, and the in-process fallback is a
 * single-node replica set (transactions need one).
 */
export class ServiceMongoose implements ServiceBase<MongooseSeedwork.MongooseContextFactory>, MongooseSeedwork.MongooseContextFactory {
	private readonly options: ServiceMongooseOptions;
	private replicaSet: MongoMemoryReplSet | undefined;

	constructor(options: ServiceMongooseOptions) {
		this.options = options;
	}

	get service(): typeof mongoose {
		return mongoose;
	}

	async startUp(): Promise<MongooseSeedwork.MongooseContextFactory> {
		let uri = this.options.connectionString;
		if (uri === undefined) {
			if (!this.options.allowInMemory) {
				throw new Error('ServiceMongoose: a MongoDB connection string is required outside local and test environments');
			}
			this.replicaSet = await MongoMemoryReplSet.create({ binary: { version: '7.0.14' }, replSet: { count: 1, storageEngine: 'wiredTiger' } });
			uri = this.replicaSet.getUri();
		}
		await mongoose.connect(uri, { dbName: this.options.dbName });
		if (this.replicaSet) {
			await seedNotes(mongooseContextBuilder(this));
		}
		return this;
	}

	async shutDown(): Promise<void> {
		await mongoose.disconnect();
		await this.replicaSet?.stop();
	}
}
```

## service-mongoose: seed

`packages/axc/service-mongoose/src/seed/note.seed.ts`

```ts
import type { ModelsContext } from '../models/index.ts';

const notes = [
	{ title: 'First note', body: 'Seeded for local and test runs.', tags: ['seed'] },
	{ title: 'Second note', body: 'Also seeded.', tags: ['seed', 'example'] },
];

export async function seedNotes(models: ModelsContext): Promise<void> {
	if ((await models.Note.countDocuments().exec()) === 0) {
		await models.Note.insertMany(notes);
	}
}
```

## service-mongoose: index

`packages/axc/service-mongoose/src/index.ts`

```ts
export * as Models from './models/index.ts';
export { type ModelsContext, mongooseContextBuilder } from './models/index.ts';
export { ServiceMongoose, type ServiceMongooseOptions } from './service-mongoose.ts';
```

## domain: seedwork namespaces

`packages/axc/domain/src/domain/seedwork/index.ts`

```ts
// The vendored @cellix/domain-seedwork exposes one subpath per concept. Re-exporting them as the
// DomainSeedwork / PassportSeedwork namespaces matches upstream Cellix usage and the Cellix
// domain conventions (which match `extends DomainSeedwork.AggregateRoot<`).
export * as DomainSeedwork from './domain-seedwork.ts';
export * as PassportSeedwork from './passport-seedwork.ts';
```

## domain: seedwork re-exports (export only what you use; knip)

`packages/axc/domain/src/domain/seedwork/domain-seedwork.ts`

```ts
export { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
export { type DomainEntityProps, PermissionError } from '@cellix/domain-seedwork/domain-entity';
export type { Repository } from '@cellix/domain-seedwork/repository';
export type { InitializedUnitOfWork, UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';
export { ValueObject } from '@cellix/domain-seedwork/value-object';
```

## domain: passport

`packages/axc/domain/src/domain/contexts/passport.ts`

```ts
import type { NoteEntityReference } from './notebook/note/note.entity.ts';
import type { NotebookDomainPermissions } from './notebook/notebook.domain-permissions.ts';
import type { NotebookVisa } from './notebook/notebook.visa.ts';

/** Grants visas per context. Aggregates ask their context's passport for a visa and check permissions through it. */
export interface Passport {
	readonly notebook: {
		forNote(root: NoteEntityReference): NotebookVisa;
	};
}

const allow =
	<T>(permissions: T) =>
	(): { determineIf(check: (permissions: Readonly<T>) => boolean): boolean } => ({ determineIf: (check) => check(permissions) });

/** The API has no end-user authentication; requests run with the system passport. */
export const PassportFactory = {
	forSystem(): Passport {
		return { notebook: { forNote: allow<NotebookDomainPermissions>({ canEditNotes: true }) } };
	},
};
```

## domain: domain permissions

`packages/axc/domain/src/domain/contexts/notebook/notebook.domain-permissions.ts`

```ts
export interface NotebookDomainPermissions {
	canEditNotes: boolean;
}
```

## domain: visa

`packages/axc/domain/src/domain/contexts/notebook/notebook.visa.ts`

```ts
import type { PassportSeedwork } from '../../seedwork/index.ts';
import type { NotebookDomainPermissions } from './notebook.domain-permissions.ts';

export interface NotebookVisa extends PassportSeedwork.Visa<NotebookDomainPermissions> {}
```

## domain: entity props

`packages/axc/domain/src/domain/contexts/notebook/note/note.entity.ts`

```ts
import type { DomainSeedwork } from '../../../seedwork/index.ts';

export interface NoteProps extends DomainSeedwork.DomainEntityProps {
	title: string;
	body: string;
	tags: string[];
	readonly createdAt: Date;
	readonly updatedAt: Date;
	readonly schemaVersion: string;
}

export interface NoteEntityReference extends Readonly<NoteProps> {}
```

## domain: value objects + domain error

`packages/axc/domain/src/domain/contexts/notebook/note/note.value-objects.ts`

```ts
import { DomainSeedwork } from '../../../seedwork/index.ts';

/** Raised when input breaks a domain invariant; application services map it to a validation error. */
export class NoteValidationError extends Error {
	readonly field: string;

	constructor(field: string, message: string) {
		super(message);
		this.name = 'NoteValidationError';
		this.field = field;
	}
}

export class NoteTitle extends DomainSeedwork.ValueObject<{ value: string }> {
	constructor(value: string) {
		const trimmed = value.trim();
		if (trimmed.length === 0 || trimmed.length > 120) {
			throw new NoteValidationError('title', 'title must be between 1 and 120 characters.');
		}
		super({ value: trimmed });
	}

	get value(): string {
		return this.props.value;
	}
}

export class NoteTags extends DomainSeedwork.ValueObject<{ value: string[] }> {
	constructor(value: readonly string[]) {
		super({ value: [...new Set(value.map((tag) => tag.trim().toLowerCase()).filter(Boolean))] });
	}

	get value(): string[] {
		return [...this.props.value];
	}
}
```

## domain: aggregate

`packages/axc/domain/src/domain/contexts/notebook/note/note.aggregate.ts`

```ts
import { DomainSeedwork } from '../../../seedwork/index.ts';
import type { Passport } from '../../passport.ts';
import type { NotebookVisa } from '../notebook.visa.ts';
import type { NoteEntityReference, NoteProps } from './note.entity.ts';
import * as ValueObjects from './note.value-objects.ts';

export interface NoteNewInput {
	title: string;
	body: string;
	tags: readonly string[];
}

export class Note<props extends NoteProps> extends DomainSeedwork.AggregateRoot<props, Passport> implements NoteEntityReference {
	private isNew = false;
	private readonly visa: NotebookVisa;

	constructor(props: props, passport: Passport) {
		super(props, passport);
		this.visa = passport.notebook.forNote(this);
	}

	public static getNewInstance<props extends NoteProps>(newProps: props, passport: Passport, input: NoteNewInput): Note<props> {
		const note = new Note(newProps, passport);
		note.isNew = true;
		note.title = input.title;
		note.body = input.body;
		note.tags = [...input.tags];
		note.isNew = false;
		return note;
	}

	get title(): string {
		return this.props.title;
	}
	set title(title: string) {
		this.ensureCanEdit();
		this.props.title = new ValueObjects.NoteTitle(title).value;
	}

	get body(): string {
		return this.props.body;
	}
	set body(body: string) {
		this.ensureCanEdit();
		this.props.body = body;
	}

	get tags(): string[] {
		return [...this.props.tags];
	}
	set tags(tags: string[]) {
		this.ensureCanEdit();
		this.props.tags = new ValueObjects.NoteTags(tags).value;
	}

	get createdAt(): Date {
		return this.props.createdAt;
	}
	get updatedAt(): Date {
		return this.props.updatedAt;
	}
	get schemaVersion(): string {
		return this.props.schemaVersion;
	}

	private ensureCanEdit(): void {
		if (!this.isNew && !this.visa.determineIf((permissions) => permissions.canEditNotes)) {
			throw new DomainSeedwork.PermissionError('You do not have permission to edit this note');
		}
	}
}
```

## domain: repository interface

`packages/axc/domain/src/domain/contexts/notebook/note/note.repository.ts`

```ts
import type { DomainSeedwork } from '../../../seedwork/index.ts';
import type { Note, NoteNewInput } from './note.aggregate.ts';
import type { NoteProps } from './note.entity.ts';

export interface NoteRepository<props extends NoteProps> extends DomainSeedwork.Repository<Note<props>> {
	getNewInstance(input: NoteNewInput): Promise<Note<props>>;
}
```

## domain: unit of work interface

`packages/axc/domain/src/domain/contexts/notebook/note/note.uow.ts`

```ts
import type { DomainSeedwork } from '../../../seedwork/index.ts';
import type { Passport } from '../../passport.ts';
import type { Note } from './note.aggregate.ts';
import type { NoteProps } from './note.entity.ts';
import type { NoteRepository } from './note.repository.ts';

export interface NoteUnitOfWork
	extends DomainSeedwork.UnitOfWork<Passport, NoteProps, Note<NoteProps>, NoteRepository<NoteProps>>,
		DomainSeedwork.InitializedUnitOfWork<Passport, NoteProps, Note<NoteProps>, NoteRepository<NoteProps>> {}
```

## domain: aggregate index

`packages/axc/domain/src/domain/contexts/notebook/note/index.ts`

```ts
export { Note, type NoteNewInput } from './note.aggregate.ts';
export type { NoteEntityReference, NoteProps } from './note.entity.ts';
export type { NoteRepository } from './note.repository.ts';
export type { NoteUnitOfWork } from './note.uow.ts';
export { NoteValidationError } from './note.value-objects.ts';
```

## domain: context index

`packages/axc/domain/src/domain/contexts/notebook/index.ts`

```ts
export * as Note from './note/index.ts';
export type { NotebookDomainPermissions } from './notebook.domain-permissions.ts';
export type { NotebookVisa } from './notebook.visa.ts';
```

## domain: contexts index

`packages/axc/domain/src/domain/contexts/index.ts`

```ts
export * as Notebook from './notebook/index.ts';
export { type Passport, PassportFactory } from './passport.ts';
```

## domain: package index (Domain namespace)

`packages/axc/domain/src/index.ts`

```ts
import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export * as Domain from './domain/index.ts';
```

## persistence: domain adapter + converter

`packages/axc/persistence/src/datasources/domain/notebook/note/note.domain-adapter.ts`

```ts
import { Domain } from '@axc/domain';
import type { Models } from '@axc/service-mongoose';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';

export class NoteDomainAdapter extends MongooseSeedwork.MongooseDomainAdapter<Models.Note.Note> implements Domain.Contexts.Notebook.Note.NoteProps {
	get title(): string {
		return this.doc.title;
	}
	set title(title: string) {
		this.doc.title = title;
	}

	get body(): string {
		return this.doc.body;
	}
	set body(body: string) {
		this.doc.body = body;
	}

	get tags(): string[] {
		return [...this.doc.tags];
	}
	set tags(tags: string[]) {
		this.doc.tags = tags;
	}
}

export class NoteConverter extends MongooseSeedwork.MongoTypeConverter<Models.Note.Note, NoteDomainAdapter, Domain.Contexts.Passport, Domain.Contexts.Notebook.Note.Note<NoteDomainAdapter>> {
	constructor() {
		super(NoteDomainAdapter, Domain.Contexts.Notebook.Note.Note);
	}
}
```

## persistence: repository

`packages/axc/persistence/src/datasources/domain/notebook/note/note.repository.ts`

```ts
import { Domain } from '@axc/domain';
import type { Models } from '@axc/service-mongoose';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { NoteDomainAdapter } from './note.domain-adapter.ts';

type NoteAggregate = Domain.Contexts.Notebook.Note.Note<NoteDomainAdapter>;

export class NoteRepository extends MongooseSeedwork.MongoRepositoryBase<Models.Note.Note, NoteDomainAdapter, Domain.Contexts.Passport, NoteAggregate> implements Domain.Contexts.Notebook.Note.NoteRepository<NoteDomainAdapter> {
	getNewInstance(input: Domain.Contexts.Notebook.Note.NoteNewInput): Promise<NoteAggregate> {
		const adapter = this.typeConverter.toAdapter(new this.model());
		return Promise.resolve(Domain.Contexts.Notebook.Note.Note.getNewInstance(adapter, this.passport, input));
	}
}
```

## persistence: unit of work

`packages/axc/persistence/src/datasources/domain/notebook/note/note.uow.ts`

```ts
import type { Domain } from '@axc/domain';
import type { Models } from '@axc/service-mongoose';
import { InProcEventBusInstance, NodeEventBusInstance } from '@cellix/event-bus-seedwork-node';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { NoteConverter } from './note.domain-adapter.ts';
import { NoteRepository } from './note.repository.ts';

export const getNoteUnitOfWork = (noteModel: Models.Note.NoteModelType, passport: Domain.Contexts.Passport): Domain.Contexts.Notebook.Note.NoteUnitOfWork => {
	const unitOfWork = new MongooseSeedwork.MongoUnitOfWork(InProcEventBusInstance, NodeEventBusInstance, noteModel, new NoteConverter(), NoteRepository);
	return MongooseSeedwork.getInitializedUnitOfWork(unitOfWork, passport);
};
```

## persistence: domain data source composition

`packages/axc/persistence/src/datasources/domain/index.ts`

```ts
import type { Domain } from '@axc/domain';
import type { ModelsContext } from '@axc/service-mongoose';
import { NotebookContextPersistence } from './notebook/index.ts';

export const DomainDataSourceImplementation = (models: ModelsContext, passport: Domain.Contexts.Passport) => ({
	Notebook: NotebookContextPersistence(models, passport),
});

export type DomainDataSource = ReturnType<typeof DomainDataSourceImplementation>;
```

## persistence: readonly base data source

`packages/axc/persistence/src/datasources/readonly/mongo-data-source.ts`

```ts
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { FilterQuery, Model, SortOrder } from 'mongoose';

interface FindOptions {
	sort?: Record<string, SortOrder>;
	skip?: number;
	limit?: number;
}

/** Read-side access to one collection: lean documents, no aggregates, no transactions. */
interface MongoDataSource<TDoc extends MongooseSeedwork.Base> {
	find(filter: FilterQuery<TDoc>, options?: FindOptions): Promise<TDoc[]>;
	count(filter: FilterQuery<TDoc>): Promise<number>;
}

export class MongoDataSourceImpl<TDoc extends MongooseSeedwork.Base> implements MongoDataSource<TDoc> {
	protected readonly model: Model<TDoc>;

	constructor(model: Model<TDoc>) {
		this.model = model;
	}

	async find(filter: FilterQuery<TDoc>, options: FindOptions = {}): Promise<TDoc[]> {
		const query = this.model.find(filter);
		if (options.sort) {
			query.sort(options.sort);
		}
		if (options.skip !== undefined) {
			query.skip(options.skip);
		}
		if (options.limit !== undefined) {
			query.limit(options.limit);
		}
		return (await query.lean<TDoc[]>().exec()) as TDoc[];
	}

	async count(filter: FilterQuery<TDoc>): Promise<number> {
		return await this.model.countDocuments(filter).exec();
	}
}
```

## persistence: readonly data source

`packages/axc/persistence/src/datasources/readonly/notebook/note/note.data.ts`

```ts
import type { Models } from '@axc/service-mongoose';
import { MongoDataSourceImpl } from '../../mongo-data-source.ts';

export class NoteDataSource extends MongoDataSourceImpl<Models.Note.Note> {}
```

## persistence: read repository

`packages/axc/persistence/src/datasources/readonly/notebook/note/note.read-repository.ts`

```ts
import type { Models } from '@axc/service-mongoose';
import type { FilterQuery } from 'mongoose';
import type { NoteDataSource } from './note.data.ts';

export interface NoteSearchCriteria {
	q?: string;
	tag?: string;
	page: number;
	pageSize: number;
}

export interface NoteReadModel {
	id: string;
	title: string;
	body: string;
	tags: string[];
	createdAt: Date;
	updatedAt: Date;
}

interface NoteReadRepository {
	search(criteria: NoteSearchCriteria): Promise<{ items: NoteReadModel[]; totalItems: number }>;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class NoteReadRepositoryImpl implements NoteReadRepository {
	private readonly dataSource: NoteDataSource;

	constructor(dataSource: NoteDataSource) {
		this.dataSource = dataSource;
	}

	async search(criteria: NoteSearchCriteria): Promise<{ items: NoteReadModel[]; totalItems: number }> {
		const filter: FilterQuery<Models.Note.Note> = {};
		if (criteria.q !== undefined) {
			const pattern = new RegExp(escapeRegExp(criteria.q), 'i');
			filter.$or = [{ title: pattern }, { body: pattern }, { tags: pattern }];
		}
		if (criteria.tag !== undefined) {
			filter.tags = criteria.tag.toLowerCase();
		}
		const [docs, totalItems] = await Promise.all([this.dataSource.find(filter, { sort: { title: 1, _id: 1 }, skip: (criteria.page - 1) * criteria.pageSize, limit: criteria.pageSize }), this.dataSource.count(filter)]);
		return {
			items: docs.map((doc) => ({ id: String(doc._id), title: doc.title, body: doc.body, tags: [...doc.tags], createdAt: doc.createdAt, updatedAt: doc.updatedAt })),
			totalItems,
		};
	}
}
```

## persistence: readonly composition

`packages/axc/persistence/src/datasources/readonly/index.ts`

```ts
import type { ModelsContext } from '@axc/service-mongoose';
import { NoteReadonlyPersistence } from './notebook/note/index.ts';

export type { NoteReadModel, NoteSearchCriteria } from './notebook/note/index.ts';

export const ReadonlyDataSourceImplementation = (models: ModelsContext) => ({
	Notebook: {
		Note: NoteReadonlyPersistence(models),
	},
});

export type ReadonlyDataSource = ReturnType<typeof ReadonlyDataSourceImplementation>;
```

## persistence: DataSources factory

`packages/axc/persistence/src/datasources/index.ts`

```ts
import { Domain } from '@axc/domain';
import { type ModelsContext, mongooseContextBuilder } from '@axc/service-mongoose';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type DomainDataSource, DomainDataSourceImplementation } from './domain/index.ts';
import { type ReadonlyDataSource, ReadonlyDataSourceImplementation } from './readonly/index.ts';

export interface DataSources {
	domainDataSource: DomainDataSource;
	readonlyDataSource: ReadonlyDataSource;
}

export interface DataSourcesFactory {
	withPassport(passport: Domain.Contexts.Passport): DataSources;
	withSystemPassport(): DataSources;
}

const dataSourcesFactory = (models: ModelsContext): DataSourcesFactory => {
	const withPassport = (passport: Domain.Contexts.Passport): DataSources => ({
		domainDataSource: DomainDataSourceImplementation(models, passport),
		readonlyDataSource: ReadonlyDataSourceImplementation(models),
	});
	return { withPassport, withSystemPassport: () => withPassport(Domain.Contexts.PassportFactory.forSystem()) };
};

/** Builds the DataSourcesFactory from the started Mongoose infrastructure service (called in apps/api setContext). */
export const Persistence = (mongooseService: MongooseSeedwork.MongooseContextFactory): DataSourcesFactory => dataSourcesFactory(mongooseContextBuilder(mongooseService));
```

## application-services: query action

`packages/axc/application-services/src/contexts/notebook/note/query-notes.ts`

```ts
import type { DataSources } from '@axc/persistence';

export interface NoteQueryCommand {
	q?: string;
	tag?: string;
	page: number;
	pageSize: number;
}

export interface NoteView {
	id: string;
	title: string;
	body: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface NotePage {
	items: NoteView[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export const queryNotes = (dataSources: DataSources) => {
	return async (command: NoteQueryCommand): Promise<NotePage> => {
		const { items, totalItems } = await dataSources.readonlyDataSource.Notebook.Note.NoteReadRepo.search(command);
		return {
			items: items.map((note) => ({ ...note, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() })),
			page: command.page,
			pageSize: command.pageSize,
			totalItems,
			totalPages: Math.ceil(totalItems / command.pageSize),
		};
	};
};
```

## application-services: mutation action

`packages/axc/application-services/src/contexts/notebook/note/create.ts`

```ts
import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import type { NoteView } from './query-notes.ts';

export interface NoteCreateCommand {
	title: string;
	body: string;
	tags: string[];
}

export type NoteCreateResult = { ok: true; value: NoteView } | { ok: false; error: { field: string; message: string } };

export const create = (dataSources: DataSources) => {
	return async (command: NoteCreateCommand): Promise<NoteCreateResult> => {
		let view: NoteView | undefined;
		try {
			await dataSources.domainDataSource.Notebook.Note.NoteUnitOfWork.withScopedTransaction(async (repo) => {
				const saved = await repo.save(await repo.getNewInstance(command));
				view = { id: saved.id, title: saved.title, body: saved.body, tags: saved.tags, createdAt: saved.createdAt.toISOString(), updatedAt: saved.updatedAt.toISOString() };
			});
		} catch (error) {
			if (error instanceof Domain.Contexts.Notebook.Note.NoteValidationError) {
				return { ok: false, error: { field: error.field, message: error.message } };
			}
			throw error;
		}
		if (!view) {
			throw new Error('Note was not saved');
		}
		return { ok: true, value: view };
	};
};
```

## application-services: aggregate index

`packages/axc/application-services/src/contexts/notebook/note/index.ts`

```ts
import type { DataSources } from '@axc/persistence';
import { create, type NoteCreateCommand, type NoteCreateResult } from './create.ts';
import { type NotePage, type NoteQueryCommand, queryNotes } from './query-notes.ts';

export type { NoteCreateCommand, NoteCreateResult } from './create.ts';
export type { NotePage, NoteQueryCommand, NoteView } from './query-notes.ts';

export interface NoteApplicationService {
	create(command: NoteCreateCommand): Promise<NoteCreateResult>;
	queryNotes(command: NoteQueryCommand): Promise<NotePage>;
}

export const Note = (dataSources: DataSources): NoteApplicationService => ({
	create: create(dataSources),
	queryNotes: queryNotes(dataSources),
});
```

## application-services: context index

`packages/axc/application-services/src/contexts/notebook/index.ts`

```ts
import type { DataSources } from '@axc/persistence';
import { Note, type NoteApplicationService } from './note/index.ts';

export type { NoteCreateCommand, NoteCreateResult, NotePage, NoteQueryCommand, NoteView } from './note/index.ts';

export interface NotebookContextApplicationService {
	Note: NoteApplicationService;
}

export const Notebook = (dataSources: DataSources): NotebookContextApplicationService => ({
	Note: Note(dataSources),
});
```

## application-services: package index

`packages/axc/application-services/src/index.ts`

```ts
import type { DataSourcesFactory } from '@axc/persistence';
import { Notebook, type NotebookContextApplicationService } from './contexts/notebook/index.ts';

export type { NoteCreateCommand, NoteCreateResult, NotePage, NoteQueryCommand, NoteView } from './contexts/notebook/index.ts';

export const HEALTH_SERVICE_NAME = 'agentCourses-api' as const;
export const HEALTH_PROJECT_CODE = 'axc' as const;

export type HealthEnvironment = 'local' | 'test' | 'production';

export interface HealthStatus {
	status: 'ok';
	service: typeof HEALTH_SERVICE_NAME;
	projectCode: typeof HEALTH_PROJECT_CODE;
	environment: HealthEnvironment;
	timestamp: string;
}

export interface ApiContext {
	environment: HealthEnvironment;
	dataSourcesFactory: DataSourcesFactory;
}

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	Notebook: NotebookContextApplicationService;
}

export interface ApplicationServicesFactory {
	forRequest(rawAuthHeader?: string): Promise<ApplicationServices>;
}

export function resolveEnvironment(nodeEnv: string | undefined): HealthEnvironment {
	if (nodeEnv === 'production') {
		return 'production';
	}
	if (nodeEnv === 'test') {
		return 'test';
	}
	return 'local';
}

export function buildApplicationServicesFactory(context: ApiContext): ApplicationServicesFactory {
	const forRequest = (): Promise<ApplicationServices> => {
		const dataSources = context.dataSourcesFactory.withSystemPassport();
		return Promise.resolve({
			health: {
				getStatus(): HealthStatus {
					return {
						status: 'ok',
						service: HEALTH_SERVICE_NAME,
						projectCode: HEALTH_PROJECT_CODE,
						environment: context.environment,
						timestamp: new Date().toISOString(),
					};
				},
			},
			Notebook: Notebook(dataSources),
		});
	};

	return { forRequest };
}
```

## application-services: unit test with a stubbed data source

`packages/axc/application-services/src/contexts/notebook/note/query-notes.test.ts`

```ts
import type { DataSources, NoteReadModel, NoteSearchCriteria } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { queryNotes } from './query-notes.ts';

function dataSourcesReturning(items: NoteReadModel[], totalItems: number, calls: NoteSearchCriteria[]): DataSources {
	const NoteReadRepo = {
		search: (criteria: NoteSearchCriteria) => {
			calls.push(criteria);
			return Promise.resolve({ items, totalItems });
		},
	};
	return { readonlyDataSource: { Notebook: { Note: { NoteReadRepo } } } } as unknown as DataSources;
}

describe('queryNotes', () => {
	it('passes the criteria to the read repository and pages the result', async () => {
		const calls: NoteSearchCriteria[] = [];
		const note = { id: 'n1', title: 'T', body: 'B', tags: ['a'], createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-02T00:00:00Z') };
		const page = await queryNotes(dataSourcesReturning([note], 11, calls))({ q: 'x', page: 2, pageSize: 5 });

		expect(calls).toStrictEqual([{ q: 'x', page: 2, pageSize: 5 }]);
		expect(page).toStrictEqual({
			items: [{ ...note, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' }],
			page: 2,
			pageSize: 5,
			totalItems: 11,
			totalPages: 3,
		});
	});
});
```

## application-services: existing health test once ApiContext has dataSourcesFactory

`packages/axc/application-services/src/health.test.ts`

```ts
import type { DataSources, DataSourcesFactory } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, resolveEnvironment } from './index.ts';

const unusedDataSources = {} as DataSources;
const dataSourcesFactory: DataSourcesFactory = { withPassport: () => unusedDataSources, withSystemPassport: () => unusedDataSources };

describe('healthcheck', () => {
	it('maps runtime environments', () => {
		expect(resolveEnvironment('production')).toBe('production');
		expect(resolveEnvironment('test')).toBe('test');
		expect(resolveEnvironment('development')).toBe('local');
		expect(resolveEnvironment(undefined)).toBe('local');
	});

	it('returns the agentCourses health contract', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory }).forRequest();
		const status = services.health.getStatus();

		expect(status.status).toBe('ok');
		expect(status.service).toBe('agentCourses-api');
		expect(status.projectCode).toBe('axc');
		expect(status.environment).toBe('test');
		expect(status.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});
});
```

## rest: routes + HTTP validation

`packages/axc/rest/src/notes.ts`

```ts
import type { ApplicationServicesFactory, NoteQueryCommand } from '@axc/application-services';
import type { Context, Hono } from 'hono';

interface FieldError {
	field: string;
	message: string;
}

const invalid = (c: Context, details: FieldError[]) => c.json({ error: { code: 'INVALID_REQUEST', message: 'One or more request values are invalid.', details } }, 400);

const servicesFor = (c: Context, factory: ApplicationServicesFactory) => {
	const authorization = c.req.header('Authorization');
	return authorization === undefined ? factory.forRequest() : factory.forRequest(authorization);
};

function positiveInteger(raw: string | undefined, fallback: number, field: string, max: number, errors: FieldError[]): number {
	if (raw === undefined) {
		return fallback;
	}
	const value = Number(raw);
	if (!/^\d+$/.test(raw) || value < 1 || value > max) {
		errors.push({ field, message: `${field} must be an integer between 1 and ${max}.` });
	}
	return value;
}

/** HTTP input parsing belongs to rest: query strings become a typed command or a 400 with every invalid field. */
function parseNoteQuery(query: Record<string, string[]>): { ok: true; value: NoteQueryCommand } | { ok: false; errors: FieldError[] } {
	const errors: FieldError[] = [];
	for (const [field, values] of Object.entries(query)) {
		if (!['q', 'tag', 'page', 'pageSize'].includes(field)) {
			errors.push({ field, message: `${field} is not a supported query parameter.` });
		} else if (values.length > 1) {
			errors.push({ field, message: `${field} may only be given once.` });
		}
	}
	// Destructuring keeps both noPropertyAccessFromIndexSignature (tsc) and useLiteralKeys (biome) satisfied.
	const { page, pageSize, q, tag }: Record<string, string | undefined> = Object.fromEntries(Object.entries(query).map(([field, values]) => [field, values[0]?.trim()]));
	const value: NoteQueryCommand = {
		page: positiveInteger(page, 1, 'page', Number.MAX_SAFE_INTEGER, errors),
		pageSize: positiveInteger(pageSize, 10, 'pageSize', 50, errors),
	};
	if (q) {
		value.q = q;
	}
	if (tag) {
		value.tag = tag;
	}
	return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
}

export function registerNoteRoutes(app: Hono, applicationServicesFactory: ApplicationServicesFactory): void {
	app.get('/api/notes', async (c) => {
		const parsed = parseNoteQuery(c.req.queries());
		if (!parsed.ok) {
			return invalid(c, parsed.errors);
		}
		const services = await servicesFor(c, applicationServicesFactory);
		return c.json(await services.Notebook.Note.queryNotes(parsed.value));
	});

	app.post('/api/notes', async (c) => {
		const body: unknown = await c.req.json().catch(() => undefined);
		if (typeof body !== 'object' || body === null) {
			return invalid(c, [{ field: 'body', message: 'Request body must be a JSON object.' }]);
		}
		const { title, body: text, tags = [] } = body as Record<string, unknown>;
		if (typeof title !== 'string' || typeof text !== 'string' || !Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) {
			return invalid(c, [{ field: 'body', message: 'title and body must be strings; tags must be an array of strings.' }]);
		}
		const services = await servicesFor(c, applicationServicesFactory);
		const result = await services.Notebook.Note.create({ title, body: text, tags });
		return result.ok ? c.json(result.value, 201) : invalid(c, [result.error]);
	});
}
```

## rest: app.request() tests

`packages/axc/rest/src/notes.test.ts`

```ts
import type { ApplicationServices, ApplicationServicesFactory, NoteQueryCommand } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

function appWith(queryNotes: (command: NoteQueryCommand) => unknown) {
	const services = { Notebook: { Note: { queryNotes: (command: NoteQueryCommand) => Promise.resolve(queryNotes(command)) } } } as unknown as ApplicationServices;
	const factory: ApplicationServicesFactory = { forRequest: () => Promise.resolve(services) };
	return createRestApp(factory);
}

describe('GET /api/notes', () => {
	it('passes defaults to the use case and returns its page', async () => {
		const seen: NoteQueryCommand[] = [];
		const response = await appWith((command) => {
			seen.push(command);
			return { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 };
		}).request('/api/notes?q=%20seed%20');

		expect(response.status).toBe(200);
		expect(seen).toStrictEqual([{ page: 1, pageSize: 10, q: 'seed' }]);
	});

	it('returns 400 with every invalid field', async () => {
		const response = await appWith(() => ({})).request('/api/notes?pageSize=51&page=0&sort=title');

		expect(response.status).toBe(400);
		const body = (await response.json()) as { error: { code: string; details: Array<{ field: string }> } };
		expect(body.error.code).toBe('INVALID_REQUEST');
		expect(body.error.details.map((detail) => detail.field).sort()).toStrictEqual(['page', 'pageSize', 'sort']);
	});
});
```

## apps/api: mongoose service config

`apps/api/src/service-config/mongoose/index.ts`

```ts
import type { ServiceMongooseOptions } from '@axc/service-mongoose';
import { environment } from '../runtime/index.ts';

const { MONGODB_CONNECTION_STRING: connectionString, MONGODB_DB_NAME: dbName } = process.env;

/** Without a connection string, local and test runs use an in-process seeded replica set; production must configure one. */
export const mongooseOptions: ServiceMongooseOptions = {
	connectionString,
	dbName: dbName ?? 'agentcourses',
	allowInMemory: environment !== 'production',
};
```

## apps/api: composition root

`apps/api/src/index.ts`

```ts
import { type ApiContext, type ApplicationServices, buildApplicationServicesFactory } from '@axc/application-services';
import { Persistence } from '@axc/persistence';
import { restHandlerCreator } from '@axc/rest';
import { ServiceMongoose } from '@axc/service-mongoose';
import { Cellix } from '@cellix/api-core';
import * as MongooseConfig from './service-config/mongoose/index.ts';
import * as RuntimeConfig from './service-config/runtime/index.ts';

Cellix.initializeInfrastructureServices<ApiContext, ApplicationServices>((serviceRegistry) => {
	serviceRegistry.registerInfrastructureService(new ServiceMongoose(MongooseConfig.mongooseOptions));
})
	.setContext((serviceRegistry) => {
		return {
			environment: RuntimeConfig.environment,
			dataSourcesFactory: Persistence(serviceRegistry.getInfrastructureService<ServiceMongoose>(ServiceMongoose)),
		};
	})
	.initializeApplicationServices((context) => buildApplicationServicesFactory(context))
	.registerAzureFunctionHttpHandler('health', { route: 'health', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.registerAzureFunctionHttpHandler('notes', { route: 'api/notes', methods: ['GET', 'POST'], authLevel: 'anonymous' }, restHandlerCreator)
	.startUp();
```

## acceptance-api: feature

`packages/axc-verification/acceptance-api/src/features/notes.feature`

```gherkin
Feature: Notes

  Scenario: GET /api/notes lists the seeded notes
    When the client lists notes
    Then the notes response has status 200
    And the notes page reports 2 total items

  Scenario: POST /api/notes persists a note
    When the client creates a note titled "Written by acceptance"
    Then the notes response has status 201
    When the client searches notes for "acceptance"
    Then the notes page reports 1 total items

  Scenario: Invalid paging returns 400
    When the client lists notes with pageSize 51
    Then the notes response has status 400
```

## acceptance-api: steps

`packages/axc-verification/acceptance-api/src/step-definitions/notes.steps.ts`

```ts
import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PostRequest, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

const actor = () => actorCalled('API client');

const totalItems = Question.about('the total number of notes', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<{ totalItems: number }>());
	return body.totalItems;
});

When('the client lists notes', () => actor().attemptsTo(Send.a(GetRequest.to('/api/notes'))));

When('the client lists notes with pageSize {int}', (pageSize: number) => actor().attemptsTo(Send.a(GetRequest.to(`/api/notes?pageSize=${pageSize}`))));

When('the client searches notes for {string}', (q: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/notes?q=${encodeURIComponent(q)}`))));

When('the client creates a note titled {string}', (title: string) => actor().attemptsTo(Send.a(PostRequest.to('/api/notes').with({ title, body: 'Created through the API host.', tags: ['acceptance'] }))));

Then('the notes response has status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the notes page reports {int} total items', (count: number) => actor().attemptsTo(Ensure.that(resolved(totalItems), equals(count))));
```

