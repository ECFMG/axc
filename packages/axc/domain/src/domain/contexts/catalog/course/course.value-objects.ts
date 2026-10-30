import { ValueObject } from '@cellix/domain-seedwork/value-object';

export const CourseModalities = { Online: 'online', InPerson: 'in-person', Hybrid: 'hybrid' } as const;
export type CourseModality = (typeof CourseModalities)[keyof typeof CourseModalities];

export const CourseStatuses = { Draft: 'draft', Active: 'active', Retired: 'retired' } as const;
export type CourseStatus = (typeof CourseStatuses)[keyof typeof CourseStatuses];

const oneOf =
	<T extends string>(values: Record<string, T>) =>
	(value: string): value is T =>
		(Object.values(values) as string[]).includes(value);

export const isCourseModality = oneOf(CourseModalities);
export const isCourseStatus = oneOf(CourseStatuses);

export class Modality extends ValueObject<{ value: CourseModality }> {
	constructor(value: string) {
		if (!isCourseModality(value)) throw new Error(`Invalid modality: ${value}`);
		super({ value });
	}
	get value(): CourseModality {
		return this.props.value;
	}
}

export class Status extends ValueObject<{ value: CourseStatus }> {
	constructor(value: string) {
		if (!isCourseStatus(value)) throw new Error(`Invalid status: ${value}`);
		super({ value });
	}
	get value(): CourseStatus {
		return this.props.value;
	}
}
