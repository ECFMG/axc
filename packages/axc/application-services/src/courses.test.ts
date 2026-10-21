import type { Course, CourseCatalog } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { type CoursePage, type CourseQueryErrorBody, type CourseSearchOutcome, searchCourses } from './courses.ts';
import { buildApplicationServicesFactory } from './index.ts';

describe('course catalog search', () => {
	it('returns the first page of 10 courses sorted by title', () => {
		const page = expectPage(searchCourses(catalog(letteredCourses()), {}));

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(2);
		expect(titles(page)).toEqual(['Course A', 'Course B', 'Course C', 'Course D', 'Course E', 'Course F', 'Course G', 'Course H', 'Course I', 'Course J']);
	});

	it('paginates with page and pageSize', () => {
		const page = expectPage(searchCourses(catalog(letteredCourses()), { page: '2', pageSize: '5' }));

		expect(page.page).toBe(2);
		expect(page.pageSize).toBe(5);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(3);
		expect(titles(page)).toEqual(['Course F', 'Course G', 'Course H', 'Course I', 'Course J']);
	});

	it('accepts the maximum page size and rejects a larger one', () => {
		const page = expectPage(searchCourses(catalog(letteredCourses()), { pageSize: '50' }));
		expect(page.items).toHaveLength(12);
		expect(page.pageSize).toBe(50);
		expect(page.totalPages).toBe(1);

		const error = expectError(searchCourses(catalog(letteredCourses()), { pageSize: '51' }));
		expect(error).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }],
			},
		});
	});

	it('returns an empty page past the last result', () => {
		const page = expectPage(searchCourses(catalog(letteredCourses()), { page: '4', pageSize: '5' }));

		expect(page.items).toEqual([]);
		expect(page.page).toBe(4);
		expect(page.pageSize).toBe(5);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(3);
	});

	it('matches q across title, summary, and tags regardless of case', () => {
		const page = expectPage(searchCourses(catalog(sampleCourses()), { q: '  SECURITY  ' }));

		expect(titles(page)).toEqual(['Alpha Security', 'Beta Operations', 'Gamma Planning']);
	});

	it('filters by modality, status, and tag', () => {
		const courses = catalog(sampleCourses());

		expect(titles(expectPage(searchCourses(courses, { modality: 'online' })))).toEqual(['Alpha Security', 'Beta Operations']);
		expect(titles(expectPage(searchCourses(courses, { status: 'active' })))).toEqual(['Alpha Security', 'Gamma Planning']);
		expect(titles(expectPage(searchCourses(courses, { tag: 'AI' })))).toEqual(['Alpha Security', 'Delta Hybrid']);
		expect(titles(expectPage(searchCourses(courses, { tag: 'sec' })))).toEqual([]);
	});

	it('combines keyword, modality, and status filters', () => {
		const page = expectPage(searchCourses(catalog(sampleCourses()), { q: 'security', modality: 'online', status: 'active' }));

		expect(page.totalItems).toBe(1);
		expect(page.items[0]?.id).toBe('alpha');
	});

	it('sorts by createdAt and updatedAt', () => {
		const courses = catalog(sampleCourses());

		expect(titles(expectPage(searchCourses(courses, { sort: 'createdAt' })))).toEqual(['Gamma Planning', 'Alpha Security', 'Beta Operations', 'Delta Hybrid']);
		expect(titles(expectPage(searchCourses(courses, { sort: 'updatedAt' })))).toEqual(['Beta Operations', 'Delta Hybrid', 'Alpha Security', 'Gamma Planning']);
		expect(titles(expectPage(searchCourses(courses, { sort: 'title' })))).toEqual(['Alpha Security', 'Beta Operations', 'Delta Hybrid', 'Gamma Planning']);
	});

	it('returns an empty list when nothing matches', () => {
		const page = expectPage(searchCourses(catalog(sampleCourses()), { q: 'zzznomatch' }));

		expect(page.items).toEqual([]);
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(0);
		expect(page.totalPages).toBe(0);
	});

	it('rejects invalid modality, status, page, pageSize, and sort together', () => {
		const error = expectError(searchCourses(catalog(sampleCourses()), { modality: 'classroom', status: 'paused', page: '0', pageSize: '0', sort: 'rank' }));

		expect(error.error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(error.error.message).toBe('One or more query parameters are invalid.');
		expect(error.error.details).toEqual([
			{ field: 'modality', message: 'modality must be online, in-person, or hybrid.' },
			{ field: 'status', message: 'status must be draft, active, or retired.' },
			{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
			{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
			{ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' },
		]);
	});

	it('rejects a non-integer page', () => {
		const error = expectError(searchCourses(catalog(sampleCourses()), { page: '1.5' }));
		expect(error.error.details).toEqual([{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }]);
	});

	it('searches the catalog injected into the application service', async () => {
		const services = await buildApplicationServicesFactory({
			environment: 'test',
			courses: catalog([course('course-001', 'Alpha')]),
		}).forRequest();
		const page = expectPage(services.courses.search({}));

		expect(titles(page)).toEqual(['Alpha']);
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
	});
});

function catalog(courses: readonly Course[]): CourseCatalog {
	return { list: () => courses };
}

function expectPage(outcome: CourseSearchOutcome): CoursePage {
	expect(outcome.ok).toBe(true);
	if (!outcome.ok) {
		throw new Error('expected a course page');
	}
	return outcome.page;
}

function expectError(outcome: CourseSearchOutcome): CourseQueryErrorBody {
	expect(outcome.ok).toBe(false);
	if (outcome.ok) {
		throw new Error('expected a query error');
	}
	return outcome.error;
}

function titles(page: CoursePage): string[] {
	return page.items.map((item) => item.title);
}

function letteredCourses(): Course[] {
	const letters = 'ABCDEFGHIJKL';
	const modalities = ['online', 'in-person', 'hybrid'] as const;
	const statuses = ['active', 'draft', 'retired'] as const;
	return [...letters].map((letter, index) => {
		const day = String(12 - index).padStart(2, '0');
		const modality = modalities[index % 3] ?? 'online';
		const status = statuses[index % 3] ?? 'active';
		return course(`course-${letter}`, `Course ${letter}`, {
			modality,
			status,
			tags: [letter.toLowerCase()],
			createdAt: `2026-01-${day}T00:00:00.000Z`,
			updatedAt: `2026-04-${day}T00:00:00.000Z`,
		});
	});
}

function sampleCourses(): Course[] {
	return [
		course('alpha', 'Alpha Security', {
			summary: 'Introductory course.',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
			createdAt: '2026-02-01T00:00:00.000Z',
			updatedAt: '2026-05-01T00:00:00.000Z',
		}),
		course('beta', 'Beta Operations', {
			summary: 'A security review for operators.',
			modality: 'online',
			status: 'draft',
			tags: ['operations'],
			createdAt: '2026-03-01T00:00:00.000Z',
			updatedAt: '2026-03-01T00:00:00.000Z',
		}),
		course('gamma', 'Gamma Planning', {
			summary: 'Planning lab.',
			modality: 'in-person',
			status: 'active',
			tags: ['Security'],
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-06-01T00:00:00.000Z',
		}),
		course('delta', 'Delta Hybrid', {
			summary: 'Studio time.',
			modality: 'hybrid',
			status: 'retired',
			tags: ['AI'],
			createdAt: '2026-04-01T00:00:00.000Z',
			updatedAt: '2026-04-01T00:00:00.000Z',
		}),
	];
}

function course(
	id: string,
	title: string,
	fields?: {
		summary?: string;
		modality?: Course['modality'];
		status?: Course['status'];
		tags?: string[];
		createdAt?: string;
		updatedAt?: string;
	},
): Course {
	return {
		id,
		title,
		summary: fields?.summary ?? 'Summary',
		modality: fields?.modality ?? 'online',
		status: fields?.status ?? 'active',
		tags: fields?.tags ?? [],
		createdAt: fields?.createdAt ?? '2026-01-01T00:00:00.000Z',
		updatedAt: fields?.updatedAt ?? '2026-01-02T00:00:00.000Z',
	};
}
