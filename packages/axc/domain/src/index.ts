import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export { COURSE_MODALITIES, COURSE_STATUSES, type Course, type CourseModality, type CourseStatus, isCourseModality, isCourseStatus } from './course.ts';
export { queryCourseCatalog } from './course-catalog-query.ts';
export {
	COURSE_SORT_FIELDS,
	type CourseReadRepository,
	type CourseSearchCriteria,
	type CourseSearchResult,
	type CourseSortField,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	DEFAULT_COURSE_SORT_FIELD,
	isCourseSortField,
	MAX_COURSE_PAGE_SIZE,
} from './course-search.ts';
