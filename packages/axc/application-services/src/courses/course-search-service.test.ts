import { type Course, type CourseReadRepository, type CourseSearchCriteria, searchCourses } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import type { CourseSearchQueryInput } from './course-search-query.ts';
import { buildCourseSearchApplicationService, type CourseSearchOutcome } from './course-search-service.ts';

const catalog: readonly Course[] = [
	{
		id: 'c-1',
		title: 'AI Security Foundations',
		summary: 'Secure AI-assisted development.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'security'],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
	},
	{
		id: 'c-2',
		title: 'Legacy Modernization',
		summary: 'Replace monoliths incrementally.',
		modality: 'in-person',
		status: 'retired',
		tags: ['architecture'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-02T00:00:00.000Z',
	},
	{ id: 'c-3', title: 'Threat Modeling', summary: 'Prioritise security controls.', modality: 'online', status: 'active', tags: ['security'], createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-02T00:00:00.000Z' },
	{ id: 'c-4', title: 'Prompt Engineering', summary: 'Shared prompting practices.', modality: 'hybrid', status: 'draft', tags: ['ai'], createdAt: '2026-04-01T00:00:00.000Z', updatedAt: '2026-01-15T00:00:00.000Z' },
];

const repository: CourseReadRepository = { search: (criteria) => Promise.resolve(searchCourses(catalog, criteria)) };
const service = buildCourseSearchApplicationService(repository);

/** Captures the criteria the service resolved, so default handling can be asserted directly. */
function recordingService(): { criteria: () => CourseSearchCriteria | undefined; search: (input: CourseSearchQueryInput) => Promise<CourseSearchOutcome> } {
	let seen: CourseSearchCriteria | undefined;
	const recording = buildCourseSearchApplicationService({
		search: (criteria) => {
			seen = criteria;
			return Promise.resolve(searchCourses(catalog, criteria));
		},
	});
	return { criteria: () => seen, search: (input) => recording.search(input) };
}

function foundPage(outcome: CourseSearchOutcome) {
	if (outcome.outcome !== 'found') {
		throw new Error(`expected a page of courses, got ${JSON.stringify(outcome)}`);
	}
	return outcome.page;
}

function invalidErrors(outcome: CourseSearchOutcome) {
	if (outcome.outcome !== 'invalid-query') {
		throw new Error(`expected an invalid query, got ${JSON.stringify(outcome)}`);
	}
	return outcome.errors;
}

describe('course search: success path', () => {
	it('applies default page, page size, and sort when no parameters are supplied', async () => {
		const recorder = recordingService();
		const page = foundPage(await recorder.search({}));

		expect(recorder.criteria()).toMatchObject({ page: 1, pageSize: 10, sort: 'title' });
		expect(page).toMatchObject({ page: 1, pageSize: 10, totalItems: 4, totalPages: 1 });
		expect(page.items.map((course) => course.id)).toStrictEqual(['c-1', 'c-2', 'c-4', 'c-3']);
	});

	it('returns an empty page with valid metadata when nothing matches', async () => {
		const page = foundPage(await service.search({ q: 'quantum basket weaving' }));

		expect(page.items).toStrictEqual([]);
		expect(page).toMatchObject({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
});

describe('course search: filters', () => {
	it('searches the keyword case-insensitively across title, summary, and tags', async () => {
		expect(foundPage(await service.search({ q: 'SECURITY' })).items.map((course) => course.id)).toStrictEqual(['c-1', 'c-3']);
	});

	it('filters by modality', async () => {
		expect(foundPage(await service.search({ modality: 'hybrid' })).items.map((course) => course.id)).toStrictEqual(['c-4']);
	});

	it('filters by status', async () => {
		expect(foundPage(await service.search({ status: 'retired' })).items.map((course) => course.id)).toStrictEqual(['c-2']);
	});

	it('filters by tag case-insensitively', async () => {
		expect(foundPage(await service.search({ tag: 'AI' })).items.map((course) => course.id)).toStrictEqual(['c-1', 'c-4']);
	});

	it('combines q, modality, and status', async () => {
		expect(foundPage(await service.search({ q: 'security', modality: 'online', status: 'active' })).items.map((course) => course.id)).toStrictEqual(['c-1', 'c-3']);
	});

	it('ignores blank q and tag values instead of rejecting them', async () => {
		const recorder = recordingService();
		await recorder.search({ q: '   ', tag: '' });

		expect(recorder.criteria()).toMatchObject({ keyword: undefined, tag: undefined });
	});
});

describe('course search: pagination and sorting', () => {
	it('honours page and pageSize', async () => {
		const page = foundPage(await service.search({ page: '2', pageSize: '3' }));

		expect(page.items.map((course) => course.id)).toStrictEqual(['c-3']);
		expect(page).toMatchObject({ page: 2, pageSize: 3, totalItems: 4, totalPages: 2 });
	});

	it('accepts the maximum page size', async () => {
		expect(foundPage(await service.search({ pageSize: '50' })).pageSize).toBe(50);
	});

	it('sorts by createdAt', async () => {
		expect(foundPage(await service.search({ sort: 'createdAt' })).items.map((course) => course.id)).toStrictEqual(['c-1', 'c-2', 'c-3', 'c-4']);
	});

	it('sorts by updatedAt', async () => {
		expect(foundPage(await service.search({ sort: 'updatedAt' })).items.map((course) => course.id)).toStrictEqual(['c-4', 'c-2', 'c-3', 'c-1']);
	});
});

describe('course search: validation', () => {
	it('rejects an unknown modality', async () => {
		expect(invalidErrors(await service.search({ modality: 'remote' }))).toStrictEqual([{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' }]);
	});

	it('rejects an unknown status', async () => {
		expect(invalidErrors(await service.search({ status: 'archived' }))).toStrictEqual([{ field: 'status', message: 'status must be one of draft, active, retired.' }]);
	});

	it('rejects an unknown sort field', async () => {
		expect(invalidErrors(await service.search({ sort: 'relevance' }))).toStrictEqual([{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' }]);
	});

	it.each(['0', '-1', 'two', '1.5'])('rejects page value %s', async (page) => {
		expect(invalidErrors(await service.search({ page }))).toStrictEqual([{ field: 'page', message: 'page must be an integer of 1 or greater.' }]);
	});

	it.each(['0', '51', 'ten', '-5'])('rejects pageSize value %s', async (pageSize) => {
		expect(invalidErrors(await service.search({ pageSize }))).toStrictEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
	});

	it('reports every invalid parameter in one response', async () => {
		const errors = invalidErrors(await service.search({ modality: 'remote', status: 'archived', page: '0', pageSize: '99', sort: 'relevance' }));

		expect(errors.map((error) => error.field)).toStrictEqual(['modality', 'status', 'page', 'pageSize', 'sort']);
	});

	it('does not reach the repository when the query is invalid', async () => {
		const unreachable: CourseReadRepository = {
			search: () => Promise.reject(new Error('repository must not be called for an invalid query')),
		};

		expect(invalidErrors(await buildCourseSearchApplicationService(unreachable).search({ sort: 'relevance' }))).toHaveLength(1);
	});
});
