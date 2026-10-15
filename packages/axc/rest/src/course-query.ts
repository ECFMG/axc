import type { CourseSearch } from '@axc/application-services';

export interface QueryErrorDetail {
	field: string;
	message: string;
}

export function parseCourseQuery(params: URLSearchParams): { query: CourseSearch; details: QueryErrorDetail[] } {
	const details: QueryErrorDetail[] = [];
	const allowed = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];
	for (const field of new Set(params.keys())) {
		if (!allowed.includes(field)) details.push({ field, message: 'Unknown query parameter.' });
		else if (params.getAll(field).length > 1) details.push({ field, message: 'Query parameter must occur only once.' });
	}
	const enumeration = <T extends string>(field: string, values: readonly T[], fallback?: T): T | undefined => {
		const value = params.get(field);
		if (value === null) return fallback;
		const match = values.find((candidate) => candidate === value);
		if (match === undefined) details.push({ field, message: `${field} must be one of: ${values.join(', ')}.` });
		return match;
	};
	const integer = (field: string, fallback: number, max: number): number => {
		const value = params.get(field);
		if (value === null) return fallback;
		const parsed = Number(value);
		if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
			details.push({ field, message: `${field} must be between 1 and ${max}.` });
		}
		return parsed;
	};
	return {
		query: {
			q: params.get('q')?.trim(),
			tag: params.get('tag')?.trim(),
			modality: enumeration('modality', ['online', 'in-person', 'hybrid'] as const),
			status: enumeration('status', ['draft', 'active', 'retired'] as const),
			page: integer('page', 1, Number.MAX_SAFE_INTEGER),
			pageSize: integer('pageSize', 10, 50),
			sort: enumeration('sort', ['title', 'createdAt', 'updatedAt'] as const, 'title') ?? 'title',
		},
		details,
	};
}
