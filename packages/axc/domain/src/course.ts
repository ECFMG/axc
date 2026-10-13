import { DomainEntity, type DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import type { Repository } from '@cellix/domain-seedwork/repository';

export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof COURSE_MODALITIES)[number];

export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export interface CourseProps extends DomainEntityProps {
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

/** Plain course fields returned by catalog search. */
export interface CourseSnapshot {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export class Course extends DomainEntity<CourseProps> {
	public toSnapshot(): CourseSnapshot {
		return {
			id: this.props.id,
			title: this.props.title,
			summary: this.props.summary,
			modality: this.props.modality,
			status: this.props.status,
			tags: [...this.props.tags],
			createdAt: this.props.createdAt,
			updatedAt: this.props.updatedAt,
		};
	}
}

export interface CourseRepository extends Repository<Course> {
	list(): Promise<readonly Course[]>;
}
