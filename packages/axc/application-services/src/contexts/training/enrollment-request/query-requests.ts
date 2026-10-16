import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const queryRequests = (dataSources: DataSources) => {
	return (criteria: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestCriteria) => dataSources.readonlyDataSource.Training.EnrollmentRequest.EnrollmentRequestReadRepo.list(criteria);
};
