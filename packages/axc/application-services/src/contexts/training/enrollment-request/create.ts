import { randomUUID } from 'node:crypto';
import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const create = (dataSources: DataSources) => {
	return async (input: Domain.Contexts.Training.EnrollmentRequest.CreateEnrollmentInput) => {
		const course = await dataSources.readonlyDataSource.Training.Course.CourseReadRepo.getById(input.courseId);
		const item = Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest.create(randomUUID(), input, course, new Date().toISOString());
		await dataSources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withTransaction(undefined, async (repo) => {
			await repo.save(item);
		});
		return item.toSnapshot();
	};
};
