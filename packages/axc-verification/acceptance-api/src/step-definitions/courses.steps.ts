import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

interface Course {
	id: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
	title: string;
}
interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
interface CourseError {
	error: { code: string; message: string; details: { field: string; message: string }[] };
}
const actor = () => actorCalled('API client');

When('the client requests courses with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses${query ? `?${query}` : ''}`))));

Then('the course response has status {int}', async (status: number) => {
	assert.equal(await actor().answer(LastResponse.status()), status);
});

Then('the course page has {int} items, page {int}, page size {int}, total {int}', async (count: number, page: number, pageSize: number, total: number) => {
	const body = await actor().answer(LastResponse.body<CoursePage>());
	assert.equal(body.items.length, count);
	assert.equal(body.page, page);
	assert.equal(body.pageSize, pageSize);
	assert.equal(body.totalItems, total);
	assert.equal(body.totalPages, Math.ceil(total / pageSize));
});

Then('the course results include {string}', async (id: string) => {
	const body = await actor().answer(LastResponse.body<CoursePage>());
	assert.ok(body.items.some((item) => item.id === id));
});

Then('every course has {string} equal to {string}', async (field: 'modality' | 'status' | 'tags', value: string) => {
	const body = await actor().answer(LastResponse.body<CoursePage>());
	assert.ok(body.items.length > 0);
	assert.ok(body.items.every((item) => (field === 'tags' ? item.tags.some((tag) => tag.toLowerCase() === value) : item[field] === value)));
});

Then('the course results contain only {string}', async (id: string) => {
	const body = await actor().answer(LastResponse.body<CoursePage>());
	assert.deepEqual(
		body.items.map((item) => item.id),
		[id],
	);
	assert.equal(body.totalItems, 1);
});

Then('the course results are sorted by {string}', async (field: 'createdAt' | 'updatedAt' | 'title') => {
	const body = await actor().answer(LastResponse.body<CoursePage>());
	assert.deepEqual(
		body.items.map((item) => item[field]),
		body.items.map((item) => item[field]).sort(),
	);
});

Then('the course error identifies {string}', async (field: string) => {
	const body = await actor().answer(LastResponse.body<CourseError>());
	assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
	assert.equal(body.error.message, 'One or more query parameters are invalid.');
	assert.ok(body.error.details.some((detail) => detail.field === field));
});
