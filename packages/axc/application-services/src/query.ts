import type { ErrorDetail } from './errors.ts';

export type QueryParameters = Readonly<Record<string, readonly string[]>>;

export function readQueryValues(query: QueryParameters, allowed: readonly string[], details: ErrorDetail[]): Map<string, string> {
	const allowedNames = new Set<string>(allowed);
	for (const key of Object.keys(query)) {
		if (!allowedNames.has(key)) {
			details.push({ field: key, message: `${key} is not a supported query parameter.` });
		}
	}

	const values = new Map<string, string>();
	for (const key of allowed) {
		const entries = query[key];
		if (entries === undefined) {
			continue;
		}
		const value = entries.length === 1 ? entries[0] : undefined;
		if (entries.length !== 1 || value === undefined) {
			details.push({ field: key, message: `${key} must be provided once.` });
			continue;
		}
		const trimmed = value.trim();
		if (trimmed === '') {
			details.push({ field: key, message: `${key} must not be empty.` });
			continue;
		}
		values.set(key, trimmed);
	}
	return values;
}
