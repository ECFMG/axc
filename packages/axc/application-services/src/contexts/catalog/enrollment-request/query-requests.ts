import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const getById = (sources: DataSources) => async (id: string) => {
	const item = await sources.readonlyDataSource.Catalog.EnrollmentRequest.EnrollmentRequestReadRepo.getById(id);
	if (!item) throw new Domain.Contexts.Catalog.EnrollmentRequest.WorkflowError('ENROLLMENT_REQUEST_NOT_FOUND', 'Enrollment request not found.');
	return item;
};
export const list = (sources: DataSources) => (filters: Domain.Contexts.Catalog.EnrollmentRequest.RequestFilters) => sources.readonlyDataSource.Catalog.EnrollmentRequest.EnrollmentRequestReadRepo.list(filters);
