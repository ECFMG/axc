import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

const actor = () => actorCalled('API client');
let requestId = '';
const body = { courseId: 'course-001', learnerEmail: 'acceptance@example.org', justification: 'I need this course to improve my secure development skills.' };
let learnerSequence = 0;
let currentBody = body;
const response = async () => actor().answer(LastResponse.body<unknown>());
const status = async () => actor().answer(LastResponse.status());
When('the client requests courses with status active', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses?status=active'))));
Then('the course response contains active courses', async () => {
	if ((await status()) !== 200) throw new Error('Expected course search success');
	const data = (await response()) as { items: { status: string }[]; totalItems: number };
	if (!data.items.length || data.items.some((item) => item.status !== 'active')) throw new Error('Course filter failed');
});
When('the client requests courses with an invalid page size', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses?pageSize=51'))));
When('the client creates an enrollment request', () => {
	currentBody = { ...body, learnerEmail: `acceptance-${++learnerSequence}@example.org` };
	return actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with(currentBody)));
});
Then('the created request is pending with a history entry', async () => {
	if ((await status()) !== 201) throw new Error('Expected creation');
	const data = (await response()) as { id: string; status: string; statusHistory: { toStatus: string }[] };
	requestId = data.id;
	if (data.status !== 'pending' || data.statusHistory[0]?.toStatus !== 'pending') throw new Error('Creation audit failed');
});
When('the client retrieves the created request', () => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${requestId}`))));
Then('the API responds with status 200 and a request history', async () => {
	if ((await status()) !== 200) throw new Error('Expected retrieval');
	const data = (await response()) as { id: string; statusHistory: unknown[] };
	if (data.id !== requestId || data.statusHistory.length !== 1) throw new Error('Request retrieval failed');
});
When('the client lists pending requests', () => actor().attemptsTo(Send.a(GetRequest.to('/api/enrollment-requests?status=pending'))));
Then('the API responds with status 200 and includes the created request', async () => {
	if ((await status()) !== 200) throw new Error('Expected list success');
	const data = (await response()) as { id: string }[];
	if (!data.some((item) => item.id === requestId)) throw new Error('Request missing from list');
});
When('the client approves the created request', () => actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${requestId}/status`).with({ status: 'approved', changedBy: 'reviewer' }))));
Then('the API responds with status 200 and an approval history entry', async () => {
	if ((await status()) !== 200) throw new Error('Expected approval');
	const data = (await response()) as { status: string; statusHistory: { fromStatus: string; toStatus: string }[] };
	if (data.status !== 'approved' || data.statusHistory[1]?.fromStatus !== 'pending' || data.statusHistory[1]?.toStatus !== 'approved') throw new Error('Approval audit failed');
});
When('the client creates the same enrollment request again', () => actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with(currentBody))));
When('the client creates a request for a missing course', () => actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with({ ...body, courseId: 'missing' }))));
When('the client creates a request with invalid email', () => actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with({ ...body, learnerEmail: 'invalid' }))));
When('the client changes a missing request', () => actor().attemptsTo(Send.a(PatchRequest.to('/api/enrollment-requests/missing/status').with({ status: 'approved', changedBy: 'reviewer' }))));
Then(/^the API responds with status (\d+) and code (\w+)$/, async (expected: string, code: string) => {
	if ((await status()) !== Number(expected)) throw new Error(`Expected status ${expected}`);
	const data = (await response()) as { error: { code: string } };
	if (data.error.code !== code) throw new Error(`Expected code ${code}`);
});
When('the client creates a request for an inactive course', () => actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with({ ...body, courseId: 'course-002' }))));
When('the client creates a request with short justification', () => actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with({ ...body, justification: 'short' }))));
When('the client rejects the created request without a reason', () => actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${requestId}/status`).with({ status: 'rejected', changedBy: 'reviewer' }))));
When('the client rejects the approved request', () =>
	actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${requestId}/status`).with({ status: 'rejected', changedBy: 'reviewer', reason: 'Prerequisite missing' }))),
);
