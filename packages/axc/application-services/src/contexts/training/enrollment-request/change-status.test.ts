import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { enrollmentInput, trainingFixture } from '../../../training.test-fixture.ts';
import { changeStatus } from './change-status.ts';
import { create } from './create.ts';

const feature = await loadFeature('src/contexts/training/enrollment-request/features/change-status.feature');
describeFeature(feature, ({ Scenario }) => {
	Scenario('Updates and saves the audit trail', ({ Given, When, Then }) => {
		let fixture: ReturnType<typeof trainingFixture>;
		let result: unknown;
		Given('typed training data sources', () => {
			fixture = trainingFixture();
		});
		When('the operation is requested', async () => {
			const created = await create(fixture.dataSources)(enrollmentInput);
			result = await changeStatus(fixture.dataSources)({ id: created.id, status: 'approved', changedBy: 'reviewer' });
		});
		Then('the result respects the application contract', () => {
			expect(result).toMatchObject({ status: 'approved', statusHistory: [expect.objectContaining({ toStatus: 'pending' }), expect.objectContaining({ fromStatus: 'pending', toStatus: 'approved', changedBy: 'reviewer' })] });
			expect(fixture.withScopedTransaction).toHaveBeenCalledTimes(2);
		});
	});
	Scenario('Rejects absent mutation target', ({ Given, When, Then }) => {
		let fixture: ReturnType<typeof trainingFixture>;
		let result: unknown;
		Given('typed training data sources', () => {
			fixture = trainingFixture();
		});
		When('the operation is requested', async () => {
			try {
				await changeStatus(fixture.dataSources)({ id: 'missing', status: 'approved', changedBy: 'reviewer' });
			} catch (caught) {
				result = caught;
			}
		});
		Then('the result respects the application contract', () => {
			expect(result).toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
			expect(fixture.repository.save).not.toHaveBeenCalled();
		});
	});
	Scenario('Leaves state intact on invalid transition', ({ Given, When, Then }) => {
		let fixture: ReturnType<typeof trainingFixture>;
		let result: unknown;
		Given('typed training data sources', () => {
			fixture = trainingFixture();
		});
		When('the operation is requested', async () => {
			const created = await create(fixture.dataSources)(enrollmentInput);
			await changeStatus(fixture.dataSources)({ id: created.id, status: 'cancelled', changedBy: 'reviewer' });
			try {
				await changeStatus(fixture.dataSources)({ id: created.id, status: 'approved', changedBy: 'reviewer' });
			} catch (caught) {
				result = caught;
			}
		});
		Then('the result respects the application contract', () => {
			expect(result).toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			expect(fixture.repository.save).toHaveBeenCalledTimes(2);
		});
	});
});
