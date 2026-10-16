import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const updateStatus =
	(dataSources: DataSources) =>
	async (command: Domain.Contexts.Training.EnrollmentRequest.ChangeEnrollmentRequestStatus): Promise<Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest> => {
		let result: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest | undefined;
		await dataSources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repository) => {
			const request = await repository.queryById(command.id);
			if (request === undefined) {
				throw new Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestError('ENROLLMENT_REQUEST_NOT_FOUND');
			}
			request.changeStatus(command.status, { changedBy: command.changedBy }, command.reason);
			result = (await repository.save(request)).toRecord();
		});
		if (result === undefined) {
			throw new Error('Status transaction did not return a request');
		}
		return result;
	};
