import { Course, type CourseProps, type CourseRepository } from '@axc/domain';
import { NotFoundError } from '@cellix/domain-seedwork/repository';
import { courseSeed } from './course.seed.ts';

export class InMemoryCourseRepository implements CourseRepository {
	private readonly courses = new Map<string, Course>();

	constructor(seed: readonly CourseProps[] = courseSeed) {
		for (const props of seed) {
			this.courses.set(props.id, this.getNewInstance(props));
		}
	}

	getNewInstance(props: CourseProps): Course {
		return new Course(props, undefined);
	}

	async getById(id: string): Promise<Course> {
		const course = this.courses.get(id);
		if (!course) {
			throw new NotFoundError(`Course ${id} not found`);
		}
		return await Promise.resolve(course);
	}

	get(id: string): Promise<Course> {
		return this.getById(id);
	}

	save(item: Course): Promise<Course> {
		this.courses.set(item.id, item);
		return Promise.resolve(item);
	}

	getAll(): Promise<Course[]> {
		return Promise.resolve([...this.courses.values()]);
	}
}
