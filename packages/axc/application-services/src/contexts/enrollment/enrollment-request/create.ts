import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { type EnrollmentRequestResult, type EnrollmentRequestView, toEnrollmentRequestView } from './get-by-id.ts';

export interface EnrollmentRequestCreateCommand {
	courseId: string;
	learnerEmail: string;
	justification: string;
}

const EnrollmentRequestAggregate = Domain.Contexts.Enrollment.EnrollmentRequest;

/** Thrown inside the transaction so nothing is written when the learner already has an active request. */
class DuplicateActiveRequestError extends Error {}

/** MongoDB duplicate-key error from the unique partial index on active requests (a concurrent create won the race). */
const isDuplicateKeyError = (error: unknown): boolean => typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

const duplicate: EnrollmentRequestResult = {
	ok: false,
	error: { code: 'DUPLICATE_ACTIVE_REQUEST', message: 'The learner already has a pending or approved request for this course.' },
};

export const create = (dataSources: DataSources) => {
	return async (command: EnrollmentRequestCreateCommand): Promise<EnrollmentRequestResult> => {
		const course = await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.getById(command.courseId);
		if (!course) {
			return { ok: false, error: { code: 'COURSE_NOT_FOUND', message: `Course ${command.courseId} was not found.` } };
		}
		const readRepo = dataSources.readonlyDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestReadRepo;
		let view: EnrollmentRequestView | undefined;
		try {
			await dataSources.domainDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repo) => {
				// The aggregate validates the course status, email, and justification before the duplicate check.
				const request = await repo.getNewInstance({ course, learnerEmail: command.learnerEmail, justification: command.justification });
				if (await readRepo.hasActiveRequest(request.courseId, request.learnerEmail)) {
					throw new DuplicateActiveRequestError();
				}
				view = toEnrollmentRequestView(await repo.save(request));
			});
		} catch (error) {
			if (error instanceof DuplicateActiveRequestError || isDuplicateKeyError(error)) {
				return duplicate;
			}
			if (error instanceof EnrollmentRequestAggregate.CourseNotActiveError) {
				return { ok: false, error: { code: 'COURSE_NOT_ACTIVE', message: `Course ${course.id} is ${course.status}; only active courses accept enrollment requests.` } };
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
