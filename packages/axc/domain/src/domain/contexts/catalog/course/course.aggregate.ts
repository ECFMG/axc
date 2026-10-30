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

export type CourseEntityReference = Readonly<CourseProps>;

export class Course extends AggregateRoot<CourseProps, unknown> {
	static getNewInstance(props: CourseProps): Course {
		return new Course({ ...props, modality: new Modality(props.modality).value, status: new Status(props.status).value, tags: [...props.tags] }, undefined);
	}
	get title(): string {
		return this.props.title;
	}
	get summary(): string {
		return this.props.summary;
	}
	get modality(): CourseModality {
		return this.props.modality;
	}
	get status(): CourseStatus {
		return this.props.status;
	}
	get tags(): readonly string[] {
		return this.props.tags;
	}
	get createdAt(): string {
		return this.props.createdAt;
	}
	get updatedAt(): string {
		return this.props.updatedAt;
	}
	toReference(): CourseEntityReference {
		return { ...this.props, tags: [...this.props.tags] };
	}
}
