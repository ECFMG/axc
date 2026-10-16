import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { testSources } from '../../../test-support.ts';
import { updateStatus } from './update-status.ts';

const feature = await loadFeature(new URL('./features/update-status.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Approves with audit', ({ Given, When, Then }) => {
		let data: ReturnType<typeof testSources>;
		let action: () => Promise<void>;
		Given('typed training data sources', () => {
			data = testSources();
		});
		When('the pending request is approved', () => {
			action = async () => {
				const { dataSources } = data;
				const result = await updateStatus(dataSources)({ id: 'request-001', status: 'approved', changedBy: 'reviewer' });
				expect(result.status).toBe('approved');
				expect(result.statusHistory).toHaveLength(2);
				expect(result.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'approved', changedBy: 'reviewer' });
			};
		});
		Then('the saved record has 2 history entries', async () => {
			await action();
		});
	});
	Scenario('Rejects missing update', ({ Given, When, Then }) => {
		let data: ReturnType<typeof testSources>;
		let action: () => Promise<void>;
		Given('typed training data sources', () => {
			data = testSources();
		});
		When('a missing request is approved', () => {
			action = async () => {
				const { dataSources, repository } = data;
				repository.queryById.mockResolvedValue(undefined);
				await expect(updateStatus(dataSources)({ id: 'missing', status: 'approved', changedBy: 'reviewer' })).rejects.toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
			};
		});
		Then('the update fails with ENROLLMENT_REQUEST_NOT_FOUND', async () => {
			await action();
		});
	});
	Scenario('Propagates invalid transition', ({ Given, When, Then }) => {
		let data: ReturnType<typeof testSources>;
		let action: () => Promise<void>;
		Given('typed training data sources', () => {
			data = testSources();
		});
		When('a pending request is set to pending', () => {
			action = async () => {
				const { dataSources, repository } = data;
				await expect(updateStatus(dataSources)({ id: 'request-001', status: 'pending', changedBy: 'reviewer' })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
				expect(repository.save).not.toHaveBeenCalled();
			};
		});
		Then('the update fails with INVALID_STATUS_TRANSITION', async () => {
			await action();
		});
	});
	Scenario('Propagates storage failure', ({ Given, When, Then }) => {
		let data: ReturnType<typeof testSources>;
		let action: () => Promise<void>;
		Given('typed training data sources', () => {
			data = testSources();
		});
		When('the save fails unexpectedly', () => {
			action = async () => {
				const { dataSources, repository } = data;
				repository.save.mockRejectedValue(new Error('storage offline'));
				await expect(updateStatus(dataSources)({ id: 'request-001', status: 'approved', changedBy: 'reviewer' })).rejects.toThrow('storage offline');
			};
		});
		Then('the original storage error reaches the caller', async () => {
			await action();
		});
	});
});
