import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

const actor = () => actorCalled('API client');

const justification = 'I need this course to prepare for upcoming secure development work.';

interface EnrollmentBody {
	id?: string;
	status?: string;
	statusHistory?: readonly { changedBy?: string }[];
	items?: readonly { id?: string }[];
}

let enrollmentId = '';

const enrollmentField = <K extends 'id' | 'status'>(field: K) =>
	Question.about(`the enrollment ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<EnrollmentBody>());
		return body[field] ?? '';
	});

const historyLength = () =>
	Question.about('the enrollment history length', async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<EnrollmentBody>());
		return body.statusHistory?.length ?? -1;
	});

const firstChangedBy = () =>
	Question.about('the first history actor', async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<EnrollmentBody>());
		return body.statusHistory?.[0]?.changedBy ?? '';
	});

const listContainsCurrent = () =>
	Question.about('whether the list contains the current request', async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<EnrollmentBody>());
		return (body.items ?? []).some((item) => item.id === enrollmentId);
	});

When('the client creates an enrollment request for {string} on course {string}', async (email: string, courseId: string) => {
	await actor().attemptsTo(
		Send.a(
			PostRequest.to('/api/enrollment-requests').with({
				courseId,
				learnerEmail: email,
				justification,
			}),
		),
	);
	const body = await actor().answer(LastResponse.body<EnrollmentBody>());
	if (body.id !== undefined) {
		enrollmentId = body.id;
	}
});

When('the client submits an enrollment request with email {string} and justification {string} on course {string}', (email: string, text: string, courseId: string) =>
	actor().attemptsTo(
		Send.a(
			PostRequest.to('/api/enrollment-requests').with({
				courseId,
				learnerEmail: email,
				justification: text,
			}),
		),
	),
);

When('the client reads the enrollment request', () => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${enrollmentId}`))));

When('the client reads enrollment request {string}', (id: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${id}`))));

When('the client lists enrollment requests at {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

When('the client sets the enrollment request status to {string} as {string}', (status: string, changedBy: string) =>
	actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${enrollmentId}/status`).with({ status, changedBy }))),
);

When('the client rejects the enrollment request as {string} because {string}', (changedBy: string, reason: string) =>
	actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${enrollmentId}/status`).with({ status: 'rejected', changedBy, reason }))),
);

When('the client rejects the enrollment request as {string} without a reason', (changedBy: string) =>
	actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${enrollmentId}/status`).with({ status: 'rejected', changedBy }))),
);

When('the client posts malformed enrollment JSON', () => actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with('{not-json}'))));

Then('the enrollment response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the enrollment status is {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(enrollmentField('status')), equals(status))));

Then('the enrollment history has {int} entries', (count: number) => actor().attemptsTo(Ensure.that(resolved(historyLength()), equals(count))));

Then('the first history entry was recorded by {string}', (changedBy: string) => actor().attemptsTo(Ensure.that(resolved(firstChangedBy()), equals(changedBy))));

Then('the enrollment list contains the current request', () => actor().attemptsTo(Ensure.that(resolved(listContainsCurrent()), equals(true))));
