import { Catalog } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

export interface UpdateStatusCommand {
	id: string;
	status: Catalog.EnrollmentRequest.EnrollmentStatus;
	changedBy: string;
	reason?: string;
}
export const updateStatus =
	(dataSources: DataSources) =>
	(command: UpdateStatusCommand): Promise<Catalog.EnrollmentRequest.EnrollmentRequest> =>
		dataSources.domainDataSource.Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repository) => {
			const request = await repository.getById(command.id);
			if (!request) throw new Catalog.EnrollmentRequest.EnrollmentError('ENROLLMENT_REQUEST_NOT_FOUND', 'Enrollment request not found.');
			return repository.save(Catalog.EnrollmentRequest.transitionEnrollmentRequest(request, command.status, command.changedBy, command.reason ?? null, new Date().toISOString()));
		});
