import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { Domain } from '@axc/domain';
import { expect, vi } from 'vitest';
import { enrollmentInput, trainingFixture } from '../../../training.test-fixture.ts';
import { create } from './create.ts';

const feature = await loadFeature('src/contexts/training/enrollment-request/features/create.feature');
describeFeature(feature, ({ Scenario }) => {
	Scenario('Creates through the transaction', ({ Given, When, Then }) => {
		let fixture: ReturnType<typeof trainingFixture>;
		let result: unknown;
		Given('typed training data sources', () => {
			fixture = trainingFixture();
		});
		When('the operation is requested', async () => {
			result = await create(fixture.dataSources)(enrollmentInput);
		});
		Then('the result respects the application contract', () => {
			expect(result).toMatchObject({ status: 'pending', learnerEmail: enrollmentInput.learnerEmail });
			expect(fixture.withScopedTransaction).toHaveBeenCalledOnce();
			expect(fixture.repository.save).toHaveBeenCalledOnce();
		});
	});
	Scenario('Rejects missing course', ({ Given, When, Then }) => {
		let fixture: ReturnType<typeof trainingFixture>;
		let result: unknown;
		Given('typed training data sources', () => {
			fixture = trainingFixture();
		});
		When('the operation is requested', async () => {
			vi.mocked(fixture.dataSources.readonlyDataSource.Training.Course.getById).mockResolvedValue(undefined);
			try {
				await create(fixture.dataSources)(enrollmentInput);
			} catch (caught) {
				result = caught;
			}
		});
		Then('the result respects the application contract', () => {
			expect(result).toMatchObject({ code: 'COURSE_NOT_FOUND' });
			expect(fixture.withScopedTransaction).not.toHaveBeenCalled();
		});
	});
	Scenario('Rejects draft course', ({ Given, When, Then }) => {
		let fixture: ReturnType<typeof trainingFixture>;
		let result: unknown;
		Given('typed training data sources', () => {
			fixture = trainingFixture();
		});
		When('the operation is requested', async () => {
			fixture.course.status = 'draft';
			try {
				await create(fixture.dataSources)(enrollmentInput);
			} catch (caught) {
				result = caught;
			}
		});
		Then('the result respects the application contract', () => {
			expect(result).toMatchObject({ code: 'COURSE_NOT_ACTIVE' });
			expect(fixture.repository.save).not.toHaveBeenCalled();
		});
	});
	Scenario('Rejects retired course', ({ Given, When, Then }) => {
		let fixture: ReturnType<typeof trainingFixture>;
		let result: unknown;
		Given('typed training data sources', () => {
			fixture = trainingFixture();
		});
		When('the operation is requested', async () => {
			fixture.course.status = 'retired';
			try {
				await create(fixture.dataSources)(enrollmentInput);
			} catch (caught) {
				result = caught;
			}
		});
		Then('the result respects the application contract', () => {
			expect(result).toMatchObject({ code: 'COURSE_NOT_ACTIVE' });
		});
	});
	Scenario('Propagates duplicate conflict', ({ Given, When, Then }) => {
		let fixture: ReturnType<typeof trainingFixture>;
		let result: unknown;
		Given('typed training data sources', () => {
			fixture = trainingFixture();
		});
		When('the operation is requested', async () => {
			vi.mocked(fixture.repository.save).mockRejectedValue(new Domain.Contexts.Training.EnrollmentRequest.EnrollmentWorkflowError('DUPLICATE_ACTIVE_REQUEST', 'learnerEmail', 'Duplicate'));
			try {
				await create(fixture.dataSources)(enrollmentInput);
			} catch (caught) {
				result = caught;
			}
		});
		Then('the result respects the application contract', () => {
			expect(result).toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
		});
	});
	Scenario('Propagates storage failure', ({ Given, When, Then }) => {
		let fixture: ReturnType<typeof trainingFixture>;
		let result: unknown;
		Given('typed training data sources', () => {
			fixture = trainingFixture();
		});
		When('the operation is requested', async () => {
			vi.mocked(fixture.repository.save).mockRejectedValue(new Error('Storage unavailable'));
			try {
				await create(fixture.dataSources)(enrollmentInput);
			} catch (caught) {
				result = caught;
			}
		});
		Then('the result respects the application contract', () => {
			expect(result).toMatchObject({ message: 'Storage unavailable' });
		});
	});
});
