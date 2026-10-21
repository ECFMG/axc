import { type Course, type CourseCatalog, courseCatalogSeed } from '@axc/domain';

export type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';

/** In-memory course catalog seeded for local and test runs. */
export function createSeededCourseCatalog(): CourseCatalog {
	const courses = courseCatalogSeed.map(copyCourse);
	return {
		listCourses(): Promise<readonly Course[]> {
			return Promise.resolve(courses.map(copyCourse));
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
