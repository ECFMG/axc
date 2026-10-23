import { InvalidRequestError } from './enrollment-request.errors.ts';

export const ENROLLMENT_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentRequestStatus = (typeof ENROLLMENT_REQUEST_STATUSES)[number];

export const ACTIVE_ENROLLMENT_REQUEST_STATUSES: readonly EnrollmentRequestStatus[] = ['pending', 'approved'];

export const MIN_JUSTIFICATION_LENGTH = 20;
export const MAX_JUSTIFICATION_LENGTH = 500;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_STATUS_TRANSITIONS: Record<EnrollmentRequestStatus, readonly EnrollmentRequestStatus[]> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

export function isEnrollmentRequestStatus(value: string): value is EnrollmentRequestStatus {
	return (ENROLLMENT_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function parseLearnerEmail(value: string | undefined): string {
	if (value === undefined || value.trim() === '' || !EMAIL_PATTERN.test(value.trim())) {
		throw new InvalidRequestError([{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' }]);
	}
	return value.trim();
}

export function parseJustification(value: string | undefined): string {
	if (value === undefined || value.length < MIN_JUSTIFICATION_LENGTH || value.length > MAX_JUSTIFICATION_LENGTH) {
		throw new InvalidRequestError([{ field: 'justification', message: `justification must be between ${MIN_JUSTIFICATION_LENGTH} and ${MAX_JUSTIFICATION_LENGTH} characters.` }]);
	}
	return value;
}

export function parseEnrollmentRequestStatus(value: string | undefined): EnrollmentRequestStatus {
	if (value === undefined || !isEnrollmentRequestStatus(value)) {
		throw new InvalidRequestError([{ field: 'status', message: `status must be one of: ${ENROLLMENT_REQUEST_STATUSES.join(', ')}.` }]);
	}
	return value;
}

export function parseChangedBy(value: string | undefined): string {
	if (value === undefined || value.trim() === '') {
		throw new InvalidRequestError([{ field: 'changedBy', message: 'changedBy is required.' }]);
	}
	return value.trim();
}

export function parseRejectionReason(value: string | undefined): string {
	if (value === undefined || value.trim() === '') {
		throw new InvalidRequestError([{ field: 'reason', message: 'reason is required when rejecting an enrollment request.' }]);
	}
	return value.trim();
}

export function canTransitionEnrollmentStatus(fromStatus: EnrollmentRequestStatus, toStatus: EnrollmentRequestStatus): boolean {
	return VALID_STATUS_TRANSITIONS[fromStatus].includes(toStatus);
}

export function isActiveEnrollmentRequestStatus(status: EnrollmentRequestStatus): boolean {
	return ACTIVE_ENROLLMENT_REQUEST_STATUSES.includes(status);
}
