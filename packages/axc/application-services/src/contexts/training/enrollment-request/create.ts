import { Training } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { ApplicationFailure } from '../errors.ts';
import { type EnrollmentResult, toEnrollmentResult } from './contracts.ts';
export interface EnrollmentCreateCommand {
	courseId: string;
	learnerEmail: string;
	justification: string;
}
export const create =
	(dataSources: DataSources) =>
	async (command: EnrollmentCreateCommand): Promise<EnrollmentResult> => {
		const details: { field: string; message: string }[] = [];
		let email: Training.EnrollmentRequest.LearnerEmail | undefined;
		let justification: Training.EnrollmentRequest.Justification | undefined;
		try {
			email = new Training.EnrollmentRequest.LearnerEmail(command.learnerEmail);
		} catch {
			details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		}
		try {
			justification = new Training.EnrollmentRequest.Justification(command.justification);
		} catch {
			details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
		}
		if (!command.courseId?.trim()) details.push({ field: 'courseId', message: 'courseId is required.' });
		if (details.length || !email || !justification) throw new ApplicationFailure('INVALID_REQUEST', 'The request could not be completed.', details);
		const course = await dataSources.readonlyDataSource.Training.Course.CourseReadRepo.getById(command.courseId);
		if (!course) throw new ApplicationFailure('COURSE_NOT_FOUND', 'Course not found.');
		if (course.status !== 'active') throw new ApplicationFailure('COURSE_NOT_ACTIVE', 'Course is not active.');
		let result: EnrollmentResult | undefined;
		await dataSources.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction(async (repo) => {
			if (await repo.hasActive(command.courseId, email.valueOf())) throw new ApplicationFailure('DUPLICATE_ACTIVE_REQUEST', 'An active request already exists.');
			const request = await repo.getNewInstance(command.courseId, email, justification, new Date().toISOString());
			await repo.save(request);
			result = toEnrollmentResult(request);
		});
		if (!result) throw new Error('Request creation failed');
		return result;
	};
