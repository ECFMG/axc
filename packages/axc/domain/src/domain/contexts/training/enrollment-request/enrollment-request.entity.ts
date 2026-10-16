import type { EnrollmentRequestStatus } from './enrollment-request.value-objects.ts';
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
export interface EnrollmentRequestProps {
	readonly id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentRequestStatus;
	createdAt: Date;
	updatedAt: Date;
	statusHistory: StatusHistoryEntry[];
}
export interface CreateEnrollmentRequest {
	courseId: string;
	learnerEmail: string;
	justification: string;
}
export interface ChangeEnrollmentRequestStatus {
	id: string;
	status: EnrollmentRequestStatus;
	changedBy: string;
	reason?: string | null;
}
export interface EnrollmentRequestFilter {
	status?: EnrollmentRequestStatus;
	courseId?: string;
	learnerEmail?: string;
}
export interface EnrollmentRequestReadRepository {
	queryById(id: string): Promise<EnrollmentRequest | undefined>;
	list(criteria: EnrollmentRequestFilter): Promise<EnrollmentRequest[]>;
}
