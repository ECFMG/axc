import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

const { WorkflowError, validateCreate } = Domain.Contexts.Catalog;
export const create = (sources: DataSources) => async (input: Domain.Contexts.Catalog.CreateEnrollment) => {
	validateCreate(input);
	const course = await sources.readonlyDataSource.Catalog.Course.CourseReadRepo.getById(input.courseId.trim());
	if (!course) throw new WorkflowError('COURSE_NOT_FOUND', 'Course not found.');
	if (course.status !== 'active') throw new WorkflowError('COURSE_NOT_ACTIVE', 'Course is not active.');
	let result: Domain.Contexts.Catalog.EnrollmentProps | undefined;
	await sources.domainDataSource.Catalog.EnrollmentRequest.withScopedTransaction(async (repo) => {
		if (await repo.hasActive(course.id, input.learnerEmail)) throw new WorkflowError('DUPLICATE_ACTIVE_REQUEST', 'An active request already exists.');
		const entity = await repo.getNewInstance(input);
		await repo.save(entity);
		result = structuredClone(entity.props);
	});
	if (!result) throw new Error('Transaction did not create a request.');
	return result;
};
