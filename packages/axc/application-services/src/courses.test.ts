import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory } from './index.ts';

const services = () => buildApplicationServicesFactory({ environment: 'test' }).forRequest();
const code = (promise: Promise<unknown>) =>
	promise.then(
		() => 'OK',
		(error: { code: string }) => error.code,
	);

describe('course service', () => {
	it('searches courses with pagination metadata', async () => {
		const { courses } = await services();
		expect(await courses.search({ pageSize: '5' })).toMatchObject({ page: 1, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect(await code(courses.search({ sort: 'price' }))).toBe('INVALID_QUERY_PARAMETER');
	});
});
