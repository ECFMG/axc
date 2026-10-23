import type { Course, EnrollmentRequest, StatusHistoryEntry } from '@axc/domain';

export interface CourseSearchResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface EnrollmentRequestList {
	items: EnrollmentRequest[];
}

export function toCourseResponse(course: Course): Course {
	return {
		id: course.id,
		title: course.title,
		summary: course.summary,
		modality: course.modality,
		status: course.status,
		tags: [...course.tags],
		createdAt: course.createdAt,
		updatedAt: course.updatedAt,
	};
}

export function toCourseSearchResult(items: readonly Course[], page: number, pageSize: number, totalItems: number): CourseSearchResult {
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
	return {
		items: items.map(toCourseResponse),
		page,
		pageSize,
		totalItems,
		totalPages,
	};
}

export function toEnrollmentRequestResponse(request: EnrollmentRequest): EnrollmentRequest {
	return {
		id: request.id,
		courseId: request.courseId,
		learnerEmail: request.learnerEmail,
		justification: request.justification,
		status: request.status,
		createdAt: request.createdAt,
		updatedAt: request.updatedAt,
		statusHistory: request.statusHistory.map((entry: StatusHistoryEntry) => ({
			fromStatus: entry.fromStatus,
			toStatus: entry.toStatus,
			changedAt: entry.changedAt,
			changedBy: entry.changedBy,
			reason: entry.reason,
		})),
	};
}

export function toEnrollmentRequestList(items: readonly EnrollmentRequest[]): EnrollmentRequestList {
	return { items: items.map(toEnrollmentRequestResponse) };
}
