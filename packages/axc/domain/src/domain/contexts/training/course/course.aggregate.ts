import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import { CourseModality, CourseStatus } from './course.value-objects.ts';

export interface CourseProps extends DomainEntityProps {
	title: string;
	summary: string;
	modality: 'online' | 'in-person' | 'hybrid';
	status: 'draft' | 'active' | 'retired';
	tags: string[];
	createdAt: string;
	updatedAt: string;
}
export interface CourseEntityReference extends Readonly<CourseProps> {}
export class Course<P extends CourseProps = CourseProps> extends AggregateRoot<P, void> implements CourseEntityReference {
	static getNewInstance<P extends CourseProps>(props: P): Course<P> {
		if (!props.id || !props.title.trim() || !props.summary.trim()) throw new Error('Invalid course');
		new CourseModality(props.modality);
		new CourseStatus(props.status);
		return new Course(props, undefined);
	}
	get title() {
		return this.props.title;
	}
	get summary() {
		return this.props.summary;
	}
	get modality() {
		return this.props.modality;
	}
	get status() {
		return this.props.status;
	}
	get tags() {
		return [...this.props.tags];
	}
	get createdAt() {
		return this.props.createdAt;
	}
	get updatedAt() {
		return this.props.updatedAt;
	}
}
