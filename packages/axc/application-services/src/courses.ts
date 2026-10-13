import { COURSE_MODALITIES, COURSE_STATUSES, type Course, type CourseModality, type CourseRepository, type CourseSnapshot, type CourseStatus } from '@axc/domain';

const COURSE_SORTS = ['title', 'createdAt', 'updatedAt'] as const;
type CourseSort = (typeof COURSE_SORTS)[number];

export interface CourseSearchRequest {
	readonly q?: string;
	readonly modality?: string;
	readonly status?: string;
	readonly tag?: string;
	readonly page?: string;
	readonly pageSize?: string;
	readonly sort?: string;
	readonly repeated?: readonly string[];
	readonly unknown?: readonly string[];
}

export interface CourseQueryDetail {
	field: string;
	message: string;
}

export interface CourseQueryErrorBody {
	code: 'INVALID_QUERY_PARAMETER';
	message: 'One or more query parameters are invalid.';
	details: CourseQueryDetail[];
}

export interface CourseSearchPage {
	items: CourseSnapshot[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export type CourseSearchResult = { ok: true; page: CourseSearchPage } | { ok: false; error: CourseQueryErrorBody };

interface ParsedCourseQuery {
	readonly q?: string;
	readonly modality?: CourseModality;
	readonly status?: CourseStatus;
	readonly tag?: string;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSort;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const DEFAULT_SORT: CourseSort = 'title';

export function createCourseSearcher(repository: CourseRepository): { search(request: CourseSearchRequest): Promise<CourseSearchResult> } {
	return {
		async search(request: CourseSearchRequest): Promise<CourseSearchResult> {
			const parsed = parseCourseSearchRequest(request);
			if (!parsed.ok) {
				return { ok: false, error: invalidQuery(parsed.details) };
			}
			const courses = await repository.list();
			return { ok: true, page: buildPage(courses, parsed.query) };
		},
	};
}

function invalidQuery(details: CourseQueryDetail[]): CourseQueryErrorBody {
	return {
		code: 'INVALID_QUERY_PARAMETER',
		message: 'One or more query parameters are invalid.',
		details,
	};
}

type ParseOutcome = { ok: true; query: ParsedCourseQuery } | { ok: false; details: CourseQueryDetail[] };

function parseCourseSearchRequest(request: CourseSearchRequest): ParseOutcome {
	const details: CourseQueryDetail[] = [];
	const repeated = new Set(request.repeated ?? []);

	const q = readKeyword(request.q, repeated.has('q'), details);
	const modality = readModality(request.modality, repeated.has('modality'), details);
	const status = readStatus(request.status, repeated.has('status'), details);
	const tag = readTag(request.tag, repeated.has('tag'), details);
	const page = readPage(request.page, repeated.has('page'), details);
	const pageSize = readPageSize(request.pageSize, repeated.has('pageSize'), details);
	const sort = readSort(request.sort, repeated.has('sort'), details);
	appendUnknown(request.unknown, details);

	if (details.length > 0 || page === undefined || pageSize === undefined || sort === undefined) {
		return { ok: false, details };
	}

	const query: { q?: string; modality?: CourseModality; status?: CourseStatus; tag?: string; page: number; pageSize: number; sort: CourseSort } = {
		page,
		pageSize,
		sort,
	};
	if (q !== undefined) {
		query.q = q;
	}
	if (modality !== undefined) {
		query.modality = modality;
	}
	if (status !== undefined) {
		query.status = status;
	}
	if (tag !== undefined) {
		query.tag = tag;
	}
	return { ok: true, query };
}

function readKeyword(value: string | undefined, isRepeated: boolean, details: CourseQueryDetail[]): string | undefined {
	if (isRepeated) {
		details.push({ field: 'q', message: 'q must be provided at most once.' });
		return undefined;
	}
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function readModality(value: string | undefined, isRepeated: boolean, details: CourseQueryDetail[]): CourseModality | undefined {
	if (isRepeated) {
		details.push({ field: 'modality', message: 'modality must be provided at most once.' });
		return undefined;
	}
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (isCourseModality(trimmed)) {
		return trimmed;
	}
	details.push({ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' });
	return undefined;
}

function readStatus(value: string | undefined, isRepeated: boolean, details: CourseQueryDetail[]): CourseStatus | undefined {
	if (isRepeated) {
		details.push({ field: 'status', message: 'status must be provided at most once.' });
		return undefined;
	}
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (isCourseStatus(trimmed)) {
		return trimmed;
	}
	details.push({ field: 'status', message: 'status must be one of draft, active, retired.' });
	return undefined;
}

function readTag(value: string | undefined, isRepeated: boolean, details: CourseQueryDetail[]): string | undefined {
	if (isRepeated) {
		details.push({ field: 'tag', message: 'tag must be provided at most once.' });
		return undefined;
	}
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		details.push({ field: 'tag', message: 'tag must not be empty.' });
		return undefined;
	}
	return trimmed;
}

function readPage(value: string | undefined, isRepeated: boolean, details: CourseQueryDetail[]): number | undefined {
	if (isRepeated) {
		details.push({ field: 'page', message: 'page must be provided at most once.' });
		return undefined;
	}
	if (value === undefined) {
		return DEFAULT_PAGE;
	}
	const parsed = parseInteger(value.trim());
	if (parsed !== undefined && parsed >= 1) {
		return parsed;
	}
	details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
	return undefined;
}

function readPageSize(value: string | undefined, isRepeated: boolean, details: CourseQueryDetail[]): number | undefined {
	if (isRepeated) {
		details.push({ field: 'pageSize', message: 'pageSize must be provided at most once.' });
		return undefined;
	}
	if (value === undefined) {
		return DEFAULT_PAGE_SIZE;
	}
	const parsed = parseInteger(value.trim());
	if (parsed !== undefined && parsed >= 1 && parsed <= MAX_PAGE_SIZE) {
		return parsed;
	}
	details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
	return undefined;
}

function readSort(value: string | undefined, isRepeated: boolean, details: CourseQueryDetail[]): CourseSort | undefined {
	if (isRepeated) {
		details.push({ field: 'sort', message: 'sort must be provided at most once.' });
		return undefined;
	}
	if (value === undefined) {
		return DEFAULT_SORT;
	}
	const trimmed = value.trim();
	if (isCourseSort(trimmed)) {
		return trimmed;
	}
	details.push({ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' });
	return undefined;
}

function appendUnknown(unknown: readonly string[] | undefined, details: CourseQueryDetail[]): void {
	const fields = [...new Set(unknown ?? [])].sort((left, right) => left.localeCompare(right));
	for (const field of fields) {
		details.push({ field, message: `${field} is not a supported query parameter.` });
	}
}

function parseInteger(value: string): number | undefined {
	if (!/^-?\d+$/.test(value)) {
		return undefined;
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return undefined;
	}
	return parsed;
}

function isCourseModality(value: string): value is CourseModality {
	return COURSE_MODALITIES.some((candidate) => candidate === value);
}

function isCourseStatus(value: string): value is CourseStatus {
	return COURSE_STATUSES.some((candidate) => candidate === value);
}

function isCourseSort(value: string): value is CourseSort {
	return COURSE_SORTS.some((candidate) => candidate === value);
}

function buildPage(courses: readonly Course[], query: ParsedCourseQuery): CourseSearchPage {
	const filtered = courses.map((course) => course.toSnapshot()).filter((course) => matches(course, query));
	filtered.sort((left, right) => compareCourses(left, right, query.sort));
	const totalItems = filtered.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
	const start = (query.page - 1) * query.pageSize;
	return {
		items: filtered.slice(start, start + query.pageSize),
		page: query.page,
		pageSize: query.pageSize,
		totalItems,
		totalPages,
	};
}

function matches(course: CourseSnapshot, query: ParsedCourseQuery): boolean {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	if (query.tag !== undefined && !course.tags.some((tag) => tag.toLocaleLowerCase() === query.tag?.toLocaleLowerCase())) {
		return false;
	}
	if (query.q !== undefined && !containsKeyword(course, query.q)) {
		return false;
	}
	return true;
}

function containsKeyword(course: CourseSnapshot, keyword: string): boolean {
	const needle = keyword.toLocaleLowerCase();
	const haystacks = [course.title, course.summary, ...course.tags];
	return haystacks.some((value) => value.toLocaleLowerCase().includes(needle));
}

function compareCourses(left: CourseSnapshot, right: CourseSnapshot, sort: CourseSort): number {
	const primary = sortValue(left, sort).localeCompare(sortValue(right, sort), 'en', { sensitivity: 'base', numeric: true });
	if (primary !== 0) {
		return primary;
	}
	return left.id.localeCompare(right.id);
}

function sortValue(course: CourseSnapshot, sort: CourseSort): string {
	if (sort === 'title') {
		return course.title;
	}
	if (sort === 'createdAt') {
		return course.createdAt;
	}
	return course.updatedAt;
}
