export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;
export const DEFAULT_COURSE_PAGE_SIZE = 10;
export const MAX_COURSE_PAGE_SIZE = 50;

export type CourseModality = (typeof COURSE_MODALITIES)[number];
export type CourseStatus = (typeof COURSE_STATUSES)[number];
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: readonly string[];
	createdAt: string;
	updatedAt: string;
}

export interface CourseSearchCriteria {
	q: string | undefined;
	modality: CourseModality | undefined;
	status: CourseStatus | undefined;
	tag: string | undefined;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

export interface CourseSearchResult {
	items: readonly Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface CourseQueryErrorDetail {
	field: string;
	message: string;
}

export interface CourseQueryErrorBody {
	error: {
		code: 'INVALID_QUERY_PARAMETER';
		message: string;
		details: CourseQueryErrorDetail[];
	};
}

export type CourseQueryParseResult = { ok: true; criteria: CourseSearchCriteria } | { ok: false; error: CourseQueryErrorBody };

/** Fixture catalog. No external store is required to serve or test the endpoint. */
export const COURSE_CATALOG: readonly Course[] = [
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
		title: 'Agentic Workflow Design',
		summary: 'Design multi-step agent workflows with human checkpoints.',
		modality: 'online',
		status: 'draft',
		tags: ['ai', 'workflow'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-05-02T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Applied Prompt Engineering',
		summary: 'Hands-on prompting patterns for production systems.',
		modality: 'hybrid',
		status: 'active',
		tags: ['ai', 'prompting'],
		createdAt: '2026-03-10T00:00:00.000Z',
		updatedAt: '2026-07-11T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Cloud Cost Governance',
		summary: 'Control spend across multi-cloud estates.',
		modality: 'in-person',
		status: 'retired',
		tags: ['cloud', 'finops'],
		createdAt: '2025-11-05T00:00:00.000Z',
		updatedAt: '2026-01-20T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Data Platform Fundamentals',
		summary: 'Lakehouse architecture and batch pipelines.',
		modality: 'online',
		status: 'active',
		tags: ['data', 'platform'],
		createdAt: '2026-01-02T00:00:00.000Z',
		updatedAt: '2026-04-18T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Incident Response Drills',
		summary: 'Tabletop exercises for SECURITY incidents.',
		modality: 'in-person',
		status: 'active',
		tags: ['security', 'operations'],
		createdAt: '2025-12-12T00:00:00.000Z',
		updatedAt: '2026-03-03T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Kubernetes Operations',
		summary: 'Run resilient clusters in production.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['cloud', 'kubernetes'],
		createdAt: '2026-02-20T00:00:00.000Z',
		updatedAt: '2026-06-22T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Observability Essentials',
		summary: 'Traces, metrics, and logs that answer questions.',
		modality: 'online',
		status: 'retired',
		tags: ['operations', 'telemetry'],
		createdAt: '2025-10-30T00:00:00.000Z',
		updatedAt: '2026-02-14T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Platform Engineering Primer',
		summary: 'Internal developer platforms from scratch.',
		modality: 'hybrid',
		status: 'active',
		tags: ['platform', 'developer-experience'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-08-05T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Secure Code Review',
		summary: 'Find defects before attackers do.',
		modality: 'in-person',
		status: 'draft',
		tags: ['Security', 'review'],
		createdAt: '2026-03-22T00:00:00.000Z',
		updatedAt: '2026-07-30T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Threat Modeling Workshop',
		summary: 'STRIDE and attack trees for product teams.',
		modality: 'in-person',
		status: 'active',
		tags: ['security', 'architecture'],
		createdAt: '2026-05-14T00:00:00.000Z',
		updatedAt: '2026-09-01T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Zero Trust Networking',
		summary: 'Identity-aware access for distributed teams.',
		modality: 'online',
		status: 'retired',
		tags: ['network', 'zero-trust'],
		createdAt: '2025-09-18T00:00:00.000Z',
		updatedAt: '2026-05-25T00:00:00.000Z',
	},
];

export function parseCourseQuery(raw: Record<string, string | undefined>): CourseQueryParseResult {
	const { q, modality, status, tag, page, pageSize, sort } = raw;
	const details: CourseQueryErrorDetail[] = [];

	const modalityValue = readEnum(COURSE_MODALITIES, modality, 'modality', details);
	const statusValue = readEnum(COURSE_STATUSES, status, 'status', details);
	const sortValue = readEnum(COURSE_SORT_FIELDS, sort, 'sort', details) ?? 'title';

	const pageValue = page === undefined ? 1 : readInteger(page);
	if (pageValue === undefined || pageValue < 1) {
		details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
	}

	const pageSizeValue = pageSize === undefined ? DEFAULT_COURSE_PAGE_SIZE : readInteger(pageSize);
	if (pageSizeValue === undefined || pageSizeValue < 1 || pageSizeValue > MAX_COURSE_PAGE_SIZE) {
		details.push({ field: 'pageSize', message: `pageSize must be between 1 and ${MAX_COURSE_PAGE_SIZE}.` });
	}

	if (details.length > 0) {
		return { ok: false, error: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } } };
	}

	return {
		ok: true,
		criteria: {
			q: blankToUndefined(q),
			modality: modalityValue,
			status: statusValue,
			tag: blankToUndefined(tag),
			page: pageValue ?? 1,
			pageSize: pageSizeValue ?? DEFAULT_COURSE_PAGE_SIZE,
			sort: sortValue,
		},
	};
}

export function searchCourses(criteria: CourseSearchCriteria, catalog: readonly Course[] = COURSE_CATALOG): CourseSearchResult {
	const keyword = criteria.q?.toLowerCase();
	const tag = criteria.tag?.toLowerCase();

	const matches = catalog.filter((course) => {
		if (criteria.modality !== undefined && course.modality !== criteria.modality) {
			return false;
		}
		if (criteria.status !== undefined && course.status !== criteria.status) {
			return false;
		}
		if (tag !== undefined && !course.tags.some((candidate) => candidate.toLowerCase() === tag)) {
			return false;
		}
		return keyword === undefined || `${course.title} ${course.summary} ${course.tags.join(' ')}`.toLowerCase().includes(keyword);
	});

	const sorted = [...matches].sort((a, b) => a[criteria.sort].localeCompare(b[criteria.sort]));
	const start = (criteria.page - 1) * criteria.pageSize;

	return {
		items: sorted.slice(start, start + criteria.pageSize),
		page: criteria.page,
		pageSize: criteria.pageSize,
		totalItems: matches.length,
		totalPages: Math.ceil(matches.length / criteria.pageSize),
	};
}

function readEnum<T extends string>(allowed: readonly T[], value: string | undefined, field: string, details: CourseQueryErrorDetail[]): T | undefined {
	if (value === undefined || value === '') {
		return undefined;
	}
	if ((allowed as readonly string[]).includes(value)) {
		return value as T;
	}
	details.push({ field, message: `${field} must be one of ${allowed.join(', ')}.` });
	return undefined;
}

function readInteger(value: string): number | undefined {
	return /^\d+$/.test(value) ? Number(value) : undefined;
}

function blankToUndefined(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed === undefined || trimmed === '' ? undefined : trimmed;
}
