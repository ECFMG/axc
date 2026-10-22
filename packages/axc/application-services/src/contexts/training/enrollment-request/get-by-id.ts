import type { DataSources } from '@axc/persistence';
import { ApplicationFailure } from '../errors.ts';
import type { EnrollmentResult } from './contracts.ts';
export interface EnrollmentGetByIdQuery {
	id: string;
}
export const getById =
	(dataSources: DataSources) =>
	async (query: EnrollmentGetByIdQuery): Promise<EnrollmentResult> => {
		const request = await dataSources.readonlyDataSource.Training.EnrollmentRequest.EnrollmentRequestReadRepo.getById(query.id);
		if (!request) throw new ApplicationFailure('ENROLLMENT_REQUEST_NOT_FOUND', 'Enrollment request not found.');
		return request;
	};
