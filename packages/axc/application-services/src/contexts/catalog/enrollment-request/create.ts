import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

type EnrollmentRequestSnapshot = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestSnapshot;

export interface CreateEnrollmentRequestCommand {
	courseId: string | undefined;
	learnerEmail: string | undefined;
	justification: string | undefined;
}

export const create = (dataSources: DataSources) => {
	return async (command: CreateEnrollmentRequestCommand): Promise<EnrollmentRequestSnapshot> => {
		const learnerEmail = Domain.Contexts.Catalog.EnrollmentRequest.parseLearnerEmail(command.learnerEmail);
		const justification = Domain.Contexts.Catalog.EnrollmentRequest.parseJustification(command.justification);
		if (command.courseId === undefined || command.courseId.trim() === '') {
			throw new Domain.Contexts.Catalog.EnrollmentRequest.InvalidRequestError([{ field: 'courseId', message: 'courseId is required.' }]);
		}

		const courseId = command.courseId;
		const course = await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.getById(courseId);
		Domain.Contexts.Catalog.EnrollmentRequest.assertCourseAllowsEnrollment(course);

		let created: EnrollmentRequestSnapshot | undefined;
		await dataSources.domainDataSource.Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repository) => {
			const existing = await repository.findActiveByLearnerAndCourse(learnerEmail, courseId);
			Domain.Contexts.Catalog.EnrollmentRequest.assertNoDuplicateActiveRequest(existing);
			const request = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequest.create({
				id: `enroll-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
				courseId,
				learnerEmail,
				justification,
				now: new Date().toISOString(),
			});
			created = await repository.save(request);
		});

		if (created === undefined) {
			throw new Domain.Contexts.Catalog.EnrollmentRequest.InvalidRequestError([{ field: 'id', message: 'The enrollment request could not be created.' }]);
		}
		return created;
	};
};
