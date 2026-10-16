import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';
import { testSources } from '../../../test-support.ts';
import { queryById } from './query-by-id.ts';

const feature = await loadFeature(new URL('./features/query-by-id.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Retrieves audit history', ({ Given, When, Then }) => {
		let data: ReturnType<typeof testSources>;
		let action: () => Promise<void>;
		Given('typed training data sources', () => {
			data = testSources();
		});
		When('the existing request is queried', () => {
			action = async () => {
				const { dataSources } = data;
				const result = await queryById(dataSources)({ id: 'request-001' });
				expect(result.statusHistory[0]).toMatchObject({ fromStatus: null, toStatus: 'pending', changedBy: 'system' });
			};
		});
		Then('the record includes initial pending history', async () => {
			await action();
		});
	});
	Scenario('Reports missing request', ({ Given, When, Then }) => {
		let data: ReturnType<typeof testSources>;
		let action: () => Promise<void>;
		Given('typed training data sources', () => {
			data = testSources();
		});
		When('a missing request is queried', () => {
			action = async () => {
				const { dataSources } = data;
				vi.mocked(dataSources.readonlyDataSource.Training.EnrollmentRequest.queryById).mockResolvedValue(undefined);
				await expect(queryById(dataSources)({ id: 'missing' })).rejects.toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
			};
		});
		Then('lookup fails with ENROLLMENT_REQUEST_NOT_FOUND', async () => {
			await action();
		});
	});
});
