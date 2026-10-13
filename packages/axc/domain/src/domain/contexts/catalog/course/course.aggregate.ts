import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import type { CourseModality, CourseStatus } from './course.value-objects.ts';

export interface CourseProps extends DomainEntityProps {
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

export type CourseEntityReference = Readonly<CourseProps>;

export class Course extends AggregateRoot<CourseProps, undefined> {
	constructor(props: CourseProps) {
		super(props, undefined);
	}

	/** Case-insensitive keyword match across title, summary and tags. */
	matchesKeyword(keyword: string): boolean {
		const k = keyword.toLowerCase();
		const { title, summary, tags } = this.props;
		return title.toLowerCase().includes(k) || summary.toLowerCase().includes(k) || tags.some((t) => t.toLowerCase().includes(k));
	}

	hasTag(tag: string): boolean {
		const t = tag.toLowerCase();
		return this.props.tags.some((x) => x.toLowerCase() === t);
	}
}
