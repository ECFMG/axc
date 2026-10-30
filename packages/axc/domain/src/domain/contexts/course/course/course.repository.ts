import type { Repository } from '@cellix/domain-seedwork/repository';
import type { Course, CourseProps } from './course.aggregate.ts';

export interface CourseRepository extends Repository<Course> {
	getNewInstance(props: CourseProps): Course;
	getById(id: string): Promise<Course | undefined>;
	getAll(): Promise<Course[]>;
}
