import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { enrollmentInput, trainingFixture } from '../../../training.test-fixture.ts';
import { create } from './create.ts';
import { queryById } from './query-by-id.ts';

const feature = await loadFeature('src/contexts/training/enrollment-request/features/query-by-id.feature');
describeFeature(feature, ({ Scenario }) => {
	Scenario('Retrieves the saved audit trail', ({ Given, When, Then }) => {
		let fixture: ReturnType<typeof trainingFixture>;
		let result: unknown;
		Given('typed training data sources', () => {
			fixture = trainingFixture();
		});
		When('the operation is requested', async () => {
			const created = await create(fixture.dataSources)(enrollmentInput);
			result = await queryById(fixture.dataSources)({ id: created.id });
		});
		Then('the result respects the application contract', () => {
			expect(result).toMatchObject({ statusHistory: [expect.objectContaining({ fromStatus: null, toStatus: 'pending', changedBy: 'system' })] });
		});
	});
	Scenario('Reports absent request', ({ Given, When, Then }) => {
		let fixture: ReturnType<typeof trainingFixture>;
		let result: unknown;
		Given('typed training data sources', () => {
			fixture = trainingFixture();
		});
		When('the operation is requested', async () => {
			try {
				await queryById(fixture.dataSources)({ id: 'missing' });
			} catch (caught) {
				result = caught;
			}
		});
		Then('the result respects the application contract', () => {
			expect(result).toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
		});
	});
});
