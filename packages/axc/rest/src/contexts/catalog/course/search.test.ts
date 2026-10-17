import { readFileSync } from 'node:fs';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { ApplicationServicesFactory } from '@axc/application-services';
import { expect, vi } from 'vitest';
import { createRestApp } from '../../../index.ts';

const feature = await loadFeature('./src/contexts/catalog/course/features/search.feature');
describeFeature(feature, ({ Scenario }) => {
	for (const title of readFileSync(new URL('./features/search.feature', import.meta.url), 'utf8').matchAll(/Scenario: (.+)/g)) {
		Scenario(title[1] ?? '', ({ When, Then }) => {
			const search = vi.fn(async () => ({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));
			const factory: ApplicationServicesFactory = {
				forRequest: () => Promise.resolve({ courses: { search }, health: { getStatus: () => ({ status: 'ok', service: 'agentCourses-api', projectCode: 'axc', environment: 'test', timestamp: '2026-01-01T00:00:00.000Z' }) } }),
			};
			const app = createRestApp(factory);
			let response: Response;
			When('courses are requested with query {string}', async (_, query: string) => {
				if (query === 'failure=yes') {
					search.mockRejectedValue(new Error('private driver details'));
				}
				response = await app.request(`/api/courses?${query}`);
			});
			Then('the response status is {int} for {string}', async (_, status: number, outcome: string) => {
				expect(response.status).toBe(status);
				if (status === 400) {
					expect(await response.json()).toMatchObject({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field: outcome, message: expect.any(String) }] } });
					expect(search).not.toHaveBeenCalled();
				} else if (status === 500) {
					expect(await response.json()).toEqual({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unable to search courses.' } });
				} else {
					const expected = { page: 1, pageSize: 10, sort: 'title' };
					const extras: Record<string, object> = {
						keyword: { q: 'Security' },
						online: { modality: 'online' },
						'in-person': { modality: 'in-person' },
						hybrid: { modality: 'hybrid' },
						draft: { status: 'draft' },
						active: { status: 'active' },
						retired: { status: 'retired' },
						tag: { tag: 'AI' },
						paging: { page: 2, pageSize: 5 },
						maximum: { pageSize: 50 },
						minimum: { pageSize: 1 },
						createdAt: { sort: 'createdAt' },
						updatedAt: { sort: 'updatedAt' },
					};
					expect(search).toHaveBeenCalledWith({ ...expected, ...extras[outcome] });
					expect(await response.json()).toMatchObject({ items: [], totalItems: 0, totalPages: 0 });
				}
			});
		});
	}
});
