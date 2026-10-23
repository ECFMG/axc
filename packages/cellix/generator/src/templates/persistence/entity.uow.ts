import { namespacePath } from '../../text.ts';

export function persistenceUnitOfWork(input: { entity: string; entityPascal: string; contextPascal: string; scope: string }): string {
	const { entity, entityPascal, contextPascal, scope } = input;
	const domainPath = namespacePath(contextPascal, entityPascal);
	return `import { InProcEventBusInstance, NodeEventBusInstance } from '@cellix/event-bus-seedwork-node';
import type { ${entityPascal}ModelType } from '${scope}/data-sources-mongoose-models';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { Domain } from '${scope}/domain';
import { ${entityPascal}Converter } from './${entity}.domain-adapter.ts';
import { ${entityPascal}Repository } from './${entity}.repository.ts';

export const get${entityPascal}UnitOfWork = (model: ${entityPascal}ModelType, passport: Domain.Passport): Domain.Contexts.${domainPath}UnitOfWork => {
	const unitOfWork = new MongooseSeedwork.MongoUnitOfWork(InProcEventBusInstance, NodeEventBusInstance, model, new ${entityPascal}Converter(), ${entityPascal}Repository);
	return MongooseSeedwork.getInitializedUnitOfWork(unitOfWork, passport);
};
`;
}
