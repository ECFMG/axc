export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof COURSE_MODALITIES)[number];

export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export const COURSE_DEFAULT_PAGE = 1;
export const COURSE_DEFAULT_PAGE_SIZE = 10;
export const COURSE_MAX_PAGE_SIZE = 50;
export const COURSE_DEFAULT_SORT: CourseSortField = 'title';
