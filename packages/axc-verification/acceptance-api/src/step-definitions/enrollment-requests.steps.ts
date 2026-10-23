import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals, property } from '@serenity-js/assertions';
import { actorCalled, Question } from '@serenity-js/core';
import { GetRequest, PostRequest, Send } from '@serenity-js/rest';
import { patchJson, resolved, responseBody } from '../questions.ts';

interface StatusHistoryEntry {
	fromStatus: string | null;
	toStatus: string;
}

interface EnrollmentBody {
	id?: string;
	status: string;
	statusHistory: StatusHistoryEntry[];
}

interface EnrollmentList {
	items: { status: string; courseId: string; learnerEmail: string }[];
}

const actor = () => actorCalled('API client');
let createdId = '';

const enrollmentListMatches = (status: string, courseId: string, learnerEmail: string) =>
	Question.about('filtered enrollment requests', (current) =>
		current.answer(responseBody<EnrollmentList>()).then((body) => body.items.length > 0 && body.items.every((item) => item.status === status && item.courseId === courseId && item.learnerEmail === learnerEmail)),
	);

const firstHistoryStartsPending = () =>
	Question.about('opening history entry', (current) =>
		current.answer(responseBody<EnrollmentBody>()).then((body) => {
			const first = body.statusHistory[0];
			return first !== undefined && first.fromStatus === null && first.toStatus === 'pending';
		}),
	);

const latestHistoryIs = (status: string) =>
	Question.about(`latest history ${status}`, (current) =>
		current.answer(responseBody<EnrollmentBody>()).then((body) => {
			const latest = body.statusHistory[body.statusHistory.length - 1];
			return latest !== undefined && latest.toStatus === status && body.status === status;
		}),
	);

When('the client creates an enrollment request for {string} as {string} with justification {string}', (courseId: string, learnerEmail: string, text: string) =>
	actor()
		.attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with({ courseId, learnerEmail, justification: text })))
		.then(() => actor().answer(responseBody<{ id?: string }>()))
		.then((body) => {
			if (typeof body.id === 'string') createdId = body.id;
		}),
);

When('the client requests the created enrollment request', () => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${createdId}`))));

When('the client sets the created enrollment status to {string} as {string}', (status: string, changedBy: string) => actor().attemptsTo(patchJson(`/api/enrollment-requests/${createdId}/status`, { status, changedBy })));

When('the client rejects the created enrollment request as {string} because {string}', (changedBy: string, reason: string) =>
	actor().attemptsTo(patchJson(`/api/enrollment-requests/${createdId}/status`, { status: 'rejected', changedBy, reason })),
);

Then('the enrollment request status is {string}', (status: string) => actor().attemptsTo(Ensure.that(responseBody<{ status: string }>(), property('status', equals(status)))));

Then('the enrollment status history has {int} entries', (count: number) => actor().attemptsTo(Ensure.that(responseBody<{ statusHistory: unknown[] }>(), property('statusHistory', property('length', equals(count))))));

Then('the first status history entry starts at pending', () => actor().attemptsTo(Ensure.that(resolved(firstHistoryStartsPending()), equals(true))));

Then('the latest status history entry is {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(latestHistoryIs(status)), equals(true))));

Then('the enrollment list contains only status {string} course {string} and learner {string}', (status: string, courseId: string, learnerEmail: string) =>
	actor().attemptsTo(Ensure.that(resolved(enrollmentListMatches(status, courseId, learnerEmail)), equals(true))),
);
