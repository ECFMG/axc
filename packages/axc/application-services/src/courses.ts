import { COURSE_MODALITIES, COURSE_SORTS, COURSE_STATUSES, type Course, type CourseRepository, DomainError, type ErrorDetail } from '@axc/domain';

export interface CourseSearchResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

const oneOf = (values: readonly string[], value: string | undefined): boolean => value === undefined || values.includes(value);
const intIn = (value: string | undefined, min: number, max: number): boolean => value === undefined || (/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max);

export async function searchCourses(courses: CourseRepository, query: Record<string, string | undefined>): Promise<CourseSearchResult> {
	const { q, modality, status, tag, page = '1', pageSize = '10', sort = 'title' } = query;
	const details: ErrorDetail[] = [];
	if (!oneOf(COURSE_MODALITIES, modality)) details.push({ field: 'modality', message: `modality must be one of ${COURSE_MODALITIES.join(', ')}.` });
	if (!oneOf(COURSE_STATUSES, status)) details.push({ field: 'status', message: `status must be one of ${COURSE_STATUSES.join(', ')}.` });
	if (!oneOf(COURSE_SORTS, sort)) details.push({ field: 'sort', message: `sort must be one of ${COURSE_SORTS.join(', ')}.` });
	if (!intIn(page, 1, Number.MAX_SAFE_INTEGER)) details.push({ field: 'page', message: 'page must be a positive integer.' });
	if (!intIn(pageSize, 1, 50)) details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
	if (details.length > 0) throw new DomainError('INVALID_QUERY_PARAMETER', 'One or more query parameters are invalid.', details);

	const needle = q?.toLowerCase();
	const wantedTag = tag?.toLowerCase();
	const sortKey = sort as (typeof COURSE_SORTS)[number];
	const matches = (await courses.list())
		.filter(
			(c) =>
				(!needle || c.title.toLowerCase().includes(needle) || c.summary.toLowerCase().includes(needle) || c.tags.some((t) => t.toLowerCase().includes(needle))) &&
				(!modality || c.modality === modality) &&
				(!status || c.status === status) &&
				(!wantedTag || c.tags.some((t) => t.toLowerCase() === wantedTag)),
		)
		.sort((a, b) => a[sortKey].localeCompare(b[sortKey]));

	const pageNumber = Number(page);
	const size = Number(pageSize);
	return {
		items: matches.slice((pageNumber - 1) * size, pageNumber * size),
		page: pageNumber,
		pageSize: size,
		totalItems: matches.length,
		totalPages: Math.ceil(matches.length / size),
	};
}
