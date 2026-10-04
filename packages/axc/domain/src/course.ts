export type CourseModality = 'online' | 'in-person' | 'hybrid';

export type CourseStatus = 'draft' | 'active' | 'retired';

export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface CourseRepository {
	getAll(): Promise<readonly Course[]>;
}
