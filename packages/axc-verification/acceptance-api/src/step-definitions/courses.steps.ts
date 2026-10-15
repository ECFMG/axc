import assert from 'node:assert/strict';
import type { CourseSearchResult } from '@axc/application-services';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const actor = () => actorCalled('API client');
const coursesBody = () => actor().answer(LastResponse.body<CourseSearchResult>());

When('the client requests courses with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the courses response status is {int}', async (status: number) => {
	assert.equal(await actor().answer(LastResponse.status()), status);
});

Then('course pagination is page {int} size {int} total {int} pages {int}', async (page: number, pageSize: number, totalItems: number, totalPages: number) => {
	const body = await coursesBody();
	assert.deepEqual({ page: body.page, pageSize: body.pageSize, totalItems: body.totalItems, totalPages: body.totalPages }, { page, pageSize, totalItems, totalPages });
});

Then('the courses contain {int} items', async (count: number) => {
	assert.equal((await coursesBody()).items.length, count);
});

Then('the course ids are {string}', async (ids: string) => {
	assert.deepEqual(
		(await coursesBody()).items.map((course) => course.id),
		ids.split(','),
	);
});

Then('every course has modality {string}', async (modality: string) => {
	const { items } = await coursesBody();
	assert.ok(items.length > 0);
	assert.ok(items.every((course) => course.modality === modality));
});

Then('every course has status {string}', async (status: string) => {
	const { items } = await coursesBody();
	assert.ok(items.length > 0);
	assert.ok(items.every((course) => course.status === status));
});

Then('courses are sorted by {string}', async (field: string) => {
	assert.ok(field === 'title' || field === 'createdAt' || field === 'updatedAt');
	const values = (await coursesBody()).items.map((course) => course[field]);
	assert.deepEqual(
		values,
		[...values].sort((left, right) => left.localeCompare(right, 'en')),
	);
});

Then('the courses error identifies {string}', async (field: string) => {
	const { error } = await actor().answer(LastResponse.body<{ error: { code: string; message: string; details: { field: string; message: string }[] } }>());
	assert.equal(error.code, 'INVALID_QUERY_PARAMETER');
	assert.equal(error.message, 'One or more query parameters are invalid.');
	assert.ok(error.details.some((detail) => detail.field === field && detail.message.length > 0));
});
