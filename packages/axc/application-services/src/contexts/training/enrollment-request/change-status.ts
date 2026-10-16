import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const changeStatus =
	(dataSources: DataSources) =>
	async (command: Domain.Contexts.Training.EnrollmentRequest.ChangeEnrollmentRequestStatusInput): Promise<Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestRecord> => {
		let updated: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestRecord | undefined;
		await dataSources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repository) => {
			const aggregate = await repository.findById(command.id);
			if (aggregate === undefined) {
				throw new Domain.Contexts.Training.EnrollmentRequest.EnrollmentWorkflowError('ENROLLMENT_REQUEST_NOT_FOUND', 'id', 'The enrollment request was not found.');
			}
			aggregate.changeStatus(command, new Date().toISOString());
			const saved = await repository.save(aggregate);
			updated = saved.props.record;
		});
		if (updated === undefined) {
			throw new Error('Enrollment transaction completed without a result.');
		}
		return updated;
	};
