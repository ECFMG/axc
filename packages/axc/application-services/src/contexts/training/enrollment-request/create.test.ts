import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';
import { sampleCourse, sampleInput, testSources } from '../../../test-support.ts';
import { create } from './create.ts';

const feature = await loadFeature(new URL('./features/create.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Creates within a transaction', ({ Given, When, Then }) => {
		let data: ReturnType<typeof testSources>;
		let action: () => Promise<void>;
		Given('typed training data sources', () => {
			data = testSources();
		});
		When('an active course is requested', () => {
			action = async () => {
				const { dataSources, repository, unitOfWork } = data;
				const result = await create(dataSources)(sampleInput);
				expect(result.status).toBe('pending');
				expect(unitOfWork.withScopedTransaction).toHaveBeenCalledOnce();
				expect(repository.save).toHaveBeenCalledOnce();
			};
		});
		Then('the pending record is saved in one transaction', async () => {
			await action();
		});
	});
	Scenario('Rejects missing course', ({ Given, When, Then }) => {
		let data: ReturnType<typeof testSources>;
		let action: () => Promise<void>;
		Given('typed training data sources', () => {
			data = testSources();
		});
		When('a missing course is requested', () => {
			action = async () => {
				const { dataSources, repository } = data;
				vi.mocked(dataSources.readonlyDataSource.Training.Course.queryById).mockResolvedValue(undefined);
				await expect(create(dataSources)(sampleInput)).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND' });
				expect(repository.save).not.toHaveBeenCalled();
			};
		});
		Then('creation fails with COURSE_NOT_FOUND', async () => {
			await action();
		});
	});
	Scenario('Rejects draft course', ({ Given, When, Then }) => {
		let data: ReturnType<typeof testSources>;
		let action: () => Promise<void>;
		Given('typed training data sources', () => {
			data = testSources();
		});
		When('a draft course is requested', () => {
			action = async () => {
				const { dataSources } = data;
				vi.mocked(dataSources.readonlyDataSource.Training.Course.queryById).mockResolvedValue({ ...sampleCourse, status: 'draft' });
				await expect(create(dataSources)(sampleInput)).rejects.toMatchObject({ code: 'COURSE_NOT_ACTIVE' });
			};
		});
		Then('creation fails with COURSE_NOT_ACTIVE for draft', async () => {
			await action();
		});
	});
	Scenario('Rejects retired course', ({ Given, When, Then }) => {
		let data: ReturnType<typeof testSources>;
		let action: () => Promise<void>;
		Given('typed training data sources', () => {
			data = testSources();
		});
		When('a retired course is requested', () => {
			action = async () => {
				const { dataSources } = data;
				vi.mocked(dataSources.readonlyDataSource.Training.Course.queryById).mockResolvedValue({ ...sampleCourse, status: 'retired' });
				await expect(create(dataSources)(sampleInput)).rejects.toMatchObject({ code: 'COURSE_NOT_ACTIVE' });
			};
		});
		Then('creation fails with COURSE_NOT_ACTIVE for retired', async () => {
			await action();
		});
	});
	Scenario('Rejects active duplicate', ({ Given, When, Then }) => {
		let data: ReturnType<typeof testSources>;
		let action: () => Promise<void>;
		Given('typed training data sources', () => {
			data = testSources();
		});
		When('a duplicate is requested', () => {
			action = async () => {
				const { dataSources, repository } = data;
				repository.hasActiveRequest.mockResolvedValue(true);
				await expect(create(dataSources)(sampleInput)).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
				expect(repository.save).not.toHaveBeenCalled();
			};
		});
		Then('creation fails with DUPLICATE_ACTIVE_REQUEST', async () => {
			await action();
		});
	});
});
