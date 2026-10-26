import { Course, type CourseProps, type CourseRepository, type CourseSearchCriteria, type CourseSearchPage } from '@axc/domain';
import { NotFoundError } from '@cellix/domain-seedwork/repository';

export class InMemoryCourseRepository implements CourseRepository {
	private readonly courses = new Map<string, Course>();

	constructor(seed: readonly CourseProps[]) {
		for (const props of seed) this.courses.set(props.id, new Course({ ...props, tags: [...props.tags] }, undefined));
	}

	getNewInstance(props: CourseProps): Promise<Course> {
		return Promise.resolve(new Course(props, undefined));
	}

	getById(id: string): Promise<Course | undefined> {
		return Promise.resolve(this.courses.get(id));
	}

	async get(id: string): Promise<Course> {
		const course = await this.getById(id);
		if (!course) throw new NotFoundError(`Course ${id} not found`);
		return course;
	}

	save(item: Course): Promise<Course> {
		this.courses.set(item.id, item);
		return Promise.resolve(item);
	}

	search(criteria: CourseSearchCriteria): Promise<CourseSearchPage> {
		const key = criteria.sort;
		const matched = [...this.courses.values()].filter((c) => c.matches(criteria)).sort((a, b) => a.props[key].localeCompare(b.props[key]) || a.id.localeCompare(b.id));
		const start = (criteria.page - 1) * criteria.pageSize;
		return Promise.resolve({ items: matched.slice(start, start + criteria.pageSize), totalItems: matched.length });
	}
}
