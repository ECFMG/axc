import { type EnrollmentRequest, type EnrollmentStatus, mayTransition } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { CatalogError, CatalogValidationError } from '../errors.ts';
export interface UpdateEnrollmentStatusCommand {
	id: string;
	status: EnrollmentStatus;
	changedBy: string;
	reason?: string;
}
export const updateStatus =
	(dataSources: DataSources) =>
	async (command: UpdateEnrollmentStatusCommand): Promise<EnrollmentRequest> => {
		const details: { field: string; message: string }[] = [];
		if (!['pending', 'approved', 'rejected', 'cancelled'].includes(command.status)) details.push({ field: 'status', message: 'status is invalid.' });
		if (typeof command.changedBy !== 'string' || !command.changedBy.trim()) details.push({ field: 'changedBy', message: 'changedBy is required.' });
		if (command.status === 'rejected' && (typeof command.reason !== 'string' || !command.reason.trim())) details.push({ field: 'reason', message: 'reason is required for rejection.' });
		if (details.length) throw new CatalogValidationError(details);
		return await dataSources.domainDataSource.Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction((repo) => {
			const request = repo.getById(command.id);
			if (!request) throw new CatalogError('ENROLLMENT_REQUEST_NOT_FOUND', 'Enrollment request not found.');
			if (!mayTransition(request.status, command.status)) throw new CatalogError('INVALID_STATUS_TRANSITION', 'Invalid status transition.');
			const now = new Date().toISOString();
			request.statusHistory.push({ fromStatus: request.status, toStatus: command.status, changedAt: now, changedBy: command.changedBy.trim(), reason: command.reason?.trim() || null });
			request.status = command.status;
			request.updatedAt = now;
			repo.save(request);
			return request;
		});
	};
