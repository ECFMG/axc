import type { Course, CourseReadRepository, CourseSearchCriteria, CourseSearchResult } from '@axc/domain';
import { InMemoryCourseReadRepository } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { INVALID_QUERY_PARAMETER_CODE, INVALID_QUERY_PARAMETER_MESSAGE } from '../api-error.ts';
import { buildCourseCatalogApplicationService } from './course-catalog.ts';

const catalog: readonly Course[] = [
	{
		id: 'a',
		title: 'AI Security Foundations',
		summary: 'Secure AI-assisted development.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'security'],
		createdAt: '2026-01-15T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
	},
	{ id: 'b', title: 'Threat Modelling', summary: 'STRIDE and attack trees.', modality: 'in-person', status: 'active', tags: ['Security'], createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z' },
	{ id: 'c', title: 'Cloud Cost Engineering', summary: 'Reduce spend.', modality: 'online', status: 'draft', tags: ['cloud'], createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z' },
];

const service = buildCourseCatalogApplicationService(new InMemoryCourseReadRepository(catalog));

describe('course catalog application service', () => {
	it('returns the default page when no parameters are supplied', async () => {
		const outcome = await service.search({});

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) {
			return;
		}
		expect(outcome.result).toStrictEqual({ items: [catalog[0], catalog[2], catalog[1]], page: 1, pageSize: 10, totalItems: 3, totalPages: 1 });
	});

	it('combines keyword, modality and status filters', async () => {
		const outcome = await service.search({ q: 'SECURITY', modality: 'online', status: 'active' });

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) {
			return;
		}
		expect(outcome.result.items.map((course) => course.id)).toStrictEqual(['a']);
		expect(outcome.result.totalItems).toBe(1);
	});

	it('returns an empty page rather than an error when nothing matches', async () => {
		const outcome = await service.search({ q: 'no-such-course' });

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) {
			return;
		}
		expect(outcome.result).toStrictEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('returns the shared error envelope for invalid parameters', async () => {
		const outcome = await service.search({ pageSize: '500' });

		expect(outcome.ok).toBe(false);
		if (outcome.ok) {
			return;
		}
		expect(outcome.error).toStrictEqual({
			error: {
				code: INVALID_QUERY_PARAMETER_CODE,
				message: INVALID_QUERY_PARAMETER_MESSAGE,
				details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }],
			},
		});
	});

	it('does not reach the repository when validation fails', async () => {
		let calls = 0;
		const spy: CourseReadRepository = {
			search: (criteria: CourseSearchCriteria): Promise<CourseSearchResult> => {
				calls += 1;
				return Promise.resolve({ items: [], page: criteria.page, pageSize: criteria.pageSize, totalItems: 0, totalPages: 0 });
			},
		};

		await buildCourseCatalogApplicationService(spy).search({ sort: 'rating' });

		expect(calls).toBe(0);
	});
});
