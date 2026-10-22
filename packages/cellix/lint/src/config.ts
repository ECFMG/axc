export interface CellixLintLayers {
	domain: string;
	applicationServices: string;
	persistence: string;
	models: string;
	serviceMongoose: string;
	rest: string;
	graphql: string;
}

export interface CellixLintConfig {
	scope: string;
	layers: CellixLintLayers;
	apiComposition: string;
	hostFunctions: string[];
	writable: string[];
}

export function defineCellixLint(config: CellixLintConfig): CellixLintConfig {
	return config;
}

export function defaultCellixLintConfig(): CellixLintConfig {
	return {
		scope: '@axc',
		layers: {
			domain: 'packages/axc/domain/src',
			applicationServices: 'packages/axc/application-services/src',
			persistence: 'packages/axc/persistence/src',
			models: 'packages/axc/data-sources-mongoose-models/src',
			serviceMongoose: 'packages/axc/service-mongoose/src',
			rest: 'packages/axc/rest/src',
			graphql: 'packages/axc/graphql/src',
		},
		apiComposition: 'apps/api/src/index.ts',
		hostFunctions: ['buildApplicationServicesFactory', 'resolveEnvironment'],
		writable: [
			'packages/axc/domain/src/**',
			'packages/axc/application-services/src/contexts/**',
			'packages/axc/persistence/src/datasources/**',
			'packages/axc/rest/src/**',
			'packages/axc/graphql/src/**',
			'packages/axc/data-sources-mongoose-models/src/models/**',
		],
	};
}
