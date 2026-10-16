import { type EnrollmentRequestEntityReference, InvalidEnrollmentValueError, InvalidStatusTransitionError, Status } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { ApplicationError } from '../errors.ts';
export interface EnrollmentRequestStatusCommand {
	id: string;
	status: string;
	changedBy: string;
	reason?: string;
}
export const changeStatus =
	(dataSources: DataSources) =>
	async (command: EnrollmentRequestStatusCommand): Promise<EnrollmentRequestEntityReference> => {
		if (typeof command.status !== 'string') throw new ApplicationError(400, 'INVALID_REQUEST', 'status is invalid.', 'status');
		if (typeof command.changedBy !== 'string') throw new ApplicationError(400, 'INVALID_REQUEST', 'changedBy is required.', 'changedBy');
		if (command.reason !== undefined && typeof command.reason !== 'string') throw new ApplicationError(400, 'INVALID_REQUEST', 'reason must be a string.', 'reason');
		let status: Status;
		try {
			status = new Status(command.status);
		} catch {
			throw new ApplicationError(400, 'INVALID_REQUEST', 'status is invalid.', 'status');
		}
		let changed: EnrollmentRequestEntityReference | undefined;
		await dataSources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repository) => {
			const request = await repository.getById(command.id);
			if (!request) throw new ApplicationError(404, 'ENROLLMENT_REQUEST_NOT_FOUND', 'Enrollment request not found.');
			try {
				request.transition(status, command.changedBy, command.reason, new Date().toISOString());
			} catch (error) {
				if (error instanceof InvalidStatusTransitionError) throw new ApplicationError(409, 'INVALID_STATUS_TRANSITION', error.message);
				if (error instanceof InvalidEnrollmentValueError) throw new ApplicationError(400, 'INVALID_REQUEST', error.message, error.message.startsWith('reason') ? 'reason' : 'changedBy');
				throw error;
			}
			changed = (await repository.save(request)).toReference();
		});
		if (!changed) throw new Error('Enrollment request update failed.');
		return changed;
	};
