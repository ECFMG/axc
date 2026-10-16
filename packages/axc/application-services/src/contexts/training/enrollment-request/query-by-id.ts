import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const queryById = (dataSources: DataSources) => async (command: { id: string }) => {
	const request = await dataSources.readonlyDataSource.Training.EnrollmentRequest.getById(command.id);
	if (request === undefined) {
		throw new Domain.Contexts.Training.EnrollmentRequest.EnrollmentWorkflowError('ENROLLMENT_REQUEST_NOT_FOUND', 'id', 'The enrollment request was not found.');
	}
	return request;
};
