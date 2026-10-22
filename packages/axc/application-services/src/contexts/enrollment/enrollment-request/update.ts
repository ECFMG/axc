import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { type EnrollmentRequestResult, type EnrollmentRequestStatus, type EnrollmentRequestView, enrollmentRequestNotFound, toEnrollmentRequestView } from './get-by-id.ts';

export interface EnrollmentRequestStatusUpdateCommand {
	id: string;
	status: EnrollmentRequestStatus;
	changedBy: string;
	reason?: string;
}

const EnrollmentRequestAggregate = Domain.Contexts.Enrollment.EnrollmentRequest;

/** Mongoose raises VersionError when another reviewer saved the same request first (optimistic concurrency). */
const isConcurrentUpdate = (error: unknown): boolean => error instanceof Error && error.name === 'VersionError';

export const update = (dataSources: DataSources) => {
	return async (command: EnrollmentRequestStatusUpdateCommand): Promise<EnrollmentRequestResult> => {
		// Unknown or malformed ids are a 404, decided on the read side before opening a transaction.
		if (!(await dataSources.readonlyDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestReadRepo.getById(command.id))) {
			return enrollmentRequestNotFound(command.id);
		}
		const { id, ...change } = command;
		let view: EnrollmentRequestView | undefined;
		try {
			await dataSources.domainDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repo) => {
				const request = await repo.get(id);
				request.changeStatus(change);
				view = toEnrollmentRequestView(await repo.save(request));
			});
		} catch (error) {
			if (error instanceof EnrollmentRequestAggregate.InvalidStatusTransitionError || isConcurrentUpdate(error)) {
				return {
					ok: false,
					error: {
						code: 'INVALID_STATUS_TRANSITION',
						message: error instanceof EnrollmentRequestAggregate.InvalidStatusTransitionError ? error.message : 'The request changed while this update was applied; reload it and try again.',
					},
				};
			}
			if (error instanceof EnrollmentRequestAggregate.EnrollmentRequestValidationError) {
				return { ok: false, error: { code: 'INVALID_REQUEST', message: 'The request could not be completed.', details: [{ field: error.field, message: error.message }] } };
			}
			throw error;
		}
		if (!view) {
			throw new Error('Enrollment request was not saved');
		}
		return { ok: true, value: view };
	};
};
