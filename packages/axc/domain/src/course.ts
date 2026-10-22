const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

export const DEFAULT_COURSE_PAGE = 1;
export const DEFAULT_COURSE_PAGE_SIZE = 10;
export const MAX_COURSE_PAGE_SIZE = 50;

export type CourseModality = (typeof COURSE_MODALITIES)[number];
export type CourseStatus = (typeof COURSE_STATUSES)[number];
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: readonly string[];
	createdAt: string;
	updatedAt: string;
}

export interface CourseSearchQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export function isCourseModality(value: string): value is CourseModality {
	return (COURSE_MODALITIES as readonly string[]).includes(value);
}

export function isCourseStatus(value: string): value is CourseStatus {
	return (COURSE_STATUSES as readonly string[]).includes(value);
}

export function isCourseSortField(value: string): value is CourseSortField {
	return (COURSE_SORT_FIELDS as readonly string[]).includes(value);
}

export function searchCourses(courses: readonly Course[], query: CourseSearchQuery): CoursePage {
	const filtered = courses.filter((course) => matchesCourse(course, query));
	const sorted = [...filtered].sort((left, right) => compareCourses(left, right, query.sort));
	const totalItems = sorted.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
	const start = (query.page - 1) * query.pageSize;
	const items = sorted.slice(start, start + query.pageSize);
	return {
		items,
		page: query.page,
		pageSize: query.pageSize,
		totalItems,
		totalPages,
	};
}

function matchesCourse(course: Course, query: CourseSearchQuery): boolean {
	if (query.q !== undefined && !matchesKeyword(course, query.q)) {
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

function hasTag(course: Course, tag: string): boolean {
	const needle = tag.toLowerCase();
	return course.tags.some((candidate) => candidate.toLowerCase() === needle);
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	if (course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle)) {
		return true;
	}
	return course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	const primary = compareText(left[sort], right[sort]);
	if (primary !== 0) {
		return primary;
	}
	return compareText(left.id, right.id);
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
