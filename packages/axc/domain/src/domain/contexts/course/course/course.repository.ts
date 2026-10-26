import type { Repository } from '@cellix/domain-seedwork/repository';
import type { Course, CourseProps } from './course.aggregate.ts';
import type { CourseSearchCriteria } from './course.value-objects.ts';

export interface CourseSearchPage {
	items: Course[];
	totalItems: number;
}

export interface CourseRepository extends Repository<Course> {
	getNewInstance(props: CourseProps): Promise<Course>;
	getById(id: string): Promise<Course | undefined>;
	search(criteria: CourseSearchCriteria): Promise<CourseSearchPage>;
}
