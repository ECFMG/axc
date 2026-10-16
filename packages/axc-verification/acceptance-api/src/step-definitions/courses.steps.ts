import assert from 'node:assert/strict';
import type { Domain } from '@axc/domain';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

type CoursePage = Domain.Contexts.Catalog.Course.CoursePage;
const actor = () => actorCalled('Catalog client');
async function catalogPage(): Promise<CoursePage> {
	assert.equal(await actor().answer(LastResponse.status()), 200);
	return actor().answer(LastResponse.body<CoursePage>());
}
When('the catalog client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));
Then('the catalog has default pagination and the course contract', async () => {
	const body = await catalogPage();
	assert.equal(body.page, 1);
	assert.equal(body.pageSize, 10);
	assert.equal(body.totalItems, 12);
	assert.equal(body.totalPages, 2);
	assert.equal(body.items.length, 10);
	assert.deepEqual(
		body.items.map((item) => item.title),
		body.items.map((item) => item.title).sort(),
	);
	for (const item of body.items) {
		assert.deepEqual(Object.keys(item).sort(), ['createdAt', 'id', 'modality', 'status', 'summary', 'tags', 'title', 'updatedAt']);
		assert.equal(typeof item.id, 'string');
		assert.equal(typeof item.title, 'string');
		assert.equal(typeof item.summary, 'string');
		assert.ok(['online', 'in-person', 'hybrid'].includes(item.modality));
		assert.ok(['draft', 'active', 'retired'].includes(item.status));
		assert.ok(Array.isArray(item.tags));
		assert.ok(item.tags.every((tag) => typeof tag === 'string'));
		assert.equal(new Date(item.createdAt).toISOString(), item.createdAt);
		assert.equal(new Date(item.updatedAt).toISOString(), item.updatedAt);
	}
});
Then('the catalog contains exactly {string}', async (ids: string) => {
	const body = await catalogPage();
	const expected = ids === '' ? [] : ids.split(',');
	assert.deepEqual(body.items.map((item) => item.id).sort(), expected);
	assert.equal(body.totalItems, expected.length);
	assert.equal(body.totalPages, expected.length === 0 ? 0 : 1);
	assert.equal(body.page, 1);
	assert.equal(body.pageSize, 10);
});
Then('the catalog has the second page of five courses', async () => {
	const body = await catalogPage();
	assert.equal(body.page, 2);
	assert.equal(body.pageSize, 5);
	assert.equal(body.totalItems, 12);
	assert.equal(body.totalPages, 3);
	assert.equal(body.items.length, 5);
	await actor().attemptsTo(Send.a(GetRequest.to('/api/courses?pageSize=50')));
	const all = await catalogPage();
	assert.deepEqual(body.items, all.items.slice(5, 10));
});
Then('the catalog is sorted by {string}', async (field: 'title' | 'createdAt' | 'updatedAt') => {
	const body = await catalogPage();
	assert.ok(body.items.length > 1);
	const values = body.items.map((item) => item[field]);
	assert.deepEqual(values, [...values].sort());
});
Then('the catalog rejects field {string} consistently', async (field: string) => {
	assert.equal(await actor().answer(LastResponse.status()), 400);
	const body = await actor().answer(LastResponse.body<{ error: { code: string; message: string; details: { field: string; message: string }[] } }>());
	assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
	assert.equal(body.error.message, 'One or more query parameters are invalid.');
	assert.equal(body.error.details.length, 1);
	assert.equal(body.error.details[0]?.field, field);
	assert.ok(body.error.details[0]?.message);
});
