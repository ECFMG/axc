import type { Course, CourseModality, CourseStatus } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory } from './index.ts';

describe('course search', () => {
	it('returns the first page sorted by title by default', async () => {
		const result = await search(letteredCourses(12), {});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.value.page).toBe(1);
		expect(result.value.pageSize).toBe(10);
		expect(result.value.totalItems).toBe(12);
		expect(result.value.totalPages).toBe(2);
		expect(result.value.items.map((course) => course.title)).toEqual(['Course A', 'Course B', 'Course C', 'Course D', 'Course E', 'Course F', 'Course G', 'Course H', 'Course I', 'Course J']);
	});

	it('returns a later page', async () => {
		const result = await search(letteredCourses(12), { page: '2', pageSize: '5' });

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.value.items.map((course) => course.id)).toEqual(['course-6', 'course-7', 'course-8', 'course-9', 'course-10']);
		expect(result.value.totalItems).toBe(12);
		expect(result.value.totalPages).toBe(3);
	});

	it('matches a keyword in title, summary, or tags regardless of case', async () => {
		const result = await search(
			[course('title', 'Security Basics'), course('summary', 'Operations', { summary: 'Covers SECURITY reviews' }), course('tag', 'Lab', { tags: ['Security'] }), course('other', 'Cooking', { tags: ['food'] })],
			{ q: 'security' },
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.value.items.map((item) => item.id)).toEqual(['tag', 'summary', 'title']);
	});

	it('filters by modality, status, and tag', async () => {
		const courses = [
			course('online-active', 'Online Active', { tags: ['ai'] }),
			course('room', 'Room', { modality: 'in-person', tags: ['ai'] }),
			course('draft', 'Draft', { status: 'draft', tags: ['ai'] }),
			course('email', 'Email', { tags: ['email'] }),
		];

		const modality = await search(courses, { modality: 'online' });
		const status = await search(courses, { status: 'active' });
		const tag = await search(courses, { tag: 'AI' });

		expect(ids(modality)).toEqual(['draft', 'email', 'online-active']);
		expect(ids(status)).toEqual(['email', 'online-active', 'room']);
		expect(ids(tag)).toEqual(['draft', 'online-active', 'room']);
	});

	it('combines keyword, modality, and status', async () => {
		const result = await search(
			[course('match', 'AI Security Foundations', { status: 'active' }), course('draft', 'Security Draft', { status: 'draft' }), course('room', 'Security Lab', { modality: 'in-person' }), course('other', 'Privacy Engineering')],
			{ q: 'security', modality: 'online', status: 'active' },
		);

		expect(ids(result)).toEqual(['match']);
	});

	it('sorts by createdAt and updatedAt', async () => {
		const courses = [
			course('later', 'Alpha', { createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }),
			course('earlier', 'Zulu', { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z' }),
		];

		expect(ids(await search(courses, { sort: 'createdAt' }))).toEqual(['earlier', 'later']);
		expect(ids(await search(courses, { sort: 'updatedAt' }))).toEqual(['later', 'earlier']);
	});

	it('returns an empty page when nothing matches', async () => {
		const result = await search([course('one', 'Alpha')], { q: 'missing', page: '4' });

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.value.items).toEqual([]);
		expect(result.value.page).toBe(4);
		expect(result.value.totalItems).toBe(0);
		expect(result.value.totalPages).toBe(0);
	});

	it('rejects invalid modality, status, page, pageSize, and sort', async () => {
		const result = await search([course('one', 'Alpha')], { modality: 'remote', status: 'published', page: '0', pageSize: '51', sort: 'popularity' });

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(result.error.message).toBe('One or more query parameters are invalid.');
		expect(result.error.details).toEqual([
			{ field: 'modality', message: 'modality must be online, in-person, or hybrid.' },
			{ field: 'status', message: 'status must be draft, active, or retired.' },
			{ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' },
			{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
			{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
		]);
	});

	it('accepts pageSize 50 and rejects pageSize 0', async () => {
		const accepted = await search([course('one', 'Alpha')], { pageSize: '50' });
		const rejected = await search([course('one', 'Alpha')], { pageSize: '0' });

		expect(accepted.ok).toBe(true);
		if (accepted.ok) {
			expect(accepted.value.pageSize).toBe(50);
		}
		expect(rejected.ok).toBe(false);
		if (!rejected.ok) {
			expect(rejected.error.details).toEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
		}
	});
});

function ids(result: Awaited<ReturnType<typeof search>>): string[] {
	return result.ok ? result.value.items.map((course) => course.id) : [];
}

async function search(courses: Course[], query: Record<string, string | undefined>) {
	const services = await buildApplicationServicesFactory(
		{ environment: 'test' },
		{
			courses: {
				getById(id: string) {
					return Promise.resolve(courses.find((course) => course.id === id));
				},
				list() {
					return Promise.resolve(courses);
				},
			},
			enrollmentRequests: {
				getById() {
					return Promise.resolve(undefined);
				},
				list() {
					return Promise.resolve([]);
				},
				add() {
					return Promise.resolve();
				},
				save() {
					return Promise.resolve();
				},
			},
		},
	).forRequest();
	return services.courses.search(query);
}

function letteredCourses(count: number): Course[] {
	return Array.from({ length: count }, (_, index) => course(`course-${index + 1}`, `Course ${String.fromCharCode(65 + index)}`));
}

function course(id: string, title: string, extra?: { summary?: string; modality?: CourseModality; status?: CourseStatus; tags?: string[]; createdAt?: string; updatedAt?: string }): Course {
	return {
		id,
		title,
		summary: extra?.summary ?? 'Summary',
		modality: extra?.modality ?? 'online',
		status: extra?.status ?? 'active',
		tags: extra?.tags ?? ['general'],
		createdAt: extra?.createdAt ?? '2026-01-01T00:00:00.000Z',
		updatedAt: extra?.updatedAt ?? '2026-02-01T00:00:00.000Z',
	};
}
