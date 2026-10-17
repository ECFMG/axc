import { Catalog } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { ApplicationError, invalid } from '../errors.ts';
export interface CreateEnrollmentRequestCommand {
	courseId: string;
	learnerEmail: string;
	justification: string;
}
export const create =
	(dataSources: DataSources) =>
	async (command: CreateEnrollmentRequestCommand): Promise<Catalog.EnrollmentRequest.EnrollmentRequestEntityReference> => {
		if (!command || typeof command.courseId !== 'string' || !command.courseId.trim()) throw invalid('courseId', 'courseId is required.');
		if (typeof command.learnerEmail !== 'string') throw invalid('learnerEmail', 'learnerEmail must be a valid email address.');
		if (typeof command.justification !== 'string') throw invalid('justification', 'justification must be between 20 and 500 characters.');
		let email: Catalog.EnrollmentRequest.LearnerEmail;
		let justification: Catalog.EnrollmentRequest.Justification;
		try {
			email = new Catalog.EnrollmentRequest.LearnerEmail(command.learnerEmail);
		} catch {
			throw invalid('learnerEmail', 'learnerEmail must be a valid email address.');
		}
		try {
			justification = new Catalog.EnrollmentRequest.Justification(command.justification);
		} catch {
			throw invalid('justification', 'justification must be between 20 and 500 characters.');
		}
		let result: Catalog.EnrollmentRequest.EnrollmentRequestEntityReference | undefined;
		await dataSources.domainDataSource.Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repo) => {
			const course = await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.getById(command.courseId);
			if (!course) throw new ApplicationError('COURSE_NOT_FOUND', 'Course not found.');
			if (course.status !== 'active') throw new ApplicationError('COURSE_NOT_ACTIVE', 'Course is not active.');
			if (await repo.findActive(course.id, email.value)) throw new ApplicationError('DUPLICATE_ACTIVE_REQUEST', 'An active request already exists.');
			const request = await repo.getNewInstance(course.id, email, justification, new Date().toISOString());
			await repo.save(request);
			result = request.toReference();
		});
		if (!result) throw new Error('Request creation failed.');
		return result;
	};
