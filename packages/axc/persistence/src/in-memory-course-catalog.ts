import type { Course, CourseCatalog } from '@axc/domain';
import { seedCourses } from './course-seed.ts';

export function createSeedCourseCatalog(courses: readonly Course[] = seedCourses): CourseCatalog {
	const stored = courses.map(copyCourse);
	return {
		listAll() {
			return Promise.resolve(stored.map(copyCourse));
		},
	};
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
