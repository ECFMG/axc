import type { Course, CourseModality, CourseStatus } from '@axc/domain';

export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;
export const MAX_QUERY_LENGTH = 200;

/** Shape of Hono's `c.req.queries()`: every parameter name mapped to all of its values. */
export type RawCourseQuery = Readonly<Record<string, readonly string[]>>;

export interface CourseSearchCriteria {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

export interface QueryParameterError {
	field: string;
	message: string;
}

export type CourseQueryParseResult = { ok: true; criteria: CourseSearchCriteria } | { ok: false; errors: QueryParameterError[] };

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export type CourseSearchResult = { ok: true; result: CoursePage } | { ok: false; errors: QueryParameterError[] };

const SUPPORTED_FIELDS = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'] as const;

type SupportedField = (typeof SUPPORTED_FIELDS)[number];

type FieldOutcome<T> = { ok: true; value: T | undefined } | { ok: false; message: string };

type FieldParsers = { readonly [K in SupportedField]: (value: string) => FieldOutcome<NonNullable<CourseSearchCriteria[K]>> };

const DIGITS_ONLY = /^[0-9]+$/;

const accept = <T>(value: T | undefined): FieldOutcome<T> => ({ ok: true, value });

const reject = <T>(message: string): FieldOutcome<T> => ({ ok: false, message });

const parseText =
	(field: string) =>
	(value: string): FieldOutcome<string> => {
		const trimmed = value.trim();
		if (trimmed.length > MAX_QUERY_LENGTH) {
			return reject(`${field} must be at most ${MAX_QUERY_LENGTH} characters.`);
		}
		return accept(trimmed === '' ? undefined : trimmed);
	};

const parseOneOf =
	<T extends string>(field: string, allowed: readonly T[]) =>
	(value: string): FieldOutcome<T> => {
		const match = allowed.find((candidate) => candidate === value);
		return match === undefined ? reject(`${field} must be one of: ${allowed.join(', ')}.`) : accept(match);
	};

const parseIntegerInRange =
	(min: number, max: number, message: string) =>
	(value: string): FieldOutcome<number> => {
		const parsed = DIGITS_ONLY.test(value) ? Number(value) : Number.NaN;
		return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? accept(parsed) : reject(message);
	};

const FIELD_PARSERS: FieldParsers = {
	q: parseText('q'),
	modality: parseOneOf('modality', COURSE_MODALITIES),
	status: parseOneOf('status', COURSE_STATUSES),
	tag: parseText('tag'),
	page: parseIntegerInRange(1, Number.MAX_SAFE_INTEGER, 'page must be a positive integer.'),
	pageSize: parseIntegerInRange(1, MAX_PAGE_SIZE, `pageSize must be between 1 and ${MAX_PAGE_SIZE}.`),
	sort: parseOneOf('sort', COURSE_SORT_FIELDS),
};

const isSupportedField = (name: string): name is SupportedField => (SUPPORTED_FIELDS as readonly string[]).includes(name);

function applyField<K extends SupportedField>(field: K, values: readonly string[] | undefined, criteria: CourseSearchCriteria, errors: QueryParameterError[]): void {
	if (values === undefined || values.length === 0) {
		return;
	}
	const [value] = values;
	if (values.length > 1 || value === undefined) {
		errors.push({ field, message: `${field} must be specified at most once.` });
		return;
	}
	const outcome = FIELD_PARSERS[field](value);
	if (!outcome.ok) {
		errors.push({ field, message: outcome.message });
	} else if (outcome.value !== undefined) {
		criteria[field] = outcome.value;
	}
}

/** Validates the raw query parameters and turns them into search criteria, collecting every error. */
export function parseCourseQuery(raw: RawCourseQuery): CourseQueryParseResult {
	const criteria: CourseSearchCriteria = { page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE, sort: 'title' };
	const errors: QueryParameterError[] = [];

	for (const field of SUPPORTED_FIELDS) {
		applyField(field, raw[field], criteria, errors);
	}
	for (const name of Object.keys(raw).filter((key) => !isSupportedField(key))) {
		errors.push({ field: name, message: `${name} is not a supported query parameter.` });
	}

	return errors.length > 0 ? { ok: false, errors } : { ok: true, criteria };
}

type CourseComparator = (a: Course, b: Course) => number;

const compareTimestamps = (a: string, b: string): number => Date.parse(a) - Date.parse(b);

const COMPARATORS: Readonly<Record<CourseSortField, CourseComparator>> = {
	title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
	createdAt: (a, b) => compareTimestamps(a.createdAt, b.createdAt),
	updatedAt: (a, b) => compareTimestamps(a.updatedAt, b.updatedAt),
};

const compareIds: CourseComparator = (a, b) => {
	if (a.id === b.id) {
		return 0;
	}
	return a.id < b.id ? -1 : 1;
};

const comparatorFor =
	(sort: CourseSortField): CourseComparator =>
	(a, b) =>
		COMPARATORS[sort](a, b) || compareIds(a, b);

const matchesKeyword = (course: Course, q: string): boolean => {
	const needle = q.toLowerCase();
	return [course.title, course.summary, ...course.tags].some((text) => text.toLowerCase().includes(needle));
};

const hasTag = (course: Course, tag: string): boolean => {
	const wanted = tag.toLowerCase();
	return course.tags.some((candidate) => candidate.toLowerCase() === wanted);
};

const matchesCriteria = (course: Course, criteria: CourseSearchCriteria): boolean =>
	(criteria.q === undefined || matchesKeyword(course, criteria.q)) &&
	(criteria.modality === undefined || course.modality === criteria.modality) &&
	(criteria.status === undefined || course.status === criteria.status) &&
	(criteria.tag === undefined || hasTag(course, criteria.tag));

const copyCourse = (course: Course): Course => ({ ...course, tags: [...course.tags] });

/** Filters (AND), sorts ascending with an id tie-break, and paginates the given courses. */
export function searchCourses(courses: readonly Course[], criteria: CourseSearchCriteria): CoursePage {
	const matches = courses.filter((course) => matchesCriteria(course, criteria)).sort(comparatorFor(criteria.sort));
	const start = (criteria.page - 1) * criteria.pageSize;

	return {
		items: matches.slice(start, start + criteria.pageSize).map(copyCourse),
		page: criteria.page,
		pageSize: criteria.pageSize,
		totalItems: matches.length,
		totalPages: Math.ceil(matches.length / criteria.pageSize),
	};
}
