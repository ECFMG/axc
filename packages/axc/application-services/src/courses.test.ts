import { createCourseCatalog } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { type CourseQueryInput, searchCourses } from './courses.ts';
import { buildApplicationServicesFactory } from './index.ts';

const courses = createCourseCatalog().listCourses();

const titleOrder = ['course-002', 'course-001', 'course-003', 'course-004', 'course-005', 'course-006', 'course-007', 'course-008', 'course-009', 'course-010', 'course-011', 'course-012', 'course-013'];
const createdAtOrder = ['course-010', 'course-008', 'course-005', 'course-001', 'course-004', 'course-002', 'course-009', 'course-003', 'course-012', 'course-006', 'course-013', 'course-007', 'course-011'];

describe('course catalog search', () => {
	it('seeds a mixed catalog of at least 12 courses', () => {
		expect(courses.length).toBeGreaterThanOrEqual(12);
		expect(new Set(courses.map((course) => course.modality)).size).toBe(3);
		expect(new Set(courses.map((course) => course.status)).size).toBe(3);
		expect(courses.flatMap((course) => course.tags).length).toBeGreaterThan(courses.length);
	});

	it('returns the first page sorted by title', () => {
		const page = expectPage({});

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(courses.length);
		expect(page.totalPages).toBe(2);
		expect(page.items.map((item) => item.id)).toEqual(titleOrder.slice(0, 10));
	});

	it('matches keyword search across title, summary, and tags regardless of case', () => {
		expect(ids({ q: ['security'] })).toEqual(['course-001', 'course-004', 'course-005', 'course-013']);
		expect(ids({ q: ['SECURITY'] })).toEqual(ids({ q: ['security'] }));
		expect(ids({ q: ['Accessibility'] })).toEqual(['course-002']);
		expect(ids({ q: ['baselines'] })).toEqual(['course-004']);
		expect(ids({ q: ['catalog-only'] })).toEqual(['course-008']);
	});

	it('filters by modality, status, and tag', () => {
		expect(ids({ modality: ['online'] })).toEqual(['course-002', 'course-001', 'course-004', 'course-010', 'course-011']);
		expect(ids({ modality: ['in-person'] })).toEqual(['course-003', 'course-007', 'course-008', 'course-013']);
		expect(ids({ modality: ['hybrid'] })).toEqual(['course-005', 'course-006', 'course-009', 'course-012']);
		expect(ids({ status: ['active'] })).toHaveLength(7);
		expect(ids({ status: ['draft'] })).toEqual(['course-006', 'course-007', 'course-011']);
		expect(ids({ status: ['retired'] })).toEqual(['course-005', 'course-008', 'course-010']);
		expect(ids({ tag: ['ai'] })).toEqual(['course-001', 'course-009', 'course-012']);
		expect(ids({ tag: ['AI'] })).toEqual(ids({ tag: ['ai'] }));
		expect(ids({ tag: ['sec'] })).toEqual([]);
	});

	it('combines keyword, modality, and status filters', () => {
		const page = expectPage({ q: ['security'], modality: ['online'], status: ['active'], tag: ['ai'], page: ['1'], pageSize: ['5'], sort: ['title'] });

		expect(page).toMatchObject({ page: 1, pageSize: 5, totalItems: 1, totalPages: 1 });
		expect(page.items).toEqual([
			{
				id: 'course-001',
				title: 'AI Security Foundations',
				summary: 'Introductory course on secure AI-assisted development.',
				modality: 'online',
				status: 'active',
				tags: ['ai', 'security'],
				createdAt: '2026-01-15T00:00:00.000Z',
				updatedAt: '2026-06-01T00:00:00.000Z',
			},
		]);
	});

	it('paginates and sorts by createdAt and updatedAt', () => {
		const page = expectPage({ page: ['2'], pageSize: ['5'], sort: ['title'] });

		expect(page.items.map((item) => item.id)).toEqual(['course-006', 'course-007', 'course-008', 'course-009', 'course-010']);
		expect(page).toMatchObject({ page: 2, pageSize: 5, totalItems: courses.length, totalPages: 3 });
		expect(ids({ sort: ['createdAt'], pageSize: ['50'] })).toEqual(createdAtOrder);
		expect(ids({ sort: ['updatedAt'], pageSize: ['50'] })[0]).toBe('course-010');
		expect(ids({ sort: ['title'], pageSize: ['50'] })).toEqual(titleOrder);
		expect(expectPage({ page: ['4'], pageSize: ['5'] }).items).toEqual([]);
	});

	it('rejects invalid query parameters', () => {
		expect(invalid({ modality: ['classroom'] }).details).toEqual([{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' }]);
		expect(invalid({ status: ['published'] }).details).toEqual([{ field: 'status', message: 'status must be one of draft, active, retired.' }]);
		expect(invalid({ page: ['0'] }).details).toEqual([{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }]);
		expect(invalid({ page: ['-1'] }).details[0]?.field).toBe('page');
		expect(invalid({ page: ['1.5'] }).details[0]?.field).toBe('page');
		expect(invalid({ page: ['abc'] }).details[0]?.field).toBe('page');
		expect(invalid({ pageSize: ['51'] }).details).toEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
		expect(invalid({ pageSize: ['0'] }).details[0]?.field).toBe('pageSize');
		expect(invalid({ sort: ['name'] }).details).toEqual([{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' }]);
		expect(invalid({ sort: ['TITLE'] }).details[0]?.field).toBe('sort');
		expect(invalid({ page: ['1', '2'] }).details).toEqual([{ field: 'page', message: 'page must be provided once.' }]);
		expect(invalid({ extra: ['1'] }).details).toEqual([{ field: 'extra', message: 'extra is not a supported query parameter.' }]);
		expect(invalid({ modality: ['nope'], pageSize: ['0'], extra: ['1'] }).details.map((detail) => detail.field)).toEqual(['modality', 'pageSize', 'extra']);
	});

	it('returns an empty page when nothing matches', () => {
		expect(expectPage({ q: ['zzzz-not-a-course'] })).toMatchObject({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('serves the seeded catalog from application services', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
		const outcome = services.courses.search({});

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) {
			return;
		}
		expect(outcome.page.totalItems).toBeGreaterThanOrEqual(12);
	});
});

function expectPage(query: CourseQueryInput) {
	const outcome = searchCourses(courses, query);
	if (!outcome.ok) {
		throw new Error(`expected courses but received ${JSON.stringify(outcome.error)}`);
	}
	return outcome.page;
}

function ids(query: CourseQueryInput): string[] {
	return expectPage(query).items.map((item) => item.id);
}

function invalid(query: CourseQueryInput) {
	const outcome = searchCourses(courses, query);
	if (outcome.ok) {
		throw new Error('expected an invalid query parameter error');
	}
	expect(outcome.error.code).toBe('INVALID_QUERY_PARAMETER');
	expect(outcome.error.message).toBe('One or more query parameters are invalid.');
	return outcome.error;
}
