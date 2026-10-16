import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { trainingFixture } from '../../../training.test-fixture.ts';
import { search } from './search.ts';

const feature = await loadFeature('src/contexts/training/course/features/search.feature');
describeFeature(feature, ({ Scenario }) => {
	Scenario('Delegates typed course search', ({ Given, When, Then }) => {
		let fixture: ReturnType<typeof trainingFixture>;
		let result: unknown;
		Given('typed training data sources', () => {
			fixture = trainingFixture();
		});
		When('the operation is requested', async () => {
			const criteria = { q: 'security', modality: 'online', status: 'active', tag: 'ai', page: 2, pageSize: 5, sort: 'createdAt' } as const;
			result = await search(fixture.dataSources)(criteria);
			expect(fixture.dataSources.readonlyDataSource.Training.Course.search).toHaveBeenCalledWith(criteria);
		});
		Then('the result respects the application contract', () => {
			expect(result).toMatchObject({ totalItems: 1 });
		});
	});
});
