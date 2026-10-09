import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const actor = () => actorCalled('API client');

When('the client requests courses at {string}', (url: string) => actor().attemptsTo(Send.a(GetRequest.to(url))));
Then('the catalog responds with status {int}', async (status: number) => {
	assert.equal(await actor().answer(LastResponse.status()), status);
});
Then('the catalog page contains {int} items with {int} total items and {int} total pages', async (count: number, totalItems: number, totalPages: number) => {
	const body = await actor().answer(LastResponse.body<{ items: unknown[]; totalItems: number; totalPages: number }>());
	assert.equal(body.items.length, count);
	assert.equal(body.totalItems, totalItems);
	assert.equal(body.totalPages, totalPages);
});
Then('the first catalog course is {string}', async (id: string) => {
	const body = await actor().answer(LastResponse.body<{ items: { id: string }[] }>());
	assert.equal(body.items[0]?.id, id);
});
Then('the catalog error identifies {string}', async (field: string) => {
	const body = await actor().answer(LastResponse.body<{ error: { code: string; details: { field: string }[] } }>());
	assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
	assert.equal(body.error.details[0]?.field, field);
});
