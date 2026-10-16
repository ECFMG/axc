export const ENROLLMENT_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export const ACTIVE_ENROLLMENT_REQUEST_STATUSES = ['pending', 'approved'] as const;
export type EnrollmentRequestStatus = (typeof ENROLLMENT_REQUEST_STATUSES)[number];
export interface ValidationDetail {
	field: string;
	message: string;
}
export class EnrollmentRequestError extends Error {
	readonly code: 'INVALID_REQUEST' | 'INVALID_STATUS_TRANSITION' | 'DUPLICATE_ACTIVE_REQUEST' | 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'ENROLLMENT_REQUEST_NOT_FOUND';
	readonly details: ValidationDetail[];
	constructor(code: EnrollmentRequestError['code'], details: ValidationDetail[] = []) {
		super(code);
		this.code = code;
		this.details = details;
	}
}
export const isLearnerEmail = (email: unknown): email is string => {
	if (typeof email !== 'string' || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(email)) {
		return false;
	}
	const local = email.slice(0, email.indexOf('@'));
	return !local.startsWith('.') && !local.endsWith('.') && !local.includes('..');
};
export const validateEnrollmentInput = (email: unknown, justification: unknown): ValidationDetail[] => {
	const details: ValidationDetail[] = [];
	if (!isLearnerEmail(email)) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
	}
	if (typeof justification !== 'string' || justification.length < 20 || justification.length > 500) {
		details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
	}
	return details;
};
export const validateStatusChange = (status: unknown, changedBy: unknown, reason: unknown): ValidationDetail[] => {
	const details: ValidationDetail[] = [];
	if (!ENROLLMENT_REQUEST_STATUSES.some((value) => value === status)) {
		details.push({ field: 'status', message: 'status must be pending, approved, rejected, or cancelled.' });
	}
	if (typeof changedBy !== 'string' || changedBy.trim().length === 0) {
		details.push({ field: 'changedBy', message: 'changedBy must identify the operator.' });
	}
	if (status === 'rejected' && (typeof reason !== 'string' || reason.trim().length === 0)) {
		details.push({ field: 'reason', message: 'reason must be non-empty for rejection.' });
	} else if (reason !== undefined && reason !== null && typeof reason !== 'string') {
		details.push({ field: 'reason', message: 'reason must be text.' });
	}
	return details;
};
export const canTransitionEnrollmentRequest = (from: EnrollmentRequestStatus, to: EnrollmentRequestStatus): boolean =>
	(from === 'pending' && (to === 'approved' || to === 'rejected' || to === 'cancelled')) || (from === 'approved' && to === 'cancelled');
