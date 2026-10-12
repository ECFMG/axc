export type CourseModality = 'online' | 'in-person' | 'hybrid';

export type CourseStatus = 'draft' | 'active' | 'retired';

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

export type CourseSortField = 'title' | 'createdAt' | 'updatedAt';

export interface CourseSearchQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page?: number;
	pageSize?: number;
	sort?: CourseSortField;
}

export interface PaginatedCourseResponse {
	items: Course[];
	page: number;
	size: number;
	totalItems: number;
	totalPages: number;
}

export interface ValidationError {
	field: string;
	message: string;
}

export interface CourseSearchError {
	error: {
		code: 'INVALID_QUERY_PARAMETER';
		message: string;
		details: ValidationError[];
	};
}
