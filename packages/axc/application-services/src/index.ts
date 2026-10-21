import { type Course, type CourseCatalog, type CourseModality, type CourseStatus, courseModalities, courseStatuses } from '@axc/domain';

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

export interface ApiContext {
	environment: HealthEnvironment;
	courses: CourseCatalog;
}

export type CourseQueryParameters = Record<string, string[]>;

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface InvalidQueryDetail {
	field: string;
	message: string;
}

export interface InvalidCourseQuery {
	code: 'INVALID_QUERY_PARAMETER';
	message: 'One or more query parameters are invalid.';
	details: InvalidQueryDetail[];
}

export type CourseSearchResult = { ok: true; page: CoursePage } | { ok: false; error: InvalidCourseQuery };

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	courses: {
		search(parameters: CourseQueryParameters): Promise<CourseSearchResult>;
	};
}

export interface ApplicationServicesFactory {
	forRequest(rawAuthHeader?: string): Promise<ApplicationServices>;
}

const defaultPage = 1;
const defaultPageSize = 10;
const maximumPageSize = 50;
const courseSortFields = ['title', 'createdAt', 'updatedAt'] as const;
type CourseSortField = (typeof courseSortFields)[number];
const knownQueryParameters = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);
const positiveInteger = /^[1-9]\d*$/;

interface NormalizedCourseQuery {
	q: string | undefined;
	modality: CourseModality | undefined;
	status: CourseStatus | undefined;
	tag: string | undefined;
	page: number;
	pageSize: number;
	sort: CourseSortField;
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

export function buildApplicationServicesFactory(context: ApiContext): ApplicationServicesFactory {
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
				async search(parameters: CourseQueryParameters): Promise<CourseSearchResult> {
					const courses = await context.courses.listCourses();
					return searchCourses(courses, parameters);
				},
			},
		});

	return { forRequest };
}

function searchCourses(courses: readonly Course[], parameters: CourseQueryParameters): CourseSearchResult {
	const parsed = parseCourseQuery(parameters);
	if (!parsed.ok) {
		return parsed;
	}
	const query = parsed.query;
	const matched = courses.filter((course) => matchesCourse(course, query));
	matched.sort((left, right) => compareCourses(query.sort, left, right));
	const totalItems = matched.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
	const start = (query.page - 1) * query.pageSize;
	return {
		ok: true,
		page: {
			items: matched.slice(start, start + query.pageSize).map(copyCourse),
			page: query.page,
			pageSize: query.pageSize,
			totalItems,
			totalPages,
		},
	};
}

function parseCourseQuery(parameters: CourseQueryParameters): { ok: true; query: NormalizedCourseQuery } | { ok: false; error: InvalidCourseQuery } {
	const details: InvalidQueryDetail[] = [];
	const unknownFields = Object.keys(parameters)
		.filter((field) => !knownQueryParameters.has(field))
		.sort();
	for (const field of unknownFields) {
		details.push({ field, message: 'Query parameter is not supported.' });
	}

	const q = readOptionalText(parameters, 'q', details);
	const modality = readAllowedValue(parameters, 'modality', courseModalities, 'modality must be online, in-person, or hybrid.', details);
	const status = readAllowedValue(parameters, 'status', courseStatuses, 'status must be draft, active, or retired.', details);
	const tag = readOptionalText(parameters, 'tag', details);
	const page = readBoundedInteger(parameters, 'page', undefined, 'page must be an integer greater than or equal to 1.', details);
	const pageSize = readBoundedInteger(parameters, 'pageSize', maximumPageSize, 'pageSize must be between 1 and 50.', details);
	const sort = readAllowedValue(parameters, 'sort', courseSortFields, 'sort must be title, createdAt, or updatedAt.', details);

	if (details.length > 0) {
		return {
			ok: false,
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details,
			},
		};
	}

	return {
		ok: true,
		query: {
			q,
			modality,
			status,
			tag,
			page: page ?? defaultPage,
			pageSize: pageSize ?? defaultPageSize,
			sort: sort ?? 'title',
		},
	};
}

function singleValue(parameters: CourseQueryParameters, field: string, details: InvalidQueryDetail[]): string | undefined {
	const values = parameters[field];
	if (values === undefined || values.length === 0) {
		return undefined;
	}
	if (values.length > 1) {
		details.push({ field, message: 'Query parameter must be provided at most once.' });
		return undefined;
	}
	const value = values[0];
	if (value === undefined) {
		return undefined;
	}
	return value;
}

function readOptionalText(parameters: CourseQueryParameters, field: string, details: InvalidQueryDetail[]): string | undefined {
	const value = singleValue(parameters, field, details);
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return undefined;
	}
	return trimmed;
}

function readAllowedValue<T extends string>(parameters: CourseQueryParameters, field: string, allowed: readonly T[], message: string, details: InvalidQueryDetail[]): T | undefined {
	const value = singleValue(parameters, field, details);
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	for (const candidate of allowed) {
		if (candidate === trimmed) {
			return candidate;
		}
	}
	details.push({ field, message });
	return undefined;
}

function readBoundedInteger(parameters: CourseQueryParameters, field: string, maximum: number | undefined, message: string, details: InvalidQueryDetail[]): number | undefined {
	const value = singleValue(parameters, field, details);
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (!positiveInteger.test(trimmed)) {
		details.push({ field, message });
		return undefined;
	}
	const parsed = Number(trimmed);
	if (!Number.isSafeInteger(parsed) || (maximum !== undefined && parsed > maximum)) {
		details.push({ field, message });
		return undefined;
	}
	return parsed;
}

function matchesCourse(course: Course, query: NormalizedCourseQuery): boolean {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	const tag = query.tag;
	if (tag !== undefined) {
		const expected = tag.toLowerCase();
		if (!course.tags.some((item) => item.toLowerCase() === expected)) {
			return false;
		}
	}
	const keyword = query.q;
	if (keyword !== undefined) {
		const needle = keyword.toLowerCase();
		const haystacks = [course.title, course.summary, ...course.tags];
		if (!haystacks.some((value) => value.toLowerCase().includes(needle))) {
			return false;
		}
	}
	return true;
}

function compareCourses(sort: CourseSortField, left: Course, right: Course): number {
	const byField = left[sort].localeCompare(right[sort]);
	if (byField !== 0) {
		return byField;
	}
	return left.id.localeCompare(right.id);
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
