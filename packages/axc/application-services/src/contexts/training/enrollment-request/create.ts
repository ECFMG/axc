import { randomUUID } from 'node:crypto';
import { EnrollmentRequest, type EnrollmentRequestEntityReference, Justification, LearnerEmail } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { ApplicationError } from '../errors.ts';
export interface EnrollmentRequestCreateCommand {
	courseId: string;
	learnerEmail: string;
	justification: string;
}
export const create =
	(dataSources: DataSources) =>
	async (command: EnrollmentRequestCreateCommand): Promise<EnrollmentRequestEntityReference> => {
		if (typeof command.courseId !== 'string' || !command.courseId.trim()) throw new ApplicationError(400, 'INVALID_REQUEST', 'courseId is required.', 'courseId');
		if (typeof command.learnerEmail !== 'string') throw new ApplicationError(400, 'INVALID_REQUEST', 'learnerEmail must be a valid email address.', 'learnerEmail');
		if (typeof command.justification !== 'string') throw new ApplicationError(400, 'INVALID_REQUEST', 'justification must be between 20 and 500 characters.', 'justification');
		let email: LearnerEmail;
		let justification: Justification;
		try {
			email = new LearnerEmail(command.learnerEmail);
		} catch {
			throw new ApplicationError(400, 'INVALID_REQUEST', 'learnerEmail must be a valid email address.', 'learnerEmail');
		}
		try {
			justification = new Justification(command.justification);
		} catch {
			throw new ApplicationError(400, 'INVALID_REQUEST', 'justification must be between 20 and 500 characters.', 'justification');
		}
		const course = await dataSources.readonlyDataSource.Training.Course.CourseReadRepo.getById(command.courseId);
		if (!course) throw new ApplicationError(404, 'COURSE_NOT_FOUND', 'Course not found.');
		if (course.status !== 'active') throw new ApplicationError(409, 'COURSE_NOT_ACTIVE', 'Course is not active.');
		let created: EnrollmentRequestEntityReference | undefined;
		await dataSources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repository) => {
			if (await repository.findActive(course.id, email.valueOf())) throw new ApplicationError(409, 'DUPLICATE_ACTIVE_REQUEST', 'An active request already exists.');
			const request = EnrollmentRequest.getNewInstance(`enroll-${randomUUID()}`, course.id, email, justification, new Date().toISOString());
			created = (await repository.save(request)).toReference();
		});
		if (!created) throw new Error('Enrollment request creation failed.');
		return created;
	};
