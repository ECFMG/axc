export const courseModalities = ['online', 'in-person', 'hybrid'] as const;
export const courseStatuses = ['draft', 'active', 'retired'] as const;

export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: (typeof courseModalities)[number];
	readonly status: (typeof courseStatuses)[number];
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface CourseRepository {
	list(): Promise<readonly Course[]>;
}
