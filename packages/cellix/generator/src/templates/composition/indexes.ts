export function entityBarrel(entity: string, entityPascal: string): string {
	return `export type { ${entityPascal}Repository } from './${entity}.repository.ts';\nexport { ${entityPascal}, type ${entityPascal}EntityReference, type ${entityPascal}Props } from './${entity}.aggregate.ts';\nexport type { ${entityPascal}UnitOfWork } from './${entity}.uow.ts';\nexport * as ValueObjects from './${entity}.value-objects.ts';\n`;
}

export function contextBarrel(context: string, contextPascal: string, entity: string, entityPascal: string): string {
	return `export * as ${entityPascal} from './${entity}/index.ts';\nexport type { ${contextPascal}DomainPermissions } from './${context}.domain-permissions.ts';\nexport type { ${contextPascal}Visa } from './${context}.visa.ts';\n`;
}

export function contextsBarrel(context: string, contextPascal: string): string {
	return `export * as ${contextPascal} from './${context}/index.ts';\n`;
}

export function domainBarrel(): string {
	return `export * as Contexts from './contexts/index.ts';\nexport { type Passport, PassportFactory } from './contexts/passport.ts';\n`;
}

export function modelsIndex(entity: string, entityPascal: string): string {
	return `import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';\nimport { ${entityPascal}ModelFactory } from './models/${entity}/${entity}.model.ts';\n\nexport type { ${entityPascal}, ${entityPascal}ModelType } from './models/${entity}/${entity}.model.ts';\n\nexport const mongooseContextBuilder = (initializedService: MongooseSeedwork.MongooseContextFactory) => {\n\treturn {\n\t\t${entityPascal}: ${entityPascal}ModelFactory(initializedService),\n\t};\n};\n`;
}

export function entityPersistence(scope: string, entity: string, entityPascal: string): string {
	return `import type { Domain } from '${scope}/domain';\nimport type { ModelsContext } from '${scope}/persistence';\nimport { get${entityPascal}UnitOfWork } from './${entity}.uow.ts';\n\nexport const ${entityPascal}Persistence = (models: ModelsContext, passport: Domain.Passport) => {\n\tconst ${entityPascal}Model = models.${entityPascal};\n\treturn {\n\t\t${entityPascal}UnitOfWork: get${entityPascal}UnitOfWork(${entityPascal}Model, passport),\n\t};\n};\n`;
}

export function contextPersistence(scope: string, contextPascal: string, entity: string, entityPascal: string): string {
	return `import type { Domain } from '${scope}/domain';\nimport type { ModelsContext } from '${scope}/persistence';\nimport * as ${entityPascal} from './${entity}/index.ts';\n\nexport const ${contextPascal}ContextPersistence = (models: ModelsContext, passport: Domain.Passport) => ({\n\t${entityPascal}: ${entityPascal}.${entityPascal}Persistence(models, passport),\n});\n`;
}

export function domainDataSourceIndex(scope: string, context: string, contextPascal: string): string {
	return `import type { Domain, DomainDataSource } from '${scope}/domain';\nimport type { ModelsContext } from '${scope}/persistence';\nimport { ${contextPascal}ContextPersistence } from './${context}/index.ts';\n\nexport const DomainDataSourceImplementation = (models: ModelsContext, passport: Domain.Passport): DomainDataSource => ({\n\t${contextPascal}: ${contextPascal}ContextPersistence(models, passport),\n});\n`;
}

export function dataSourcesIndex(scope: string): string {
	return `import { Domain, type DomainDataSource } from '${scope}/domain';\nimport type { ModelsContext } from '${scope}/persistence';\nimport { DomainDataSourceImplementation } from './domain/index.ts';\nimport { type ReadonlyDataSource, ReadonlyDataSourceImplementation } from './readonly/index.ts';\n\nexport type DataSources = {\n\tdomainDataSource: DomainDataSource;\n\treadonlyDataSource: ReadonlyDataSource;\n};\n\nexport type DataSourcesFactory = {\n\twithPassport: (passport: Domain.Passport) => DataSources;\n\twithSystemPassport: () => DataSources;\n};\n\nexport const DataSourcesFactoryImpl = (models: ModelsContext): DataSourcesFactory => {\n\tconst withPassport = (passport: Domain.Passport): DataSources => {\n\t\treturn {\n\t\t\tdomainDataSource: DomainDataSourceImplementation(models, passport),\n\t\t\treadonlyDataSource: ReadonlyDataSourceImplementation(models, passport),\n\t\t};\n\t};\n\tconst withSystemPassport = (): DataSources => withPassport(Domain.PassportFactory.forSystem());\n\treturn { withPassport, withSystemPassport };\n};\n`;
}

export function persistenceRoot(scope: string): string {
	return `import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';\nimport { mongooseContextBuilder } from '${scope}/data-sources-mongoose-models';\nimport { DataSourcesFactoryImpl } from './datasources/index.ts';\n\nexport type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';\nexport type ModelsContext = ReturnType<typeof mongooseContextBuilder>;\nexport type { DataSources, DataSourcesFactory } from './datasources/index.ts';\n\nexport const Persistence = (initializedService: MongooseSeedwork.MongooseContextFactory) => {\n\tif (!initializedService?.service) {\n\t\tthrow new Error('MongooseSeedwork.MongooseContextFactory is required');\n\t}\n\tconst models: ModelsContext = {\n\t\t...mongooseContextBuilder(initializedService),\n\t};\n\treturn DataSourcesFactoryImpl(models);\n};\n`;
}

export function contextApplication(scope: string, contextPascal: string, entity: string, entityPascal: string): string {
	return `import type { DataSources } from '${scope}/persistence';\nimport { ${entityPascal} as ${entityPascal}Api, type ${entityPascal}ApplicationService } from './${entity}/index.ts';\n\nexport interface ${contextPascal}ContextApplicationService {\n\t${entityPascal}: ${entityPascal}ApplicationService;\n}\n\nexport const ${contextPascal} = (dataSources: DataSources): ${contextPascal}ContextApplicationService => {\n\treturn {\n\t\t${entityPascal}: ${entityPascal}Api(dataSources),\n\t};\n};\n`;
}
