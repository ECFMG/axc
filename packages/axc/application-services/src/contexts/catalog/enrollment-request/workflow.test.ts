import { Persistence } from '@axc/persistence';
import { beforeEach, describe, expect, it } from 'vitest';
import { type ApplicationServices, buildApplicationServicesFactory } from '../../../index.ts';

let service: ApplicationServices['Catalog']['EnrollmentRequest'];
const input = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'This course supports my upcoming project work.' };
beforeEach(async () => {
	service = (await buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: Persistence() }).forRequest()).Catalog.EnrollmentRequest;
});
describe('direct enrollment use cases', () => {
	it('B3 B4 B5 validates direct calls', async () => {
		for (const [overrides, code] of [
			[{ courseId: 'missing' }, 'COURSE_NOT_FOUND'],
			[{ courseId: 'course-004' }, 'COURSE_NOT_ACTIVE'],
			[{ courseId: 'course-005' }, 'COURSE_NOT_ACTIVE'],
			[{ learnerEmail: 'bad', justification: 'short' }, 'INVALID_REQUEST'],
		] as const)
			await expect(service.create({ ...input, ...overrides })).rejects.toMatchObject({ code });
		expect(await service.list({})).toEqual([]);
	});
	it('B7 prevents concurrent duplicates and permits reapplication after cancellation', async () => {
		const results = await Promise.allSettled([service.create(input), service.create({ ...input, learnerEmail: 'LEARNER@example.org' })]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const [request] = await service.list({});
		expect(request).toBeDefined();
		if (!request) throw new Error('Missing request');
		await service.changeStatus(request.id, { status: 'approved', changedBy: 'reviewer' });
		await expect(service.create(input)).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
		await service.changeStatus(request.id, { status: 'cancelled', changedBy: 'reviewer' });
		expect((await service.create(input)).status).toBe('pending');
	});
	it('B11 B13 B14 failed commands leave state unchanged', async () => {
		const r = await service.create(input);
		await expect(service.changeStatus(r.id, { status: 'pending', changedBy: 'reviewer' })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
		await expect(service.changeStatus(r.id, { status: 'rejected', changedBy: 'reviewer', reason: ' ' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
		expect(await service.getById(r.id)).toEqual(r);
		await expect(service.getById('missing')).rejects.toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
		await expect(service.changeStatus('missing', { status: 'approved', changedBy: 'reviewer' })).rejects.toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
	});
});
