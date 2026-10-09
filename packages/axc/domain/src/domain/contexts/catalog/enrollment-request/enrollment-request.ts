export type EnrollmentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
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
export const mayTransition = (from: EnrollmentStatus, to: EnrollmentStatus): boolean => (from === 'pending' && (to === 'approved' || to === 'rejected' || to === 'cancelled')) || (from === 'approved' && to === 'cancelled');
