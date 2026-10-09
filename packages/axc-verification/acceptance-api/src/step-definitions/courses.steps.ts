import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const actor = () => actorCalled('API client');

When('the client requests courses at {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));
Then('the catalog responds with status {int}', async (status: number) => {
	assert.equal(await actor().answer(LastResponse.status()), status);
});
Then('the catalog page has {int} items, page {int}, page size {int}, total {int}, and {int} pages', async (items: number, page: number, pageSize: number, totalItems: number, totalPages: number) => {
	const body = await actor().answer(LastResponse.body<{ items: unknown[]; page: number; pageSize: number; totalItems: number; totalPages: number }>());
	assert.equal(body.items.length, items);
	assert.deepEqual({ page: body.page, pageSize: body.pageSize, totalItems: body.totalItems, totalPages: body.totalPages }, { page, pageSize, totalItems, totalPages });
});
Then('the first course is {string}', async (id: string) => {
	const body = await actor().answer(LastResponse.body<{ items: { id: string }[] }>());
	assert.equal(body.items[0]?.id, id);
});
Then('the catalog error identifies {string}', async (field: string) => {
	const body = await actor().answer(LastResponse.body<{ error: { code: string; message: string; details: { field: string; message: string }[] } }>());
	assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
	assert.equal(body.error.message, 'One or more query parameters are invalid.');
	assert.equal(body.error.details[0]?.field, field);
	assert.ok(body.error.details[0]?.message);
});
