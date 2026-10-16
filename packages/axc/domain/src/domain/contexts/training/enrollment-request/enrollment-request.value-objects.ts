import { ValueObject } from '@cellix/domain-seedwork/value-object';

export class InvalidEnrollmentValueError extends Error {}

export class LearnerEmail extends ValueObject<{ value: string }> {
	constructor(value: string) {
		const normalized = value.trim().toLowerCase();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new InvalidEnrollmentValueError('learnerEmail must be a valid email address.');
		super({ value: normalized });
	}
	override valueOf(): string {
		return this.props.value;
	}
}

export class Justification extends ValueObject<{ value: string }> {
	constructor(value: string) {
		const normalized = value.trim();
		if (normalized.length < 20 || normalized.length > 500) throw new InvalidEnrollmentValueError('justification must be between 20 and 500 characters.');
		super({ value: normalized });
	}
	override valueOf(): string {
		return this.props.value;
	}
}

export type EnrollmentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export class Status extends ValueObject<{ value: EnrollmentStatus }> {
	constructor(value: string) {
		if (value !== 'pending' && value !== 'approved' && value !== 'rejected' && value !== 'cancelled') throw new InvalidEnrollmentValueError('status must be pending, approved, rejected, or cancelled.');
		super({ value });
	}
	override valueOf(): EnrollmentStatus {
		return this.props.value;
	}
}

export interface StatusHistoryProps {
	readonly fromStatus: EnrollmentStatus | null;
	readonly toStatus: EnrollmentStatus;
	readonly changedAt: string;
	readonly changedBy: string;
	readonly reason: string | null;
}

// History entries have no separate identity or lifecycle; each is an immutable value.
export class StatusHistoryEntry extends ValueObject<StatusHistoryProps> {
	constructor(props: StatusHistoryProps) {
		super({ ...props });
	}
	toJSON(): StatusHistoryProps {
		return { ...this.props };
	}
}
