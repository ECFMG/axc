import { Given, Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { PatchRequest, PostRequest, Send } from '@serenity-js/rest';
import { actor, created, lastBody } from './http.steps.ts';

interface Enrollment {
	id: string;
	courseId: string;
	learnerEmail: string;
	status: string;
	statusHistory: { fromStatus: string | null; toStatus: string; changedAt: string; changedBy: string; reason: string | null }[];
}

const JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

const submit = async (courseId: string, learnerEmail: string, justification: string) => {
	await actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with({ courseId, learnerEmail, justification })));
	const body = await lastBody<Partial<Enrollment>>();
	if (body.id) created.id = body.id;
};

const changeStatus = (status: string, reason?: string) =>
	actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${created.id}/status`).with({ status, changedBy: 'reviewer@example.org', ...(reason === undefined ? {} : { reason }) })));

Given('a pending enrollment request by {string} for {string}', async (email: string, courseId: string) => {
	await submit(courseId, email, JUSTIFICATION);
	await actor().attemptsTo(Ensure.that((await lastBody<Enrollment>()).status, equals('pending')));
});

When('the learner {string} requests enrollment in {string}', (email: string, courseId: string) => submit(courseId, email, JUSTIFICATION));

When('the learner {string} requests enrollment in {string} with justification {string}', (email: string, courseId: string, justification: string) => submit(courseId, email, justification));

When('the reviewer changes the request status to {string}', (status: string) => changeStatus(status));

When('the reviewer changes the request status to {string} with reason {string}', (status: string, reason: string) => changeStatus(status, reason));

Then('the enrollment request status is {string}', async (status: string) => actor().attemptsTo(Ensure.that((await lastBody<Enrollment>()).status, equals(status))));

Then('the enrollment request is the one created', async () => actor().attemptsTo(Ensure.that((await lastBody<Enrollment>()).id, equals(created.id))));

Then('the status history is {string}', async (expected: string) => {
	const history = (await lastBody<Enrollment>()).statusHistory;
	const toStatuses = expected.split(', ');
	await actor().attemptsTo(
		Ensure.that(
			history.map((h) => [h.fromStatus, h.toStatus]),
			equals(toStatuses.map((to, i) => [i === 0 ? null : (toStatuses[i - 1] ?? null), to])),
		),
		Ensure.that(
			history.every((h, i) => h.changedAt.length > 0 && h.changedBy === (i === 0 ? 'system' : 'reviewer@example.org')),
			isTrue(),
		),
	);
});

Then('the enrollment list has {int} request(s)', async (count: number) => actor().attemptsTo(Ensure.that((await lastBody<{ items: Enrollment[] }>()).items.length, equals(count))));

Then('every listed request has {word} {string}', async (field: 'status' | 'courseId' | 'learnerEmail', value: string) => {
	const { items } = await lastBody<{ items: Enrollment[] }>();
	await actor().attemptsTo(Ensure.that(items.length > 0 && items.every((r) => r[field] === value), isTrue()));
});
