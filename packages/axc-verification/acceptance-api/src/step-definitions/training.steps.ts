import { strict as assert } from 'node:assert';
import { Then, When } from '@cucumber/cucumber';

let response: Response;
let data: unknown;
let requestId = '';
const origin = 'http://127.0.0.1:7071';
const send = async (method: string, route: string, body?: string) => {
	response = await fetch(origin + route.replace('$requestId', requestId), { method, ...(body ? { headers: { 'content-type': 'application/json' }, body } : {}) });
	data = await response.json();
	if (response.status === 201 && data && typeof data === 'object' && 'id' in data) requestId = String(data.id);
};
When('the training client sends GET {string}', async (route: string) => {
	await send('GET', route);
});
When('the training client sends POST {string} with JSON', async (route: string, body: string) => {
	await send('POST', route, body);
});
When('the training client sends PATCH {string} with JSON', async (route: string, body: string) => {
	await send('PATCH', route, body);
});
Then('the training response is {int} with error {string}', (status: number, code: string) => {
	assert.equal(response.status, status);
	assert.equal((data as { error: { code: string } }).error.code, code);
});
Then('the training response is {int} with course IDs {string}', (status: number, ids: string) => {
	assert.equal(response.status, status);
	assert.deepEqual(
		(data as { items: { id: string }[] }).items.map((item) => item.id),
		ids.split(','),
	);
});
Then('the training response is {int} with status {string} and {int} history entries', (status: number, current: string, count: number) => {
	assert.equal(response.status, status);
	const item = data as { status: string; statusHistory: { toStatus: string }[] };
	assert.equal(item.status, current);
	assert.equal(item.statusHistory.length, count);
	assert.equal(item.statusHistory[count - 1]?.toStatus, current);
});
Then('the training response is {int} with {int} enrollment items', (status: number, count: number) => {
	assert.equal(response.status, status);
	assert.equal((data as { items: unknown[] }).items.length, count);
});
