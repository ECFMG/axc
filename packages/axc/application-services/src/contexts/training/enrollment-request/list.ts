import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const list = (dataSources: DataSources) => async (criteria: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestCriteria) => {
	return await dataSources.readonlyDataSource.Training.EnrollmentRequest.list(criteria);
};
