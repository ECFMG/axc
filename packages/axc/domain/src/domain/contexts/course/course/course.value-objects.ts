export const CourseModality = { Online: 'online', InPerson: 'in-person', Hybrid: 'hybrid' } as const;
export type CourseModality = (typeof CourseModality)[keyof typeof CourseModality];

export const CourseStatus = { Draft: 'draft', Active: 'active', Retired: 'retired' } as const;
export type CourseStatus = (typeof CourseStatus)[keyof typeof CourseStatus];

export const CourseSort = { Title: 'title', CreatedAt: 'createdAt', UpdatedAt: 'updatedAt' } as const;
export type CourseSort = (typeof CourseSort)[keyof typeof CourseSort];
