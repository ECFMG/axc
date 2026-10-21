import type { Course } from '@axc/domain';
import { courseSeed } from './course-seed.ts';

/** Returns a copy of the in-memory course catalog. */
export function readCourseCatalog(): readonly Course[] {
	return courseSeed.map((course) => copyCourse(course));
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
