export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: 'online' | 'in-person' | 'hybrid';
	readonly status: 'draft' | 'active' | 'retired';
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface InvalidCourseQuery {
	error: {
		code: 'INVALID_QUERY_PARAMETER';
		message: 'One or more query parameters are invalid.';
		details: { field: string; message: string }[];
	};
}

export type CourseSearchResult = { status: 200; body: CoursePage } | { status: 400; body: InvalidCourseQuery };
