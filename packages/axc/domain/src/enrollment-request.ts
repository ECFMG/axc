export type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface StatusHistoryEntry {
	readonly fromStatus: EnrollmentRequestStatus | null;
	readonly toStatus: EnrollmentRequestStatus;
	readonly changedAt: string;
	readonly changedBy: string;
	readonly reason: string | null;
}

export interface EnrollmentRequest {
	readonly id: string;
	readonly courseId: string;
	readonly learnerEmail: string;
	readonly justification: string;
	readonly status: EnrollmentRequestStatus;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly statusHistory: readonly StatusHistoryEntry[];
}

export interface EnrollmentRequestRepository {
	/** Returns a new, unused enrollment request id. */
	nextId(): Promise<string>;
	getById(id: string): Promise<EnrollmentRequest | undefined>;
	getAll(): Promise<readonly EnrollmentRequest[]>;
	/** Inserts the request, or replaces the stored request with the same id. */
	save(request: EnrollmentRequest): Promise<void>;
}
