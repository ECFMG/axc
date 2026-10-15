import { type Course, type CourseCatalog, type CourseModality, type CourseSortField, type CourseStatus, courseModalities, courseSortFields, courseStatuses } from '@axc/domain';

export const HEALTH_SERVICE_NAME = 'agentCourses-api' as const;
export const HEALTH_PROJECT_CODE = 'axc' as const;

export type HealthEnvironment = 'local' | 'test' | 'production';

export interface HealthStatus {
	status: 'ok';
	service: typeof HEALTH_SERVICE_NAME;
	projectCode: typeof HEALTH_PROJECT_CODE;
	environment: HealthEnvironment;
	timestamp: string;
}

export interface CourseQueryError {
	field: string;
	message: string;
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export type CourseSearchResult = { ok: true; page: CoursePage } | { ok: false; details: CourseQueryError[] };

export interface ApiContext {
	environment: HealthEnvironment;
}

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	courses: {
		search(query: Readonly<Record<string, string>>): CourseSearchResult;
	};
}

export interface ApplicationServicesFactory {
	forRequest(rawAuthHeader?: string): Promise<ApplicationServices>;
}

export function resolveEnvironment(nodeEnv: string | undefined): HealthEnvironment {
	if (nodeEnv === 'production') {
		return 'production';
	}
	if (nodeEnv === 'test') {
		return 'test';
	}
	return 'local';
}

export function buildApplicationServicesFactory(context: ApiContext, catalog: CourseCatalog): ApplicationServicesFactory {
	const forRequest = (): Promise<ApplicationServices> =>
		Promise.resolve({
			health: {
				getStatus(): HealthStatus {
					return {
						status: 'ok',
						service: HEALTH_SERVICE_NAME,
						projectCode: HEALTH_PROJECT_CODE,
						environment: context.environment,
						timestamp: new Date().toISOString(),
					};
				},
			},
			courses: {
				search(query: Readonly<Record<string, string>>): CourseSearchResult {
					return searchCourses(catalog, query);
				},
			},
		});

	return { forRequest };
}

const allowedQueryParameters = new Set<string>(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

function searchCourses(catalog: CourseCatalog, query: Readonly<Record<string, string>>): CourseSearchResult {
	const details: CourseQueryError[] = [];
	for (const field of Object.keys(query).sort()) {
		if (!allowedQueryParameters.has(field)) {
			details.push({ field, message: 'Unknown query parameter.' });
		}
	}

	const keyword = readKeyword(query, 'q');
	const modality = readChoice(query, 'modality', courseModalities, 'modality must be online, in-person, or hybrid.', details);
	const status = readChoice(query, 'status', courseStatuses, 'status must be draft, active, or retired.', details);
	const tag = readTag(query, 'tag', details);
	const page = readBoundedInt(query, 'page', 1, undefined, 'page must be an integer greater than or equal to 1.', details);
	const pageSize = readBoundedInt(query, 'pageSize', 10, 50, 'pageSize must be between 1 and 50.', details);
	const sort = readChoice(query, 'sort', courseSortFields, 'sort must be title, createdAt, or updatedAt.', details) ?? 'title';

	if (details.length > 0) {
		return { ok: false, details };
	}

	const matched = catalog.list().filter((course) => matchesCourse(course, keyword, modality, status, tag));
	const sorted = [...matched].sort((left, right) => compareCourses(left, right, sort));
	const totalItems = sorted.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
	const start = (page - 1) * pageSize;

	return {
		ok: true,
		page: {
			items: sorted.slice(start, start + pageSize).map((course) => copyCourse(course)),
			page,
			pageSize,
			totalItems,
			totalPages,
		},
	};
}

function matchesCourse(course: Course, keyword: string | undefined, modality: CourseModality | undefined, status: CourseStatus | undefined, tag: string | undefined): boolean {
	if (modality !== undefined && course.modality !== modality) {
		return false;
	}
	if (status !== undefined && course.status !== status) {
		return false;
	}
	if (tag !== undefined && !course.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) {
		return false;
	}
	if (keyword !== undefined && !matchesKeyword(course, keyword)) {
		return false;
	}
	return true;
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	if (course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle)) {
		return true;
	}
	return course.tags.some((item) => item.toLowerCase().includes(needle));
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	const byField = left[sort].localeCompare(right[sort], 'en');
	if (byField !== 0) {
		return byField;
	}
	return left.id.localeCompare(right.id, 'en');
}

function copyCourse(course: Course): Course {
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

function readKeyword(query: Readonly<Record<string, string>>, field: string): string | undefined {
	const raw = query[field];
	if (raw === undefined) {
		return undefined;
	}
	const value = raw.trim();
	return value === '' ? undefined : value;
}

function readTag(query: Readonly<Record<string, string>>, field: string, details: CourseQueryError[]): string | undefined {
	const raw = query[field];
	if (raw === undefined) {
		return undefined;
	}
	const value = raw.trim();
	if (value === '') {
		details.push({ field, message: 'tag must not be empty.' });
		return undefined;
	}
	return value;
}

function readChoice<T extends string>(query: Readonly<Record<string, string>>, field: string, allowed: readonly T[], message: string, details: CourseQueryError[]): T | undefined {
	const raw = query[field];
	if (raw === undefined) {
		return undefined;
	}
	const value = raw.trim();
	if (isOneOf(value, allowed)) {
		return value;
	}
	details.push({ field, message });
	return undefined;
}

function readBoundedInt(query: Readonly<Record<string, string>>, field: string, fallback: number, max: number | undefined, message: string, details: CourseQueryError[]): number {
	const raw = query[field];
	if (raw === undefined) {
		return fallback;
	}
	const parsed = parsePositiveInt(raw, max);
	if (parsed === undefined) {
		details.push({ field, message });
		return fallback;
	}
	return parsed;
}

function parsePositiveInt(value: string, max: number | undefined): number | undefined {
	const trimmed = value.trim();
	if (!/^\d+$/.test(trimmed)) {
		return undefined;
	}
	const parsed = Number(trimmed);
	if (!Number.isSafeInteger(parsed) || parsed < 1 || (max !== undefined && parsed > max)) {
		return undefined;
	}
	return parsed;
}

function isOneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
	for (const candidate of allowed) {
		if (candidate === value) {
			return true;
		}
	}
	return false;
}
