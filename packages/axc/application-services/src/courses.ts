import type { Course, CourseModality, CourseReadRepository, CourseStatus } from '@axc/domain';

export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSort = (typeof COURSE_SORT_FIELDS)[number];
export const DEFAULT_COURSE_PAGE = 1;
export const DEFAULT_COURSE_PAGE_SIZE = 10;
export const MAX_COURSE_PAGE_SIZE = 50;
export const DEFAULT_COURSE_SORT: CourseSort = 'title';

export interface CourseSearchInput {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSort;
}

export interface CourseSearchResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

function matchesCourse(course: Course, input: CourseSearchInput): boolean {
	if (input.modality !== undefined && course.modality !== input.modality) return false;
	if (input.status !== undefined && course.status !== input.status) return false;
	if (input.tag !== undefined && !course.tags.some((tag) => tag.toLowerCase() === input.tag?.toLowerCase())) return false;
	if (input.q !== undefined) {
		const keyword = input.q.toLowerCase();
		const searchableFields = [course.title, course.summary, ...course.tags];
		if (!searchableFields.some((field) => field.toLowerCase().includes(keyword))) return false;
	}
	return true;
}

function compareCourses(left: Course, right: Course, sort: CourseSort): number {
	const order = sort === 'title' ? left.title.localeCompare(right.title, 'en') : Date.parse(left[sort]) - Date.parse(right[sort]);
	return order || left.id.localeCompare(right.id, 'en');
}

export function createCourseSearch(repository: CourseReadRepository): (input: CourseSearchInput) => Promise<CourseSearchResult> {
	return async (input) => {
		const courses = await repository.getAll();
		const matches = courses.filter((course) => matchesCourse(course, input));
		matches.sort((left, right) => compareCourses(left, right, input.sort));
		const totalItems = matches.length;
		const totalPages = Math.ceil(totalItems / input.pageSize);
		// Avoid unsafe multiplication for valid, very large page numbers.
		const offset = input.page > totalPages ? totalItems : (input.page - 1) * input.pageSize;
		return {
			items: matches.slice(offset, offset + input.pageSize),
			page: input.page,
			pageSize: input.pageSize,
			totalItems,
			totalPages,
		};
	};
}
