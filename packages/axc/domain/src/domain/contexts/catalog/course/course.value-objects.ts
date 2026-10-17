import { ValueObject } from '@cellix/domain-seedwork/value-object';
export type CourseModality = 'online' | 'in-person' | 'hybrid';
export type CourseStatus = 'draft' | 'active' | 'retired';
export const courseModalities: readonly CourseModality[] = ['online', 'in-person', 'hybrid'];
export const courseStatuses: readonly CourseStatus[] = ['draft', 'active', 'retired'];

export class Modality extends ValueObject<{ value: CourseModality }> {
	constructor(value: string) {
		if (!courseModalities.includes(value as CourseModality)) throw new Error('Invalid course modality.');
		super({ value: value as CourseModality });
	}
	get value(): CourseModality {
		return this.props.value;
	}
}
export class Status extends ValueObject<{ value: CourseStatus }> {
	constructor(value: string) {
		if (!courseStatuses.includes(value as CourseStatus)) throw new Error('Invalid course status.');
		super({ value: value as CourseStatus });
	}
	get value(): CourseStatus {
		return this.props.value;
	}
}
