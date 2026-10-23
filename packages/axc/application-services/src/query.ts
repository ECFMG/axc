import type { ApiFieldError } from './errors.ts';

export type RawQuery = {
	readonly [key: string]: readonly string[] | undefined;
};

export interface QueryParam {
	value: string | undefined;
	duplicate: boolean;
}

export function readQueryParam(query: RawQuery, field: string): QueryParam {
	const values = query[field];
	if (values === undefined || values.length === 0) {
		return { value: undefined, duplicate: false };
	}
	if (values.length > 1) {
		return { value: undefined, duplicate: true };
	}
	const value = values[0];
	return { value, duplicate: false };
}

export function pushDuplicate(errors: ApiFieldError[], field: string): void {
	errors.push({ field, message: `${field} must be provided once.` });
}
