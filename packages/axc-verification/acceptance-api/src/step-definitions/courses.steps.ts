import assert from 'node:assert/strict';
import type { Course, CourseSearchResult } from '@axc/domain';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const actor = () => actorCalled('API client');
const body = () => actor().answer(LastResponse.body<CourseSearchResult>());

When('the client requests courses {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses${query}`))));
Then('the courses response has status {int}', async (status: number) => {
	assert.equal(await actor().answer(LastResponse.status()), status);
});
Then('the matching course ids are {string}', async (ids: string) => {
	const result = await body();
	assert.deepEqual(
		result.items.map((course) => course.id),
		ids ? ids.split(',') : [],
	);
});
Then('the catalog uses default pagination and valid course records', async () => {
	const result = await body();
	assert.equal(result.page, 1);
	assert.equal(result.pageSize, 10);
	assert.equal(result.items.length, 10);
	assert.ok(result.totalItems >= 12);
	assert.equal(result.totalPages, Math.ceil(result.totalItems / 10));
	await actor().attemptsTo(Send.a(GetRequest.to('/api/courses?pageSize=50')));
	const all = (await body()).items;
	assert.equal(new Set(all.map((course) => course.id)).size, all.length);
	assert.deepEqual(new Set(all.map((course) => course.modality)), new Set(['online', 'hybrid', 'in-person']));
	assert.deepEqual(new Set(all.map((course) => course.status)), new Set(['active', 'draft', 'retired']));
	for (const course of all) {
		for (const field of ['id', 'title', 'summary'] as const) assert.ok(typeof course[field] === 'string' && course[field].length > 0);
		assert.ok(Array.isArray(course.tags) && course.tags.length > 0 && course.tags.every((tag) => typeof tag === 'string'));
		for (const field of ['createdAt', 'updatedAt'] as const) assert.equal(new Date(course[field]).toISOString(), course[field]);
	}
});
Then('the catalog page is {int} with size {int} and {int} total items and {int} total pages', async (page: number, pageSize: number, totalItems: number, totalPages: number) => {
	const result = await body();
	assert.deepEqual({ page: result.page, pageSize: result.pageSize, totalItems: result.totalItems, totalPages: result.totalPages }, { page, pageSize, totalItems, totalPages });
	assert.equal(result.items.length, Math.min(pageSize, Math.max(0, totalItems - (page - 1) * pageSize)));
});
Then('the catalog is sorted by {string}', async (field: keyof Pick<Course, 'title' | 'createdAt' | 'updatedAt'>) => {
	const result = await body();
	assert.equal(result.items.length, result.totalItems);
	const values = result.items.map((course) => course[field]);
	assert.deepEqual(
		values,
		[...values].sort((a, b) => a.localeCompare(b)),
	);
});
Then('the catalog error identifies {string}', async (field: string) => {
	const result = await actor().answer(LastResponse.body<{ error: { code: string; message: string; details: { field: string; message: string }[] } }>());
	assert.equal(result.error.code, 'INVALID_QUERY_PARAMETER');
	assert.equal(result.error.message, 'One or more query parameters are invalid.');
	assert.ok(result.error.details.some((detail) => detail.field === field && detail.message.length > 0));
});
