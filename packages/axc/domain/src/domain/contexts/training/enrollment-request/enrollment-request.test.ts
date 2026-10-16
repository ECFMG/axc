import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { EnrollmentRequest } from './enrollment-request.aggregate.ts';
import type { CreateEnrollmentRequestInput, EnrollmentRequestRecord, EnrollmentRequestStatus } from './enrollment-request.value-objects.ts';

const now = '2026-06-27T10:00:00.000Z';
const validInput = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for upcoming work.' };
interface RuleCase {
	title: string;
	before?: EnrollmentRequestStatus;
	after?: EnrollmentRequestStatus;
	input?: Partial<CreateEnrollmentRequestInput>;
	reason?: string;
	changedBy?: string;
	allowed: boolean;
}
const cases: RuleCase[] = [
	{ title: 'Rejects consecutive local dots', input: { learnerEmail: 'learner..name@example.org' }, allowed: false },
	{ title: 'Rejects invalid domain labels', input: { learnerEmail: 'learner@-example.org' }, allowed: false },
	{ title: 'Rejects consecutive domain dots', input: { learnerEmail: 'learner@example..org' }, allowed: false },
	{ title: 'Accepts plus email aliases', input: { learnerEmail: 'learner+training@example.org' }, allowed: true },
	{ title: 'Transition pending to pending', ...{ before: 'pending', after: 'pending', allowed: false } },
	{ title: 'Transition pending to approved', ...{ before: 'pending', after: 'approved', allowed: true } },
	{ title: 'Transition pending to rejected', ...{ before: 'pending', after: 'rejected', allowed: true } },
	{ title: 'Transition pending to cancelled', ...{ before: 'pending', after: 'cancelled', allowed: true } },
	{ title: 'Transition approved to pending', ...{ before: 'approved', after: 'pending', allowed: false } },
	{ title: 'Transition approved to approved', ...{ before: 'approved', after: 'approved', allowed: false } },
	{ title: 'Transition approved to rejected', ...{ before: 'approved', after: 'rejected', allowed: false } },
	{ title: 'Transition approved to cancelled', ...{ before: 'approved', after: 'cancelled', allowed: true } },
	{ title: 'Transition rejected to pending', ...{ before: 'rejected', after: 'pending', allowed: false } },
	{ title: 'Transition rejected to approved', ...{ before: 'rejected', after: 'approved', allowed: false } },
	{ title: 'Transition rejected to rejected', ...{ before: 'rejected', after: 'rejected', allowed: false } },
	{ title: 'Transition rejected to cancelled', ...{ before: 'rejected', after: 'cancelled', allowed: false } },
	{ title: 'Transition cancelled to pending', ...{ before: 'cancelled', after: 'pending', allowed: false } },
	{ title: 'Transition cancelled to approved', ...{ before: 'cancelled', after: 'approved', allowed: false } },
	{ title: 'Transition cancelled to rejected', ...{ before: 'cancelled', after: 'rejected', allowed: false } },
	{ title: 'Transition cancelled to cancelled', ...{ before: 'cancelled', after: 'cancelled', allowed: false } },
	{ title: 'Rejects invalid email', ...{ input: { learnerEmail: 'bad' }, allowed: false } },
	{ title: 'Rejects short justification', ...{ input: { justification: 'x'.repeat(19) }, allowed: false } },
	{ title: 'Accepts minimum justification', ...{ input: { justification: 'x'.repeat(20) }, allowed: true } },
	{ title: 'Accepts maximum justification', ...{ input: { justification: 'x'.repeat(500) }, allowed: true } },
	{ title: 'Rejects long justification', ...{ input: { justification: 'x'.repeat(501) }, allowed: false } },
	{ title: 'Rejects blank rejection reason', ...{ before: 'pending', after: 'rejected', reason: '   ', allowed: false } },
	{ title: 'Rejects blank operator', ...{ before: 'pending', after: 'approved', changedBy: ' ', allowed: false } },
];
const feature = await loadFeature('src/domain/contexts/training/enrollment-request/features/enrollment-request.feature');
describeFeature(feature, ({ Scenario }) => {
	for (const rule of cases) {
		Scenario(rule.title, ({ Given, When, Then }) => {
			let aggregate: EnrollmentRequest<{ id: string; record: EnrollmentRequestRecord }>;
			let error: unknown;
			Given('an enrollment aggregate', () => {
				const record: EnrollmentRequestRecord = {
					...validInput,
					id: 'enroll-1',
					status: rule.before ?? 'pending',
					createdAt: now,
					updatedAt: now,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null }],
				};
				aggregate = new EnrollmentRequest({ id: 'mongo-1', record }, undefined);
			});
			When('the domain operation is performed', () => {
				try {
					if (rule.after !== undefined) {
						aggregate.changeStatus({ id: 'enroll-1', status: rule.after, changedBy: rule.changedBy ?? 'reviewer', reason: rule.reason ?? 'Prerequisite missing' }, '2026-06-28T10:00:00.000Z');
					} else {
						aggregate.initialize({ ...validInput, ...rule.input }, 'enroll-1', now);
					}
				} catch (caught) {
					error = caught;
				}
			});
			Then('the rule is enforced', () => {
				if (rule.allowed) {
					expect(error).toBeUndefined();
					expect(aggregate.props.record.status).toBe(rule.after ?? 'pending');
					expect(aggregate.props.record.statusHistory).toHaveLength(rule.after === undefined ? 1 : 2);
					expect(aggregate.props.record.statusHistory.at(-1)).toMatchObject({ toStatus: rule.after ?? 'pending', changedBy: rule.after === undefined ? 'system' : 'reviewer' });
				} else {
					expect(error).toBeInstanceOf(Error);
					expect(aggregate.props.record.statusHistory).toHaveLength(1);
				}
			});
		});
	}
});
