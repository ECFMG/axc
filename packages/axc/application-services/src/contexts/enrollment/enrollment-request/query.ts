import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

export interface EnrollmentRequestQueryCommand {
	status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
	courseId?: string;
	learnerEmail?: string;
}

export const query = (dataSources: DataSources) => {
	return async (command: EnrollmentRequestQueryCommand): Promise<Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestEntityReference[]> => {
		return await dataSources.readonlyDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestReadRepo.findMatching({
			...(command.status === undefined ? {} : { status: command.status }),
			...(command.courseId === undefined ? {} : { courseId: command.courseId }),
			...(command.learnerEmail === undefined ? {} : { learnerEmail: command.learnerEmail.trim().toLowerCase() }),
		});
	};
};
