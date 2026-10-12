import { createEnrollmentRequest, type EnrollmentRequest, withStatusChange } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { InMemoryEnrollmentRequestRepository } from './enrollment-request-repository.ts';

const request = (overrides: Partial<EnrollmentRequest> = {}): EnrollmentRequest => ({
	...createEnrollmentRequest({
		id: 'enroll-001',
		courseId: 'course-001',
		learnerEmail: 'learner@example.org',
		justification: 'I need this course to prepare for upcoming secure development work.',
		changedBy: 'system',
		now: '2026-06-27T10:00:00.000Z',
	}),
	...overrides,
});

describe('in-memory enrollment request repository', () => {
	it('stores, replaces and reads back by id', async () => {
		const repository = new InMemoryEnrollmentRequestRepository();
		const saved = await repository.save(request());
		await repository.save(withStatusChange(saved, { toStatus: 'approved', changedBy: 'reviewer@example.org', now: '2026-06-28T10:00:00.000Z' }));

		expect(await repository.getById('enroll-001')).toMatchObject({ status: 'approved' });
		expect(await repository.getById('missing')).toBeUndefined();
	});

	it('filters by status, courseId and learnerEmail', async () => {
		const repository = new InMemoryEnrollmentRequestRepository();
		await repository.save(request());
		await repository.save(request({ id: 'enroll-002', courseId: 'course-002', createdAt: '2026-06-27T11:00:00.000Z' }));
		await repository.save(request({ id: 'enroll-003', learnerEmail: 'other@example.org', status: 'approved', createdAt: '2026-06-27T12:00:00.000Z' }));

		expect((await repository.list({})).map((r) => r.id)).toEqual(['enroll-001', 'enroll-002', 'enroll-003']);
		expect((await repository.list({ status: 'approved' })).map((r) => r.id)).toEqual(['enroll-003']);
		expect((await repository.list({ courseId: 'course-002' })).map((r) => r.id)).toEqual(['enroll-002']);
		expect((await repository.list({ learnerEmail: 'LEARNER@example.org' })).map((r) => r.id)).toEqual(['enroll-001', 'enroll-002']);
	});

	it('finds only pending or approved requests for a learner and course', async () => {
		const repository = new InMemoryEnrollmentRequestRepository();
		await repository.save(request({ status: 'rejected' }));
		expect(await repository.findActive('course-001', 'learner@example.org')).toBeUndefined();

		await repository.save(request({ id: 'enroll-002', status: 'approved' }));
		expect(await repository.findActive('course-001', 'learner@example.org')).toMatchObject({ id: 'enroll-002' });
	});
});
