import type { Repository } from '@cellix/domain-seedwork/repository';
import type { Course, CourseNewInput, CourseProps } from './course.aggregate.ts';

export interface CourseRepository<props extends CourseProps> extends Repository<Course<props>> {
	getNewInstance(input: CourseNewInput): Promise<Course<props>>;
	getById(id: string): Promise<Course<props>>;
}
