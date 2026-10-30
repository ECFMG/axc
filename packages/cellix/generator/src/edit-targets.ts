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

/** Files the timed agent may read. Barrels, manifests, and tsconfig stay off this list. A failing check names any other file. */
export function readsForEdit(options: GenerateFeatureOptions): string[] {
	const { lint, context, entity } = options;
	const acceptance = lint.acceptance;
	const behavior = [
		`${lint.layers.domain}/domain/contexts/${context}/${entity}/${entity}.value-objects.ts`,
		...(acceptance ? [`${acceptance}/infrastructure.ts`, `${acceptance}/cucumber-lifecycle-hooks.ts`, `${acceptance}/features/`, `${acceptance}/step-definitions/`] : []),
		...(lint.apiComposition ? [lint.apiComposition] : []),
		'apps/docs/',
		'AGENTS.md',
		'.agents/skills/cellix-architecture/SKILL.md',
		'.agents/skills/cellix-architecture/REFERENCE.md',
		'cellix-lint.config.json',
	];
	return [...new Set([...filesToEdit(options), ...behavior])];
}
