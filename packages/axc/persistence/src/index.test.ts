import { describe, expect, it } from 'vitest';
import { createCatalogDataSources } from './index.ts';
import { seededCourses } from './models/course.seed.ts';

describe('createCatalogDataSources', () => {
	it('wires the seeded catalog behind readonlyDataSource', async () => {
		const dataSources = createCatalogDataSources();
		const result = await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search({
			q: undefined,
			modality: undefined,
			status: undefined,
			tag: undefined,
			page: 1,
			pageSize: 10,
			sort: 'title',
		});

		expect(result.totalItems).toBe(seededCourses.length);
		expect(result.items.length).toBeLessThanOrEqual(10);
	});
});
