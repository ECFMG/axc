import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

interface CourseResponse {
	items: { id: string }[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

const actor = () => actorCalled('API client');

When('the client requests courses with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses${query}`))));

Then('the course response status is {int}', async (status: number) => {
	assert.equal(await actor().answer(LastResponse.status()), status);
});

Then('the course response has page {int}, page size {int}, total {int}, and {int} items', async (page: number, pageSize: number, total: number, itemCount: number) => {
	const body = await actor().answer(LastResponse.body<CourseResponse>());
	assert.equal(body.page, page);
	assert.equal(body.pageSize, pageSize);
	assert.equal(body.totalItems, total);
	assert.equal(body.totalPages, Math.ceil(total / pageSize));
	assert.equal(body.items.length, itemCount);
});

Then('the course response contains only {string}', async (id: string) => {
	const body = await actor().answer(LastResponse.body<CourseResponse>());
	assert.deepEqual(
		body.items.map((item) => item.id),
		[id],
	);
});

Then('the first course is {string}', async (id: string) => {
	const body = await actor().answer(LastResponse.body<CourseResponse>());
	assert.equal(body.items[0]?.id, id);
});

Then('the course error code is {string} for {string}', async (code: string, field: string) => {
	const body = await actor().answer(LastResponse.body<{ error: { code: string; message: string; details: { field: string; message: string }[] } }>());
	assert.equal(body.error.code, code);
	assert.equal(body.error.message, 'One or more query parameters are invalid.');
	assert.ok(body.error.details.some((detail) => detail.field === field));
});
