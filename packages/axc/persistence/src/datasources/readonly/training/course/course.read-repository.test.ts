import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { Domain } from '@axc/domain';
import { ServiceMongoose } from '@axc/service-mongoose';
import { afterAll, beforeAll, expect } from 'vitest';
import { DataSourcesFactoryImpl } from '../../../../data-sources.ts';

const feature = await loadFeature(new URL('./features/course.read-repository.feature', import.meta.url).pathname);
const service = new ServiceMongoose(undefined);
beforeAll(async () => {
	await service.startUp();
});
afterAll(async () => {
	await service.shutDown();
});
const defaults: Domain.Contexts.Training.Course.CourseSearchCriteria = { page: 1, pageSize: 10, sort: 'title' };
describeFeature(feature, ({ Scenario }) => {
	Scenario('Courses are filtered sorted and paged in MongoDB', ({ Then }) => {
		Then('all catalog criteria and empty results have correct metadata', async () => {
			const factory = new DataSourcesFactoryImpl(service);
			await factory.initialize(false);
			const repo = factory.getDataSources().readonlyDataSource.Training.Course.CourseReadRepo;
			expect((await repo.search(defaults)).totalItems).toBe(0);
			await factory.initialize(true);
			const all = await repo.search({ ...defaults, pageSize: 50 });
			expect(all.items).toHaveLength(12);
			expect(await repo.search(defaults)).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
			for (const course of all.items) {
				expect(await repo.getById(course.id)).toEqual(course);
				expect(course.createdAt).toMatch(/^2026-/);
				expect(course.updatedAt).toMatch(/^2026-/);
			}
			expect(await repo.getById('missing')).toBeNull();
			for (const modality of ['online', 'in-person', 'hybrid'] as const) {
				const result = await repo.search({ ...defaults, modality });
				expect(result.items.length).toBeGreaterThan(0);
				expect(result.items.every((course) => course.modality === modality)).toBe(true);
			}
			for (const status of ['draft', 'active', 'retired'] as const) {
				const result = await repo.search({ ...defaults, status });
				expect(result.items.length).toBeGreaterThan(0);
				expect(result.items.every((course) => course.status === status)).toBe(true);
			}
			for (const q of ['SECURITY', 'foundations', 'ai']) {
				const expected = all.items.filter((course) => [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(q.toLowerCase())));
				expect((await repo.search({ ...defaults, q, pageSize: 50 })).items).toEqual(expected);
			}
			for (const criteria of [
				{ q: 'security', modality: 'online', status: 'active' },
				{ tag: 'AI', status: 'active' },
			] as const) {
				const result = await repo.search({ ...defaults, ...criteria });
				expect(result.items.length).toBeGreaterThan(0);
				expect(result.items.every((course) => course.status === 'active')).toBe(true);
			}
			expect((await repo.search({ ...defaults, tag: 'AI', pageSize: 50 })).items).toEqual(all.items.filter((course) => course.tags.includes('ai')));
			for (const sort of ['title', 'createdAt', 'updatedAt'] as const) {
				const sorted = (await repo.search({ ...defaults, pageSize: 50, sort })).items;
				expect(sorted.map((course) => course[sort])).toEqual(sorted.map((course) => course[sort]).sort());
				expect((await repo.search({ ...defaults, page: 2, pageSize: 5, sort })).items).toEqual(sorted.slice(5, 10));
			}
			for (const q of ['does-not-exist', '.*', '[']) {
				expect(await repo.search({ ...defaults, q })).toMatchObject({ items: [], totalItems: 0, totalPages: 0 });
			}
			expect((await repo.search({ ...defaults, page: 99 })).items).toEqual([]);
			await factory.initialize(true);
			expect((await repo.search(defaults)).totalItems).toBe(12);
		});
	});
});
