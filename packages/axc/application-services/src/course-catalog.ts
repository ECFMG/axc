/**
 * In-memory training course catalog.
 * Query values keep an index signature so unsupported parameters stay visible and are rejected.
 */
export interface CourseSearchQuery {
	q?: string;
	modality?: string;
	status?: string;
	tag?: string;
	page?: string;
	pageSize?: string;
	sort?: string;
	[key: string]: string | undefined;
}

export interface CourseQueryErrorDetail {
	field: string;
	message: string;
}

export interface CourseQueryError {
	code: 'INVALID_QUERY_PARAMETER';
	message: 'One or more query parameters are invalid.';
	details: CourseQueryErrorDetail[];
}

interface Course {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export type CourseSearchResult = { ok: true; body: CoursePage } | { ok: false; error: CourseQueryError };

const MODALITIES = ['online', 'in-person', 'hybrid'] as const;
const STATUSES = ['draft', 'active', 'retired'] as const;
const SORTS = ['title', 'createdAt', 'updatedAt'] as const;
const SUPPORTED_QUERY_PARAMETERS = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

const MODALITY_MESSAGE = 'modality must be one of online, in-person, hybrid.';
const STATUS_MESSAGE = 'status must be one of draft, active, retired.';
const PAGE_MESSAGE = 'page must be an integer greater than or equal to 1.';
const PAGE_SIZE_MESSAGE = 'pageSize must be between 1 and 50.';
const SORT_MESSAGE = 'sort must be one of title, createdAt, updatedAt.';
const INVALID_QUERY_MESSAGE = 'One or more query parameters are invalid.';

type CourseModality = (typeof MODALITIES)[number];
type CourseStatus = (typeof STATUSES)[number];
type CourseSort = (typeof SORTS)[number];

interface NormalizedCourseQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSort;
}

const courses: readonly Course[] = [
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
		title: 'Security Operations Lab',
		summary: 'Practice detecting and containing production incidents.',
		modality: 'in-person',
		status: 'draft',
		tags: ['operations', 'incident'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-02T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Cloud Workload Protection',
		summary: 'How teams apply security controls to cloud workloads.',
		modality: 'hybrid',
		status: 'active',
		tags: ['cloud'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-15T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Prompt Design Studio',
		summary: 'Writing prompts that stay within product constraints.',
		modality: 'online',
		status: 'retired',
		tags: ['Security', 'prompts'],
		createdAt: '2025-11-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Accessibility Essentials',
		summary: 'Inclusive interfaces for web applications.',
		modality: 'online',
		status: 'active',
		tags: ['a11y', 'frontend'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-02T00:00:00.000Z',
	},
	{
		id: 'course-006',
		title: 'AI Product Strategy',
		summary: 'Choosing where AI belongs in a product roadmap.',
		modality: 'hybrid',
		status: 'active',
		tags: ['ai', 'product'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-20T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Data Modeling Studio',
		summary: 'Relational and document models for course catalogs.',
		modality: 'in-person',
		status: 'active',
		tags: ['data'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-07-01T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'React Patterns',
		summary: 'Component patterns for maintainable interfaces.',
		modality: 'online',
		status: 'draft',
		tags: ['frontend', 'react'],
		createdAt: '2026-06-10T00:00:00.000Z',
		updatedAt: '2026-06-11T00:00:00.000Z',
	},
	{
		id: 'course-009',
		title: 'Classroom Facilitation',
		summary: 'Running in-person workshops with clear outcomes.',
		modality: 'in-person',
		status: 'retired',
		tags: ['teaching'],
		createdAt: '2025-08-01T00:00:00.000Z',
		updatedAt: '2025-12-01T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Kubernetes Operations',
		summary: 'Operating clusters without guessing.',
		modality: 'online',
		status: 'active',
		tags: ['devops', 'platform'],
		createdAt: '2026-02-15T00:00:00.000Z',
		updatedAt: '2026-08-01T00:00:00.000Z',
	},
	{
		id: 'course-011',
		title: 'Leadership Workshop',
		summary: 'Feedback and planning for engineering leads.',
		modality: 'in-person',
		status: 'active',
		tags: ['leadership'],
		createdAt: '2026-03-20T00:00:00.000Z',
		updatedAt: '2026-03-21T00:00:00.000Z',
	},
	{
		id: 'course-012',
		title: 'Platform Engineering',
		summary: 'Internal platforms that product teams can trust.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['platform', 'devops'],
		createdAt: '2026-07-01T00:00:00.000Z',
		updatedAt: '2026-07-02T00:00:00.000Z',
	},
	{
		id: 'course-013',
		title: 'Archive Methods',
		summary: 'Retiring content without losing history.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['history'],
		createdAt: '2025-06-01T00:00:00.000Z',
		updatedAt: '2025-09-01T00:00:00.000Z',
	},
	{
		id: 'course-014',
		title: 'Incident Response Practice',
		summary: 'Tabletop exercises for on-call teams.',
		modality: 'online',
		status: 'active',
		tags: ['incident', 'operations'],
		createdAt: '2026-04-15T00:00:00.000Z',
		updatedAt: '2026-04-16T00:00:00.000Z',
	},
];

export function searchCourses(query: CourseSearchQuery): CourseSearchResult {
	const parsed = parseCourseQuery(query);
	if (!parsed.ok) {
		return parsed;
	}
	return { ok: true, body: listCourses(parsed.query) };
}

function parseCourseQuery(query: CourseSearchQuery): { ok: true; query: NormalizedCourseQuery } | { ok: false; error: CourseQueryError } {
	const details: CourseQueryErrorDetail[] = [];
	const modality = readChoice(query.modality, 'modality', MODALITIES, MODALITY_MESSAGE, details);
	const status = readChoice(query.status, 'status', STATUSES, STATUS_MESSAGE, details);
	const tag = readTag(query.tag, details);
	const page = readInteger(query.page, 'page', 1, 1, Number.MAX_SAFE_INTEGER, PAGE_MESSAGE, details);
	const pageSize = readInteger(query.pageSize, 'pageSize', 10, 1, 50, PAGE_SIZE_MESSAGE, details);
	const sort = readSort(query.sort, details);
	appendUnknownParameters(query, details);
	if (details.length > 0) {
		return {
			ok: false,
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: INVALID_QUERY_MESSAGE,
				details,
			},
		};
	}
	const keyword = readKeyword(query.q);
	const normalized: NormalizedCourseQuery = { page, pageSize, sort };
	if (keyword !== undefined) {
		normalized.q = keyword;
	}
	if (modality !== undefined) {
		normalized.modality = modality;
	}
	if (status !== undefined) {
		normalized.status = status;
	}
	if (tag !== undefined) {
		normalized.tag = tag;
	}
	return { ok: true, query: normalized };
}

function listCourses(query: NormalizedCourseQuery): CoursePage {
	const matched = courses.filter((course) => matchesCourse(course, query));
	matched.sort((left, right) => compareCourses(left, right, query.sort));
	const start = (query.page - 1) * query.pageSize;
	return {
		items: matched.slice(start, start + query.pageSize).map(cloneCourse),
		page: query.page,
		pageSize: query.pageSize,
		totalItems: matched.length,
		totalPages: Math.ceil(matched.length / query.pageSize),
	};
}

function matchesCourse(course: Course, query: NormalizedCourseQuery): boolean {
	if (query.q !== undefined && !containsKeyword(course, query.q)) {
		return false;
	}
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	if (query.tag !== undefined && !hasTag(course, query.tag)) {
		return false;
	}
	return true;
}

function containsKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLocaleLowerCase('en-US');
	return [course.title, course.summary, ...course.tags].some((value) => value.toLocaleLowerCase('en-US').includes(needle));
}

function hasTag(course: Course, tag: string): boolean {
	const needle = tag.toLocaleLowerCase('en-US');
	return course.tags.some((candidate) => candidate.toLocaleLowerCase('en-US') === needle);
}

function compareCourses(left: Course, right: Course, sort: CourseSort): number {
	const primary = sort === 'title' ? left.title.localeCompare(right.title, 'en', { sensitivity: 'base' }) : left[sort].localeCompare(right[sort]);
	if (primary !== 0) {
		return primary;
	}
	return left.id.localeCompare(right.id, 'en');
}

function cloneCourse(course: Course): Course {
	return {
		id: course.id,
		title: course.title,
		summary: course.summary,
		modality: course.modality,
		status: course.status,
		tags: [...course.tags],
		createdAt: course.createdAt,
		updatedAt: course.updatedAt,
	};
}

function readKeyword(raw: string | undefined): string | undefined {
	if (raw === undefined) {
		return undefined;
	}
	const trimmed = raw.trim();
	if (trimmed === '') {
		return undefined;
	}
	return trimmed;
}

function readTag(raw: string | undefined, details: CourseQueryErrorDetail[]): string | undefined {
	if (raw === undefined) {
		return undefined;
	}
	const trimmed = raw.trim();
	if (trimmed === '') {
		details.push({ field: 'tag', message: 'tag must be a non-empty string.' });
		return undefined;
	}
	return trimmed;
}

function readChoice<T extends string>(raw: string | undefined, field: string, allowed: readonly T[], message: string, details: CourseQueryErrorDetail[]): T | undefined {
	if (raw === undefined) {
		return undefined;
	}
	const trimmed = raw.trim();
	if (isOneOf(allowed, trimmed)) {
		return trimmed;
	}
	details.push({ field, message });
	return undefined;
}

function readSort(raw: string | undefined, details: CourseQueryErrorDetail[]): CourseSort {
	if (raw === undefined) {
		return 'title';
	}
	const trimmed = raw.trim();
	if (isOneOf(SORTS, trimmed)) {
		return trimmed;
	}
	details.push({ field: 'sort', message: SORT_MESSAGE });
	return 'title';
}

function readInteger(raw: string | undefined, field: string, fallback: number, min: number, max: number, message: string, details: CourseQueryErrorDetail[]): number {
	if (raw === undefined) {
		return fallback;
	}
	const trimmed = raw.trim();
	if (!/^(0|[1-9]\d*)$/.test(trimmed)) {
		details.push({ field, message });
		return fallback;
	}
	const parsed = Number(trimmed);
	if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
		details.push({ field, message });
		return fallback;
	}
	return parsed;
}

function appendUnknownParameters(query: CourseSearchQuery, details: CourseQueryErrorDetail[]): void {
	for (const field of Object.keys(query).sort()) {
		if (!SUPPORTED_QUERY_PARAMETERS.has(field)) {
			details.push({ field, message: `${field} is not a supported query parameter.` });
		}
	}
}

function isOneOf<T extends string>(allowed: readonly T[], value: string): value is T {
	return allowed.some((candidate) => candidate === value);
}
