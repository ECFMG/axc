import { COURSE_MODALITIES, COURSE_SORT_FIELDS, COURSE_STATUSES, type Course, type CourseModality, type CourseSortField, type CourseStatus } from '@axc/domain';

export interface CourseListQueryInput {
	q?: string;
	modality?: string;
	status?: string;
	tag?: string;
	page?: string;
	pageSize?: string;
	sort?: string;
}

interface CourseListQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

interface QueryParameterDetail {
	field: string;
	message: string;
}

export interface CourseListResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

const DEFAULT_COURSE_PAGE = 1;
const DEFAULT_COURSE_PAGE_SIZE = 10;
const MAX_COURSE_PAGE_SIZE = 50;

export class InvalidQueryParameterError extends Error {
	readonly code = 'INVALID_QUERY_PARAMETER' as const;
	readonly details: QueryParameterDetail[];

	constructor(details: QueryParameterDetail[]) {
		super('One or more query parameters are invalid.');
		this.name = 'InvalidQueryParameterError';
		this.details = details;
	}
}

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
		title: 'Cloud Architecture Studio',
		summary: 'Hands-on design of resilient cloud platforms.',
		modality: 'in-person',
		status: 'active',
		tags: ['cloud', 'architecture'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-05-20T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Hybrid Team Facilitation',
		summary: 'Practices for leading teams that split time between sites and video.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['leadership', 'collaboration'],
		createdAt: '2026-03-12T00:00:00.000Z',
		updatedAt: '2026-03-18T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Data Privacy Essentials',
		summary: 'Legal and technical foundations for handling personal data.',
		modality: 'online',
		status: 'retired',
		tags: ['privacy', 'security'],
		createdAt: '2025-11-01T00:00:00.000Z',
		updatedAt: '2026-01-10T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Kubernetes Operations',
		summary: 'Operate production clusters with confidence.',
		modality: 'in-person',
		status: 'active',
		tags: ['cloud', 'devops'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-04-02T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'Responsible AI Practice',
		summary: 'Evaluate fairness, safety, and accountability in applied AI systems.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'ethics'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-15T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Incident Response Lab',
		summary: 'Practice security incident handling from detection through recovery.',
		modality: 'hybrid',
		status: 'active',
		tags: ['security', 'operations'],
		createdAt: '2026-02-18T00:00:00.000Z',
		updatedAt: '2026-07-01T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Product Discovery Methods',
		summary: 'Interview, prototype, and decide what to build next.',
		modality: 'online',
		status: 'draft',
		tags: ['product', 'discovery'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-02T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Observability in Production',
		summary: 'Logs, traces, and metrics for diagnosing live systems.',
		modality: 'in-person',
		status: 'retired',
		tags: ['devops', 'observability'],
		createdAt: '2025-09-15T00:00:00.000Z',
		updatedAt: '2026-02-01T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Machine Learning Ops',
		summary: 'Ship, monitor, and retrain models as production services.',
		modality: 'hybrid',
		status: 'active',
		tags: ['ai', 'mlops'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-06-12T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Accessibility for Engineers',
		summary: 'Build inclusive interfaces that meet accessibility standards.',
		modality: 'online',
		status: 'active',
		tags: ['a11y', 'frontend'],
		createdAt: '2026-01-08T00:00:00.000Z',
		updatedAt: '2026-03-22T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Threat Modeling Workshop',
		summary: 'Identify and prioritize security threats before you write code.',
		modality: 'in-person',
		status: 'draft',
		tags: ['security', 'architecture'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-06-08T00:00:00.000Z',
	},
	{
		id: 'course-013',
		title: 'SQL Performance Tuning',
		summary: 'Read query plans and remove the bottlenecks that slow reports.',
		modality: 'online',
		status: 'active',
		tags: ['data', 'sql'],
		createdAt: '2025-12-12T00:00:00.000Z',
		updatedAt: '2026-04-28T00:00:00.000Z',
	},
	{
		id: 'course-014',
		title: 'Zero Trust Networking',
		summary: 'Design networks that assume breach and verify every request.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['security', 'network'],
		createdAt: '2025-08-20T00:00:00.000Z',
		updatedAt: '2026-01-05T00:00:00.000Z',
	},
];

function parseCourseListQuery(input: CourseListQueryInput): CourseListQuery {
	const details: QueryParameterDetail[] = [];
	const query: CourseListQuery = {
		page: DEFAULT_COURSE_PAGE,
		pageSize: DEFAULT_COURSE_PAGE_SIZE,
		sort: 'title',
	};

	const q = normalizeOptionalText(input.q);
	if (q !== undefined) {
		query.q = q;
	}

	const tag = normalizeOptionalText(input.tag);
	if (tag !== undefined) {
		query.tag = tag;
	}

	if (input.modality !== undefined && input.modality !== '') {
		if (isCourseModality(input.modality)) {
			query.modality = input.modality;
		} else {
			details.push({
				field: 'modality',
				message: 'modality must be one of: online, in-person, hybrid.',
			});
		}
	} else if (input.modality === '') {
		details.push({
			field: 'modality',
			message: 'modality must be one of: online, in-person, hybrid.',
		});
	}

	if (input.status !== undefined && input.status !== '') {
		if (isCourseStatus(input.status)) {
			query.status = input.status;
		} else {
			details.push({
				field: 'status',
				message: 'status must be one of: draft, active, retired.',
			});
		}
	} else if (input.status === '') {
		details.push({
			field: 'status',
			message: 'status must be one of: draft, active, retired.',
		});
	}

	if (input.page !== undefined) {
		const page = parseInteger(input.page);
		if (page === undefined || page < 1) {
			details.push({
				field: 'page',
				message: 'page must be an integer greater than or equal to 1.',
			});
		} else {
			query.page = page;
		}
	}

	if (input.pageSize !== undefined) {
		const pageSize = parseInteger(input.pageSize);
		if (pageSize === undefined || pageSize < 1 || pageSize > MAX_COURSE_PAGE_SIZE) {
			details.push({
				field: 'pageSize',
				message: 'pageSize must be between 1 and 50.',
			});
		} else {
			query.pageSize = pageSize;
		}
	}

	if (input.sort !== undefined && input.sort !== '') {
		if (isCourseSortField(input.sort)) {
			query.sort = input.sort;
		} else {
			details.push({
				field: 'sort',
				message: 'sort must be one of: title, createdAt, updatedAt.',
			});
		}
	} else if (input.sort === '') {
		details.push({
			field: 'sort',
			message: 'sort must be one of: title, createdAt, updatedAt.',
		});
	}

	if (details.length > 0) {
		throw new InvalidQueryParameterError(details);
	}

	return query;
}

export function listCourses(input: CourseListQueryInput): CourseListResult {
	const query = parseCourseListQuery(input);
	const matched = COURSE_CATALOG.filter((course) => matchesCourse(course, query)).sort((left, right) => compareCourses(left, right, query.sort));
	const totalItems = matched.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
	const start = (query.page - 1) * query.pageSize;

	return {
		items: matched.slice(start, start + query.pageSize),
		page: query.page,
		pageSize: query.pageSize,
		totalItems,
		totalPages,
	};
}

function matchesCourse(course: Course, query: CourseListQuery): boolean {
	if (query.q !== undefined) {
		const needle = query.q.toLowerCase();
		const inTitle = course.title.toLowerCase().includes(needle);
		const inSummary = course.summary.toLowerCase().includes(needle);
		const inTags = course.tags.some((tag) => tag.toLowerCase().includes(needle));
		if (!inTitle && !inSummary && !inTags) {
			return false;
		}
	}

	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}

	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}

	if (query.tag !== undefined) {
		const needle = query.tag.toLowerCase();
		if (!course.tags.some((tag) => tag.toLowerCase() === needle)) {
			return false;
		}
	}

	return true;
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	const primary = left[sort].localeCompare(right[sort]);
	if (primary !== 0) {
		return primary;
	}
	return left.title.localeCompare(right.title);
}

function normalizeOptionalText(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed === '' ? undefined : trimmed;
}

function parseInteger(value: string): number | undefined {
	if (!/^[0-9]+$/.test(value)) {
		return undefined;
	}
	return Number(value);
}

function isCourseModality(value: string): value is CourseModality {
	return (COURSE_MODALITIES as readonly string[]).includes(value);
}

function isCourseStatus(value: string): value is CourseStatus {
	return (COURSE_STATUSES as readonly string[]).includes(value);
}

function isCourseSortField(value: string): value is CourseSortField {
	return (COURSE_SORT_FIELDS as readonly string[]).includes(value);
}
