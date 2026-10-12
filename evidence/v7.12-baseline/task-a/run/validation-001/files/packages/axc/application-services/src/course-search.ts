import { COURSE_FIXTURES } from './course-fixtures.js';
import type { Course, CourseSearchError, CourseSearchQuery, CourseSortField, PaginatedCourseResponse, ValidationError } from './course-types';

export class CourseSearchService {
	/**
	 * Searches the course catalog using provided filters, keyword, and pagination.
	 * This implementation is stateless and uses local fixtures.
	 */
	public async searchCourses(query: CourseSearchQuery): Promise<PaginatedCourseResponse> {
		const { q, modality, status, tag, page = 1, pageSize = 10, sort = 'title' as CourseSortField } = query;

		// 1. Filtering
		const filtered = COURSE_FIXTURES.filter((course) => {
			// Keyword search (q): title, summary, or tags (case-insensitive)
			if (q) {
				const searchStr = q.toLowerCase();
				const matchesQ = course.title.toLowerCase().includes(searchStr) || course.summary.toLowerCase().includes(searchStr) || course.tags.some((t) => t.toLowerCase().includes(searchStr));
				if (!matchesQ) return false;
			}

			// Modality filter
			if (modality && course.modality !== modality) return false;

			// Status filter
			if (status && course.status !== status) return false;

			// Tag filter (case-insensitive)
			if (tag) {
				theTag: const searchTag = tag.toLowerCase();
				if (!course.tags.some((t) => t.toLowerCase() === searchTag)) return false;
			}

			return true;
		});

		// 2. Sorting
		filtered.sort((a, b) => {
			if (sort === 'title') {
				return a.title.localeCompare(b.title);
			}
			if (sort === 'createdAt') {
				return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
			}
			if (sort === 'updatedAt') {
				return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
			}
			return 0;
		});

		// 3. Pagination
		const totalItems = filtered.length;
		const totalPages = Math.ceil(totalItems / pageSize);
		const startIndex = (page - 1) * pageSize;
		const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

		return {
			items: paginatedItems,
			page,
			size: pageSize,
			totalItems,
			totalPages,
		};
	}
}
