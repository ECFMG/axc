import { courseFixtures } from './course-fixtures.ts';
import type { Course, CourseSearchResult } from './course-types.ts';

const choices = {
	modality: ['online', 'in-person', 'hybrid'],
	status: ['draft', 'active', 'retired'],
	sort: ['title', 'createdAt', 'updatedAt'],
} as const;
const allowed = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

export function searchCourses(query: URLSearchParams = new URLSearchParams()): CourseSearchResult {
	const details: { field: string; message: string }[] = [];
	for (const field of new Set(query.keys())) {
		if (!allowed.has(field)) details.push({ field, message: 'Unknown query parameter.' });
		if (query.getAll(field).length > 1) details.push({ field, message: 'Query parameter must occur only once.' });
	}
	for (const [field, values] of Object.entries(choices)) {
		const value = query.get(field);
		if (value !== null && !(values as readonly string[]).includes(value)) {
			details.push({ field, message: `${field} must be one of: ${values.join(', ')}.` });
		}
	}
	const page = Number(query.get('page') ?? '1');
	const pageSize = Number(query.get('pageSize') ?? '10');
	for (const [field, value] of [
		['page', page],
		['pageSize', pageSize],
	] as const) {
		const raw = query.get(field);
		if ((raw !== null && !/^[0-9]+$/.test(raw)) || !Number.isSafeInteger(value) || value < 1 || (field === 'pageSize' && value > 50)) {
			details.push({ field, message: field === 'pageSize' ? 'pageSize must be between 1 and 50.' : 'page must be a positive safe integer.' });
		}
	}
	if (details.length > 0) {
		return { status: 400, body: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } } };
	}
	const q = (query.get('q') ?? '').trim().toLowerCase();
	const tag = (query.get('tag') ?? '').trim().toLowerCase();
	const modality = query.get('modality');
	const status = query.get('status');
	const sort = (query.get('sort') ?? 'title') as 'title' | 'createdAt' | 'updatedAt';
	const matches = courseFixtures.filter(
		(course) =>
			(!q || [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(q))) &&
			(!modality || course.modality === modality) &&
			(!status || course.status === status) &&
			(!tag || course.tags.some((value) => value.toLowerCase() === tag)),
	);
	matches.sort((a, b) => compare(a[sort].toLowerCase(), b[sort].toLowerCase()) || compare(a.id, b.id));
	const offset = (page - 1) * pageSize;
	const items: Course[] = matches.slice(offset, offset + pageSize).map((course) => ({ ...course, tags: [...course.tags] }));
	return { status: 200, body: { items, page, pageSize, totalItems: matches.length, totalPages: Math.ceil(matches.length / pageSize) } };
}

function compare(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}
