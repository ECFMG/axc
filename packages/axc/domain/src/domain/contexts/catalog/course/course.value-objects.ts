export const CourseModality = { Online: 'online', InPerson: 'in-person', Hybrid: 'hybrid' } as const;
export type CourseModality = (typeof CourseModality)[keyof typeof CourseModality];

export const CourseStatus = { Draft: 'draft', Active: 'active', Retired: 'retired' } as const;
export type CourseStatus = (typeof CourseStatus)[keyof typeof CourseStatus];

export const CourseSortField = { Title: 'title', CreatedAt: 'createdAt', UpdatedAt: 'updatedAt' } as const;
export type CourseSortField = (typeof CourseSortField)[keyof typeof CourseSortField];
