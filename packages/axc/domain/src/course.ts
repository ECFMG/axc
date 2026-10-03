export type CourseModality = 'online' | 'in-person' | 'hybrid';
export type CourseStatus = 'draft' | 'active' | 'retired';

/** Read-only catalog projection. */
export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface CourseReadRepository {
	list(): Promise<Course[]>;
}
