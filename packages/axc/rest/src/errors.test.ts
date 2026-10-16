import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { TrainingApplicationServicesFactory } from '@axc/application-services';
import type { Hono } from 'hono';
import { expect, vi } from 'vitest';
import { createRestApp } from './index.ts';

const feature = await loadFeature('src/features/errors.feature');
describeFeature(feature, ({ Scenario }) => {
	Scenario('Internal errors are sanitized and logged', ({ Given, When, Then }) => {
		let app: Hono;
		let response: Response;
		const failure = new Error('Mongo driver details and private identifier');
		const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		Given('a failed service dependency', () => {
			const factory: TrainingApplicationServicesFactory = { forRequest: () => Promise.reject(failure) };
			app = createRestApp(factory);
		});
		When('the catalog is requested', async () => {
			response = await app.request('/api/courses');
		});
		Then('a safe internal error is returned and logged', async () => {
			try {
				expect(response.status).toBe(500);
				expect(await response.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] } });
				expect(log).toHaveBeenCalledWith('Training API request failed', failure);
			} finally {
				log.mockRestore();
			}
		});
	});
});
