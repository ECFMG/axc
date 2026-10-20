import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Then, When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

// Scenario-local values live in the Cucumber world, including under parallel execution.
interface EnrollmentWorld {
	enrollmentId?: string;
	learnerEmail?: string;
}
interface RequestBody {
	id: string;
	status: string;
	statusHistory: { fromStatus: string | null; toStatus: string; changedBy: string }[];
}
const client = () => actorCalled('API client');
const creationBody = (learnerEmail: string) => ({ courseId: 'course-001', learnerEmail, justification: 'This course will prepare me for secure development work.' });

When('the client requests enrollment in an active course', async function (this: EnrollmentWorld) {
	this.learnerEmail = `${randomUUID()}@example.org`;
	await client().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with(creationBody(this.learnerEmail))));
	this.enrollmentId = (await client().answer(LastResponse.body<RequestBody>())).id;
});
When('the client retrieves that enrollment request', async function (this: EnrollmentWorld) {
	await client().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${this.enrollmentId}`)));
});
When('the reviewer changes that enrollment request to {string}', async function (this: EnrollmentWorld, status: string) {
	await client().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${this.enrollmentId}/status`).with({ status, changedBy: 'reviewer@example.org' })));
});
When('the client requests duplicate enrollment', async function (this: EnrollmentWorld) {
	assert.ok(this.learnerEmail);
	await client().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with(creationBody(this.learnerEmail))));
});
Then('the enrollment response has status {int}', async (status: number) => {
	assert.equal(await client().answer(LastResponse.status()), status);
});
Then('the enrollment request is pending with its creation history', async () => {
	const request = await client().answer(LastResponse.body<RequestBody>());
	assert.equal(request.status, 'pending');
	assert.equal(request.statusHistory.length, 1);
	assert.equal(request.statusHistory[0]?.fromStatus, null);
	assert.equal(request.statusHistory[0]?.toStatus, 'pending');
	assert.equal(request.statusHistory[0]?.changedBy, 'system');
});
Then('the enrollment history ends in {string} with {int} entries', async (status: string, entries: number) => {
	const request = await client().answer(LastResponse.body<RequestBody>());
	assert.equal(request.status, status);
	assert.equal(request.statusHistory.length, entries);
	assert.equal(request.statusHistory.at(-1)?.toStatus, status);
	assert.equal(request.statusHistory.at(-1)?.changedBy, 'reviewer@example.org');
});
