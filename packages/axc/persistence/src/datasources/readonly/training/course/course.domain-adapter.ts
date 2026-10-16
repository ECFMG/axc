import type { Domain } from '@axc/domain';
import type { CourseDocument } from '../../../../models/training/index.ts';
export function courseToDomain(doc: CourseDocument): Domain.Contexts.Training.Course.Course {
	return { id: doc.courseId, title: doc.title, summary: doc.summary, modality: doc.modality, status: doc.status, tags: [...doc.tags], createdAt: doc.createdAt.toISOString(), updatedAt: doc.updatedAt.toISOString() };
}
