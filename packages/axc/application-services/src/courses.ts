import type { Course, CourseCatalog } from '@axc/domain';

export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

export interface CourseSearch {
	q?: string;
	modality?: Course['modality'];
	status?: Course['status'];
	tag?: string;
	page: number;
	pageSize: number;
	sort: (typeof COURSE_SORT_FIELDS)[number];
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export function createCourseService(catalog: CourseCatalog) {
	return {
		async search(input: CourseSearch): Promise<CoursePage> {
			const q = input.q?.toLowerCase();
			const tag = input.tag?.toLowerCase();
			const courses = (await catalog.list()).filter(
				(course) =>
					(!q || [course.title, course.summary, ...course.tags].some((text) => text.toLowerCase().includes(q))) &&
					(!input.modality || course.modality === input.modality) &&
					(!input.status || course.status === input.status) &&
					(!tag || course.tags.some((value) => value.toLowerCase() === tag)),
			);
			courses.sort((a, b) => a[input.sort].localeCompare(b[input.sort]) || a.id.localeCompare(b.id));
			const offset = (input.page - 1) * input.pageSize;
			return {
				items: courses.slice(offset, offset + input.pageSize),
				page: input.page,
				pageSize: input.pageSize,
				totalItems: courses.length,
				totalPages: Math.ceil(courses.length / input.pageSize),
			};
		},
	};
}
