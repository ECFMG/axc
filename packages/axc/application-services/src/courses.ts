import { type CourseEntityReference, type CourseRepository, isCourseStatus, isModality } from '@axc/domain';
import { InMemoryCourseRepository } from '@axc/persistence';

const SORTS = ['title', 'createdAt', 'updatedAt'] as const;
type CourseSort = (typeof SORTS)[number];

export interface CourseSearchResult {
	items: CourseEntityReference[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface QueryParameterError {
	field: string;
	message: string;
}

export type CourseSearchOutcome = { ok: true; result: CourseSearchResult } | { ok: false; details: QueryParameterError[] };

const ALLOWED = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

function toBoundedInt(value: string | undefined, fallback: number, max: number): number | undefined {
	if (value === undefined) return fallback;
	if (!/^\d+$/.test(value)) return undefined;
	const n = Number(value);
	return n >= 1 && n <= max ? n : undefined;
}

export function buildCourseService(repository: CourseRepository = new InMemoryCourseRepository()) {
	return {
		async search(query: Record<string, string>): Promise<CourseSearchOutcome> {
			const details: QueryParameterError[] = [];
			for (const field of Object.keys(query)) {
				if (!ALLOWED.has(field)) details.push({ field, message: `${field} is not a supported query parameter.` });
			}
			const { q, modality, status, tag, sort = 'title' } = query;
			if (modality !== undefined && !isModality(modality)) details.push({ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' });
			if (status !== undefined && !isCourseStatus(status)) details.push({ field: 'status', message: 'status must be one of draft, active, retired.' });
			const page = toBoundedInt(query['page'], 1, Number.MAX_SAFE_INTEGER);
			if (page === undefined) details.push({ field: 'page', message: 'page must be a positive integer.' });
			const pageSize = toBoundedInt(query['pageSize'], 10, 50);
			if (pageSize === undefined) details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
			if (!(SORTS as readonly string[]).includes(sort)) details.push({ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' });
			if (details.length > 0 || page === undefined || pageSize === undefined) return { ok: false, details };

			const key = sort as CourseSort;
			const matches = (await repository.getAll())
				.filter((c) => (q ? c.matchesKeyword(q) : true) && (modality ? c.props.modality === modality : true) && (status ? c.props.status === status : true) && (tag ? c.hasTag(tag) : true))
				.map((c) => c.toReference())
				.sort((a, b) => a[key].localeCompare(b[key]) || a.id.localeCompare(b.id));
			return {
				ok: true,
				result: {
					items: matches.slice((page - 1) * pageSize, page * pageSize),
					page,
					pageSize,
					totalItems: matches.length,
					totalPages: Math.ceil(matches.length / pageSize),
				},
			};
		},
	};
}

export type CourseService = ReturnType<typeof buildCourseService>;
