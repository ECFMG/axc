import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import { type CourseModality, CourseStatus } from './course.value-objects.ts';

export interface CourseProps extends DomainEntityProps {
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	readonly createdAt: Date;
	readonly updatedAt: Date;
}

export type CourseEntityReference = Readonly<CourseProps>;

export class Course extends AggregateRoot<CourseProps, undefined> {
	static getNewInstance(props: CourseProps): Course {
		return new Course(props, undefined);
	}

	get isActive(): boolean {
		return this.props.status === CourseStatus.Active;
	}

	hasTag(tag: string): boolean {
		const wanted = tag.toLowerCase();
		return this.props.tags.some((t) => t.toLowerCase() === wanted);
	}

	/** Case-insensitive keyword match across title, summary and tags. */
	matchesKeyword(q: string): boolean {
		const needle = q.toLowerCase();
		return [this.props.title, this.props.summary, ...this.props.tags].some((text) => text.toLowerCase().includes(needle));
	}
}
