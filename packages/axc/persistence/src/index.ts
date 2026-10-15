import { type Course, type CourseCatalog, courseCatalogSeed } from '@axc/domain';

export type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';

export function createCourseCatalog(): CourseCatalog {
	return {
		list(): readonly Course[] {
			return courseCatalogSeed.map((course) => ({
				id: course.id,
				title: course.title,
				summary: course.summary,
				modality: course.modality,
				status: course.status,
				tags: [...course.tags],
				createdAt: course.createdAt,
				updatedAt: course.updatedAt,
			}));
		},
	};
}
