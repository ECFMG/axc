export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof COURSE_MODALITIES)[number];

export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export const DEFAULT_COURSE_PAGE = 1;
export const DEFAULT_COURSE_PAGE_SIZE = 10;
export const MAX_COURSE_PAGE_SIZE = 50;
export const DEFAULT_COURSE_SORT: CourseSortField = 'title';

export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	/** ISO-8601 date string. */
	readonly createdAt: string;
	/** ISO-8601 date string. */
	readonly updatedAt: string;
}

/** Validated search criteria. Optional filters are absent when not requested. */
export interface CourseSearchCriteria {
	readonly q?: string;
	readonly modality?: CourseModality;
	readonly status?: CourseStatus;
	readonly tag?: string;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;
}

export interface CoursePage {
	readonly items: readonly Course[];
	readonly page: number;
	readonly pageSize: number;
	readonly totalItems: number;
	readonly totalPages: number;
}

/** Read-side repository for the course catalog. */
export interface CourseCatalogRepository {
	search(criteria: CourseSearchCriteria): Promise<CoursePage>;
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

/** True when the course satisfies every filter in the criteria. Text comparisons ignore case. */
export function courseMatches(course: Course, criteria: CourseSearchCriteria): boolean {
	if (criteria.modality !== undefined && course.modality !== criteria.modality) {
		return false;
	}
	if (criteria.status !== undefined && course.status !== criteria.status) {
		return false;
	}
	if (criteria.tag !== undefined) {
		const tag = criteria.tag.toLowerCase();
		if (!course.tags.some((candidate) => candidate.toLowerCase() === tag)) {
			return false;
		}
	}
	if (criteria.q !== undefined) {
		const keyword = criteria.q.toLowerCase();
		const haystacks = [course.title, course.summary, ...course.tags];
		if (!haystacks.some((text) => text.toLowerCase().includes(keyword))) {
			return false;
		}
	}
	return true;
}

/** Ascending order on the sort field; ties fall back to id so pages are stable. */
export function compareCourses(sort: CourseSortField): (a: Course, b: Course) => number {
	return (a, b) => {
		const primary = sort === 'title' ? a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }) : Date.parse(a[sort]) - Date.parse(b[sort]);
		return primary !== 0 ? primary : a.id.localeCompare(b.id);
	};
}

/** Applies the catalog search rules (filter, sort, paginate) to a set of courses. */
export function searchCourses(courses: readonly Course[], criteria: CourseSearchCriteria): CoursePage {
	const matching = courses.filter((course) => courseMatches(course, criteria)).sort(compareCourses(criteria.sort));
	const start = (criteria.page - 1) * criteria.pageSize;
	return {
		items: matching.slice(start, start + criteria.pageSize),
		page: criteria.page,
		pageSize: criteria.pageSize,
		totalItems: matching.length,
		totalPages: Math.ceil(matching.length / criteria.pageSize),
	};
}
