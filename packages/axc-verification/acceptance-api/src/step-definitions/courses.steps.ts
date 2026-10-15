import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

interface CourseResponse {
	items: { id: string; title: string; summary: string; modality: string; status: string; tags: string[]; createdAt: string; updatedAt: string }[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
const actor = () => actorCalled('API client');
const body = () => actor().answer(LastResponse.body<CourseResponse>());

When('the client searches courses at {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));
Then('the course response status is {int}', async (status: number) => {
	assert.equal(await actor().answer(LastResponse.status()), status);
});
Then('the default course catalog is paginated', async () => {
	const result = await body();
	assert.equal(result.page, 1);
	assert.equal(result.pageSize, 10);
	assert.equal(result.items.length, 10);
	assert.equal(result.totalItems, 12);
	assert.equal(result.totalPages, 2);
	const titles = result.items.map((course) => course.title);
	assert.deepEqual(
		titles,
		[...titles].sort((a, b) => a.localeCompare(b)),
	);
	for (const course of result.items) {
		assert.equal(typeof course.id, 'string');
		assert.equal(typeof course.summary, 'string');
		assert.ok(['online', 'in-person', 'hybrid'].includes(course.modality));
		assert.ok(['draft', 'active', 'retired'].includes(course.status));
		assert.ok(Array.isArray(course.tags));
		assert.equal(new Date(course.createdAt).toISOString(), course.createdAt);
		assert.equal(new Date(course.updatedAt).toISOString(), course.updatedAt);
	}
});
Then('the course ids are {string}', async (expected: string) => {
	assert.deepEqual((await body()).items.map((course) => course.id).sort(), expected ? expected.split(',').sort() : []);
});
Then('all courses match {string} with {string}', async (field: string, value: string) => {
	const result = await body();
	assert.ok(result.items.length > 0);
	for (const course of result.items) {
		if (field === 'tag') assert.ok(course.tags.some((tag) => tag.toLowerCase() === value));
		else if (field === 'modality' || field === 'status') assert.equal(course[field], value);
		else assert.fail(`Unsupported filter ${field}`);
	}
});
Then('the course page is {int} with size {int} total {int} and pages {int}', async (page: number, pageSize: number, totalItems: number, totalPages: number) => {
	const result = await body();
	assert.deepEqual({ page: result.page, pageSize: result.pageSize, totalItems: result.totalItems, totalPages: result.totalPages }, { page, pageSize, totalItems, totalPages });
	assert.equal(result.items.length, Math.min(pageSize, Math.max(0, totalItems - (page - 1) * pageSize)));
});
Then('the courses are sorted by {string}', async (field: string) => {
	assert.ok(field === 'title' || field === 'createdAt' || field === 'updatedAt');
	const result = await body();
	assert.equal(result.items.length, 12);
	assert.equal(new Set(result.items.map((course) => course.id)).size, 12);
	const values = result.items.map((course) => course[field]);
	assert.deepEqual(
		values,
		[...values].sort((a, b) => a.localeCompare(b)),
	);
});
Then('the course error identifies {string}', async (field: string) => {
	const result = await actor().answer(LastResponse.body<{ error: { code: string; message: string; details: { field: string; message: string }[] } }>());
	assert.equal(result.error.code, 'INVALID_QUERY_PARAMETER');
	assert.equal(result.error.message, 'One or more query parameters are invalid.');
	assert.ok(result.error.details.some((detail) => detail.field === field && detail.message.length > 0));
});
