import assert from 'node:assert/strict';
import type { ApplicationServices } from '@axc/application-services';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

type CoursePage = Awaited<ReturnType<ApplicationServices['Catalog']['Course']['queryCourses']>>;
const actor = () => actorCalled('Course catalog client');
const coursePage = () => actor().answer(LastResponse.body<CoursePage>());

When('the client searches courses with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course response status is {int}', async (status: number) => {
	assert.equal(await actor().answer(LastResponse.status()), status);
});

Then('the course ids are {string}', async (ids: string) => {
	const body = await coursePage();
	assert.deepEqual(
		body.items.map((course) => course.id),
		ids === '' ? [] : ids.split(','),
	);
});

Then('the course page has page {int}, page size {int}, total items {int}, and total pages {int}', async (page: number, pageSize: number, totalItems: number, totalPages: number) => {
	const body = await coursePage();
	assert.deepEqual({ page: body.page, pageSize: body.pageSize, totalItems: body.totalItems, totalPages: body.totalPages }, { page, pageSize, totalItems, totalPages });
});

Then('every course has the catalog fields', async () => {
	const body = await coursePage();
	assert.ok(body.items.length > 0);
	for (const course of body.items) {
		assert.deepEqual(Object.keys(course).sort(), ['id', 'title', 'summary', 'modality', 'status', 'tags', 'createdAt', 'updatedAt'].sort());
		assert.equal(typeof course.id, 'string');
		assert.equal(typeof course.title, 'string');
		assert.equal(typeof course.summary, 'string');
		assert.ok(['online', 'in-person', 'hybrid'].includes(course.modality));
		assert.ok(['draft', 'active', 'retired'].includes(course.status));
		assert.ok(Array.isArray(course.tags));
		assert.ok(course.tags.every((tag) => typeof tag === 'string'));
		assert.equal(new Date(course.createdAt).toISOString(), course.createdAt);
		assert.equal(new Date(course.updatedAt).toISOString(), course.updatedAt);
	}
});

Then('courses are ascending by {string}', async (field: string) => {
	assert.ok(field === 'title' || field === 'createdAt' || field === 'updatedAt');
	const body = await coursePage();
	const values = body.items.map((course) => course[field]);
	assert.equal(values.length, 12);
	assert.deepEqual(
		values,
		[...values].sort((left, right) => left.localeCompare(right)),
	);
});

Then('the course query error identifies {string}', async (field: string) => {
	const body = await actor().answer(LastResponse.body<{ error: { code: string; message: string; details: { field: string; message: string }[] } }>());
	assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
	assert.equal(body.error.message, 'One or more query parameters are invalid.');
	assert.equal(body.error.details.length, 1);
	assert.equal(body.error.details[0]?.field, field);
	assert.ok(body.error.details[0]?.message);
});
