import { type EnrollmentRequestEntityReference, LearnerEmail, Status } from '@axc/domain';
import type { DataSources, EnrollmentRequestFilter } from '@axc/persistence';
import { ApplicationError } from '../errors.ts';

interface ListInput {
	status?: unknown;
	courseId?: unknown;
	learnerEmail?: unknown;
	[key: string]: unknown;
}
export const getById =
	(dataSources: DataSources) =>
	async (id: string): Promise<EnrollmentRequestEntityReference> => {
		const found = await dataSources.readonlyDataSource.Training.EnrollmentRequest.EnrollmentRequestReadRepo.getById(id);
		if (!found) throw new ApplicationError(404, 'ENROLLMENT_REQUEST_NOT_FOUND', 'Enrollment request not found.');
		return found;
	};
export const list =
	(dataSources: DataSources) =>
	async (input: ListInput = {}): Promise<EnrollmentRequestEntityReference[]> => {
		for (const key of Object.keys(input)) if (!['status', 'courseId', 'learnerEmail'].includes(key)) throw new ApplicationError(400, 'INVALID_QUERY_PARAMETER', `${key} is not a supported query parameter.`, key);
		const filter: EnrollmentRequestFilter = {};
		if (input.status !== undefined) {
			if (typeof input.status !== 'string') throw new ApplicationError(400, 'INVALID_QUERY_PARAMETER', 'status is invalid.', 'status');
			try {
				filter.status = new Status(input.status).valueOf();
			} catch {
				throw new ApplicationError(400, 'INVALID_QUERY_PARAMETER', 'status is invalid.', 'status');
			}
		}
		if (input.courseId !== undefined) {
			if (typeof input.courseId !== 'string' || !input.courseId.trim()) throw new ApplicationError(400, 'INVALID_QUERY_PARAMETER', 'courseId is invalid.', 'courseId');
			filter.courseId = input.courseId;
		}
		if (input.learnerEmail !== undefined) {
			if (typeof input.learnerEmail !== 'string') throw new ApplicationError(400, 'INVALID_QUERY_PARAMETER', 'learnerEmail is invalid.', 'learnerEmail');
			try {
				filter.learnerEmail = new LearnerEmail(input.learnerEmail).valueOf();
			} catch {
				throw new ApplicationError(400, 'INVALID_QUERY_PARAMETER', 'learnerEmail is invalid.', 'learnerEmail');
			}
		}
		return await dataSources.readonlyDataSource.Training.EnrollmentRequest.EnrollmentRequestReadRepo.list(filter);
	};
