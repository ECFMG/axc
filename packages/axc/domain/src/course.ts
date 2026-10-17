export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof COURSE_MODALITIES)[number];

export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface CourseSearchCriteria {
	readonly q?: string;
	readonly modality?: CourseModality;
	readonly status?: CourseStatus;
	readonly tag?: string;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;
}

export interface CourseSearchPage {
	readonly items: readonly Course[];
	readonly page: number;
	readonly pageSize: number;
	readonly totalItems: number;
	readonly totalPages: number;
}

export function searchCourseCatalog(courses: readonly Course[], criteria: CourseSearchCriteria): CourseSearchPage {
	const matched = courses.filter((course) => matchesCriteria(course, criteria));
	const sorted = matched.toSorted((left, right) => compareCourses(left, right, criteria.sort));
	const start = (criteria.page - 1) * criteria.pageSize;
	const items = sorted.slice(start, start + criteria.pageSize).map(copyCourse);
	const totalItems = sorted.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / criteria.pageSize);

	return {
		items,
		page: criteria.page,
		pageSize: criteria.pageSize,
		totalItems,
		totalPages,
	};
}

function matchesCriteria(course: Course, criteria: CourseSearchCriteria): boolean {
	if (criteria.q !== undefined && !matchesKeyword(course, criteria.q)) {
		return false;
	}
	if (criteria.modality !== undefined && course.modality !== criteria.modality) {
		return false;
	}
	if (criteria.status !== undefined && course.status !== criteria.status) {
		return false;
	}
	if (criteria.tag !== undefined && !hasTag(course, criteria.tag)) {
		return false;
	}
	return true;
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLocaleLowerCase('en');
	if (course.title.toLocaleLowerCase('en').includes(needle)) {
		return true;
	}
	if (course.summary.toLocaleLowerCase('en').includes(needle)) {
		return true;
	}
	return course.tags.some((tag) => tag.toLocaleLowerCase('en').includes(needle));
}

function hasTag(course: Course, tag: string): boolean {
	const needle = tag.toLocaleLowerCase('en');
	return course.tags.some((candidate) => candidate.toLocaleLowerCase('en') === needle);
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	const primary = sortValue(left, sort).localeCompare(sortValue(right, sort), 'en', { numeric: true, sensitivity: 'base' });
	if (primary !== 0) {
		return primary;
	}
	return left.id.localeCompare(right.id, 'en');
}

function sortValue(course: Course, sort: CourseSortField): string {
	if (sort === 'title') {
		return course.title;
	}
	if (sort === 'createdAt') {
		return course.createdAt;
	}
	return course.updatedAt;
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
