export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: (typeof COURSE_MODALITIES)[number];
	readonly status: (typeof COURSE_STATUSES)[number];
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

/** Read-only catalog projection; the seedwork get/save repository is for mutable entities. */
export interface CourseCatalog {
	list(): Promise<readonly Course[]>;
}

export interface CourseSearch {
	q?: string;
	modality?: Course['modality'];
	status?: Course['status'];
	tag?: string;
	page: number;
	pageSize: number;
	sort: (typeof COURSE_SORT_FIELDS)[number];
}

export interface CourseSearchResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
