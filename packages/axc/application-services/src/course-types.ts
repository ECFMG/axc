export type CourseModality = 'online' | 'in-person' | 'hybrid';
export type CourseStatus = 'draft' | 'active' | 'retired';
export type CourseSort = 'title' | 'createdAt' | 'updatedAt';

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

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface CourseQueryError {
	error: {
		code: 'INVALID_QUERY_PARAMETER';
		message: 'One or more query parameters are invalid.';
		details: { field: string; message: string }[];
	};
}

export type RawCourseQuery = Record<string, string[]>;
export type CourseSearchResult = CoursePage | CourseQueryError;
