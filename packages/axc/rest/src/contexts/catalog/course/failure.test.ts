import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';
import { createRestApp } from '../../../index.ts';

const feature = await loadFeature(new URL('./features/failure.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Hides internal errors from clients', ({ Given, When, Then }) => {
		let response: Response;
		const failure = new Error('driver stack, internal database identifier');
		const search = vi.fn().mockRejectedValue(failure);
		Given('a failing catalog service', () => {
			expect(search).not.toHaveBeenCalled();
		});
		When('the catalog request fails', async () => {
			const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined);
			try {
				response = await createRestApp({
					forRequest: () =>
						Promise.resolve({
							health: {
								getStatus: () => {
									throw new Error('unused');
								},
							},
							courses: { search },
						}),
				}).request('/api/courses');
				expect(logger).toHaveBeenCalledWith('Course catalog search failed', failure);
			} finally {
				logger.mockRestore();
			}
		});
		Then('the client receives a safe server error', async () => {
			expect(response.status).toBe(500);
			expect(await response.json()).toEqual({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unable to retrieve courses.' } });
		});
	});
});
