import type { Shape } from '../../shape.ts';
import { namespacePath, structuralType, tsType } from '../../text.ts';

export function persistenceRepository(input: { entity: string; entityPascal: string; contextPascal: string; scope: string; shape: Shape }): string {
	const { entity, entityPascal, contextPascal, scope, shape } = input;
	const domainPath = namespacePath(contextPascal, entityPascal);
	const inputType = `{ ${[...shape.fields.map((field) => `${field.name}: ${tsType(field.type)}`), ...shape.nested.map((item) => `${item.camel}: ${structuralType(item)}`)].join('; ')} }`;
	return `import type { ${entityPascal} } from '${scope}/data-sources-mongoose-models';
import { Domain } from '${scope}/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { ${entityPascal}DomainAdapter } from './${entity}.domain-adapter.ts';

export class ${entityPascal}Repository extends MongooseSeedwork.MongoRepositoryBase<${entityPascal}, ${entityPascal}DomainAdapter, Domain.Passport, Domain.Contexts.${domainPath}<${entityPascal}DomainAdapter>> implements Domain.Contexts.${domainPath}Repository<${entityPascal}DomainAdapter> {
	async getById(id: string): Promise<Domain.Contexts.${domainPath}<${entityPascal}DomainAdapter>> {
		const document = await this.model.findById(id).exec();
		if (!document) {
			throw new Error(\`${entityPascal} with id \${id} not found\`);
		}
		return this.typeConverter.toDomain(document, this.passport);
	}

	getNewInstance(input: ${inputType}): Promise<Domain.Contexts.${domainPath}<${entityPascal}DomainAdapter>> {
		const adapter = this.typeConverter.toAdapter(new this.model());
		return Promise.resolve(Domain.Contexts.${domainPath}.getNewInstance(adapter, input, this.passport));
	}
}
`;
}
