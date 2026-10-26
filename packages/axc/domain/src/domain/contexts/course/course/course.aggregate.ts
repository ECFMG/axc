import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import { type CourseModality, type CourseSearchCriteria, type CourseStatus, CourseStatuses } from './course.value-objects.ts';

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

export class Course extends AggregateRoot<CourseProps, undefined> {
	get isActive(): boolean {
		return this.props.status === CourseStatuses.Active;
	}

	matches(criteria: CourseSearchCriteria): boolean {
		const { title, summary, tags, modality, status } = this.props;
		const q = criteria.q?.toLowerCase();
		const tag = criteria.tag?.toLowerCase();
		return (
			(q === undefined || [title, summary, ...tags].some((text) => text.toLowerCase().includes(q))) &&
			(criteria.modality === undefined || modality === criteria.modality) &&
			(criteria.status === undefined || status === criteria.status) &&
			(tag === undefined || tags.some((t) => t.toLowerCase() === tag))
		);
	}

	toReference(): CourseEntityReference {
		return { ...this.props, tags: [...this.props.tags] };
	}
}
