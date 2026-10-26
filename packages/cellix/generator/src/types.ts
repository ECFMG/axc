import type { CellixLintConfig } from '@cellix/lint';
import type { FieldSpec, NestedSpec } from './spec.ts';

export interface GenerateFeatureOptions {
	root: string;
	lint: CellixLintConfig;
	context: string;
	entity: string;
	action: string;
	/** Set by the query and update commands. The action name stays whatever --name is. */
	operation?: 'query' | 'update';
	/** Command fields for a query or update. Aggregate fields stay on `fields`. */
	params?: FieldSpec[];
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
