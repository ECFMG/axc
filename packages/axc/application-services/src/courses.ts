import { COURSE_MODALITIES, COURSE_STATUSES, type Course, type CourseModality, type CourseStatus } from '@axc/domain';
import { loadCourseCatalog } from '@axc/persistence';

const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;
type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

const DEFAULT_COURSE_PAGE = 1;
const DEFAULT_COURSE_PAGE_SIZE = 10;
const MAX_COURSE_PAGE_SIZE = 50;

const KNOWN_QUERY_PARAMETERS = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'] as const;
type KnownQueryParameter = (typeof KNOWN_QUERY_PARAMETERS)[number];

export type CourseQueryParameters = Readonly<Record<string, readonly string[]>>;

interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface QueryParameterDetail {
	field: string;
	message: string;
}

interface InvalidQueryParameterError {
	error: {
		code: 'INVALID_QUERY_PARAMETER';
		message: 'One or more query parameters are invalid.';
		details: QueryParameterDetail[];
	};
}

export type CourseSearchOutcome = { status: 'ok'; body: CoursePage } | { status: 'invalid'; error: InvalidQueryParameterError };

interface ParsedCourseQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

export function searchCourses(query: CourseQueryParameters): CourseSearchOutcome {
	const details: QueryParameterDetail[] = [];
	const parsed: ParsedCourseQuery = {
		page: DEFAULT_COURSE_PAGE,
		pageSize: DEFAULT_COURSE_PAGE_SIZE,
		sort: 'title',
	};

	readOptional(query, 'q', details, (value) => {
		parsed.q = value;
	});
	readOptional(query, 'modality', details, (value) => {
		if (!isCourseModality(value)) {
			details.push({ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' });
			return;
		}
		parsed.modality = value;
	});
	readOptional(query, 'status', details, (value) => {
		if (!isCourseStatus(value)) {
			details.push({ field: 'status', message: 'status must be one of draft, active, retired.' });
			return;
		}
		parsed.status = value;
	});
	readOptional(query, 'tag', details, (value) => {
		parsed.tag = value;
	});
	readOptional(query, 'page', details, (value) => {
		const page = parsePage(value);
		if (page === undefined) {
			details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
			return;
		}
		parsed.page = page;
	});
	readOptional(query, 'pageSize', details, (value) => {
		const pageSize = parsePageSize(value);
		if (pageSize === undefined) {
			details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
			return;
		}
		parsed.pageSize = pageSize;
	});
	readOptional(query, 'sort', details, (value) => {
		if (!isSortField(value)) {
			details.push({ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' });
			return;
		}
		parsed.sort = value;
	});

	for (const field of Object.keys(query).sort((left, right) => left.localeCompare(right, 'en'))) {
		if (!isKnownQueryParameter(field)) {
			details.push({ field, message: 'Unknown query parameter.' });
		}
	}

	if (details.length > 0) {
		return {
			status: 'invalid',
			error: {
				error: {
					code: 'INVALID_QUERY_PARAMETER',
					message: 'One or more query parameters are invalid.',
					details,
				},
			},
		};
	}

	const matched = loadCourseCatalog().filter((course) => matchesCourse(course, parsed));
	const sorted = [...matched].sort((left, right) => compareCourses(parsed.sort, left, right));
	const totalItems = sorted.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / parsed.pageSize);
	const start = (parsed.page - 1) * parsed.pageSize;

	return {
		status: 'ok',
		body: {
			items: sorted.slice(start, start + parsed.pageSize).map(toCourseItem),
			page: parsed.page,
			pageSize: parsed.pageSize,
			totalItems,
			totalPages,
		},
	};
}

function readOptional(query: CourseQueryParameters, field: KnownQueryParameter, details: QueryParameterDetail[], apply: (value: string) => void): void {
	const values = query[field];
	if (values === undefined || values.length === 0) {
		return;
	}
	if (values.length !== 1) {
		details.push({ field, message: `${field} must be provided once.` });
		return;
	}
	const value = values[0];
	if (value === undefined) {
		return;
	}
	apply(value);
}

function matchesCourse(course: Course, parsed: ParsedCourseQuery): boolean {
	if (parsed.modality !== undefined && course.modality !== parsed.modality) {
		return false;
	}
	if (parsed.status !== undefined && course.status !== parsed.status) {
		return false;
	}
	const tag = parsed.tag;
	if (tag !== undefined && tag !== '' && !course.tags.some((item) => normalize(item) === normalize(tag))) {
		return false;
	}
	const keyword = parsed.q;
	if (keyword !== undefined && keyword !== '' && !matchesKeyword(course, keyword)) {
		return false;
	}
	return true;
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = normalize(keyword);
	return normalize(course.title).includes(needle) || normalize(course.summary).includes(needle) || course.tags.some((tag) => normalize(tag).includes(needle));
}

function compareCourses(sort: CourseSortField, left: Course, right: Course): number {
	const byField = left[sort].localeCompare(right[sort], 'en');
	if (byField !== 0) {
		return byField;
	}
	return left.id.localeCompare(right.id, 'en');
}

function toCourseItem(course: Course): Course {
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

function parsePage(value: string): number | undefined {
	if (!/^[1-9]\d*$/.test(value)) {
		return undefined;
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return undefined;
	}
	return parsed;
}

function parsePageSize(value: string): number | undefined {
	const parsed = parsePage(value);
	if (parsed === undefined || parsed > MAX_COURSE_PAGE_SIZE) {
		return undefined;
	}
	return parsed;
}

function isKnownQueryParameter(field: string): field is KnownQueryParameter {
	return (KNOWN_QUERY_PARAMETERS as readonly string[]).includes(field);
}

function isCourseModality(value: string): value is CourseModality {
	return (COURSE_MODALITIES as readonly string[]).includes(value);
}

function isCourseStatus(value: string): value is CourseStatus {
	return (COURSE_STATUSES as readonly string[]).includes(value);
}

function isSortField(value: string): value is CourseSortField {
	return (COURSE_SORT_FIELDS as readonly string[]).includes(value);
}

function normalize(value: string): string {
	return value.toLocaleLowerCase('en-US');
}
