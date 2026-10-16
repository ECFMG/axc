import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { EnrollmentRequestAggregate } from './enrollment-request.aggregate.ts';
import type { EnrollmentRequest, EnrollmentRequestProps } from './enrollment-request.entity.ts';

const feature = await loadFeature(new URL('./features/enrollment-request-projection.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Audit entries expose only public fields', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let record: EnrollmentRequest;
		Given('an enrollment with persistence metadata on a history entry', () => {
			const internal: { self?: unknown } = {};
			internal.self = internal;
			const entry = { fromStatus: null, toStatus: 'pending' as const, changedAt: '2026-01-01T00:00:00.000Z', changedBy: 'system', reason: null, internal };
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'enroll-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'pending',
					createdAt: new Date(entry.changedAt),
					updatedAt: new Date(entry.changedAt),
					statusHistory: [entry],
				},
				{ now: () => new Date() },
			);
		});
		When('the enrollment is converted to a public record', () => {
			record = aggregate.toRecord();
		});
		Then('the record serializes without persistence metadata', () => {
			expect(() => JSON.stringify(record)).not.toThrow();
			expect(record.statusHistory[0]).toEqual({ fromStatus: null, toStatus: 'pending', changedAt: '2026-01-01T00:00:00.000Z', changedBy: 'system', reason: null });
		});
	});
});
