import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const actor = () => actorCalled('API client');

When('the client requests courses with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses${query ? `?${query}` : ''}`))));
Then('the course response status is {int}', async (status: number) => {
	assert.equal(await actor().answer(LastResponse.status()), status);
});
Then('the catalog has {int} items and {int} total matches', async (count: number, total: number) => {
	const body = await actor().answer(LastResponse.body<{ items: unknown[]; totalItems: number; totalPages: number; pageSize: number }>());
	assert.equal(body.items.length, count);
	assert.equal(body.totalItems, total);
	assert.equal(body.totalPages, Math.ceil(total / body.pageSize));
});
Then('the first course ID is {string}', async (id: string) => {
	const body = await actor().answer(LastResponse.body<{ items: { id: string }[] }>());
	assert.equal(body.items[0]?.id, id);
});
Then('the course error code is {string}', async (code: string) => {
	const body = await actor().answer(LastResponse.body<{ error: { code: string } }>());
	assert.equal(body.error.code, code);
});
