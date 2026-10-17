import type { Course } from '@axc/domain';
import { listCourses } from '@axc/persistence';

export interface CourseQuery {
	q?: string;
	modality?: Course['modality'];
	status?: Course['status'];
	tag?: string;
	page: number;
	pageSize: number;
	sort: 'title' | 'createdAt' | 'updatedAt';
}

export function searchCourses(query: CourseQuery) {
	const keyword = query.q?.toLowerCase();
	const tag = query.tag?.toLowerCase();
	const matches = listCourses().filter(
		(course) =>
			(!keyword || [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(keyword))) &&
			(!query.modality || course.modality === query.modality) &&
			(!query.status || course.status === query.status) &&
			(!tag || course.tags.some((value) => value.toLowerCase() === tag)),
	);
	matches.sort((a, b) => a[query.sort].localeCompare(b[query.sort]) || a.id.localeCompare(b.id));
	const start = (query.page - 1) * query.pageSize;
	return { items: matches.slice(start, start + query.pageSize), page: query.page, pageSize: query.pageSize, totalItems: matches.length, totalPages: Math.ceil(matches.length / query.pageSize) };
}
