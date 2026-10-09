export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;

export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: (typeof COURSE_MODALITIES)[number];
	status: (typeof COURSE_STATUSES)[number];
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

/** Read-only catalog projection; the Cellix get/save contract is for writable repositories. */
export interface CourseCatalogRepository {
	list(): Promise<readonly Course[]>;
}
