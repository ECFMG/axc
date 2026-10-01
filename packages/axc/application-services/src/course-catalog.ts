const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

type CourseModality = (typeof COURSE_MODALITIES)[number];
type CourseStatus = (typeof COURSE_STATUSES)[number];

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

/** Raw query string values; every value arrives as a string or is absent. */
export interface CourseSearchQuery {
	q?: string;
	modality?: string;
	status?: string;
	tag?: string;
	page?: string;
	pageSize?: string;
	sort?: string;
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface CourseSearchErrorBody {
	error: {
		code: 'INVALID_QUERY_PARAMETER';
		message: string;
		details: { field: string; message: string }[];
	};
}

export type CourseSearchOutcome = { status: 200; body: CoursePage } | { status: 400; body: CourseSearchErrorBody };

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

/** Fixture catalog: 14 courses mixing every modality, status and several tags. */
const COURSE_CATALOG: readonly Course[] = [
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
		title: 'Agentic Coding Workshop',
		summary: 'Hands-on lab for driving coding agents in a real repository.',
		modality: 'in-person',
		status: 'active',
		tags: ['ai', 'agents'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-05-02T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Cloud Platform Essentials',
		summary: 'Core services, identity and networking for platform engineers.',
		modality: 'hybrid',
		status: 'active',
		tags: ['cloud', 'platform'],
		createdAt: '2025-11-03T00:00:00.000Z',
		updatedAt: '2026-04-11T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Defensive Security Engineering',
		summary: 'Threat modelling and hardening for application teams.',
		modality: 'online',
		status: 'draft',
		tags: ['security', 'engineering'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-18T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Data Modelling with MongoDB',
		summary: 'Schema design, indexing and aggregation pipelines.',
		modality: 'online',
		status: 'active',
		tags: ['data', 'mongodb'],
		createdAt: '2025-09-12T00:00:00.000Z',
		updatedAt: '2026-03-30T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Domain-Driven Design Primer',
		summary: 'Aggregates, value objects and bounded contexts in practice.',
		modality: 'hybrid',
		status: 'active',
		tags: ['architecture', 'ddd'],
		createdAt: '2025-10-05T00:00:00.000Z',
		updatedAt: '2026-01-09T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Incident Response Drills',
		summary: 'Running blameless incident reviews under production pressure.',
		modality: 'in-person',
		status: 'retired',
		tags: ['operations', 'security'],
		createdAt: '2024-06-18T00:00:00.000Z',
		updatedAt: '2025-02-14T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Observability for Services',
		summary: 'Traces, metrics and logs that answer real questions.',
		modality: 'online',
		status: 'active',
		tags: ['operations', 'platform'],
		createdAt: '2025-12-01T00:00:00.000Z',
		updatedAt: '2026-06-15T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Prompt Engineering for Teams',
		summary: 'Shared prompt patterns, evaluation and review workflows.',
		modality: 'online',
		status: 'draft',
		tags: ['AI', 'writing'],
		createdAt: '2026-03-07T00:00:00.000Z',
		updatedAt: '2026-03-21T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Secure Code Review',
		summary: 'Finding injection, authorization and secret-handling defects.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['Security', 'review'],
		createdAt: '2024-09-09T00:00:00.000Z',
		updatedAt: '2025-08-01T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'TypeScript at Scale',
		summary: 'Project references, strict settings and monorepo builds.',
		modality: 'online',
		status: 'active',
		tags: ['typescript', 'engineering'],
		createdAt: '2025-08-22T00:00:00.000Z',
		updatedAt: '2026-05-19T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Testing Strategy Fundamentals',
		summary: 'Unit, integration and acceptance tests that earn their cost.',
		modality: 'in-person',
		status: 'active',
		tags: ['testing', 'engineering'],
		createdAt: '2025-07-14T00:00:00.000Z',
		updatedAt: '2026-02-02T00:00:00.000Z',
	},
	{
		id: 'course-013',
		title: 'Platform Reliability Basics',
		summary: 'Service level objectives, error budgets and capacity planning.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['platform', 'operations'],
		createdAt: '2026-04-02T00:00:00.000Z',
		updatedAt: '2026-04-28T00:00:00.000Z',
	},
	{
		id: 'course-014',
		title: 'Zero Trust Networking',
		summary: 'Identity-aware access controls replacing perimeter security.',
		modality: 'in-person',
		status: 'retired',
		tags: ['network', 'security'],
		createdAt: '2024-11-30T00:00:00.000Z',
		updatedAt: '2025-10-10T00:00:00.000Z',
	},
];

export function searchCourses(query: CourseSearchQuery, catalog: readonly Course[] = COURSE_CATALOG): CourseSearchOutcome {
	const details: { field: string; message: string }[] = [];

	const enumValue = <T extends string>(field: 'modality' | 'status' | 'sort', allowed: readonly T[]): T | undefined => {
		const raw = query[field];
		if (raw === undefined || raw === '') {
			return undefined;
		}
		if (!(allowed as readonly string[]).includes(raw)) {
			details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
			return undefined;
		}
		return raw as T;
	};

	const intValue = (field: 'page' | 'pageSize', fallback: number, max: number, message: string): number => {
		const raw = query[field];
		if (raw === undefined || raw === '') {
			return fallback;
		}
		const value = Number(raw);
		if (!Number.isInteger(value) || value < 1 || value > max) {
			details.push({ field, message });
			return fallback;
		}
		return value;
	};

	const modality = enumValue('modality', COURSE_MODALITIES);
	const status = enumValue('status', COURSE_STATUSES);
	const sort = enumValue('sort', COURSE_SORT_FIELDS) ?? 'title';
	const page = intValue('page', DEFAULT_PAGE, Number.MAX_SAFE_INTEGER, 'page must be an integer of 1 or greater.');
	const pageSize = intValue('pageSize', DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, `pageSize must be between 1 and ${MAX_PAGE_SIZE}.`);

	if (details.length > 0) {
		return { status: 400, body: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } } };
	}

	const keyword = query.q?.trim().toLowerCase() ?? '';
	const tag = query.tag?.trim().toLowerCase() ?? '';

	const matches = catalog
		.filter((course) => modality === undefined || course.modality === modality)
		.filter((course) => status === undefined || course.status === status)
		.filter((course) => tag === '' || course.tags.some((candidate) => candidate.toLowerCase() === tag))
		.filter((course) => keyword === '' || `${course.title} ${course.summary} ${course.tags.join(' ')}`.toLowerCase().includes(keyword))
		.sort((left, right) => left[sort].localeCompare(right[sort]));

	const start = (page - 1) * pageSize;
	return {
		status: 200,
		body: {
			items: matches.slice(start, start + pageSize),
			page,
			pageSize,
			totalItems: matches.length,
			totalPages: Math.ceil(matches.length / pageSize),
		},
	};
}
