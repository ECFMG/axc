import { Catalog } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { ApplicationError, invalid } from '../errors.ts';
export interface UpdateStatusCommand {
	id: string;
	status: string;
	changedBy: string;
	reason?: string;
}
export const updateStatus =
	(dataSources: DataSources) =>
	async (command: UpdateStatusCommand): Promise<Catalog.EnrollmentRequest.EnrollmentRequestEntityReference> => {
		if (!command || !Catalog.EnrollmentRequest.enrollmentStatuses.includes(command.status as Catalog.EnrollmentRequest.EnrollmentStatus)) throw invalid('status', 'Invalid status.');
		if (typeof command.changedBy !== 'string' || !command.changedBy.trim()) throw invalid('changedBy', 'changedBy is required.');
		if (command.status === 'rejected' && (typeof command.reason !== 'string' || !command.reason.trim())) throw invalid('reason', 'reason is required for rejection.');
		let result: Catalog.EnrollmentRequest.EnrollmentRequestEntityReference | undefined;
		await dataSources.domainDataSource.Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repo) => {
			const request = await repo.getById(command.id);
			if (!request) throw new ApplicationError('ENROLLMENT_REQUEST_NOT_FOUND', 'Enrollment request not found.');
			try {
				request.transition(command.status as Catalog.EnrollmentRequest.EnrollmentStatus, command.changedBy, command.reason, new Date().toISOString());
			} catch (error) {
				if (error instanceof Catalog.EnrollmentRequest.InvalidStatusTransitionError) throw new ApplicationError('INVALID_STATUS_TRANSITION', 'Invalid status transition.');
				throw error;
			}
			await repo.save(request);
			result = request.toReference();
		});
		if (!result) throw new Error('Status update failed.');
		return result;
	};
