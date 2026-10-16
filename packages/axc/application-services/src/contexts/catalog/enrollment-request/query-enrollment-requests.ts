import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

type EnrollmentRequestSnapshot = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestSnapshot;
type EnrollmentRequestStatus = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestStatus;

export interface QueryEnrollmentRequestsQuery {
	status: string | undefined;
	courseId: string | undefined;
	learnerEmail: string | undefined;
}

export interface EnrollmentRequestListResult {
	items: EnrollmentRequestSnapshot[];
}

export const queryEnrollmentRequests = (dataSources: DataSources) => {
	return async (query: QueryEnrollmentRequestsQuery): Promise<EnrollmentRequestListResult> => {
		let status: EnrollmentRequestStatus | undefined;
		if (query.status !== undefined && query.status !== '') {
			status = Domain.Contexts.Catalog.EnrollmentRequest.parseEnrollmentRequestStatus(query.status);
		}

		const items = await dataSources.readonlyDataSource.Catalog.EnrollmentRequest.EnrollmentRequestReadRepo.list({
			status,
			courseId: query.courseId === undefined || query.courseId === '' ? undefined : query.courseId,
			learnerEmail: query.learnerEmail === undefined || query.learnerEmail === '' ? undefined : query.learnerEmail,
		});

		return { items };
	};
};
