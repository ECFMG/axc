import { describe, expect, it } from 'vitest';
import { EnrollmentRequest, type RequestStatus, requestStatuses } from './enrollment-request.ts';

const input = { courseId: 'course-001', learnerEmail: 'Learner@example.org', justification: 'I need this course for my upcoming work.' };
const fresh = () => EnrollmentRequest.getNewInstance('id', input, {});
describe('enrollment aggregate', () => {
	it('B6 B14 creates pending with an initial audit entry and normalized email', () => {
		const r = fresh().props;
		expect(r.status).toBe('pending');
		expect(r.learnerEmail).toBe('learner@example.org');
		expect(r.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: r.createdAt, changedBy: 'system', reason: null }]);
		expect(Number.isNaN(Date.parse(r.createdAt))).toBe(false);
		expect(r.updatedAt).toBe(r.createdAt);
	});
	for (const from of requestStatuses)
		for (const to of requestStatuses) {
			it(`B11 B12 B14 transition ${from} to ${to}`, () => {
				const entity = fresh();
				entity.props.status = from;
				const before = structuredClone(entity.props);
				const change = { status: to, changedBy: 'reviewer', reason: 'Prerequisites missing' };
				const valid = (from === 'pending' && to !== 'pending') || (from === 'approved' && to === 'cancelled');
				if (valid) {
					entity.changeStatus(change);
					expect(entity.props.status).toBe(to);
					expect(entity.props.statusHistory).toHaveLength(2);
					expect(entity.props.statusHistory[1]).toMatchObject({ fromStatus: from, toStatus: to, changedBy: 'reviewer', reason: change.reason, changedAt: entity.props.updatedAt });
				} else {
					expect(() => entity.changeStatus(change)).toThrow('not allowed');
					expect(entity.props).toEqual(before);
				}
			});
		}
	it.each([19, 501])('B5 rejects justification length %s', (length) => expect(() => EnrollmentRequest.getNewInstance('id', { ...input, justification: 'a'.repeat(length) }, {})).toThrow());
	it.each([20, 500])('B5 accepts justification length %s', (length) => expect(EnrollmentRequest.getNewInstance('id', { ...input, justification: 'a'.repeat(length) }, {}).props.justification).toHaveLength(length));
	it('B4 B13 validates direct domain calls before mutation', () => {
		expect(() => EnrollmentRequest.getNewInstance('id', { ...input, learnerEmail: 'bad' }, {})).toThrow();
		const entity = fresh();
		const before = structuredClone(entity.props);
		for (const change of [
			{ status: 'rejected', changedBy: 'reviewer', reason: '  ' },
			{ status: 'approved', changedBy: '' },
			{ status: 'unknown', changedBy: 'reviewer' },
		])
			expect(() => entity.changeStatus({ ...change, status: change.status as RequestStatus })).toThrow();
		expect(entity.props).toEqual(before);
	});
});
