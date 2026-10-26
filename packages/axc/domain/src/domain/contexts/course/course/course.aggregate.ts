import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import type { CourseStatus, Modality } from './course.value-objects.ts';

export interface CourseProps extends DomainEntityProps {
	readonly title: string;
	readonly summary: string;
	readonly modality: Modality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

export type CourseEntityReference = Readonly<CourseProps>;

export class Course extends AggregateRoot<CourseProps, unknown> {
	matchesKeyword(q: string): boolean {
		const needle = q.toLowerCase();
		const { title, summary, tags } = this.props;
		return [title, summary, ...tags].some((text) => text.toLowerCase().includes(needle));
	}

	hasTag(tag: string): boolean {
		const needle = tag.toLowerCase();
		return this.props.tags.some((t) => t.toLowerCase() === needle);
	}

	toReference(): CourseEntityReference {
		return { ...this.props, tags: [...this.props.tags] };
	}
}
