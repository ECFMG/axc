import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';
import { createRestApp } from '../../../index.ts';
import { fakeFactory, fakeServices } from '../../../test-services.ts';

const feature = await loadFeature(new URL('./features/courses.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Typed search criteria and defaults', ({ Then }) => {
		Then('valid filters defaults combinations and empty results are mapped', async () => {
			const services = fakeServices();
			const factory = fakeFactory(services);
			const app = createRestApp(factory);
			vi.mocked(services.Training.Course.queryCourses).mockImplementation((criteria) => Promise.resolve({ ...criteria, items: [], totalItems: 0, totalPages: 0 }));
			for (const query of ['', '?q= &modality= &status=&tag=&page= &pageSize=&sort= &ignored=anything']) {
				const response = await app.request(`/api/courses${query}`);
				expect(response.status).toBe(200);
				expect(await response.json()).toMatchObject({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
				expect(services.Training.Course.queryCourses).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, sort: 'title' });
			}
			for (const modality of ['online', 'in-person', 'hybrid']) {
				for (const status of ['active', 'draft', 'retired']) {
					for (const sort of ['title', 'createdAt', 'updatedAt']) {
						const response = await app.request(`/api/courses?q=SECURITY&tag=AI&modality=${modality}&status=${status}&sort=${sort}&page=2&pageSize=50`);
						expect(response.status).toBe(200);
						expect(services.Training.Course.queryCourses).toHaveBeenLastCalledWith({ q: 'SECURITY', tag: 'AI', modality, status, sort, page: 2, pageSize: 50 });
					}
				}
			}
			expect((await app.request('/api/courses?page=1&pageSize=1')).status).toBe(200);
		});
	});
	Scenario('Invalid course queries', ({ Then }) => {
		Then('invalid enums and pagination values return consistent 400 errors', async () => {
			const services = fakeServices();
			const app = createRestApp(fakeFactory(services));
			for (const query of [
				'page=9007199254740991&pageSize=50',
				'modality=remote',
				'status=pending',
				'sort=id',
				...['0', '-1', '1.2', '1e2', '1x', '+1', ' 1', '9007199254740992'].map((value) => `page=${encodeURIComponent(value)}`),
				...['0', '51', '-1', '1.2', '1e1', '1x'].map((value) => `pageSize=${value}`),
			]) {
				const response = await app.request(`/api/courses?${query}`);
				expect(response.status, query).toBe(400);
				expect(await response.json()).toMatchObject({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field: query.split('=')[0], message: expect.any(String) }] } });
			}
			expect(services.Training.Course.queryCourses).not.toHaveBeenCalled();
		});
	});
});
