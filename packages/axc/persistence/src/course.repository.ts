import { Course, type CourseProps, type CourseRepository, type CourseSearchCriteria, type CourseSearchResult } from '@axc/domain';
import { NotFoundError } from '@cellix/domain-seedwork/repository';
import { courseSeed } from './course-seed.ts';

export class InMemoryCourseRepository implements CourseRepository {
	private readonly courses = new Map<string, Course>();

	constructor(seed: readonly CourseProps[] = courseSeed) {
		for (const props of seed) {
			this.courses.set(props.id, new Course(props));
		}
	}

	get(id: string): Promise<Course> {
		const course = this.courses.get(id);
		return course ? Promise.resolve(course) : Promise.reject(new NotFoundError(`Course ${id} not found`));
	}

	save(item: Course): Promise<Course> {
		this.courses.set(item.id, item);
		return Promise.resolve(item);
	}

	search({ q, modality, status, tag, sort, page, pageSize }: CourseSearchCriteria): Promise<CourseSearchResult> {
		const matches = [...this.courses.values()]
			.filter((c) => (q === undefined || c.matchesKeyword(q)) && (modality === undefined || c.props.modality === modality) && (status === undefined || c.props.status === status) && (tag === undefined || c.hasTag(tag)))
			.sort((a, b) => a.props[sort].localeCompare(b.props[sort]) || a.id.localeCompare(b.id));
		const start = (page - 1) * pageSize;
		return Promise.resolve({ items: matches.slice(start, start + pageSize), totalItems: matches.length });
	}
}
