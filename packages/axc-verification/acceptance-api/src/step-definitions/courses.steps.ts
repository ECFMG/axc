import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

interface CatalogCourse {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}
interface CatalogResponse {
	items: CatalogCourse[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
const catalogActor = () => actorCalled('API client');
const catalogBody = () => catalogActor().answer(LastResponse.body<CatalogResponse>());

When('the catalog client requests {string}', (query: string) => catalogActor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the catalog responds with status {int}', async (status: number) => {
	assert.equal(await catalogActor().answer(LastResponse.status()), status);
});

Then('the catalog has page {int} and page size {int}', async (page: number, pageSize: number) => {
	const body = await catalogBody();
	assert.equal(body.page, page);
	assert.equal(body.pageSize, pageSize);
});

Then('the catalog contains {int} courses out of {int} across {int} pages', async (count: number, totalItems: number, totalPages: number) => {
	const body = await catalogBody();
	assert.equal(body.items.length, count);
	assert.equal(body.totalItems, totalItems);
	assert.equal(body.totalPages, totalPages);
});

Then('every catalog course has the required model fields', async () => {
	const body = await catalogBody();
	assert.ok(body.items.length > 0);
	for (const course of body.items) {
		for (const field of ['id', 'title', 'summary', 'createdAt', 'updatedAt'] as const) {
			assert.equal(typeof course[field], 'string');
			assert.ok(course[field].length > 0);
		}
		assert.ok(['online', 'in-person', 'hybrid'].includes(course.modality));
		assert.ok(['draft', 'active', 'retired'].includes(course.status));
		assert.ok(Array.isArray(course.tags));
		assert.ok(course.tags.every((tag) => typeof tag === 'string'));
		assert.equal(new Date(course.createdAt).toISOString(), course.createdAt);
		assert.equal(new Date(course.updatedAt).toISOString(), course.updatedAt);
	}
});

Then('the catalog contains course ids {string}', async (ids: string) => {
	const body = await catalogBody();
	assert.deepEqual(body.items.map((course) => course.id).sort(), ids.split(',').sort());
});

Then('every catalog course has {string} equal to {string}', async (field: string, value: string) => {
	const body = await catalogBody();
	assert.ok(body.items.length > 0);
	for (const course of body.items) {
		if (field === 'tag') {
			assert.ok(course.tags.some((tag) => tag.toLowerCase() === value.toLowerCase()));
		} else if (field === 'modality' || field === 'status') {
			assert.equal(course[field], value);
		} else {
			assert.fail(`Unsupported filter assertion: ${field}`);
		}
	}
});

Then('the catalog is sorted by {string}', async (sort: string) => {
	assert.ok(sort === 'title' || sort === 'createdAt' || sort === 'updatedAt');
	const body = await catalogBody();
	assert.ok(body.items.length > 1);
	const values = body.items.map((course) => course[sort]);
	assert.deepEqual(values, [...values].sort());
});

Then('the catalog reports an invalid query parameter {string}', async (field: string) => {
	const body = await catalogActor().answer(LastResponse.body<{ error: { code: string; message: string; details: { field: string; message: string }[] } }>());
	assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
	assert.equal(body.error.message, 'One or more query parameters are invalid.');
	assert.ok(body.error.details.some((detail) => detail.field === field && detail.message.length > 0));
});
