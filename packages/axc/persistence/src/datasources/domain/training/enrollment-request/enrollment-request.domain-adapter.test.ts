import { describe, expect, it } from 'vitest';
import { EnrollmentRequestConverter } from './enrollment-request.domain-adapter.ts';

const record = {
	id: 'one',
	courseId: 'course-001',
	learnerEmail: 'a@example.org',
	justification: 'x'.repeat(20),
	status: 'approved' as const,
	createdAt: 't1',
	updatedAt: 't2',
	statusHistory: [
		{ fromStatus: null, toStatus: 'pending' as const, changedAt: 't1', changedBy: 'system', reason: null },
		{ fromStatus: 'pending' as const, toStatus: 'approved' as const, changedAt: 't2', changedBy: 'reviewer', reason: null },
	],
};
describe('EnrollmentRequestConverter', () => {
	it('round trips stored fields and nested history defensively', () => {
		const converter = new EnrollmentRequestConverter();
		const aggregate = converter.toDomain(record);
		expect(aggregate.statusHistory).toEqual(record.statusHistory);
		aggregate.props.statusHistory.push({ fromStatus: 'approved', toStatus: 'cancelled', changedAt: 't3', changedBy: 'reviewer', reason: null });
		expect(record.statusHistory).toHaveLength(2);
		expect(converter.toRecord(aggregate).statusHistory).toHaveLength(3);
	});
});
