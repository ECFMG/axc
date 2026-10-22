import type { FieldError } from './errors.ts';

export type RawQuery = Readonly<Record<string, string | readonly string[] | undefined>>;

export function readSingle(query: RawQuery, field: string, details: FieldError[]): string | undefined {
	if (!Object.hasOwn(query, field)) {
		return undefined;
	}
	const value = query[field];
	if (typeof value === 'string') {
		return value;
	}
	if (value === undefined || value.length === 0) {
		return undefined;
	}
	if (value.length > 1) {
		details.push({ field, message: `${field} must be provided once.` });
		return undefined;
	}
	return value[0] ?? '';
}
