import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import mongoose from 'mongoose';
import { afterAll, beforeAll, expect } from 'vitest';
import { Persistence, seedCourses } from '../../../../index.ts';

let server: MongoMemoryReplSet;
let sources: ReturnType<typeof Persistence>;
beforeAll(async () => {
	server = await MongoMemoryReplSet.create({ binary: { version: '7.0.14' }, replSet: { count: 1 } });
	await mongoose.connect(server.getUri());
	sources = Persistence({ service: mongoose }, { now: () => new Date() });
	await sources.initialize();
	await seedCourses(sources.models);
}, 60000);
afterAll(async () => {
	await mongoose.disconnect();
	if (server !== undefined) {
		await server.stop();
	}
});
const feature = await loadFeature(new URL('./features/course.read-repository.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Combined search filters run before paging', ({ Given, When, Then }) => {
		let result: Awaited<ReturnType<typeof sources.readonlyDataSource.Training.Course.search>>;
		Given('twelve mixed courses in MongoDB', () => expect(sources).toBeDefined());
		When('active online security courses are searched', async () => {
			result = await sources.readonlyDataSource.Training.Course.search({ q: 'SECURITY', modality: 'online', status: 'active', page: 1, pageSize: 1, sort: 'title' });
		});
		Then('only matching courses and their total are returned', () => {
			expect(result.items).toHaveLength(1);
			expect(result.totalItems).toBeGreaterThan(0);
			expect(result.items[0]).toMatchObject({ modality: 'online', status: 'active' });
		});
	});
	Scenario('Search treats regex characters literally', ({ Given, When, Then }) => {
		let total: number;
		Given('twelve mixed courses in MongoDB', () => expect(sources).toBeDefined());
		When('the keyword is ".*"', async () => {
			total = (await sources.readonlyDataSource.Training.Course.search({ q: '.*', page: 1, pageSize: 10, sort: 'title' })).totalItems;
		});
		Then('zero courses match the literal keyword', () => expect(total).toBe(0));
	});
	Scenario('Paging and date sorting run in MongoDB', ({ Given, When, Then }) => {
		let result: Awaited<ReturnType<typeof sources.readonlyDataSource.Training.Course.search>>;
		Given('twelve mixed courses in MongoDB', () => expect(sources).toBeDefined());
		When('page 2 of size 3 is sorted by createdAt', async () => {
			result = await sources.readonlyDataSource.Training.Course.search({ page: 2, pageSize: 3, sort: 'createdAt' });
		});
		Then('three dated courses and total 12 are returned', () => {
			expect(result.items).toHaveLength(3);
			expect(result.totalItems).toBe(12);
			expect(result.totalPages).toBe(4);
			const dates = result.items.map((c) => c.createdAt);
			expect(dates).toEqual([...dates].sort());
		});
	});
});
