import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const create =
	(dataSources: DataSources) =>
	async (command: Domain.Contexts.Training.EnrollmentRequest.CreateEnrollmentRequest): Promise<Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest> => {
		const course = await dataSources.readonlyDataSource.Training.Course.queryById(command.courseId);
		if (course === undefined) {
			throw new Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestError('COURSE_NOT_FOUND');
		}
		if (course.status !== 'active') {
			throw new Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestError('COURSE_NOT_ACTIVE');
		}
		let result: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest | undefined;
		await dataSources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repository) => {
			if (await repository.hasActiveRequest(command.courseId, command.learnerEmail)) {
				throw new Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestError('DUPLICATE_ACTIVE_REQUEST');
			}
			const request = await repository.getNewInstance(command);
			result = (await repository.save(request)).toRecord();
		});
		if (result === undefined) {
			throw new Error('Creation transaction did not return a request');
		}
		return result;
	};
