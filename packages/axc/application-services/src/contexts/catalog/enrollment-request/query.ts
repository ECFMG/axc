import type { EnrollmentRequest, EnrollmentStatus } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export interface EnrollmentRequestQuery {
	status?: EnrollmentStatus;
	courseId?: string;
	learnerEmail?: string;
}
export const query =
	(dataSources: DataSources) =>
	async (filters: EnrollmentRequestQuery): Promise<EnrollmentRequest[]> => {
		const all = await dataSources.readonlyDataSource.Catalog.EnrollmentRequest.EnrollmentRequestReadRepo.getAll();
		return all.filter(
			(request) =>
				(!filters.status || request.status === filters.status) && (!filters.courseId || request.courseId === filters.courseId) && (!filters.learnerEmail || request.learnerEmail === filters.learnerEmail.trim().toLocaleLowerCase()),
		);
	};
