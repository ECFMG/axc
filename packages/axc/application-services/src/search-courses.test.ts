import type { Course } from '@axc/domain';
import { courseCatalog } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { type ApplicationServices, buildApplicationServicesFactory } from './index.ts';

const sampleCourse: Course = {
	id: 'course-001',
	title: 'AI Security Foundations',
	summary: 'Introductory course on secure AI-assisted development.',
	modality: 'online',
	status: 'active',
	tags: ['ai', 'security'],
	createdAt: '2026-01-15T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('course catalog search', () => {
	it('returns the default page sorted by title', async () => {
		const page = await search({});

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(courseCatalog.length);
		expect(page.totalPages).toBe(2);
		expect(page.items).toHaveLength(10);
		expect(page.items.map((course) => course.title)).toEqual([
			'Accessibility Fundamentals',
			'AI Ethics for Builders',
			'AI Product Design Studio',
			'AI Security Foundations',
			'Classroom Facilitation',
			'Cloud Security Workshop',
			'Data Privacy Essentials',
			'Hybrid Incident Response',
			'Hybrid Leadership Intensive',
			'In-Person Security Briefing',
		]);
	});

	it('matches a keyword in title, summary, or tags regardless of case', async () => {
		const fromTitle = await search({ q: ['SECURITY'] });
		expect(fromTitle.items.map((course) => course.id)).toEqual(['course-001', 'course-004', 'course-010', 'course-012', 'course-009', 'course-002']);

		const fromSummary = await search({ q: ['APPLICATION SECURITY'] });
		expect(fromSummary.items.map((course) => course.id)).toEqual(['course-009']);

		const fromTag = await search({ q: ['Observability'] });
		expect(fromTag.items.map((course) => course.id)).toEqual(['course-013']);
	});

	it('filters by modality, status, and tag', async () => {
		const online = await search({ modality: ['online'] });
		expect(online.items.every((course) => course.modality === 'online')).toBe(true);
		expect(online.totalItems).toBe(6);

		const active = await search({ status: ['active'] });
		expect(active.items.every((course) => course.status === 'active')).toBe(true);
		expect(active.totalItems).toBe(8);

		const ai = await search({ tag: ['AI'] });
		expect(ai.items.map((course) => course.id)).toEqual(['course-011', 'course-007', 'course-001']);
		expect(ai.items.every((course) => course.tags.some((tag) => tag.toLocaleLowerCase('en') === 'ai'))).toBe(true);
	});

	it('combines keyword, modality, and status', async () => {
		const page = await search({ q: ['security'], modality: ['online'], status: ['active'] });

		expect(page.items.map((course) => course.id)).toEqual(['course-001', 'course-009']);
		expect(page.items.every((course) => course.modality === 'online' && course.status === 'active')).toBe(true);
	});

	it('returns the documented sample course for the combined example query', async () => {
		const page = await search({ q: ['security'], modality: ['online'], status: ['active'], tag: ['ai'], page: ['1'], pageSize: ['5'], sort: ['title'] });

		expect(page).toEqual({
			items: [sampleCourse],
			page: 1,
			pageSize: 5,
			totalItems: 1,
			totalPages: 1,
		});
	});

	it('paginates and reports metadata for a short page', async () => {
		const first = await search({ page: ['1'], pageSize: ['5'] });
		const second = await search({ page: ['2'], pageSize: ['5'] });
		const pastEnd = await search({ page: ['4'], pageSize: ['5'] });

		expect(first.items).toHaveLength(5);
		expect(first.totalItems).toBe(14);
		expect(first.totalPages).toBe(3);
		expect(second.items).toHaveLength(5);
		expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
		expect(pastEnd.items).toEqual([]);
		expect(pastEnd.page).toBe(4);
		expect(pastEnd.totalItems).toBe(14);
		expect(pastEnd.totalPages).toBe(3);
	});

	it('accepts the maximum page size and rejects a larger one', async () => {
		const maximum = await search({ pageSize: ['50'] });
		expect(maximum.items).toHaveLength(14);
		expect(maximum.pageSize).toBe(50);

		expect(await outcome({ pageSize: ['51'] })).toEqual({
			ok: false,
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }],
			},
		});
	});

	it('sorts by createdAt and updatedAt', async () => {
		const byCreatedAt = await search({ sort: ['createdAt'], pageSize: ['50'] });
		expect(byCreatedAt.items.map((course) => course.id)).toEqual([
			'course-014',
			'course-008',
			'course-001',
			'course-004',
			'course-011',
			'course-003',
			'course-007',
			'course-013',
			'course-006',
			'course-009',
			'course-005',
			'course-010',
			'course-012',
			'course-002',
		]);

		const byUpdatedAt = await search({ sort: ['updatedAt'], pageSize: ['50'] });
		expect(byUpdatedAt.items[0]?.id).toBe('course-008');
		expect(byUpdatedAt.items.at(-1)?.id).toBe('course-014');
		expect(isSorted(byUpdatedAt.items.map((course) => course.updatedAt))).toBe(true);
	});

	it('returns an empty page when nothing matches', async () => {
		const page = await search({ q: ['zzzz-no-such-course'] });

		expect(page).toEqual({
			items: [],
			page: 1,
			pageSize: 10,
			totalItems: 0,
			totalPages: 0,
		});
	});

	it('rejects invalid modality, status, page, pageSize, and sort together', async () => {
		expect(await outcome({ modality: ['classroom'], status: ['archived'], page: ['0'], pageSize: ['0'], sort: ['popularity'] })).toEqual({
			ok: false,
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [
					{ field: 'modality', message: 'modality must be one of online, in-person, or hybrid.' },
					{ field: 'status', message: 'status must be one of draft, active, or retired.' },
					{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
					{ field: 'sort', message: 'sort must be one of title, createdAt, or updatedAt.' },
				],
			},
		});
	});

	it('rejects non-numeric page values, repeated parameters, and unknown parameters', async () => {
		expect(await outcome({ page: ['1.5'] })).toMatchObject({ ok: false, error: { details: [{ field: 'page' }] } });
		expect(await outcome({ page: ['abc'] })).toMatchObject({ ok: false, error: { details: [{ field: 'page' }] } });
		expect(await outcome({ modality: ['online', 'hybrid'] })).toMatchObject({ ok: false, error: { details: [{ field: 'modality', message: 'modality must be provided once.' }] } });
		expect(await outcome({ foo: ['bar'] })).toEqual({
			ok: false,
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [{ field: 'foo', message: 'Unknown query parameter.' }],
			},
		});
	});

	it('treats a blank keyword as no keyword filter', async () => {
		const page = await search({ q: ['   '] });
		expect(page.totalItems).toBe(courseCatalog.length);
	});

	it('seeds a mixed catalog of at least 12 courses', () => {
		expect(courseCatalog.length).toBeGreaterThanOrEqual(12);
		expect(new Set(courseCatalog.map((course) => course.modality))).toEqual(new Set(['online', 'in-person', 'hybrid']));
		expect(new Set(courseCatalog.map((course) => course.status))).toEqual(new Set(['draft', 'active', 'retired']));
		expect(courseCatalog.flatMap((course) => course.tags).length).toBeGreaterThanOrEqual(12);
		expect(courseCatalog.find((course) => course.id === 'course-001')).toEqual(sampleCourse);
	});

	it('returns copies of stored courses', async () => {
		const page = await search({ q: ['security'], tag: ['ai'] });
		const stored = courseCatalog.find((course) => course.id === 'course-001');

		expect(page.items[0]).toEqual(stored);
		expect(page.items[0]).not.toBe(stored);
		expect(page.items[0]?.tags).not.toBe(stored?.tags);
	});
});

async function search(query: Record<string, string[]>): Promise<Extract<Awaited<ReturnType<ApplicationServices['courses']['search']>>, { ok: true }>['page']> {
	const result = await outcome(query);
	if (!result.ok) {
		throw new Error(`expected a catalog page, received ${JSON.stringify(result.error)}`);
	}
	return result.page;
}

async function outcome(query: Record<string, string[]>): Promise<ReturnType<ApplicationServices['courses']['search']>> {
	const services = await buildApplicationServicesFactory({ environment: 'test' }, courseCatalog).forRequest();
	return services.courses.search(query);
}

function isSorted(values: readonly string[]): boolean {
	for (let index = 1; index < values.length; index += 1) {
		const previous = values[index - 1];
		const current = values[index];
		if (previous === undefined || current === undefined || previous.localeCompare(current) > 0) {
			return false;
		}
	}
	return true;
}
