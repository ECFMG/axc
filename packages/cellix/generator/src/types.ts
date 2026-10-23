import type { CellixLintConfig } from '@cellix/lint';
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
