import { readFileSync } from 'node:fs';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { Domain } from '@axc/domain';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { Mongoose } from 'mongoose';
import { afterAll, beforeAll, expect } from 'vitest';
import { CourseModelFactory } from '../../../../models/catalog/course.model.ts';
import { seedCourses } from '../../../../seed/catalog/course.ts';
import { getCourseReadRepository } from './course.read-repository.ts';

const path = './src/datasources/readonly/catalog/course/features/search.feature';
const feature = await loadFeature(path);
const mongoose = new Mongoose();
let server: MongoMemoryServer;
let repository: Domain.Contexts.Catalog.Course.CourseReadRepository;
beforeAll(async () => {
	server = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
	await mongoose.connect(server.getUri());
	const model = CourseModelFactory({ service: mongoose });
	await seedCourses(model);
	await seedCourses(model);
	repository = getCourseReadRepository({ Course: model });
});
afterAll(async () => {
	await mongoose.disconnect();
	await server?.stop();
});
describeFeature(feature, ({ Scenario }) => {
	for (const title of readFileSync(path, 'utf8').matchAll(/Scenario: (.+)/g)) {
		Scenario(title[1] ?? '', ({ When, Then }) => {
			let result: Domain.Contexts.Catalog.Course.CourseSearchResult;
			When('the repository searches with {string}', async (_, raw: string) => {
				result = await repository.search({ page: 1, pageSize: 10, sort: 'title', ...Object.fromEntries([...new URLSearchParams(raw)].map(([key, value]) => [key, key === 'page' || key === 'pageSize' ? Number(value) : value])) });
			});
			Then('the course ids are {string} and total count is {int}', (_, ids: string, total: number) => {
				expect(result.items.map((course) => course.id)).toEqual(ids === '' ? [] : ids.split(','));
				expect(result.totalItems).toBe(total);
				expect(result.totalPages).toBe(Math.ceil(total / result.pageSize));
				for (const course of result.items) {
					expect(Object.keys(course).sort()).toEqual(['id', 'title', 'summary', 'modality', 'status', 'tags', 'createdAt', 'updatedAt'].sort());
					expect(new Date(course.createdAt).toISOString()).toBe(course.createdAt);
					expect(new Date(course.updatedAt).toISOString()).toBe(course.updatedAt);
				}
			});
		});
	}
});
