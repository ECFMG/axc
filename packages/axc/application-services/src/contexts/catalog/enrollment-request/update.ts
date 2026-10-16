import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

type EnrollmentRequestSnapshot = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestSnapshot;

export interface UpdateEnrollmentRequestStatusCommand {
	id: string;
	status: string | undefined;
	changedBy: string | undefined;
	reason: string | undefined;
}

export const update = (dataSources: DataSources) => {
	return async (command: UpdateEnrollmentRequestStatusCommand): Promise<EnrollmentRequestSnapshot> => {
		Domain.Contexts.Catalog.EnrollmentRequest.parseEnrollmentRequestStatus(command.status);
		Domain.Contexts.Catalog.EnrollmentRequest.parseChangedBy(command.changedBy);
		if (command.status === 'rejected') {
			Domain.Contexts.Catalog.EnrollmentRequest.parseRejectionReason(command.reason);
		}

		let updated: EnrollmentRequestSnapshot | undefined;
		await dataSources.domainDataSource.Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repository) => {
			const request = await repository.get(command.id);
			request.changeStatus({
				status: command.status ?? '',
				changedBy: command.changedBy,
				reason: command.reason,
				now: new Date().toISOString(),
			});
			updated = await repository.save(request);
		});

		if (updated === undefined) {
			throw new Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestNotFoundError();
		}
		return updated;
	};
};
