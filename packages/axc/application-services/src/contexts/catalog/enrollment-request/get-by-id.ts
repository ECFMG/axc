import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const getById = (sources: DataSources) => async (id: string) => {
	const result = await sources.readonlyDataSource.Catalog.EnrollmentRequest.getById(id);
	if (!result) throw new Domain.Contexts.Catalog.WorkflowError('ENROLLMENT_REQUEST_NOT_FOUND', 'Enrollment request not found.');
	return result;
};
