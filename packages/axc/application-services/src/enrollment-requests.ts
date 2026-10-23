export const enrollmentRequestStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentRequestStatus = (typeof enrollmentRequestStatuses)[number];
export const isEnrollmentRequestStatus = (v: unknown): v is EnrollmentRequestStatus => (enrollmentRequestStatuses as readonly unknown[]).includes(v);

const JUSTIFICATION_MIN = 20;
const JUSTIFICATION_MAX = 500;

export const isValidEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isValidJustification = (v: string): boolean => v.length >= JUSTIFICATION_MIN && v.length <= JUSTIFICATION_MAX;

export interface StatusHistoryEntry {
	fromStatus: EnrollmentRequestStatus | null;
	toStatus: EnrollmentRequestStatus;
	changedAt: string;
	changedBy: string;
	reason: string | null;
}

export interface EnrollmentRequest {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentRequestStatus;
	createdAt: string;
	updatedAt: string;
	statusHistory: StatusHistoryEntry[];
}

export interface EnrollmentRequestsQuery {
	status?: EnrollmentRequestStatus;
	courseId?: string;
	learnerEmail?: string;
}

export interface CreateEnrollmentRequestInput {
	courseId: string;
	learnerEmail: string;
	justification: string;
}

export interface UpdateEnrollmentRequestStatusInput {
	status: EnrollmentRequestStatus;
	changedBy: string;
	reason?: string;
}
