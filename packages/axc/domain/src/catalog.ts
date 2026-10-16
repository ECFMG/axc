export const modalities = ['online', 'in-person', 'hybrid'] as const;
export const courseStatuses = ['draft', 'active', 'retired'] as const;
export const enrollmentStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;

export type Modality = (typeof modalities)[number];
export type CourseStatus = (typeof courseStatuses)[number];
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];

export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: Modality;
	status: CourseStatus;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

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

export function canTransition(from: EnrollmentStatus, to: EnrollmentStatus): boolean {
	return (from === 'pending' && (to === 'approved' || to === 'rejected' || to === 'cancelled')) || (from === 'approved' && to === 'cancelled');
}
