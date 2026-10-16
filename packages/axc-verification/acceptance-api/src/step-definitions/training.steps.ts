import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Then, When } from '@cucumber/cucumber';
import { apiServer } from '../infrastructure.ts';

const origin = () => new URL(apiServer.getUrl()).origin;
let response: Response;
interface ResponseBody {
	items: Array<{ status: string; title: string; summary: string; tags: string[] }>;
	page: number;
	id: string;
	status: string;
	courseId: string;
	learnerEmail: string;
	statusHistory: Array<{ fromStatus: string | null; toStatus: string }>;
	error: { code: string };
}
let body: ResponseBody;
let requestId = '';
let learnerEmail = '';
const justification = 'I need this course for secure development work.';
const history = (index: number) => {
	const entry = body.statusHistory[index];
	assert.ok(entry);
	return entry;
};
const send = async (path: string, init?: RequestInit) => {
	response = await fetch(`${origin()}${path}`, init);
	body = (await response.json()) as ResponseBody;
};
const post = async (courseId: string, email: string) => send('/api/enrollment-requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ courseId, learnerEmail: email, justification }) });
const patch = async (status: string, reason?: string) =>
	send(`/api/enrollment-requests/${requestId}/status`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status, changedBy: 'reviewer@example.org', reason }) });

When('I search courses with security search and active status', async () => send('/api/courses?q=SeCuRiTy&status=active'));
Then('the course response is 200 with security courses', () => {
	assert.equal(response.status, 200);
	assert.ok(body.items.length > 0);
	assert.ok(
		body.items.every(
			(item: { status: string; title: string; summary: string; tags: string[] }) => item.status === 'active' && [item.title, item.summary, ...item.tags].some((text: string) => text.toLowerCase().includes('security')),
		),
	);
	assert.equal(body.page, 1);
});
When('I search courses with invalid modality', async () => send('/api/courses?modality=remote'));
When('I POST a valid enrollment request', async () => {
	learnerEmail = `learner-${randomUUID()}@example.org`;
	await post('course-001', learnerEmail);
	requestId = body.id;
});
Then('the created request is 201 and pending with creation history', () => {
	assert.equal(response.status, 201);
	assert.equal(body.status, 'pending');
	assert.equal(body.courseId, 'course-001');
	assert.equal(body.learnerEmail, learnerEmail);
	assert.equal(body.statusHistory.length, 1);
	assert.equal(history(0).fromStatus, null);
	assert.equal(history(0).toStatus, 'pending');
});
When('I GET the created enrollment request by ID', async () => send(`/api/enrollment-requests/${requestId}`));
Then('the retrieved request is 200 with creation history', () => {
	assert.equal(response.status, 200);
	assert.equal(body.id, requestId);
	assert.equal(body.statusHistory.length, 1);
});
When('I GET enrollment requests filtered by learner email', async () => send(`/api/enrollment-requests?learnerEmail=${encodeURIComponent(learnerEmail)}`));
Then('the list is 200 and contains the created request', () => {
	assert.equal(response.status, 200);
	assert.ok(Array.isArray(body));
	assert.ok((body as unknown as Array<{ id: string }>).some((item) => item.id === requestId));
});
When('I PATCH the created request to approved', async () => patch('approved'));
Then('the updated request is 200 and has approval history', () => {
	assert.equal(response.status, 200);
	assert.equal(body.status, 'approved');
	assert.equal(history(1).fromStatus, 'pending');
	assert.equal(history(1).toStatus, 'approved');
});
When('I PATCH the created request to cancelled', async () => patch('cancelled'));
Then('the updated request is 200 and has cancellation history', () => {
	assert.equal(response.status, 200);
	assert.equal(body.status, 'cancelled');
	assert.equal(body.statusHistory.length, 3);
	assert.equal(history(2).fromStatus, 'approved');
});
When('I POST an enrollment request for missing course', async () => post('missing', `learner-${randomUUID()}@example.org`));
When('I POST an enrollment request for inactive course', async () => post('course-007', `learner-${randomUUID()}@example.org`));
When('I POST an enrollment request with invalid email', async () => post('course-001', 'invalid'));
When('I POST the same enrollment request again', async () => post('course-001', learnerEmail));
When('I PATCH the created request to rejected without reason', async () => patch('rejected'));
When('I PATCH the created request to pending', async () => patch('pending'));
When('I GET a missing enrollment request', async () => send('/api/enrollment-requests/missing'));
Then('the API error is {int} {word}', (status: number, code: string) => {
	assert.equal(response.status, status);
	assert.equal(body.error.code, code);
});
