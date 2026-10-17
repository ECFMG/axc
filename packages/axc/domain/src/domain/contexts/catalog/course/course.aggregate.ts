import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import { type CourseModality, type CourseStatus, Modality, Status } from './course.value-objects.ts';

export interface CourseProps extends DomainEntityProps {
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}
export interface CourseEntityReference extends Readonly<CourseProps> {}
export class Course<P extends CourseProps = CourseProps> extends AggregateRoot<P, void> implements CourseEntityReference {
	static getNewInstance<P extends CourseProps>(props: P, title: string, summary: string, modality: CourseModality, tags: string[]): Course<P> {
		if (!title.trim() || !summary.trim()) throw new Error('Course title and summary are required');
		props.title = title.trim();
		props.summary = summary.trim();
		props.modality = new Modality(modality).value;
		props.status = new Status('draft').value;
		props.tags = [...tags];
		props.createdAt = new Date().toISOString();
		props.updatedAt = props.createdAt;
		return new Course(props, undefined);
	}
	toReference(): CourseEntityReference {
		return { id: this.id, title: this.title, summary: this.summary, modality: this.modality, status: this.status, tags: this.tags, createdAt: this.createdAt, updatedAt: this.updatedAt };
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
