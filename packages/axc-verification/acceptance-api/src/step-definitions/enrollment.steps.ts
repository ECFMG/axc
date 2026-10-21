import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';

let history: unknown[] = [];
When('the client completes the enrollment workflow through the running API', async () => {
	const url = 'http://127.0.0.1:7071/api/enrollment-requests';
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ courseId: 'course-001', learnerEmail: `acceptance-${crypto.randomUUID()}@example.org`, justification: 'I need this course for secure development work.' }),
	});
	assert.equal(response.status, 201);
	const created = (await response.json()) as { id: string; status: string };
	assert.equal(created.status, 'pending');
	for (const status of ['approved', 'cancelled']) {
		const update = await fetch(`${url}/${created.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, changedBy: 'acceptance-reviewer' }) });
		assert.equal(update.status, 200);
	}
	const retrieved = await fetch(`${url}/${created.id}`);
	assert.equal(retrieved.status, 200);
	const result = (await retrieved.json()) as { status: string; statusHistory: unknown[] };
	assert.equal(result.status, 'cancelled');
	history = result.statusHistory;
});
Then('the enrollment workflow has three audit entries', () => {
	assert.equal(history.length, 3);
});
