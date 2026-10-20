export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: 'online' | 'in-person' | 'hybrid';
	status: 'draft' | 'active' | 'retired';
	tags: readonly string[];
	createdAt: string;
	updatedAt: string;
}

export interface CourseCatalog {
	list(): readonly Course[];
}

export interface CoursePage {
	items: readonly Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export type CourseQueryInput = Readonly<Record<string, readonly string[] | undefined>>;

export interface CourseQueryDetail {
	field: string;
	message: string;
}

type CourseSort = 'title' | 'createdAt' | 'updatedAt';

interface CourseSearchQuery {
	readonly q?: string;
	readonly modality?: Course['modality'];
	readonly status?: Course['status'];
	readonly tag?: string;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSort;
}

const supportedQueryFields = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);
const modalityValues = ['online', 'in-person', 'hybrid'] as const;
const statusValues = ['draft', 'active', 'retired'] as const;
const sortValues = ['title', 'createdAt', 'updatedAt'] as const;
const pageSizeLimit = 50;

export class InvalidCourseQueryError extends Error {
	readonly code = 'INVALID_QUERY_PARAMETER' as const;
	readonly details: readonly CourseQueryDetail[];

	constructor(details: readonly CourseQueryDetail[]) {
		super('One or more query parameters are invalid.');
		this.details = details;
	}
}

export function searchCourses(courses: readonly Course[], input: CourseQueryInput): CoursePage {
	const query = parseCourseQuery(input);
	const filtered = courses.filter((course) => courseMatches(course, query));
	const sorted = [...filtered].sort((left, right) => compareCourses(left, right, query.sort));
	const start = (query.page - 1) * query.pageSize;
	const totalItems = sorted.length;
	return {
		items: sorted.slice(start, start + query.pageSize),
		page: query.page,
		pageSize: query.pageSize,
		totalItems,
		totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
	};
}

function parseCourseQuery(input: CourseQueryInput): CourseSearchQuery {
	const details: CourseQueryDetail[] = [];
	for (const field of Object.keys(input)) {
		if (!supportedQueryFields.has(field)) {
			details.push({ field, message: `${field} is not a supported query parameter.` });
		}
	}

	const q = optionalText(input, 'q', details);
	const modality = oneOf(input, 'modality', modalityValues, 'modality must be online, in-person, or hybrid.', details);
	const status = oneOf(input, 'status', statusValues, 'status must be draft, active, or retired.', details);
	const tag = optionalText(input, 'tag', details);
	if (tag === '') {
		details.push({ field: 'tag', message: 'tag must not be empty.' });
	}
	const page = boundedInteger(input, 'page', Number.MAX_SAFE_INTEGER, 'page must be an integer greater than or equal to 1.', details) ?? 1;
	const pageSize = boundedInteger(input, 'pageSize', pageSizeLimit, 'pageSize must be between 1 and 50.', details) ?? 10;
	const sort = oneOf(input, 'sort', sortValues, 'sort must be title, createdAt, or updatedAt.', details) ?? 'title';

	if (details.length > 0) {
		throw new InvalidCourseQueryError(details);
	}

	return {
		page,
		pageSize,
		sort,
		...(q ? { q } : {}),
		...(modality ? { modality } : {}),
		...(status ? { status } : {}),
		...(tag ? { tag } : {}),
	};
}

function optionalText(input: CourseQueryInput, field: string, details: CourseQueryDetail[]): string | undefined {
	const value = single(input, field, details);
	return value?.trim();
}

function oneOf<T extends string>(input: CourseQueryInput, field: string, allowed: readonly T[], message: string, details: CourseQueryDetail[]): T | undefined {
	const value = single(input, field, details);
	if (value === undefined) {
		return undefined;
	}
	const match = allowed.find((item) => item === value);
	if (match === undefined) {
		details.push({ field, message });
	}
	return match;
}

function boundedInteger(input: CourseQueryInput, field: string, maximum: number, message: string, details: CourseQueryDetail[]): number | undefined {
	const value = single(input, field, details);
	if (value === undefined) {
		return undefined;
	}
	if (!/^\d+$/.test(value)) {
		details.push({ field, message });
		return undefined;
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
		details.push({ field, message });
		return undefined;
	}
	return parsed;
}

function single(input: CourseQueryInput, field: string, details: CourseQueryDetail[]): string | undefined {
	const values = input[field];
	if (values === undefined) {
		return undefined;
	}
	const value = values.length === 1 ? values[0] : undefined;
	if (value === undefined) {
		details.push({ field, message: `${field} must be provided once.` });
	}
	return value;
}

function courseMatches(course: Course, query: CourseSearchQuery): boolean {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	const tag = query.tag;
	if (tag !== undefined && !course.tags.some((courseTag) => courseTag.toLowerCase() === tag.toLowerCase())) {
		return false;
	}
	const keyword = query.q;
	if (keyword !== undefined) {
		const needle = keyword.toLowerCase();
		const fields = [course.title, course.summary, ...course.tags];
		if (!fields.some((field) => field.toLowerCase().includes(needle))) {
			return false;
		}
	}
	return true;
}

function compareCourses(left: Course, right: Course, sort: CourseSort): number {
	const byField = compareText(left[sort], right[sort]);
	return byField === 0 ? compareText(left.id, right.id) : byField;
}

function compareText(left: string, right: string): number {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
}
