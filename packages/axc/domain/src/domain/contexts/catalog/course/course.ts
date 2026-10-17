export const modalities = ['online', 'in-person', 'hybrid'] as const;
export const statuses = ['draft', 'active', 'retired'] as const;
export const sorts = ['title', 'createdAt', 'updatedAt'] as const;

export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: (typeof modalities)[number];
	readonly status: (typeof statuses)[number];
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}
export interface CourseSearchQuery {
	q?: string;
	modality?: Course['modality'];
	status?: Course['status'];
	tag?: string;
	page: number;
	pageSize: number;
	sort: (typeof sorts)[number];
}
export interface CourseSearchResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
