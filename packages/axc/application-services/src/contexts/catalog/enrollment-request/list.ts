import type { Catalog } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { ApplicationError } from '../errors.ts';
export interface EnrollmentRequestListQuery {
	status?: string;
	courseId?: string;
	learnerEmail?: string;
}
export const list =
	(dataSources: DataSources) =>
	async (query: EnrollmentRequestListQuery = {}): Promise<readonly Catalog.EnrollmentRequest.EnrollmentRequestEntityReference[]> => {
		if (query.status && !['pending', 'approved', 'rejected', 'cancelled'].includes(query.status))
			throw new ApplicationError('INVALID_QUERY_PARAMETER', 'One or more query parameters are invalid.', [{ field: 'status', message: 'Invalid status.' }]);
		return (await dataSources.readonlyDataSource.Catalog.EnrollmentRequest.EnrollmentRequestReadRepo.list()).filter(
			(request) => (!query.status || request.status === query.status) && (!query.courseId || request.courseId === query.courseId) && (!query.learnerEmail || request.learnerEmail === query.learnerEmail.trim().toLowerCase()),
		);
	};
