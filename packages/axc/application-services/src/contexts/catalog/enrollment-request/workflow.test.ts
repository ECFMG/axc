import { Persistence } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { EnrollmentRequest } from './index.ts';

const input = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'Training required for upcoming project.' };
describe('direct application invariants', () => {
	it('enforces validation course eligibility duplicates and transitions without REST', async () => {
		const api = EnrollmentRequest(Persistence().withSystemPassport());
		await expect(api.create({ ...input, learnerEmail: 'bad' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
		await expect(api.create({ ...input, justification: 'short' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
		await expect(api.create({ ...input, courseId: 'missing' })).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND' });
		await expect(api.create({ ...input, courseId: 'course-011' })).rejects.toMatchObject({ code: 'COURSE_NOT_ACTIVE' });
		const b = await api.create(input);
		await expect(api.create(input)).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
		await expect(api.changeStatus(b.id, { status: 'rejected', changedBy: 'reviewer' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
		expect(await api.getById(b.id)).toEqual(b);
		await api.changeStatus(b.id, { status: 'approved', changedBy: 'reviewer' });
		await expect(api.changeStatus(b.id, { status: 'rejected', changedBy: 'reviewer', reason: 'reason' })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
		expect((await api.getById(b.id)).statusHistory).toHaveLength(2);
	});
});
