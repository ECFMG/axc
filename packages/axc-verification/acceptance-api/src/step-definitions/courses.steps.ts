import assert from 'node:assert/strict';
import type { Domain } from '@axc/domain';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

type Course = Domain.Contexts.Catalog.Course.Course;
type CoursePage = Domain.Contexts.Catalog.Course.CoursePage;
const actor = () => actorCalled('API client');
const body = () => actor().answer(LastResponse.body<CoursePage>());

When('the client requests courses with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));
Then('the course response status is {int}', async (status: number) => {
	assert.equal(await actor().answer(LastResponse.status()), status);
});
Then('the course page is {int} with size {int} and total {int}', async (page: number, pageSize: number, total: number) => {
	const result = await body();
	assert.equal(result.page, page);
	assert.equal(result.pageSize, pageSize);
	assert.equal(result.totalItems, total);
	assert.equal(result.totalPages, Math.ceil(total / pageSize));
	assert.equal(result.items.length, Math.max(0, Math.min(pageSize, total - (page - 1) * pageSize)));
});
Then('the matching course ids are {string}', async (ids: string) => {
	const actual = (await body()).items.map((course) => course.id).sort();
	assert.deepEqual(actual, ids ? ids.split(',').sort() : []);
});
Then('the course items are sorted by {string}', async (field: string) => {
	assert.ok(field === 'title' || field === 'createdAt' || field === 'updatedAt');
	const values = (await body()).items.map((course) => course[field]);
	assert.deepEqual(values, [...values].sort());
});
Then('every course has the catalog fields', async () => {
	for (const course of (await body()).items) {
		const fields: (keyof Course)[] = ['id', 'title', 'summary', 'modality', 'status', 'tags', 'createdAt', 'updatedAt'];
		assert.deepEqual(Object.keys(course).sort(), fields.sort());
		assert.ok(Array.isArray(course.tags));
		assert.equal(new Date(course.createdAt).toISOString(), course.createdAt);
		assert.equal(new Date(course.updatedAt).toISOString(), course.updatedAt);
	}
});
Then('the course validation error names {string}', async (field: string) => {
	const result = await actor().answer(LastResponse.body<{ error: { code: string; message: string; details: { field: string; message: string }[] } }>());
	assert.equal(result.error.code, 'INVALID_QUERY_PARAMETER');
	assert.equal(result.error.message, 'One or more query parameters are invalid.');
	assert.ok(result.error.details.some((detail) => detail.field === field && detail.message.length > 0));
});
