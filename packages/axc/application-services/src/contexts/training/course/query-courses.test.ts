import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';
import { fakeDataSources } from '../../../test-data-sources.ts';
import { queryCourses } from './query-courses.ts';

const feature = await loadFeature(new URL('./features/query-courses.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Delegate typed input and propagate results and errors', ({ Then }) => {
		Then('the operation uses its required repositories and preserves domain outcomes', async () => {
			const data = fakeDataSources();
			const criteria = { page: 2, pageSize: 5, sort: 'createdAt', q: 'security', modality: 'online', status: 'active', tag: 'ai' } as const;
			const expected = { items: [], ...criteria, totalItems: 0, totalPages: 0 };
			vi.mocked(data.readonlyDataSource.Training.Course.CourseReadRepo.search).mockResolvedValue(expected);
			expect(await queryCourses(data)(criteria)).toBe(expected);
			expect(data.readonlyDataSource.Training.Course.CourseReadRepo.search).toHaveBeenCalledWith(criteria);
		});
	});
});
