import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

const { WorkflowError, validateCreation } = Domain.Contexts.Catalog.EnrollmentRequest;
export const create = (sources: DataSources) => async (input: Domain.Contexts.Catalog.EnrollmentRequest.CreateRequest) => {
	const details = validateCreation(input);
	if (details.length) throw new WorkflowError('INVALID_REQUEST', 'The request could not be completed.', details);
	const course = await sources.readonlyDataSource.Catalog.Course.CourseReadRepo.getById(input.courseId.trim());
	if (!course) throw new WorkflowError('COURSE_NOT_FOUND', 'Course not found.');
	if (course.status !== 'active') throw new WorkflowError('COURSE_NOT_ACTIVE', 'Course is not active.');
	let result: Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestProps | undefined;
	await sources.domainDataSource.Catalog.EnrollmentRequest.EnrollmentRequestUow.withScopedTransaction(async (repo) => {
		const existing = await sources.readonlyDataSource.Catalog.EnrollmentRequest.EnrollmentRequestReadRepo.list({ courseId: input.courseId.trim(), learnerEmail: input.learnerEmail });
		if (existing.some((request) => request.status === 'pending' || request.status === 'approved')) throw new WorkflowError('DUPLICATE_ACTIVE_REQUEST', 'An active request already exists for this learner and course.');
		const entity = await repo.getNewInstance(input);
		await repo.save(entity);
		result = structuredClone(entity.props);
	});
	if (!result) throw new Error('Transaction did not return a request.');
	return result;
};
