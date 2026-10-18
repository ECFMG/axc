import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const list = (sources: DataSources) => (filter: Domain.Contexts.Catalog.EnrollmentFilter) => sources.readonlyDataSource.Catalog.EnrollmentRequest.list(filter);
