import type { Course, CourseCatalog } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, type CoursePage, type CourseQueryError, type CourseSearchQuery, type CourseSearchResult } from './index.ts';

const securityCourse: Course = {
	id: 'course-001',
	title: 'AI Security Foundations',
	summary: 'Introductory course on secure AI-assisted development.',
	modality: 'online',
	status: 'active',
	tags: ['ai', 'security'],
	createdAt: '2026-01-15T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z',
};

const fixture: readonly Course[] = [
	securityCourse,
	{
		id: 'course-002',
		title: 'Workshop for Teams',
		summary: 'Hands-on practice covering SECURITY reviews.',
		modality: 'in-person',
		status: 'active',
		tags: ['workshop'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-02T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Platform Operations',
		summary: 'Run hybrid platforms.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['Security'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-07-01T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Accessibility Basics',
		summary: 'Design courses that include every learner.',
		modality: 'online',
		status: 'retired',
		tags: ['accessibility'],
		createdAt: '2022-01-01T00:00:00.000Z',
		updatedAt: '2022-02-01T00:00:00.000Z',
	},
];

const catalog: CourseCatalog = {
	listCourses() {
		return Promise.resolve(fixture);
	},
};

function query(overrides: Partial<CourseSearchQuery> = {}): CourseSearchQuery {
	return {
		q: overrides.q,
		modality: overrides.modality,
		status: overrides.status,
		tag: overrides.tag,
		page: overrides.page,
		pageSize: overrides.pageSize,
		sort: overrides.sort,
	};
}

async function search(overrides: Partial<CourseSearchQuery> = {}): Promise<CourseSearchResult> {
	const services = await buildApplicationServicesFactory({ environment: 'test', courseCatalog: catalog }).forRequest();
	return services.courses.search(query(overrides));
}

function pageOf(result: CourseSearchResult): CoursePage {
	if (!result.ok) {
		throw new Error(`expected a course page, received ${JSON.stringify(result.error)}`);
	}
	return result.body;
}

function errorOf(result: CourseSearchResult): CourseQueryError {
	if (result.ok) {
		throw new Error('expected a query error');
	}
	return result.error;
}

function ids(body: CoursePage): string[] {
	return body.items.map((course) => course.id);
}

describe('course catalog search', () => {
	it('returns the first page sorted by title with default page and page size', async () => {
		const body = pageOf(await search());

		expect(ids(body)).toEqual(['course-004', 'course-001', 'course-003', 'course-002']);
		expect(body.page).toBe(1);
		expect(body.pageSize).toBe(10);
		expect(body.totalItems).toBe(4);
		expect(body.totalPages).toBe(1);
	});

	it('matches a keyword across title, summary, and tags regardless of case', async () => {
		const lower = pageOf(await search({ q: ['security'] }));
		const upper = pageOf(await search({ q: ['SECURITY'] }));

		expect(ids(lower)).toEqual(['course-001', 'course-003', 'course-002']);
		expect(ids(upper)).toEqual(ids(lower));
	});

	it('does not treat modality or status text as a keyword', async () => {
		expect(ids(pageOf(await search({ q: ['online'] })))).toEqual([]);
		expect(ids(pageOf(await search({ q: ['retired'] })))).toEqual([]);
	});

	it('filters by modality, status, and tag', async () => {
		expect(ids(pageOf(await search({ modality: ['online'] })))).toEqual(['course-004', 'course-001']);
		expect(ids(pageOf(await search({ status: ['active'] })))).toEqual(['course-001', 'course-002']);
		expect(ids(pageOf(await search({ tag: ['AI'] })))).toEqual(['course-001']);
		expect(ids(pageOf(await search({ tag: ['security'] })))).toEqual(['course-001', 'course-003']);
		expect(ids(pageOf(await search({ tag: ['sec'] })))).toEqual([]);
	});

	it('combines keyword, modality, and status filters', async () => {
		const body = pageOf(
			await search({
				q: ['security'],
				modality: ['online'],
				status: ['active'],
				tag: ['ai'],
				page: ['1'],
				pageSize: ['5'],
				sort: ['title'],
			}),
		);

		expect(body).toEqual({
			items: [securityCourse],
			page: 1,
			pageSize: 5,
			totalItems: 1,
			totalPages: 1,
		});
	});

	it('paginates after filters and sorting', async () => {
		const body = pageOf(await search({ page: ['2'], pageSize: ['1'], sort: ['title'] }));

		expect(ids(body)).toEqual(['course-001']);
		expect(body.page).toBe(2);
		expect(body.pageSize).toBe(1);
		expect(body.totalItems).toBe(4);
		expect(body.totalPages).toBe(4);
	});

	it('accepts the maximum page size and echoes an empty later page', async () => {
		const first = pageOf(await search({ pageSize: ['50'] }));
		expect(first.pageSize).toBe(50);
		expect(first.items).toHaveLength(4);
		expect(first.totalPages).toBe(1);

		const beyond = pageOf(await search({ page: ['3'], pageSize: ['2'] }));
		expect(ids(beyond)).toEqual([]);
		expect(beyond.page).toBe(3);
		expect(beyond.pageSize).toBe(2);
		expect(beyond.totalItems).toBe(4);
		expect(beyond.totalPages).toBe(2);
	});

	it('sorts by title, createdAt, and updatedAt', async () => {
		expect(ids(pageOf(await search({ sort: ['title'] })))).toEqual(['course-004', 'course-001', 'course-003', 'course-002']);
		expect(ids(pageOf(await search({ sort: ['createdAt'] })))).toEqual(['course-004', 'course-001', 'course-002', 'course-003']);
		expect(ids(pageOf(await search({ sort: ['updatedAt'] })))).toEqual(['course-004', 'course-002', 'course-001', 'course-003']);
	});

	it('keeps the default title order after another sort', async () => {
		await search({ sort: ['createdAt'] });
		expect(ids(pageOf(await search()))).toEqual(['course-004', 'course-001', 'course-003', 'course-002']);
	});

	it('returns an empty page when nothing matches', async () => {
		const body = pageOf(await search({ q: ['zzzz-no-such-course'] }));

		expect(ids(body)).toEqual([]);
		expect(body.page).toBe(1);
		expect(body.pageSize).toBe(10);
		expect(body.totalItems).toBe(0);
		expect(body.totalPages).toBe(0);
	});

	it('rejects invalid modality, status, page, pageSize, and sort values', async () => {
		expect(errorOf(await search({ modality: ['classroom'] }))).toEqual(invalid('modality', 'modality must be online, in-person, or hybrid.'));
		expect(errorOf(await search({ modality: ['Online'] }))).toEqual(invalid('modality', 'modality must be online, in-person, or hybrid.'));
		expect(errorOf(await search({ status: ['published'] }))).toEqual(invalid('status', 'status must be draft, active, or retired.'));
		expect(errorOf(await search({ status: ['Active'] }))).toEqual(invalid('status', 'status must be draft, active, or retired.'));
		expect(errorOf(await search({ page: ['0'] }))).toEqual(invalid('page', 'page must be an integer greater than or equal to 1.'));
		expect(errorOf(await search({ page: ['foo'] }))).toEqual(invalid('page', 'page must be an integer greater than or equal to 1.'));
		expect(errorOf(await search({ pageSize: ['0'] }))).toEqual(invalid('pageSize', 'pageSize must be between 1 and 50.'));
		expect(errorOf(await search({ pageSize: ['51'] }))).toEqual(invalid('pageSize', 'pageSize must be between 1 and 50.'));
		expect(errorOf(await search({ pageSize: ['10.5'] }))).toEqual(invalid('pageSize', 'pageSize must be between 1 and 50.'));
		expect(errorOf(await search({ sort: ['popularity'] }))).toEqual(invalid('sort', 'sort must be title, createdAt, or updatedAt.'));
		expect(errorOf(await search({ sort: ['Title'] }))).toEqual(invalid('sort', 'sort must be title, createdAt, or updatedAt.'));
	});

	it('rejects duplicate and empty parameters', async () => {
		expect(errorOf(await search({ modality: ['online', 'hybrid'] }))).toEqual(invalid('modality', 'modality must be provided once.'));
		expect(errorOf(await search({ tag: [''] }))).toEqual(invalid('tag', 'tag must be a non-empty string.'));
	});

	it('reports every invalid parameter together', async () => {
		expect(errorOf(await search({ modality: ['classroom'], pageSize: ['51'], sort: ['popularity'] }))).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [
					{ field: 'modality', message: 'modality must be online, in-person, or hybrid.' },
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
					{ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' },
				],
			},
		});
	});
});

function invalid(field: string, message: string): CourseQueryError {
	return {
		error: {
			code: 'INVALID_QUERY_PARAMETER',
			message: 'One or more query parameters are invalid.',
			details: [{ field, message }],
		},
	};
}
