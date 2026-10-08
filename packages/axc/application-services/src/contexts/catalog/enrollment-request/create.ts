import { Catalog } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

export interface CreateEnrollmentCommand {
	courseId: string;
	learnerEmail: string;
	justification: string;
}
export const create =
	(dataSources: DataSources) =>
	async (command: CreateEnrollmentCommand): Promise<Catalog.EnrollmentRequest.EnrollmentRequest> => {
		const course = await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.getById(command.courseId);
		if (!course) throw new Catalog.EnrollmentRequest.EnrollmentError('COURSE_NOT_FOUND', 'Course not found.');
		if (course.status !== 'active') throw new Catalog.EnrollmentRequest.EnrollmentError('COURSE_NOT_ACTIVE', 'Course is not active.');
		return dataSources.domainDataSource.Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repository) => {
			if (await repository.findActive(command.courseId, command.learnerEmail)) throw new Catalog.EnrollmentRequest.EnrollmentError('DUPLICATE_ACTIVE_REQUEST', 'An active request already exists.');
			return repository.save(Catalog.EnrollmentRequest.createEnrollmentRequest(crypto.randomUUID(), command.courseId, command.learnerEmail.trim().toLowerCase(), command.justification.trim(), new Date().toISOString()));
		});
	};
