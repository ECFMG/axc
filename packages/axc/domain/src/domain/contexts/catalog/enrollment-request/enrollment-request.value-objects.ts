import { ValueObject } from '@cellix/domain-seedwork/value-object';
export type EnrollmentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export const enrollmentStatuses: readonly EnrollmentStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];
export class LearnerEmail extends ValueObject<{ value: string }> {
	constructor(input: string) {
		const value = input.trim().toLowerCase();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('learnerEmail must be a valid email address.');
		super({ value });
	}
	get value(): string {
		return this.props.value;
	}
}
export class Justification extends ValueObject<{ value: string }> {
	constructor(input: string) {
		const value = input.trim();
		if (value.length < 20 || value.length > 500) throw new Error('justification must be between 20 and 500 characters.');
		super({ value });
	}
	get value(): string {
		return this.props.value;
	}
}
