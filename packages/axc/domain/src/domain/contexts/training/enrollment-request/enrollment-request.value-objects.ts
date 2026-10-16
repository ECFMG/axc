import { ValueObject } from '@cellix/domain-seedwork/value-object';
export const ENROLLMENT_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];
export const ENROLLMENT_JUSTIFICATION_MIN_LENGTH = 20;
export const ENROLLMENT_JUSTIFICATION_MAX_LENGTH = 500;
export type EnrollmentErrorCode = 'INVALID_REQUEST' | 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION';
export interface EnrollmentValidationDetail {
	field: string;
	message: string;
}
export class EnrollmentError extends Error {
	readonly code: EnrollmentErrorCode;
	readonly details: EnrollmentValidationDetail[];
	constructor(code: EnrollmentErrorCode, details: EnrollmentValidationDetail[] = []) {
		super(details.length === 0 ? code : details.map((detail) => detail.message).join(' '));
		this.code = code;
		this.details = details;
	}
}
export function invalidEnrollmentField(field: string, message: string): never {
	throw new EnrollmentError('INVALID_REQUEST', [{ field, message }]);
}
export class LearnerEmail extends ValueObject<{ value: string }> {
	constructor(value: string) {
		const normalized = value.trim().toLowerCase();
		const emailPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
		if (!emailPattern.test(normalized)) {
			invalidEnrollmentField('learnerEmail', 'learnerEmail must be a valid email address.');
		}
		super({ value: normalized });
	}
	get value(): string {
		return this.props.value;
	}
}
export class EnrollmentJustification extends ValueObject<{ value: string }> {
	constructor(value: string) {
		const normalized = value.trim();
		if (normalized.length < ENROLLMENT_JUSTIFICATION_MIN_LENGTH || normalized.length > ENROLLMENT_JUSTIFICATION_MAX_LENGTH) {
			invalidEnrollmentField('justification', 'justification must be between 20 and 500 characters.');
		}
		super({ value: normalized });
	}
	get value(): string {
		return this.props.value;
	}
}
