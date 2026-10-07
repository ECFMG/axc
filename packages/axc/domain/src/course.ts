import { DomainEntity, type DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';

export const courseModalities = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof courseModalities)[number];

export const courseStatuses = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof courseStatuses)[number];

export const courseSortFields = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSortField = (typeof courseSortFields)[number];

export interface CourseProps extends DomainEntityProps {
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

export class Course extends DomainEntity<CourseProps> {
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
}

/** Read port for the training course catalog. */
export interface CourseCatalog {
	listCourses(): Promise<readonly Course[]>;
}
