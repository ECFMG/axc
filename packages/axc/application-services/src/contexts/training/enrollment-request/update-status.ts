import { Training } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { ApplicationFailure } from '../errors.ts';
import { type EnrollmentResult, toEnrollmentResult } from './contracts.ts';
export interface EnrollmentUpdateStatusCommand {
	id: string;
	status: string;
	changedBy: string;
	reason?: string;
}
export const updateStatus =
	(dataSources: DataSources) =>
	async (command: EnrollmentUpdateStatusCommand): Promise<EnrollmentResult> => {
		const details: { field: string; message: string }[] = [];
		if (!['pending', 'approved', 'rejected', 'cancelled'].includes(command.status)) details.push({ field: 'status', message: 'Invalid status.' });
		if (!command.changedBy?.trim()) details.push({ field: 'changedBy', message: 'changedBy is required.' });
		if (command.status === 'rejected' && !command.reason?.trim()) details.push({ field: 'reason', message: 'reason is required for rejection.' });
		if (details.length) throw new ApplicationFailure('INVALID_REQUEST', 'The request could not be completed.', details);
		let result: EnrollmentResult | undefined;
		await dataSources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repo) => {
			const request = await repo.getById(command.id);
			if (!request) throw new ApplicationFailure('ENROLLMENT_REQUEST_NOT_FOUND', 'Enrollment request not found.');
			try {
				request.transition(new Training.EnrollmentRequest.EnrollmentStatus(command.status as Training.EnrollmentRequest.EnrollmentStatusValue), command.changedBy, command.reason, new Date().toISOString());
			} catch (error) {
				if (error instanceof Training.EnrollmentRequest.InvalidStatusTransition) throw new ApplicationFailure('INVALID_STATUS_TRANSITION', 'Invalid status transition.');
				throw error;
			}
			await repo.save(request);
			result = toEnrollmentResult(request);
		});
		if (!result) throw new Error('Status update failed');
		return result;
	};
