import { describe, expect, it } from 'vitest';
import { type EnrollmentRequest, transition } from './enrollment-model.ts';
import { createEnrollmentService } from './enrollments.ts';

const input = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for upcoming development work.' };
const now = '2026-06-27T10:00:00.000Z';
function pending(): EnrollmentRequest {
	return { id: 'enroll-test', ...input, status: 'pending', createdAt: now, updatedAt: now, statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null }] };
}

describe('enrollment transition rules', () => {
	for (const reason of [null, '', '   ']) {
		it(`requires a rejection reason in the transition rule: ${JSON.stringify(reason)}`, () => {
			const request = pending();
			expect(() => transition(request, 'rejected', 'reviewer', reason, now)).toThrow();
			expect(request).toEqual(pending());
		});
	}
	it('requires an operator even when called outside the application service', () => {
		expect(() => transition(pending(), 'approved', ' ', null, now)).toThrow();
	});
	it('appends a normalized rejection entry without mutating the previous snapshot', () => {
		const request = pending();
		const changedAt = '2026-06-28T10:00:00.000Z';
		const result = transition(request, 'rejected', ' reviewer ', ' Missing prerequisite. ', changedAt);
		expect(result.status).toBe('rejected');
		expect(result.createdAt).toBe(now);
		expect(result.updatedAt).toBe(changedAt);
		expect(result.statusHistory).toEqual([...request.statusHistory, { fromStatus: 'pending', toStatus: 'rejected', changedAt, changedBy: 'reviewer', reason: 'Missing prerequisite.' }]);
		expect(request).toEqual(pending());
	});
});

describe('enrollment service storage invariants', () => {
	it('ignores caller-supplied generated fields and protects persisted data on every return path', () => {
		const service = createEnrollmentService();
		const created = service.create({ ...input, id: 'injected', status: 'approved', statusHistory: [], createdAt: 'invalid' });
		expect(created.id).not.toBe('injected');
		expect(created.status).toBe('pending');
		expect(created.statusHistory).toHaveLength(1);
		const originalId = created.id;
		created.statusHistory.length = 0;
		created.learnerEmail = 'tampered@example.org';
		const listed = service.list({})[0];
		if (!listed) throw new Error('Missing persisted request');
		const entry = listed.statusHistory[0];
		if (!entry) throw new Error('Missing creation history');
		entry.changedBy = 'tampered';
		const fetched = service.get(originalId);
		fetched.status = 'cancelled';
		expect(service.get(originalId).status).toBe('pending');
		expect(service.get(originalId).statusHistory[0]?.changedBy).toBe('system');
		expect(() => service.create(input)).toThrow('An active request already exists');
		const updated = service.changeStatus(originalId, { status: 'approved', changedBy: 'reviewer' });
		updated.statusHistory.length = 0;
		expect(service.get(originalId).statusHistory).toHaveLength(2);
	});
	it('does not save invalid creation or status updates', () => {
		const service = createEnrollmentService();
		expect(() => service.create({ ...input, justification: 'short' })).toThrow();
		expect(service.list({})).toEqual([]);
		const original = service.create(input);
		expect(() => service.changeStatus(original.id, { status: 'rejected', changedBy: 'reviewer' })).toThrow();
		expect(service.get(original.id)).toEqual(original);
	});
});
