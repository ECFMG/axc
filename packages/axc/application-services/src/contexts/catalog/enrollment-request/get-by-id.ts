import type { Catalog } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const getById =
	(dataSources: DataSources): ((id: string) => Promise<Catalog.EnrollmentRequest.EnrollmentRequest | null>) =>
	(id: string) =>
		dataSources.readonlyDataSource.Catalog.EnrollmentRequest.EnrollmentRequestReadRepo.getById(id);
