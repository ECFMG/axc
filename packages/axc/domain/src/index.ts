import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export type { Course, CourseCatalog, CourseModality, CourseSortField, CourseStatus } from './course.ts';
export {
	COURSE_MODALITIES,
	COURSE_SORT_FIELDS,
	COURSE_STATUSES,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	DEFAULT_COURSE_SORT,
	isCourseModality,
	isCourseSortField,
	isCourseStatus,
	MAX_COURSE_PAGE_SIZE,
} from './course.ts';
