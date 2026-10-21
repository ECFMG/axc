export const courseModalities = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof courseModalities)[number];

export const courseStatuses = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof courseStatuses)[number];

export const courseSorts = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSort = (typeof courseSorts)[number];

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
	sort: CourseSort;
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface CourseRepository {
	getById(id: string): Promise<Course | undefined>;
	list(): Promise<readonly Course[]>;
}

export function pageCourses(courses: readonly Course[], query: CourseSearchQuery): CoursePage {
	const filtered = courses.filter((course) => matchesCourse(course, query));
	const sorted = [...filtered].sort((left, right) => compareCourses(left, right, query.sort));
	const start = (query.page - 1) * query.pageSize;
	const totalItems = sorted.length;
	return {
		items: sorted.slice(start, start + query.pageSize),
		page: query.page,
		pageSize: query.pageSize,
		totalItems,
		totalPages: Math.ceil(totalItems / query.pageSize),
	};
}

function matchesCourse(course: Course, query: CourseSearchQuery): boolean {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	if (query.tag !== undefined && !course.tags.some((tag) => tag.toLowerCase() === query.tag?.toLowerCase())) {
		return false;
	}
	if (query.q !== undefined && !matchesKeyword(course, query.q)) {
		return false;
	}
	return true;
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	if (course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle)) {
		return true;
	}
	return course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function compareCourses(left: Course, right: Course, sort: CourseSort): number {
	const primary = left[sort].localeCompare(right[sort]);
	return primary === 0 ? left.id.localeCompare(right.id) : primary;
}
