import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { EnrollmentRequestAggregate } from './enrollment-request.aggregate.ts';
import type { EnrollmentRequestProps } from './enrollment-request.entity.ts';

const feature = await loadFeature(new URL('./features/enrollment-request-behavior.feature', import.meta.url).pathname);
const createdAt = new Date('2026-01-01T00:00:00Z');
const changedAt = new Date('2026-02-01T00:00:00Z');
describeFeature(feature, ({ Scenario }) => {
	Scenario('Aggregate pending to pending', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "pending"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'pending',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "pending"', () => {
			try {
				aggregate.changeStatus('pending', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the transition fails with 409 semantics and status stays "pending"', () => {
			expect(failure).toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			expect(aggregate.props.status).toBe('pending');
			expect(aggregate.props.updatedAt).toEqual(createdAt);
			expect(aggregate.props.statusHistory).toHaveLength(1);
		});
	});
	Scenario('Aggregate pending to approved', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "pending"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'pending',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "approved"', () => {
			try {
				aggregate.changeStatus('approved', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the status is "approved" with 2 history entries', () => {
			expect(failure).toBeUndefined();
			expect(aggregate.props.status).toBe('approved');
			expect(aggregate.props.updatedAt).toEqual(changedAt);
			expect(aggregate.toRecord().statusHistory).toHaveLength(2);
			expect(aggregate.toRecord().statusHistory[1]).toEqual({ fromStatus: 'pending', toStatus: 'approved', changedAt: changedAt.toISOString(), changedBy: 'reviewer', reason: 'Decision' });
		});
	});
	Scenario('Aggregate pending to rejected', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "pending"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'pending',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "rejected"', () => {
			try {
				aggregate.changeStatus('rejected', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the status is "rejected" with 2 history entries', () => {
			expect(failure).toBeUndefined();
			expect(aggregate.props.status).toBe('rejected');
			expect(aggregate.props.updatedAt).toEqual(changedAt);
			expect(aggregate.toRecord().statusHistory).toHaveLength(2);
			expect(aggregate.toRecord().statusHistory[1]).toEqual({ fromStatus: 'pending', toStatus: 'rejected', changedAt: changedAt.toISOString(), changedBy: 'reviewer', reason: 'Decision' });
		});
	});
	Scenario('Aggregate pending to cancelled', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "pending"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'pending',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "cancelled"', () => {
			try {
				aggregate.changeStatus('cancelled', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the status is "cancelled" with 2 history entries', () => {
			expect(failure).toBeUndefined();
			expect(aggregate.props.status).toBe('cancelled');
			expect(aggregate.props.updatedAt).toEqual(changedAt);
			expect(aggregate.toRecord().statusHistory).toHaveLength(2);
			expect(aggregate.toRecord().statusHistory[1]).toEqual({ fromStatus: 'pending', toStatus: 'cancelled', changedAt: changedAt.toISOString(), changedBy: 'reviewer', reason: 'Decision' });
		});
	});
	Scenario('Aggregate approved to pending', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "approved"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'approved',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "pending"', () => {
			try {
				aggregate.changeStatus('pending', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the transition fails with 409 semantics and status stays "approved"', () => {
			expect(failure).toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			expect(aggregate.props.status).toBe('approved');
			expect(aggregate.props.updatedAt).toEqual(createdAt);
			expect(aggregate.props.statusHistory).toHaveLength(1);
		});
	});
	Scenario('Aggregate approved to approved', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "approved"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'approved',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "approved"', () => {
			try {
				aggregate.changeStatus('approved', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the transition fails with 409 semantics and status stays "approved"', () => {
			expect(failure).toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			expect(aggregate.props.status).toBe('approved');
			expect(aggregate.props.updatedAt).toEqual(createdAt);
			expect(aggregate.props.statusHistory).toHaveLength(1);
		});
	});
	Scenario('Aggregate approved to rejected', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "approved"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'approved',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "rejected"', () => {
			try {
				aggregate.changeStatus('rejected', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the transition fails with 409 semantics and status stays "approved"', () => {
			expect(failure).toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			expect(aggregate.props.status).toBe('approved');
			expect(aggregate.props.updatedAt).toEqual(createdAt);
			expect(aggregate.props.statusHistory).toHaveLength(1);
		});
	});
	Scenario('Aggregate approved to cancelled', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "approved"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'approved',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "cancelled"', () => {
			try {
				aggregate.changeStatus('cancelled', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the status is "cancelled" with 2 history entries', () => {
			expect(failure).toBeUndefined();
			expect(aggregate.props.status).toBe('cancelled');
			expect(aggregate.props.updatedAt).toEqual(changedAt);
			expect(aggregate.toRecord().statusHistory).toHaveLength(2);
			expect(aggregate.toRecord().statusHistory[1]).toEqual({ fromStatus: 'approved', toStatus: 'cancelled', changedAt: changedAt.toISOString(), changedBy: 'reviewer', reason: 'Decision' });
		});
	});
	Scenario('Aggregate rejected to pending', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "rejected"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'rejected',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "pending"', () => {
			try {
				aggregate.changeStatus('pending', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the transition fails with 409 semantics and status stays "rejected"', () => {
			expect(failure).toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			expect(aggregate.props.status).toBe('rejected');
			expect(aggregate.props.updatedAt).toEqual(createdAt);
			expect(aggregate.props.statusHistory).toHaveLength(1);
		});
	});
	Scenario('Aggregate rejected to approved', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "rejected"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'rejected',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "approved"', () => {
			try {
				aggregate.changeStatus('approved', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the transition fails with 409 semantics and status stays "rejected"', () => {
			expect(failure).toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			expect(aggregate.props.status).toBe('rejected');
			expect(aggregate.props.updatedAt).toEqual(createdAt);
			expect(aggregate.props.statusHistory).toHaveLength(1);
		});
	});
	Scenario('Aggregate rejected to rejected', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "rejected"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'rejected',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "rejected"', () => {
			try {
				aggregate.changeStatus('rejected', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the transition fails with 409 semantics and status stays "rejected"', () => {
			expect(failure).toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			expect(aggregate.props.status).toBe('rejected');
			expect(aggregate.props.updatedAt).toEqual(createdAt);
			expect(aggregate.props.statusHistory).toHaveLength(1);
		});
	});
	Scenario('Aggregate rejected to cancelled', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "rejected"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'rejected',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "cancelled"', () => {
			try {
				aggregate.changeStatus('cancelled', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the transition fails with 409 semantics and status stays "rejected"', () => {
			expect(failure).toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			expect(aggregate.props.status).toBe('rejected');
			expect(aggregate.props.updatedAt).toEqual(createdAt);
			expect(aggregate.props.statusHistory).toHaveLength(1);
		});
	});
	Scenario('Aggregate cancelled to pending', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "cancelled"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'cancelled',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "pending"', () => {
			try {
				aggregate.changeStatus('pending', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the transition fails with 409 semantics and status stays "cancelled"', () => {
			expect(failure).toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			expect(aggregate.props.status).toBe('cancelled');
			expect(aggregate.props.updatedAt).toEqual(createdAt);
			expect(aggregate.props.statusHistory).toHaveLength(1);
		});
	});
	Scenario('Aggregate cancelled to approved', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "cancelled"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'cancelled',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "approved"', () => {
			try {
				aggregate.changeStatus('approved', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the transition fails with 409 semantics and status stays "cancelled"', () => {
			expect(failure).toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			expect(aggregate.props.status).toBe('cancelled');
			expect(aggregate.props.updatedAt).toEqual(createdAt);
			expect(aggregate.props.statusHistory).toHaveLength(1);
		});
	});
	Scenario('Aggregate cancelled to rejected', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "cancelled"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'cancelled',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "rejected"', () => {
			try {
				aggregate.changeStatus('rejected', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the transition fails with 409 semantics and status stays "cancelled"', () => {
			expect(failure).toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			expect(aggregate.props.status).toBe('cancelled');
			expect(aggregate.props.updatedAt).toEqual(createdAt);
			expect(aggregate.props.statusHistory).toHaveLength(1);
		});
	});
	Scenario('Aggregate cancelled to cancelled', ({ Given, When, Then }) => {
		let aggregate: EnrollmentRequestAggregate<EnrollmentRequestProps>;
		let failure: unknown;
		Given('an enrollment aggregate with status "cancelled"', () => {
			aggregate = new EnrollmentRequestAggregate(
				{
					id: 'request-001',
					courseId: 'course-001',
					learnerEmail: 'learner@example.org',
					justification: 'x'.repeat(20),
					status: 'cancelled',
					createdAt,
					updatedAt: createdAt,
					statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt.toISOString(), changedBy: 'system', reason: null }],
				},
				{ now: () => changedAt },
			);
		});
		When('the aggregate changes to "cancelled"', () => {
			try {
				aggregate.changeStatus('cancelled', { changedBy: 'reviewer' }, 'Decision');
			} catch (error) {
				failure = error;
			}
		});
		Then('the transition fails with 409 semantics and status stays "cancelled"', () => {
			expect(failure).toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			expect(aggregate.props.status).toBe('cancelled');
			expect(aggregate.props.updatedAt).toEqual(createdAt);
			expect(aggregate.props.statusHistory).toHaveLength(1);
		});
	});
});
