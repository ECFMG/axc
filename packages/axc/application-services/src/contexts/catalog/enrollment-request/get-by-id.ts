import type { Catalog } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { ApplicationError } from '../errors.ts';
export const getById =
	(dataSources: DataSources) =>
	async (id: string): Promise<Catalog.EnrollmentRequest.EnrollmentRequestEntityReference> => {
		const request = await dataSources.readonlyDataSource.Catalog.EnrollmentRequest.EnrollmentRequestReadRepo.getById(id);
		if (!request) throw new ApplicationError('ENROLLMENT_REQUEST_NOT_FOUND', 'Enrollment request not found.');
		return request;
	};
