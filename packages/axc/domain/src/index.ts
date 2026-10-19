import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export const courseModalities = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof courseModalities)[number];

export const courseStatuses = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof courseStatuses)[number];

export const courseSorts = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSort = (typeof courseSorts)[number];

export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: readonly string[];
	createdAt: string;
	updatedAt: string;
}

export interface CourseRepository {
	list(): Promise<readonly Course[]>;
	findById(id: string): Promise<Course | undefined>;
}

export const enrollmentStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;
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
	statusHistory: readonly StatusHistoryEntry[];
}

export interface EnrollmentRequestRepository {
	list(): Promise<readonly EnrollmentRequest[]>;
	findById(id: string): Promise<EnrollmentRequest | undefined>;
	insert(request: EnrollmentRequest): Promise<void>;
	replace(request: EnrollmentRequest): Promise<void>;
	nextId(): string;
}

export function isEnrollmentTransition(from: EnrollmentStatus, to: EnrollmentStatus): boolean {
	return (from === 'pending' && (to === 'approved' || to === 'rejected' || to === 'cancelled')) || (from === 'approved' && to === 'cancelled');
}
