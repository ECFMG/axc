import { beforeEach, describe, expect, it } from 'vitest';
import { type ApplicationServices, buildApplicationServicesFactory } from './index.ts';

describe('course catalog search', () => {
	let services: ApplicationServices;

	beforeEach(async () => {
		services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
	});

	it('returns the default page sorted by title', async () => {
		const result = await services.courses.search();

		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(result.items).toHaveLength(10);
		const titles = result.items.map((course) => course.title);
		expect(titles).toStrictEqual([...titles].sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase())));
		expect(result.items[0]).toMatchObject({
			id: 'course-002',
			title: 'Advanced Cloud Architecture',
			modality: 'hybrid',
			status: 'active',
		});
		expect(result.items[0]).toHaveProperty('summary');
		expect(result.items[0]).toHaveProperty('tags');
		expect(result.items[0]).toHaveProperty('createdAt');
		expect(result.items[0]).toHaveProperty('updatedAt');
	});

	it('searches title, summary, and tags case-insensitively', async () => {
		const result = await services.courses.search({ q: 'SeCuRiTy', pageSize: 50 });

		expect(result.items.map((course) => course.id)).toStrictEqual(['course-001', 'course-004', 'course-007', 'course-011']);
	});

	it('filters by modality, status, and case-insensitive exact tag', async () => {
		const online = await services.courses.search({ modality: 'online', pageSize: 50 });
		const retired = await services.courses.search({ status: 'retired', pageSize: 50 });
		const tagged = await services.courses.search({ tag: 'AI', pageSize: 50 });

		expect(online.items).toHaveLength(5);
		expect(online.items.every((course) => course.modality === 'online')).toBe(true);
		expect(retired.items.map((course) => course.id)).toStrictEqual(['course-007', 'course-010']);
		expect(tagged.items.map((course) => course.id)).toStrictEqual(['course-001', 'course-008']);
	});

	it('combines keyword, modality, and status filters', async () => {
		const result = await services.courses.search({ q: 'security', modality: 'online', status: 'active' });

		expect(result.items.map((course) => course.id)).toStrictEqual(['course-001', 'course-004']);
	});

	it('paginates after filtering and sorting', async () => {
		const first = await services.courses.search({ page: 1, pageSize: 5 });
		const second = await services.courses.search({ page: 2, pageSize: 5 });

		expect(second).toMatchObject({ page: 2, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect(first.items).toHaveLength(5);
		expect(second.items).toHaveLength(5);
		expect(second.items.map((course) => course.id)).not.toEqual(first.items.map((course) => course.id));
	});

	it.each(['createdAt', 'updatedAt'] as const)('sorts by %s in ascending order', async (sort) => {
		const result = await services.courses.search({ sort, pageSize: 50 });
		const values = result.items.map((course) => course[sort]);

		expect(values).toStrictEqual([...values].sort());
	});

	it('returns an empty successful page when no courses match', async () => {
		const result = await services.courses.search({ q: 'no-such-course' });

		expect(result).toStrictEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
});
