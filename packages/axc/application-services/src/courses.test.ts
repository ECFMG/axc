import type { Course, CourseModality, CourseStatus } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory } from './index.ts';

const INVALID_QUERY_MESSAGE = 'One or more query parameters are invalid.';

describe('GET /api/courses search', () => {
	it('returns the first page sorted by title when no query is provided', async () => {
		const body = await pageOf(twelveCourses(), {});

		expect(body.page).toBe(1);
		expect(body.pageSize).toBe(10);
		expect(body.totalItems).toBe(12);
		expect(body.totalPages).toBe(2);
		expect(body.items).toHaveLength(10);
		expect(body.items.map((course) => course.title)).toEqual(['Title A', 'Title B', 'Title C', 'Title D', 'Title E', 'Title F', 'Title G', 'Title H', 'Title I', 'Title J']);
	});

	it('matches a keyword in the title, summary, or tags regardless of case', async () => {
		const body = await pageOf(filterCourses(), { q: ['SECURITY'] });
		const ids = body.items.map((course) => course.id);

		expect(ids).toEqual(['course-001', 'course-014', 'course-015']);
		expect(ids).not.toContain('course-009');
	});

	it('filters by modality, status, and tag', async () => {
		const courses = filterCourses();

		expect(idsOf(await pageOf(courses, { modality: ['online'] }))).toEqual(['course-001', 'course-010', 'course-016', 'course-014']);
		expect(idsOf(await pageOf(courses, { status: ['active'] }))).toEqual(['course-001', 'course-013', 'course-002', 'course-009']);
		expect(idsOf(await pageOf(courses, { tag: ['AI'] }))).toEqual(['course-001', 'course-013', 'course-010']);
		expect(idsOf(await pageOf(courses, { tag: ['ai-safety'] }))).toEqual(['course-016']);
	});

	it('combines keyword, modality, and status filters', async () => {
		const body = await pageOf(filterCourses(), { q: ['security'], modality: ['online'], status: ['active'] });

		expect(body.totalItems).toBe(1);
		expect(body.items[0]).toMatchObject({
			id: 'course-001',
			title: 'AI Security Foundations',
			summary: 'Introductory course on secure AI-assisted development.',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
			createdAt: '2026-01-15T00:00:00.000Z',
			updatedAt: '2026-06-01T00:00:00.000Z',
		});
	});

	it('paginates with page and pageSize and keeps metadata for an empty trailing page', async () => {
		const courses = twelveCourses();
		const second = await pageOf(courses, { page: ['2'], pageSize: ['5'] });
		const pastTheEnd = await pageOf(courses, { page: ['4'], pageSize: ['5'] });

		expect(second.page).toBe(2);
		expect(second.pageSize).toBe(5);
		expect(second.totalItems).toBe(12);
		expect(second.totalPages).toBe(3);
		expect(second.items.map((course) => course.title)).toEqual(['Title F', 'Title G', 'Title H', 'Title I', 'Title J']);
		expect(pastTheEnd.items).toEqual([]);
		expect(pastTheEnd.page).toBe(4);
		expect(pastTheEnd.totalItems).toBe(12);
		expect(pastTheEnd.totalPages).toBe(3);
	});

	it('accepts the maximum page size', async () => {
		const body = await pageOf(twelveCourses(), { pageSize: ['50'] });

		expect(body.pageSize).toBe(50);
		expect(body.items).toHaveLength(12);
		expect(body.totalPages).toBe(1);
	});

	it('sorts by title, createdAt, or updatedAt ascending, with id as a tie-break', async () => {
		const courses = [
			course({ id: 'course-b', title: 'Same Title', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z' }),
			course({ id: 'course-a', title: 'Same Title', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z' }),
			course({ id: 'course-c', title: 'Earlier Title', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' }),
		];

		expect(idsOf(await pageOf(courses, {}))).toEqual(['course-c', 'course-a', 'course-b']);
		expect(idsOf(await pageOf(courses, { sort: ['title'] }))).toEqual(['course-c', 'course-a', 'course-b']);
		expect(idsOf(await pageOf(courses, { sort: ['createdAt'] }))).toEqual(['course-a', 'course-b', 'course-c']);
		expect(idsOf(await pageOf(courses, { sort: ['updatedAt'] }))).toEqual(['course-c', 'course-a', 'course-b']);
	});

	it('returns an empty page when nothing matches', async () => {
		const body = await pageOf(filterCourses(), { q: ['zzznomatch'] });

		expect(body).toEqual({
			items: [],
			page: 1,
			pageSize: 10,
			totalItems: 0,
			totalPages: 0,
		});
	});

	it('ignores a blank keyword or tag and trims values', async () => {
		const courses = filterCourses();

		expect((await pageOf(courses, { q: ['  '] })).totalItems).toBe(courses.length);
		expect(idsOf(await pageOf(courses, { q: ['  security  '], modality: [' online '] }))).toEqual(['course-001', 'course-014']);
	});

	it('rejects invalid modality, status, page, pageSize, and sort values', async () => {
		const courses = filterCourses();

		expect(await errorOf(courses, { modality: ['classroom'] })).toEqual({
			code: 'INVALID_QUERY_PARAMETER',
			message: INVALID_QUERY_MESSAGE,
			details: [{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' }],
		});
		expect((await errorOf(courses, { status: ['published'] })).details).toEqual([{ field: 'status', message: 'status must be one of draft, active, retired.' }]);
		expect((await errorOf(courses, { page: ['0'] })).details).toEqual([{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }]);
		expect((await errorOf(courses, { page: ['-1'] })).details[0]?.field).toBe('page');
		expect((await errorOf(courses, { page: ['1.5'] })).details[0]?.field).toBe('page');
		expect((await errorOf(courses, { page: ['abc'] })).details[0]?.field).toBe('page');
		expect((await errorOf(courses, { pageSize: ['51'] })).details).toEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
		expect((await errorOf(courses, { pageSize: ['0'] })).details[0]?.field).toBe('pageSize');
		expect((await errorOf(courses, { pageSize: ['10.5'] })).details[0]?.field).toBe('pageSize');
		expect((await errorOf(courses, { sort: ['name'] })).details).toEqual([{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' }]);
		expect((await errorOf(courses, { sort: ['Title'] })).details[0]?.field).toBe('sort');
	});

	it('returns every invalid parameter in canonical field order', async () => {
		const error = await errorOf(filterCourses(), { pageSize: ['99'], modality: ['nope'], extra: ['1'], page: ['0'] });

		expect(error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(error.message).toBe(INVALID_QUERY_MESSAGE);
		expect(error.details.map((detail) => detail.field)).toEqual(['modality', 'page', 'pageSize', 'extra']);
	});

	it('rejects duplicate and unknown query parameters', async () => {
		expect((await errorOf(filterCourses(), { page: ['1', '2'] })).details).toEqual([{ field: 'page', message: 'page must be provided once.' }]);
		expect((await errorOf(filterCourses(), { limit: ['10'] })).details).toEqual([{ field: 'limit', message: 'Unknown query parameter.' }]);
	});
});

async function pageOf(courses: readonly Course[], query: Record<string, readonly string[]>) {
	const result = await search(courses, query);
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error('expected a course page');
	}
	return result.body;
}

async function errorOf(courses: readonly Course[], query: Record<string, readonly string[]>) {
	const result = await search(courses, query);
	expect(result.ok).toBe(false);
	if (result.ok) {
		throw new Error('expected an invalid query error');
	}
	return result.error;
}

function idsOf(body: { items: readonly { id: string }[] }): string[] {
	return body.items.map((course) => course.id);
}

async function search(courses: readonly Course[], query: Record<string, readonly string[]>) {
	const services = await buildApplicationServicesFactory({
		environment: 'test',
		courseCatalog: {
			listAll() {
				return Promise.resolve(courses);
			},
		},
	}).forRequest();
	return services.courses.list(query);
}

function twelveCourses(): Course[] {
	return Array.from({ length: 12 }, (_, index) => {
		const day = String(index + 1).padStart(2, '0');
		return course({
			id: `course-${day}`,
			title: `Title ${String.fromCharCode(65 + index)}`,
			createdAt: `2026-01-${day}T00:00:00.000Z`,
			updatedAt: `2026-02-${day}T00:00:00.000Z`,
		});
	});
}

function filterCourses(): Course[] {
	return [
		course({
			id: 'course-001',
			title: 'AI Security Foundations',
			summary: 'Introductory course on secure AI-assisted development.',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
			createdAt: '2026-01-15T00:00:00.000Z',
			updatedAt: '2026-06-01T00:00:00.000Z',
		}),
		course({
			id: 'course-002',
			title: 'Classroom Leadership Lab',
			summary: 'Practice facilitation for instructors who teach in a room.',
			modality: 'in-person',
			status: 'active',
			tags: ['leadership'],
			createdAt: '2026-02-01T00:00:00.000Z',
			updatedAt: '2026-02-10T00:00:00.000Z',
		}),
		course({
			id: 'course-009',
			title: 'Secure Coding Studio',
			summary: 'Write application code that resists common attacks.',
			modality: 'hybrid',
			status: 'active',
			tags: ['coding'],
			createdAt: '2026-07-01T00:00:00.000Z',
			updatedAt: '2026-07-15T00:00:00.000Z',
		}),
		course({
			id: 'course-010',
			title: 'Draft AI Policy Seminar',
			summary: 'Discuss policy choices before an AI feature launches.',
			modality: 'online',
			status: 'draft',
			tags: ['ai', 'policy'],
			createdAt: '2026-08-01T00:00:00.000Z',
			updatedAt: '2026-08-02T00:00:00.000Z',
		}),
		course({
			id: 'course-013',
			title: 'Applied Model Evaluation',
			summary: 'Measure quality before a model ships.',
			modality: 'hybrid',
			status: 'active',
			tags: ['AI', 'evaluation'],
			createdAt: '2026-10-01T00:00:00.000Z',
			updatedAt: '2026-10-02T00:00:00.000Z',
		}),
		course({
			id: 'course-014',
			title: 'Release Engineering',
			summary: 'Shipping software without weakening security controls.',
			modality: 'online',
			status: 'retired',
			tags: ['release'],
			createdAt: '2026-03-15T00:00:00.000Z',
			updatedAt: '2026-03-16T00:00:00.000Z',
		}),
		course({
			id: 'course-015',
			title: 'Threat Modeling Studio',
			summary: 'Practice structured attack-surface reviews.',
			modality: 'hybrid',
			status: 'draft',
			tags: ['Security'],
			createdAt: '2026-11-01T00:00:00.000Z',
			updatedAt: '2026-11-02T00:00:00.000Z',
		}),
		course({
			id: 'course-016',
			title: 'Model Supply Chain',
			summary: 'Review dependencies before a release.',
			modality: 'online',
			status: 'draft',
			tags: ['ai-safety'],
			createdAt: '2026-12-01T00:00:00.000Z',
			updatedAt: '2026-12-02T00:00:00.000Z',
		}),
	];
}

function course(overrides: { id: string; title: string; summary?: string; modality?: CourseModality; status?: CourseStatus; tags?: readonly string[]; createdAt?: string; updatedAt?: string }): Course {
	return {
		id: overrides.id,
		title: overrides.title,
		summary: overrides.summary ?? `${overrides.title} summary`,
		modality: overrides.modality ?? 'online',
		status: overrides.status ?? 'active',
		tags: overrides.tags ?? ['general'],
		createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-01-02T00:00:00.000Z',
	};
}
