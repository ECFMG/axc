import { invalidRequest } from '../../../domain-error.ts';

export const EnrollmentStatus = { Pending: 'pending', Approved: 'approved', Rejected: 'rejected', Cancelled: 'cancelled' } as const;
export type EnrollmentStatus = (typeof EnrollmentStatus)[keyof typeof EnrollmentStatus];

export const isEnrollmentStatus = (value: unknown): value is EnrollmentStatus => Object.values<unknown>(EnrollmentStatus).includes(value);

/** Allowed status transitions; anything absent is invalid. */
export const EnrollmentTransitions: Readonly<Record<EnrollmentStatus, readonly EnrollmentStatus[]>> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

/** Statuses that block a learner from opening another request for the same course. */
export const ActiveEnrollmentStatuses: readonly EnrollmentStatus[] = ['pending', 'approved'];

export class LearnerEmail {
	readonly value: string;

	constructor(value: unknown) {
		if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
			throw invalidRequest([{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' }]);
		}
		this.value = value.toLowerCase();
	}
}

export class Justification {
	readonly value: string;

	constructor(value: unknown) {
		if (typeof value !== 'string' || value.trim().length < 20 || value.trim().length > 500) {
			throw invalidRequest([{ field: 'justification', message: 'justification must be between 20 and 500 characters.' }]);
		}
		this.value = value.trim();
	}
}
