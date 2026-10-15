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
const actor = () => actorCalled('Catalog client');
const catalogBody = () => actor().answer(LastResponse.body<CatalogResponse>());
When('the catalog client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));
Then('the catalog status is {int}', async (status: number) => {
	assert.equal(await actor().answer(LastResponse.status()), status);
});
Then('the catalog page is {int} with size {int} and total {int}', async (page: number, pageSize: number, totalItems: number) => {
	const body = await catalogBody();
	assert.equal(body.page, page);
	assert.equal(body.pageSize, pageSize);
	assert.equal(body.totalItems, totalItems);
	assert.equal(body.totalPages, Math.ceil(totalItems / pageSize));
});
Then('the catalog contains {int} items', async (count: number) => {
	assert.equal((await catalogBody()).items.length, count);
});
Then('the catalog course IDs are {string}', async (ids: string) => {
	assert.deepEqual(
		(await catalogBody()).items.map((course) => course.id),
		ids.split(','),
	);
});
Then('every catalog course has {string} equal to {string}', async (field: 'modality' | 'status', value: string) => {
	const body = await catalogBody();
	assert.ok(body.items.length > 0);
	assert.ok(body.items.every((course) => course[field] === value));
});
Then('the catalog is sorted by {string}', async (field: 'title' | 'createdAt' | 'updatedAt') => {
	const values = (await catalogBody()).items.map((course) => course[field]);
	assert.deepEqual(
		values,
		[...values].sort((a, b) => a.localeCompare(b)),
	);
});
Then('catalog courses have all required fields', async () => {
	for (const course of (await catalogBody()).items) {
		for (const value of [course.id, course.title, course.summary]) {
			assert.equal(typeof value, 'string');
			assert.ok(value.length > 0);
		}
		assert.ok(['online', 'in-person', 'hybrid'].includes(course.modality));
		assert.ok(['draft', 'active', 'retired'].includes(course.status));
		assert.ok(Array.isArray(course.tags));
		assert.equal(new Date(course.createdAt).toISOString(), course.createdAt);
		assert.equal(new Date(course.updatedAt).toISOString(), course.updatedAt);
	}
});
Then('the catalog error identifies {string}', async (field: string) => {
	const body = await actor().answer(LastResponse.body<{ error: { code: string; message: string; details: { field: string; message: string }[] } }>());
	assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
	assert.equal(body.error.message, 'One or more query parameters are invalid.');
	assert.ok(body.error.details.some((detail) => detail.field === field && detail.message.length > 0));
});
