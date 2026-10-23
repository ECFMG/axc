import { Before, Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';
import { actor, enrollmentBody, enrollmentList, resolved } from './http.ts';

const VALID_JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

let lastEnrollmentId = '';

Before(() => {
	lastEnrollmentId = '';
});

When('the client creates an enrollment request for course {string} as {string}', async (courseId: string, learnerEmail: string) => {
	await actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with({ courseId, learnerEmail, justification: VALID_JUSTIFICATION })));
	const status = await actor().answer(resolved(LastResponse.status()));
	if (status === 201) {
		const body = await actor().answer(resolved(enrollmentBody()));
		lastEnrollmentId = body.id;
	}
});

When('the client creates an enrollment request for course {string} as {string} with justification {string}', async (courseId: string, learnerEmail: string, justification: string) => {
	await actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with({ courseId, learnerEmail, justification })));
});

When('the client loads the last enrollment request', () => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${requireLastId()}`))));

When('the client lists enrollment requests with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests?${query}`))));

When('the client sets the last enrollment request status to {string} by {string}', (status: string, changedBy: string) =>
	actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${requireLastId()}/status`).with({ status, changedBy }))),
);

When('the client sets the last enrollment request status to {string} by {string} because {string}', (status: string, changedBy: string, reason: string) =>
	actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${requireLastId()}/status`).with({ status, changedBy, reason }))),
);

When('the client sets the last enrollment request status to {string} by {string} without a reason', (status: string, changedBy: string) =>
	actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${requireLastId()}/status`).with({ status, changedBy }))),
);

Then('the enrollment request status is {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(enrollmentField('status')), equals(status))));

Then('the enrollment request records course {string} and learner {string}', (courseId: string, learnerEmail: string) =>
	actor().attemptsTo(Ensure.that(resolved(enrollmentField('courseId')), equals(courseId)), Ensure.that(resolved(enrollmentField('learnerEmail')), equals(learnerEmail))),
);

Then('the enrollment status history has {int} entries', (count: number) => actor().attemptsTo(Ensure.that(resolved(historyCount()), equals(count))));

Then('the first status history entry starts at pending by system', () =>
	actor().attemptsTo(Ensure.that(resolved(historyFrom(0)), equals('null')), Ensure.that(resolved(historyTo(0)), equals('pending')), Ensure.that(resolved(historyBy(0)), equals('system'))),
);

Then('the last status history entry goes from {string} to {string} by {string}', (fromStatus: string, toStatus: string, changedBy: string) =>
	actor().attemptsTo(Ensure.that(resolved(lastHistoryFrom()), equals(fromStatus)), Ensure.that(resolved(lastHistoryTo()), equals(toStatus)), Ensure.that(resolved(lastHistoryBy()), equals(changedBy))),
);

Then('the last status history reason is {string}', (reason: string) => actor().attemptsTo(Ensure.that(resolved(lastHistoryReason()), equals(reason))));

Then('the listed enrollment request count is {int}', (count: number) => actor().attemptsTo(Ensure.that(resolved(listCount()), equals(count))));

Then('every listed enrollment request has status {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(everyListed((item) => item.status === status)), equals(true))));

Then('every listed enrollment request has course {string}', (courseId: string) => actor().attemptsTo(Ensure.that(resolved(everyListed((item) => item.courseId === courseId)), equals(true))));

Then('every listed enrollment request has learner {string}', (learnerEmail: string) =>
	actor().attemptsTo(Ensure.that(resolved(everyListed((item) => item.learnerEmail.toLowerCase() === learnerEmail.toLowerCase())), equals(true))),
);

function requireLastId(): string {
	if (lastEnrollmentId === '') {
		throw new Error('No enrollment request has been created in this scenario');
	}
	return lastEnrollmentId;
}

const enrollmentField = (field: 'status' | 'courseId' | 'learnerEmail') =>
	Question.about(`the enrollment ${field}`, async (current) => {
		const body = await current.answer(enrollmentBody());
		return body[field];
	});

const historyCount = () =>
	Question.about('the status history length', async (current) => {
		const body = await current.answer(enrollmentBody());
		return body.statusHistory.length;
	});

const historyFrom = (index: number) =>
	Question.about(`status history ${index} fromStatus`, async (current) => {
		const body = await current.answer(enrollmentBody());
		return body.statusHistory[index]?.fromStatus ?? 'null';
	});

const historyTo = (index: number) =>
	Question.about(`status history ${index} toStatus`, async (current) => {
		const body = await current.answer(enrollmentBody());
		return body.statusHistory[index]?.toStatus ?? '';
	});

const historyBy = (index: number) =>
	Question.about(`status history ${index} changedBy`, async (current) => {
		const body = await current.answer(enrollmentBody());
		return body.statusHistory[index]?.changedBy ?? '';
	});

const lastHistoryFrom = () =>
	Question.about('the last fromStatus', async (current) => {
		const body = await current.answer(enrollmentBody());
		const entry = body.statusHistory[body.statusHistory.length - 1];
		return entry?.fromStatus ?? 'null';
	});

const lastHistoryTo = () =>
	Question.about('the last toStatus', async (current) => {
		const body = await current.answer(enrollmentBody());
		const entry = body.statusHistory[body.statusHistory.length - 1];
		return entry?.toStatus ?? '';
	});

const lastHistoryBy = () =>
	Question.about('the last changedBy', async (current) => {
		const body = await current.answer(enrollmentBody());
		const entry = body.statusHistory[body.statusHistory.length - 1];
		return entry?.changedBy ?? '';
	});

const lastHistoryReason = () =>
	Question.about('the last reason', async (current) => {
		const body = await current.answer(enrollmentBody());
		const entry = body.statusHistory[body.statusHistory.length - 1];
		return entry?.reason ?? '';
	});

const listCount = () =>
	Question.about('the listed enrollment count', async (current) => {
		const body = await current.answer(enrollmentList());
		return body.items.length;
	});

const everyListed = (predicate: (item: { status: string; courseId: string; learnerEmail: string }) => boolean) =>
	Question.about('whether every listed request matches', async (current) => {
		const body = await current.answer(enrollmentList());
		return body.items.length > 0 && body.items.every(predicate);
	});
