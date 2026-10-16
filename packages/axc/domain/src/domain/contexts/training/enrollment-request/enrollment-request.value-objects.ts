export const ENROLLMENT_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentRequestStatus = (typeof ENROLLMENT_REQUEST_STATUSES)[number];
export interface StatusHistoryEntry {
	fromStatus: EnrollmentRequestStatus | null;
	toStatus: EnrollmentRequestStatus;
	changedAt: string;
	changedBy: string;
	reason: string | null;
}
export interface EnrollmentRequestRecord {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentRequestStatus;
	createdAt: string;
	updatedAt: string;
	statusHistory: StatusHistoryEntry[];
}
export interface CreateEnrollmentRequestInput {
	courseId: string;
	learnerEmail: string;
	justification: string;
}
export interface ChangeEnrollmentRequestStatusInput {
	id: string;
	status: EnrollmentRequestStatus;
	changedBy: string;
	reason?: string;
}
export interface EnrollmentRequestCriteria {
	status?: EnrollmentRequestStatus;
	courseId?: string;
	learnerEmail?: string;
}
export class EnrollmentWorkflowError extends Error {
	readonly code: 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION' | 'INVALID_REQUEST';
	readonly field: string;
	constructor(code: EnrollmentWorkflowError['code'], field: string, message: string) {
		super(message);
		this.code = code;
		this.field = field;
	}
}
export function isLearnerEmail(value: string): boolean {
	const separator = value.lastIndexOf('@');
	if (separator < 1) {
		return false;
	}
	const local = value.slice(0, separator);
	const domain = value.slice(separator + 1);
	const dotAtom = /^[a-z\d!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z\d!#$%&'*+/=?^_`{|}~-]+)*$/i;
	const quotedLocal = /^"(?:[^"\\\r\n]|\\.)*"$/;
	const domainName = /^[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)+$/i;
	return (dotAtom.test(local) || quotedLocal.test(local)) && domainName.test(domain);
}

export const ENROLLMENT_JUSTIFICATION_MIN_LENGTH = 20;
export const ENROLLMENT_JUSTIFICATION_MAX_LENGTH = 500;
export function isEnrollmentJustification(value: string): boolean {
	return value.length >= ENROLLMENT_JUSTIFICATION_MIN_LENGTH && value.length <= ENROLLMENT_JUSTIFICATION_MAX_LENGTH;
}
