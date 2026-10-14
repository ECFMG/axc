import { courseFixtures } from './course-fixtures.ts';
import type { Course, CoursePage, CourseQueryError } from './course-types.ts';

const enumValues = {
	modality: ['online', 'in-person', 'hybrid'],
	status: ['draft', 'active', 'retired'],
	sort: ['title', 'createdAt', 'updatedAt'],
} as const;
const supportedFields = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];

export function searchCourses(query: URLSearchParams): CoursePage | CourseQueryError {
	const details: CourseQueryError['error']['details'] = [];
	for (const field of new Set(query.keys())) {
		if (!supportedFields.includes(field)) {
			details.push({ field, message: `Unknown query parameter: ${field}.` });
		} else if (query.getAll(field).length !== 1) {
			details.push({ field, message: `${field} must appear once.` });
		}
	}
	for (const [field, values] of Object.entries(enumValues)) {
		const value = query.get(field);
		if (value !== null && !(values as readonly string[]).includes(value)) {
			details.push({ field, message: `${field} must be one of: ${values.join(', ')}.` });
		}
	}
	const readInteger = (field: string, fallback: number, maximum: number): number => {
		const raw = query.get(field);
		if (raw === null) return fallback;
		const value = Number(raw);
		if (!/^[0-9]+$/.test(raw) || !Number.isSafeInteger(value) || value < 1 || value > maximum) {
			details.push({ field, message: field === 'pageSize' ? 'pageSize must be between 1 and 50.' : 'page must be a positive safe integer.' });
		}
		return value;
	};
	const page = readInteger('page', 1, Number.MAX_SAFE_INTEGER);
	const pageSize = readInteger('pageSize', 10, 50);
	if (details.length) {
		return { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } };
	}

	const keyword = (query.get('q') ?? '').trim().toLowerCase();
	const tag = query.get('tag')?.trim().toLowerCase();
	const modality = query.get('modality');
	const status = query.get('status');
	const sort = (query.get('sort') ?? 'title') as 'title' | 'createdAt' | 'updatedAt';
	const matches = courseFixtures.filter(
		(course) =>
			(!keyword || [course.title, course.summary, ...course.tags].some((text) => text.toLowerCase().includes(keyword))) &&
			(modality === null || course.modality === modality) &&
			(status === null || course.status === status) &&
			(tag === undefined || course.tags.some((value) => value.toLowerCase() === tag)),
	);
	matches.sort((left, right) => {
		const a = left[sort].toLowerCase();
		const b = right[sort].toLowerCase();
		if (a < b) return -1;
		if (a > b) return 1;
		return left.id.localeCompare(right.id);
	});
	const offset = (page - 1) * pageSize;
	// Copy results so callers cannot mutate the shared local catalog.
	const items: Course[] = matches.slice(offset, offset + pageSize).map((course) => ({ ...course, tags: [...course.tags] }));
	return { items, page, pageSize, totalItems: matches.length, totalPages: Math.ceil(matches.length / pageSize) };
}
