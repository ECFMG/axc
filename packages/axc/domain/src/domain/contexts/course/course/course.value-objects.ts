export const Modality = { Online: 'online', InPerson: 'in-person', Hybrid: 'hybrid' } as const;
export type Modality = (typeof Modality)[keyof typeof Modality];

export const CourseStatus = { Draft: 'draft', Active: 'active', Retired: 'retired' } as const;
export type CourseStatus = (typeof CourseStatus)[keyof typeof CourseStatus];

export const isModality = (value: string): value is Modality => (Object.values(Modality) as string[]).includes(value);
export const isCourseStatus = (value: string): value is CourseStatus => (Object.values(CourseStatus) as string[]).includes(value);
