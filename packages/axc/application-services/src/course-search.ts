import { COURSE_MODALITIES, COURSE_STATUSES, type Course } from '@axc/domain';

const COURSE_SORTS = ['title', 'createdAt', 'updatedAt'] as const;

type CourseSort = (typeof COURSE_SORTS)[number];

interface CourseQueryDetail {
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

const INVALID_QUERY_MESSAGE = 'One or more query parameters are invalid.';
const MODALITY_MESSAGE = 'modality must be one of online, in-person, hybrid.';
const STATUS_MESSAGE = 'status must be one of draft, active, retired.';
const TAG_MESSAGE = 'tag must be a non-empty string.';
const PAGE_MESSAGE = 'page must be an integer greater than or equal to 1.';
const PAGE_SIZE_MESSAGE = 'pageSize must be between 1 and 50.';
const SORT_MESSAGE = 'sort must be one of title, createdAt, updatedAt.';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export class InvalidCourseQueryError extends Error {
	readonly code = 'INVALID_QUERY_PARAMETER' as const;
	readonly details: readonly CourseQueryDetail[];

	constructor(details: readonly CourseQueryDetail[]) {
		super(INVALID_QUERY_MESSAGE);
		this.name = 'InvalidCourseQueryError';
		this.details = [...details];
	}
}

export function searchCourses(courses: readonly Course[], rawQuery: Readonly<Record<string, string>>): CoursePage {
	const details: CourseQueryDetail[] = [];
	const keyword = readKeyword(rawQuery);
	const modality = readChoice(rawQuery, 'modality', COURSE_MODALITIES, MODALITY_MESSAGE, details);
	const status = readChoice(rawQuery, 'status', COURSE_STATUSES, STATUS_MESSAGE, details);
	const tag = readTag(rawQuery, details);
	const page = readBoundedInteger(rawQuery, 'page', DEFAULT_PAGE, 1, Number.MAX_SAFE_INTEGER, PAGE_MESSAGE, details);
	const pageSize = readBoundedInteger(rawQuery, 'pageSize', DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE, PAGE_SIZE_MESSAGE, details);
	const sort = readChoice(rawQuery, 'sort', COURSE_SORTS, SORT_MESSAGE, details) ?? 'title';

	if (details.length > 0) {
		throw new InvalidCourseQueryError(details);
	}

	const matched = courses.filter((course) => matchesCourse(course, keyword, modality, status, tag));
	const sorted = [...matched].sort((left, right) => compareCourses(left, right, sort));
	const start = (page - 1) * pageSize;
	const totalItems = sorted.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

	return {
		items: sorted.slice(start, start + pageSize).map(copyCourse),
		page,
		pageSize,
		totalItems,
		totalPages,
	};
}

function matchesCourse(course: Course, keyword: string | undefined, modality: Course['modality'] | undefined, status: Course['status'] | undefined, tag: string | undefined): boolean {
	if (keyword !== undefined && !matchesKeyword(course, keyword)) {
		return false;
	}
	if (modality !== undefined && course.modality !== modality) {
		return false;
	}
	if (status !== undefined && course.status !== status) {
		return false;
	}
	if (tag !== undefined && !matchesTag(course, tag)) {
		return false;
	}
	return true;
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	if (course.title.toLowerCase().includes(needle)) {
		return true;
	}
	if (course.summary.toLowerCase().includes(needle)) {
		return true;
	}
	return course.tags.some((item) => item.toLowerCase().includes(needle));
}

function matchesTag(course: Course, tag: string): boolean {
	const needle = tag.toLowerCase();
	return course.tags.some((item) => item.toLowerCase() === needle);
}

function compareCourses(left: Course, right: Course, sort: CourseSort): number {
	const primary = compareText(sortKey(left, sort), sortKey(right, sort));
	if (primary !== 0) {
		return primary;
	}
	return compareText(left.id, right.id);
}

function sortKey(course: Course, sort: CourseSort): string {
	if (sort === 'title') {
		return course.title;
	}
	if (sort === 'createdAt') {
		return course.createdAt;
	}
	return course.updatedAt;
}

function compareText(left: string, right: string): number {
	const leftKey = left.toLowerCase();
	const rightKey = right.toLowerCase();
	if (leftKey < rightKey) {
		return -1;
	}
	if (leftKey > rightKey) {
		return 1;
	}
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
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

function readKeyword(rawQuery: Readonly<Record<string, string>>): string | undefined {
	return trimmedField(rawQuery, 'q');
}

function readTag(rawQuery: Readonly<Record<string, string>>, details: CourseQueryDetail[]): string | undefined {
	if (!Object.hasOwn(rawQuery, 'tag')) {
		return undefined;
	}
	// biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access
	const value = rawQuery['tag'];
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		details.push({ field: 'tag', message: TAG_MESSAGE });
		return undefined;
	}
	return trimmed;
}

function readChoice<T extends string>(rawQuery: Readonly<Record<string, string>>, field: string, allowed: readonly T[], message: string, details: CourseQueryDetail[]): T | undefined {
	if (!Object.hasOwn(rawQuery, field)) {
		return undefined;
	}
	const value = rawQuery[field];
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (isAllowed(trimmed, allowed)) {
		return trimmed;
	}
	details.push({ field, message });
	return undefined;
}

function readBoundedInteger(rawQuery: Readonly<Record<string, string>>, field: string, defaultValue: number, minimum: number, maximum: number, message: string, details: CourseQueryDetail[]): number {
	if (!Object.hasOwn(rawQuery, field)) {
		return defaultValue;
	}
	const value = rawQuery[field];
	if (value === undefined) {
		return defaultValue;
	}
	const trimmed = value.trim();
	if (!/^[1-9]\d*$/.test(trimmed)) {
		details.push({ field, message });
		return defaultValue;
	}
	const parsed = Number(trimmed);
	if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
		details.push({ field, message });
		return defaultValue;
	}
	return parsed;
}

function trimmedField(rawQuery: Readonly<Record<string, string>>, field: string): string | undefined {
	if (!Object.hasOwn(rawQuery, field)) {
		return undefined;
	}
	const value = rawQuery[field];
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return undefined;
	}
	return trimmed;
}

function isAllowed<T extends string>(value: string, allowed: readonly T[]): value is T {
	return allowed.some((item) => item === value);
}
