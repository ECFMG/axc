import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import type { Repository } from '@cellix/domain-seedwork/repository';
import type { Course } from './course.ts';
import { DomainError, invalid } from './domain-error.ts';

export const ENROLLMENT_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

const TRANSITIONS: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface StatusHistoryEntry {
	readonly fromStatus: EnrollmentStatus | null;
	readonly toStatus: EnrollmentStatus;
	readonly changedAt: string;
	readonly changedBy: string;
	readonly reason: string | null;
}

export interface EnrollmentRequestProps extends DomainEntityProps {
	readonly courseId: string;
	readonly learnerEmail: string;
	readonly justification: string;
	status: EnrollmentStatus;
	readonly createdAt: string;
	updatedAt: string;
	readonly statusHistory: StatusHistoryEntry[];
}

export const isEnrollmentStatus = (value: unknown): value is EnrollmentStatus => ENROLLMENT_STATUSES.includes(value as EnrollmentStatus);

export class EnrollmentRequest extends AggregateRoot<EnrollmentRequestProps, undefined> {
	/** Validates input shape only; course existence/activity is checked by `assertEnrollable`. */
	static validate(input: Readonly<Record<string, unknown>>): { courseId: string; learnerEmail: string; justification: string } {
		const { courseId, learnerEmail, justification } = input;
		if (typeof courseId !== 'string' || courseId.trim() === '') throw invalid('courseId', 'courseId is required.');
		if (typeof learnerEmail !== 'string' || !EMAIL.test(learnerEmail)) throw invalid('learnerEmail', 'learnerEmail must be a valid email address.');
		if (typeof justification !== 'string' || justification.trim().length < 20 || justification.trim().length > 500) {
			throw invalid('justification', 'justification must be between 20 and 500 characters.');
		}
		return { courseId, learnerEmail: learnerEmail.toLowerCase(), justification: justification.trim() };
	}

	static assertEnrollable(courseId: string, course: Course | undefined): void {
		if (!course) throw new DomainError('COURSE_NOT_FOUND', `Course ${courseId} was not found.`);
		if (course.status !== 'active') throw new DomainError('COURSE_NOT_ACTIVE', `Course ${courseId} is ${course.status}, not active.`);
	}

	static create(id: string, input: { courseId: string; learnerEmail: string; justification: string }, now: string): EnrollmentRequest {
		return new EnrollmentRequest({ id, ...input, status: 'pending', createdAt: now, updatedAt: now, statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null }] }, undefined);
	}

	get isActive(): boolean {
		return this.props.status === 'pending' || this.props.status === 'approved';
	}

	changeStatus(toStatus: EnrollmentStatus, changedBy: string, reason: string | null, now: string): void {
		if (toStatus === 'rejected' && !reason?.trim()) throw invalid('reason', 'reason is required when rejecting a request.');
		const fromStatus = this.props.status;
		if (!TRANSITIONS[fromStatus].includes(toStatus)) {
			throw new DomainError('INVALID_STATUS_TRANSITION', `Cannot change status from ${fromStatus} to ${toStatus}.`);
		}
		this.props.status = toStatus;
		this.props.updatedAt = now;
		this.props.statusHistory.push({ fromStatus, toStatus, changedAt: now, changedBy, reason });
	}
}

export interface EnrollmentRequestFilter {
	status?: EnrollmentStatus | undefined;
	courseId?: string | undefined;
	learnerEmail?: string | undefined;
}

export interface EnrollmentRequestRepository extends Repository<EnrollmentRequest> {
	nextId(): string;
	getById(id: string): Promise<EnrollmentRequest | undefined>;
	list(filter: EnrollmentRequestFilter): Promise<EnrollmentRequest[]>;
}
