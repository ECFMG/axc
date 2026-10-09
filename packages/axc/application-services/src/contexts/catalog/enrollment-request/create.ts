import type { EnrollmentRequest } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { CatalogError, CatalogValidationError } from '../errors.ts';
export interface CreateEnrollmentRequestCommand {
	courseId: string;
	learnerEmail: string;
	justification: string;
}
export const create =
	(dataSources: DataSources) =>
	async (command: CreateEnrollmentRequestCommand): Promise<EnrollmentRequest> => {
		const details: { field: string; message: string }[] = [];
		if (typeof command.courseId !== 'string' || !command.courseId.trim()) details.push({ field: 'courseId', message: 'courseId is required.' });
		if (typeof command.learnerEmail !== 'string' || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(command.learnerEmail.trim())) details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		if (typeof command.justification !== 'string' || command.justification.trim().length < 20 || command.justification.trim().length > 500)
			details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
		if (details.length) throw new CatalogValidationError(details);
		const course = await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.getById(command.courseId);
		if (!course) throw new CatalogError('COURSE_NOT_FOUND', 'Course not found.');
		if (course.status !== 'active') throw new CatalogError('COURSE_NOT_ACTIVE', 'Course is not active.');
		return dataSources.domainDataSource.Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork.withScopedTransaction((repo) => {
			const learnerEmail = command.learnerEmail.trim().toLocaleLowerCase();
			if (repo.findActive(command.courseId, learnerEmail)) throw new CatalogError('DUPLICATE_ACTIVE_REQUEST', 'An active request already exists.');
			const now = new Date().toISOString();
			const request: EnrollmentRequest = {
				id: dataSources.nextEnrollmentId(),
				courseId: command.courseId,
				learnerEmail,
				justification: command.justification.trim(),
				status: 'pending',
				createdAt: now,
				updatedAt: now,
				statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null }],
			};
			repo.save(request);
			return request;
		});
	};
