import { describe, expect, it } from 'vitest';
import { InMemoryEnrollmentRequestRepository } from './enrollment-request.in-memory-repository.ts';

const justification = 'I need this course for upcoming work.';

describe('InMemoryEnrollmentRequestRepository', () => {
	it('assigns sequential ids and filters by status, courseId and learnerEmail', async () => {
		const repo = new InMemoryEnrollmentRequestRepository();
		const a = await repo.save(repo.getNewInstance({ courseId: 'course-001', learnerEmail: 'a@x.org', justification }));
		const b = await repo.save(repo.getNewInstance({ courseId: 'course-002', learnerEmail: 'b@x.org', justification }));
		b.changeStatus('approved', 'rev', undefined);
		expect([a.id, b.id]).toEqual(['enroll-001', 'enroll-002']);
		expect((await repo.find({ status: 'approved' })).map((r) => r.id)).toEqual(['enroll-002']);
		expect((await repo.find({ courseId: 'course-001' })).map((r) => r.id)).toEqual(['enroll-001']);
		expect((await repo.find({ learnerEmail: 'A@X.org' })).map((r) => r.id)).toEqual(['enroll-001']);
		expect(await repo.find({})).toHaveLength(2);
		await expect(repo.get('nope')).rejects.toThrow('not found');
	});
});
