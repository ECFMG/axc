import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

export interface EnrollmentRequestGetCommand {
	id: string;
}

export const get = (dataSources: DataSources) => {
	return async (command: EnrollmentRequestGetCommand): Promise<Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestEntityReference> => {
		const found = await dataSources.readonlyDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestReadRepo.getById(command.id);
		if (!found) {
			throw new Error('ENROLLMENT_REQUEST_NOT_FOUND');
		}
		return found;
	};
};
