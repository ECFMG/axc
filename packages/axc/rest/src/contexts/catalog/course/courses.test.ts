import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { ApplicationServicesFactory } from '@axc/application-services';
import type { Domain } from '@axc/domain';
import { expect, vi } from 'vitest';
import { createRestApp } from '../../../index.ts';

type Criteria = Domain.Contexts.Catalog.Course.CourseSearchCriteria;
const feature = await loadFeature(new URL('./features/courses.feature', import.meta.url).pathname);
const search = vi.fn<(criteria: Criteria) => Promise<Domain.Contexts.Catalog.Course.CoursePage>>();
const forRequest = vi.fn<ApplicationServicesFactory['forRequest']>(() =>
	Promise.resolve({
		health: { getStatus: () => ({ status: 'ok', service: 'agentCourses-api', projectCode: 'axc', environment: 'test', timestamp: '' }) },
		Catalog: { Course: { queryCourses: search } },
	}),
);
const app = createRestApp({ forRequest });
const defaults: Criteria = { page: 1, pageSize: 10, sort: 'title' };

describeFeature(feature, ({ Scenario, BeforeEachScenario }) => {
	BeforeEachScenario(() => {
		vi.clearAllMocks();
		search.mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
	Scenario('Defaults and blank optional parameters', ({ Then }) => {
		Then('defaults and blanks produce typed criteria', async () => {
			for (const query of ['', '?q= &tag= &modality= &status=&sort=&page= &pageSize=&unknown=ignored']) {
				const response = await app.request(`/api/courses${query}`);
				expect(response.status).toBe(200);
				expect(search).toHaveBeenLastCalledWith(defaults);
			}
		});
	});
	Scenario('Accepted query values', ({ Then }) => {
		Then('every supported filter and sort is forwarded', async () => {
			for (const modality of ['online', 'in-person', 'hybrid'] as const) {
				for (const status of ['draft', 'active', 'retired'] as const) {
					for (const sort of ['title', 'createdAt', 'updatedAt'] as const) {
						const query = new URLSearchParams({ q: ' Security ', tag: ' AI ', modality, status, sort, page: '2', pageSize: '50' });
						expect((await app.request(`/api/courses?${query}`, { headers: { Authorization: 'test' } })).status).toBe(200);
						expect(search).toHaveBeenLastCalledWith({ q: 'Security', tag: 'AI', modality, status, sort, page: 2, pageSize: 50 });
						expect(forRequest).toHaveBeenLastCalledWith('test');
					}
				}
			}
			expect((await app.request('/api/courses?page=1&pageSize=1')).status).toBe(200);
			expect(search).toHaveBeenLastCalledWith({ ...defaults, pageSize: 1 });
		});
	});
	Scenario('Invalid queries', ({ Then }) => {
		Then('invalid enum and numeric formats return consistent errors', async () => {
			const cases: Record<string, string[]> = {
				modality: ['remote', 'ONLINE'],
				status: ['published', 'ACTIVE'],
				sort: ['id', '-title'],
				page: ['0', '-1', '1.5', '1e2', '1x', ' 2 ', '+1', '9007199254740992'],
				pageSize: ['0', '-1', '51', '1.5', '1e1', '5x', ' 5 ', '+1', '9007199254740992'],
			};
			for (const [field, values] of Object.entries(cases)) {
				for (const value of values) {
					const response = await app.request(`/api/courses?${new URLSearchParams({ [field]: value })}`);
					expect(response.status, `${field}=${value}`).toBe(400);
					expect(await response.json()).toEqual({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field, message: expect.any(String) }] } });
				}
			}
			const response = await app.request('/api/courses?modality=bad&status=bad&page=0&pageSize=51&sort=bad');
			const body = await response.json();
			expect(body.error.details).toHaveLength(5);
			expect(search).not.toHaveBeenCalled();
			expect(forRequest).not.toHaveBeenCalled();
		});
	});
	Scenario('HTTP results and failures', ({ Then }) => {
		Then('course pages and safe internal errors are mapped', async () => {
			const page = { items: [], page: 7, pageSize: 5, totalItems: 0, totalPages: 0 };
			search.mockResolvedValueOnce(page);
			const response = await app.request('/api/courses?page=7&pageSize=5');
			expect(response.status).toBe(200);
			expect(await response.json()).toEqual(page);
			search.mockRejectedValueOnce(new Error('driver password internal-id stack'));
			const failed = await app.request('/api/courses');
			expect(failed.status).toBe(500);
			expect(await failed.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Unable to search courses.' } });
			forRequest.mockRejectedValueOnce(new Error('auth internal-id'));
			expect((await app.request('/api/courses')).status).toBe(500);
		});
	});
});
