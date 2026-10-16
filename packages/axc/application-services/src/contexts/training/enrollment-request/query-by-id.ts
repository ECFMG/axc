import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const queryById = (dataSources: DataSources) => {
	return async (id: string) => {
		const item = await dataSources.readonlyDataSource.Training.EnrollmentRequest.EnrollmentRequestReadRepo.getById(id);
		if (item === null) {
			throw new Domain.Contexts.Training.EnrollmentRequest.EnrollmentError('ENROLLMENT_REQUEST_NOT_FOUND');
		}
		return item;
	};
};
