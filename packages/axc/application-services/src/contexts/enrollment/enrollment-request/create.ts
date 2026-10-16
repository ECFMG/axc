import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

export interface EnrollmentRequestCreateCommand {
	courseId: string;
	learnerEmail: string;
	justification: string;
}

export const create = (dataSources: DataSources) => {
	return async (command: EnrollmentRequestCreateCommand): Promise<Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestEntityReference> => {
		const course = await dataSources.readonlyDataSource.Course.Course.CourseReadRepo.getById(command.courseId);
		if (!course) {
			throw new Error('COURSE_NOT_FOUND');
		}
		if (course.status !== 'active') {
			throw new Error('COURSE_NOT_ACTIVE');
		}
		const learnerEmail = command.learnerEmail.trim().toLowerCase();
		const existing = await dataSources.readonlyDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestReadRepo.findActive(command.courseId, learnerEmail);
		if (existing) {
			throw new Error('DUPLICATE_ACTIVE_REQUEST');
		}
		let createdId = '';
		await dataSources.domainDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repo) => {
			const saved = await repo.save(await repo.getNewInstance({ courseId: command.courseId, learnerEmail, justification: command.justification }));
			createdId = saved.id;
		});
		const created = await dataSources.readonlyDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestReadRepo.getById(createdId);
		if (!created) {
			throw new Error('ENROLLMENT_REQUEST_NOT_FOUND');
		}
		return created;
	};
};
