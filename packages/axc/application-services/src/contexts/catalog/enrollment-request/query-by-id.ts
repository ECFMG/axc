import type { EnrollmentRequest } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { CatalogError } from '../errors.ts';
export const queryById =
	(dataSources: DataSources) =>
	async (id: string): Promise<EnrollmentRequest> => {
		const request = await dataSources.readonlyDataSource.Catalog.EnrollmentRequest.EnrollmentRequestReadRepo.getById(id);
		if (!request) throw new CatalogError('ENROLLMENT_REQUEST_NOT_FOUND', 'Enrollment request not found.');
		return request;
	};
