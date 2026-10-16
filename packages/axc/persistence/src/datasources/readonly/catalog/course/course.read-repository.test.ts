import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { Domain } from '@axc/domain';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { Mongoose } from 'mongoose';
import { afterAll, beforeAll, expect } from 'vitest';
import * as persistence from '../../../../index.ts';

const feature = await loadFeature(new URL('./features/course.read-repository.feature', import.meta.url).pathname);
let memory: MongoMemoryServer;
const service = new Mongoose();
beforeAll(async () => {
	memory = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
	await service.connect(memory.getUri());
}, 60000);
afterAll(async () => {
	await service.disconnect();
	await memory?.stop();
});
const criteria: Domain.Contexts.Catalog.Course.CourseSearchCriteria = { page: 1, pageSize: 50, sort: 'title' };
async function setup() {
	expect(persistence).toHaveProperty('createModels');
	const models = persistence.createModels({ service });
	await models.Catalog.Course.deleteMany({});
	await persistence.seedCourses(models);
	const repo = persistence.DataSourcesFactoryImpl(models).getDataSources().readonlyDataSource.Catalog.Course.CourseReadRepo;
	return { models, repo };
}
describeFeature(feature, ({ Scenario }) => {
	Scenario('Seeded course contract', ({ Then }) => {
		Then('the seed contains a varied valid catalog and seeds idempotently', async () => {
			const { models, repo } = await setup();
			await persistence.seedCourses(models);
			const result = await repo.search(criteria);
			expect(result.totalItems).toBeGreaterThanOrEqual(12);
			expect(new Set(result.items.map((item) => item.id)).size).toBe(result.totalItems);
			expect(new Set(result.items.map((item) => item.modality)).size).toBe(3);
			expect(new Set(result.items.map((item) => item.status)).size).toBe(3);
			for (const item of result.items) {
				expect(Object.keys(item).sort()).toEqual(['createdAt', 'id', 'modality', 'status', 'summary', 'tags', 'title', 'updatedAt']);
				expect(item.title.length).toBeGreaterThan(0);
				expect(item.summary.length).toBeGreaterThan(0);
				expect(item.tags.length).toBeGreaterThan(0);
				expect(new Date(item.createdAt).toISOString()).toBe(item.createdAt);
				expect(new Date(item.updatedAt).toISOString()).toBe(item.updatedAt);
			}
		});
	});
	Scenario('Keywords and literal matching', ({ Then }) => {
		Then('keywords match each searchable field case insensitively and escape metacharacters', async () => {
			const { models, repo } = await setup();
			await models.Catalog.Course.deleteMany({});
			const base = { modality: 'online', status: 'active', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-02-01') };
			await models.Catalog.Course.insertMany([
				{ ...base, courseId: 'title', title: 'SECURITY course', summary: 'intro', tags: ['other'] },
				{ ...base, courseId: 'summary', title: 'Course two', summary: 'Learn security', tags: ['other'] },
				{ ...base, courseId: 'tag', title: 'Course three', summary: 'intro', tags: ['Security'] },
				{ ...base, courseId: 'literal', title: 'C++ [.*]', summary: 'intro', tags: ['a.i'] },
			]);
			expect((await repo.search({ ...criteria, q: 'sEcUrItY' })).items.map((item) => item.id).sort()).toEqual(['summary', 'tag', 'title']);
			for (const q of ['C++', '[.*]']) {
				expect((await repo.search({ ...criteria, q })).items.map((item) => item.id)).toEqual(['literal']);
			}
			expect((await repo.search({ ...criteria, tag: 'a.i' })).items.map((item) => item.id)).toEqual(['literal']);
			expect((await repo.search({ ...criteria, tag: 'a.*' })).totalItems).toBe(0);
			expect(await repo.search({ ...criteria, q: 'no matching course' })).toEqual({ items: [], totalItems: 0 });
		});
	});
	Scenario('Filters and combinations', ({ Then }) => {
		Then('all enum values and exact tags can be combined with keywords', async () => {
			const { repo } = await setup();
			const all = (await repo.search(criteria)).items;
			const combinations: Partial<Domain.Contexts.Catalog.Course.CourseSearchCriteria>[] = [
				...(['online', 'in-person', 'hybrid'] as const).map((modality) => ({ modality })),
				...(['draft', 'active', 'retired'] as const).map((status) => ({ status })),
				{ tag: 'AI' },
				{ tag: 'a' },
				{ q: 'security', modality: 'online', status: 'active' },
				{ modality: 'hybrid', tag: 'ai' },
			];
			for (const filter of combinations) {
				const expected = all.filter(
					(item) =>
						(filter.modality === undefined || item.modality === filter.modality) &&
						(filter.status === undefined || item.status === filter.status) &&
						(filter.tag === undefined || item.tags.some((tag) => tag.toLowerCase() === filter.tag?.toLowerCase())) &&
						(filter.q === undefined || [item.title, item.summary, ...item.tags].some((text) => text.toLowerCase().includes(filter.q ?? ''))),
				);
				const actual = await repo.search({ ...criteria, ...filter });
				expect(actual.items).toEqual(expected);
				expect(actual.totalItems).toBe(expected.length);
			}
		});
	});
	Scenario('Sorting and pagination', ({ Then }) => {
		Then('MongoDB sorts and pages matching courses with stable ties', async () => {
			const { models, repo } = await setup();
			for (const sort of ['title', 'createdAt', 'updatedAt'] as const) {
				const all = await repo.search({ ...criteria, sort });
				const values = all.items.map((item) => item[sort]);
				expect(values).toEqual([...values].sort());
				const first = await repo.search({ ...criteria, sort, pageSize: 5 });
				const second = await repo.search({ ...criteria, sort, page: 2, pageSize: 5 });
				expect(first.items).toEqual(all.items.slice(0, 5));
				expect(second.items).toEqual(all.items.slice(5, 10));
				expect(second.totalItems).toBe(all.totalItems);
				expect((await repo.search({ ...criteria, sort, page: 100 })).items).toEqual([]);
			}
			const course = (await repo.search(criteria)).items[0];
			expect(course).toBeDefined();
			await models.Catalog.Course.deleteMany({});
			await models.Catalog.Course.insertMany(['b', 'a', 'c'].map((courseId) => ({ ...course, courseId, title: 'Same', createdAt: new Date(course?.createdAt ?? ''), updatedAt: new Date(course?.updatedAt ?? '') })));
			expect((await repo.search(criteria)).items.map((item) => item.id)).toEqual(['a', 'b', 'c']);
		});
	});
});
