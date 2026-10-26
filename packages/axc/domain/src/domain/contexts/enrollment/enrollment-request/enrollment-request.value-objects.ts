import { invalidRequest } from '../../../domain-error.ts';

export const EnrollmentStatuses = { Pending: 'pending', Approved: 'approved', Rejected: 'rejected', Cancelled: 'cancelled' } as const;
export type EnrollmentStatus = (typeof EnrollmentStatuses)[keyof typeof EnrollmentStatuses];

export const AllowedTransitions: Readonly<Record<EnrollmentStatus, readonly EnrollmentStatus[]>> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

export const isEnrollmentStatus = (raw: unknown): raw is EnrollmentStatus => typeof raw === 'string' && (Object.values(EnrollmentStatuses) as string[]).includes(raw);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class LearnerEmail {
	readonly value: string;
	constructor(raw: unknown) {
		const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
		if (!EMAIL_PATTERN.test(value)) {
			throw invalidRequest([{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' }]);
		}
		this.value = value;
	}
}

export class Justification {
	static readonly MIN = 20;
	static readonly MAX = 500;
	readonly value: string;
	constructor(raw: unknown) {
		const value = typeof raw === 'string' ? raw.trim() : '';
		if (value.length < Justification.MIN || value.length > Justification.MAX) {
			throw invalidRequest([{ field: 'justification', message: `justification must be between ${Justification.MIN} and ${Justification.MAX} characters.` }]);
		}
		this.value = value;
	}
}
