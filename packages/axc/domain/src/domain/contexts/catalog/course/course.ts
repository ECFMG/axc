export const modalities = ['online', 'in-person', 'hybrid'] as const;
export const statuses = ['draft', 'active', 'retired'] as const;
export const sorts = ['title', 'createdAt', 'updatedAt'] as const;
export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: (typeof modalities)[number];
	status: (typeof statuses)[number];
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
	sort: (typeof sorts)[number];
}
export interface CourseSearchResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
export interface QueryProblem {
	field: string;
	message: string;
}
export function validateCourseSearchQuery(query: CourseSearchQuery): QueryProblem[] {
	const details: QueryProblem[] = [];
	for (const [field, allowed] of [
		['modality', modalities],
		['status', statuses],
		['sort', sorts],
	] as const) {
		const value = query[field];
		if (value !== undefined && !(allowed as readonly string[]).includes(value)) details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
	}
	for (const field of ['q', 'tag'] as const) {
		if (query[field] !== undefined && !query[field]?.trim()) details.push({ field, message: `${field} must not be empty.` });
	}
	for (const field of ['page', 'pageSize'] as const) {
		const value = query[field];
		if (!Number.isSafeInteger(value) || value < 1 || (field === 'pageSize' && value > 50)) details.push({ field, message: field === 'pageSize' ? 'pageSize must be between 1 and 50.' : 'page must be a positive safe integer.' });
	}
	return details;
}
