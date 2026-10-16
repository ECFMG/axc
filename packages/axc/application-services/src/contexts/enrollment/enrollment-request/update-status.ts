import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

export interface EnrollmentRequestUpdateStatusCommand {
	id: string;
	status: 'pending' | 'approved' | 'rejected' | 'cancelled';
	changedBy: string;
	reason?: string | null;
}

export const updateStatus = (dataSources: DataSources) => {
	return async (command: EnrollmentRequestUpdateStatusCommand): Promise<Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestEntityReference> => {
		await dataSources.domainDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repo) => {
			const request = await repo.getById(command.id);
			request.changeStatus(command.status, command.changedBy, command.reason ?? null);
			await repo.save(request);
		});
		const updated = await dataSources.readonlyDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestReadRepo.getById(command.id);
		if (!updated) {
			throw new Error('ENROLLMENT_REQUEST_NOT_FOUND');
		}
		return updated;
	};
};
