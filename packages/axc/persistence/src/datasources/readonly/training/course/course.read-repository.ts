import type { Domain } from '@axc/domain';
import type { CourseDocument, CourseModelType } from '../../../../models/training/course.model.ts';

type CourseSearchCriteria = Domain.Contexts.Training.Course.CourseSearchCriteria;
const literalPattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const getCourseReadRepository = (model: CourseModelType): Domain.Contexts.Training.Course.CourseReadRepository => ({
	async getById(id) {
		const document = await model.findOne({ 'record.id': id }).lean().exec();
		return document?.record;
	},
	async search(criteria: CourseSearchCriteria) {
		const filter: Record<string, unknown> = {};
		if (criteria.q !== undefined) {
			const pattern = { $regex: literalPattern(criteria.q), $options: 'i' };
			// biome-ignore lint/complexity/useLiteralKeys: MongoDB operator is an index signature
			filter['$or'] = [{ 'record.title': pattern }, { 'record.summary': pattern }, { 'record.tags': pattern }];
		}
		if (criteria.modality !== undefined) {
			filter['record.modality'] = criteria.modality;
		}
		if (criteria.status !== undefined) {
			filter['record.status'] = criteria.status;
		}
		if (criteria.tag !== undefined) {
			filter['record.tags'] = { $regex: `^${literalPattern(criteria.tag)}$`, $options: 'i' };
		}
		const [documents, totalItems] = await Promise.all([
			model
				.find(filter)
				.sort({ [`record.${criteria.sort}`]: 1, 'record.id': 1 })
				.skip((criteria.page - 1) * criteria.pageSize)
				.limit(criteria.pageSize)
				.lean()
				.exec(),
			model.countDocuments(filter).exec(),
		]);
		return { items: documents.map((document: Pick<CourseDocument, 'record'>) => document.record), page: criteria.page, pageSize: criteria.pageSize, totalItems, totalPages: Math.ceil(totalItems / criteria.pageSize) };
	},
});
