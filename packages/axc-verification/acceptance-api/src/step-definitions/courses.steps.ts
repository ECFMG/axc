import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const actor = () => actorCalled('API client');

When('the client searches courses with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course search responds with status {int}', async (status: number) => {
	assert.equal(await actor().answer(LastResponse.status()), status);
});

Then('the course results contain only {string} with page size {int}', async (id: string, pageSize: number) => {
	const body = await actor().answer(LastResponse.body<{ items: { id: string }[]; page: number; pageSize: number; totalItems: number; totalPages: number }>());
	assert.deepEqual(
		body.items.map((course) => course.id),
		[id],
	);
	assert.deepEqual({ ...body, items: [] }, { items: [], page: 1, pageSize, totalItems: 1, totalPages: 1 });
});

Then('the course search reports an invalid page size', async () => {
	assert.deepEqual(await actor().answer(LastResponse.body()), {
		error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }] },
	});
});
