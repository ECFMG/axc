/** Course catalog model, seed fixture, query validation and search. */

export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

export type CourseModality = (typeof COURSE_MODALITIES)[number];
export type CourseStatus = (typeof COURSE_STATUSES)[number];
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface CourseQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface QueryParameterError {
	field: string;
	message: string;
}

export type CourseQueryParseResult = { ok: true; query: CourseQuery } | { ok: false; errors: QueryParameterError[] };

/** Raw, unvalidated query string values as delivered by the HTTP layer. */
export interface CourseQueryParameters {
	q?: string | undefined;
	modality?: string | undefined;
	status?: string | undefined;
	tag?: string | undefined;
	page?: string | undefined;
	pageSize?: string | undefined;
	sort?: string | undefined;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;
export const DEFAULT_SORT: CourseSortField = 'title';

export const INVALID_QUERY_PARAMETER = 'INVALID_QUERY_PARAMETER' as const;
export const INVALID_QUERY_PARAMETER_MESSAGE = 'One or more query parameters are invalid.' as const;

/** Error body returned for any request that fails {@link parseCourseQuery}. */
export interface CourseQueryErrorResponse {
	error: {
		code: typeof INVALID_QUERY_PARAMETER;
		message: typeof INVALID_QUERY_PARAMETER_MESSAGE;
		details: QueryParameterError[];
	};
}

export function courseQueryErrorResponse(errors: QueryParameterError[]): CourseQueryErrorResponse {
	return { error: { code: INVALID_QUERY_PARAMETER, message: INVALID_QUERY_PARAMETER_MESSAGE, details: errors } };
}

function optionalText(raw: string | undefined): string | undefined {
	const value = raw?.trim();
	return value === undefined || value === '' ? undefined : value;
}

function parseEnum<T extends string>(field: string, raw: string | undefined, allowed: readonly T[], errors: QueryParameterError[]): T | undefined {
	const value = optionalText(raw);
	if (value === undefined) {
		return undefined;
	}
	if ((allowed as readonly string[]).includes(value)) {
		return value as T;
	}
	errors.push({ field, message: `${field} must be one of ${allowed.join(', ')}.` });
	return undefined;
}

function parseInteger(field: string, raw: string | undefined, fallback: number, min: number, max: number, message: string, errors: QueryParameterError[]): number {
	const value = optionalText(raw);
	if (value === undefined) {
		return fallback;
	}
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
		errors.push({ field, message });
		return fallback;
	}
	return parsed;
}

/** Validates raw query string values. Every invalid parameter is reported, not just the first. */
export function parseCourseQuery(params: CourseQueryParameters): CourseQueryParseResult {
	const errors: QueryParameterError[] = [];
	const modality = parseEnum('modality', params.modality, COURSE_MODALITIES, errors);
	const status = parseEnum('status', params.status, COURSE_STATUSES, errors);
	const sort = parseEnum('sort', params.sort, COURSE_SORT_FIELDS, errors) ?? DEFAULT_SORT;
	const page = parseInteger('page', params.page, DEFAULT_PAGE, 1, Number.MAX_SAFE_INTEGER, 'page must be an integer greater than or equal to 1.', errors);
	const pageSize = parseInteger('pageSize', params.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE, `pageSize must be between 1 and ${MAX_PAGE_SIZE}.`, errors);
	const q = optionalText(params.q);
	const tag = optionalText(params.tag);

	if (errors.length > 0) {
		return { ok: false, errors };
	}
	return {
		ok: true,
		query: {
			...(q === undefined ? {} : { q }),
			...(modality === undefined ? {} : { modality }),
			...(status === undefined ? {} : { status }),
			...(tag === undefined ? {} : { tag }),
			page,
			pageSize,
			sort,
		},
	};
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	return course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	const compared = sort === 'title' ? left.title.localeCompare(right.title) : left[sort].localeCompare(right[sort]);
	return compared === 0 ? left.id.localeCompare(right.id) : compared;
}

/** Filters, sorts and paginates a course collection. Sorting is ascending, with `id` as the tiebreaker. */
export function searchCourses(courses: readonly Course[], query: CourseQuery): CoursePage {
	const tag = query.tag?.toLowerCase();
	const matched = courses
		.filter(
			(course) =>
				(query.q === undefined || matchesKeyword(course, query.q)) &&
				(query.modality === undefined || course.modality === query.modality) &&
				(query.status === undefined || course.status === query.status) &&
				(tag === undefined || course.tags.some((courseTag) => courseTag.toLowerCase() === tag)),
		)
		.sort((left, right) => compareCourses(left, right, query.sort));

	const offset = (query.page - 1) * query.pageSize;
	return {
		items: matched.slice(offset, offset + query.pageSize),
		page: query.page,
		pageSize: query.pageSize,
		totalItems: matched.length,
		totalPages: Math.ceil(matched.length / query.pageSize),
	};
}

/** Seed catalog. In-memory so the endpoint is testable without a database or external service. */
export const COURSE_FIXTURES: readonly Course[] = [
	{
		id: 'course-001',
		title: 'AI Security Foundations',
		summary: 'Introductory course on secure AI-assisted development.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'security'],
		createdAt: '2026-01-15T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
	},
	{
		id: 'course-002',
		title: 'Applied Prompt Engineering',
		summary: 'Design prompts that hold up in production systems.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'prompting'],
		createdAt: '2026-02-03T00:00:00.000Z',
		updatedAt: '2026-05-20T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Cloud Cost Management',
		summary: 'Control spend across multi-cloud estates.',
		modality: 'hybrid',
		status: 'active',
		tags: ['cloud', 'finops'],
		createdAt: '2026-01-08T00:00:00.000Z',
		updatedAt: '2026-04-11T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Container Security Deep Dive',
		summary: 'Harden container images and runtimes.',
		modality: 'in-person',
		status: 'active',
		tags: ['security', 'containers'],
		createdAt: '2026-03-12T00:00:00.000Z',
		updatedAt: '2026-07-02T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Data Modeling with MongoDB',
		summary: 'Schema design patterns for document databases.',
		modality: 'online',
		status: 'draft',
		tags: ['data', 'mongodb'],
		createdAt: '2026-02-19T00:00:00.000Z',
		updatedAt: '2026-03-01T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'DevOps Incident Response',
		summary: 'Run a calm incident from page to postmortem.',
		modality: 'hybrid',
		status: 'active',
		tags: ['devops', 'incident'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-08-14T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Ethical AI Governance',
		summary: 'Policy and controls for responsible AI programs.',
		modality: 'online',
		status: 'draft',
		tags: ['ai', 'governance'],
		createdAt: '2026-05-06T00:00:00.000Z',
		updatedAt: '2026-05-30T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Legacy Systems Migration',
		summary: 'Move mainframe workloads without downtime.',
		modality: 'in-person',
		status: 'retired',
		tags: ['migration', 'legacy'],
		createdAt: '2025-09-17T00:00:00.000Z',
		updatedAt: '2026-01-09T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Observability Fundamentals',
		summary: 'Metrics, logs and traces for distributed systems.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['observability', 'devops'],
		createdAt: '2026-03-25T00:00:00.000Z',
		updatedAt: '2026-06-18T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Secure API Design',
		summary: 'Build APIs that resist common attacks.',
		modality: 'online',
		status: 'active',
		tags: ['api', 'security'],
		createdAt: '2026-02-27T00:00:00.000Z',
		updatedAt: '2026-07-21T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Technical Writing for Engineers',
		summary: 'Write documentation people actually read.',
		modality: 'in-person',
		status: 'draft',
		tags: ['writing', 'docs'],
		createdAt: '2026-01-30T00:00:00.000Z',
		updatedAt: '2026-02-15T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Zero Trust Networking',
		summary: 'Design networks with no implicit trust.',
		modality: 'in-person',
		status: 'retired',
		tags: ['security', 'networking'],
		createdAt: '2025-11-05T00:00:00.000Z',
		updatedAt: '2026-03-08T00:00:00.000Z',
	},
];
