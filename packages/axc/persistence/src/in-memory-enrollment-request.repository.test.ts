import { describe, expect, it } from 'vitest';
import { InMemoryEnrollmentRequestRepository } from './index.ts';

describe('InMemoryEnrollmentRequestRepository', () => {
	it('assigns ids and filters by status, courseId and learnerEmail', async () => {
		const repo = new InMemoryEnrollmentRequestRepository();
		const justification = 'A sufficiently long justification.';
		const a = await repo.save(await repo.getNewInstance({ courseId: 'course-001', learnerEmail: 'a@example.org', justification }));
		const b = await repo.save(await repo.getNewInstance({ courseId: 'course-002', learnerEmail: 'b@example.org', justification }));
		b.changeStatus({ status: 'approved', changedBy: 'r' }, new Date().toISOString());
		expect([a.id, b.id]).toEqual(['enroll-001', 'enroll-002']);
		expect((await repo.find({ status: 'approved' })).map((r) => r.id)).toEqual(['enroll-002']);
		expect((await repo.find({ courseId: 'course-001' })).map((r) => r.id)).toEqual(['enroll-001']);
		expect((await repo.find({ learnerEmail: 'A@Example.org' })).map((r) => r.id)).toEqual(['enroll-001']);
		expect(await repo.find({})).toHaveLength(2);
		await expect(repo.get('nope')).rejects.toThrow('not found');
	});
});
