import type { Catalog } from '@axc/domain';
import type { DataSources, EnrollmentRequestFilters } from '@axc/persistence';
export const list =
	(dataSources: DataSources): ((filters: EnrollmentRequestFilters) => Promise<Catalog.EnrollmentRequest.EnrollmentRequest[]>) =>
	(filters: EnrollmentRequestFilters) =>
		dataSources.readonlyDataSource.Catalog.EnrollmentRequest.EnrollmentRequestReadRepo.list(filters);
