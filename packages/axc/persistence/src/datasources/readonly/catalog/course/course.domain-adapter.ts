import type { Domain } from '@axc/domain';
import type { CourseDocument } from '../../../../models/catalog/index.ts';

export function courseToDomain(document: CourseDocument): Domain.Contexts.Catalog.Course.CourseEntityReference {
	return {
		id: document.courseId,
		title: document.title,
		summary: document.summary,
		modality: document.modality,
		status: document.status,
		tags: [...document.tags],
		createdAt: document.createdAt.toISOString(),
		updatedAt: document.updatedAt.toISOString(),
	};
}
