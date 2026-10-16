import type { Domain } from '@axc/domain';
import type { FilterQuery } from 'mongoose';
import type { CourseDocument, CourseModelType } from '../../../../models/training/course.model.ts';

const literal = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const getCourseReadRepository = (model: CourseModelType): Domain.Contexts.Training.Course.CourseReadRepository => {
	const toCourse = (doc: CourseDocument): Domain.Contexts.Training.Course.Course => ({
		id: doc.courseId,
		title: doc.title,
		summary: doc.summary,
		modality: doc.modality,
		status: doc.status,
		tags: [...doc.tags],
		createdAt: doc.createdAt.toISOString(),
		updatedAt: doc.updatedAt.toISOString(),
	});
	return {
		async search(criteria) {
			const filter: FilterQuery<CourseDocument> = {};
			if (criteria.q !== undefined) {
				const expression = new RegExp(literal(criteria.q), 'i');
				filter.$or = [{ title: expression }, { summary: expression }, { tags: expression }];
			}
			if (criteria.modality !== undefined) {
				filter.modality = criteria.modality;
			}
			if (criteria.status !== undefined) {
				filter.status = criteria.status;
			}
			if (criteria.tag !== undefined) {
				filter.tags = new RegExp(`^${literal(criteria.tag)}$`, 'i');
			}
			const [documents, totalItems] = await Promise.all([
				model
					.find(filter)
					.sort({ [criteria.sort]: 1, courseId: 1 })
					.skip((criteria.page - 1) * criteria.pageSize)
					.limit(criteria.pageSize)
					.exec(),
				model.countDocuments(filter).exec(),
			]);
			return { items: documents.map(toCourse), page: criteria.page, pageSize: criteria.pageSize, totalItems, totalPages: Math.ceil(totalItems / criteria.pageSize) };
		},
		async queryById(id) {
			const doc = await model.findOne({ courseId: id }).exec();
			return doc === null ? undefined : toCourse(doc);
		},
	};
};
