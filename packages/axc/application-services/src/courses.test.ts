import { type Course, type CourseCatalog, courseCatalogSeed } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, type CoursePage, type CourseQueryParameters, type CourseSearchResult, type InvalidCourseQuery } from './index.ts';

const invalidParameters: Array<[string, string[], string]> = [
	['modality', ['ONLINE'], 'modality must be online, in-person, or hybrid.'],
	['modality', ['remote'], 'modality must be online, in-person, or hybrid.'],
	['status', ['published'], 'status must be draft, active, or retired.'],
	['page', ['0'], 'page must be an integer greater than or equal to 1.'],
	['page', ['-1'], 'page must be an integer greater than or equal to 1.'],
	['page', ['abc'], 'page must be an integer greater than or equal to 1.'],
	['page', ['1.5'], 'page must be an integer greater than or equal to 1.'],
	['pageSize', ['0'], 'pageSize must be between 1 and 50.'],
	['pageSize', ['51'], 'pageSize must be between 1 and 50.'],
	['pageSize', ['10.5'], 'pageSize must be between 1 and 50.'],
	['sort', ['name'], 'sort must be title, createdAt, or updatedAt.'],
	['sort', ['Title'], 'sort must be title, createdAt, or updatedAt.'],
];

describe('course catalog search', () => {
	it('returns the first page sorted by title', async () => {
		const page = pageOf(await search({}));

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(2);
		expect(titles(page)).toEqual([
			'AI Product Studio',
			'AI Security Foundations',
			'Classroom Facilitation',
			'Data Privacy Overview',
			'Draft Curriculum Design',
			'Hybrid Delivery Lab',
			'In-Person Coaching',
			'Platform Operations',
			'Retired Archive Methods',
			'Security Coding Workshop',
		]);
	});

	it('matches the documented search example', async () => {
		const page = pageOf(
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

		expect(page).toEqual({
			items: [
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
			],
			page: 1,
			pageSize: 5,
			totalItems: 1,
			totalPages: 1,
		});
	});

	it('searches title, summary, and tags regardless of case', async () => {
		const page = pageOf(await search({ q: ['SECURITY'] }));

		expect(titles(page)).toEqual(['AI Security Foundations', 'Data Privacy Overview', 'Platform Operations', 'Security Coding Workshop', 'Security Operations Center']);
		expect(page.items.find((course) => course.id === 'course-003')?.summary.toLowerCase()).toContain('security');
		expect(page.items.find((course) => course.id === 'course-004')?.tags).toEqual(['Security']);
	});

	it('filters by modality, status, and tag', async () => {
		expect(titles(pageOf(await search({ modality: [' online '] })))).toEqual(['AI Security Foundations', 'Draft Curriculum Design', 'Platform Operations', 'Security Operations Center']);
		expect(titles(pageOf(await search({ status: ['active'] })))).toEqual(['AI Product Studio', 'AI Security Foundations', 'Hybrid Delivery Lab', 'In-Person Coaching', 'Security Coding Workshop']);
		expect(titles(pageOf(await search({ tag: ['AI'] })))).toEqual(['AI Product Studio', 'AI Security Foundations']);
		expect(pageOf(await search({ tag: ['sec'] })).totalItems).toBe(0);
	});

	it('combines keyword, modality, and status', async () => {
		expect(titles(pageOf(await search({ q: ['security'], modality: ['online'], status: ['draft'] })))).toEqual(['Security Operations Center']);
		expect(titles(pageOf(await search({ modality: ['in-person'], status: ['draft'] })))).toEqual(['Classroom Facilitation']);
	});

	it('paginates and reports a page past the end', async () => {
		const page = pageOf(await search({ page: ['2'], pageSize: ['5'] }));

		expect(page.page).toBe(2);
		expect(page.pageSize).toBe(5);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(3);
		expect(titles(page)).toEqual(['Hybrid Delivery Lab', 'In-Person Coaching', 'Platform Operations', 'Retired Archive Methods', 'Security Coding Workshop']);

		const pastTheEnd = pageOf(await search({ page: ['3'], pageSize: ['10'] }));
		expect(pastTheEnd.items).toEqual([]);
		expect(pastTheEnd.page).toBe(3);
		expect(pastTheEnd.totalItems).toBe(12);
		expect(pastTheEnd.totalPages).toBe(2);
	});

	it('accepts the maximum page size', async () => {
		const page = pageOf(await search({ pageSize: ['50'] }));

		expect(page.pageSize).toBe(50);
		expect(page.items).toHaveLength(12);
		expect(page.totalPages).toBe(1);
	});

	it('sorts by createdAt and updatedAt', async () => {
		expect(titles(pageOf(await search({ sort: ['createdAt'] })))[0]).toBe('Zebra Onboarding');
		expect(titles(pageOf(await search({ sort: ['updatedAt'] })))[0]).toBe('Draft Curriculum Design');
		expect(titles(pageOf(await search({ sort: ['title'] })))[0]).toBe('AI Product Studio');
	});

	it('breaks title ties by id', async () => {
		const tied: readonly Course[] = [
			{
				id: 'course-b',
				title: 'Same Title',
				summary: 'Second',
				modality: 'online',
				status: 'active',
				tags: ['one'],
				createdAt: '2026-01-02T00:00:00.000Z',
				updatedAt: '2026-01-02T00:00:00.000Z',
			},
			{
				id: 'course-a',
				title: 'Same Title',
				summary: 'First',
				modality: 'online',
				status: 'active',
				tags: ['one'],
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-03T00:00:00.000Z',
			},
		];
		const services = await buildApplicationServicesFactory({ environment: 'test', courses: catalogOf(tied) }).forRequest();
		const page = pageOf(await services.courses.search({ sort: ['title'] }));

		expect(page.items.map((course) => course.id)).toEqual(['course-a', 'course-b']);
	});

	it('returns an empty page when nothing matches', async () => {
		const page = pageOf(await search({ q: ['not-a-course-xyz'] }));

		expect(page.items).toEqual([]);
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(0);
		expect(page.totalPages).toBe(0);
	});

	it('ignores a blank keyword', async () => {
		expect(pageOf(await search({ q: ['   '] })).totalItems).toBe(12);
	});

	it.each(invalidParameters)('rejects invalid %s', async (field, values, message) => {
		const error = errorOf(await search({ [field]: values }));

		expect(error).toEqual({
			code: 'INVALID_QUERY_PARAMETER',
			message: 'One or more query parameters are invalid.',
			details: [{ field, message }],
		});
	});

	it('rejects repeated and unknown parameters together', async () => {
		const error = errorOf(await search({ limit: ['10'], pageSize: ['10', '20'], modality: ['remote'] }));

		expect(error.details).toEqual([
			{ field: 'limit', message: 'Query parameter is not supported.' },
			{ field: 'modality', message: 'modality must be online, in-person, or hybrid.' },
			{ field: 'pageSize', message: 'Query parameter must be provided at most once.' },
		]);
	});
});

async function search(parameters: CourseQueryParameters): Promise<CourseSearchResult> {
	const services = await buildApplicationServicesFactory({
		environment: 'test',
		courses: catalogOf(courseCatalogSeed),
	}).forRequest();
	return services.courses.search(parameters);
}

function catalogOf(courses: readonly Course[]): CourseCatalog {
	return {
		listCourses(): Promise<readonly Course[]> {
			return Promise.resolve(courses.map((course) => ({ ...course, tags: [...course.tags] })));
		},
	};
}

function pageOf(result: CourseSearchResult): CoursePage {
	if (!result.ok) {
		throw new Error(`expected courses, received ${JSON.stringify(result.error)}`);
	}
	return result.page;
}

function errorOf(result: CourseSearchResult): InvalidCourseQuery {
	if (result.ok) {
		throw new Error('expected an invalid query error');
	}
	return result.error;
}

function titles(page: CoursePage): string[] {
	return page.items.map((course) => course.title);
}
