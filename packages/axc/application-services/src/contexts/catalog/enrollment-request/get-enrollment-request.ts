import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

type EnrollmentRequestSnapshot = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestSnapshot;

export interface GetEnrollmentRequestQuery {
	id: string;
}

export const getEnrollmentRequest = (dataSources: DataSources) => {
	return async (query: GetEnrollmentRequestQuery): Promise<EnrollmentRequestSnapshot> => {
		const request = await dataSources.readonlyDataSource.Catalog.EnrollmentRequest.EnrollmentRequestReadRepo.getById(query.id);
		if (request === undefined) {
			throw new Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestNotFoundError();
		}
		return request;
	};
};
