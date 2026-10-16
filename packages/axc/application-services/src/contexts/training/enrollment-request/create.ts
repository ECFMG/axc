import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const create =
	(dataSources: DataSources) =>
	async (command: Domain.Contexts.Training.EnrollmentRequest.CreateEnrollmentRequestInput): Promise<Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestRecord> => {
		const course = await dataSources.readonlyDataSource.Training.Course.getById(command.courseId);
		if (course === undefined) {
			throw new Domain.Contexts.Training.EnrollmentRequest.EnrollmentWorkflowError('COURSE_NOT_FOUND', 'courseId', 'The course was not found.');
		}
		if (course.status !== 'active') {
			throw new Domain.Contexts.Training.EnrollmentRequest.EnrollmentWorkflowError('COURSE_NOT_ACTIVE', 'courseId', 'Enrollment requires an active course.');
		}
		let created: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestRecord | undefined;
		const id = `enroll-${crypto.randomUUID()}`;
		const now = new Date().toISOString();
		await dataSources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repository) => {
			const aggregate = await repository.getNewInstance(command, id, now);
			const saved = await repository.save(aggregate);
			created = saved.props.record;
		});
		if (created === undefined) {
			throw new Error('Enrollment transaction completed without a result.');
		}
		return created;
	};
