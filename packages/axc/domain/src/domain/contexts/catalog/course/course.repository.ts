import type { Repository } from '@cellix/domain-seedwork/repository';
import type { Course } from './course.aggregate.ts';
import type { CourseModality, CourseSortField, CourseStatus } from './course.value-objects.ts';

export interface CourseSearchCriteria {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	sort: CourseSortField;
	page: number;
	pageSize: number;
}

export interface CourseSearchResult {
	items: Course[];
	totalItems: number;
}

export interface CourseRepository extends Repository<Course> {
	search(criteria: CourseSearchCriteria): Promise<CourseSearchResult>;
}
