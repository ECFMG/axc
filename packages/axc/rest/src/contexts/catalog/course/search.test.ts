import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';
import { createRestApp } from '../../../index.ts';

const feature = await loadFeature(new URL('./features/search.feature', import.meta.url).pathname);
const cases = [
	[
		'defaults',
		'',
		200,
		{
			page: 1,
			pageSize: 10,
			sort: 'title',
		},
	],
	[
		'trims optional input',
		'q=%20Security%20&tag=%20AI%20',
		200,
		{
			q: 'Security',
			tag: 'AI',
			page: 1,
			pageSize: 10,
			sort: 'title',
		},
	],
	[
		'blank values use defaults',
		'q=%20&tag=&page=%20&pageSize=&modality=&status=&sort=',
		200,
		{
			page: 1,
			pageSize: 10,
			sort: 'title',
		},
	],
	[
		'combined criteria',
		'q=security&modality=online&status=active&tag=AI&page=2&pageSize=5&sort=updatedAt',
		200,
		{
			q: 'security',
			modality: 'online',
			status: 'active',
			tag: 'AI',
			page: 2,
			pageSize: 5,
			sort: 'updatedAt',
		},
	],
	[
		'maximum size',
		'pageSize=50',
		200,
		{
			page: 1,
			pageSize: 50,
			sort: 'title',
		},
	],
	[
		'accepts modality online',
		'modality=online',
		200,
		{
			page: 1,
			pageSize: 10,
			sort: 'title',
			modality: 'online',
		},
	],
	[
		'accepts modality in-person',
		'modality=in-person',
		200,
		{
			page: 1,
			pageSize: 10,
			sort: 'title',
			modality: 'in-person',
		},
	],
	[
		'accepts modality hybrid',
		'modality=hybrid',
		200,
		{
			page: 1,
			pageSize: 10,
			sort: 'title',
			modality: 'hybrid',
		},
	],
	[
		'accepts status draft',
		'status=draft',
		200,
		{
			page: 1,
			pageSize: 10,
			sort: 'title',
			status: 'draft',
		},
	],
	[
		'accepts status active',
		'status=active',
		200,
		{
			page: 1,
			pageSize: 10,
			sort: 'title',
			status: 'active',
		},
	],
	[
		'accepts status retired',
		'status=retired',
		200,
		{
			page: 1,
			pageSize: 10,
			sort: 'title',
			status: 'retired',
		},
	],
	[
		'accepts sort title',
		'sort=title',
		200,
		{
			page: 1,
			pageSize: 10,
			sort: 'title',
		},
	],
	[
		'accepts sort createdAt',
		'sort=createdAt',
		200,
		{
			page: 1,
			pageSize: 10,
			sort: 'createdAt',
		},
	],
	[
		'accepts sort updatedAt',
		'sort=updatedAt',
		200,
		{
			page: 1,
			pageSize: 10,
			sort: 'updatedAt',
		},
	],
	['rejects modality remote', 'modality=remote', 400, 'modality'],
	['rejects modality ONLINE', 'modality=ONLINE', 400, 'modality'],
	['rejects status pending', 'status=pending', 400, 'status'],
	['rejects status ACTIVE', 'status=ACTIVE', 400, 'status'],
	['rejects sort id', 'sort=id', 400, 'sort'],
	['rejects sort -title', 'sort=-title', 400, 'sort'],
	['rejects page 0', 'page=0', 400, 'page'],
	['rejects page -1', 'page=-1', 400, 'page'],
	['rejects page 1.5', 'page=1.5', 400, 'page'],
	['rejects page abc', 'page=abc', 400, 'page'],
	['rejects page 1e2', 'page=1e2', 400, 'page'],
	['rejects page 0x10', 'page=0x10', 400, 'page'],
	['rejects page 9007199254740992', 'page=9007199254740992', 400, 'page'],
	['rejects pageSize 0', 'pageSize=0', 400, 'pageSize'],
	['rejects pageSize 51', 'pageSize=51', 400, 'pageSize'],
	['rejects pageSize -1', 'pageSize=-1', 400, 'pageSize'],
	['rejects pageSize 1.1', 'pageSize=1.1', 400, 'pageSize'],
	['rejects pageSize abc', 'pageSize=abc', 400, 'pageSize'],
	['rejects pageSize 1e1', 'pageSize=1e1', 400, 'pageSize'],
	['minimum size', 'pageSize=1', 200, { page: 1, pageSize: 1, sort: 'title' }],
	['largest page', 'page=9007199254740991', 200, { page: 9007199254740991, pageSize: 10, sort: 'title' }],
	['unknown query ignored', 'unknown=anything', 200, { page: 1, pageSize: 10, sort: 'title' }],
	['first repeated parameter wins', 'pageSize=5&pageSize=51', 200, { page: 1, pageSize: 5, sort: 'title' }],
	['leading zero integer', 'page=01', 200, { page: 1, pageSize: 10, sort: 'title' }],
] as const;

describeFeature(feature, ({ Scenario }) => {
	for (const [name, query, status, expected] of cases) {
		Scenario(name, ({ Given, When, Then }) => {
			const search = vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
			let response: Response;
			Given('a course application service', () => {
				search.mockClear();
			});
			When('the catalog request is sent', async () => {
				const app = createRestApp({
					forRequest: async () => ({
						health: {
							getStatus: () => {
								throw new Error('unused');
							},
						},
						courses: { search },
					}),
				});
				response = await app.request(`/api/courses?${query}`);
			});
			Then('the query is mapped consistently', async () => {
				expect(response.status).toBe(status);
				if (status === 200) {
					expect(search).toHaveBeenCalledWith(expected);
					expect(await response.json()).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
				} else {
					expect(search).not.toHaveBeenCalled();
					expect(await response.json()).toEqual({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field: expected, message: expect.any(String) }] } });
				}
			});
		});
	}
});
