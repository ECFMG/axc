const enrollmentStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];

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

export interface EnrollmentRequestRepository {
	getById(id: string): Promise<EnrollmentRequest | undefined>;
	list(): Promise<readonly EnrollmentRequest[]>;
	add(request: EnrollmentRequest): Promise<void>;
	save(request: EnrollmentRequest): Promise<void>;
}

const allowedTransitions: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEnrollmentStatus(value: string): value is EnrollmentStatus {
	return (enrollmentStatuses as readonly string[]).includes(value);
}

export function canTransitionEnrollment(from: EnrollmentStatus, to: EnrollmentStatus): boolean {
	return allowedTransitions[from].includes(to);
}

export function isOpenEnrollment(status: EnrollmentStatus): boolean {
	return status === 'pending' || status === 'approved';
}

export function normalizeLearnerEmail(value: string): string | undefined {
	const email = value.trim().toLowerCase();
	return emailPattern.test(email) ? email : undefined;
}

export function justificationError(value: string): string | undefined {
	if (value.length < 20 || value.length > 500) {
		return 'justification must be between 20 and 500 characters.';
	}
	return undefined;
}
