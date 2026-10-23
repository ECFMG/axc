export const enrollmentStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];
export const isEnrollmentStatus = (value: unknown): value is EnrollmentStatus => (enrollmentStatuses as readonly unknown[]).includes(value);

export interface StatusHistoryEntry {
	fromStatus: EnrollmentStatus | null;
	toStatus: EnrollmentStatus;
	changedAt: string;
	changedBy: string;
	reason: string | null;
}

export interface EnrollmentRequest {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentStatus;
	createdAt: string;
	updatedAt: string;
	statusHistory: StatusHistoryEntry[];
}

export interface EnrollmentListQuery {
	status?: EnrollmentStatus;
	courseId?: string;
	learnerEmail?: string;
}

export interface CreateEnrollmentInput {
	courseId: string;
	learnerEmail: string;
	justification: string;
}

export interface ChangeEnrollmentStatusInput {
	status: EnrollmentStatus;
	changedBy: string;
	reason?: string;
}
