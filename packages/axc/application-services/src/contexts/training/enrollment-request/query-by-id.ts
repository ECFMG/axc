import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const queryById = (dataSources: DataSources) => async (command: { id: string }) => {
	const request = await dataSources.readonlyDataSource.Training.EnrollmentRequest.queryById(command.id);
	if (request === undefined) {
		throw new Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestError('ENROLLMENT_REQUEST_NOT_FOUND');
	}
	return request;
};
