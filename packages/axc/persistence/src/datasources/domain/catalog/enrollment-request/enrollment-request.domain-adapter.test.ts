import type { Catalog } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { EnrollmentRequestConverter } from './enrollment-request.domain-adapter.ts';

describe('EnrollmentRequestConverter', () => {
	it('round trips nested history and copies stored data', () => {
		const converter = new EnrollmentRequestConverter();
		const record: Catalog.EnrollmentRequest.EnrollmentRequestProps = {
			id: 'enroll-1',
			courseId: 'course-1',
			learnerEmail: 'a@example.org',
			justification: 'A sufficiently long reason.',
			status: 'approved',
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-02T00:00:00.000Z',
			statusHistory: [
				{ id: 'enroll-1:1', fromStatus: null, toStatus: 'pending', changedAt: '2026-01-01T00:00:00.000Z', changedBy: 'system', reason: null },
				{ id: 'enroll-1:2', fromStatus: 'pending', toStatus: 'approved', changedAt: '2026-01-02T00:00:00.000Z', changedBy: 'reviewer', reason: null },
			],
		};
		const aggregate = converter.toDomain(record);
		expect(aggregate.statusHistory).toHaveLength(2);
		expect(converter.toPersistence(aggregate)).toEqual(record);
		const second = record.statusHistory[1];
		if (!second) throw new Error('missing history');
		second.changedBy = 'tampered';
		expect(aggregate.statusHistory[1]?.changedBy).toBe('reviewer');
	});
});
