import { DomainSeedwork } from '../../../seedwork/index.ts';
import type { EnrollmentRequestStatus } from './enrollment-request.entity.ts';

/** Raised when input breaks a domain invariant; application services map it to INVALID_REQUEST (400). */
export class EnrollmentRequestValidationError extends Error {
	readonly field: string;

	constructor(field: string, message: string) {
		super(message);
		this.name = 'EnrollmentRequestValidationError';
		this.field = field;
	}
}

/** Raised when a request is created for a course that is not active; mapped to COURSE_NOT_ACTIVE (409). */
export class CourseNotActiveError extends Error {
	constructor(courseId: string) {
		super(`Course ${courseId} is not active.`);
		this.name = 'CourseNotActiveError';
	}
}

/** Raised for a status change the workflow does not allow; mapped to INVALID_STATUS_TRANSITION (409). */
export class InvalidStatusTransitionError extends Error {
	readonly fromStatus: EnrollmentRequestStatus;
	readonly toStatus: EnrollmentRequestStatus;

	constructor(fromStatus: EnrollmentRequestStatus, toStatus: EnrollmentRequestStatus) {
		super(`Cannot change an enrollment request from ${fromStatus} to ${toStatus}.`);
		this.name = 'InvalidStatusTransitionError';
		this.fromStatus = fromStatus;
		this.toStatus = toStatus;
	}
}

export const enrollmentRequestStatuses: readonly EnrollmentRequestStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];

const allowedTransitions: Readonly<Record<EnrollmentRequestStatus, readonly EnrollmentRequestStatus[]>> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

export const isAllowedTransition = (from: EnrollmentRequestStatus, to: EnrollmentRequestStatus): boolean => allowedTransitions[from].includes(to);

// Pragmatic address check: one @, no whitespace, a dotted domain. Full RFC 5322 is not the goal.
const emailPattern = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export class LearnerEmail extends DomainSeedwork.ValueObject<{ value: string }> {
	constructor(value: string) {
		const normalized = value.trim().toLowerCase();
		if (normalized.length > 254 || !emailPattern.test(normalized)) {
			throw new EnrollmentRequestValidationError('learnerEmail', 'learnerEmail must be a valid email address.');
		}
		super({ value: normalized });
	}

	get value(): string {
		return this.props.value;
	}
}

export class Justification extends DomainSeedwork.ValueObject<{ value: string }> {
	constructor(value: string) {
		const trimmed = value.trim();
		if (trimmed.length < 20 || trimmed.length > 500) {
			throw new EnrollmentRequestValidationError('justification', 'justification must be between 20 and 500 characters.');
		}
		super({ value: trimmed });
	}

	get value(): string {
		return this.props.value;
	}
}

export class ChangedBy extends DomainSeedwork.ValueObject<{ value: string }> {
	constructor(value: string) {
		const trimmed = value.trim();
		if (trimmed.length === 0 || trimmed.length > 254) {
			throw new EnrollmentRequestValidationError('changedBy', 'changedBy must be between 1 and 254 characters.');
		}
		super({ value: trimmed });
	}

	get value(): string {
		return this.props.value;
	}
}

/** Optional free-text reason; required (non-empty) when the new status is `rejected`. */
export class StatusChangeReason extends DomainSeedwork.ValueObject<{ value: string | null }> {
	constructor(value: string | undefined, toStatus: EnrollmentRequestStatus) {
		const trimmed = value?.trim() ?? '';
		if (toStatus === 'rejected' && trimmed.length === 0) {
			throw new EnrollmentRequestValidationError('reason', 'reason is required when rejecting a request.');
		}
		if (trimmed.length > 500) {
			throw new EnrollmentRequestValidationError('reason', 'reason must be at most 500 characters.');
		}
		super({ value: trimmed.length > 0 ? trimmed : null });
	}

	get value(): string | null {
		return this.props.value;
	}
}
