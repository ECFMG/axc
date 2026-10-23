export function entityData(entityPascal: string, scope: string): string {
	return `import type { ${entityPascal} } from '${scope}/data-sources-mongoose-models';
import { MongoDataSourceImpl, type MongoDataSource } from '../../mongo-data-source.ts';

export interface ${entityPascal}DataSource extends MongoDataSource<${entityPascal}> {}

export class ${entityPascal}DataSourceImpl extends MongoDataSourceImpl<${entityPascal}> implements ${entityPascal}DataSource {}
`;
}

export function readRepository(input: { context: string; entity: string; entityPascal: string; contextPascal: string; scope: string }): string {
	const { context, entity, entityPascal, contextPascal, scope } = input;
	const reference = `Domain.Contexts.${contextPascal}.${entityPascal}.${entityPascal}EntityReference`;
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

export function readEntityIndex(entity: string, entityPascal: string, scope: string): string {
	return `import type { Domain } from '${scope}/domain';
import type { ModelsContext } from '${scope}/persistence';
import { get${entityPascal}ReadRepository } from './${entity}.read-repository.ts';

export type { ${entityPascal}ReadRepository } from './${entity}.read-repository.ts';

export const ${entityPascal}ReadRepositoryImpl = (models: ModelsContext, passport: Domain.Passport) => {
	return {
		${entityPascal}ReadRepo: get${entityPascal}ReadRepository(models, passport),
	};
};
`;
}

export function readContextIndex(contextPascal: string, entity: string, entityPascal: string, scope: string): string {
	return `import type { Domain } from '${scope}/domain';
import type { ModelsContext } from '${scope}/persistence';
import { ${entityPascal}ReadRepositoryImpl } from './${entity}/index.ts';

export const ${contextPascal}Context = (models: ModelsContext, passport: Domain.Passport) => ({
	${entityPascal}: ${entityPascal}ReadRepositoryImpl(models, passport),
});
`;
}

export function readonlyIndex(context: string, contextPascal: string, entity: string, entityPascal: string, scope: string): string {
	return `import type { Domain } from '${scope}/domain';
import type { ModelsContext } from '${scope}/persistence';
import { ${contextPascal}Context } from './${context}/index.ts';
import type { ${entityPascal}ReadRepository } from './${context}/${entity}/${entity}.read-repository.ts';

export interface ReadonlyDataSource {
	${contextPascal}: {
		${entityPascal}: {
			${entityPascal}ReadRepo: ${entityPascal}ReadRepository;
		};
	};
}

export const ReadonlyDataSourceImplementation = (models: ModelsContext, passport: Domain.Passport): ReadonlyDataSource => ({
	${contextPascal}: ${contextPascal}Context(models, passport),
});
`;
}
