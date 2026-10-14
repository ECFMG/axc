import type { CourseQuery } from '@axc/application-services';

const allowedFields = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];

export function parseCourseQuery(parameters: URLSearchParams): { query: CourseQuery; error?: never } | { query?: never; error: { code: 'INVALID_QUERY_PARAMETER'; message: string; details: { field: string; message: string }[] } } {
	const details: { field: string; message: string }[] = [];
	for (const field of new Set(parameters.keys())) {
		if (!allowedFields.includes(field)) details.push({ field, message: 'Unknown query parameter.' });
		else if (parameters.getAll(field).length > 1) details.push({ field, message: 'Query parameter must appear only once.' });
	}
	const enumValue = <T extends string>(field: string, allowed: readonly T[], fallback?: T): T | undefined => {
		const value = parameters.get(field);
		if (value === null) return fallback;
		const match = allowed.find((item) => item === value);
		if (match === undefined) details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
		return match;
	};
	const integer = (field: string, fallback: number, max: number): number => {
		const value = parameters.get(field);
		if (value === null) return fallback;
		const number = Number(value);
		if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(number) || number < 1 || number > max) {
			details.push({ field, message: field === 'pageSize' ? 'pageSize must be between 1 and 50.' : 'page must be a positive safe integer.' });
		}
		return number;
	};
	const modality = enumValue('modality', ['online', 'in-person', 'hybrid'] as const);
	const status = enumValue('status', ['draft', 'active', 'retired'] as const);
	const sort = enumValue('sort', ['title', 'createdAt', 'updatedAt'] as const, 'title');
	const page = integer('page', 1, Number.MAX_SAFE_INTEGER);
	const pageSize = integer('pageSize', 10, 50);
	if (details.length > 0 || sort === undefined) {
		return { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } };
	}
	const q = parameters.get('q')?.trim();
	const tag = parameters.get('tag')?.trim();
	return { query: { page, pageSize, sort, ...(q ? { q } : {}), ...(tag ? { tag } : {}), ...(modality ? { modality } : {}), ...(status ? { status } : {}) } };
}
