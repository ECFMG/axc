import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { Domain } from '@axc/domain';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { Mongoose } from 'mongoose';
import { afterAll, beforeAll, expect } from 'vitest';
import { Persistence, seedCourses } from '../../../../index.ts';

const feature = await loadFeature(new URL('./features/search.feature', import.meta.url).pathname);
const service = new Mongoose();
let mongo: MongoMemoryServer;
let repository: Domain.Contexts.Catalog.Course.CourseReadRepository;
beforeAll(async () => {
	mongo = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
	await service.connect(mongo.getUri());
	await seedCourses({ service });
	await seedCourses({ service });
	repository = Persistence({ service }).readonlyDataSource.Catalog.Course.CourseReadRepository;
});
afterAll(async () => {
	await service.disconnect();
	if (mongo !== undefined) {
		await mongo.stop();
	}
});
const cases = [
	[
		'keyword in title',
		{
			q: 'ai SECURITY',
		},
		['course-001'],
	],
	[
		'keyword in summary',
		{
			q: 'practical security',
		},
		['course-002'],
	],
	[
		'keyword in tags',
		{
			q: 'SECURITY',
		},
		['course-001', 'course-002', 'course-003'],
	],
	[
		'tag exact case insensitive',
		{
			tag: 'AI',
		},
		['course-001', 'course-004', 'course-007'],
	],
	[
		'tag is not substring',
		{
			tag: 'secur',
		},
		[],
	],
	[
		'keyword literal regex',
		{
			q: '[brackets]',
		},
		['course-012'],
	],
	[
		'tag literal regex',
		{
			tag: 'a.b',
		},
		['course-012'],
	],
	[
		'regex does not match everything',
		{
			q: '.*',
		},
		[],
	],
	[
		'combines keyword modality status',
		{
			q: 'security',
			modality: 'online',
			status: 'active',
		},
		['course-001'],
	],
	[
		'combines tag status',
		{
			tag: 'ai',
			status: 'draft',
		},
		['course-007'],
	],
	[
		'page two',
		{
			page: 2,
			pageSize: 5,
		},
		['course-006', 'course-007', 'course-008', 'course-009', 'course-010'],
	],
	[
		'past last page',
		{
			page: 99,
		},
		[],
	],
	[
		'no match',
		{
			q: 'nonexistent',
		},
		[],
	],
	[
		'created ascending',
		{
			sort: 'createdAt',
			pageSize: 50,
		},
		['course-012', 'course-011', 'course-010', 'course-009', 'course-008', 'course-007', 'course-006', 'course-005', 'course-004', 'course-003', 'course-002', 'course-001'],
	],
	[
		'updated ascending',
		{
			sort: 'updatedAt',
			pageSize: 50,
		},
		['course-001', 'course-002', 'course-003', 'course-004', 'course-005', 'course-006', 'course-007', 'course-008', 'course-009', 'course-010', 'course-011', 'course-012'],
	],
	['title default', {}, ['course-001', 'course-002', 'course-004', 'course-003', 'course-005', 'course-006', 'course-007', 'course-008', 'course-009', 'course-010']],
	[
		'filters modality online',
		{
			modality: 'online',
		},
		['course-001', 'course-004', 'course-007', 'course-010'],
	],
	[
		'filters modality in-person',
		{
			modality: 'in-person',
		},
		['course-002', 'course-005', 'course-009', 'course-011'],
	],
	[
		'filters modality hybrid',
		{
			modality: 'hybrid',
		},
		['course-003', 'course-006', 'course-008', 'course-012'],
	],
	[
		'filters status draft',
		{
			status: 'draft',
		},
		['course-002', 'course-006', 'course-007', 'course-011'],
	],
	[
		'filters status active',
		{
			status: 'active',
		},
		['course-001', 'course-004', 'course-005', 'course-008', 'course-012'],
	],
	[
		'filters status retired',
		{
			status: 'retired',
		},
		['course-003', 'course-009', 'course-010'],
	],
] as const;
describeFeature(feature, ({ Scenario }) => {
	for (const [name, overrides, ids] of cases) {
		Scenario(name, ({ Given, When, Then }) => {
			let result: Domain.Contexts.Catalog.Course.CourseSearchResult;
			Given('twelve catalog courses in MongoDB', () => {
				/* Dependencies are initialized for this scenario above. */
			});
			When('the catalog is searched', async () => {
				result = await repository.search({ page: 1, pageSize: 10, sort: 'title', ...overrides });
			});
			Then('the matching course identifiers are returned', () => {
				expect(result.items.map((item) => item.id)).toEqual(ids);
				expect(result.page).toBe('page' in overrides ? overrides.page : 1);
				expect(result.pageSize).toBe('pageSize' in overrides ? overrides.pageSize : 10);
				expect(result.totalPages).toBe(Math.ceil(result.totalItems / result.pageSize));
				if (name === 'title default' || name === 'page two' || name === 'past last page') {
					expect(result.totalItems).toBe(12);
				} else {
					expect(result.totalItems).toBe(ids.length);
				}
				for (const item of result.items) {
					expect(Object.keys(item).sort()).toEqual(['id', 'title', 'summary', 'modality', 'status', 'tags', 'createdAt', 'updatedAt'].sort());
					expect(new Date(item.createdAt).toISOString()).toBe(item.createdAt);
					expect(new Date(item.updatedAt).toISOString()).toBe(item.updatedAt);
				}
			});
		});
	}
});
