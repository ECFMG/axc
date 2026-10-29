import type { GenerateFeatureOptions } from './types.ts';

/** The files a person still has to fill in. Barrels are already wired. */
export function filesToEdit(options: GenerateFeatureOptions): string[] {
	const { lint, context, entity, action, operation, transport, resolver } = options;
	const aggregate = `${lint.layers.domain}/domain/contexts/${context}/${entity}/${entity}.aggregate.ts`;
	const seed = `${lint.layers.models}/models/${entity}/${entity}.seed.ts`;
	if (!action) return [aggregate, seed];
	const actionFile = `${lint.layers.applicationServices}/contexts/${context}/${entity}/${action}.ts`;
	const files = [actionFile];
	if (operation === 'query') {
		files.push(`${lint.layers.persistence}/datasources/readonly/${context}/${entity}/${entity}.read-repository.ts`);
	} else {
		files.push(aggregate);
	}
	if ((operation === 'query' || operation === 'update') && transport === 'rest') {
		files.push(`${lint.layers.rest}/index.ts`);
	} else if (resolver === true || transport === 'graphql') {
		files.push(`${lint.layers.graphql}/schema/types/${entity}.resolvers.ts`);
	}
	if (operation !== 'query') files.push(seed);
	return files;
}
