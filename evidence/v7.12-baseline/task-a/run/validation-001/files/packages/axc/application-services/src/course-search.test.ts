import { describe, expect, it } from 'vitest';
import { COURSE_FIXTURES } from './course-fixtures.js';
import { CourseSearchService } from './course-search.js';
import type { CourseSearchQuery, CourseSortField } from './course-types.js';

describe('CourseSearchService', () => {
	const service = new CourseSearchService();

	describe('Keyword Search (q)', () => {
		it('returns courses matching title case-insensitively', async () => {
			const result = await service.searchCourses({ q: 'SECURITY' });
			expect(result.items.length).toBeGreaterThan(0);
			expect(result.items.every((c) => c.title.toLowerCase().includes('security') || c.summary.toLowerCase().includes('security') || c.tags.some((t) => t.toLowerCase().includes('security')))).toBe(true);
		});

		it('returns empty list when no matches found', async () => {
			const result = await service.searchCourses({ q: 'nonexistentkeyword123' });
			expect(result.items).toEqual([]);
			expect(result.totalItems).toBe(0);
		});
	});

	describe('Filters', () => {
		it('filters by modality', async () => {
			const result = await service.searchCourses({ modality: 'online' });
			expect(result.items.every((c) => c.modality === 'online')).toBe(true);
		});

		it('filters by status', async () => {
			const result = await service.searchCourses({ status: 'retired' });
			expect(result.items.every((c) => c.status === 'retired')).toBe(true);
		});

		it('filters by tag case-insensitively', async () => {
			const result = await service.searchCourses({ tag: 'AI' });
			expect(result.items.every((c) => c.tags.some((t) => t.toLowerCase() === 'ai'))).toBe(true);
		});

		it('combines q, modality, and status', async () => {
			// Searching for 'ai' in 'online' 'active' courses
			const result = await service.searchCourses({
				q: 'ai',
				modality: 'online',
				status: 'active',
			});

			for (const course of result.items) {
				const matchesQ = course.title.toLowerCase().includes('ai') || course.summary.toLowerCase().includes('ai') || course.tags.some((t) => t.toLowerCase().includes('ai'));
				expect(matchesQ).toBe(true);
				expect(course.modality).toBe('online');
				expect(course.status).toBe('active');
			}
		});
	});

	describe('Pagination', () => {
		it('uses default pagination (page 1, pageSize 10)', async () => {
			const result = await service.searchCourses({});
			expect(result.page).toBe(1);
			expect(result.size).toBe(10);
			expect(result.items.length).toBeLessThanOrEqual(10);
		});

		it('respects page and pageSize parameters', async () => {
			const result = await service.searchCourses({ page: 2, pageSize: 5 });
			expect(result.page).toBe(2);
			expect(result.size).toBe(5);
			expect(result.items.length).toBeLessThanOrEqual(5);
		});
	});

	describe('Sorting', () => {
		it('sorts by title by default', async () => {
			const result = await service.searchCourses({});
			const titles = result.items.map((c) => c.title);
			const sortedTitles = [...titles].sort((a, b) => a.localeCompare(b));
			expect(titles).toEqual(sortedTitles);
		});

		it('sorts by createdAt', async () => {
			const result = await service.searchCourses({ sort: 'createdAt' });
			const dates = result.items.map((c) => new Date(c.createdAt).getTime());
			const sortedDates = [...dates].sort((a, b) => a - b);
			expect(dates).toEqual(sortedDates);
		});
	});
});
