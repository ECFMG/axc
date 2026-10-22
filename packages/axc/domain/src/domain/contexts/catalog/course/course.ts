export const modalities = ['online', 'in-person', 'hybrid'] as const;
export const courseStatuses = ['draft', 'active', 'retired'] as const;
export const courseSorts = ['title', 'createdAt', 'updatedAt'] as const;
export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: (typeof modalities)[number];
	status: (typeof courseStatuses)[number];
	tags: string[];
	createdAt: string;
	updatedAt: string;
}
export interface CourseSearchQuery {
	q?: string;
	modality?: Course['modality'];
	status?: Course['status'];
	tag?: string;
	page: number;
	pageSize: number;
	sort: (typeof courseSorts)[number];
}
export interface CourseSearchResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
