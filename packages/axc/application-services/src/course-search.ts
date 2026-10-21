import { courseFixtures } from './course-fixtures.ts';
import type { CourseQueryError, CourseSearchResult, RawCourseQuery } from './course-types.ts';

const allowedFields = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

/** Search local sample data. Each result owns its records and tag arrays. */
export function searchCourses(query: RawCourseQuery = {}): CourseSearchResult {
	const details: CourseQueryError['error']['details'] = [];
	for (const [field, values] of Object.entries(query)) {
		if (!allowedFields.has(field)) details.push({ field, message: 'Unknown query parameter.' });
		else if (values.length !== 1) details.push({ field, message: 'Supply exactly one value.' });
	}
	const value = (field: string) => query[field]?.[0];
	const q = value('q')?.trim().toLowerCase();
	const tag = value('tag')?.trim().toLowerCase();
	for (const field of ['q', 'tag']) {
		if (value(field) !== undefined && !value(field)?.trim()) details.push({ field, message: `${field} must not be empty.` });
	}
	const modality = value('modality');
	const status = value('status');
	const sort = value('sort') ?? 'title';
	const enums: [string, string | undefined, readonly string[]][] = [
		['modality', modality, ['online', 'in-person', 'hybrid']],
		['status', status, ['draft', 'active', 'retired']],
		['sort', sort, ['title', 'createdAt', 'updatedAt']],
	];
	for (const [field, raw, allowed] of enums) {
		if (raw !== undefined && !allowed.includes(raw)) details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
	}
	const number = (field: string, fallback: number, maximum: number, message: string) => {
		const raw = value(field);
		if (raw === undefined) return fallback;
		const parsed = Number(raw);
		if (!/^[0-9]+$/.test(raw) || !Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) details.push({ field, message });
		return parsed;
	};
	const page = number('page', 1, Number.MAX_SAFE_INTEGER, 'page must be a positive safe integer.');
	const pageSize = number('pageSize', 10, 50, 'pageSize must be between 1 and 50.');
	if (details.length) return { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } };
	const matches = courseFixtures.filter(
		(course) =>
			(!q || [course.title, course.summary, ...course.tags].some((text) => text.toLowerCase().includes(q))) &&
			(!modality || course.modality === modality) &&
			(!status || course.status === status) &&
			(!tag || course.tags.some((text) => text.toLowerCase() === tag)),
	);
	const key = sort === 'createdAt' || sort === 'updatedAt' ? sort : 'title';
	matches.sort((a, b) => {
		const left = a[key].toLowerCase();
		const right = b[key].toLowerCase();
		return left < right ? -1 : left > right ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
	});
	const totalItems = matches.length;
	const totalPages = Math.ceil(totalItems / pageSize);
	const items = page > totalPages ? [] : matches.slice((page - 1) * pageSize, page * pageSize).map((course) => ({ ...course, tags: [...course.tags] }));
	return { items, page, pageSize, totalItems, totalPages };
}
