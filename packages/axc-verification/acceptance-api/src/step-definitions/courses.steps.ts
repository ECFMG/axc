import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const actor = () => actorCalled('API client');
When('the client searches courses with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));
Then('the courses response has status {int}', async (status: number) => {
	assert.equal(await actor().answer(LastResponse.status()), status);
});
Then('the course ids are {string}', async (ids: string) => {
	const body = await actor().answer(LastResponse.body());
	assert.deepEqual(
		body.items.map((course: { id: string }) => course.id),
		ids === '' ? [] : ids.split(','),
	);
	for (const course of body.items) {
		assert.deepEqual(Object.keys(course).sort(), ['createdAt', 'id', 'modality', 'status', 'summary', 'tags', 'title', 'updatedAt']);
		assert.equal(new Date(course.createdAt).toISOString(), course.createdAt);
		assert.equal(new Date(course.updatedAt).toISOString(), course.updatedAt);
	}
});
Then('course pagination is {int}, {int}, {int}, {int}', async (page: number, pageSize: number, totalItems: number, totalPages: number) => {
	const body = await actor().answer(LastResponse.body());
	assert.deepEqual({ page: body.page, pageSize: body.pageSize, totalItems: body.totalItems, totalPages: body.totalPages }, { page, pageSize, totalItems, totalPages });
});
Then('the invalid course query identifies {string}', async (field: string) => {
	const body = await actor().answer(LastResponse.body());
	assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
	assert.equal(body.error.message, 'One or more query parameters are invalid.');
	assert.equal(body.error.details.length, 1);
	assert.equal(body.error.details[0].field, field);
	assert.equal(typeof body.error.details[0].message, 'string');
});
