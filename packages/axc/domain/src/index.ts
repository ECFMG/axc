import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export { COURSE_MODALITIES, COURSE_STATUSES, type Course, type CourseModality, type CourseStatus, isCourseModality, isCourseStatus } from './course/course.ts';
export { compareCoursesBy, courseMatchesCriteria } from './course/course-catalog-search.ts';
export {
	COURSE_SORT_FIELDS,
	type CourseCatalogReadRepository,
	type CourseSearchCriteria,
	type CourseSearchMatches,
	type CourseSortField,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	DEFAULT_COURSE_SORT,
	isCourseSortField,
	MAX_COURSE_PAGE_SIZE,
	MIN_COURSE_PAGE_SIZE,
} from './course/course-search.ts';
