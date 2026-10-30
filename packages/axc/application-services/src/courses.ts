import { type CourseEntityReference, type CourseModality, type CourseRepository, type CourseStatus, isCourseModality, isCourseStatus } from '@axc/domain';

const SORTS = ['title', 'createdAt', 'updatedAt'] as const;
type CourseSort = (typeof SORTS)[number];
const ALLOWED = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

export interface CourseSearchPage {
	items: CourseEntityReference[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface QueryError {
	error: { code: 'INVALID_QUERY_PARAMETER'; message: string; details: { field: string; message: string }[] };
}

export type CourseSearchResult = { ok: true; value: CourseSearchPage } | { ok: false; value: QueryError };

const positiveInt = (raw: string | undefined, fallback: number): number => (raw === undefined ? fallback : /^\d+$/.test(raw) ? Number(raw) : Number.NaN);

export async function searchCourses(repository: CourseRepository, query: Record<string, string>): Promise<CourseSearchResult> {
	const details: { field: string; message: string }[] = [];
	for (const key of Object.keys(query)) if (!ALLOWED.has(key)) details.push({ field: key, message: `${key} is not a supported query parameter.` });

	const modality = query['modality'];
	if (modality !== undefined && !isCourseModality(modality)) details.push({ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' });
	const status = query['status'];
	if (status !== undefined && !isCourseStatus(status)) details.push({ field: 'status', message: 'status must be one of draft, active, retired.' });
	const sort = query['sort'] ?? 'title';
	if (!(SORTS as readonly string[]).includes(sort)) details.push({ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' });
	const page = positiveInt(query['page'], 1);
	if (!(page >= 1)) details.push({ field: 'page', message: 'page must be an integer of at least 1.' });
	const pageSize = positiveInt(query['pageSize'], 10);
	if (!(pageSize >= 1 && pageSize <= 50)) details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });

	if (details.length > 0) return { ok: false, value: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } } };

	const q = query['q']?.trim().toLowerCase();
	const tag = query['tag']?.toLowerCase();
	const key = sort as CourseSort;
	const matches = (await repository.getAll())
		.map((c) => c.toReference())
		.filter(
			(c) =>
				(!q || c.title.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q))) &&
				(modality === undefined || c.modality === (modality as CourseModality)) &&
				(status === undefined || c.status === (status as CourseStatus)) &&
				(tag === undefined || c.tags.some((t) => t.toLowerCase() === tag)),
		)
		.sort((a, b) => a[key].localeCompare(b[key]) || a.id.localeCompare(b.id));

	return {
		ok: true,
		value: { items: matches.slice((page - 1) * pageSize, page * pageSize), page, pageSize, totalItems: matches.length, totalPages: Math.ceil(matches.length / pageSize) },
	};
}
