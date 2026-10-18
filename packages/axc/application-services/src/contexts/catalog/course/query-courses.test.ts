import { Persistence } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { queryCourses } from './query-courses.ts';

const search = queryCourses(Persistence().withSystemPassport());
describe('catalog query service', () => {
	it('applies defaults for direct callers', async () => {
		expect(await search({})).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
	});
	it('enforces query rules for direct callers', async () => {
		await expect(search({ modality: 'remote', page: 0 })).rejects.toMatchObject({
			details: [
				{ field: 'modality', message: expect.any(String) },
				{ field: 'page', message: expect.any(String) },
			],
		});
	});
});
