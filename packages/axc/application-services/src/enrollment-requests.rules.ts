import type { EnrollmentRequestStatus } from './enrollment-requests.ts';

const allowedTransitions: Record<EnrollmentRequestStatus, readonly EnrollmentRequestStatus[]> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

export const canTransition = (from: EnrollmentRequestStatus, to: EnrollmentRequestStatus): boolean => allowedTransitions[from].includes(to);
