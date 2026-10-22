import { ValueObject } from '@cellix/domain-seedwork/value-object';
export class LearnerEmail extends ValueObject<{ value: string }> {
	constructor(input: string) {
		const value = input.trim().toLowerCase();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Invalid learner email');
		super({ value });
	}
	override valueOf() {
		return this.props.value;
	}
}
export class Justification extends ValueObject<{ value: string }> {
	constructor(input: string) {
		const value = input.trim();
		if (value.length < 20 || value.length > 500) throw new Error('Invalid justification');
		super({ value });
	}
	override valueOf() {
		return this.props.value;
	}
}
export type EnrollmentStatusValue = 'pending' | 'approved' | 'rejected' | 'cancelled';
export class EnrollmentStatus extends ValueObject<{ value: EnrollmentStatusValue }> {
	constructor(value: EnrollmentStatusValue) {
		if (!['pending', 'approved', 'rejected', 'cancelled'].includes(value)) throw new Error('Invalid enrollment status');
		super({ value });
	}
	override valueOf() {
		return this.props.value;
	}
}
