import {
	COURSE_MODALITIES,
	COURSE_SORT_FIELDS,
	COURSE_STATUSES,
	type Course,
	type CourseModality,
	type CourseSearchCriteria,
	type CourseSearchPage,
	type CourseSortField,
	type CourseStatus,
	searchCourseCatalog,
} from '@axc/domain';

export interface CourseQueryDetail {
	readonly field: string;
	readonly message: string;
}

export interface InvalidCourseQuery {
	readonly code: 'INVALID_QUERY_PARAMETER';
	readonly message: 'One or more query parameters are invalid.';
	readonly details: readonly CourseQueryDetail[];
}

export type CourseSearchOutcome = { readonly ok: true; readonly page: CourseSearchPage } | { readonly ok: false; readonly error: InvalidCourseQuery };

const INVALID_QUERY_MESSAGE = 'One or more query parameters are invalid.';
const KNOWN_PARAMETERS = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);
const MODALITY_MESSAGE = 'modality must be one of online, in-person, or hybrid.';
const STATUS_MESSAGE = 'status must be one of draft, active, or retired.';
const SORT_MESSAGE = 'sort must be one of title, createdAt, or updatedAt.';
const PAGE_MESSAGE = 'page must be an integer greater than or equal to 1.';
const PAGE_SIZE_MESSAGE = 'pageSize must be between 1 and 50.';

type TextRead = { readonly status: 'empty' } | { readonly status: 'invalid' } | { readonly status: 'value'; readonly value: string };

export function searchCourses(courses: readonly Course[], query: Readonly<Record<string, readonly string[]>>): CourseSearchOutcome {
	const details: CourseQueryDetail[] = [];
	const q = readKeyword(query, details);
	const modality = readModality(query, details);
	const status = readStatus(query, details);
	const tag = readTag(query, details);
	const page = readPage(query, details);
	const pageSize = readPageSize(query, details);
	const sort = readSort(query, details);
	appendUnknownParameters(query, details);

	if (details.length > 0 || page === undefined || pageSize === undefined || sort === undefined) {
		return {
			ok: false,
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: INVALID_QUERY_MESSAGE,
				details,
			},
		};
	}

	const criteria: CourseSearchCriteria = {
		page,
		pageSize,
		sort,
		...(q === undefined ? {} : { q }),
		...(modality === undefined ? {} : { modality }),
		...(status === undefined ? {} : { status }),
		...(tag === undefined ? {} : { tag }),
	};

	return { ok: true, page: searchCourseCatalog(courses, criteria) };
}

function readKeyword(query: Readonly<Record<string, readonly string[]>>, details: CourseQueryDetail[]): string | undefined {
	const read = readText(query, 'q', details, { blank: 'ignore', duplicate: 'q must be provided once.' });
	return read.status === 'value' ? read.value : undefined;
}

function readModality(query: Readonly<Record<string, readonly string[]>>, details: CourseQueryDetail[]): CourseModality | undefined {
	const read = readText(query, 'modality', details, { blank: MODALITY_MESSAGE, duplicate: 'modality must be provided once.' });
	if (read.status !== 'value') {
		return undefined;
	}
	const parsed = parseEnum(read.value, COURSE_MODALITIES);
	if (parsed === undefined) {
		details.push({ field: 'modality', message: MODALITY_MESSAGE });
		return undefined;
	}
	return parsed;
}

function readStatus(query: Readonly<Record<string, readonly string[]>>, details: CourseQueryDetail[]): CourseStatus | undefined {
	const read = readText(query, 'status', details, { blank: STATUS_MESSAGE, duplicate: 'status must be provided once.' });
	if (read.status !== 'value') {
		return undefined;
	}
	const parsed = parseEnum(read.value, COURSE_STATUSES);
	if (parsed === undefined) {
		details.push({ field: 'status', message: STATUS_MESSAGE });
		return undefined;
	}
	return parsed;
}

function readTag(query: Readonly<Record<string, readonly string[]>>, details: CourseQueryDetail[]): string | undefined {
	const read = readText(query, 'tag', details, { blank: 'tag must be a non-empty string.', duplicate: 'tag must be provided once.' });
	return read.status === 'value' ? read.value : undefined;
}

function readPage(query: Readonly<Record<string, readonly string[]>>, details: CourseQueryDetail[]): number | undefined {
	const read = readText(query, 'page', details, { blank: PAGE_MESSAGE, duplicate: 'page must be provided once.' });
	if (read.status === 'empty') {
		return 1;
	}
	if (read.status === 'invalid') {
		return undefined;
	}
	const parsed = parseBoundedInteger(read.value, 1, Number.MAX_SAFE_INTEGER);
	if (parsed === undefined) {
		details.push({ field: 'page', message: PAGE_MESSAGE });
		return undefined;
	}
	return parsed;
}

function readPageSize(query: Readonly<Record<string, readonly string[]>>, details: CourseQueryDetail[]): number | undefined {
	const read = readText(query, 'pageSize', details, { blank: PAGE_SIZE_MESSAGE, duplicate: 'pageSize must be provided once.' });
	if (read.status === 'empty') {
		return 10;
	}
	if (read.status === 'invalid') {
		return undefined;
	}
	const parsed = parseBoundedInteger(read.value, 1, 50);
	if (parsed === undefined) {
		details.push({ field: 'pageSize', message: PAGE_SIZE_MESSAGE });
		return undefined;
	}
	return parsed;
}

function readSort(query: Readonly<Record<string, readonly string[]>>, details: CourseQueryDetail[]): CourseSortField | undefined {
	const read = readText(query, 'sort', details, { blank: SORT_MESSAGE, duplicate: 'sort must be provided once.' });
	if (read.status === 'empty') {
		return 'title';
	}
	if (read.status === 'invalid') {
		return undefined;
	}
	const parsed = parseEnum(read.value, COURSE_SORT_FIELDS);
	if (parsed === undefined) {
		details.push({ field: 'sort', message: SORT_MESSAGE });
		return undefined;
	}
	return parsed;
}

function appendUnknownParameters(query: Readonly<Record<string, readonly string[]>>, details: CourseQueryDetail[]): void {
	const unknown = Object.keys(query)
		.filter((field) => !KNOWN_PARAMETERS.has(field))
		.sort((left, right) => left.localeCompare(right, 'en'));
	for (const field of unknown) {
		details.push({ field, message: 'Unknown query parameter.' });
	}
}

function readText(query: Readonly<Record<string, readonly string[]>>, field: string, details: CourseQueryDetail[], messages: { readonly blank: string | 'ignore'; readonly duplicate: string }): TextRead {
	const values = query[field];
	if (values === undefined || values.length === 0) {
		return { status: 'empty' };
	}
	if (values.length > 1) {
		details.push({ field, message: messages.duplicate });
		return { status: 'invalid' };
	}
	const value = (values[0] ?? '').trim();
	if (value.length === 0) {
		if (messages.blank === 'ignore') {
			return { status: 'empty' };
		}
		details.push({ field, message: messages.blank });
		return { status: 'invalid' };
	}
	return { status: 'value', value };
}

function parseEnum<T extends string>(value: string, allowed: readonly T[]): T | undefined {
	for (const candidate of allowed) {
		if (candidate === value) {
			return candidate;
		}
	}
	return undefined;
}

function parseBoundedInteger(value: string, minimum: number, maximum: number): number | undefined {
	if (!/^[1-9]\d*$/.test(value)) {
		return undefined;
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
		return undefined;
	}
	return parsed;
}
