import { DataSourcesFactoryImpl } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory } from './index.ts';

const setup = async () => {
	const factory = buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: DataSourcesFactoryImpl() });
	return await factory.forRequest();
};
const command = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for secure development work.' };
const expectError = async (operation: Promise<unknown>, status: number, code: string) => {
	await expect(operation).rejects.toMatchObject({ status, code });
};
describe('training application services', () => {
	it('searches course fields, combines filters, sorts, and paginates', async () => {
		const services = await setup();
		const defaults = await services.Training.Course.search();
		expect(defaults.page).toBe(1);
		expect(defaults.pageSize).toBe(10);
		expect(defaults.totalItems).toBe(12);
		const result = await services.Training.Course.search({ q: 'SECURITY', modality: 'online', status: 'active', tag: 'AI', page: 1, pageSize: 5, sort: 'createdAt' });
		expect(result.items.map((item) => item.id)).toEqual(['course-001']);
		const second = await services.Training.Course.search({ page: 2, pageSize: 5, sort: 'createdAt' });
		expect(second.items[0]?.id).toBe('course-006');
		expect((await services.Training.Course.search({ q: 'nonexistent' })).items).toEqual([]);
	});
	it('rejects invalid course search at the service boundary', async () => {
		const services = await setup();
		for (const query of [{ modality: 'remote' }, { status: 'bad' }, { page: 0 }, { pageSize: 51 }, { sort: 'bad' }]) {
			await expectError(services.Training.Course.search(query), 400, 'INVALID_QUERY_PARAMETER');
		}
	});
	it('creates pending requests, prevents duplicates, retrieves, and filters', async () => {
		const services = await setup();
		const created = await services.Training.EnrollmentRequest.create(command);
		expect(created).toMatchObject({ courseId: command.courseId, learnerEmail: command.learnerEmail, status: 'pending' });
		expect(created.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: created.createdAt, changedBy: 'system', reason: null }]);
		await expectError(services.Training.EnrollmentRequest.create(command), 409, 'DUPLICATE_ACTIVE_REQUEST');
		expect(await services.Training.EnrollmentRequest.getById(created.id)).toEqual(created);
		expect((await services.Training.EnrollmentRequest.list({ status: 'pending', courseId: command.courseId, learnerEmail: command.learnerEmail })).map((item) => item.id)).toEqual([created.id]);
		expect(await services.Training.EnrollmentRequest.list({ status: 'approved' })).toEqual([]);
	});
	it('rejects missing and inactive courses and invalid inputs without creating state', async () => {
		const services = await setup();
		await expectError(services.Training.EnrollmentRequest.create({ ...command, courseId: 'missing' }), 404, 'COURSE_NOT_FOUND');
		await expectError(services.Training.EnrollmentRequest.create({ ...command, courseId: 'course-007' }), 409, 'COURSE_NOT_ACTIVE');
		await expectError(services.Training.EnrollmentRequest.create({ ...command, courseId: 'course-008' }), 409, 'COURSE_NOT_ACTIVE');
		await expectError(services.Training.EnrollmentRequest.create({ ...command, learnerEmail: 'bad' }), 400, 'INVALID_REQUEST');
		await expectError(services.Training.EnrollmentRequest.create({ ...command, justification: 'short' }), 400, 'INVALID_REQUEST');
		expect(await services.Training.EnrollmentRequest.list()).toEqual([]);
	});
	it('enforces transitions and audit through the service boundary', async () => {
		const services = await setup();
		const request = await services.Training.EnrollmentRequest.create(command);
		await expectError(services.Training.EnrollmentRequest.changeStatus({ id: request.id, status: 'rejected', changedBy: 'reviewer' }), 400, 'INVALID_REQUEST');
		await expectError(services.Training.EnrollmentRequest.changeStatus({ id: request.id, status: 'bad', changedBy: 'reviewer' }), 400, 'INVALID_REQUEST');
		await expectError(services.Training.EnrollmentRequest.changeStatus({ id: request.id, status: 'pending', changedBy: 'reviewer' }), 409, 'INVALID_STATUS_TRANSITION');
		expect((await services.Training.EnrollmentRequest.getById(request.id)).statusHistory).toHaveLength(1);
		const approved = await services.Training.EnrollmentRequest.changeStatus({ id: request.id, status: 'approved', changedBy: 'reviewer' });
		expect(approved.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'approved', changedBy: 'reviewer' });
		await expectError(services.Training.EnrollmentRequest.create(command), 409, 'DUPLICATE_ACTIVE_REQUEST');
		const cancelled = await services.Training.EnrollmentRequest.changeStatus({ id: request.id, status: 'cancelled', changedBy: 'reviewer' });
		expect(cancelled.statusHistory).toHaveLength(3);
		expect((await services.Training.EnrollmentRequest.create(command)).status).toBe('pending');
	});
	it('supports rejection and pending cancellation and reports missing requests', async () => {
		const services = await setup();
		await expectError(services.Training.EnrollmentRequest.getById('missing'), 404, 'ENROLLMENT_REQUEST_NOT_FOUND');
		await expectError(services.Training.EnrollmentRequest.changeStatus({ id: 'missing', status: 'approved', changedBy: 'reviewer' }), 404, 'ENROLLMENT_REQUEST_NOT_FOUND');
		const rejectedSource = await services.Training.EnrollmentRequest.create(command);
		const rejected = await services.Training.EnrollmentRequest.changeStatus({ id: rejectedSource.id, status: 'rejected', changedBy: 'reviewer', reason: 'Missing prerequisites' });
		expect(rejected.statusHistory[1]?.reason).toBe('Missing prerequisites');
		const cancelledSource = await services.Training.EnrollmentRequest.create(command);
		const cancelled = await services.Training.EnrollmentRequest.changeStatus({ id: cancelledSource.id, status: 'cancelled', changedBy: 'learner' });
		expect(cancelled.status).toBe('cancelled');
	});
});
