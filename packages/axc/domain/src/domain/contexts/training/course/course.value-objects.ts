import { ValueObject } from '@cellix/domain-seedwork/value-object';
export class CourseModality extends ValueObject<{ value: 'online' | 'in-person' | 'hybrid' }> {
	constructor(value: 'online' | 'in-person' | 'hybrid') {
		if (!['online', 'in-person', 'hybrid'].includes(value)) throw new Error('Invalid course modality');
		super({ value });
	}
	override valueOf() {
		return this.props.value;
	}
}
export class CourseStatus extends ValueObject<{ value: 'draft' | 'active' | 'retired' }> {
	constructor(value: 'draft' | 'active' | 'retired') {
		if (!['draft', 'active', 'retired'].includes(value)) throw new Error('Invalid course status');
		super({ value });
	}
	override valueOf() {
		return this.props.value;
	}
}
